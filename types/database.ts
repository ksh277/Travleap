// 신안 여행 플랫폼 데이터베이스 타입 정의

// ===== 기본 엔티티 타입들 =====

export interface User {
  id: number;
  user_id: string;
  email: string;
  password_hash: string;
  name: string;
  phone?: string;
  birth_date?: string;
  bio?: string;
  avatar?: string;
  role: 'user' | 'partner' | 'admin';
  preferred_language: string;
  preferred_currency: string;
  marketing_consent: boolean;
  notification_settings?: any;
  created_at: string;
  updated_at: string;
  isAdmin?: boolean; // 계산된 속성
}

export interface CartItem {
  id: number;
  title: string;
  name?: string; // For backward compatibility
  price: number;
  originalPrice?: number;
  quantity: number;
  maxQuantity?: number;
  image: string;
  category: string;
  location?: string;
  date?: string;
  guests?: number;
  rating?: number;
  reviewCount?: number;
  isPartner?: boolean;
  discount?: number;
  inStock?: boolean;
  estimatedDelivery?: string;
  total?: number;
}

export interface Category {
  id: number;
  slug: string;
  name_ko: string;
  name_en?: string;
  icon?: string;
  color_hex?: string;
  sort_order: number;
  is_active: boolean;
}

export interface Partner {
  id: number;
  user_id: number;
  business_name: string;
  contact_name: string;
  email?: string;
  phone?: string;
  business_number?: string;
  website?: string;
  instagram?: string;
  description?: string;
  services?: string;
  tier: 'bronze' | 'silver' | 'gold' | 'vip';
  is_verified: boolean;
  is_featured: boolean;
  status: 'pending' | 'approved' | 'rejected';
  lat?: number;
  lng?: number;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: number;
  category_id: number;
  category?: string;
  partner_id?: number;
  title: string;
  description_md?: string;
  short_description?: string;
  price_from?: number;
  price_to?: number;
  currency: string;
  images?: string[] | string;
  lat?: number;
  lng?: number;
  location?: string;
  duration?: string;
  max_capacity?: number;
  min_capacity: number;
  rating_avg: number;
  rating_count: number;
  view_count: number;
  booking_count: number;
  start_date?: string;
  end_date?: string;
  is_published: boolean;
  is_featured?: boolean;
  is_active?: boolean;
  featured_score: number;
  partner_boost: number;
  sponsored_until?: string;
  created_at: string;
  updated_at: string;
  // Extended properties for UI components
  features?: string[];
  included?: string[];
  excluded?: string[];
  cancellation_policy?: string;
  refund_policy?: string;
  weather_policy?: string;
  amenities?: string[];
  tags?: string[];
  difficulty?: string;
  language?: string;
  min_age?: number;
  discount_rate?: number;
  original_price?: number;
}

export interface Booking {
  id: number;
  booking_number: string;
  listing_id: number;
  user_id: number;
  start_date?: string;
  end_date?: string;
  check_in_time?: string;
  check_out_time?: string;
  num_adults: number;
  num_children: number;
  num_seniors: number;
  price_adult?: number;
  price_child?: number;
  price_senior?: number;
  subtotal?: number;
  discount_amount: number;
  tax_amount: number;
  total_amount?: number;
  payment_method: 'card' | 'bank_transfer' | 'kakaopay' | 'naverpay';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  customer_info?: any;
  special_requests?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: number;
  listing_id: number;
  user_id: number;
  booking_id?: number;
  rating: number;
  title?: string;
  comment_md?: string;
  pros?: string;
  cons?: string;
  visit_date?: string;
  helpful_count: number;
  is_verified: boolean;
  admin_reply?: string;
  admin_reply_at?: string;
  created_at: string;
  updated_at: string;
}

// ===== 결제 관련 타입들 =====

export interface Payment {
  id: number;
  booking_id: number;
  user_id: number;
  payment_method: 'card' | 'bank_transfer' | 'kakaopay' | 'naverpay' | 'samsung_pay';
  payment_gateway?: string;
  gateway_transaction_id?: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  payment_date?: string;
  payment_data?: any;
  created_at: string;
  updated_at: string;
}

