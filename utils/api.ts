import { getApiBaseUrl } from './env';
import { db } from './database';
import { notifyDataChange } from '../hooks/useRealTimeData';
// 인증 서비스 제거됨
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
  original_price?: number;
  discount_rate?: number;
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
  included?: string[];
  excluded?: string[];
  policies?: string[];
  cancellation_policy?: string;
  refund_policy?: string;
  weather_policy?: string;
  amenities?: string[];
  tags?: string[];
  difficulty?: string;
  language?: string;
  min_age?: number;
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
  // DetailPage에서 사용하는 추가 필드들
  guest_name?: string;
  guest_phone?: string;
  guest_email?: string;
  booking_date?: string;
  guest_count?: number;
  total_amount?: number;
  emergency_contact?: string;
  dietary_restrictions?: string;
  special_needs?: string;
}

export interface SearchFilters {
  category?: string;
  location?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  startDate?: string;
  endDate?: string;
  guests?: number;
  sortBy?: 'price' | 'rating' | 'newest' | 'popular';
  page?: number;
  limit?: number;
  verifiedOnly?: boolean;
}

// 확장된 리뷰 인터페이스 (UI에서 사용)
export interface ExtendedReview extends Review {
  user_name?: string;
  images?: string[];
  content?: string;
  is_visible?: boolean;
}


// API 호출에 JWT 토큰 추가하는 헬퍼
const getAuthHeaders = () => {
  try {
    // 쿠키에서 토큰 가져오기
    if (typeof document !== 'undefined') {
      const tokenFromCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];

      if (tokenFromCookie) {
        return {
          'Authorization': `Bearer ${tokenFromCookie}`,
          'Content-Type': 'application/json'
        };
      }
    }

    // 로컬스토리지에서 토큰 가져오기 (백업)
    if (typeof localStorage !== 'undefined') {
      const tokenFromStorage = localStorage.getItem('auth_token');
      if (tokenFromStorage) {
        const token = JSON.parse(tokenFromStorage);
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
      }
    }

    return {
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('인증 헤더 생성 오류:', error);
    return {
      'Content-Type': 'application/json'
    };
  }
};

