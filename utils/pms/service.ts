/**
 * PMS 통합 서비스
 * 재고/요금 조회 및 예약 처리를 위한 비즈니스 로직
 */

import { PMSConnectorFactory } from './connector';
import { InventoryCache, RateCache, HoldCache } from './cache';
import type {
  PMSVendor,
  RoomInventory,
  RatePlan,
  PMSBookingRequest,
  Booking,
} from './types';

export class PMSService {
  private inventoryCache: InventoryCache;
  private rateCache: RateCache;
  private holdCache: HoldCache;

  constructor() {
    this.inventoryCache = new InventoryCache();
    this.rateCache = new RateCache();
    this.holdCache = new HoldCache();
  }

  /**
   * 재고 조회 (캐시 우선, 캐시 미스 시 PMS 호출)
   */
  async getInventory(
    vendor: PMSVendor,
    hotelId: string,
    roomTypeId: string,
    startDate: string,
    endDate: string
  ): Promise<RoomInventory[]> {
    const dates = this.getDateRange(startDate, endDate);

    // 1. 캐시에서 조회
    const cachedInventories = await this.inventoryCache.getInventoryRange(
      hotelId,
      roomTypeId,
      dates
    );

    // 2. 캐시 미스된 날짜 확인
    const missedDates = dates.filter((date) => !cachedInventories.has(date));

    // 3. 캐시 미스된 날짜가 있으면 PMS에서 조회
    if (missedDates.length > 0) {
      try {
        const connector = PMSConnectorFactory.getConnector(vendor, hotelId);
        const pmsResponse = await connector.getInventory(
          hotelId,
          [roomTypeId],
          missedDates[0],
          missedDates[missedDates.length - 1]
        );

        // PMS 응답을 캐시에 저장
        const newInventories: RoomInventory[] = [];
        for (const roomType of pmsResponse.roomTypes) {
          for (const avail of roomType.availability) {
            const inventory: RoomInventory = {
              hotelId,
              roomTypeId: roomType.roomTypeId,
              date: avail.date,
              available: avail.available,
              total: avail.total,
              updatedAt: new Date(),
            };
            newInventories.push(inventory);
            cachedInventories.set(avail.date, inventory);
          }
        }

        if (newInventories.length > 0) {
          await this.inventoryCache.setInventoryRange(newInventories);
        }
      } catch (error) {
        console.error('PMS getInventory error:', error);
        // PMS 에러 시 캐시된 데이터라도 반환
      }
    }

    // 4. 결과 반환
    return dates
      .map((date) => cachedInventories.get(date))
      .filter((inv): inv is RoomInventory => inv !== undefined);
  }

  /**
   * 요금 조회 (캐시 우선, 캐시 미스 시 PMS 호출)
   */
  async getRates(
    vendor: PMSVendor,
    hotelId: string,
    roomTypeId: string,
    startDate: string,
    endDate: string
  ): Promise<RatePlan[]> {
    const dates = this.getDateRange(startDate, endDate);

    // 1. 캐시에서 조회
    const cachedRates = await this.rateCache.getRateRange(
      hotelId,
      roomTypeId,
      dates
    );

    // 2. 캐시 미스된 날짜 확인
    const missedDates = dates.filter((date) => !cachedRates.has(date));

    // 3. 캐시 미스된 날짜가 있으면 PMS에서 조회
    if (missedDates.length > 0) {
      try {
        const connector = PMSConnectorFactory.getConnector(vendor, hotelId);
        const pmsResponse = await connector.getRates(
          hotelId,
          [roomTypeId],
          missedDates[0],
          missedDates[missedDates.length - 1]
        );

        // PMS 응답을 캐시에 저장
        const newRates: RatePlan[] = [];
        for (const roomType of pmsResponse.roomTypes) {
          for (const rate of roomType.rates) {
            const ratePlan: RatePlan = {
              id: rate.ratePlanId,
              hotelId,
              roomTypeId: roomType.roomTypeId,
              name: rate.ratePlanName,
              date: rate.date,
              price: rate.price,
              currency: rate.currency,
              rules: {},
            };
            newRates.push(ratePlan);
            cachedRates.set(rate.date, ratePlan);
          }
        }

        if (newRates.length > 0) {
          await this.rateCache.setRateRange(newRates);
        }
      } catch (error) {
        console.error('PMS getRates error:', error);
        // PMS 에러 시 캐시된 데이터라도 반환
      }
    }

    // 4. 결과 반환
    return dates
      .map((date) => cachedRates.get(date))
      .filter((rate): rate is RatePlan => rate !== undefined);
  }

  /**
   * 예약 가능 여부 확인
   */
  async checkAvailability(
    vendor: PMSVendor,
    hotelId: string,
    roomTypeId: string,
    startDate: string,
    endDate: string,
    quantity: number = 1
  ): Promise<{ available: boolean; reason?: string }> {
    const inventories = await this.getInventory(
      vendor,
      hotelId,
      roomTypeId,
      startDate,
      endDate
    );

    // 모든 날짜에 충분한 재고가 있는지 확인
    const dates = this.getDateRange(startDate, endDate);
    for (const date of dates) {
      const inventory = inventories.find((inv) => inv.date === date);
      if (!inventory || inventory.available < quantity) {
        return {
          available: false,
          reason: `재고 부족: ${date}`,
        };
      }
    }

    return { available: true };
  }

