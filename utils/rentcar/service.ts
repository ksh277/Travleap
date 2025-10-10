/**
 * 렌트카 서비스 레이어
 */

import { CarRentalConnectorFactory } from './connector';
import { CarSearchCache, RateKeyCache, VehicleImageCache } from './cache';
import type {
  CarSearchRequest,
  CarSearchResult,
  QuoteRequest,
  QuoteResponse,
  BookingRequest,
  BookingResponse,
} from './types';

export class CarRentalService {
  private searchCache: CarSearchCache;
  private rateKeyCache: RateKeyCache;
  private imageCache: VehicleImageCache;

  constructor() {
    this.searchCache = new CarSearchCache();
    this.rateKeyCache = new RateKeyCache();
    this.imageCache = new VehicleImageCache();
  }

  /**
   * 차량 검색 (캐시 우선)
   */
  async searchCars(request: CarSearchRequest): Promise<CarSearchResult[]> {
    // 1. 캐시 확인
    const cached = await this.searchCache.getSearchResults(
      request.pickupPlaceId,
      request.pickupAt
    );

    if (cached && cached.length > 0) {
      console.log('✅ Cache HIT: Car search results');
      return cached;
    }

    // 2. 캐시 미스 - 공급업체 API 호출
    console.log('❌ Cache MISS: Fetching from suppliers...');
    const results = await CarRentalConnectorFactory.searchAllSuppliers(request);

    // 3. 차량 이미지 캐싱 (CDN hotlink 방지)
    for (const result of results) {
      if (result.vehicle.images.length > 0) {
        result.vehicle.images = await this.imageCache.cacheImages(
          result.vehicle.images
        );
      }
    }

    // 4. 검색 결과 캐싱 (5분)
    if (results.length > 0) {
      await this.searchCache.setSearchResults(
        request.pickupPlaceId,
        request.pickupAt,
        results
      );
    }

    return results;
  }

  /**
   * Quote (가격·가용성 재검증)
   */
  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    // 1. RateKey 캐시 확인
    const cached = await this.rateKeyCache.getRateKey(request.rateKey);
    if (cached && cached.success) {
      console.log('✅ Cache HIT: RateKey');
      return cached;
    }

    // 2. 캐시 미스 - 공급업체 API 호출
    console.log('❌ Cache MISS: Fetching quote from supplier...');

    // rateKey에서 supplier 추출 (예: "RC_..." → rentalcars)
    const supplier = this.extractSupplierFromRateKey(request.rateKey);
    const connector = CarRentalConnectorFactory.getConnector(supplier);

    const quoteResponse = await connector.getQuote(request);

    // 3. Quote 결과 캐싱 (15분)
    if (quoteResponse.success) {
      await this.rateKeyCache.setRateKey(request.rateKey, quoteResponse);
    }

    return quoteResponse;
  }

  /**
   * 예약 생성
   */
  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    // 1. Quote 먼저 확인 (가격·가용성 재검증)
    const quoteResponse = await this.getQuote({ rateKey: request.rateKey });

    if (!quoteResponse.success || !quoteResponse.available) {
      return {
        success: false,
        error: quoteResponse.message || 'Vehicle not available',
        errorCode: 'VEHICLE_UNAVAILABLE',
      };
    }

    // 2. 가격 변경 체크
    if (quoteResponse.priceChanged) {
      return {
        success: false,
        error: `Price changed to ${quoteResponse.price?.total} ${quoteResponse.price?.currency}`,
        errorCode: 'PRICE_CHANGED',
      };
    }

    // 3. 예약 생성
    const supplier = this.extractSupplierFromRateKey(request.rateKey);
    const connector = CarRentalConnectorFactory.getConnector(supplier);

    const bookingResponse = await connector.createBooking(request);

    // 4. 성공 시 RateKey 캐시 무효화
    if (bookingResponse.success) {
      await this.rateKeyCache.invalidateRateKey(request.rateKey);
    }

    return bookingResponse;
  }

  /**
   * 예약 취소
   */
  async cancelBooking(
    supplier: string,
    bookingId: string
  ): Promise<{ success: boolean; refundAmount?: number }> {
    const connector = CarRentalConnectorFactory.getConnector(supplier as any);
    return await connector.cancelBooking(bookingId);
  }

  /**
   * RateKey에서 supplier 추출
   * 예: "RC_abc123..." → rentalcars
   */
  private extractSupplierFromRateKey(rateKey: string): any {
    const prefix = rateKey.substring(0, 2);
    switch (prefix) {
      case 'RC':
        return 'rentalcars';
      case 'SB':
        return 'sabre';
      case 'CT':
        return 'cartrawler';
      default:
        return 'rentalcars';
    }
  }

  /**
   * 영업시간 체크
   */
  isWithinOperatingHours(
    pickupTime: string, // ISO 8601
    openHours: string, // "08:00"
    closeHours: string // "22:00"
  ): { valid: boolean; afterHoursFee?: number } {
    const pickupDate = new Date(pickupTime);
    const pickupHourMin = pickupDate.getHours() * 60 + pickupDate.getMinutes();

    const [openH, openM] = openHours.split(':').map(Number);
    const [closeH, closeM] = closeHours.split(':').map(Number);

    const openMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;

    if (pickupHourMin >= openMin && pickupHourMin <= closeMin) {
      return { valid: true };
    } else {
      return { valid: false, afterHoursFee: 10000 }; // 야간 수수료
    }
  }

  /**
   * Young Driver Fee 계산
   */
  calculateYoungDriverFee(driverAge: number, minAge: number, fee?: number): number {
    if (driverAge < minAge && fee) {
      return fee;
    }
    return 0;
  }

  /**
   * 총 요금 계산 (extras 포함)
   */
  calculateTotalPrice(
    basePrice: number,
    taxes: number,
    fees: Array<{ amount: number }>,
    extras: Array<{ price: number; quantity?: number; per: 'DAY' | 'RENTAL' }>,
    rentalDays: number
  ): number {
    let total = basePrice + taxes;

    // 수수료 합산
    fees.forEach((fee) => {
      total += fee.amount;
    });

    // Extras 합산
    extras.forEach((extra) => {
      const qty = extra.quantity || 1;
      if (extra.per === 'DAY') {
        total += extra.price * rentalDays * qty;
      } else {
        total += extra.price * qty;
      }
    });

    return total;
  }

  /**
   * 렌트 기간 계산 (일수)
   */
  calculateRentalDays(pickupAt: string, dropoffAt: string): number {
    const pickup = new Date(pickupAt);
    const dropoff = new Date(dropoffAt);
    const diffMs = dropoff.getTime() - pickup.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }
}
