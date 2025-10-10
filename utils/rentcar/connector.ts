/**
 * 렌트카 공급업체 API 커넥터
 */

import type {
  CarSupplier,
  CarSearchRequest,
  CarSearchResult,
  QuoteRequest,
  QuoteResponse,
  BookingRequest,
  BookingResponse,
} from './types';

// 렌트카 커넥터 인터페이스
export interface ICarRentalConnector {
  supplier: CarSupplier;

  // 차량 검색
  searchCars(request: CarSearchRequest): Promise<CarSearchResult[]>;

  // Quote (가격·가용성 재검증)
  getQuote(request: QuoteRequest): Promise<QuoteResponse>;

  // 예약 생성
  createBooking(request: BookingRequest): Promise<BookingResponse>;

  // 예약 취소
  cancelBooking(bookingId: string): Promise<{ success: boolean; refundAmount?: number }>;
}

/**
 * Rentalcars.com API 커넥터
 * API 문서: https://docs.rentalcars.com/
 */
export class RentalcarsConnector implements ICarRentalConnector {
  supplier: CarSupplier = 'rentalcars';
  private apiKey: string;
  private baseURL: string;
  private affiliateId: string;

  constructor(
    apiKey: string,
    affiliateId: string,
    baseURL: string = 'https://api.rentalcars.com/v2'
  ) {
    this.apiKey = apiKey;
    this.affiliateId = affiliateId;
    this.baseURL = baseURL;
  }

  async searchCars(request: CarSearchRequest): Promise<CarSearchResult[]> {
    try {
      const response = await fetch(`${this.baseURL}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          affiliate_id: this.affiliateId,
          pickup: {
            location: request.pickupPlaceId,
            datetime: request.pickupAt,
          },
          dropoff: {
            location: request.dropoffPlaceId,
            datetime: request.dropoffAt,
          },
          driver: {
            age: request.driverAge,
            country: request.residentCountry,
          },
          currency: request.currency || 'KRW',
          filters: request.filters,
        }),
      });

      if (!response.ok) {
        throw new Error(`Rentalcars API error: ${response.status}`);
      }

      const data = await response.json();

      // Rentalcars 응답을 우리 포맷으로 변환
      return data.results.map((item: any) => this.transformSearchResult(item));
    } catch (error) {
      console.error('Rentalcars searchCars error:', error);
      throw error;
    }
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    try {
      const response = await fetch(`${this.baseURL}/quote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rate_key: request.rateKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Rentalcars API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: data.success,
        rateKey: data.rate_key,
        expiresAt: data.expires_at,
        vehicle: data.vehicle ? this.transformVehicle(data.vehicle) : undefined,
        price: data.price ? this.transformPrice(data.price) : undefined,
        priceChanged: data.price_changed,
        available: data.available,
        message: data.message,
      };
    } catch (error) {
      console.error('Rentalcars getQuote error:', error);
      return {
        success: false,
        available: false,
        message: error instanceof Error ? error.message : 'Quote failed',
      };
    }
  }

  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    try {
      const response = await fetch(`${this.baseURL}/booking`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rate_key: request.rateKey,
          driver: {
            first_name: request.driverInfo.firstName,
            last_name: request.driverInfo.lastName,
            email: request.driverInfo.email,
            phone: request.driverInfo.phone,
            date_of_birth: request.driverInfo.dateOfBirth,
            license_number: request.driverInfo.licenseNumber,
            license_issue_date: request.driverInfo.licenseIssueDate,
            license_country: request.driverInfo.licenseCountry,
          },
          payment: {
            method: request.paymentInfo.method,
            card_token: request.paymentInfo.cardToken,
            amount: request.paymentInfo.amount,
            currency: request.paymentInfo.currency,
          },
          extras: request.extras,
          special_requests: request.specialRequests,
          flight_number: request.flightNumber,
        }),
      });

      if (!response.ok) {
        throw new Error(`Rentalcars API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: data.success,
        bookingId: data.booking_id,
        confirmationCode: data.confirmation_code,
        supplierBookingRef: data.supplier_booking_ref,
        voucherUrl: data.voucher_url,
        pickupInstructions: data.pickup_instructions,
        emergencyContact: data.emergency_contact,
      };
    } catch (error) {
      console.error('Rentalcars createBooking error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Booking failed',
        errorCode: 'BOOKING_FAILED',
      };
    }
  }

  async cancelBooking(bookingId: string): Promise<{ success: boolean; refundAmount?: number }> {
    try {
      const response = await fetch(`${this.baseURL}/booking/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Rentalcars API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: data.success,
        refundAmount: data.refund_amount,
      };
    } catch (error) {
      console.error('Rentalcars cancelBooking error:', error);
      return { success: false };
    }
  }

  // === 변환 헬퍼 메서드 ===

  private transformSearchResult(item: any): CarSearchResult {
    return {
      supplierId: this.supplier,
      supplierName: item.supplier_name || 'Rentalcars',
      vehicle: this.transformVehicle(item.vehicle),
      price: this.transformPrice(item.price),
      location: {
        pickup: this.transformLocation(item.pickup_location),
        dropoff: this.transformLocation(item.dropoff_location),
      },
      policies: this.transformPolicies(item.policies),
      extras: item.extras?.map((e: any) => this.transformExtra(e)) || [],
      rateKey: item.rate_key,
      expiresAt: item.expires_at,
    };
  }

  private transformVehicle(v: any) {
    return {
      acriss: v.acriss_code,
      make: v.make,
      model: v.model,
      transmission: v.transmission === 'A' ? 'Automatic' : 'Manual',
      fuel: this.mapFuelType(v.fuel),
      seats: v.seats || 5,
      doors: v.doors || 4,
      luggage: v.luggage,
      airConditioning: v.air_conditioning || true,
      images: v.images || [],
      features: v.features || [],
    };
  }

  private transformPrice(p: any) {
    return {
      base: p.base_price,
      taxes: p.taxes,
      fees: p.fees || [],
      total: p.total_price,
      currency: p.currency,
      paymentType: p.payment_type,
      depositRequired: p.deposit,
    };
  }

  private transformLocation(l: any) {
    return {
      code: l.location_code,
      type: l.location_type,
      name: l.name,
      address: l.address,
      lat: l.latitude,
      lng: l.longitude,
      openHours: l.open_hours,
      closeHours: l.close_hours,
      afterHoursFee: l.after_hours_fee,
    };
  }

  private transformPolicies(p: any) {
    return {
      mileage: p.mileage?.type || 'UNLIMITED',
      mileageLimit: p.mileage?.limit,
      fuel: p.fuel_policy || 'FULL_TO_FULL',
      insurance: {
        cdw: p.insurance?.cdw || false,
        scdw: p.insurance?.scdw || false,
        tp: p.insurance?.tp || false,
        pai: p.insurance?.pai || false,
        excess: p.insurance?.excess || 0,
        deposit: p.insurance?.deposit || 0,
        additionalInsurance: p.insurance?.additional || [],
      },
      cancellation: {
        free: p.cancellation?.free || false,
        freeUntil: p.cancellation?.free_until,
        fee: p.cancellation?.fee,
        feePercent: p.cancellation?.fee_percent,
      },
      amendment: {
        allowed: p.amendment?.allowed || false,
        fee: p.amendment?.fee,
      },
      minDriverAge: p.min_driver_age || 21,
      youngDriverFee: p.young_driver_fee,
      additionalDriverFee: p.additional_driver_fee,
      crossBorder: p.cross_border,
    };
  }

  private transformExtra(e: any) {
    return {
      code: e.code,
      name: e.name,
      description: e.description,
      price: e.price,
      per: e.per,
      quantity: e.quantity,
      mandatory: e.mandatory,
    };
  }

  private mapFuelType(fuel: string): 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric' {
    switch (fuel) {
      case 'R':
      case 'GASOLINE':
        return 'Gasoline';
      case 'D':
      case 'DIESEL':
        return 'Diesel';
      case 'H':
      case 'HYBRID':
        return 'Hybrid';
      case 'E':
      case 'ELECTRIC':
        return 'Electric';
      default:
        return 'Gasoline';
    }
  }
}