  /**
   * 예약 Hold 생성 (재고 단기 잠금)
   */
  async createBookingHold(
    vendor: PMSVendor,
    request: PMSBookingRequest,
    ttlSeconds: number = 180
  ): Promise<{ success: boolean; holdId?: string; error?: string }> {
    const { hotelId, roomTypeId, checkIn, checkOut } = request;

    // 1. 재고 확인
    const availability = await this.checkAvailability(
      vendor,
      hotelId,
      roomTypeId,
      checkIn,
      checkOut,
      1
    );

    if (!availability.available) {
      return {
        success: false,
        error: availability.reason || '재고 부족',
      };
    }

    // 2. PMS에 Hold 생성
    try {
      const connector = PMSConnectorFactory.getConnector(vendor, hotelId);
      const pmsHold = await connector.createHold(request, ttlSeconds);

      if (!pmsHold.success) {
        return {
          success: false,
          error: 'PMS Hold 생성 실패',
        };
      }

      // 3. 캐시에 Hold 저장
      const dates = this.getDateRange(checkIn, checkOut);
      await this.holdCache.createHold(
        pmsHold.holdId,
        hotelId,
        roomTypeId,
        dates,
        1,
        ttlSeconds
      );

      // 4. 캐시 재고 감소
      for (const date of dates) {
        await this.inventoryCache.decrementInventory(hotelId, roomTypeId, date, 1);
      }

      return {
        success: true,
        holdId: pmsHold.holdId,
      };
    } catch (error) {
      console.error('createBookingHold error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 예약 확정 (결제 완료 후)
   */
  async confirmBooking(
    vendor: PMSVendor,
    hotelId: string,
    holdId: string,
    paymentAuthId: string
  ): Promise<{ success: boolean; bookingId?: string; error?: string }> {
    // 1. Hold 확인
    const hold = await this.holdCache.getHold(holdId);
    if (!hold) {
      return {
        success: false,
        error: 'Hold가 만료되었거나 존재하지 않습니다',
      };
    }

    // 2. PMS에 예약 확정
    try {
      const connector = PMSConnectorFactory.getConnector(vendor, hotelId);
      const response = await connector.confirmBooking(holdId, paymentAuthId);

      if (!response.success) {
        // 실패 시 재고 복구
        for (const date of hold.dates) {
          await this.inventoryCache.incrementInventory(
            hold.hotelId,
            hold.roomTypeId,
            date,
            hold.quantity
          );
        }

        return {
          success: false,
          error: response.message || '예약 확정 실패',
        };
      }

      // 3. Hold 해제
      await this.holdCache.releaseHold(holdId);

      return {
        success: true,
        bookingId: response.bookingId,
      };
    } catch (error) {
      console.error('confirmBooking error:', error);

      // 에러 시 재고 복구
      for (const date of hold.dates) {
        await this.inventoryCache.incrementInventory(
          hold.hotelId,
          hold.roomTypeId,
          date,
          hold.quantity
        );
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Hold 해제 (결제 실패 또는 취소 시)
   */
  async releaseHold(
    vendor: PMSVendor,
    hotelId: string,
    holdId: string
  ): Promise<{ success: boolean }> {
    // 1. Hold 조회
    const hold = await this.holdCache.getHold(holdId);
    if (!hold) {
      return { success: false };
    }

    // 2. PMS에서 Hold 해제
    try {
      const connector = PMSConnectorFactory.getConnector(vendor, hotelId);
      await connector.releaseHold(holdId);
    } catch (error) {
      console.error('releaseHold error:', error);
    }

    // 3. 캐시 재고 복구
    for (const date of hold.dates) {
      await this.inventoryCache.incrementInventory(
        hold.hotelId,
        hold.roomTypeId,
        date,
        hold.quantity
      );
    }

    // 4. Hold 캐시 삭제
    await this.holdCache.releaseHold(holdId);

    return { success: true };
  }

  /**
   * 날짜 범위 생성 헬퍼
   */
  private getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    return dates;
  }

  /**
   * 웹훅 처리 (PMS에서 재고/요금 변경 알림)
   */
  async handleWebhook(
    vendor: PMSVendor,
    eventType: string,
    payload: any
  ): Promise<void> {
    switch (eventType) {
      case 'inventory_update':
        // 재고 캐시 무효화
        await this.inventoryCache.invalidateInventory(
          payload.hotelId,
          payload.roomTypeId,
          payload.date
        );
        break;

      case 'rate_update':
        // 요금 캐시 무효화
        await this.rateCache.invalidateRate(
          payload.hotelId,
          payload.roomTypeId,
          payload.date
        );
        break;

      default:
        console.warn('Unknown webhook event type:', eventType);
    }
  }
}
