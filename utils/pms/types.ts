/**
 * PMS (Property Management System) 통합 타입 정의
 */

// PMS 공급업체 타입
export type PMSVendor = 'stayntouch' | 'opera' | 'cloudbeds' | 'mews' | 'custom';

// 객실 타입
export interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  description: string;
  maxOccupancy: number;
  bedType: string;
  amenities: string[];
  images: string[];
}

// 재고 정보
export interface RoomInventory {
  hotelId: string;
  roomTypeId: string;
  date: string; // YYYY-MM-DD
  available: number;
  total: number;
  updatedAt: Date;
}

// 요금 정보
export interface RatePlan {
  id: string;
  hotelId: string;
  roomTypeId: string;
  name: string;
  date: string; // YYYY-MM-DD
  price: number;
  currency: string;
  rules: {
    minStay?: number;
    maxStay?: number;
    closedToArrival?: boolean;
    closedToDeparture?: boolean;
    nonRefundable?: boolean;
  };
}

// 예약 정보
export interface Booking {
  id: string;
  bookingId: string;
  hotelId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  adults: number;
  children: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
  holdId?: string;
  paymentAuthId?: string;
  totalPrice: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

// Hold (재고 단기 잠금)
export interface InventoryHold {
  id: string;
  hotelId: string;
  roomTypeId: string;
  dates: string[]; // YYYY-MM-DD[]
  quantity: number;
  expiresAt: Date;
  bookingRef?: string;
}

// Webhook 이벤트
export interface WebhookEvent {
  id: string;
  vendor: PMSVendor;
  eventId: string;
  type: 'inventory_update' | 'rate_update' | 'booking_confirm' | 'booking_cancel';
  payload: any;
  processedAt?: Date;
  idempotencyKey: string;
  createdAt: Date;
}

// PMS API 응답 (재고 조회)
export interface PMSInventoryResponse {
  hotelId: string;
  roomTypes: Array<{
    roomTypeId: string;
    name: string;
    availability: Array<{
      date: string;
      available: number;
      total: number;
    }>;
  }>;
}

// PMS API 응답 (요금 조회)
export interface PMSRateResponse {
  hotelId: string;
  roomTypes: Array<{
    roomTypeId: string;
    name: string;
    rates: Array<{
      date: string;
      price: number;
      currency: string;
      ratePlanId: string;
      ratePlanName: string;
    }>;
  }>;
}

// PMS API 예약 요청
export interface PMSBookingRequest {
  hotelId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guestInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  adults: number;
  children: number;
  specialRequests?: string;
  ratePlanId?: string;
}

// PMS API 예약 응답
export interface PMSBookingResponse {
  success: boolean;
  bookingId: string;
  confirmationNumber: string;
  status: 'confirmed' | 'pending' | 'failed';
  message?: string;
}

// Redis 캐시 키 생성
export const CacheKeys = {
  inventory: (hotelId: string, roomTypeId: string, date: string) =>
    `inv:${hotelId}:${roomTypeId}:${date}`,
  rate: (hotelId: string, roomTypeId: string, date: string) =>
    `rate:${hotelId}:${roomTypeId}:${date}`,
  hold: (holdId: string) => `hold:${holdId}`,
  hotelRooms: (hotelId: string) => `hotel:${hotelId}:rooms`,
};

// 캐시 TTL (초)
export const CacheTTL = {
  inventory: 90, // 60-120초
  rate: 300, // 5분
  hold: 180, // 30-180초
  hotelRooms: 3600, // 1시간
};
