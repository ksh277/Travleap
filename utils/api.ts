import { db } from './database';
import { authService } from './auth';
import type {
  Listing,
  ListingWithDetails,
  Booking,
  User,
  Category,
  Partner,
  Review,
  Payment,
  Coupon,
  PartnerApplication,
  ListingFilters,
  PartnerFilters,
  BookingFilters,
  PaginatedResponse,
  ApiResponse,
  AdminSettings,
  AdminDashboardStats,
  AdminLog,
  Banner,
  FAQ,
  EmailTemplate,
  CommissionRate,
  AdminTask,
  AdminUserFilters,
  AdminPartnerFilters,
  AdminListingFilters,
  AdminBookingFilters,
  AdminLogFilters,
  AdminTaskFilters
} from '../types/database';

// API에서 사용할 간소화된 인터페이스
export interface TravelItem {
  id: number;
  title: string;
  description_md?: string;
  short_description?: string;
  category: string;
  category_id: number;
  price_from?: number;
  price_to?: number;
  images?: string[];
  location?: string;
  rating_avg: number;
  rating_count: number;
  duration?: string;
  max_capacity?: number;
  is_active?: boolean;
  is_featured?: boolean;
  created_at: string;
  updated_at: string;
  features?: string[];
  included_items?: string[];
  excluded_items?: string[];
  policies?: string[];
  partner?: {
    business_name: string;
    tier: string;
    is_verified: boolean;
  };
}

export interface BookingRequest {
  listing_id: number;
  user_id: number;
  start_date?: string;
  end_date?: string;
  num_adults: number;
  num_children: number;
  num_seniors: number;
  customer_info?: any;
  special_requests?: string;
}

export interface SearchFilters {
  category?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  startDate?: string;
  endDate?: string;
  guests?: number;
  sortBy?: 'price' | 'rating' | 'newest' | 'popular';
  page?: number;
  limit?: number;
}

// 더미 데이터를 위한 카테고리 매핑
const categoryMapping: Record<string, number> = {
  'tour': 1,
  'stay': 2,
  'food': 3,
  'attraction': 4,
  'event': 5,
  'rentcar': 6,
  'experience': 1
};

