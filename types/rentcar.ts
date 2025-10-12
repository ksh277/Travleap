// ============================================
// 렌트카 시스템 TypeScript 타입 정의
// ============================================

// ============================================
// 1. VENDOR (렌트카 업체)
// ============================================
export interface RentcarVendor {
  id: number;
  vendor_code: string;
  business_name: string;
  brand_name?: string;
  business_number?: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  description?: string;
  logo_url?: string;
  status: 'pending' | 'active' | 'suspended';
  is_verified: boolean;
  commission_rate: number;
  total_vehicles: number;
  total_bookings: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

export interface RentcarVendorFormData {
  vendor_code: string;
  business_name: string;
  brand_name?: string;
  business_number?: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  description?: string;
  logo_url?: string;
  commission_rate?: number;
}

// ============================================
// 2. LOCATION (픽업/반납 지점)
// ============================================
export interface RentcarLocation {
  id: number;
  vendor_id: number;
  location_code: string;
  name: string;
  location_type: 'airport' | 'downtown' | 'station' | 'hotel';
  address: string;
  city?: string;
  postal_code?: string;
  lat?: number;
  lng?: number;
  operating_hours?: {
    [day: string]: {
      open: string;
      close: string;
      is_open: boolean;
    };
  };
  phone?: string;
  pickup_fee_krw: number;
  dropoff_fee_krw: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface RentcarLocationFormData {
  location_code: string;
  name: string;
  location_type: 'airport' | 'downtown' | 'station' | 'hotel';
  address: string;
  city?: string;
  postal_code?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  pickup_fee_krw?: number;
  dropoff_fee_krw?: number;
}

// ============================================
// 3. VEHICLE (차량)
// ============================================
export type VehicleClass = 'compact' | 'midsize' | 'fullsize' | 'luxury' | 'suv' | 'van' | 'electric';
export type FuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid';
export type TransmissionType = 'manual' | 'automatic';

export interface RentcarVehicle {
  id: number;
  vendor_id: number;
  vehicle_code: string;
  brand: string;
  model: string;
  year: number;
  display_name: string;
  vehicle_class: VehicleClass;
  vehicle_type?: string;
  fuel_type: FuelType;
  transmission: TransmissionType;
  seating_capacity: number;
  door_count: number;
  large_bags: number;
  small_bags: number;
  thumbnail_url?: string;
  images?: string[];
  features?: string[];
  age_requirement: number;
  license_requirement?: string;
  mileage_limit_per_day: number;
  unlimited_mileage: boolean;
  deposit_amount_krw: number;
  smoking_allowed: boolean;
  daily_rate_krw: number;
  is_active: boolean;
  is_featured: boolean;
  total_bookings: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

export interface RentcarVehicleFormData {
  vehicle_code: string;
  brand: string;
  model: string;
  year: number;
  display_name: string;
  vehicle_class: VehicleClass;
  vehicle_type?: string;
  fuel_type: FuelType;
  transmission: TransmissionType;
  seating_capacity: number;
  door_count?: number;
  large_bags?: number;
  small_bags?: number;
  thumbnail_url?: string;
  images?: string[];
  features?: string[];
  age_requirement?: number;
  license_requirement?: string;
  mileage_limit_per_day?: number;
  unlimited_mileage?: boolean;
  deposit_amount_krw?: number;
  smoking_allowed?: boolean;
  daily_rate_krw: number;
}

// 차량 검색 필터
export interface RentcarVehicleFilters {
  vendor_id?: number;
  vehicle_class?: VehicleClass[];
  fuel_type?: FuelType[];
  transmission?: TransmissionType[];
  seating_capacity?: number;
  min_price?: number;
  max_price?: number;
  is_featured?: boolean;
  is_active?: boolean;
}

// ============================================
// 4. BOOKING (예약)
// ============================================
export interface RentcarBooking {
  id: number;
  booking_number: string;
  vendor_id: number;
  vehicle_id: number;
  user_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_location_id: number;
  dropoff_location_id: number;
  pickup_date: string;
  pickup_time: string;
  dropoff_date: string;
  dropoff_time: string;
  daily_rate_krw: number;
  rental_days: number;
  subtotal_krw: number;
  insurance_krw: number;
  extras_krw: number;
  tax_krw: number;
  discount_krw: number;
  total_krw: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  special_requests?: string;
  created_at: string;
  updated_at: string;
}

export interface RentcarBookingFormData {
  vehicle_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_location_id: number;
  dropoff_location_id: number;
  pickup_date: string;
  pickup_time: string;
  dropoff_date: string;
  dropoff_time: string;
  special_requests?: string;
}

// 예약 검색 필터
export interface RentcarBookingFilters {
  vendor_id?: number;
  status?: string[];
  payment_status?: string[];
  pickup_date_from?: string;
  pickup_date_to?: string;
  search?: string; // 예약번호, 고객명, 이메일 검색
}

// ============================================
// 5. EXTENDED TYPES (조인된 데이터)
// ============================================

// 차량 + 벤더 정보
export interface RentcarVehicleWithVendor extends RentcarVehicle {
  vendor?: {
    id: number;
    vendor_code: string;
    business_name: string;
    brand_name?: string;
    is_verified: boolean;
    average_rating: number;
  };
}

// 예약 + 차량 + 지점 정보
export interface RentcarBookingWithDetails extends RentcarBooking {
  vehicle?: {
    brand: string;
    model: string;
    display_name: string;
    vehicle_class: VehicleClass;
    thumbnail_url?: string;
  };
  vendor?: {
    business_name: string;
    brand_name?: string;
    contact_phone: string;
  };
  pickup_location?: {
    name: string;
    address: string;
    phone?: string;
  };
  dropoff_location?: {
    name: string;
    address: string;
    phone?: string;
  };
}

// ============================================
// 6. API RESPONSE TYPES
// ============================================
export interface RentcarApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RentcarPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  error?: string;
}

// ============================================
// 7. SEARCH & AVAILABILITY
// ============================================

// 검색 조건
export interface RentcarSearchParams {
  pickup_location_id?: number;
  dropoff_location_id?: number;
  pickup_date: string;
  pickup_time: string;
  dropoff_date: string;
  dropoff_time: string;
  vehicle_class?: VehicleClass[];
  fuel_type?: FuelType[];
  transmission?: TransmissionType[];
  seating_capacity?: number;
  min_price?: number;
  max_price?: number;
}

// 검색 결과
export interface RentcarSearchResult {
  vehicle: RentcarVehicleWithVendor;
  availability: {
    is_available: boolean;
    available_quantity: number;
  };
  pricing: {
    daily_rate_krw: number;
    rental_days: number;
    subtotal_krw: number;
    tax_krw: number;
    total_krw: number;
  };
}

// ============================================
// 8. STATISTICS & DASHBOARD
// ============================================

// 벤더 대시보드 통계
export interface RentcarVendorStats {
  vendor_id: number;
  total_vehicles: number;
  active_vehicles: number;
  total_bookings: number;
  confirmed_bookings: number;
  total_revenue_krw: number;
  average_rating: number;
  popular_vehicles: {
    vehicle_id: number;
    brand: string;
    model: string;
    booking_count: number;
  }[];
  recent_bookings: RentcarBookingWithDetails[];
}

// Admin 대시보드 통계
export interface RentcarAdminStats {
  total_vendors: number;
  active_vendors: number;
  total_vehicles: number;
  total_bookings: number;
  total_revenue_krw: number;
  top_vendors: {
    vendor_id: number;
    business_name: string;
    booking_count: number;
    revenue_krw: number;
  }[];
  booking_trends: {
    date: string;
    booking_count: number;
    revenue_krw: number;
  }[];
}

// ============================================
// 9. FORM VALIDATION
// ============================================

// 차량 등록 검증
export interface VehicleValidationErrors {
  vehicle_code?: string;
  brand?: string;
  model?: string;
  year?: string;
  display_name?: string;
  vehicle_class?: string;
  fuel_type?: string;
  daily_rate_krw?: string;
}

// 예약 검증
export interface BookingValidationErrors {
  vehicle_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  pickup_location_id?: string;
  dropoff_location_id?: string;
  pickup_date?: string;
  pickup_time?: string;
  dropoff_date?: string;
  dropoff_time?: string;
}

// ============================================
// 10. BULK UPLOAD
// ============================================

// 대량 업로드 결과
export interface RentcarBulkUploadResult {
  success: boolean;
  total_records: number;
  processed_records: number;
  created_records: number;
  updated_records: number;
  failed_records: number;
  errors: {
    row: number;
    field: string;
    message: string;
  }[];
}

// CSV 매핑
export interface RentcarCsvMapping {
  vehicle_code: string;
  brand: string;
  model: string;
  year: string;
  vehicle_class: string;
  fuel_type: string;
  transmission: string;
  seating_capacity: string;
  daily_rate_krw: string;
  // ... 추가 필드
}