// 인증이 필요한 API 호출
const authenticatedRequest = async <T>(
  operation: () => Promise<ApiResponse<T>>,
  requireAuth: boolean = true
): Promise<ApiResponse<T>> => {
  // 인증 체크 제거됨

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
      return response || [];
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      return [];
    }
  },

  // 리스팅 관리
  getListings: async (filters?: SearchFilters): Promise<PaginatedResponse<TravelItem>> => {
    try {
      // 직접 DB에서 가져오기
      let sql = `
        SELECT l.*, c.slug as category_slug, c.name_ko as category_name
        FROM listings l
        LEFT JOIN categories c ON l.category_id = c.id
        WHERE l.is_published = 1
      `;
      const params: any[] = [];

      // 카테고리 필터
      if (filters?.category && filters.category !== 'all') {
        sql += ' AND c.slug = ?';
        params.push(filters.category);
      }

      // 가격 필터
      if (filters?.minPrice) {
        sql += ' AND l.price_from >= ?';
        params.push(filters.minPrice);
      }

      if (filters?.maxPrice) {
        sql += ' AND l.price_from <= ?';
        params.push(filters.maxPrice);
      }

      // 평점 필터
      if (filters?.rating) {
        sql += ' AND l.rating_avg >= ?';
        params.push(filters.rating);
      }

      // 검색어
      if (filters?.search) {
        sql += ' AND (l.title LIKE ? OR l.short_description LIKE ? OR l.location LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
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
        default:
          sql += ' ORDER BY l.view_count DESC, l.booking_count DESC';
          break;
      }

      // 페이징
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;
      sql += ` LIMIT ${limit} OFFSET ${offset}`;

      console.log('📡 Executing SQL:', sql, params);

      const response = await db.query(sql, params);
      const listings = response || [];

      // TravelItem 형식으로 변환
      const travelItems: TravelItem[] = listings.map((item: any) => ({
        id: item.id,
        title: item.title,
        description_md: item.description_md,
        short_description: item.short_description,
        category: item.category_slug || item.category,
        category_id: item.category_id,
        price_from: item.price_from,
        price_to: item.price_to,
        images: (() => {
          try {
            if (typeof item.images === 'string') {
              return JSON.parse(item.images);
            } else if (Array.isArray(item.images)) {
              return item.images;
            }
            return ['https://via.placeholder.com/400x300'];
          } catch (e) {
            return ['https://via.placeholder.com/400x300'];
          }
        })(),
        location: item.location || '전라남도 신안군',
        rating_avg: Number(item.rating_avg) || 0,
        rating_count: item.rating_count || 0,
        duration: item.duration,
        max_capacity: item.max_capacity,
        is_active: Boolean(item.is_published),
        is_featured: Boolean(item.is_featured),
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

      console.log(`✅ Fetched ${travelItems.length} listings from DB`);

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
      console.error('❌ Failed to fetch listings:', error);
      return {
        success: false,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          total_pages: 0
        }
      };
    }
  },

  getListing: async (id: number): Promise<TravelItem | null> => {
    try {
      const response = await db.select('listings', { id });
      const listing = response?.[0];

      if (!listing) {
        return null;
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
        images: (() => {
          try {
            return listing.images && typeof listing.images === 'string'
              ? JSON.parse(listing.images)
              : (Array.isArray(listing.images) ? listing.images : ['https://via.placeholder.com/400x300']);
          } catch (e) {
            console.warn('Invalid JSON in images field:', listing.images);
            return ['https://via.placeholder.com/400x300'];
          }
        })(),
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
      return null;
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
      const createdBooking: Booking = (response && typeof response === 'object' && 'booking_number' in response)
        ? response as Booking
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
        data: cancelledBooking[0],
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
      // 간단한 인증으로 변경됨 - 관리자 사용자 반환
      return {
        id: 1,
        email: 'admin@shinan.com',
        name: '관리자',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  },

  // 사용자 ID로 정보 가져오기
  getUserById: async (id: number): Promise<User | null> => {
    try {
      const response = await db.select('users', { id });

      if (response && response.length > 0) {
        return response[0];
      }

      // DB에서 찾지 못한 경우 관리자 계정인지 확인
      if (id === 1) {
        return {
          id: 1,
          user_id: 'admin_shinan',
          email: 'admin@shinan.com',
          name: '관리자',
          role: 'admin',
          phone: '010-0000-0000',
          password_hash: 'hashed_admin123',
          is_active: true,
          preferred_language: 'ko',
          preferred_currency: 'KRW',
          marketing_consent: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User;
      }

      return null;
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

  // 문의 제출
  createContactSubmission: async (contactData: {
    name: string;
    email: string;
    message: string;
  }): Promise<ApiResponse<any>> => {
    try {
      const submission = {
        ...contactData,
        status: 'new',
        created_at: new Date().toISOString()
      };

      const response = await db.insert('contact_submissions', submission);
      return {
        success: true,
        data: response,
        message: '문의가 성공적으로 접수되었습니다.'
      };
    } catch (error) {
      console.error('Failed to submit contact:', error);
      return {
        success: false,
        error: '문의 접수에 실패했습니다.'
      };
    }
  },

  // 특정 listing의 평점 재계산 및 업데이트
  updateListingRating: async (listingId: number): Promise<void> => {
    try {
      // 해당 listing의 모든 리뷰 가져오기
      const reviews = await db.query(
        'SELECT rating FROM reviews WHERE listing_id = ? AND is_verified = 1',
        [listingId]
      );

      if (reviews && reviews.length > 0) {
        const totalRating = reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
        const avgRating = totalRating / reviews.length;
        const count = reviews.length;

        // listing 업데이트
        await db.update('listings', listingId, {
          rating_avg: Number(avgRating.toFixed(1)),
          rating_count: count
        });

        console.log(`✅ Updated rating for listing ${listingId}: ${avgRating.toFixed(1)} (${count} reviews)`);
      } else {
        // 리뷰가 없으면 0으로 설정
        await db.update('listings', listingId, {
          rating_avg: 0,
          rating_count: 0
        });
        console.log(`✅ Reset rating for listing ${listingId} (no reviews)`);
      }
    } catch (error) {
      console.error('Failed to update listing rating:', error);
    }
  },

  // 리뷰 생성 (자동 승인)
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
        is_verified: true, // 자동 승인
        helpful_count: 0,
        response_from_partner: null
      };
      const response = await db.insert('reviews', review);

      // 평점 자동 업데이트
      await api.updateListingRating(reviewData.listing_id);

      // 생성된 리뷰에 필요한 필드들 추가
      const createdReview: Review = (response && typeof response === 'object' && 'listing_id' in response)
        ? response as Review
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
      return response || [];
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      return [];
    }
  },

  // 사용자 관리
  getUsers: async (): Promise<User[]> => {
    try {
      const response = await db.select('users');
      return response || [];
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return [];
    }
  },

  getUserByEmail: async (email: string): Promise<User | null> => {
    try {
      const response = await db.select('users', { email });

      if (response && response.length > 0) {
        return response[0];
      }

      // DB에서 찾지 못한 경우 관리자 계정인지 확인
      if (email === 'admin@shinan.com') {
        return {
          id: 1,
          user_id: 'admin_shinan',
          email: 'admin@shinan.com',
          name: '관리자',
          role: 'admin',
          phone: '010-0000-0000',
          password_hash: 'hashed_admin123',
          is_active: true,
          preferred_language: 'ko',
          preferred_currency: 'KRW',
          marketing_consent: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User;
      }

      return null;
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
      const createdUser: User = (response && typeof response === 'object' && 'user_id' in response)
        ? response as User
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
      const createdApplication: PartnerApplication = (response && typeof response === 'object' && 'business_name' in response)
        ? response as PartnerApplication
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

  // 파트너 조회 (일반 API)
  getPartners: async (): Promise<ApiResponse<Partner[]>> => {
    try {
      console.log('📡 Fetching partners from DB...');

      // 직접 DB에서 파트너 조회 (승인된 파트너만)
      const partners = await db.query(`
        SELECT
          p.id,
          p.business_name,
          p.contact_name,
          p.email,
          p.phone,
          p.business_number,
          p.website,
          p.instagram,
          p.description,
          p.services,
          p.tier,
          p.is_verified,
          p.is_featured,
          p.status,
          p.lat,
          p.lng,
          p.created_at,
          p.updated_at
        FROM partners p
        WHERE p.status = 'approved'
        ORDER BY p.is_featured DESC, p.tier DESC, p.created_at DESC
      `);

      console.log(`✅ Partners 데이터 로드 성공: ${partners.length}개`);

      return {
        success: true,
        data: partners || []
      };
    } catch (error) {
      console.error('🔥 getPartners 오류:', error);
      return {
        success: false,
        error: '파트너 조회에 실패했습니다.',
        data: []
      };
    }
  },

  // 카테고리별 리스팅 조회
  getListingsByCategory: async (categorySlug: string, limit: number = 8): Promise<TravelItem[]> => {
    try {
      const filters: SearchFilters = {
        category: categorySlug,
        limit,
        sortBy: 'popular'
      };
      const response = await api.getListings(filters);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch listings by category:', error);
      return [];
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
        WHERE (l.title LIKE ? OR l.description_md LIKE ? OR l.location LIKE ?)
      `;
      const params = [`%${query}%`, `%${query}%`, `%${query}%`];

      if (filters?.category && filters.category !== 'all') {
        // 영문 → 한글 카테고리 매핑 (DB에는 한글로 저장됨)
        const englishToKorean: { [key: string]: string } = {
          'tour': '여행',
          'stay': '숙박',
          'food': '음식',
          'rentcar': '렌트카',
          'tourist': '관광지',
          'popup': '팝업',
          'event': '행사',
          'experience': '체험'
        };

        const categoryForDB = englishToKorean[filters.category] || filters.category;
        sql += ' AND l.category = ?';
        params.push(categoryForDB);
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
      const items = response || [];

      return items;
    } catch (error) {
      console.error('Failed to search listings:', error);
      return [];
    }
  },

  // 리뷰
  getReviews: async (listingId: number): Promise<Review[]> => {
    try {
      const response = await db.select('reviews', { listing_id: listingId });
      return response || [];
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
        WHERE r.is_verified = 1
        ORDER BY r.created_at DESC
        LIMIT ${limit}
      `);

      if (response && response.length > 0) {
        return response.map((review: any) => ({
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
      return response || [];
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      return [];
    }
  },

  // 헬스 체크
  testConnection: async (): Promise<boolean> => {
    return await db.testConnection();
  },

  // 추천 상품 조회
  getFeaturedListings: async (limit: number = 8): Promise<TravelItem[]> => {
    try {
      const filters: SearchFilters = {
        limit,
        sortBy: 'popular'
      };
      const response = await api.getListings(filters);
      return response.data?.slice(0, limit) || [];
    } catch (error) {
      console.error('Failed to fetch featured listings:', error);
      return [];
    }
  },

  // 사용 가능한 날짜 조회
  getAvailableDates: async (listingId: number): Promise<string[]> => {
    try {
      // 실제로는 예약된 날짜를 제외하고 사용 가능한 날짜를 반환
      const now = new Date();
      const dates: string[] = [];
      for (let i = 1; i <= 30; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
      return dates;
    } catch (error) {
      console.error('Failed to fetch available dates:', error);
      return [];
    }
  },

  // 즐겨찾기 관리
  getFavorites: async (userId?: number): Promise<number[]> => {
    try {
      if (!userId) {
        const user = await api.getCurrentUser();
        if (!user) return [];
        userId = user.id;
      }

      const response = await db.select('user_favorites', { user_id: userId });
      return response?.map((fav: any) => fav.listing_id) || [];
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
      return [];
    }
  },

  addFavorite: async (listingId: number, userId?: number): Promise<boolean> => {
    try {
      if (!userId) {
        const user = await api.getCurrentUser();
        if (!user) return false;
        userId = user.id;
      }

      await db.insert('user_favorites', {
        user_id: userId,
        listing_id: listingId,
        created_at: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Failed to add favorite:', error);
      return false;
    }
  },

  removeFavorite: async (listingId: number, userId?: number): Promise<boolean> => {
    try {
      if (!userId) {
        const user = await api.getCurrentUser();
        if (!user) return false;
        userId = user.id;
      }

      await db.query('DELETE FROM user_favorites WHERE user_id = ? AND listing_id = ?', [userId, listingId]);
      return true;
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      return false;
    }
  },

  // 이미지 관리
  updateListingImages: async (listingId: number, imageUrls: string[]): Promise<ApiResponse<Listing>> => {
    try {
      const images = JSON.stringify(imageUrls);
      await db.update('listings', listingId, { images });

      const updated = await db.select('listings', { id: listingId });
      return {
        success: true,
        data: updated[0],
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
        data: response,
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

        // 실제 DB에서 통계 계산 (payments 테이블 사용 - 주문관리와 동일)
        const [
          users,
          partners,
          listings,
          payments,
          reviews
        ] = await Promise.all([
          db.select('users') || [],
          db.select('partners') || [],
          db.select('listings') || [],
          db.select('payments') || [],
          db.select('reviews') || []
        ]);

        // cart 주문만 필터링 (bookings가 아닌 실제 주문)
        const orders = payments.filter(p => {
          try {
            const notes = p.notes ? JSON.parse(p.notes) : {};
            return notes.orderType === 'cart';
          } catch {
            return false;
          }
        });

        // 오늘 생성된 데이터 계산
        const todayUsers = users.filter(u => u.created_at?.startsWith(today)) || [];
        const todayOrders = orders.filter(o => o.created_at?.startsWith(today)) || [];

        // 파트너 상태별 계산
        const pendingPartners = partners.filter(p => p.status === 'pending') || [];

        // 상품 상태별 계산
        const publishedListings = listings.filter(l => l.is_active === true) || [];

        // 평균 평점 계산
        const ratingsSum = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
        const avgRating = reviews.length > 0 ? ratingsSum / reviews.length : 0;

        // 총 수익 계산 (실제 주문 금액 기준)
        const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
        const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

        // 수수료 계산 (10% 가정)
        const commissionEarned = totalRevenue * 0.1;

        const stats = {
          date: today,
          total_users: users.length,
          new_users_today: todayUsers.length,
          total_partners: partners.length,
          pending_partners: pendingPartners.length,
          total_listings: listings.length,
          published_listings: publishedListings.length,
          total_bookings: orders.length,
          bookings_today: todayOrders.length,
          total_revenue: Math.round(totalRevenue),
          revenue_today: Math.round(todayRevenue),
          commission_earned: Math.round(commissionEarned),
          avg_rating: Math.round(avgRating * 10) / 10,
          total_reviews: reviews.length,
          pending_refunds: orders.filter(o => o.status === 'refund_requested').length,
          support_tickets_open: 0
        };


        return {
          id: 1,
          ...stats,
          created_at: new Date().toISOString()
        };
      } catch (error) {
        console.error('❌ 대시보드 통계 계산 실패:', error);

        // 오류 발생 시 기본값 반환
        return {
          id: 1,
          date: new Date().toISOString().split('T')[0],
          total_users: 0,
          new_users_today: 0,
          total_partners: 0,
          pending_partners: 0,
          total_listings: 0,
          published_listings: 0,
          total_bookings: 0,
          bookings_today: 0,
          total_revenue: 0,
          revenue_today: 0,
          commission_earned: 0,
          avg_rating: 0,
          total_reviews: 0,
          pending_refunds: 0,
          support_tickets_open: 0,
          created_at: new Date().toISOString()
        };
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
        const users = response || [];

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
          data: response || [],
          pagination: {
            page: filters?.page || 1,
            limit: filters?.limit || 20,
            total: (response || []).length,
            total_pages: Math.ceil((response || []).length / (filters?.limit || 20))
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
          data: updatedPartner[0],
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
          data: response || [],
          pagination: {
            page: filters?.page || 1,
            limit: filters?.limit || 20,
            total: (response || []).length,
            total_pages: Math.ceil((response || []).length / (filters?.limit || 20))
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
        return response || [];
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
          data: updated[0],
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
        return response || [];
      } catch (error) {
        console.error('Failed to fetch FAQs:', error);
        return [];
      }
    },

    createFAQ: async (faqData: Omit<FAQ, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<FAQ>> => {
      try {
        const response = await db.insert('faq', faqData);
        // 생성된 FAQ에 필요한 필드들 추가
        const createdFAQ: FAQ = (response && typeof response === 'object' && 'question' in response)
          ? response as FAQ
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
          data: response || [],
          pagination: {
            page: filters?.page || 1,
            limit: filters?.limit || 50,
            total: (response || []).length,
            total_pages: Math.ceil((response || []).length / (filters?.limit || 50))
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
          data: response || [],
          pagination: {
            page: filters?.page || 1,
            limit: filters?.limit || 20,
            total: (response || []).length,
            total_pages: Math.ceil((response || []).length / (filters?.limit || 20))
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
        const createdTask: AdminTask = (response && typeof response === 'object' && 'title' in response)
          ? response as AdminTask
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
          data: updated[0],
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

    // 관리자 상품 목록 조회 (DB Direct)
    getListings: async (): Promise<ApiResponse<any[]>> => {
      try {
        console.log('📡 Fetching admin listings from DB...');

        // 직접 DB에서 모든 상품 조회
        const listings = await db.query(`
          SELECT
            l.*,
            c.name_ko as category_name,
            c.slug as category_slug
          FROM listings l
          LEFT JOIN categories c ON l.category_id = c.id
          ORDER BY l.created_at DESC
        `);

        console.log(`✅ Loaded ${listings.length} listings for admin`);

        return {
          success: true,
          data: listings
        };
      } catch (error) {
        console.error('❌ Failed to fetch admin listings:', error);
        return {
          success: false,
          data: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },

    // 파트너 신청 관리 (HTTP API)
    getPartnerApplications: async (filters?: any): Promise<ApiResponse<PartnerApplication[]>> => {
      try {
        console.log('📡 Fetching partner applications from DB...');

        // 직접 DB에서 파트너 신청 조회 (pending 상태만)
        const applications = await db.query(`
          SELECT
            id,
            business_name,
            contact_name,
            email,
            phone,
            business_number,
            business_address,
            categories,
            description,
            services,
            website,
            instagram,
            facebook,
            expected_revenue,
            years_in_business,
            status,
            admin_notes,
            reviewed_by,
            reviewed_at,
            created_at,
            updated_at
          FROM partner_applications
          WHERE status = 'pending'
          ORDER BY created_at DESC
        `);

        console.log(`✅ 파트너 신청 ${applications.length}개 로드 완료`);

        return {
          success: true,
          data: applications || []
        };
      } catch (error) {
        console.error('❌ Failed to fetch partner applications:', error);
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
          highlights: JSON.stringify(listingData.highlights || []),
          included: JSON.stringify(listingData.included || []),
          excluded: JSON.stringify(listingData.excluded || []),
          tags: JSON.stringify(listingData.tags || []),
          rating_avg: 0,
          rating_count: 0,
          view_count: 0,
          booking_count: 0,
          is_featured: listingData.is_featured || false
        };

        const response = await db.insert('listings', listing);

        return {
          success: true,
          data: response,
          message: '상품이 생성되었습니다.'
        };
      } catch (error) {
        console.error('createListing error:', error);
        return {
          success: false,
          error: '상품 생성에 실패했습니다: ' + (error instanceof Error ? error.message : String(error))
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
          data: updated[0],
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
    },

    // 모든 리뷰 조회
    getAllReviews: async (): Promise<ApiResponse<Review[]>> => {
      try {
        const response = await db.query(`
          SELECT
            r.*,
            u.name as user_name,
            l.title as listing_title
          FROM reviews r
          LEFT JOIN users u ON r.user_id = u.id
          LEFT JOIN listings l ON r.listing_id = l.id
          ORDER BY r.created_at DESC
        `);
        return {
          success: true,
          data: response || []
        };
      } catch (error) {
        console.error('Failed to fetch all reviews:', error);
        return {
          success: false,
          error: '리뷰 조회에 실패했습니다.',
          data: []
        };
      }
    },

    // 모든 사용자 조회 (별칭)
    getAllUsers: async (filters?: AdminUserFilters): Promise<PaginatedResponse<User>> => {
      return api.admin.getUsers(filters);
    },

    // 파트너 신청 승인
    approvePartnerApplication: async (applicationId: number): Promise<ApiResponse<any>> => {
      try {
        console.log(`🔄 파트너 신청 승인 시작 (ID: ${applicationId})`);

        // 1. 파트너 신청 정보 가져오기
        const applicationResult = await db.query(
          'SELECT * FROM partner_applications WHERE id = ?',
          [applicationId]
        );

        if (!applicationResult || applicationResult.length === 0) {
          console.error('❌ 파트너 신청을 찾을 수 없음');
          return {
            success: false,
            error: '파트너 신청을 찾을 수 없습니다.'
          };
        }

        const application = applicationResult[0];
        console.log(`✅ 신청 정보 조회 완료: ${application.business_name}`);

        // 2. partners 테이블에 파트너 생성
        const newPartner = {
          user_id: application.user_id || 1,
          business_name: application.business_name,
          contact_name: application.contact_name,
          email: application.email,
          phone: application.phone || '',
          business_number: application.business_number || '',
          description: application.description || '',
          services: application.services || '',
          tier: 'bronze',
          is_verified: 1,
          is_featured: 0,
          status: 'approved'
        };

        const partnerResult = await db.insert('partners', newPartner);
        const partnerId = partnerResult.id;
        console.log(`✅ 파트너 생성 완료 (ID: ${partnerId})`);

        // 3. 파트너 신청 상태 업데이트
        const reviewedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await db.update('partner_applications', applicationId, {
          status: 'approved',
          reviewed_at: reviewedAt
        });
        console.log(`✅ 신청 상태 업데이트 완료`);

        // 4. 실시간 데이터 갱신
        notifyDataChange('partners');
        console.log(`✅ 실시간 데이터 갱신 완료`);

        return {
          success: true,
          data: {
            applicationId,
            partnerId,
            status: 'approved'
          },
          message: '파트너 신청이 승인되었습니다.'
        };
      } catch (error) {
        console.error('❌ 파트너 승인 오류:', error);
        return {
          success: false,
          error: '파트너 승인에 실패했습니다: ' + (error instanceof Error ? error.message : String(error))
        };
      }
    },

    // 파트너 신청 거절
    rejectPartnerApplication: async (applicationId: number): Promise<ApiResponse<any>> => {
      try {
        console.log(`🔄 파트너 신청 거절 시작 (ID: ${applicationId})`);

        // 1. 파트너 신청 상태 업데이트
        const reviewedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await db.update('partner_applications', applicationId, {
          status: 'rejected',
          reviewed_at: reviewedAt
        });
        console.log(`✅ 신청 상태 업데이트 완료`);

        return {
          success: true,
          data: { id: applicationId, status: 'rejected' },
          message: '파트너 신청이 거절되었습니다.'
        };
      } catch (error) {
        console.error('❌ 파트너 거절 오류:', error);
        return {
          success: false,
          error: '파트너 거부에 실패했습니다: ' + (error instanceof Error ? error.message : String(error))
        };
      }
    },

    // 파트너 생성
    createPartner: async (partnerData: any): Promise<ApiResponse<Partner>> => {
      try {
        const response = await db.insert('partners', partnerData);
        return {
          success: true,
          data: response as Partner,
          message: '파트너가 생성되었습니다.'
        };
      } catch (error) {
        console.error('Failed to create partner:', error);
        return {
          success: false,
          error: '파트너 생성에 실패했습니다.'
        };
      }
    },

    // 파트너 수정
    updatePartner: async (partnerId: number, partnerData: any): Promise<ApiResponse<Partner>> => {
      try {
        await db.update('partners', partnerId, partnerData);
        const updated = await db.select('partners', { id: partnerId });
        return {
          success: true,
          data: updated[0],
          message: '파트너 정보가 수정되었습니다.'
        };
      } catch (error) {
        console.error('Failed to update partner:', error);
        return {
          success: false,
          error: '파트너 수정에 실패했습니다.'
        };
      }
    },

    // 파트너 삭제
    deletePartner: async (partnerId: number): Promise<ApiResponse<null>> => {
      try {
        await db.delete('partners', partnerId);
        return {
          success: true,
          data: null,
          message: '파트너가 삭제되었습니다.'
        };
      } catch (error) {
        console.error('Failed to delete partner:', error);
        return {
          success: false,
          error: '파트너 삭제에 실패했습니다.'
        };
      }
    },

    // 리뷰 생성
    createReview: async (reviewData: any): Promise<ApiResponse<Review>> => {
      try {
        const response = await db.insert('reviews', reviewData);
        return {
          success: true,
          data: response as Review,
          message: '리뷰가 생성되었습니다.'
        };
      } catch (error) {
        console.error('Failed to create review:', error);
        return {
          success: false,
          error: '리뷰 생성에 실패했습니다.'
        };
      }
    },

    // 리뷰 수정
    updateReview: async (reviewId: number, reviewData: any): Promise<ApiResponse<Review>> => {
      try {
        // 기존 리뷰 정보 조회 (listing_id 가져오기)
        const existing = await db.select('reviews', { id: reviewId });
        const listingId = existing[0]?.listing_id;

        await db.update('reviews', reviewId, reviewData);
        const updated = await db.select('reviews', { id: reviewId });

        // 평점이 변경된 경우 listing 평점 업데이트
        if (listingId && reviewData.rating !== undefined) {
          await api.updateListingRating(listingId);
        }

        return {
          success: true,
          data: updated[0],
          message: '리뷰가 수정되었습니다.'
        };
      } catch (error) {
        console.error('Failed to update review:', error);
        return {
          success: false,
          error: '리뷰 수정에 실패했습니다.'
        };
      }
    },

    // 리뷰 삭제
    deleteReview: async (reviewId: number): Promise<ApiResponse<null>> => {
      try {
        // 삭제 전 listing_id 가져오기
        const existing = await db.select('reviews', { id: reviewId });
        const listingId = existing[0]?.listing_id;

        await db.delete('reviews', reviewId);

        // listing 평점 업데이트
        if (listingId) {
          await api.updateListingRating(listingId);
        }

        return {
          success: true,
          data: null,
          message: '리뷰가 삭제되었습니다.'
        };
      } catch (error) {
        console.error('Failed to delete review:', error);
        return {
          success: false,
          error: '리뷰 삭제에 실패했습니다.'
        };
      }
    },

    // 리뷰 도움됨 버튼
    markReviewHelpful: async (reviewId: number): Promise<ApiResponse<{ helpful_count: number }>> => {
      try {
        // 현재 helpful_count 가져오기
        const current = await db.query('SELECT helpful_count FROM reviews WHERE id = ?', [reviewId]);
        const currentCount = current[0]?.helpful_count || 0;
        const newCount = currentCount + 1;

        // helpful_count 증가
        await db.update('reviews', reviewId, { helpful_count: newCount });

        console.log(`✅ 리뷰 ${reviewId} 도움됨 +1 (${newCount})`);

        return {
          success: true,
          data: { helpful_count: newCount },
          message: '도움이 되었습니다.'
        };
      } catch (error) {
        console.error('Failed to mark review helpful:', error);
        return {
          success: false,
          error: '도움됨 처리에 실패했습니다.'
        };
      }
    },

    // 리뷰 상태 변경
    updateReviewStatus: async (reviewId: number, status: string): Promise<ApiResponse<Review>> => {
      try {
        await db.update('reviews', reviewId, { is_visible: status === 'approved' });
        const updated = await db.select('reviews', { id: reviewId });
        return {
          success: true,
          data: updated[0],
          message: '리뷰 상태가 변경되었습니다.'
        };
      } catch (error) {
        console.error('Failed to update review status:', error);
        return {
          success: false,
          error: '리뷰 상태 변경에 실패했습니다.'
        };
      }
    },

    // 사용자 삭제
    deleteUser: async (userId: number): Promise<ApiResponse<null>> => {
      try {
        await db.delete('users', userId);
        return {
          success: true,
          data: null,
          message: '사용자가 삭제되었습니다.'
        };
      } catch (error) {
        console.error('Failed to delete user:', error);
        return {
          success: false,
          error: '사용자 삭제에 실패했습니다.'
        };
      }
    },

    // 사용자 상태 변경
    updateUserStatus: async (userId: number, status: string): Promise<ApiResponse<User>> => {
      try {
        await db.update('users', userId, { status });
        const updated = await db.select('users', { id: userId });
        return {
          success: true,
          data: updated[0],
          message: '사용자 상태가 변경되었습니다.'
        };
      } catch (error) {
        console.error('Failed to update user status:', error);
        return {
          success: false,
          error: '사용자 상태 변경에 실패했습니다.'
        };
      }
    },

    // 블로그 관리
    getBlogs: async (filters?: any): Promise<ApiResponse<any[]>> => {
      try {
        const response = await db.select('blog_posts');
        return {
          success: true,
          data: response || []
        };
      } catch (error) {
        console.error('Failed to fetch blogs:', error);
        return {
          success: false,
          error: '블로그 조회에 실패했습니다.',
          data: []
        };
      }
    },

    createBlog: async (blogData: any): Promise<ApiResponse<any>> => {
      try {
        const response = await db.insert('blog_posts', {
          ...blogData,
          tags: JSON.stringify(blogData.tags || []),
          views: 0,
          likes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        return {
          success: true,
          data: response,
          message: '블로그 포스트가 생성되었습니다.'
        };
      } catch (error) {
        console.error('Failed to create blog:', error);
        return {
          success: false,
          error: '블로그 생성에 실패했습니다.'
        };
      }
    },

    updateBlog: async (blogId: number, blogData: any): Promise<ApiResponse<any>> => {
      try {
        await db.update('blog_posts', blogId, {
          ...blogData,
          tags: blogData.tags ? JSON.stringify(blogData.tags) : undefined,
          updated_at: new Date().toISOString()
        });
        const updated = await db.select('blog_posts', { id: blogId });
        return {
          success: true,
          data: updated[0],
          message: '블로그 포스트가 수정되었습니다.'
        };
      } catch (error) {
        console.error('Failed to update blog:', error);
        return {
          success: false,
          error: '블로그 수정에 실패했습니다.'
        };
      }
    },

    deleteBlog: async (blogId: number): Promise<ApiResponse<null>> => {
      try {
        await db.delete('blog_posts', blogId);
        return {
          success: true,
          data: null,
          message: '블로그 포스트가 삭제되었습니다.'
        };
      } catch (error) {
        console.error('Failed to delete blog:', error);
        return {
          success: false,
          error: '블로그 삭제에 실패했습니다.'
        };
      }
    },

    // 이미지 관리
    getImages: async (filters?: any): Promise<ApiResponse<any[]>> => {
      try {
        let sql = 'SELECT id, entity_type, entity_id, file_name, original_name, file_size, mime_type, width, height, alt_text, is_primary, created_at, updated_at FROM images WHERE 1=1';
        const params: any[] = [];

        if (filters?.entity_type) {
          sql += ' AND entity_type = ?';
          params.push(filters.entity_type);
        }

        if (filters?.entity_id) {
          sql += ' AND entity_id = ?';
          params.push(filters.entity_id);
        }

        sql += ' ORDER BY created_at DESC';

        const response = await db.query(sql, params);
        return {
          success: true,
          data: response || []
        };
      } catch (error) {
        console.error('Failed to fetch images:', error);
        return {
          success: false,
          error: '이미지 조회에 실패했습니다.',
          data: []
        };
      }
    },

    uploadImage: async (imageFile: File, options?: {
      entity_type?: 'listing' | 'partner' | 'user' | 'review' | 'blog' | 'general';
      entity_id?: number;
      alt_text?: string;
      is_primary?: boolean;
      uploaded_by?: number;
    }): Promise<ApiResponse<any>> => {
      try {
        // 파일 검증
        if (!imageFile) {
          return {
            success: false,
            error: '이미지 파일이 필요합니다.'
          };
        }

        // 파일 크기 제한 (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (imageFile.size > maxSize) {
          return {
            success: false,
            error: '파일 크기는 5MB를 초과할 수 없습니다.'
          };
        }

        // 이미지 형식 검증
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(imageFile.type)) {
          return {
            success: false,
            error: '지원되지 않는 이미지 형식입니다. (JPG, PNG, WebP, GIF만 지원)'
          };
        }

        // 파일을 ArrayBuffer로 읽기
        const arrayBuffer = await imageFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // 이미지 크기 정보 얻기 (간단한 구현)
        let width = 0;
        let height = 0;

        // 이미지 로드하여 크기 정보 얻기
        const img = new Image();

        await new Promise((resolve, reject) => {
          img.onload = () => {
            width = img.naturalWidth;
            height = img.naturalHeight;
            resolve(null);
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(imageFile);
        });

        // 데이터베이스에 저장할 이미지 데이터
        const imageData = {
          entity_type: options?.entity_type || 'general',
          entity_id: options?.entity_id || null,
          file_name: `${Date.now()}_${imageFile.name}`,
          original_name: imageFile.name,
          file_data: uint8Array,
          file_size: imageFile.size,
          mime_type: imageFile.type,
          width,
          height,
          alt_text: options?.alt_text || '',
          is_primary: options?.is_primary || false,
          uploaded_by: options?.uploaded_by || 1,
          storage_type: 'blob',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const response = await db.insert('images', imageData);

        return {
          success: true,
          data: {
            id: response.id,
            file_name: imageData.file_name,
            original_name: imageData.original_name,
            file_size: imageData.file_size,
            mime_type: imageData.mime_type,
            width: imageData.width,
            height: imageData.height,
            storage_type: imageData.storage_type,
            url: `/api/images/${response.id}` // 이미지 조회 URL
          },
          message: '이미지가 성공적으로 업로드되었습니다.'
        };
      } catch (error) {
        console.error('Failed to upload image:', error);
        return {
          success: false,
          error: '이미지 업로드에 실패했습니다: ' + (error instanceof Error ? error.message : String(error))
        };
      }
    },

    // 이미지 BLOB 데이터 조회
    getImageBlob: async (imageId: number): Promise<ApiResponse<{
      data: Uint8Array;
      mimeType: string;
      fileName: string;
    }>> => {
      try {
        const response = await db.query('SELECT file_data, mime_type, file_name FROM images WHERE id = ?', [imageId]);

        if (!response || response.length === 0) {
          return {
            success: false,
            error: '이미지를 찾을 수 없습니다.'
          };
        }

        const image = response[0];

        return {
          success: true,
          data: {
            data: new Uint8Array(image.file_data),
            mimeType: image.mime_type,
            fileName: image.file_name
          }
        };
      } catch (error) {
        console.error('Failed to fetch image blob:', error);
        return {
          success: false,
          error: '이미지 조회에 실패했습니다.'
        };
      }
    },

    updateImage: async (imageId: number, imageData: any): Promise<ApiResponse<any>> => {
      try {
        await db.update('images', imageId, {
          ...imageData,
          updated_at: new Date().toISOString()
        });
        const updated = await db.select('images', { id: imageId });
        return {
          success: true,
          data: updated[0],
          message: '이미지 정보가 수정되었습니다.'
        };
      } catch (error) {
        console.error('Failed to update image:', error);
        return {
          success: false,
          error: '이미지 수정에 실패했습니다.'
        };
      }
    },

    deleteImage: async (imageId: number): Promise<ApiResponse<null>> => {
      try {
        await db.delete('images', imageId);
        return {
          success: true,
          data: null,
          message: '이미지가 삭제되었습니다.'
        };
      } catch (error) {
        console.error('Failed to delete image:', error);
        return {
          success: false,
          error: '이미지 삭제에 실패했습니다.'
        };
      }
    },

    // 주문 관리
    getOrders: async (filters?: any): Promise<ApiResponse<any[]>> => {
      try {
        // payments 테이블에서 주문 정보 조회 (cart 타입 주문)
        let sql = `
          SELECT p.*, u.name as user_name, u.email as user_email
          FROM payments p
          LEFT JOIN users u ON p.user_id = u.id
          WHERE p.notes LIKE '%"orderType":"cart"%'
        `;
        const params: any[] = [];

        if (filters?.status && filters.status.length > 0) {
          sql += ` AND p.status IN (${filters.status.map(() => '?').join(',')})`;
          params.push(...filters.status);
        }

        if (filters?.payment_method && filters.payment_method.length > 0) {
          sql += ` AND p.payment_method IN (${filters.payment_method.map(() => '?').join(',')})`;
          params.push(...filters.payment_method);
        }

        sql += ' ORDER BY p.created_at DESC';

        const response = await db.query(sql, params);

        // 주문 데이터 변환
        const orders = (response || []).map((order: any) => {
          let orderDetails = {};
          try {
            orderDetails = order.notes ? JSON.parse(order.notes) : {};
          } catch (e) {
            console.warn('Invalid JSON in order notes:', order.notes);
          }

          return {
            id: order.id,
            orderNumber: order.gateway_transaction_id || `ORDER_${order.id}`,
            userId: order.user_id,
            userName: order.user_name,
            userEmail: order.user_email,
            amount: order.amount,
            status: order.status,
            paymentMethod: order.payment_method,
            items: orderDetails.items || [],
            subtotal: orderDetails.subtotal || 0,
            deliveryFee: order.fee_amount || 0,
            discount: order.discount_amount || 0,
            total: order.amount,
            createdAt: order.created_at,
            updatedAt: order.updated_at
          };
        });

        return {
          success: true,
          data: orders
        };
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        return {
          success: false,
          error: '주문 조회에 실패했습니다.',
          data: []
        };
      }
    },

    updateOrderStatus: async (orderId: number, status: string): Promise<ApiResponse<any>> => {
      try {
        await db.update('payments', orderId, { status });
        const updated = await db.select('payments', { id: orderId });
        return {
          success: true,
          data: updated[0],
          message: '주문 상태가 변경되었습니다.'
        };
      } catch (error) {
        console.error('Failed to update order status:', error);
        return {
          success: false,
          error: '주문 상태 변경에 실패했습니다.'
        };
      }
    },

    deleteOrder: async (orderId: number): Promise<ApiResponse<null>> => {
      try {
        await db.delete('payments', orderId);
        return {
          success: true,
          data: null,
          message: '주문이 삭제되었습니다.'
        };
      } catch (error) {
        console.error('Failed to delete order:', error);
        return {
          success: false,
          error: '주문 삭제에 실패했습니다.'
        };
      }
    }
  },

  // 예약 조회 (결제용)
  getBooking: async (bookingId: string): Promise<ApiResponse<Booking>> => {
    try {
      const response = await db.select('bookings', { id: parseInt(bookingId) });

      if (response && response.length > 0) {
        return {
          success: true,
          data: response[0],
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

// 편의를 위한 개별 함수 export
export const getFavorites = (userId?: number) => api.getFavorites(userId);
export const addToFavorites = (listingId: number, userId?: number) => api.addFavorite(listingId, userId);
export const removeFromFavorites = (listingId: number, userId?: number) => api.removeFavorite(listingId, userId);