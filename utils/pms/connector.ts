/**
 * PMS API 연동 커넥터
 * 각 PMS 공급업체별 커넥터를 추상화
 */

import type {
  PMSVendor,
  PMSInventoryResponse,
  PMSRateResponse,
  PMSBookingRequest,
  PMSBookingResponse,
  RoomType,
} from './types';

// PMS 커넥터 인터페이스
export interface IPMSConnector {
  vendor: PMSVendor;

  // 호텔의 객실 타입 조회
  getRoomTypes(hotelId: string): Promise<RoomType[]>;

  // 재고 조회
  getInventory(
    hotelId: string,
    roomTypeIds: string[],
    startDate: string,
    endDate: string
  ): Promise<PMSInventoryResponse>;

  // 요금 조회
  getRates(
    hotelId: string,
    roomTypeIds: string[],
    startDate: string,
    endDate: string
  ): Promise<PMSRateResponse>;

  // 예약 생성 (hold)
  createHold(
    request: PMSBookingRequest,
    ttlSeconds: number
  ): Promise<{ success: boolean; holdId: string }>;

  // 예약 확정
  confirmBooking(
    holdId: string,
    paymentAuthId: string
  ): Promise<PMSBookingResponse>;

  // 예약 취소/릴리즈
  releaseHold(holdId: string): Promise<{ success: boolean }>;
}

// CloudBeds PMS 커넥터 구현 예시
export class CloudBedsPMSConnector implements IPMSConnector {
  vendor: PMSVendor = 'cloudbeds';
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL: string = 'https://api.cloudbeds.com/v1') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async getRoomTypes(hotelId: string): Promise<RoomType[]> {
    try {
      const response = await fetch(`${this.baseURL}/hotels/${hotelId}/roomTypes`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`CloudBeds API error: ${response.status}`);
      }

      const data = await response.json();

      return data.roomTypes.map((rt: any) => ({
        id: rt.roomTypeID,
        hotelId,
        name: rt.roomTypeName,
        description: rt.roomTypeDescription || '',
        maxOccupancy: rt.maxGuests || 2,
        bedType: rt.bedType || 'Unknown',
        amenities: rt.amenities || [],
        images: rt.images || [],
      }));
    } catch (error) {
      console.error('CloudBeds getRoomTypes error:', error);
      throw error;
    }
  }

  async getInventory(
    hotelId: string,
    roomTypeIds: string[],
    startDate: string,
    endDate: string
  ): Promise<PMSInventoryResponse> {
    try {
      const response = await fetch(`${this.baseURL}/getAvailability`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyID: hotelId,
          startDate,
          endDate,
          roomTypeIDs: roomTypeIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`CloudBeds API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        hotelId,
        roomTypes: data.data.map((item: any) => ({
          roomTypeId: item.roomTypeID,
          name: item.roomTypeName,
          availability: item.availability.map((avail: any) => ({
            date: avail.date,
            available: avail.available,
            total: avail.total,
          })),
        })),
      };
    } catch (error) {
      console.error('CloudBeds getInventory error:', error);
      throw error;
    }
  }

  async getRates(
    hotelId: string,
    roomTypeIds: string[],
    startDate: string,
    endDate: string
  ): Promise<PMSRateResponse> {
    try {
      const response = await fetch(`${this.baseURL}/getRates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyID: hotelId,
          startDate,
          endDate,
          roomTypeIDs: roomTypeIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`CloudBeds API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        hotelId,
        roomTypes: data.data.map((item: any) => ({
          roomTypeId: item.roomTypeID,
          name: item.roomTypeName,
          rates: item.rates.map((rate: any) => ({
            date: rate.date,
            price: rate.price,
            currency: rate.currency || 'KRW',
            ratePlanId: rate.ratePlanID,
            ratePlanName: rate.ratePlanName,
          })),
        })),
      };
    } catch (error) {
      console.error('CloudBeds getRates error:', error);
      throw error;
    }
  }

  async createHold(
    request: PMSBookingRequest,
    ttlSeconds: number
  ): Promise<{ success: boolean; holdId: string }> {
    try {
      const response = await fetch(`${this.baseURL}/postReservation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyID: request.hotelId,
          roomTypeID: request.roomTypeId,
          startDate: request.checkIn,
          endDate: request.checkOut,
          guestFirstName: request.guestInfo.firstName,
          guestLastName: request.guestInfo.lastName,
          guestEmail: request.guestInfo.email,
          guestPhone: request.guestInfo.phone,
          adults: request.adults,
          children: request.children,
          status: 'hold', // Hold 상태로 생성
          holdExpiresIn: ttlSeconds,
          notes: request.specialRequests,
        }),
      });

      if (!response.ok) {
        throw new Error(`CloudBeds API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: data.success,
        holdId: data.reservationID,
      };
    } catch (error) {
      console.error('CloudBeds createHold error:', error);
      return { success: false, holdId: '' };
    }
  }

  async confirmBooking(
    holdId: string,
    paymentAuthId: string
  ): Promise<PMSBookingResponse> {
    try {
      const response = await fetch(`${this.baseURL}/putReservation`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationID: holdId,
          status: 'confirmed',
          paymentAuthID: paymentAuthId,
        }),
      });

      if (!response.ok) {
        throw new Error(`CloudBeds API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: data.success,
        bookingId: data.reservationID,
        confirmationNumber: data.confirmationCode,
        status: 'confirmed',
      };
    } catch (error) {
      console.error('CloudBeds confirmBooking error:', error);
      return {
        success: false,
        bookingId: '',
        confirmationNumber: '',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async releaseHold(holdId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseURL}/deleteReservation`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationID: holdId,
        }),
      });

      if (!response.ok) {
        throw new Error(`CloudBeds API error: ${response.status}`);
      }

      const data = await response.json();
      return { success: data.success };
    } catch (error) {
      console.error('CloudBeds releaseHold error:', error);
      return { success: false };
    }
  }
}

// PMS 커넥터 팩토리
export class PMSConnectorFactory {
  private static connectors: Map<string, IPMSConnector> = new Map();

  static getConnector(vendor: PMSVendor, hotelId: string): IPMSConnector {
    const key = `${vendor}:${hotelId}`;

    if (!this.connectors.has(key)) {
      switch (vendor) {
        case 'cloudbeds':
          const apiKey = process.env[`PMS_${hotelId}_API_KEY`] || '';
          this.connectors.set(key, new CloudBedsPMSConnector(apiKey));
          break;
        // 다른 PMS 공급업체 추가
        default:
          throw new Error(`Unsupported PMS vendor: ${vendor}`);
      }
    }

    return this.connectors.get(key)!;
  }
}