export interface Refund {
  id: number;
  payment_id: number;
  user_id: number;
  refund_amount: number;
  refund_reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  admin_notes?: string;
  processed_by?: number;
  refund_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerSettlement {
  id: number;
  partner_id: number;
  booking_id: number;
  payment_id: number;
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  status: 'pending' | 'paid' | 'held';
  settlement_date?: string;
  bank_info?: any;
  created_at: string;
  updated_at: string;
}

// ===== 카테고리별 상세 타입들 =====

export interface ListingTour {
  listing_id: number;
  tour_type: 'day' | 'activity' | 'package' | 'city' | 'experience' | 'cruise' | 'salt_experience';
  duration_hours?: number;
  meeting_point?: string;
  meeting_lat?: number;
  meeting_lng?: number;
  included_md?: string;
  excluded_md?: string;
  what_to_bring_md?: string;
  age_policy_md?: string;
  cancel_policy_md?: string;
  difficulty_level: 'easy' | 'moderate' | 'hard';
}

export interface ListingAccommodation {
  id: number;
  listing_id: number;
  room_type?: string;
  max_guests: number;
  check_in_time: string;
  check_out_time: string;
  amenities?: string[];
  bed_type?: string;
  bathroom_type?: string;
  room_size?: number;
  wifi_available: boolean;
  parking_available: boolean;
  breakfast_included: boolean;
  cancellation_policy?: string;
  house_rules?: string;
  created_at: string;
  updated_at: string;
}

export interface ListingFood {
  id: number;
  listing_id: number;
  cuisine_type?: string;
  opening_hours?: any;
  menu_items?: any;
  price_range: 'budget' | 'mid_range' | 'expensive';
  reservations_required: boolean;
  parking_available: boolean;
  seating_capacity?: number;
  delivery_available: boolean;
  takeout_available: boolean;
  alcohol_served: boolean;
  kid_friendly: boolean;
  specialty_dishes?: string;
  chef_info?: string;
  created_at: string;
  updated_at: string;
}

export interface ListingRentcar {
  id: number;
  listing_id: number;
  vehicle_type?: string;
  brand?: string;
  model?: string;
  year_manufactured?: number;
  fuel_type: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  seating_capacity: number;
  transmission: 'manual' | 'automatic';
  features?: string[];
  insurance_included: boolean;
  insurance_details?: string;
  mileage_limit?: number;
  deposit_amount?: number;
  pickup_location?: string;
  return_location?: string;
  age_requirement: number;
  license_requirement?: string;
  created_at: string;
  updated_at: string;
}

export interface ListingEvent {
  id: number;
  listing_id: number;
  event_type?: string;
  start_date: string;
  end_date: string;
  event_times?: any;
  ticket_types?: any;
  venue_info?: string;
  venue_address?: string;
  organizer?: string;
  age_restriction?: string;
  dress_code?: string;
  language: string;
  accessibility_info?: string;
  refund_policy?: string;
  contact_info?: any;
  created_at: string;
  updated_at: string;
}

// ===== 기타 기능 타입들 =====

export interface Notification {
  id: number;
  user_id: number;
  type: 'booking_confirmed' | 'payment_completed' | 'payment_failed' | 'review_request' | 'partner_approved' | 'refund_completed' | 'system_update' | 'promotion';
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  metadata?: any;
  expires_at?: string;
  created_at: string;
}

export interface PartnerApplication {
  id: number;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  business_number?: string;
  business_address?: string;
  categories: string[];
  description: string;
  services?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  expected_revenue?: number;
  years_in_business?: number;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  admin_notes?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FileUpload {
  id: number;
  entity_type: 'listing' | 'partner' | 'user' | 'review' | 'partner_application';
  entity_id: number;
  file_type: 'image' | 'document' | 'video';
  original_name: string;
  file_path: string;
  file_url?: string;
  file_size: number;
  mime_type?: string;
  is_primary: boolean;
  alt_text?: string;
  uploaded_by?: number;
  created_at: string;
}

export interface DbCartItem {
  id: number;
  user_id: number;
  listing_id: number;
  selected_date?: string;
  num_adults: number;
  num_children: number;
  num_seniors: number;
  price_snapshot?: number;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  id: number;
  user_id: number;
  listing_id: number;
  created_at: string;
}

export interface Coupon {
  id: number;
  code: string;
  title: string;
  description?: string;
  discount_type: 'percentage' | 'fixed' | 'free_shipping';
  discount_value: number;
  min_amount: number;
  max_discount_amount?: number;
  usage_limit?: number;
  usage_per_user: number;
  used_count: number;
  valid_from?: string;
  valid_until?: string;
  applicable_categories?: number[];
  applicable_partners?: number[];
  is_active: boolean;
  created_by?: number;
  created_at: string;
}

export interface UserCoupon {
  id: number;
  user_id: number;
  coupon_id: number;
  booking_id?: number;
  discount_applied?: number;
  used_at: string;
}

export interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  category: 'general' | 'booking' | 'technical' | 'partnership' | 'complaint';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: number;
  response?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserInteraction {
  id: number;
  user_id?: number;
  listing_id?: number;
  action: 'view' | 'click' | 'book' | 'share' | 'favorite' | 'review';
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  created_at: string;
}

export interface SearchLog {
  id: number;
  user_id?: number;
  search_query: string;
  search_filters?: any;
  results_count: number;
  clicked_item_id?: number;
  session_id?: string;
  ip_address?: string;
  created_at: string;
}

export interface LoginHistory {
  id: number;
  user_id: number;
  login_type: 'email' | 'google' | 'kakao' | 'naver';
  ip_address?: string;
  user_agent?: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  location_info?: any;
  login_status: 'success' | 'failed' | 'blocked';
  logout_at?: string;
  session_duration?: number;
  created_at: string;
}

// ===== API 응답 타입들 =====

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// ===== 조인된 데이터 타입들 =====

export interface ListingWithDetails extends Omit<Listing, 'images' | 'category'> {
  category: Category;
  partner?: Partner;
  tour_details?: ListingTour;
  accommodation_details?: ListingAccommodation;
  food_details?: ListingFood;
  rentcar_details?: ListingRentcar;
  event_details?: ListingEvent;
  images?: FileUpload[];
  recent_reviews?: Review[];
}

export interface BookingWithDetails extends Booking {
  listing: Listing;
  user: User;
  payment?: Payment;
}

export interface ReviewWithDetails extends Review {
  user: User;
  listing: Listing;
}

// ===== 필터 및 검색 타입들 =====

export interface ListingFilters {
  category_id?: number;
  min_price?: number;
  max_price?: number;
  location?: string;
  start_date?: string;
  end_date?: string;
  guests?: number;
  rating_min?: number;
  partner_tier?: string[];
  amenities?: string[];
  sort_by?: 'price_low' | 'price_high' | 'rating' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

export interface PartnerFilters {
  tier?: string[];
  status?: string[];
  verified_only?: boolean;
  location?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface BookingFilters {
  user_id?: number;
  status?: string[];
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// ===== 관리자 페이지 관련 타입들 =====

export interface AdminSettings {
  id: number;
  setting_category: 'general' | 'payment' | 'email' | 'sms' | 'commission' | 'maintenance';
  setting_key: string;
  setting_value?: string;
  setting_type: 'string' | 'number' | 'boolean' | 'json' | 'text';
  display_name: string;
  description?: string;
  is_public: boolean;
  requires_restart: boolean;
  updated_by?: number;
  updated_at: string;
}

export interface AdminDashboardStats {
  id: number;
  date: string;
  total_users: number;
  new_users_today: number;
  total_partners: number;
  pending_partners: number;
  total_listings: number;
  published_listings: number;
  total_bookings: number;
  bookings_today: number;
  total_revenue: number;
  revenue_today: number;
  commission_earned: number;
  avg_rating: number;
  total_reviews: number;
  pending_refunds: number;
  support_tickets_open: number;
  created_at: string;
}

export interface AdminLog {
  id: number;
  admin_id: number;
  action: 'user_created' | 'user_updated' | 'user_deleted' | 'user_banned' |
         'partner_approved' | 'partner_rejected' | 'partner_updated' |
         'listing_approved' | 'listing_rejected' | 'listing_featured' |
         'booking_cancelled' | 'booking_refunded' |
         'payment_refunded' | 'settlement_processed' |
         'review_moderated' | 'review_deleted' |
         'setting_updated' | 'backup_created' |
         'maintenance_mode' | 'email_sent';
  entity_type: 'user' | 'partner' | 'listing' | 'booking' | 'payment' | 'review' | 'setting' | 'system';
  entity_id?: number;
  old_values?: any;
  new_values?: any;
  description?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Banner {
  id: number;
  title: string;
  subtitle?: string;
  image_url: string;
  mobile_image_url?: string;
  link_url?: string;
  position: 'main_hero' | 'sidebar' | 'category_top' | 'between_listings' | 'footer' | 'popup';
  priority: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  target_audience?: any;
  click_count: number;
  impression_count: number;
  budget?: number;
  cost_per_click?: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface FAQ {
  id: number;
  category: 'general' | 'booking' | 'payment' | 'cancellation' | 'partner' | 'technical';
  question: string;
  answer: string;
  priority: number;
  is_active: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  tags?: any;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: number;
  template_key: string;
  template_name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables?: any;
  category: 'booking' | 'payment' | 'partner' | 'user' | 'marketing' | 'system';
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CommissionRate {
  id: number;
  partner_tier: 'bronze' | 'silver' | 'gold' | 'vip';
  category_id?: number;
  commission_rate: number;
  effective_from: string;
  effective_until?: string;
  is_active: boolean;
  created_by?: number;
  created_at: string;
}

export interface AdminTask {
  id: number;
  title: string;
  description?: string;
  task_type: 'partner_review' | 'listing_review' | 'refund_process' | 'customer_support' | 'content_moderation' | 'system_maintenance';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: number;
  related_entity_type?: 'user' | 'partner' | 'listing' | 'booking' | 'payment' | 'review';
  related_entity_id?: number;
  due_date?: string;
  completed_at?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

// 관리자 페이지에서 사용할 필터 타입들
export interface AdminUserFilters {
  role?: string[];
  status?: string[];
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface AdminPartnerFilters extends PartnerFilters {
  business_name?: string;
  contact_name?: string;
  approval_status?: string[];
}

export interface AdminListingFilters extends ListingFilters {
  partner_id?: number;
  is_published?: boolean;
  featured_only?: boolean;
  approval_status?: string[];
}

export interface AdminBookingFilters extends BookingFilters {
  booking_number?: string;
  payment_status?: string[];
  partner_id?: number;
}

export interface AdminLogFilters {
  admin_id?: number;
  action?: string[];
  entity_type?: string[];
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface AdminTaskFilters {
  assigned_to?: number;
  status?: string[];
  priority?: string[];
  task_type?: string[];
  due_date?: string;
  page?: number;
  limit?: number;
}