/**
 * 커넥터 팩토리
 */
export class CarRentalConnectorFactory {
  private static connectors: Map<CarSupplier, ICarRentalConnector> = new Map();

  static getConnector(supplier: CarSupplier): ICarRentalConnector {
    if (!this.connectors.has(supplier)) {
      switch (supplier) {
        case 'rentalcars':
          const apiKey = process.env.RENTALCARS_API_KEY || '';
          const affiliateId = process.env.RENTALCARS_AFFILIATE_ID || '';
          this.connectors.set(supplier, new RentalcarsConnector(apiKey, affiliateId));
          break;

        // 다른 공급업체 추가
        case 'sabre':
        case 'cartrawler':
        default:
          throw new Error(`Unsupported car rental supplier: ${supplier}`);
      }
    }

    return this.connectors.get(supplier)!;
  }

  // 모든 공급업체에서 검색
  static async searchAllSuppliers(
    request: CarSearchRequest
  ): Promise<CarSearchResult[]> {
    const suppliers: CarSupplier[] = request.filters?.suppliers || ['rentalcars'];
    const results: CarSearchResult[] = [];

    await Promise.all(
      suppliers.map(async (supplier) => {
        try {
          const connector = this.getConnector(supplier);
          const supplierResults = await connector.searchCars(request);
          results.push(...supplierResults);
        } catch (error) {
          console.error(`${supplier} search failed:`, error);
        }
      })
    );

    // 가격순 정렬
    return results.sort((a, b) => a.price.total - b.price.total);
  }
}