const mockTravelItems: TravelItem[] = [
  {
    id: 1,
    title: '신안 천일염 체험',
    description_md: '# 신안 천일염 체험\n\n전통적인 천일염 제조 과정을 직접 체험해보세요. 갯벌에서 직접 소금을 수확하고, 천일염이 만들어지는 과정을 배울 수 있습니다.',
    short_description: '전통적인 천일염 제조 과정을 직접 체험해보세요',
    category: 'tour',
    category_id: 1,
    price_from: 25000,
    images: ['https://via.placeholder.com/400x300'],
    location: '신안군 증도면',
    rating_avg: 4.8,
    rating_count: 24,
    duration: '2시간',
    max_capacity: 20,
    partner: {
      business_name: '신안 여행사',
      tier: 'gold',
      is_verified: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    title: '증도 슬로시티 투어',
    description_md: '# 증도 슬로시티 투어\n\n유네스코 생물권보전지역 증도의 아름다운 자연을 만나보세요. 염전, 갯벌, 해변을 천천히 둘러보며 여유로운 시간을 보낼 수 있습니다.',
    short_description: '유네스코 생물권보전지역 증도의 아름다운 자연을 만나보세요',
    category: 'tour',
    category_id: 1,
    price_from: 35000,
    images: ['https://via.placeholder.com/400x300'],
    location: '신안군 증도면',
    rating_avg: 4.6,
    rating_count: 18,
    duration: '4시간',
    max_capacity: 15,
    partner: {
      business_name: '신안 여행사',
      tier: 'gold',
      is_verified: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    title: '신안 펜션 바다뷰',
    description_md: '# 신안 펜션 바다뷰\n\n바다가 한눈에 보이는 아늑한 펜션에서 힐링하세요. 깨끗한 시설과 아름다운 바다 전망이 여러분을 기다립니다.',
    short_description: '바다가 한눈에 보이는 아늑한 펜션에서 힐링하세요',
    category: 'stay',
    category_id: 2,
    price_from: 120000,
    images: ['https://via.placeholder.com/400x300'],
    location: '신안군 자은도',
    rating_avg: 4.7,
    rating_count: 12,
    duration: '1박',
    max_capacity: 6,
    partner: {
      business_name: '신안 여행사',
      tier: 'gold',
      is_verified: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// API 호출에 JWT 토큰 추가하는 헬퍼
const getAuthHeaders = () => {
  const token = authService.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 인증이 필요한 API 호출
const authenticatedRequest = async <T>(
  operation: () => Promise<ApiResponse<T>>,
  requireAuth: boolean = true
): Promise<ApiResponse<T>> => {
  if (requireAuth) {
    const isExpired = await authService.isTokenExpired();
    if (isExpired) {
      return {
        success: false,
        error: 'Authentication required. Please login again.',
        data: null
      };
    }
  }

  try {
    return await operation();
  } catch (error) {
    console.error('API Request failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
};

export const api = {
  // 카테고리 관리
  getCategories: async (): Promise<Category[]> => {
    try {
      const response = await db.select('categories');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      return [
        { id: 1, slug: 'tour', name_ko: '투어/체험', name_en: 'Tours & Experiences', icon: 'map', color_hex: '#FF6B6B', sort_order: 1, is_active: true },
        { id: 2, slug: 'stay', name_ko: '숙박', name_en: 'Accommodation', icon: 'bed', color_hex: '#4ECDC4', sort_order: 2, is_active: true },
        { id: 3, slug: 'food', name_ko: '맛집', name_en: 'Restaurants', icon: 'utensils', color_hex: '#45B7D1', sort_order: 3, is_active: true },
        { id: 4, slug: 'attraction', name_ko: '관광지', name_en: 'Attractions', icon: 'camera', color_hex: '#96CEB4', sort_order: 4, is_active: true },
        { id: 5, slug: 'event', name_ko: '축제/이벤트', name_en: 'Events & Festivals', icon: 'calendar', color_hex: '#FECA57', sort_order: 5, is_active: true },
        { id: 6, slug: 'rentcar', name_ko: '렌터카', name_en: 'Car Rental', icon: 'car', color_hex: '#6C5CE7', sort_order: 6, is_active: true }
      ];
    }
  },

  // 리스팅 관리
  getListings: async (filters?: SearchFilters): Promise<PaginatedResponse<TravelItem>> => {
    try {
      let sql = `
        SELECT l.*, c.name_ko as category_name, p.business_name, p.tier, p.is_verified
        FROM listings l
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN partners p ON l.partner_id = p.id
        WHERE l.is_published = true
      `;
      const params: any[] = [];

      if (filters?.category && filters.category !== 'all') {
        sql += ' AND c.slug = ?';
        params.push(filters.category);
      }

      if (filters?.location) {
        sql += ' AND l.location LIKE ?';
        params.push(`%${filters.location}%`);
      }

      if (filters?.minPrice) {
        sql += ' AND l.price_from >= ?';
        params.push(filters.minPrice);
      }

      if (filters?.maxPrice) {
        sql += ' AND l.price_from <= ?';
        params.push(filters.maxPrice);
      }

      if (filters?.rating) {
        sql += ' AND l.rating_avg >= ?';
        params.push(filters.rating);
      }

      // 정렬
      switch (filters?.sortBy) {
        case 'price':
          sql += ' ORDER BY l.price_from ASC';
          break;
        case 'rating':
          sql += ' ORDER BY l.rating_avg DESC';
          break;
        case 'newest':
          sql += ' ORDER BY l.created_at DESC';
          break;
        case 'popular':
          sql += ' ORDER BY l.booking_count DESC, l.rating_avg DESC';
          break;
        default:
          sql += ' ORDER BY l.featured_score DESC, l.rating_avg DESC';
      }

      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;
      sql += ` LIMIT ${limit} OFFSET ${offset}`;

      const response = await db.query(sql, params);
      const items = response.data || mockTravelItems;

      // 변환
      const travelItems: TravelItem[] = items.map((item: any) => ({
        id: item.id,
        title: item.title,
        description_md: item.description_md,
        short_description: item.short_description,
        category: item.category_name || item.category,
        category_id: item.category_id,
        price_from: item.price_from,
        price_to: item.price_to,
        images: item.images ? JSON.parse(item.images) : ['https://via.placeholder.com/400x300'],
        location: item.location,
        rating_avg: item.rating_avg || 0,
        rating_count: item.rating_count || 0,
        duration: item.duration,
        max_capacity: item.max_capacity,
        partner: item.business_name ? {
          business_name: item.business_name,
          tier: item.tier,
          is_verified: item.is_verified
        } : undefined,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      return {
        success: true,
        data: travelItems,
        pagination: {
          page,
          limit,
          total: travelItems.length,
          total_pages: Math.ceil(travelItems.length / limit)
        }
      };
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      return {
        success: true,
        data: mockTravelItems,
        pagination: {
          page: 1,
          limit: 20,
          total: mockTravelItems.length,
          total_pages: 1
        }
      };
    }
  },

  getListing: async (id: number): Promise<TravelItem | null> => {
    try {
      const response = await db.select('listings', { id });
      const listing = response.data?.[0];

      if (!listing) {
        return mockTravelItems.find(item => item.id === id) || null;
      }

      return {
        id: listing.id,
        title: listing.title,
        description_md: listing.description_md,
        short_description: listing.short_description,
        category: listing.category,
        category_id: listing.category_id,
        price_from: listing.price_from,
        price_to: listing.price_to,
        images: listing.images ? JSON.parse(listing.images) : ['https://via.placeholder.com/400x300'],
        location: listing.location,
        rating_avg: listing.rating_avg || 0,
        rating_count: listing.rating_count || 0,
        duration: listing.duration,
        max_capacity: listing.max_capacity,
        created_at: listing.created_at,
        updated_at: listing.updated_at
      };
    } catch (error) {
      console.error('Failed to fetch listing:', error);
      return mockTravelItems.find(item => item.id === id) || null;
    }
  },

  // 예약 관리
  createBooking: async (bookingData: BookingRequest): Promise<ApiResponse<Booking>> => {
    try {
      const booking = {
        ...bookingData,
        booking_number: `BK${Date.now()}`,
        payment_status: 'pending' as const,
        status: 'pending' as const,
        total_amount: bookingData.num_adults * 35000 + bookingData.num_children * 25000
      };

      const response = await db.insert('bookings', booking);
      // 생성된 예약에 필요한 필드들 추가
      const createdBooking: Booking = (response.data && typeof response.data === 'object' && 'booking_number' in response.data)
        ? response.data as Booking
        : {
            ...booking,
            id: Date.now(),
            discount_amount: 0,
            tax_amount: 0,
            payment_method: 'card',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as Booking;
      return {
        success: true,
        data: createdBooking,
        message: '예약이 성공적으로 생성되었습니다.'
      };
    } catch (error) {
      console.error('Failed to create booking:', error);
      return {
        success: false,
        error: '예약 생성에 실패했습니다.'
      };
    }
  },

  // 예약 취소
  cancelBooking: async (bookingId: string, cancellationData: {
    cancellationFee: number;
    refundAmount: number;
    reason: string;
  }): Promise<ApiResponse<Booking>> => {
    try {
      const updateData = {
        status: 'cancelled' as const,
        cancellation_reason: cancellationData.reason,
        cancellation_fee: cancellationData.cancellationFee,
        refund_amount: cancellationData.refundAmount,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await db.update('bookings', parseInt(bookingId), updateData);

      // 취소된 예약 정보 조회
      const cancelledBooking = await db.select('bookings', { id: parseInt(bookingId) });

      return {
        success: true,
        data: cancelledBooking.data[0],
        message: '예약이 성공적으로 취소되었습니다.'
      };
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      return {
        success: false,
        error: '예약 취소에 실패했습니다.'
      };
    }
  },

  // 주문 생성
  createOrder: async (orderData: {
    userId: number;
    items: {
      listingId: number;
      quantity: number;
      price: number;
      subtotal: number;
    }[];
    subtotal: number;
    deliveryFee: number;
    couponDiscount: number;
    couponCode?: string | null;
    total: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    paymentMethod: string;
  }): Promise<ApiResponse<any>> => {
    try {
      // 주문 정보 저장을 위한 payments 테이블 사용
      const payment = {
        user_id: orderData.userId,
        booking_id: 0, // 장바구니 주문은 booking_id 없음
        amount: orderData.total,
        payment_method: orderData.paymentMethod,
        payment_status: 'pending' as const,
        gateway_transaction_id: `ORDER_${Date.now()}`,
        coupon_code: orderData.couponCode || null,
        discount_amount: orderData.couponDiscount,
        fee_amount: orderData.deliveryFee,
        refund_amount: 0,
        notes: JSON.stringify({
          items: orderData.items,
          subtotal: orderData.subtotal,
          orderType: 'cart'
        })
      };

      const response = await db.insert('payments', payment);

      return {
        success: true,
        data: {
          id: response.data.id,
          orderNumber: payment.gateway_transaction_id,
          ...orderData
        },
        message: '주문이 성공적으로 생성되었습니다.'
      };
    } catch (error) {
      console.error('Failed to create order:', error);
      return {
        success: false,
        error: '주문 생성에 실패했습니다.'
      };
    }
  },

  // 현재 사용자 정보 가져오기
  getCurrentUser: async (): Promise<User | null> => {
    try {
      return await authService.getCurrentUser();
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  },

  // 사용자 ID로 정보 가져오기
  getUserById: async (id: number): Promise<User | null> => {
    try {
      const response = await db.select('users', { id });
      return response.data?.[0] || null;
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      return null;
    }
  },

  // 리스팅 ID로 상세 정보 가져오기
  getListingById: async (id: number): Promise<ApiResponse<TravelItem>> => {
    try {
      const listing = await api.getListing(id);
      if (listing) {
        return {
          success: true,
          data: listing
        };
      } else {
        return {
          success: false,
          error: '상품을 찾을 수 없습니다.'
        };
      }
    } catch (error) {
      console.error('Failed to get listing by ID:', error);
      return {
        success: false,
        error: '상품 조회에 실패했습니다.'
      };
    }
  },

  // 리뷰 생성
  createReview: async (reviewData: {
    listing_id: number;
    user_id: number;
    rating: number;
    title: string;
    content: string;
    images?: string[];
  }): Promise<ApiResponse<Review>> => {
    try {
      const review = {
        ...reviewData,
        images: JSON.stringify(reviewData.images || []),
        is_verified: false,
        helpful_count: 0,
        response_from_partner: null
      };
      const response = await db.insert('reviews', review);
      // 생성된 리뷰에 필요한 필드들 추가
      const createdReview: Review = (response.data && typeof response.data === 'object' && 'listing_id' in response.data)
        ? response.data as Review
        : {
            ...review,
            id: Date.now(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as Review;
      return {
        success: true,
        data: createdReview,
        message: '리뷰가 작성되었습니다.'
      };
    } catch (error) {
      console.error('Failed to create review:', error);
      return {
        success: false,
        error: '리뷰 작성에 실패했습니다.'
      };
    }
  },

  getBookings: async (userId?: number): Promise<Booking[]> => {
    try {
      const query = userId ? { user_id: userId } : undefined;
      const response = await db.select('bookings', query);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      return [];
    }
  },

  // 사용자 관리
  getUsers: async (): Promise<User[]> => {
    try {
      const response = await db.select('users');
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return [];
    }
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    try {
      const response = await db.select('users', { email });
      return response.data?.[0] || null;
    } catch (error) {
      console.error('Failed to fetch user by email:', error);
      return null;
    }
  },

  createUser: async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<User>> => {
    try {
      const user = {
        ...userData,
        user_id: `user_${Date.now()}`,
        marketing_consent: false,
        preferred_language: 'ko',
        preferred_currency: 'KRW'
      };

      const response = await db.insert('users', user);
      // 생성된 사용자에 필요한 필드들 추가
      const createdUser: User = (response.data && typeof response.data === 'object' && 'user_id' in response.data)
        ? response.data as User
        : {
            ...user,
            id: Date.now(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as User;
      return {
        success: true,
        data: createdUser,
        message: '사용자가 성공적으로 생성되었습니다.'
      };
    } catch (error) {
      console.error('Failed to create user:', error);
      return {
        success: false,
        error: '사용자 생성에 실패했습니다.'
      };
    }
  },

  // 파트너 관리
  createPartnerApplication: async (applicationData: Omit<PartnerApplication, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<PartnerApplication>> => {
    try {
      const application = {
        ...applicationData,
        status: 'pending' as const
      };

      const response = await db.insert('partner_applications', application);
      // 생성된 파트너 신청에 필요한 필드들 추가
      const createdApplication: PartnerApplication = (response.data && typeof response.data === 'object' && 'business_name' in response.data)
        ? response.data as PartnerApplication
        : {
            ...application,
            id: Date.now(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as PartnerApplication;
      return {
        success: true,
        data: createdApplication,
        message: '파트너 신청이 성공적으로 제출되었습니다.'
      };
    } catch (error) {
      console.error('Failed to create partner application:', error);
      return {
        success: false,
        error: '파트너 신청에 실패했습니다.'
      };
    }
  },

  // 검색
  searchListings: async (query: string, filters?: SearchFilters): Promise<TravelItem[]> => {
    try {
      let sql = `
        SELECT l.*, c.name_ko as category_name, p.business_name, p.tier, p.is_verified
        FROM listings l
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN partners p ON l.partner_id = p.id
        WHERE l.is_published = true
        AND (l.title LIKE ? OR l.description_md LIKE ? OR l.location LIKE ?)
      `;
      const params = [`%${query}%`, `%${query}%`, `%${query}%`];

      if (filters?.category && filters.category !== 'all') {
        sql += ' AND c.slug = ?';
        params.push(filters.category);
      }

      // 날짜 기간 필터링 추가
      if (filters?.startDate) {
        sql += ' AND (l.available_from IS NULL OR l.available_from <= ?)';
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        sql += ' AND (l.available_to IS NULL OR l.available_to >= ?)';
        params.push(filters.endDate);
      }

      sql += ' ORDER BY l.rating_avg DESC, l.created_at DESC';

      const response = await db.query(sql, params);
      const items = response.data || [];

      // Mock 데이터에서도 검색
      const mockResults = mockTravelItems.filter(item =>
        item.title.includes(query) ||
        item.short_description?.includes(query) ||
        item.location?.includes(query)
      );

      return [...items, ...mockResults];
    } catch (error) {
      console.error('Failed to search listings:', error);
      return mockTravelItems.filter(item =>
        item.title.includes(query) ||
        item.short_description?.includes(query) ||
        item.location?.includes(query)
      );
    }
  },

  // 리뷰
  getReviews: async (listingId: number): Promise<Review[]> => {
    try {
      const response = await db.select('reviews', { listing_id: listingId });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      return [];
    }
  },

  // 최신 리뷰 가져오기 (HomePage용)
  getRecentReviews: async (limit: number = 4): Promise<any[]> => {
    try {
      // 실제 DB에서 가져오기 시도
      const response = await db.query(`
        SELECT r.*, l.title as listing_title, u.name as user_name,
               l.location as listing_location, l.images as listing_images
        FROM reviews r
        LEFT JOIN listings l ON r.listing_id = l.id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.is_visible = 1
        ORDER BY r.created_at DESC
        LIMIT ${limit}
      `);

      if (response.data && response.data.length > 0) {
        return response.data.map((review: any) => ({
          ...review,
          listing: {
            id: review.listing_id,
            title: review.listing_title,
            location: review.listing_location,
            images: review.listing_images ? JSON.parse(review.listing_images) : []
          },
          user: {
            id: review.user_id,
            name: review.user_name,
            avatar: review.images ? JSON.parse(review.images)[0] : null
          }
        }));
      }

      // 실제 DB에 데이터가 없으면 빈 배열 반환
      return [];
    } catch (error) {
      console.error('Failed to fetch recent reviews:', error);
      // 에러 시 빈 배열 반환
      return [];
    }
  },

  // 쿠폰
  getCoupons: async (): Promise<Coupon[]> => {
    try {
      const response = await db.select('coupons', { is_active: true });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      return [];
    }
  },

  // 헬스 체크
  testConnection: async (): Promise<boolean> => {
    return await db.testConnection();
  },

  // 이미지 관리
  updateListingImages: async (listingId: number, imageUrls: string[]): Promise<ApiResponse<Listing>> => {
    try {
      const images = JSON.stringify(imageUrls);
      await db.update('listings', listingId, { images });

      const updated = await db.select('listings', { id: listingId });
      return {
        success: true,
        data: updated.data[0],
        message: '이미지가 업데이트되었습니다.'
      };
    } catch (error) {
      console.error('Failed to update listing images:', error);
      return {
        success: false,
        error: '이미지 업데이트에 실패했습니다.'
      };
    }
  },

  // 파일 업로드 기록
  createFileUpload: async (fileData: {
    entity_type: 'listing' | 'partner' | 'user' | 'review' | 'partner_application';
    entity_id: number;
    file_type: 'image' | 'document' | 'video';
    original_name: string;
    file_path: string;
    file_url: string;
    file_size: number;
    mime_type?: string;
    is_primary?: boolean;
    alt_text?: string;
    uploaded_by?: number;
  }): Promise<ApiResponse<any>> => {
    try {
      const response = await db.insert('file_uploads', fileData);
      return {
        success: true,
        data: response.data,
        message: '파일 업로드 기록이 저장되었습니다.'
      };
    } catch (error) {
      console.error('Failed to create file upload record:', error);
      return {
        success: false,
        error: '파일 업로드 기록 저장에 실패했습니다.'
      };
    }
  },

  // ===== 관리자 전용 API =====

  admin: {
    // 대시보드 통계
    getDashboardStats: async (): Promise<AdminDashboardStats | null> => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await db.select('admin_dashboard_stats', { date: today });

        if (response.data && response.data.length > 0) {
          return response.data[0];
        }

        // 기본 통계 생성
        const stats = {
          date: today,
          total_users: 150,
          new_users_today: 12,
          total_partners: 25,
          pending_partners: 5,
          total_listings: 85,
          published_listings: 72,
          total_bookings: 340,
          bookings_today: 8,
          total_revenue: 12500000,
          revenue_today: 450000,
          commission_earned: 1250000,
          avg_rating: 4.6,
          total_reviews: 128,
          pending_refunds: 3,
          support_tickets_open: 7
        };

        return {
          id: 1,
          ...stats,
          created_at: new Date().toISOString()
        };
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        return null;
      }
    },

    // 사용자 관리
    getUsers: async (filters?: AdminUserFilters): Promise<PaginatedResponse<User>> => {
      try {
        let sql = 'SELECT * FROM users WHERE 1=1';
        const params: any[] = [];

        if (filters?.role && filters.role.length > 0) {
          sql += ` AND role IN (${filters.role.map(() => '?').join(',')})`;
          params.push(...filters.role);
        }

        if (filters?.search) {
          sql += ' AND (name LIKE ? OR email LIKE ?)';
          params.push(`%${filters.search}%`, `%${filters.search}%`);
        }

        if (filters?.date_from) {
          sql += ' AND created_at >= ?';
          params.push(filters.date_from);
        }

        if (filters?.date_to) {
          sql += ' AND created_at <= ?';
          params.push(filters.date_to);
        }

        sql += ' ORDER BY created_at DESC';

        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const offset = (page - 1) * limit;
        sql += ` LIMIT ${limit} OFFSET ${offset}`;

        const response = await db.query(sql, params);
        const users = response.data || [];

        return {
          success: true,
          data: users,
          pagination: {
            page,
            limit,
            total: users.length,
            total_pages: Math.ceil(users.length / limit)
          }
        };
      } catch (error) {
        console.error('Failed to fetch admin users:', error);
        return {
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, total_pages: 0 }
        };
      }
    },

    // 파트너 관리
    getPartners: async (filters?: AdminPartnerFilters): Promise<PaginatedResponse<Partner>> => {
      try {
        let sql = `
          SELECT p.*, u.name as user_name, u.email as user_email
          FROM partners p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE 1=1
        `;
        const params: any[] = [];

        if (filters?.status && filters.status.length > 0) {
          sql += ` AND p.status IN (${filters.status.map(() => '?').join(',')})`;
          params.push(...filters.status);
        }

        if (filters?.tier && filters.tier.length > 0) {
          sql += ` AND p.tier IN (${filters.tier.map(() => '?').join(',')})`;
          params.push(...filters.tier);
        }

        if (filters?.business_name) {
          sql += ' AND p.business_name LIKE ?';
          params.push(`%${filters.business_name}%`);
        }

        sql += ' ORDER BY p.created_at DESC';

        const response = await db.query(sql, params);
        return {
          success: true,
          data: response.data || [],
          pagination: {
            page: filters?.page || 1,
            limit: filters?.limit || 20,
            total: (response.data || []).length,
            total_pages: Math.ceil((response.data || []).length / (filters?.limit || 20))
          }
        };
      } catch (error) {
        console.error('Failed to fetch admin partners:', error);
        return {
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, total_pages: 0 }
        };
      }
    },

    // 파트너 승인/거부
    updatePartnerStatus: async (partnerId: number, status: 'approved' | 'rejected', adminId: number): Promise<ApiResponse<Partner>> => {
      try {
        await db.update('partners', partnerId, { status });

        // 로그 기록
        await db.insert('admin_logs', {
          admin_id: adminId,
          action: status === 'approved' ? 'partner_approved' : 'partner_rejected',
          entity_type: 'partner',
          entity_id: partnerId,
          description: `파트너 상태를 ${status}로 변경`
        });

        const updatedPartner = await db.select('partners', { id: partnerId });
        return {
          success: true,
          data: updatedPartner.data[0],
          message: `파트너가 ${status === 'approved' ? '승인' : '거부'}되었습니다.`
        };
      } catch (error) {
        console.error('Failed to update partner status:', error);
        return {
          success: false,
          error: '파트너 상태 업데이트에 실패했습니다.'
        };
      }
    },

    // 예약 관리
    getBookings: async (filters?: AdminBookingFilters): Promise<PaginatedResponse<Booking>> => {
      try {
        let sql = `
          SELECT b.*, l.title as listing_title, u.name as user_name, u.email as user_email
          FROM bookings b
          LEFT JOIN listings l ON b.listing_id = l.id
          LEFT JOIN users u ON b.user_id = u.id
          WHERE 1=1
        `;
        const params: any[] = [];

        if (filters?.status && filters.status.length > 0) {
          sql += ` AND b.status IN (${filters.status.map(() => '?').join(',')})`;
          params.push(...filters.status);
        }

        if (filters?.payment_status && filters.payment_status.length > 0) {
          sql += ` AND b.payment_status IN (${filters.payment_status.map(() => '?').join(',')})`;
          params.push(...filters.payment_status);
        }

        if (filters?.booking_number) {
          sql += ' AND b.booking_number LIKE ?';
          params.push(`%${filters.booking_number}%`);
        }

        sql += ' ORDER BY b.created_at DESC';

        const response = await db.query(sql, params);
        return {
          success: true,
          data: response.data || [],
          pagination: {
            page: filters?.page || 1,
            limit: filters?.limit || 20,
            total: (response.data || []).length,
            total_pages: Math.ceil((response.data || []).length / (filters?.limit || 20))
          }
        };
      } catch (error) {
        console.error('Failed to fetch admin bookings:', error);
        return {
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, total_pages: 0 }
        };
      }
    },

    // 설정 관리
    getSettings: async (category?: string): Promise<AdminSettings[]> => {
      try {
        const where = category ? { setting_category: category } : undefined;
        const response = await db.select('admin_settings', where);
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        return [];
      }
    },

    updateSetting: async (settingKey: string, value: string, adminId: number): Promise<ApiResponse<AdminSettings>> => {
      try {
        await db.query('UPDATE admin_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?', [value, adminId, settingKey]);

        // 로그 기록
        await db.insert('admin_logs', {
          admin_id: adminId,
          action: 'setting_updated',
          entity_type: 'setting',
          description: `설정 ${settingKey} 값을 ${value}로 변경`
        });

        const updated = await db.select('admin_settings', { setting_key: settingKey });
        return {
          success: true,
          data: updated.data[0],
          message: '설정이 업데이트되었습니다.'
        };
      } catch (error) {
        console.error('Failed to update setting:', error);
        return {
          success: false,
          error: '설정 업데이트에 실패했습니다.'
        };
      }
    },

    // FAQ 관리
    getFAQs: async (): Promise<FAQ[]> => {
      try {
        const response = await db.select('faq');
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch FAQs:', error);
        return [];
      }
    },

    createFAQ: async (faqData: Omit<FAQ, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<FAQ>> => {
      try {
        const response = await db.insert('faq', faqData);
        // 생성된 FAQ에 필요한 필드들 추가
        const createdFAQ: FAQ = (response.data && typeof response.data === 'object' && 'question' in response.data)
          ? response.data as FAQ
          : {
              ...faqData,
              id: Date.now(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as FAQ;
        return {
          success: true,
          data: createdFAQ,
          message: 'FAQ가 생성되었습니다.'
        };
      } catch (error) {
        console.error('Failed to create FAQ:', error);
        return {
          success: false,
          error: 'FAQ 생성에 실패했습니다.'
        };
      }
    },

    // 관리자 로그
    getLogs: async (filters?: AdminLogFilters): Promise<PaginatedResponse<AdminLog>> => {
      try {
        let sql = `
          SELECT al.*, u.name as admin_name
          FROM admin_logs al
          LEFT JOIN users u ON al.admin_id = u.id
          WHERE 1=1
        `;
        const params: any[] = [];

        if (filters?.admin_id) {
          sql += ' AND al.admin_id = ?';
          params.push(filters.admin_id);
        }

        if (filters?.action && filters.action.length > 0) {
          sql += ` AND al.action IN (${filters.action.map(() => '?').join(',')})`;
          params.push(...filters.action);
        }

        if (filters?.entity_type && filters.entity_type.length > 0) {
          sql += ` AND al.entity_type IN (${filters.entity_type.map(() => '?').join(',')})`;
          params.push(...filters.entity_type);
        }

        sql += ' ORDER BY al.created_at DESC';

        const response = await db.query(sql, params);
        return {
          success: true,
          data: response.data || [],
          pagination: {
            page: filters?.page || 1,
            limit: filters?.limit || 50,
            total: (response.data || []).length,
            total_pages: Math.ceil((response.data || []).length / (filters?.limit || 50))
          }
        };
      } catch (error) {
        console.error('Failed to fetch admin logs:', error);
        return {
          success: true,
          data: [],
          pagination: { page: 1, limit: 50, total: 0, total_pages: 0 }
        };
      }
    },

    // 작업 관리
    getTasks: async (filters?: AdminTaskFilters): Promise<PaginatedResponse<AdminTask>> => {
      try {
        let sql = `
          SELECT at.*, u.name as assigned_to_name
          FROM admin_tasks at
          LEFT JOIN users u ON at.assigned_to = u.id
          WHERE 1=1
        `;
        const params: any[] = [];

        if (filters?.status && filters.status.length > 0) {
          sql += ` AND at.status IN (${filters.status.map(() => '?').join(',')})`;
          params.push(...filters.status);
        }

        if (filters?.priority && filters.priority.length > 0) {
          sql += ` AND at.priority IN (${filters.priority.map(() => '?').join(',')})`;
          params.push(...filters.priority);
        }

        if (filters?.assigned_to) {
          sql += ' AND at.assigned_to = ?';
          params.push(filters.assigned_to);
        }

        sql += ' ORDER BY at.priority DESC, at.created_at DESC';

        const response = await db.query(sql, params);
        return {
          success: true,
          data: response.data || [],
          pagination: {
            page: filters?.page || 1,
            limit: filters?.limit || 20,
            total: (response.data || []).length,
            total_pages: Math.ceil((response.data || []).length / (filters?.limit || 20))
          }
        };
      } catch (error) {
        console.error('Failed to fetch admin tasks:', error);
        return {
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, total_pages: 0 }
        };
      }
    },

    createTask: async (taskData: Omit<AdminTask, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<AdminTask>> => {
      try {
        const response = await db.insert('admin_tasks', taskData);
        // 생성된 작업에 필요한 필드들 추가
        const createdTask: AdminTask = (response.data && typeof response.data === 'object' && 'title' in response.data)
          ? response.data as AdminTask
          : {
              ...taskData,
              id: Date.now(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as AdminTask;
        return {
          success: true,
          data: createdTask,
          message: '작업이 생성되었습니다.'
        };
      } catch (error) {
        console.error('Failed to create task:', error);
        return {
          success: false,
          error: '작업 생성에 실패했습니다.'
        };
      }
    },

    updateTaskStatus: async (taskId: number, status: AdminTask['status'], adminId: number): Promise<ApiResponse<AdminTask>> => {
      try {
        const updateData: any = { status };
        if (status === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }

        await db.update('admin_tasks', taskId, updateData);

        const updated = await db.select('admin_tasks', { id: taskId });
        return {
          success: true,
          data: updated.data[0],
          message: '작업 상태가 업데이트되었습니다.'
        };
      } catch (error) {
        console.error('Failed to update task status:', error);
        return {
          success: false,
          error: '작업 상태 업데이트에 실패했습니다.'
        };
      }
    },

    // 파트너 신청 관리
    getPartnerApplications: async (filters?: any): Promise<ApiResponse<PartnerApplication[]>> => {
      try {
        const response = await db.select('partner_applications');
        return {
          success: true,
          data: response.data || []
        };
      } catch (error) {
        console.error('Failed to fetch partner applications:', error);
        return {
          success: false,
          error: '파트너 신청 목록 조회에 실패했습니다.',
          data: []
        };
      }
    },

    // 상품 생성
    createListing: async (listingData: any): Promise<ApiResponse<any>> => {
      try {
        const listing = {
          ...listingData,
          images: JSON.stringify(listingData.images || []),
          amenities: JSON.stringify(listingData.amenities || []),
          rating_avg: 0,
          rating_count: 0,
          view_count: 0,
          booking_count: 0
        };
        const response = await db.insert('listings', listing);
        return {
          success: true,
          data: response.data,
          message: '상품이 생성되었습니다.'
        };
      } catch (error) {
        console.error('Failed to create listing:', error);
        return {
          success: false,
          error: '상품 생성에 실패했습니다.'
        };
      }
    },

    // 상품 수정
    updateListing: async (listingId: number, listingData: Partial<Listing>): Promise<ApiResponse<Listing>> => {
      try {
        const updateData = {
          ...listingData,
          images: listingData.images ? JSON.stringify(listingData.images) : undefined,
          // amenities: listingData.amenities ? JSON.stringify(listingData.amenities) : undefined,
          updated_at: new Date().toISOString()
        };

        await db.update('listings', listingId, updateData);
        const updated = await db.select('listings', { id: listingId });

        return {
          success: true,
          data: updated.data[0],
          message: '상품이 성공적으로 수정되었습니다.'
        };
      } catch (error) {
        console.error('Failed to update listing:', error);
        return {
          success: false,
          error: '상품 수정에 실패했습니다.'
        };
      }
    },

    // 상품 삭제
    deleteListing: async (listingId: number): Promise<ApiResponse<null>> => {
      try {
        await db.delete('listings', listingId);
        return {
          success: true,
          data: null,
          message: '상품이 성공적으로 삭제되었습니다.'
        };
      } catch (error) {
        console.error('Failed to delete listing:', error);
        return {
          success: false,
          error: '상품 삭제에 실패했습니다.'
        };
      }
    }
  },

  // 예약 조회 (결제용)
  getBooking: async (bookingId: string): Promise<ApiResponse<Booking>> => {
    try {
      const response = await db.select('bookings', { id: parseInt(bookingId) });

      if (response.data && response.data.length > 0) {
        return {
          success: true,
          data: response.data[0],
          message: '예약 정보를 성공적으로 조회했습니다.'
        };
      } else {
        return {
          success: false,
          error: '예약 정보를 찾을 수 없습니다.'
        };
      }
    } catch (error) {
      console.error('Failed to fetch booking:', error);
      return {
        success: false,
        error: '예약 정보 조회에 실패했습니다.'
      };
    }
  },

  // 결제 처리
  processPayment: async (paymentData: {
    bookingId: string;
    amount: number;
    paymentMethod: string;
    cardInfo?: any;
    billingInfo: any;
  }): Promise<ApiResponse<any>> => {
    try {
      // 실제 결제 처리 로직 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000)); // 결제 처리 시뮬레이션

      // 랜덤으로 결제 실패 시뮬레이션 (10% 확률)
      if (Math.random() < 0.1) {
        return {
          success: false,
          error: '결제 승인이 거절되었습니다. 카드 정보를 확인해주세요.'
        };
      }

      // 결제 성공 - 예약 상태 업데이트
      const paymentRecord = {
        booking_id: parseInt(paymentData.bookingId),
        amount: paymentData.amount,
        payment_method: paymentData.paymentMethod,
        payment_status: 'completed',
        transaction_id: `txn_${Date.now()}`,
        paid_at: new Date().toISOString(),
        billing_info: JSON.stringify(paymentData.billingInfo),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 결제 기록 저장
      await db.insert('payments', paymentRecord);

      // 예약 상태를 confirmed로 업데이트
      await db.update('bookings', parseInt(paymentData.bookingId), {
        status: 'confirmed',
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      });

      return {
        success: true,
        data: {
          transactionId: paymentRecord.transaction_id,
          amount: paymentData.amount,
          paidAt: paymentRecord.paid_at
        },
        message: '결제가 성공적으로 완료되었습니다.'
      };
    } catch (error) {
      console.error('Failed to process payment:', error);
      return {
        success: false,
        error: '결제 처리 중 오류가 발생했습니다.'
      };
    }
  }
};

export default api;