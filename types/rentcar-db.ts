/**
 * 렌트카 관련 데이터베이스 타입들
 */

// 렌트카 공급업체
export type CarSupplier = 'rentalcars' | 'sabre' | 'cartrawler' | 'custom';

// 렌트카 예약 기록
export interface CarBooking {
  id: number;
  booking_number: string;
  user_id: number;
  supplier: CarSupplier;
  supplier_booking_ref: string;
  confirmation_code: string;
  pickup_place_id: string;
  pickup_place_name: string;
  dropoff_place_id: string;
  dropoff_place_name: string;
  pickup_at: string; // ISO 8601
  dropoff_at: string; // ISO 8601
  vehicle_acriss: string;
  vehicle_make?: string;
  vehicle_model: string;
  transmission: 'Manual' | 'Automatic';
  fuel: 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric';
  base_price: number;
  taxes: number;
  fees_total: number;
  extras_total: number;
  total_price: number;
  currency: string;
  payment_type: 'PREPAID' | 'PAY_AT_PICKUP';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  booking_status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  driver_first_name: string;
  driver_last_name: string;
  driver_email: string;
  driver_phone: string;
  driver_license_number: string;
  voucher_url?: string;
  pickup_instructions?: string;
  special_requests?: string;
  flight_number?: string;
  cancellation_reason?: string;
  refund_amount?: number;
  created_at: string;
  updated_at: string;
}

// 렌트카 Extras (추가 옵션)
export interface CarBookingExtra {
  id: number;
  booking_id: number;
  extra_code: string; // GPS, CHILD_SEAT, WIFI, etc
  extra_name: string;
  quantity: number;
  price: number;
  per: 'DAY' | 'RENTAL';
  created_at: string;
}

// 렌트카 장소 정보 (캐싱용)
export interface CarLocation {
  id: number;
  place_id: string;
  type: 'AIRPORT' | 'DOWNTOWN' | 'HOTEL' | 'RAILWAY';
  iata_code?: string;
  name_ko: string;
  name_en: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  open_hours?: string;
  close_hours?: string;
  after_hours_fee?: number;
  created_at: string;
  updated_at: string;
}

// 렌트카 RateKey 캐시 (Redis에도 저장하지만 DB 백업용)
export interface CarRateKeyCache {
  id: number;
  rate_key: string;
  supplier: CarSupplier;
  vehicle_data: any; // JSON
  price_data: any; // JSON
  expires_at: string;
  created_at: string;
}
