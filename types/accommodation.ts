// ============================================
// 숙박 시스템 TypeScript 타입 정의
// ============================================

// ============================================
// 1. VENDOR (숙박 업체)
// ============================================
export interface AccommodationVendor {
  id: number;
  partner_id?: number; // Legacy field
  vendor_code: string;
  business_name: string;
  brand_name?: string;
  business_number?: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  phone?: string; // Legacy field
  email?: string; // Legacy field
  description?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  logo_url?: string;
  tier: 'basic' | 'premium' | 'enterprise';
  pms_provider?: 'cloudbeds' | 'opera' | 'mews' | 'ezee' | 'custom' | '';
  pms_api_key?: string;
  pms_property_id?: string;
  pms_sync_enabled?: boolean;
  pms_sync_interval?: number; // minutes
  api_url?: string;
  status: 'pending' | 'active' | 'suspended';
  is_verified?: boolean;
  commission_rate?: number;
  room_count?: number;
  total_reviews?: number;
  avg_rating?: number;
  min_price?: number;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AccommodationVendorFormData {
  business_name: string;
  brand_name?: string;
  business_number?: string;
  contact_name: string;
  phone: string;
  email: string;
  tier: 'basic' | 'premium' | 'enterprise';
  logo_url?: string;
  pms_provider?: string;
  pms_api_key?: string;
  pms_property_id?: string;
  pms_sync_enabled?: boolean;
  pms_sync_interval?: number;
  description?: string;
  address?: string;
}

// ============================================
// 2. ROOM (객실)
// ============================================
export interface AccommodationRoom {
  id: number;
  vendor_id: number;
  room_code?: string;
  name: string;
  listing_name?: string; // Legacy field
  room_name?: string;
  room_type: 'standard' | 'deluxe' | 'suite' | 'villa' | 'other';
  capacity: number;
  max_capacity?: number;
  min_capacity?: number;
  base_price_per_night: number;
  price_from?: number; // Legacy field
  price_to?: number;
  location?: string;
  address?: string;
  description?: string;
  description_md?: string;
  short_description?: string;
  images: string[]; // Array of image URLs or base64
  amenities?: string[];
  breakfast_included: boolean;
  is_available: boolean;
  is_active?: boolean; // Legacy field
  is_featured?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccommodationRoomFormData {
  listing_name: string;
  room_name?: string;
  room_type?: 'standard' | 'deluxe' | 'suite' | 'villa' | 'other';
  capacity?: number;
  description: string;
  location: string;
  address: string;
  price_from: string; // String for form input
  images: string; // JSON string
  breakfast_included?: boolean;
  amenities?: string[];
}

// ============================================
// 3. BOOKING (예약)
// ============================================
export interface AccommodationBooking {
  id: number;
  user_id: number;
  accommodation_vendor_id?: number;
  vendor_id?: number;
  room_id: number;
  vendor_name?: string;
  room_name?: string;
  customer_name?: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  guests: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status?: 'pending' | 'paid' | 'refunded';
  payment_method?: string;
  special_requests?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// 4. RATE PLAN (요금제)
// ============================================
export interface AccommodationRatePlan {
  id: number;
  vendor_id: number;
  plan_name: string;
  plan_code: string;
  start_date: string;
  end_date: string;
  base_price: number;
  weekend_surcharge: number; // Percentage
  weekday_discount: number; // Percentage
  long_stay_discount: number; // Percentage (e.g., 7+ nights)
  min_nights?: number;
  max_nights?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccommodationRatePlanFormData {
  plan_name: string;
  plan_code: string;
  start_date: string;
  end_date: string;
  base_price: number;
  weekend_surcharge: number;
  weekday_discount: number;
  long_stay_discount: number;
  min_nights?: number;
  max_nights?: number;
}

// ============================================
// 5. SYNC LOG (동기화 로그)
// ============================================
export interface AccommodationSyncLog {
  id: number;
  vendor_id: number;
  sync_type: 'manual' | 'automatic';
  status: 'success' | 'failed' | 'partial';
  rooms_added: number;
  rooms_updated: number;
  rooms_deleted: number;
  bookings_added?: number;
  bookings_updated?: number;
  message?: string;
  error_message?: string;
  created_at: string;
}

// ============================================
// 7. REVIEW (리뷰)
// ============================================
export interface AccommodationReview {
  id: number;
  vendor_id: number;
  room_id?: number;
  booking_id?: number;
  user_id: number;
  user_name: string;
  rating: number; // 1-5
  title?: string;
  comment: string;
  images?: string[];
  cleanliness_rating?: number;
  service_rating?: number;
  location_rating?: number;
  value_rating?: number;
  is_verified: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// 8. API RESPONSE TYPES
// ============================================
export interface AccommodationApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

export interface AccommodationListResponse<T = any> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// 9. SEARCH/FILTER TYPES
// ============================================
export interface AccommodationSearchParams {
  location?: string;
  check_in?: string;
  check_out?: string;
  guests?: number;
  min_price?: number;
  max_price?: number;
  room_type?: string;
  amenities?: string[];
  rating?: number;
  page?: number;
  limit?: number;
  sort_by?: 'price_asc' | 'price_desc' | 'rating' | 'popular';
}

export interface AccommodationFilterOptions {
  price_range: { min: number; max: number };
  room_types: string[];
  amenities: string[];
  ratings: number[];
}

// ============================================
// 10. STATISTICS TYPES
// ============================================
export interface AccommodationVendorStats {
  total_rooms: number;
  available_rooms: number;
  total_bookings: number;
  total_revenue: number;
  average_rating: number;
  total_reviews: number;
  occupancy_rate: number; // Percentage
  this_month_bookings: number;
  this_month_revenue: number;
}

export interface AccommodationDashboardStats {
  total_vendors: number;
  total_rooms: number;
  total_bookings: number;
  total_revenue: number;
  pending_bookings: number;
  confirmed_bookings: number;
  average_booking_value: number;
  top_vendors: Array<{
    vendor_id: number;
    business_name: string;
    booking_count: number;
    revenue: number;
  }>;
}
