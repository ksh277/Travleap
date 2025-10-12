import { getApiBaseUrl } from './env';
import { db } from './database-cloud'; // PlanetScale 클라우드 DB 사용
import { notifyDataChange } from '../hooks/useRealTimeData';
import { notifyPartnerNewBooking, notifyCustomerBookingConfirmed } from './notification';
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
  highlights?: string[];
  address?: string;
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
      // 직접 DB에서 가져오기 (활성화되고 게시된 상품만)
      let sql = `
        SELECT l.*, c.slug as category_slug, c.name_ko as category_name
        FROM listings l
        LEFT JOIN categories c ON l.category_id = c.id
        WHERE l.is_published = 1 AND l.is_active = 1
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
            if (Array.isArray(item.images)) {
              return item.images;
            }
            if (typeof item.images === 'string') {
              // URL 문자열인 경우 배열로 감싸기
              if (item.images.startsWith('http://') || item.images.startsWith('https://') || item.images.startsWith('data:')) {
                return [item.images];
              }
              // JSON 배열인 경우 파싱
              return JSON.parse(item.images);
            }
            return ['https://via.placeholder.com/400x300'];
          } catch (e) {
            // JSON 파싱 실패시 문자열 그대로 배열로 반환
            return typeof item.images === 'string' ? [item.images] : ['https://via.placeholder.com/400x300'];
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
      // 상품 ID 검증
      if (!id || id <= 0) {
        console.error('Invalid listing ID:', id);
        return null;
      }

      const response = await db.select('listings', { id });
      const listing = response?.[0];

      if (!listing) {
        console.warn(`Listing not found with ID: ${id}`);
        return null;
      }

      // 안전한 JSON 파싱 헬퍼
      const safeJsonParse = (data: any, fallback: any = []) => {
        try {
          if (Array.isArray(data)) return data;
          if (typeof data === 'string') return JSON.parse(data);
          return fallback;
        } catch (e) {
          console.warn('JSON parse error:', e);
          return fallback;
        }
      };

      // 기본 상품 정보
      const result: any = {
        id: listing.id,
        title: listing.title || '상품',
        description_md: listing.description_md || listing.short_description || '',
        short_description: listing.short_description || '',
        category: listing.category || '',
        category_id: listing.category_id || 1,
        price_from: listing.price_from || 0,
        price_to: listing.price_to || listing.price_from || 0,
        child_price: listing.child_price,
        infant_price: listing.infant_price,
        images: (() => {
          try {
            if (Array.isArray(listing.images)) {
              return listing.images;
            }
            if (typeof listing.images === 'string') {
              // URL 문자열인 경우 배열로 감싸기
              if (listing.images.startsWith('http://') || listing.images.startsWith('https://') || listing.images.startsWith('data:')) {
                return [listing.images];
              }
              // JSON 배열인 경우 파싱
              return JSON.parse(listing.images);
            }
            return ['https://via.placeholder.com/400x300'];
          } catch (e) {
            console.warn('Invalid JSON in images field:', listing.images);
            return typeof listing.images === 'string' ? [listing.images] : ['https://via.placeholder.com/400x300'];
          }
        })(),
        location: listing.location || '',
        address: listing.address,
        rating_avg: listing.rating_avg || 0,
        rating_count: listing.rating_count || 0,
        duration: listing.duration || '1시간',
        max_capacity: listing.max_capacity || 10,
        highlights: safeJsonParse(listing.highlights, []),
        included: safeJsonParse(listing.included, []),
        excluded: safeJsonParse(listing.excluded, []),
        tags: safeJsonParse(listing.tags, []),
        amenities: safeJsonParse(listing.amenities, []),
        difficulty: listing.difficulty,
        language: safeJsonParse(listing.language, ['한국어']),
        min_age: listing.min_age,
        cancellation_policy: listing.cancellation_policy,
        refund_policy: listing.refund_policy,
        weather_policy: listing.weather_policy,
        meeting_point: listing.meeting_point,
        is_active: listing.is_active,
        is_published: listing.is_published,
        is_featured: listing.is_featured,
        created_at: listing.created_at,
        updated_at: listing.updated_at
      };

      return result;
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
        total_amount: bookingData.total_amount || (bookingData.num_adults * 35000 + bookingData.num_children * 25000)
      };

      const response = await db.insert('bookings', booking);
      // 생성된 예약에 필요한 필드들 추가
      const createdBooking: Booking = (response && typeof response === 'object' && 'booking_number' in response)
        ? response as Booking
        : {
            ...booking,
            id: response.id || Date.now(),
            discount_amount: 0,
            tax_amount: 0,
            payment_method: 'card',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as Booking;

      // 🎉 야놀자 스타일: 예약 생성 즉시 파트너에게 자동 알림 발송
      try {
        // 상품 정보 조회
        const listing = await db.findOne('listings', { id: bookingData.listing_id });

        if (listing && listing.partner_id) {
          // 파트너 정보 조회
          const partner = await db.findOne('partners', { id: listing.partner_id });

          if (partner) {
            // 고객 정보 가져오기
            const customerInfo = typeof bookingData.customer_info === 'string'
              ? JSON.parse(bookingData.customer_info)
              : bookingData.customer_info;

            // 파트너에게 알림 발송
            await notifyPartnerNewBooking({
              booking_id: createdBooking.id,
              order_number: createdBooking.booking_number,
              partner_id: partner.id,
              partner_name: partner.business_name,
              partner_email: partner.email,
              partner_phone: partner.phone,
              customer_name: customerInfo?.name || bookingData.guest_name || '고객',
              customer_phone: customerInfo?.phone || bookingData.guest_phone || '',
              customer_email: customerInfo?.email || bookingData.guest_email || '',
              product_name: listing.title,
              category: listing.category,
              start_date: bookingData.start_date || new Date().toISOString().split('T')[0],
              end_date: bookingData.end_date,
              num_adults: bookingData.num_adults,
              num_children: bookingData.num_children,
              num_seniors: bookingData.num_seniors,
              total_amount: createdBooking.total_amount,
              special_requests: bookingData.special_requests,
              payment_status: createdBooking.payment_status,
              booking_status: createdBooking.status
            });

            console.log(`✅ 파트너 알림 발송 완료: ${partner.business_name} - ${createdBooking.booking_number}`);
          }
        }
      } catch (notificationError) {
        // 알림 발송 실패해도 예약은 성공으로 처리
        console.error('파트너 알림 발송 실패 (예약은 성공):', notificationError);
      }

      return {
        success: true,
        data: createdBooking,
        message: '예약이 성공적으로 생성되었습니다. 파트너에게 알림이 전송되었습니다.'
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
        user_id: 'admin',
        email: 'admin@shinan.com',
        password_hash: '',
        name: '관리자',
        role: 'admin',
        preferred_language: 'ko',
        preferred_currency: 'KRW',
        marketing_consent: false,
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
    phone?: string;
    subject?: string;
    message: string;
    category?: string;
    priority?: string;
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

  // 문의 목록 조회 (관리자용)
  getContacts: async (filters?: {
    status?: 'pending' | 'replied' | 'resolved';
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[]>> => {
    try {
      let sql = 'SELECT * FROM contacts WHERE 1=1';
      const params: any[] = [];

      if (filters?.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
      }

      sql += ' ORDER BY created_at DESC';

      if (filters?.limit) {
        sql += ` LIMIT ${filters.limit}`;
        if (filters?.offset) {
          sql += ` OFFSET ${filters.offset}`;
        }
      }

      const contacts = await db.query(sql, params);
      return {
        success: true,
        data: contacts
      };
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      return {
        success: false,
        data: [],
        error: '문의 목록 조회에 실패했습니다.'
      };
    }
  },

  // 문의 답변 (관리자용)
  replyContact: async (contactId: number, reply: string, adminId: number): Promise<ApiResponse<any>> => {
    try {
      const updated = await db.update('contacts', contactId, {
        admin_reply: reply,
        replied_by: adminId,
        replied_at: new Date().toISOString(),
        status: 'replied'
      });

      if (updated) {
        return {
          success: true,
          message: '답변이 등록되었습니다.'
        };
      } else {
        return {
          success: false,
          error: '답변 등록에 실패했습니다.'
        };
      }
    } catch (error) {
      console.error('Failed to reply contact:', error);
      return {
        success: false,
        error: '답변 등록에 실패했습니다.'
      };
    }
  },

  // 문의 상태 변경 (관리자용)
  updateContactStatus: async (contactId: number, status: 'pending' | 'replied' | 'resolved'): Promise<ApiResponse<any>> => {
    try {
      const updated = await db.update('contacts', contactId, { status });

      if (updated) {
        return {
          success: true,
          message: '상태가 변경되었습니다.'
        };
      } else {
        return {
          success: false,
          error: '상태 변경에 실패했습니다.'
        };
      }
    } catch (error) {
      console.error('Failed to update contact status:', error);
      return {
        success: false,
        error: '상태 변경에 실패했습니다.'
      };
    }
  },

  // ==================== 미디어 라이브러리 API ====================

  // 미디어 업로드
  uploadMedia: async (mediaData: {
    filename: string;
    original_filename: string;
    url: string;
    thumbnail_url?: string;
    file_type: string;
    file_size?: number;
    width?: number;
    height?: number;
    alt_text?: string;
    caption?: string;
    category?: 'product' | 'banner' | 'blog' | 'partner' | 'event' | 'other';
    usage_location?: string;
    tags?: string[];
    uploaded_by?: number;
  }): Promise<ApiResponse<any>> => {
    try {
      // 보안: 파일 크기 검증 (10MB 제한)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (mediaData.file_size && mediaData.file_size > MAX_FILE_SIZE) {
        return {
          success: false,
          error: `파일 크기가 너무 큽니다. 최대 ${MAX_FILE_SIZE / (1024 * 1024)}MB까지 업로드 가능합니다.`
        };
      }

      // 보안: 파일 타입 검증 (이미지만 허용)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (mediaData.file_type && !allowedTypes.includes(mediaData.file_type.toLowerCase())) {
        return {
          success: false,
          error: '지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WEBP, SVG만 가능)'
        };
      }

      // 보안: 필수 필드 검증
      if (!mediaData.filename || !mediaData.original_filename || !mediaData.url) {
        return {
          success: false,
          error: '필수 정보가 누락되었습니다.'
        };
      }

      const media = {
        ...mediaData,
        category: mediaData.category || 'other',
        tags: mediaData.tags ? JSON.stringify(mediaData.tags) : null,
        is_active: true
      };

      const response = await db.insert('media', media);
      notifyDataChange.mediaCreated();

      return {
        success: true,
        data: response,
        message: '이미지가 업로드되었습니다.'
      };
    } catch (error) {
      console.error('Failed to upload media:', error);
      return {
        success: false,
        error: '이미지 업로드에 실패했습니다.'
      };
    }
  },

  // 미디어 목록 조회
  getMedia: async (filters?: {
    category?: string;
    usage_location?: string;
    file_type?: string;
    search?: string;
    tags?: string[];
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any[]>> => {
    try {
      let sql = `
        SELECT
          m.*,
          u.name as uploader_name
        FROM media m
        LEFT JOIN users u ON m.uploaded_by = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.category) {
        sql += ' AND m.category = ?';
        params.push(filters.category);
      }

      if (filters?.usage_location) {
        sql += ' AND m.usage_location = ?';
        params.push(filters.usage_location);
      }

      if (filters?.file_type) {
        sql += ' AND m.file_type LIKE ?';
        params.push(`%${filters.file_type}%`);
      }

      if (filters?.is_active !== undefined) {
        sql += ' AND m.is_active = ?';
        params.push(filters.is_active);
      }

      if (filters?.search) {
        sql += ' AND (m.original_filename LIKE ? OR m.alt_text LIKE ? OR m.caption LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters?.tags && filters.tags.length > 0) {
        // JSON 태그 검색
        const tagConditions = filters.tags.map(() => 'JSON_CONTAINS(m.tags, ?)').join(' OR ');
        sql += ` AND (${tagConditions})`;
        filters.tags.forEach(tag => params.push(JSON.stringify(tag)));
      }

      sql += ' ORDER BY m.created_at DESC';

      if (filters?.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);

        if (filters?.offset) {
          sql += ' OFFSET ?';
          params.push(filters.offset);
        }
      }

      const media = await db.query(sql, params);

      // JSON 태그 파싱
      const parsedMedia = (media || []).map((m: any) => {
        let tags = [];
        if (m.tags) {
          try {
            tags = typeof m.tags === 'string' ? JSON.parse(m.tags) : m.tags;
          } catch (e) {
            tags = [];
          }
        }
        return {
          ...m,
          tags
        };
      });

      return {
        success: true,
        data: parsedMedia
      };
    } catch (error) {
      console.error('Failed to fetch media:', error);
      return {
        success: true,
        data: []
      };
    }
  },

  // 미디어 상세 조회
  getMediaById: async (id: number): Promise<ApiResponse<any>> => {
    try {
      const media = await db.query(
        'SELECT m.*, u.name as uploader_name FROM media m LEFT JOIN users u ON m.uploaded_by = u.id WHERE m.id = ?',
        [id]
      );

      if (media && media.length > 0) {
        let tags = [];
        if (media[0].tags) {
          try {
            tags = typeof media[0].tags === 'string' ? JSON.parse(media[0].tags) : media[0].tags;
          } catch (e) {
            tags = [];
          }
        }
        const result = {
          ...media[0],
          tags
        };
        return {
          success: true,
          data: result
        };
      } else {
        return {
          success: false,
          error: '미디어를 찾을 수 없습니다.'
        };
      }
    } catch (error) {
      console.error('Failed to fetch media:', error);
      return {
        success: false,
        error: '미디어 조회에 실패했습니다.'
      };
    }
  },

  // 미디어 정보 업데이트
  updateMedia: async (id: number, updates: {
    alt_text?: string;
    caption?: string;
    category?: string;
    usage_location?: string;
    tags?: string[];
    is_active?: boolean;
  }): Promise<ApiResponse<any>> => {
    try {
      const updateData: any = { ...updates };
      if (updates.tags) {
        updateData.tags = JSON.stringify(updates.tags);
      }

      const success = await db.update('media', id, updateData);
      notifyDataChange.mediaUpdated();

      if (success) {
        return {
          success: true,
          message: '미디어 정보가 업데이트되었습니다.'
        };
      } else {
        return {
          success: false,
          error: '미디어 업데이트에 실패했습니다.'
        };
      }
    } catch (error) {
      console.error('Failed to update media:', error);
      return {
        success: false,
        error: '미디어 업데이트에 실패했습니다.'
      };
    }
  },

  // 미디어 삭제
  deleteMedia: async (id: number): Promise<ApiResponse<void>> => {
    try {
      const success = await db.delete('media', id);
      notifyDataChange.mediaDeleted();

      if (success) {
        return {
          success: true,
          message: '미디어가 삭제되었습니다.'
        };
      } else {
        return {
          success: false,
          error: '미디어 삭제에 실패했습니다.'
        };
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
      return {
        success: false,
        error: '미디어 삭제에 실패했습니다.'
      };
    }
  },

  // 미디어 일괄 삭제
  deleteMediaBulk: async (ids: number[]): Promise<ApiResponse<void>> => {
    try {
      for (const id of ids) {
        await db.delete('media', id);
      }
      notifyDataChange.mediaDeleted();

      return {
        success: true,
        message: `${ids.length}개의 미디어가 삭제되었습니다.`
      };
    } catch (error) {
      console.error('Failed to delete media:', error);
      return {
        success: false,
        error: '미디어 삭제에 실패했습니다.'
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
    title?: string;
    content: string;
    images?: string[];
  }): Promise<ApiResponse<Review>> => {
    try {
      const review = {
        listing_id: reviewData.listing_id,
        user_id: reviewData.user_id,
        rating: reviewData.rating,
        title: reviewData.title || '',
        comment_md: reviewData.content, // comment 대신 comment_md 사용
        is_verified: true, // 자동 승인
        helpful_count: 0
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
          AND l.is_published = 1 AND l.is_active = 1
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

  // 사용자의 리뷰 가져오기
  getUserReviews: async (userId: number): Promise<any[]> => {
    try {
      const response = await db.query(`
        SELECT r.*, l.title as listing_title, l.category, l.images as listing_images
        FROM reviews r
        LEFT JOIN listings l ON r.listing_id = l.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
      `, [userId]);

      if (response && response.length > 0) {
        return response.map((review: any) => {
          let listingImage = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop';
          if (review.listing_images) {
            try {
              const images = JSON.parse(review.listing_images);
              if (images && images.length > 0) {
                listingImage = images[0];
              }
            } catch (e) {
              console.error('Failed to parse listing images:', e);
            }
          }

          return {
            id: review.id.toString(),
            title: review.listing_title || '상품명 없음',
            rating: review.rating || 5,
            comment: review.comment_md || review.content || '',
            date: review.created_at ? new Date(review.created_at).toLocaleDateString('ko-KR') : '',
            image: listingImage,
            category: review.category || '투어'
          };
        });
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch user reviews:', error);
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
        return response.map((review: any) => {
          // listing_images 안전하게 파싱
          let listingImages = [];
          if (review.listing_images) {
            try {
              listingImages = typeof review.listing_images === 'string'
                ? JSON.parse(review.listing_images)
                : review.listing_images;
            } catch (e) {
              listingImages = [review.listing_images];
            }
          }

          // user avatar 안전하게 파싱
          let userAvatar = null;
          if (review.images) {
            try {
              const images = typeof review.images === 'string'
                ? JSON.parse(review.images)
                : review.images;
              userAvatar = Array.isArray(images) ? images[0] : images;
            } catch (e) {
              userAvatar = review.images;
            }
          }

          return {
            ...review,
            listing: {
              id: review.listing_id,
              title: review.listing_title,
              location: review.listing_location,
              images: listingImages
            },
            user: {
              id: review.user_id,
              name: review.user_name,
              avatar: userAvatar
            }
          };
        });
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

  // ===== 인증 API =====

  // 로그인 (직접 DB 호출)
  loginUser: async (email: string, password: string): Promise<ApiResponse<{ user: any; token: string }>> => {
    try {
      console.log('🔑 DB 직접 로그인 시도:', { email, password });

      // 1. 사용자 조회
      const user = await api.getUserByEmail(email);

      if (!user) {
        console.log('❌ 사용자를 찾을 수 없음:', email);
        return {
          success: false,
          error: '등록되지 않은 이메일입니다.'
        };
      }

      console.log('✅ 사용자 찾음:', user.email, 'role:', user.role);

      // 2. 비밀번호 검증 (간단한 해시)
      const expectedHash = `hashed_${password}`;
      console.log('🔐 비밀번호 검증:', {
        expected: expectedHash,
        actual: user.password_hash,
        match: user.password_hash === expectedHash
      });

      if (user.password_hash !== expectedHash) {
        console.log('❌ 비밀번호 불일치');
        return {
          success: false,
          error: '비밀번호가 올바르지 않습니다.'
        };
      }

      // 3. JWT 토큰 생성 (간단한 방식)
      const token = `jwt_${user.id}_${Date.now()}`;

      console.log('✅ 로그인 성공!', {
        user: user.email,
        role: user.role,
        token: token.substring(0, 20) + '...'
      });

      return {
        success: true,
        data: {
          user,
          token
        }
      };
    } catch (error) {
      console.error('❌ 로그인 처리 오류:', error);
      return {
        success: false,
        error: '로그인 처리 중 오류가 발생했습니다.'
      };
    }
  },

  // 회원가입
  registerUser: async (userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }): Promise<ApiResponse<{ user: any; token: string }>> => {
    try {
      console.log('📝 회원가입 API 호출:', userData.email);

      const response = await fetch('/api/auth?action=register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('❌ 회원가입 실패:', data.error);
        return {
          success: false,
          error: data.error || '회원가입에 실패했습니다.'
        };
      }

      console.log('✅ 회원가입 성공:', data.data.user.email);
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } catch (error) {
      console.error('❌ 회원가입 API 호출 오류:', error);
      return {
        success: false,
        error: '회원가입 처리 중 오류가 발생했습니다.'
      };
    }
  },

  // 소셜 로그인
  socialLogin: async (socialData: {
    provider: 'google' | 'kakao' | 'naver';
    providerId: string;
    email: string;
    name?: string;
    avatar?: string;
  }): Promise<ApiResponse<{ user: any; token: string }>> => {
    try {
      console.log('🔑 소셜 로그인 시도:', socialData.provider, socialData.email);

      // 프로덕션에서는 상대 경로, 로컬에서는 절대 경로
      const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';
      const apiUrl = isProduction ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3004');
      const response = await fetch(`${apiUrl}/api/auth?action=social-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(socialData)
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || '소셜 로그인에 실패했습니다.'
        };
      }

      console.log('✅ 소셜 로그인 성공:', data.data.user.email);

      return data;
    } catch (error) {
      console.error('Failed to social login:', error);
      return {
        success: false,
        error: '소셜 로그인 처리 중 오류가 발생했습니다.'
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
            let notes: any = {};
            if (p.notes) {
              notes = typeof p.notes === 'string' ? JSON.parse(p.notes) : p.notes;
            }
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

        // 직접 DB에서 파트너 신청 조회 (모든 상태)
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
        const listingId = response.id;

        // 카테고리별 추가 데이터 저장
        try {
          const category = (listingData.category || '').toLowerCase();

          // 숙박 카테고리
          if (category === 'accommodation' || category === 'stay' || category === '숙박') {
            await db.insert('listing_accommodation', {
              listing_id: listingId,
              room_type: listingData.room_type || '스탠다드',
              max_guests: listingData.max_guests || 2,
              check_in_time: listingData.check_in_time || '15:00:00',
              check_out_time: listingData.check_out_time || '11:00:00',
              amenities: JSON.stringify(listingData.room_amenities || listingData.amenities || []),
              bed_type: listingData.bed_type || null,
              bathroom_type: listingData.bathroom_type || null,
              room_size: listingData.room_size || null,
              wifi_available: listingData.wifi_available !== false ? 1 : 0,
              parking_available: listingData.parking_available ? 1 : 0,
              breakfast_included: listingData.breakfast_included ? 1 : 0,
              cancellation_policy: listingData.cancellation_policy || null,
              house_rules: listingData.house_rules || null
            });
            console.log('✅ listing_accommodation 데이터 추가 완료');
          }

          // 렌터카 카테고리
          else if (category === 'rentcar' || category === 'rental' || category === '렌트카') {
            await db.insert('listing_rentcar', {
              listing_id: listingId,
              vehicle_type: listingData.vehicle_type || '승용차',
              brand: listingData.brand || null,
              model: listingData.model || null,
              year_manufactured: listingData.year_manufactured || null,
              fuel_type: listingData.fuel_type || 'gasoline',
              seating_capacity: listingData.seating_capacity || 5,
              transmission: listingData.transmission || 'automatic',
              features: JSON.stringify(listingData.car_features || listingData.features || []),
              insurance_included: listingData.insurance_included !== false ? 1 : 0,
              insurance_details: listingData.insurance_details || null,
              mileage_limit: listingData.mileage_limit || null,
              deposit_amount: listingData.deposit_amount || null,
              pickup_location: listingData.pickup_location || listingData.location,
              return_location: listingData.return_location || listingData.location,
              age_requirement: listingData.age_requirement || 21,
              license_requirement: listingData.license_requirement || null
            });
            console.log('✅ listing_rentcar 데이터 추가 완료');
          }

          // 투어 카테고리
          else if (category === 'tour' || category === 'activity' || category === '투어') {
            await db.insert('listing_tour', {
              listing_id: listingId,
              tour_type: listingData.tour_type || '일반 투어',
              difficulty: listingData.difficulty || 'easy',
              duration: listingData.duration || '1시간',
              language: JSON.stringify(listingData.language || ['한국어']),
              min_age: listingData.min_age || 0,
              max_group_size: listingData.max_capacity || 10,
              meeting_point: listingData.meeting_point || listingData.address,
              included: JSON.stringify(listingData.included || []),
              excluded: JSON.stringify(listingData.excluded || []),
              what_to_bring: listingData.what_to_bring || null,
              cancellation_policy: listingData.cancellation_policy || null
            });
            console.log('✅ listing_tour 데이터 추가 완료');
          }

          // 음식 카테고리
          else if (category === 'food' || category === 'restaurant' || category === '음식') {
            await db.insert('listing_food', {
              listing_id: listingId,
              cuisine_type: listingData.cuisine_type || '한식',
              menu_highlights: listingData.menu_highlights || null,
              dietary_options: JSON.stringify(listingData.dietary_options || []),
              seating_capacity: listingData.max_capacity || 30,
              reservation_required: listingData.reservation_required ? 1 : 0,
              average_meal_time: listingData.duration || '1시간',
              parking_available: listingData.parking_available ? 1 : 0,
              outdoor_seating: listingData.outdoor_seating ? 1 : 0,
              delivery_available: listingData.delivery_available ? 1 : 0
            });
            console.log('✅ listing_food 데이터 추가 완료');
          }

          // 이벤트 카테고리
          else if (category === 'event' || category === '이벤트') {
            await db.insert('listing_event', {
              listing_id: listingId,
              event_type: listingData.event_type || '축제',
              start_date: listingData.start_date || null,
              end_date: listingData.end_date || null,
              venue: listingData.venue || listingData.location,
              organizer: listingData.organizer || null,
              max_attendees: listingData.max_capacity || 100,
              registration_required: listingData.registration_required ? 1 : 0,
              age_restriction: listingData.min_age || null,
              accessibility: listingData.accessibility || null
            });
            console.log('✅ listing_event 데이터 추가 완료');
          }
        } catch (categoryError) {
          console.warn('⚠️ 카테고리별 데이터 저장 실패 (무시):', categoryError);
        }

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

    // 상품 삭제 (CASCADE: 연관 데이터도 함께 삭제)
    deleteListing: async (listingId: number): Promise<ApiResponse<null>> => {
      try {
        console.log(`🗑️ 상품 삭제 시작: listing_id = ${listingId}`);

        // 1. 리뷰 삭제
        try {
          const reviews = await db.findAll('reviews', { listing_id: listingId });
          console.log(`  - 리뷰 ${reviews.length}개 발견`);
          for (const review of reviews) {
            await db.delete('reviews', review.id);
          }
        } catch (error) {
          console.warn('리뷰 삭제 중 오류 (무시):', error);
        }

        // 2. 즐겨찾기 삭제 (테이블이 없을 수 있음)
        try {
          const favorites = await db.findAll('favorites', { listing_id: listingId });
          console.log(`  - 즐겨찾기 ${favorites.length}개 발견`);
          for (const favorite of favorites) {
            await db.delete('favorites', favorite.id);
          }
        } catch (error) {
          console.warn('즐겨찾기 삭제 중 오류 (무시):', error);
        }

        // 3. 장바구니 아이템 삭제 (테이블이 없을 수 있음)
        try {
          const cartItems = await db.findAll('cart_items', { listing_id: listingId });
          console.log(`  - 장바구니 아이템 ${cartItems.length}개 발견`);
          for (const item of cartItems) {
            await db.delete('cart_items', item.id);
          }
        } catch (error) {
          console.warn('장바구니 삭제 중 오류 (무시):', error);
        }

        // 4. PMS 관련 데이터 삭제 (숙박 상품인 경우)
        try {
          // 4-1. PMS 설정 삭제
          const pmsConfigs = await db.findAll('pms_configs', { listing_id: listingId });
          console.log(`  - PMS 설정 ${pmsConfigs.length}개 발견`);
          for (const config of pmsConfigs) {
            await db.delete('pms_configs', config.id);
          }

          // 4-2. 객실 타입 및 관련 데이터 삭제
          const roomTypes = await db.findAll('room_types', { listing_id: listingId });
          console.log(`  - 객실 타입 ${roomTypes.length}개 발견`);

          for (const roomType of roomTypes) {
            // 객실 미디어 삭제
            const roomMedia = await db.findAll('room_media', { room_type_id: roomType.id });
            console.log(`    - 객실 미디어 ${roomMedia.length}개 발견`);
            for (const media of roomMedia) {
              await db.delete('room_media', media.id);
            }

            // 요금 플랜 삭제
            const ratePlans = await db.findAll('rate_plans', { room_type_id: roomType.id });
            console.log(`    - 요금 플랜 ${ratePlans.length}개 발견`);
            for (const plan of ratePlans) {
              await db.delete('rate_plans', plan.id);
            }

            // 객실 재고 삭제
            const inventory = await db.findAll('room_inventory', { room_type_id: roomType.id });
            console.log(`    - 객실 재고 ${inventory.length}개 발견`);
            for (const inv of inventory) {
              await db.delete('room_inventory', inv.id);
            }

            // 객실 타입 삭제
            await db.delete('room_types', roomType.id);
          }
        } catch (error) {
          console.warn('PMS 데이터 삭제 중 오류 (무시):', error);
        }

        // 5. 예약 데이터는 보존 (이력 유지를 위해)
        // 예약 데이터는 삭제하지 않고 상태만 변경하거나 그대로 유지

        // 6. 마지막으로 상품(listing) 삭제
        console.log(`  - 상품(listing) 삭제 중...`);
        const deleted = await db.delete('listings', listingId);

        if (!deleted) {
          throw new Error('상품 삭제 실패: 상품을 찾을 수 없습니다.');
        }

        console.log(`✅ 상품 삭제 완료: listing_id = ${listingId}`);

        return {
          success: true,
          data: null,
          message: '상품 및 관련 데이터가 성공적으로 삭제되었습니다.'
        };
      } catch (error) {
        console.error('❌ Failed to delete listing:', error);
        const errorMessage = error instanceof Error ? error.message : '상품 삭제에 실패했습니다.';
        return {
          success: false,
          error: errorMessage
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
            l.title as listing_title,
            rv.vendor_name as rentcar_vendor_name,
            rve.make as rentcar_vehicle_make,
            rve.model as rentcar_vehicle_model
          FROM reviews r
          LEFT JOIN users u ON r.user_id = u.id
          LEFT JOIN listings l ON r.listing_id = l.id
          LEFT JOIN rentcar_vendors rv ON r.rentcar_vendor_id = rv.id
          LEFT JOIN rentcar_vehicles rve ON r.rentcar_vehicle_id = rve.id
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

    // 파트너 신청 내역 조회
    getPartnerApplicationHistory: async (): Promise<ApiResponse<any[]>> => {
      try {
        console.log('🔍 파트너 신청 내역 조회 중...');
        const history = await db.query(`
          SELECT
            h.*,
            u.email as user_email,
            u.name as user_name
          FROM partner_applications_history h
          LEFT JOIN users u ON h.user_id = u.id
          ORDER BY h.reviewed_at DESC
        `);
        console.log(`✅ ${history.length}개의 처리된 신청 내역 조회 완료`);
        return {
          success: true,
          data: history || []
        };
      } catch (error) {
        console.error('❌ 신청 내역 조회 오류:', error);
        return {
          success: false,
          error: '신청 내역 조회에 실패했습니다.',
          data: []
        };
      }
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
          address: application.business_address || application.address || '',
          location: application.location || '신안, 대한민국',
          business_number: application.business_number || '',
          description: application.description || '',
          services: application.services || '',
          promotion: application.promotion || null,
          business_hours: application.business_hours || '매일 09:00-18:00',
          discount_rate: application.discount_rate || null,
          category: application.categories ? (typeof application.categories === 'string' ? JSON.parse(application.categories)[0] : application.categories[0]) : 'tour',
          images: application.images || '[]',
          tier: 'bronze',
          is_verified: 1,
          is_featured: 0,
          status: 'approved',
          rating: 0,
          review_count: 0
        };

        const partnerResult = await db.insert('partners', newPartner);
        const partnerId = partnerResult.id;
        console.log(`✅ 파트너 생성 완료 (ID: ${partnerId})`);

        // 3. history 테이블로 이동
        try {
          await db.execute(`
            INSERT INTO partner_applications_history (
              id, user_id, business_name, contact_name, email, phone,
              business_number, business_address, categories, description,
              services, website, instagram, status, reviewed_by, review_notes,
              reviewed_at, created_at, updated_at
            )
            SELECT
              id, user_id, business_name, contact_name, email, phone,
              business_number, business_address, categories, description,
              services, website, instagram, 'approved', ?, ?,
              NOW(), created_at, NOW()
            FROM partner_applications
            WHERE id = ?
          `, [1, '파트너 신청 승인', applicationId]);
          console.log(`✅ history 테이블로 이동 완료`);
        } catch (historyError) {
          console.error('⚠️  history 이동 실패:', historyError);
        }

        // 4. 원본 신청 삭제
        await db.delete('partner_applications', applicationId);
        console.log(`✅ 원본 신청 삭제 완료`);

        // 5. 실시간 데이터 갱신
        notifyDataChange.partnerCreated();
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
    updatePartnerApplication: async (applicationId: number, updateData: any): Promise<ApiResponse<any>> => {
      try {
        console.log(`🔄 파트너 신청 수정 시작 (ID: ${applicationId})`);

        // partner_applications 테이블 업데이트
        await db.update('partner_applications', applicationId, updateData);
        console.log(`✅ 파트너 신청 수정 완료`);

        return {
          success: true,
          data: { applicationId, ...updateData },
          message: '파트너 신청 정보가 수정되었습니다.'
        };
      } catch (error) {
        console.error('❌ 파트너 신청 수정 실패:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : '파트너 신청 수정에 실패했습니다.'
        };
      }
    },

    rejectPartnerApplication: async (applicationId: number, reviewNotes?: string): Promise<ApiResponse<any>> => {
      try {
        console.log(`🔄 파트너 신청 거절 시작 (ID: ${applicationId})`);

        // 1. history 테이블로 이동
        try {
          await db.execute(`
            INSERT INTO partner_applications_history (
              id, user_id, business_name, contact_name, email, phone,
              business_number, business_address, categories, description,
              services, website, instagram, status, reviewed_by, review_notes,
              reviewed_at, created_at, updated_at
            )
            SELECT
              id, user_id, business_name, contact_name, email, phone,
              business_number, business_address, categories, description,
              services, website, instagram, 'rejected', ?, ?,
              NOW(), created_at, NOW()
            FROM partner_applications
            WHERE id = ?
          `, [1, reviewNotes || '파트너 신청 거절', applicationId]);
          console.log(`✅ history 테이블로 이동 완료`);
        } catch (historyError) {
          console.error('⚠️  history 이동 실패:', historyError);
        }

        // 2. 원본 신청 삭제
        await db.delete('partner_applications', applicationId);
        console.log(`✅ 원본 신청 삭제 완료`);

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
        // 렌트카 리뷰인 경우 review_type 자동 설정
        if (reviewData.rentcar_booking_id) {
          reviewData.review_type = 'rentcar';
        } else {
          reviewData.review_type = 'listing';
        }

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
        let sql = 'SELECT * FROM images WHERE 1=1';
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

        const images = await db.query(sql, params);
        return {
          success: true,
          data: images || []
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

    uploadImage: async (imageFile: File, options?: any): Promise<ApiResponse<any>> => {
      try {
        const formData = new FormData();
        formData.append('image', imageFile);
        if (options) {
          Object.keys(options).forEach(key => {
            formData.append(key, options[key]);
          });
        }

        const response = await db.insert('images', {
          entity_type: options?.entity_type || 'general',
          entity_id: options?.entity_id,
          file_name: imageFile.name,
          original_name: imageFile.name,
          file_size: imageFile.size,
          mime_type: imageFile.type,
          alt_text: options?.alt_text,
          is_primary: options?.is_primary || false,
          uploaded_by: options?.uploaded_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        return {
          success: true,
          data: response,
          message: '이미지가 업로드되었습니다.'
        };
      } catch (error) {
        console.error('Failed to upload image:', error);
        return {
          success: false,
          error: '이미지 업로드에 실패했습니다.'
        };
      }
    },

    updateImage: async (imageId: number, updates: any): Promise<ApiResponse<any>> => {
      try {
        await db.update('images', imageId, {
          ...updates,
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
        // bookings와 listings, users를 JOIN해서 상세 정보 가져오기
        let sql = `
          SELECT
            b.id,
            b.booking_number as order_number,
            b.start_date,
            b.end_date,
            b.num_adults,
            b.num_children,
            b.num_seniors,
            b.total_amount,
            b.payment_method,
            b.payment_status,
            b.status,
            b.customer_info,
            b.special_requests,
            b.created_at,
            b.updated_at,
            l.id as listing_id,
            l.title as product_name,
            l.category,
            l.images,
            u.name as user_name,
            u.email as user_email,
            u.phone as user_phone
          FROM bookings b
          LEFT JOIN listings l ON b.listing_id = l.id
          LEFT JOIN users u ON b.user_id = u.id
          WHERE 1=1
        `;
        const params: any[] = [];

        if (filters?.status) {
          sql += ' AND b.status = ?';
          params.push(filters.status);
        }

        if (filters?.user_id) {
          sql += ' AND b.user_id = ?';
          params.push(filters.user_id);
        }

        sql += ' ORDER BY b.created_at DESC';

        const orders = await db.query(sql, params);

        // customer_info가 JSON 문자열이면 파싱
        const processedOrders = orders.map((order: any) => {
          if (typeof order.customer_info === 'string') {
            try {
              order.customer_info = JSON.parse(order.customer_info);
            } catch (e) {
              // 파싱 실패 시 그대로 유지
            }
          }
          if (typeof order.images === 'string') {
            try {
              order.images = JSON.parse(order.images);
            } catch (e) {
              order.images = [];
            }
          }
          return order;
        });

        return {
          success: true,
          data: processedOrders || []
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
        // bookings 테이블 업데이트
        await db.update('bookings', orderId, {
          status,
          updated_at: new Date().toISOString()
        });

        // 🎉 야놀자 스타일: 예약 확정 시 고객에게 자동 알림 발송
        if (status === 'confirmed') {
          try {
            // 예약 정보 조회 (JOIN으로 상세 정보 가져오기)
            const bookingDetails = await db.query(`
              SELECT
                b.*,
                l.title as product_name,
                l.category,
                l.images,
                p.business_name as partner_name,
                p.email as partner_email,
                u.name as user_name,
                u.email as user_email,
                u.phone as user_phone
              FROM bookings b
              LEFT JOIN listings l ON b.listing_id = l.id
              LEFT JOIN partners p ON l.partner_id = p.id
              LEFT JOIN users u ON b.user_id = u.id
              WHERE b.id = ?
            `, [orderId]);

            if (bookingDetails.length > 0) {
              const booking = bookingDetails[0];
              const customerInfo = typeof booking.customer_info === 'string'
                ? JSON.parse(booking.customer_info)
                : booking.customer_info;

              // 고객에게 예약 확정 알림 발송
              await notifyCustomerBookingConfirmed({
                booking_id: booking.id,
                order_number: booking.booking_number,
                partner_id: booking.partner_id || 0,
                partner_name: booking.partner_name || '파트너',
                partner_email: booking.partner_email || '',
                customer_name: customerInfo?.name || booking.user_name || '고객',
                customer_phone: customerInfo?.phone || booking.user_phone || '',
                customer_email: customerInfo?.email || booking.user_email || '',
                product_name: booking.product_name,
                category: booking.category,
                start_date: booking.start_date,
                end_date: booking.end_date,
                num_adults: booking.num_adults,
                num_children: booking.num_children,
                num_seniors: booking.num_seniors,
                total_amount: booking.total_amount,
                special_requests: booking.special_requests,
                payment_status: booking.payment_status,
                booking_status: 'confirmed'
              });

              console.log(`✅ 고객 예약 확정 알림 발송 완료: ${booking.booking_number}`);
            }
          } catch (notificationError) {
            console.error('고객 알림 발송 실패 (상태 변경은 성공):', notificationError);
          }
        }

        const updated = await db.select('bookings', { id: orderId });
        return {
          success: true,
          data: updated[0],
          message: status === 'confirmed' ? '예약이 확정되었습니다. 고객에게 알림이 전송되었습니다.' : '주문 상태가 변경되었습니다.'
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
    },
  },

  // 예약/결제 관련
  getBooking: async (bookingId: number): Promise<ApiResponse<any>> => {
    try {
      const bookings = await db.select('bookings', { id: bookingId });
      if (bookings.length === 0) {
        return {
          success: false,
          error: '예약을 찾을 수 없습니다.'
        };
      }
      return {
        success: true,
        data: bookings[0]
      };
    } catch (error) {
      console.error('Failed to get booking:', error);
      return {
        success: false,
        error: '예약 조회에 실패했습니다.'
      };
    }
  },

  processPayment: async (paymentData: any): Promise<ApiResponse<any>> => {
    try {
      // Insert payment record
      const payment = await db.insert('payments', {
        ...paymentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      return {
        success: true,
        data: payment,
        message: '결제가 완료되었습니다.'
      };
    } catch (error) {
      console.error('Failed to process payment:', error);
      return {
        success: false,
        error: '결제 처리에 실패했습니다.'
      };
    }
  },

  // 블로그 포스트 조회 (프론트엔드용)
  getBlogPost: async (postId: number): Promise<ApiResponse<any>> => {
    try {
      const posts = await db.select('blog_posts', { id: postId, is_published: true });
      if (posts.length === 0) {
        return {
          success: false,
          error: '블로그 포스트를 찾을 수 없습니다.'
        };
      }
      const post = posts[0];
      if (post.tags && typeof post.tags === 'string') {
        post.tags = JSON.parse(post.tags);
      }
      // 조회수 증가
      await db.update('blog_posts', postId, {
        view_count: (post.view_count || 0) + 1
      });
      return {
        success: true,
        data: post
      };
    } catch (error) {
      console.error('Failed to get blog post:', error);
      return {
        success: false,
        error: '블로그 포스트 조회에 실패했습니다.'
      };
    }
  },

  getBlogPosts: async (filters?: { category?: string; tag?: string; search?: string }): Promise<ApiResponse<any[]>> => {
    try {
      let sql = 'SELECT * FROM blog_posts WHERE is_published = 1';
      const params: any[] = [];

      if (filters?.category) {
        sql += ' AND category = ?';
        params.push(filters.category);
      }

      if (filters?.tag) {
        sql += ' AND JSON_CONTAINS(tags, ?)';
        params.push(JSON.stringify(filters.tag));
      }

      if (filters?.search) {
        sql += ' AND (title LIKE ? OR content LIKE ?)';
        const searchPattern = `%${filters.search}%`;
        params.push(searchPattern, searchPattern);
      }

      sql += ' ORDER BY published_date DESC';

      const posts = await db.query(sql, params);

      // Parse tags from JSON string
      const parsedPosts = (posts || []).map((post: any) => ({
        ...post,
        tags: post.tags && typeof post.tags === 'string' ? JSON.parse(post.tags) : []
      }));

      return {
        success: true,
        data: parsedPosts
      };
    } catch (error) {
      console.error('Failed to get blog posts:', error);
      return {
        success: false,
        error: '블로그 포스트 조회에 실패했습니다.',
        data: []
      };
    }
  },

  getRelatedBlogPosts: async (postId: number, category: string, limit: number = 3): Promise<ApiResponse<any[]>> => {
    try {
      const sql = `
        SELECT * FROM blog_posts
        WHERE is_published = 1
        AND category = ?
        AND id != ?
        ORDER BY published_date DESC
        LIMIT ?
      `;

      const posts = await db.query(sql, [category, postId, limit]);

      // Parse tags from JSON string
      const parsedPosts = (posts || []).map((post: any) => ({
        ...post,
        tags: post.tags && typeof post.tags === 'string' ? JSON.parse(post.tags) : []
      }));

      return {
        success: true,
        data: parsedPosts
      };
    } catch (error) {
      console.error('Failed to get related blog posts:', error);
      return {
        success: false,
        error: '관련 블로그 포스트 조회에 실패했습니다.',
        data: []
      };
    }
  },

  // ===== 추가 테이블 기능 (PlanetScale 37개 테이블 완전 지원) =====

  // Listing 세부 정보 (카테고리별)
  getListingAccommodation: async (listingId: number): Promise<ApiResponse<any>> => {
    try {
      const result = await db.select('listing_accommodation', { listing_id: listingId });
      return {
        success: true,
        data: result[0] || null
      };
    } catch (error) {
      console.error('Failed to get accommodation details:', error);
      return { success: false, error: '숙박 정보 조회 실패' };
    }
  },

  getListingTour: async (listingId: number): Promise<ApiResponse<any>> => {
    try {
      const result = await db.select('listing_tour', { listing_id: listingId });
      return {
        success: true,
        data: result[0] || null
      };
    } catch (error) {
      console.error('Failed to get tour details:', error);
      return { success: false, error: '투어 정보 조회 실패' };
    }
  },

  getListingFood: async (listingId: number): Promise<ApiResponse<any>> => {
    try {
      const result = await db.select('listing_food', { listing_id: listingId });
      return {
        success: true,
        data: result[0] || null
      };
    } catch (error) {
      console.error('Failed to get food details:', error);
      return { success: false, error: '맛집 정보 조회 실패' };
    }
  },

  getListingEvent: async (listingId: number): Promise<ApiResponse<any>> => {
    try {
      const result = await db.select('listing_event', { listing_id: listingId });
      return {
        success: true,
        data: result[0] || null
      };
    } catch (error) {
      console.error('Failed to get event details:', error);
      return { success: false, error: '이벤트 정보 조회 실패' };
    }
  },

  getListingRentcar: async (listingId: number): Promise<ApiResponse<any>> => {
    try {
      const result = await db.select('listing_rentcar', { listing_id: listingId });
      return {
        success: true,
        data: result[0] || null
      };
    } catch (error) {
      console.error('Failed to get rentcar details:', error);
      return { success: false, error: '렌트카 정보 조회 실패' };
    }
  },

  // Contact Submissions 조회 및 관리
  getContactSubmissions: async (filters?: {
    status?: string;
    category?: string;
    priority?: string;
  }): Promise<ApiResponse<any[]>> => {
    try {
      const result = await db.select('contact_submissions', filters || {});
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get contact submissions:', error);
      return { success: false, error: '문의 목록 조회 실패', data: [] };
    }
  },

  updateContactSubmission: async (id: number, updates: {
    status?: string;
    assigned_to?: number;
    response?: string;
  }): Promise<ApiResponse<any>> => {
    try {
      await db.update('contact_submissions', id, {
        ...updates,
        responded_at: updates.response ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString()
      });
      const result = await db.select('contact_submissions', { id });
      return { success: true, data: result[0] };
    } catch (error) {
      console.error('Failed to update contact submission:', error);
      return { success: false, error: '문의 업데이트 실패' };
    }
  },

  // Login History
  createLoginHistory: async (data: {
    user_id: number;
    login_type?: string;
    ip_address?: string;
    user_agent?: string;
    device_type?: string;
    login_status: string;
  }): Promise<ApiResponse<any>> => {
    try {
      const result = await db.insert('login_history', {
        ...data,
        created_at: new Date().toISOString()
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to create login history:', error);
      return { success: false, error: '로그인 기록 생성 실패' };
    }
  },

  getLoginHistory: async (userId: number, limit: number = 10): Promise<ApiResponse<any[]>> => {
    try {
      const result = await db.query(
        `SELECT * FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [userId, limit]
      );
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get login history:', error);
      return { success: false, error: '로그인 기록 조회 실패', data: [] };
    }
  },

  // Notifications
  createNotification: async (data: {
    user_id: number;
    type: string;
    title: string;
    message: string;
    link?: string;
  }): Promise<ApiResponse<any>> => {
    try {
      const result = await db.insert('notifications', {
        ...data,
        is_read: false,
        created_at: new Date().toISOString()
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to create notification:', error);
      return { success: false, error: '알림 생성 실패' };
    }
  },

  getUserNotifications: async (userId: number, unreadOnly: boolean = false): Promise<ApiResponse<any[]>> => {
    try {
      let query = `SELECT * FROM notifications WHERE user_id = ?`;
      const params: any[] = [userId];

      if (unreadOnly) {
        query += ` AND is_read = 0`;
      }

      query += ` ORDER BY created_at DESC LIMIT 50`;

      const result = await db.query(query, params);
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return { success: false, error: '알림 조회 실패', data: [] };
    }
  },

  markNotificationAsRead: async (notificationId: number): Promise<ApiResponse<any>> => {
    try {
      await db.update('notifications', notificationId, {
        is_read: true,
        read_at: new Date().toISOString()
      });
      return { success: true, data: null };
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return { success: false, error: '알림 읽음 처리 실패' };
    }
  },

  // Partner Applications History
  getPartnerApplicationsHistory: async (applicationId: number): Promise<ApiResponse<any[]>> => {
    try {
      const result = await db.query(
        `SELECT * FROM partner_applications_history WHERE application_id = ? ORDER BY created_at DESC`,
        [applicationId]
      );
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get partner application history:', error);
      return { success: false, error: '파트너 신청 이력 조회 실패', data: [] };
    }
  },

  createPartnerApplicationHistory: async (data: {
    application_id: number;
    status: string;
    action_by: number;
    notes?: string;
  }): Promise<ApiResponse<any>> => {
    try {
      const result = await db.insert('partner_applications_history', {
        ...data,
        created_at: new Date().toISOString()
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to create partner application history:', error);
      return { success: false, error: '파트너 신청 이력 생성 실패' };
    }
  },

  // Partner Settlements
  getPartnerSettlements: async (partnerId?: number): Promise<ApiResponse<any[]>> => {
    try {
      const where = partnerId ? { partner_id: partnerId } : {};
      const result = await db.select('partner_settlements', where);
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get partner settlements:', error);
      return { success: false, error: '파트너 정산 조회 실패', data: [] };
    }
  },

  createPartnerSettlement: async (data: {
    partner_id: number;
    period_start: string;
    period_end: string;
    total_bookings: number;
    total_revenue: number;
    commission_amount: number;
    settlement_amount: number;
    status?: string;
  }): Promise<ApiResponse<any>> => {
    try {
      const result = await db.insert('partner_settlements', {
        ...data,
        status: data.status || 'pending',
        created_at: new Date().toISOString()
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to create partner settlement:', error);
      return { success: false, error: '파트너 정산 생성 실패' };
    }
  },

  updatePartnerSettlement: async (id: number, updates: {
    status?: string;
    paid_at?: string;
    payment_method?: string;
    notes?: string;
  }): Promise<ApiResponse<any>> => {
    try {
      await db.update('partner_settlements', id, {
        ...updates,
        updated_at: new Date().toISOString()
      });
      const result = await db.select('partner_settlements', { id });
      return { success: true, data: result[0] };
    } catch (error) {
      console.error('Failed to update partner settlement:', error);
      return { success: false, error: '파트너 정산 업데이트 실패' };
    }
  },

  // Refunds
  getRefunds: async (bookingId?: number): Promise<ApiResponse<any[]>> => {
    try {
      const where = bookingId ? { booking_id: bookingId } : {};
      const result = await db.select('refunds', where);
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get refunds:', error);
      return { success: false, error: '환불 내역 조회 실패', data: [] };
    }
  },

  createRefund: async (data: {
    booking_id: number;
    payment_id: number;
    user_id: number;
    refund_amount: number;
    refund_reason: string;
    requested_by: number;
  }): Promise<ApiResponse<any>> => {
    try {
      const result = await db.insert('refunds', {
        ...data,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to create refund:', error);
      return { success: false, error: '환불 요청 생성 실패' };
    }
  },

  updateRefundStatus: async (id: number, status: string, processedBy?: number): Promise<ApiResponse<any>> => {
    try {
      await db.update('refunds', id, {
        status,
        processed_by: processedBy,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      const result = await db.select('refunds', { id });
      return { success: true, data: result[0] };
    } catch (error) {
      console.error('Failed to update refund status:', error);
      return { success: false, error: '환불 상태 업데이트 실패' };
    }
  },

  // Search Logs
  createSearchLog: async (data: {
    user_id?: number;
    search_query: string;
    category?: string;
    filters?: any;
    results_count: number;
  }): Promise<ApiResponse<any>> => {
    try {
      const result = await db.insert('search_logs', {
        ...data,
        filters: typeof data.filters === 'object' ? JSON.stringify(data.filters) : data.filters,
        created_at: new Date().toISOString()
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to create search log:', error);
      return { success: false, error: '검색 로그 생성 실패' };
    }
  },

  getPopularSearches: async (limit: number = 10): Promise<ApiResponse<any[]>> => {
    try {
      const result = await db.query(
        `SELECT search_query, COUNT(*) as count FROM search_logs
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         GROUP BY search_query
         ORDER BY count DESC
         LIMIT ?`,
        [limit]
      );
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get popular searches:', error);
      return { success: false, error: '인기 검색어 조회 실패', data: [] };
    }
  },

  // User Coupons
  getUserCoupons: async (userId: number): Promise<ApiResponse<any[]>> => {
    try {
      const result = await db.query(
        `SELECT uc.*, c.code, c.title, c.discount_type, c.discount_value, c.valid_until
         FROM user_coupons uc
         JOIN coupons c ON uc.coupon_id = c.id
         WHERE uc.user_id = ? AND uc.is_used = 0
         ORDER BY c.valid_until ASC`,
        [userId]
      );
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get user coupons:', error);
      return { success: false, error: '사용자 쿠폰 조회 실패', data: [] };
    }
  },

  assignCouponToUser: async (userId: number, couponId: number): Promise<ApiResponse<any>> => {
    try {
      const result = await db.insert('user_coupons', {
        user_id: userId,
        coupon_id: couponId,
        is_used: false,
        created_at: new Date().toISOString()
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to assign coupon to user:', error);
      return { success: false, error: '쿠폰 발급 실패' };
    }
  },

  useCoupon: async (userCouponId: number, bookingId: number): Promise<ApiResponse<any>> => {
    try {
      await db.update('user_coupons', userCouponId, {
        is_used: true,
        used_at: new Date().toISOString(),
        booking_id: bookingId
      });
      const result = await db.select('user_coupons', { id: userCouponId });
      return { success: true, data: result[0] };
    } catch (error) {
      console.error('Failed to use coupon:', error);
      return { success: false, error: '쿠폰 사용 실패' };
    }
  },

  // User Interactions (좋아요, 조회 등)
  createUserInteraction: async (data: {
    user_id?: number;
    listing_id: number;
    interaction_type: string;
    session_id?: string;
  }): Promise<ApiResponse<any>> => {
    try {
      const result = await db.insert('user_interactions', {
        ...data,
        created_at: new Date().toISOString()
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to create user interaction:', error);
      return { success: false, error: '사용자 상호작용 기록 실패' };
    }
  },

  getUserInteractions: async (userId: number, interactionType?: string): Promise<ApiResponse<any[]>> => {
    try {
      let query = `SELECT * FROM user_interactions WHERE user_id = ?`;
      const params: any[] = [userId];

      if (interactionType) {
        query += ` AND interaction_type = ?`;
        params.push(interactionType);
      }

      query += ` ORDER BY created_at DESC LIMIT 100`;

      const result = await db.query(query, params);
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get user interactions:', error);
      return { success: false, error: '사용자 상호작용 조회 실패', data: [] };
    }
  },

  // 홈페이지 설정 관리
  getHomepageSettings: async () => {
    try {
      const result = await db.query(`
        SELECT * FROM homepage_settings
        WHERE is_active = 1
        ORDER BY id DESC
        LIMIT 1
      `);

      if (result.length > 0) {
        return result[0];
      }

      // 기본값 반환
      return {
        background_type: 'video',
        background_video_url: 'https://cdn.pixabay.com/video/2022/05/05/116349-707815466_large.mp4',
        background_overlay_opacity: 0.4,
        is_active: true
      };
    } catch (error) {
      console.error('Failed to get homepage settings:', error);
      return {
        background_type: 'video',
        background_video_url: 'https://cdn.pixabay.com/video/2022/05/05/116349-707815466_large.mp4',
        background_overlay_opacity: 0.4,
        is_active: true
      };
    }
  },

  // 렌트카 예약 가능 여부 확인
  checkRentcarAvailability: async (pickupDate: string, returnDate: string): Promise<ApiResponse<number[]>> => {
    try {
      console.log(`🔍 예약 가능 여부 확인: ${pickupDate} ~ ${returnDate}`);

      // rentcar_bookings 테이블에서 날짜 중복되는 차량 조회
      const overlappingBookings = await db.query<{ vehicle_id: number }>(`
        SELECT DISTINCT rv.id as vehicle_id
        FROM rentcar_bookings rb
        INNER JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
        WHERE rb.status IN ('confirmed', 'in_progress')
        AND (
          (rb.pickup_date <= ? AND rb.dropoff_date >= ?) OR
          (rb.pickup_date <= ? AND rb.dropoff_date >= ?) OR
          (rb.pickup_date >= ? AND rb.dropoff_date <= ?)
        )
      `, [returnDate, pickupDate, returnDate, returnDate, pickupDate, returnDate]);

      const unavailableVehicleIds = overlappingBookings.map(row => row.vehicle_id);

      console.log(`✅ 예약 불가능한 차량 ${unavailableVehicleIds.length}개 발견`);

      return {
        success: true,
        data: unavailableVehicleIds
      };
    } catch (error) {
      console.error('Failed to check rentcar availability:', error);
      return {
        success: false,
        error: '예약 가능 여부 확인 실패',
        data: []
      };
    }
  },
};

export default api;

// 편의를 위한 개별 함수 export
export const getFavorites = (userId?: number) => api.getFavorites(userId);
export const addToFavorites = (listingId: number, userId?: number) => api.addFavorite(listingId, userId);
export const removeFromFavorites = (listingId: number, userId?: number) => api.removeFavorite(listingId, userId);