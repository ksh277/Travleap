// ============================================
// 렌트카 API 모듈
// ============================================

import { db } from './database.js';
import { cache, CacheKeys, CacheInvalidation } from './cache';
import { AppError, RentcarErrors, handleDatabaseError, formatErrorResponse, catchAsync } from './error-handler';
import { validate, VendorSchema, LocationSchema, VehicleSchema, BookingSchema, RatePlanSchema } from './rentcar-validation';
import { rentcarLogger, logDatabaseQuery } from './logger';
import type {
  RentcarVendor,
  RentcarVendorFormData,
  RentcarLocation,
  RentcarLocationFormData,
  RentcarVehicle,
  RentcarVehicleFormData,
  RentcarVehicleFilters,
  RentcarVehicleWithVendor,
  RentcarBooking,
  RentcarBookingFormData,
  RentcarBookingFilters,
  RentcarBookingWithDetails,
  RentcarApiResponse,
  RentcarPaginatedResponse,
  RentcarSearchParams,
  RentcarSearchResult,
  RentcarVendorStats,
  RentcarAdminStats,
  RentcarRatePlan,
  RentcarRatePlanFormData,
  RentcarInsurancePlan,
  RentcarInsurancePlanFormData,
  RentcarExtra,
  RentcarExtraFormData
} from '../types/rentcar';

// ============================================
// 상수 정의 (Constants)
// ============================================

// 캐시 TTL (Time To Live) - 밀리초 단위
const CACHE_TTL = {
  VENDOR_LIST: 5 * 60 * 1000,      // 5분
  VENDOR_STATS: 3 * 60 * 1000,     // 3분
  ADMIN_STATS: 3 * 60 * 1000,      // 3분
  DASHBOARD_STATS: 2 * 60 * 1000   // 2분
} as const;

// 세금 및 수수료
const TAX_RATE = 0.1;                // 10% 세금
const DEFAULT_COMMISSION_RATE = 10.00; // 기본 수수료율 10% (admin_settings와 동일)

// 대여 조건 기본값
const RENTAL_DEFAULTS = {
  MIN_AGE: 21,                       // 최소 연령 21세
  MIN_LICENSE_YEARS: 1,              // 최소 면허 취득 기간 1년
  DOOR_COUNT: 4,                     // 기본 도어 수
  LARGE_BAGS: 2,                     // 기본 대형 수하물 수
  SMALL_BAGS: 2,                     // 기본 소형 수하물 수
  MILEAGE_LIMIT_PER_DAY: 200,        // 일일 주행거리 제한 200km
  MIN_RENTAL_DAYS: 1,                // 최소 대여일 수
  MAX_QUANTITY: 1                    // 부가옵션 기본 최대 수량
} as const;

// ============================================
// 1. VENDOR API (벤더 관리)
// ============================================

export const rentcarVendorApi = {
  // 벤더 목록 조회 (최적화: 차량/예약 수를 JOIN으로 한 번에 조회 + 캐싱)
  getAll: async (): Promise<RentcarApiResponse<RentcarVendor[]>> => {
    try {
      // 캐시 확인
      const cacheKey = CacheKeys.vendorList();
      const cached = cache.get<RentcarApiResponse<RentcarVendor[]>>(cacheKey);
      if (cached) {
        return cached;
      }

      const vendors = await db.query<RentcarVendor>(`
        SELECT
          v.*,
          COALESCE(vehicle_counts.total, 0) as total_vehicles,
          COALESCE(vehicle_counts.active, 0) as active_vehicles,
          COALESCE(booking_counts.total, 0) as total_bookings,
          COALESCE(booking_counts.confirmed, 0) as confirmed_bookings,
          COALESCE(review_stats.avg_rating, 0) as average_rating,
          COALESCE(review_stats.review_count, 0) as review_count
        FROM rentcar_vendors v
        LEFT JOIN (
          SELECT vendor_id,
            COUNT(*) as total,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
          FROM rentcar_vehicles
          GROUP BY vendor_id
        ) vehicle_counts ON v.id = vehicle_counts.vendor_id
        LEFT JOIN (
          SELECT vendor_id,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
          FROM rentcar_bookings
          GROUP BY vendor_id
        ) booking_counts ON v.id = booking_counts.vendor_id
        LEFT JOIN (
          SELECT rentcar_vendor_id,
            AVG(rating) as avg_rating,
            COUNT(*) as review_count
          FROM reviews
          WHERE review_type = 'rentcar' AND rentcar_vendor_id IS NOT NULL
          GROUP BY rentcar_vendor_id
        ) review_stats ON v.id = review_stats.rentcar_vendor_id
        ORDER BY v.created_at DESC
      `);

      const result = {
        success: true,
        data: vendors
      };

      // 캐시 저장 (5분)
      cache.set(cacheKey, result, CACHE_TTL.VENDOR_LIST);

      return result;
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
      return {
        success: false,
        error: '벤더 목록 조회에 실패했습니다.'
      };
    }
  },

  // 벤더 상세 조회
  getById: async (id: number): Promise<RentcarApiResponse<RentcarVendor>> => {
    try {
      const vendors = await db.query<RentcarVendor>(`
        SELECT * FROM rentcar_vendors WHERE id = ?
      `, [id]);

      if (vendors.length === 0) {
        return {
          success: false,
          error: '벤더를 찾을 수 없습니다.'
        };
      }

      return {
        success: true,
        data: vendors[0]
      };
    } catch (error) {
      console.error('Failed to fetch vendor:', error);
      return {
        success: false,
        error: '벤더 조회에 실패했습니다.'
      };
    }
  },

  // 벤더 생성
  create: async (data: RentcarVendorFormData): Promise<RentcarApiResponse<RentcarVendor>> => {
    try {
      // 입력 검증
      const validatedData = validate(VendorSchema, data);

      rentcarLogger.info('Creating vendor', { vendor_code: validatedData.vendor_code });

      const logDbEnd = logDatabaseQuery('INSERT', 'rentcar_vendors');

      const result = await db.execute(`
        INSERT INTO rentcar_vendors (
          vendor_code, business_name, brand_name, business_number,
          contact_name, contact_email, contact_phone, description, logo_url,
          commission_rate, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `, [
        validatedData.vendor_code,
        validatedData.business_name,
        validatedData.brand_name || null,
        validatedData.business_number || null,
        validatedData.contact_name,
        validatedData.contact_email,
        validatedData.contact_phone,
        validatedData.description || null,
        validatedData.logo_url || null,
        validatedData.commission_rate || DEFAULT_COMMISSION_RATE
      ]);

      logDbEnd();

      const newVendor = await rentcarVendorApi.getById(result.insertId!);

      // 캐시 무효화
      cache.delete(CacheKeys.vendorList());
      cache.delete(CacheKeys.adminStats());

      rentcarLogger.info('Vendor created successfully', { vendorId: result.insertId });

      return {
        success: true,
        data: newVendor.data,
        message: '벤더가 성공적으로 등록되었습니다.'
      };
    } catch (error: any) {
      // 데이터베이스 에러 처리
      if (error.code) {
        const dbError = handleDatabaseError(error);
        rentcarLogger.error('Failed to create vendor (DB error)', dbError);
        return {
          success: false,
          error: dbError.userMessage
        };
      }

      // AppError (검증 에러 등)
      if (error instanceof AppError) {
        rentcarLogger.error('Failed to create vendor (Validation error)', error);
        return {
          success: false,
          error: error.userMessage
        };
      }

      // 예상치 못한 에러
      rentcarLogger.error('Failed to create vendor (Unknown error)', error);
      return {
        success: false,
        error: '벤더 등록에 실패했습니다.'
      };
    }
  },

  // 벤더 수정
  update: async (id: number, data: Partial<RentcarVendorFormData>): Promise<RentcarApiResponse<RentcarVendor>> => {
    try {
      // ✅ 화이트리스트 검증: 수정 가능한 필드만 허용
      const ALLOWED_FIELDS = [
        'business_name', 'brand_name', 'business_number',
        'contact_name', 'contact_email', 'contact_phone',
        'description', 'logo_url', 'commission_rate'
      ];

      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(data).forEach(([key, value]) => {
        if (!ALLOWED_FIELDS.includes(key)) {
          throw new AppError(
            RentcarErrors.INVALID_FIELD.code,
            `수정할 수 없는 필드입니다: ${key}`,
            RentcarErrors.INVALID_FIELD.userMessage,
            key
          );
        }
        fields.push(`${key} = ?`);
        values.push(value);
      });

      if (fields.length === 0) {
        return {
          success: false,
          error: '수정할 데이터가 없습니다.'
        };
      }

      values.push(id);

      await db.execute(`
        UPDATE rentcar_vendors
        SET ${fields.join(', ')}
        WHERE id = ?
      `, values);

      const updated = await rentcarVendorApi.getById(id);

      // 캐시 무효화
      CacheInvalidation.invalidateVendor(id);

      return {
        success: true,
        data: updated.data,
        message: '벤더 정보가 수정되었습니다.'
      };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          success: false,
          error: error.userMessage
        };
      }
      console.error('Failed to update vendor:', error);
      return {
        success: false,
        error: '벤더 수정에 실패했습니다.'
      };
    }
  },

  // 벤더 삭제
  delete: async (id: number): Promise<RentcarApiResponse<null>> => {
    try {
      await db.execute(`DELETE FROM rentcar_vendors WHERE id = ?`, [id]);

      // 캐시 무효화
      CacheInvalidation.invalidateVendor(id);

      return {
        success: true,
        data: null,
        message: '벤더가 삭제되었습니다.'
      };
    } catch (error) {
      console.error('Failed to delete vendor:', error);
      return {
        success: false,
        error: '벤더 삭제에 실패했습니다.'
      };
    }
  },

  // 벤더 승인/거절
  updateStatus: async (id: number, status: 'active' | 'suspended' | 'pending'): Promise<RentcarApiResponse<RentcarVendor>> => {
    try {
      await db.execute(`
        UPDATE rentcar_vendors
        SET status = ?, is_verified = ?
        WHERE id = ?
      `, [status, status === 'active' ? 1 : 0, id]);

      const updated = await rentcarVendorApi.getById(id);

      // 캐시 무효화
      CacheInvalidation.invalidateVendor(id);

      return {
        success: true,
        data: updated.data,
        message: `벤더가 ${status === 'active' ? '승인' : status === 'suspended' ? '정지' : '대기'}되었습니다.`
      };
    } catch (error) {
      console.error('Failed to update vendor status:', error);
      return {
        success: false,
        error: '벤더 상태 변경에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 2. LOCATION API (지점 관리)
// ============================================

export const rentcarLocationApi = {
  // 벤더별 지점 조회
  getByVendor: async (vendorId: number): Promise<RentcarApiResponse<RentcarLocation[]>> => {
    try {
      const locations = await db.query<RentcarLocation>(`
        SELECT * FROM rentcar_locations
        WHERE vendor_id = ? AND is_active = 1
        ORDER BY display_order ASC, name ASC
      `, [vendorId]);

      return {
        success: true,
        data: locations
      };
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      return {
        success: false,
        error: '지점 목록 조회에 실패했습니다.'
      };
    }
  },

  // 지점 생성
  create: async (vendorId: number, data: RentcarLocationFormData): Promise<RentcarApiResponse<RentcarLocation>> => {
    try {
      const result = await db.execute(`
        INSERT INTO rentcar_locations (
          vendor_id, location_code, name, location_type, address, city, postal_code,
          lat, lng, phone, pickup_fee_krw, dropoff_fee_krw
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vendorId,
        data.location_code,
        data.name,
        data.location_type,
        data.address,
        data.city || null,
        data.postal_code || null,
        data.lat || null,
        data.lng || null,
        data.phone || null,
        data.pickup_fee_krw || 0,
        data.dropoff_fee_krw || 0
      ]);

      return {
        success: true,
        data: { id: result.insertId!, ...data } as any,
        message: '지점이 등록되었습니다.'
      };
    } catch (error) {
      console.error('Failed to create location:', error);
      return {
        success: false,
        error: '지점 등록에 실패했습니다.'
      };
    }
  },

  // 지점 수정
  update: async (id: number, data: Partial<RentcarLocationFormData>): Promise<RentcarApiResponse<RentcarLocation>> => {
    try {
      // ✅ 화이트리스트 검증: 수정 가능한 필드만 허용
      const ALLOWED_FIELDS = [
        'location_code', 'name', 'location_type', 'address', 'city',
        'postal_code', 'lat', 'lng', 'phone',
        'pickup_fee_krw', 'dropoff_fee_krw', 'is_active', 'display_order'
      ];

      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(data).forEach(([key, value]) => {
        if (!ALLOWED_FIELDS.includes(key)) {
          throw new AppError(
            RentcarErrors.INVALID_FIELD.code,
            `수정할 수 없는 필드입니다: ${key}`,
            RentcarErrors.INVALID_FIELD.userMessage,
            key
          );
        }
        fields.push(`${key} = ?`);
        values.push(value);
      });

      if (fields.length === 0) {
        return {
          success: false,
          error: '수정할 데이터가 없습니다.'
        };
      }

      values.push(id);

      await db.execute(`
        UPDATE rentcar_locations
        SET ${fields.join(', ')}
        WHERE id = ?
      `, values);

      return {
        success: true,
        data: null as any,
        message: '지점 정보가 수정되었습니다.'
      };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          success: false,
          error: error.userMessage
        };
      }
      console.error('Failed to update location:', error);
      return {
        success: false,
        error: '지점 수정에 실패했습니다.'
      };
    }
  },

  // 지점 삭제
  delete: async (id: number): Promise<RentcarApiResponse<null>> => {
    try {
      await db.execute(`DELETE FROM rentcar_locations WHERE id = ?`, [id]);

      return {
        success: true,
        data: null,
        message: '지점이 삭제되었습니다.'
      };
    } catch (error) {
      console.error('Failed to delete location:', error);
      return {
        success: false,
        error: '지점 삭제에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 3. VEHICLE API (차량 관리)
// ============================================

export const rentcarVehicleApi = {
  // 전체 차량 조회 (필터링)
  getAll: async (filters?: RentcarVehicleFilters): Promise<RentcarApiResponse<RentcarVehicleWithVendor[]>> => {
    try {
      let sql = `
        SELECT
          v.*,
          ve.vendor_code, ve.business_name, ve.brand_name as vendor_brand_name,
          ve.is_verified, ve.average_rating as vendor_rating
        FROM rentcar_vehicles v
        INNER JOIN rentcar_vendors ve ON v.vendor_id = ve.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.vendor_id) {
        sql += ` AND v.vendor_id = ?`;
        params.push(filters.vendor_id);
      }

      if (filters?.vehicle_class && filters.vehicle_class.length > 0) {
        sql += ` AND v.vehicle_class IN (${filters.vehicle_class.map(() => '?').join(',')})`;
        params.push(...filters.vehicle_class);
      }

      if (filters?.fuel_type && filters.fuel_type.length > 0) {
        sql += ` AND v.fuel_type IN (${filters.fuel_type.map(() => '?').join(',')})`;
        params.push(...filters.fuel_type);
      }

      if (filters?.seating_capacity) {
        sql += ` AND v.seating_capacity >= ?`;
        params.push(filters.seating_capacity);
      }

      if (filters?.min_price) {
        sql += ` AND v.daily_rate_krw >= ?`;
        params.push(filters.min_price);
      }

      if (filters?.max_price) {
        sql += ` AND v.daily_rate_krw <= ?`;
        params.push(filters.max_price);
      }

      if (filters?.is_active !== undefined) {
        sql += ` AND v.is_active = ?`;
        params.push(filters.is_active ? 1 : 0);
      }

      if (filters?.is_featured) {
        sql += ` AND v.is_featured = 1`;
      }

      sql += ` ORDER BY v.is_featured DESC, v.created_at DESC`;

      const vehicles = await db.query(sql, params);

      // 데이터 구조화
      const formatted = vehicles.map((row: any) => ({
        ...row,
        vendor: {
          id: row.vendor_id,
          vendor_code: row.vendor_code,
          business_name: row.business_name,
          brand_name: row.vendor_brand_name,
          is_verified: row.is_verified,
          average_rating: row.vendor_rating
        }
      }));

      return {
        success: true,
        data: formatted
      };
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      return {
        success: false,
        error: '차량 목록 조회에 실패했습니다.'
      };
    }
  },

  // 벤더별 차량 조회
  getByVendor: async (vendorId: number): Promise<RentcarApiResponse<RentcarVehicle[]>> => {
    try {
      const vehicles = await db.query<RentcarVehicle>(`
        SELECT * FROM rentcar_vehicles
        WHERE vendor_id = ?
        ORDER BY is_featured DESC, created_at DESC
      `, [vendorId]);

      return {
        success: true,
        data: vehicles
      };
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
      return {
        success: false,
        error: '차량 목록 조회에 실패했습니다.'
      };
    }
  },

  // 차량 상세 조회
  getById: async (id: number): Promise<RentcarApiResponse<RentcarVehicleWithVendor>> => {
    try {
      const vehicles = await db.query(`
        SELECT
          v.*,
          ve.vendor_code, ve.business_name, ve.brand_name as vendor_brand_name,
          ve.is_verified, ve.average_rating as vendor_rating
        FROM rentcar_vehicles v
        INNER JOIN rentcar_vendors ve ON v.vendor_id = ve.id
        WHERE v.id = ?
      `, [id]);

      if (vehicles.length === 0) {
        return {
          success: false,
          error: '차량을 찾을 수 없습니다.'
        };
      }

      const row = vehicles[0];
      const formatted = {
        ...row,
        vendor: {
          id: row.vendor_id,
          vendor_code: row.vendor_code,
          business_name: row.business_name,
          brand_name: row.vendor_brand_name,
          is_verified: row.is_verified,
          average_rating: row.vendor_rating
        }
      };

      return {
        success: true,
        data: formatted
      };
    } catch (error) {
      console.error('Failed to fetch vehicle:', error);
      return {
        success: false,
        error: '차량 조회에 실패했습니다.'
      };
    }
  },

  // 차량 등록
  create: async (vendorId: number, data: RentcarVehicleFormData): Promise<RentcarApiResponse<RentcarVehicle>> => {
    try {
      // 1. rentcar_vehicles 테이블에 저장
      const result = await db.execute(`
        INSERT INTO rentcar_vehicles (
          vendor_id, vehicle_code, brand, model, year, display_name,
          vehicle_class, vehicle_type, fuel_type, transmission,
          seating_capacity, door_count, large_bags, small_bags,
          thumbnail_url, images, features,
          age_requirement, license_requirement, mileage_limit_per_day, unlimited_mileage,
          deposit_amount_krw, smoking_allowed, daily_rate_krw
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vendorId,
        data.vehicle_code,
        data.brand,
        data.model,
        data.year,
        data.display_name,
        data.vehicle_class,
        data.vehicle_type || null,
        data.fuel_type,
        data.transmission,
        data.seating_capacity,
        data.door_count || 4,
        data.large_bags || 2,
        data.small_bags || 2,
        data.thumbnail_url || null,
        JSON.stringify(data.images || []),
        JSON.stringify(data.features || []),
        data.age_requirement || 21,
        data.license_requirement || null,
        data.mileage_limit_per_day || 200,
        data.unlimited_mileage ? 1 : 0,
        data.deposit_amount_krw || 0,
        data.smoking_allowed ? 1 : 0,
        data.daily_rate_krw
      ]);

      const vehicleId = result.insertId!;

      // 2. listings 테이블에도 저장 (사용자가 검색/상세페이지에서 볼 수 있도록)
      try {
        // rentcar 카테고리 ID 조회 (없으면 기본값 7)
        const categories = await db.query<{ id: number }>(`
          SELECT id FROM categories WHERE slug = 'rentcar' LIMIT 1
        `);
        const categoryId = categories[0]?.id || 7;

        // 벤더 정보 조회 (partner_id 연결)
        const vendors = await db.query<{ id: number }>(`
          SELECT id FROM rentcar_vendors WHERE id = ? LIMIT 1
        `, [vendorId]);

        const title = data.display_name || `${data.brand} ${data.model}`;
        const description = `
${data.brand} ${data.model} (${data.year}년식)

**차량 정보**
- 등급: ${data.vehicle_class}
- 연료: ${data.fuel_type}
- 변속기: ${data.transmission}
- 탑승인원: ${data.seating_capacity}명
- 대형 수하물: ${data.large_bags}개
- 소형 수하물: ${data.small_bags}개

**대여 조건**
- 최소 연령: ${data.age_requirement}세
- 면허: ${data.license_requirement || '1종 보통'}
- 일일 주행거리: ${data.unlimited_mileage ? '무제한' : data.mileage_limit_per_day + 'km'}
- 보증금: ${data.deposit_amount_krw?.toLocaleString()}원
- 흡연: ${data.smoking_allowed ? '가능' : '불가'}

**가격**
- 1일 대여료: ${data.daily_rate_krw?.toLocaleString()}원
        `.trim();

        const listingResult = await db.execute(`
          INSERT INTO listings (
            category_id, title, short_description, description_md,
            price_from, price_to, currency,
            images, location, address,
            duration, max_capacity, min_capacity,
            tags, amenities,
            is_active, is_published, is_featured,
            rentcar_vehicle_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          categoryId,
          title,
          `${data.brand} ${data.model} - ${data.vehicle_class}`,
          description,
          data.daily_rate_krw || 0,
          data.daily_rate_krw || 0,
          'KRW',
          JSON.stringify(data.images || [data.thumbnail_url]),
          '신안군',
          '전라남도 신안군',
          '1일',
          data.seating_capacity,
          1,
          JSON.stringify([data.vehicle_class, data.fuel_type, data.transmission, '렌트카']),
          JSON.stringify(data.features || []),
          1, // is_active
          1, // is_published
          0, // is_featured
          vehicleId, // rentcar_vehicle_id 양방향 참조
        ]);

        const listingId = listingResult.insertId!;

        // rentcar_vehicles에 listing_id 저장 (양방향 참조)
        await db.execute(`
          UPDATE rentcar_vehicles
          SET listing_id = ?
          WHERE id = ?
        `, [listingId, vehicleId]);

        console.log(`✅ 차량 ${vehicleId} ↔ 상품 ${listingId} 연결 완료`);
      } catch (listingError) {
        console.error('⚠️ listings 테이블 저장 실패 (rentcar_vehicles는 저장됨):', listingError);
        // listings 저장 실패해도 rentcar_vehicles 저장은 성공으로 처리
      }

      // 3. 벤더 차량 수 업데이트
      await db.execute(`
        UPDATE rentcar_vendors
        SET total_vehicles = (SELECT COUNT(*) FROM rentcar_vehicles WHERE vendor_id = ?)
        WHERE id = ?
      `, [vendorId, vendorId]);

      return {
        success: true,
        data: { id: vehicleId, ...data } as any,
        message: '차량이 등록되었습니다.'
      };
    } catch (error) {
      console.error('Failed to create vehicle:', error);
      return {
        success: false,
        error: '차량 등록에 실패했습니다.'
      };
    }
  },

  // 차량 수정
  update: async (id: number, data: Partial<RentcarVehicleFormData>): Promise<RentcarApiResponse<RentcarVehicle>> => {
    try {
      // ✅ 화이트리스트 검증: 수정 가능한 필드만 허용
      const ALLOWED_FIELDS = [
        'vehicle_code', 'brand', 'model', 'year', 'display_name',
        'vehicle_class', 'vehicle_type', 'fuel_type', 'transmission',
        'seating_capacity', 'door_count', 'large_bags', 'small_bags',
        'thumbnail_url', 'images', 'features',
        'age_requirement', 'license_requirement', 'mileage_limit_per_day',
        'unlimited_mileage', 'deposit_amount_krw', 'smoking_allowed',
        'daily_rate_krw', 'is_active', 'is_featured'
      ];

      // 1. rentcar_vehicles 업데이트
      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(data).forEach(([key, value]) => {
        if (!ALLOWED_FIELDS.includes(key)) {
          throw new AppError(
            RentcarErrors.INVALID_FIELD.code,
            `수정할 수 없는 필드입니다: ${key}`,
            RentcarErrors.INVALID_FIELD.userMessage,
            key
          );
        }

        if (key === 'images' || key === 'features') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (fields.length === 0) {
        return {
          success: false,
          error: '수정할 데이터가 없습니다.'
        };
      }

      values.push(id);

      await db.execute(`
        UPDATE rentcar_vehicles
        SET ${fields.join(', ')}
        WHERE id = ?
      `, values);

      // 2. listings 테이블도 동기화 (listing_id가 있으면)
      try {
        const vehicle = await db.query<{ listing_id: number | null }>(`
          SELECT listing_id FROM rentcar_vehicles WHERE id = ? LIMIT 1
        `, [id]);

        if (vehicle[0]?.listing_id) {
          const listingId = vehicle[0].listing_id;

          // 업데이트할 필드 매핑
          const listingFields: string[] = [];
          const listingValues: any[] = [];

          if (data.display_name || data.brand || data.model) {
            const vehicleData = await db.query(`SELECT * FROM rentcar_vehicles WHERE id = ? LIMIT 1`, [id]);
            const v = vehicleData[0];
            const newTitle = data.display_name || `${data.brand || v.brand} ${data.model || v.model}`;
            listingFields.push('title = ?');
            listingValues.push(newTitle);
          }

          if (data.daily_rate_krw) {
            listingFields.push('price_from = ?', 'price_to = ?');
            listingValues.push(data.daily_rate_krw, data.daily_rate_krw);
          }

          if (data.images || data.thumbnail_url) {
            const images = data.images || [data.thumbnail_url];
            listingFields.push('images = ?');
            listingValues.push(JSON.stringify(images));
          }

          if (data.seating_capacity) {
            listingFields.push('max_capacity = ?');
            listingValues.push(data.seating_capacity);
          }

          if (listingFields.length > 0) {
            listingFields.push('updated_at = NOW()');
            listingValues.push(listingId);

            await db.execute(`
              UPDATE listings
              SET ${listingFields.join(', ')}
              WHERE id = ?
            `, listingValues);

            console.log(`✅ 상품 ${listingId} listings 테이블도 업데이트됨`);
          }
        }
      } catch (listingError) {
        console.error('⚠️ listings 테이블 업데이트 실패 (rentcar_vehicles는 업데이트됨):', listingError);
      }

      return {
        success: true,
        data: null as any,
        message: '차량 정보가 수정되었습니다.'
      };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          success: false,
          error: error.userMessage
        };
      }
      console.error('Failed to update vehicle:', error);
      return {
        success: false,
        error: '차량 수정에 실패했습니다.'
      };
    }
  },

  // 차량 삭제
  delete: async (id: number): Promise<RentcarApiResponse<null>> => {
    try {
      // 차량 정보 가져오기 (vendor_id, listing_id 필요)
      const vehicle = await db.query<{ vendor_id: number; listing_id: number | null }>(`
        SELECT vendor_id, listing_id FROM rentcar_vehicles WHERE id = ?
      `, [id]);

      if (vehicle.length === 0) {
        return {
          success: false,
          error: '차량을 찾을 수 없습니다.'
        };
      }

      const vendorId = vehicle[0].vendor_id;
      const listingId = vehicle[0].listing_id;

      // 1. listings 테이블에서도 삭제 (있으면)
      if (listingId) {
        try {
          await db.execute(`DELETE FROM listings WHERE id = ?`, [listingId]);
          console.log(`✅ 상품 ${listingId} listings 테이블에서도 삭제됨`);
        } catch (listingError) {
          console.error('⚠️ listings 테이블 삭제 실패:', listingError);
        }
      }

      // 2. rentcar_vehicles 삭제
      await db.execute(`DELETE FROM rentcar_vehicles WHERE id = ?`, [id]);

      // 3. 벤더 차량 수 업데이트
      await db.execute(`
        UPDATE rentcar_vendors
        SET total_vehicles = (SELECT COUNT(*) FROM rentcar_vehicles WHERE vendor_id = ?)
        WHERE id = ?
      `, [vendorId, vendorId]);

      return {
        success: true,
        data: null,
        message: '차량이 삭제되었습니다.'
      };
    } catch (error) {
      console.error('Failed to delete vehicle:', error);
      return {
        success: false,
        error: '차량 삭제에 실패했습니다.'
      };
    }
  },

  // 차량 활성화/비활성화
  toggleActive: async (id: number, isActive: boolean): Promise<RentcarApiResponse<null>> => {
    try {
      await db.execute(`
        UPDATE rentcar_vehicles
        SET is_active = ?
        WHERE id = ?
      `, [isActive ? 1 : 0, id]);

      return {
        success: true,
        data: null,
        message: `차량이 ${isActive ? '활성화' : '비활성화'}되었습니다.`
      };
    } catch (error) {
      console.error('Failed to toggle vehicle:', error);
      return {
        success: false,
        error: '차량 상태 변경에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 4. BOOKING API (예약 관리)
// ============================================

export const rentcarBookingApi = {
  // 예약 목록 조회
  getAll: async (filters?: RentcarBookingFilters): Promise<RentcarApiResponse<RentcarBookingWithDetails[]>> => {
    try {
      let sql = `
        SELECT
          b.*,
          v.brand, v.model, v.display_name, v.vehicle_class, v.thumbnail_url,
          ve.business_name as vendor_business_name, ve.brand_name as vendor_brand_name, ve.contact_phone as vendor_phone,
          pl.name as pickup_location_name, pl.address as pickup_location_address, pl.phone as pickup_location_phone,
          dl.name as dropoff_location_name, dl.address as dropoff_location_address, dl.phone as dropoff_location_phone
        FROM rentcar_bookings b
        INNER JOIN rentcar_vehicles v ON b.vehicle_id = v.id
        INNER JOIN rentcar_vendors ve ON b.vendor_id = ve.id
        INNER JOIN rentcar_locations pl ON b.pickup_location_id = pl.id
        INNER JOIN rentcar_locations dl ON b.dropoff_location_id = dl.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (filters?.vendor_id) {
        sql += ` AND b.vendor_id = ?`;
        params.push(filters.vendor_id);
      }

      if (filters?.status && filters.status.length > 0) {
        sql += ` AND b.status IN (${filters.status.map(() => '?').join(',')})`;
        params.push(...filters.status);
      }

      if (filters?.payment_status && filters.payment_status.length > 0) {
        sql += ` AND b.payment_status IN (${filters.payment_status.map(() => '?').join(',')})`;
        params.push(...filters.payment_status);
      }

      if (filters?.pickup_date_from) {
        sql += ` AND b.pickup_date >= ?`;
        params.push(filters.pickup_date_from);
      }

      if (filters?.pickup_date_to) {
        sql += ` AND b.pickup_date <= ?`;
        params.push(filters.pickup_date_to);
      }

      if (filters?.search) {
        sql += ` AND (b.booking_number LIKE ? OR b.customer_name LIKE ? OR b.customer_email LIKE ?)`;
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
      }

      sql += ` ORDER BY b.created_at DESC`;

      const bookings = await db.query(sql, params);

      // 데이터 구조화
      const formatted = bookings.map((row: any) => ({
        id: row.id,
        booking_number: row.booking_number,
        vendor_id: row.vendor_id,
        vehicle_id: row.vehicle_id,
        user_id: row.user_id,
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        customer_phone: row.customer_phone,
        pickup_location_id: row.pickup_location_id,
        dropoff_location_id: row.dropoff_location_id,
        pickup_date: row.pickup_date,
        pickup_time: row.pickup_time,
        dropoff_date: row.dropoff_date,
        dropoff_time: row.dropoff_time,
        daily_rate_krw: row.daily_rate_krw,
        rental_days: row.rental_days,
        subtotal_krw: row.subtotal_krw,
        insurance_krw: row.insurance_krw,
        extras_krw: row.extras_krw,
        tax_krw: row.tax_krw,
        discount_krw: row.discount_krw,
        total_krw: row.total_krw,
        status: row.status,
        payment_status: row.payment_status,
        special_requests: row.special_requests,
        created_at: row.created_at,
        updated_at: row.updated_at,
        vehicle: {
          brand: row.brand,
          model: row.model,
          display_name: row.display_name,
          vehicle_class: row.vehicle_class,
          thumbnail_url: row.thumbnail_url
        },
        vendor: {
          business_name: row.vendor_business_name,
          brand_name: row.vendor_brand_name,
          contact_phone: row.vendor_phone
        },
        pickup_location: {
          name: row.pickup_location_name,
          address: row.pickup_location_address,
          phone: row.pickup_location_phone
        },
        dropoff_location: {
          name: row.dropoff_location_name,
          address: row.dropoff_location_address,
          phone: row.dropoff_location_phone
        }
      }));

      return {
        success: true,
        data: formatted
      };
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      return {
        success: false,
        error: '예약 목록 조회에 실패했습니다.'
      };
    }
  },

  // 예약 생성
  create: async (vendorId: number, userId: number, data: RentcarBookingFormData): Promise<RentcarApiResponse<RentcarBooking>> => {
    try {
      // 1. 차량 정보 조회
      const vehicle = await db.query(`
        SELECT daily_rate_krw FROM rentcar_vehicles WHERE id = ?
      `, [data.vehicle_id]);

      if (vehicle.length === 0) {
        return {
          success: false,
          error: '차량을 찾을 수 없습니다.'
        };
      }

      const dailyRate = vehicle[0].daily_rate_krw;

      // 2. 대여 일수 계산
      const pickupDate = new Date(data.pickup_date);
      const dropoffDate = new Date(data.dropoff_date);
      const rentalDays = Math.ceil((dropoffDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24));

      if (rentalDays <= 0) {
        return {
          success: false,
          error: '반납일은 픽업일보다 이후여야 합니다.'
        };
      }

      // 3. 가격 계산
      const subtotal = dailyRate * rentalDays;
      const tax = Math.round(subtotal * 0.1); // 10% 세금
      const total = subtotal + tax;

      // 4. 예약번호 생성
      const bookingNumber = `RC${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // 5. 예약 생성
      const result = await db.execute(`
        INSERT INTO rentcar_bookings (
          booking_number, vendor_id, vehicle_id, user_id,
          customer_name, customer_email, customer_phone,
          pickup_location_id, dropoff_location_id,
          pickup_date, pickup_time, dropoff_date, dropoff_time,
          daily_rate_krw, rental_days, subtotal_krw, tax_krw, total_krw,
          special_requests, status, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
      `, [
        bookingNumber, vendorId, data.vehicle_id, userId,
        data.customer_name, data.customer_email, data.customer_phone,
        data.pickup_location_id, data.dropoff_location_id,
        data.pickup_date, data.pickup_time, data.dropoff_date, data.dropoff_time,
        dailyRate, rentalDays, subtotal, tax, total,
        data.special_requests || null
      ]);

      // 6. 벤더 예약 수 업데이트
      await db.execute(`
        UPDATE rentcar_vendors
        SET total_bookings = (SELECT COUNT(*) FROM rentcar_bookings WHERE vendor_id = ?)
        WHERE id = ?
      `, [vendorId, vendorId]);

      // 7. 차량 예약 수 업데이트
      await db.execute(`
        UPDATE rentcar_vehicles
        SET total_bookings = (SELECT COUNT(*) FROM rentcar_bookings WHERE vehicle_id = ?)
        WHERE id = ?
      `, [data.vehicle_id, data.vehicle_id]);

      return {
        success: true,
        data: { id: result.insertId!, booking_number: bookingNumber } as any,
        message: '예약이 생성되었습니다.'
      };
    } catch (error) {
      console.error('Failed to create booking:', error);
      return {
        success: false,
        error: '예약 생성에 실패했습니다.'
      };
    }
  },

  // 예약 상태 변경
  updateStatus: async (id: number, status: string): Promise<RentcarApiResponse<null>> => {
    try {
      await db.execute(`
        UPDATE rentcar_bookings
        SET status = ?
        WHERE id = ?
      `, [status, id]);

      return {
        success: true,
        data: null,
        message: `예약이 ${status === 'confirmed' ? '확정' : status === 'cancelled' ? '취소' : '변경'}되었습니다.`
      };
    } catch (error) {
      console.error('Failed to update booking status:', error);
      return {
        success: false,
        error: '예약 상태 변경에 실패했습니다.'
      };
    }
  },

  // 차량 예약 가능 여부 확인 (날짜 중복 체크)
  checkAvailability: async (
    pickupDate: string,
    returnDate: string
  ): Promise<RentcarApiResponse<{ unavailableVehicleIds: number[] }>> => {
    try {
      // 선택한 날짜 범위와 겹치는 예약 조회
      // status가 'confirmed' 또는 'in_progress'인 예약만 체크
      // 날짜 중복 로직: 기존 예약의 pickup_date가 새 returnDate 이전이고
      // 기존 예약의 dropoff_date가 새 pickupDate 이후이면 중복
      const overlappingBookings = await db.query<{ vehicle_id: number }>(`
        SELECT DISTINCT vehicle_id
        FROM rentcar_bookings
        WHERE status IN ('confirmed', 'in_progress')
        AND pickup_date < ?
        AND dropoff_date > ?
      `, [returnDate, pickupDate]);

      const unavailableVehicleIds = overlappingBookings.map(row => row.vehicle_id);

      return {
        success: true,
        data: { unavailableVehicleIds }
      };
    } catch (error) {
      console.error('Failed to check availability:', error);
      return {
        success: false,
        error: '예약 가능 여부 확인에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 5. STATISTICS API (통계)
// ============================================

export const rentcarStatsApi = {
  // 벤더 통계 (최적화: 서브쿼리를 단일 쿼리로 통합 + 캐싱)
  getVendorStats: async (vendorId: number): Promise<RentcarApiResponse<RentcarVendorStats>> => {
    try {
      // 캐시 확인
      const cacheKey = CacheKeys.vendorStats(vendorId);
      const cached = cache.get<RentcarApiResponse<RentcarVendorStats>>(cacheKey);
      if (cached) {
        return cached;
      }

      const stats = await db.query(`
        SELECT
          COALESCE(vehicle_stats.total, 0) as total_vehicles,
          COALESCE(vehicle_stats.active, 0) as active_vehicles,
          COALESCE(booking_stats.total, 0) as total_bookings,
          COALESCE(booking_stats.confirmed, 0) as confirmed_bookings,
          COALESCE(booking_stats.revenue, 0) as total_revenue_krw
        FROM (SELECT 1) as dummy
        LEFT JOIN (
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
          FROM rentcar_vehicles
          WHERE vendor_id = ?
        ) vehicle_stats ON 1=1
        LEFT JOIN (
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
            COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_krw ELSE 0 END), 0) as revenue
          FROM rentcar_bookings
          WHERE vendor_id = ?
        ) booking_stats ON 1=1
      `, [vendorId, vendorId]);

      const result = {
        success: true,
        data: stats[0] as any
      };

      // 캐시 저장 (3분)
      cache.set(cacheKey, result, 3 * 60 * 1000);

      return result;
    } catch (error) {
      console.error('Failed to fetch vendor stats:', error);
      return {
        success: false,
        error: '통계 조회에 실패했습니다.'
      };
    }
  },

  // 대시보드용 상세 통계 (시계열, 차량 분포, 벤더 실적)
  getDashboardStats: async (dateRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<RentcarApiResponse<any>> => {
    try {
      const cacheKey = `rentcar:stats:dashboard:${dateRange}`;
      const cached = cache.get<RentcarApiResponse<any>>(cacheKey);
      if (cached) {
        return cached;
      }

      // 날짜 범위 계산
      const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
      const days = daysMap[dateRange];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // 1. 기본 통계
      const basicStats = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM rentcar_vendors) as total_vendors,
          (SELECT COUNT(*) FROM rentcar_vendors WHERE status = 'active') as active_vendors,
          (SELECT COUNT(*) FROM rentcar_vehicles) as total_vehicles,
          (SELECT COUNT(*) FROM rentcar_vehicles WHERE is_active = 1) as active_vehicles,
          (SELECT COUNT(*) FROM rentcar_bookings WHERE created_at >= ?) as total_bookings,
          (SELECT COUNT(*) FROM rentcar_bookings WHERE status = 'confirmed' AND created_at >= ?) as confirmed_bookings,
          (SELECT COALESCE(SUM(total_krw), 0) FROM rentcar_bookings WHERE payment_status = 'paid' AND created_at >= ?) as total_revenue
      `, [startDateStr, startDateStr, startDateStr]);

      // 2. 이전 기간 대비 성장률 계산
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - days);
      const prevStartDateStr = prevStartDate.toISOString().split('T')[0];

      const prevStats = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM rentcar_bookings WHERE created_at >= ? AND created_at < ?) as prev_bookings,
          (SELECT COALESCE(SUM(total_krw), 0) FROM rentcar_bookings WHERE payment_status = 'paid' AND created_at >= ? AND created_at < ?) as prev_revenue
      `, [prevStartDateStr, startDateStr, prevStartDateStr, startDateStr]);

      const currentBookings = basicStats[0].total_bookings || 0;
      const prevBookings = prevStats[0].prev_bookings || 1;
      const bookingGrowth = ((currentBookings - prevBookings) / prevBookings * 100).toFixed(1);

      const currentRevenue = basicStats[0].total_revenue || 0;
      const prevRevenue = prevStats[0].prev_revenue || 1;
      const revenueGrowth = ((currentRevenue - prevRevenue) / prevRevenue * 100).toFixed(1);

      // 3. 시계열 데이터 (일별)
      const timeSeries = await db.query(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as bookings,
          COALESCE(SUM(total_krw), 0) as revenue
        FROM rentcar_bookings
        WHERE created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [startDateStr]);

      // 4. 차량 등급별 분포
      const vehicleClassData = await db.query(`
        SELECT
          vehicle_class as class,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM rentcar_vehicles), 1) as percentage
        FROM rentcar_vehicles
        GROUP BY vehicle_class
        ORDER BY count DESC
      `);

      // 5. 벤더별 실적 TOP 5
      const vendorPerformance = await db.query(`
        SELECT
          v.business_name as vendorName,
          COUNT(b.id) as bookings,
          COALESCE(SUM(b.total_krw), 0) as revenue
        FROM rentcar_vendors v
        LEFT JOIN rentcar_bookings b ON v.id = b.vendor_id AND b.created_at >= ?
        GROUP BY v.id, v.business_name
        ORDER BY revenue DESC
        LIMIT 5
      `, [startDateStr]);

      const result = {
        success: true,
        data: {
          stats: {
            ...basicStats[0],
            bookingGrowth: parseFloat(bookingGrowth),
            revenueGrowth: parseFloat(revenueGrowth)
          },
          timeSeriesData: timeSeries,
          vehicleClassData: vehicleClassData,
          vendorPerformance: vendorPerformance
        }
      };

      // 캐시 저장 (2분)
      cache.set(cacheKey, result, 2 * 60 * 1000);

      rentcarLogger.info('Dashboard stats retrieved', { dateRange, dataPoints: timeSeries.length });

      return result;
    } catch (error: any) {
      rentcarLogger.error('Failed to fetch dashboard stats', error);
      return {
        success: false,
        error: '대시보드 통계 조회에 실패했습니다.'
      };
    }
  },

  // Admin 통계 (최적화: 서브쿼리를 단일 쿼리로 통합 + 캐싱)
  getAdminStats: async (): Promise<RentcarApiResponse<Partial<RentcarAdminStats>>> => {
    try {
      // 캐시 확인
      const cacheKey = CacheKeys.adminStats();
      const cached = cache.get<RentcarApiResponse<Partial<RentcarAdminStats>>>(cacheKey);
      if (cached) {
        return cached;
      }

      const stats = await db.query(`
        SELECT
          COALESCE(vendor_stats.total, 0) as total_vendors,
          COALESCE(vendor_stats.active, 0) as active_vendors,
          COALESCE(vehicle_stats.total, 0) as total_vehicles,
          COALESCE(booking_stats.total, 0) as total_bookings,
          COALESCE(booking_stats.revenue, 0) as total_revenue_krw
        FROM (SELECT 1) as dummy
        LEFT JOIN (
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
          FROM rentcar_vendors
        ) vendor_stats ON 1=1
        LEFT JOIN (
          SELECT COUNT(*) as total FROM rentcar_vehicles
        ) vehicle_stats ON 1=1
        LEFT JOIN (
          SELECT
            COUNT(*) as total,
            COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_krw ELSE 0 END), 0) as revenue
          FROM rentcar_bookings
        ) booking_stats ON 1=1
      `);

      const result = {
        success: true,
        data: stats[0] as any
      };

      // 캐시 저장 (3분)
      cache.set(cacheKey, result, 3 * 60 * 1000);

      return result;
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      return {
        success: false,
        error: '통계 조회에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 6. RATE PLANS API (요금제)
// ============================================

export const rentcarRatePlanApi = {
  // Get all rate plans for a vendor
  getByVendor: async (vendorId: number): Promise<RentcarApiResponse<RentcarRatePlan[]>> => {
    try {
      const result = await db.query(`
        SELECT * FROM rentcar_rate_plans
        WHERE vendor_id = ?
        ORDER BY priority DESC, start_date DESC
      `, [vendorId]);

      return { success: true, data: result as RentcarRatePlan[] };
    } catch (error) {
      console.error('Failed to fetch rate plans:', error);
      return {
        success: false,
        error: '요금제 조회에 실패했습니다.'
      };
    }
  },

  // Get active rate plan for specific criteria
  getActiveRatePlan: async (
    vendorId: number,
    vehicleId: number | null,
    vehicleClass: string | null,
    startDate: string
  ): Promise<RentcarApiResponse<RentcarRatePlan | null>> => {
    try {
      const result = await db.query(`
        SELECT * FROM rentcar_rate_plans
        WHERE vendor_id = ?
          AND is_active = 1
          AND start_date <= ?
          AND end_date >= ?
          AND (
            (vehicle_id = ? AND vehicle_id IS NOT NULL)
            OR (vehicle_class = ? AND vehicle_class IS NOT NULL AND vehicle_id IS NULL)
            OR (vehicle_id IS NULL AND vehicle_class IS NULL)
          )
        ORDER BY priority DESC, vehicle_id DESC, vehicle_class DESC
        LIMIT 1
      `, [vendorId, startDate, startDate, vehicleId, vehicleClass]);

      const ratePlan = result.length > 0 ? result[0] as RentcarRatePlan : null;
      return { success: true, data: ratePlan };
    } catch (error) {
      console.error('Failed to get active rate plan:', error);
      return {
        success: false,
        error: '활성 요금제 조회에 실패했습니다.'
      };
    }
  },

  // Create rate plan
  create: async (vendorId: number, data: RentcarRatePlanFormData): Promise<RentcarApiResponse<RentcarRatePlan>> => {
    try {
      const result = await db.execute(`
        INSERT INTO rentcar_rate_plans (
          vendor_id, vehicle_id, vehicle_class, plan_name, plan_code, description,
          start_date, end_date, daily_rate_krw, weekly_rate_krw, monthly_rate_krw,
          min_rental_days, max_rental_days, weekend_surcharge_percent, weekday_discount_percent,
          early_bird_days, early_bird_discount_percent, long_term_days, long_term_discount_percent,
          priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vendorId,
        data.vehicle_id || null,
        data.vehicle_class || null,
        data.plan_name,
        data.plan_code,
        data.description || null,
        data.start_date,
        data.end_date,
        data.daily_rate_krw,
        data.weekly_rate_krw || null,
        data.monthly_rate_krw || null,
        data.min_rental_days || 1,
        data.max_rental_days || null,
        data.weekend_surcharge_percent || 0,
        data.weekday_discount_percent || 0,
        data.early_bird_days || null,
        data.early_bird_discount_percent || 0,
        data.long_term_days || null,
        data.long_term_discount_percent || 0,
        data.priority || 0
      ]);

      const insertedId = result.insertId;
      const ratePlan = await db.query(`SELECT * FROM rentcar_rate_plans WHERE id = ?`, [insertedId]);

      return {
        success: true,
        data: ratePlan[0] as RentcarRatePlan,
        message: '요금제가 등록되었습니다.'
      };
    } catch (error: any) {
      console.error('Failed to create rate plan:', error);
      if (error.message.includes('Duplicate entry')) {
        return { success: false, error: '이미 존재하는 요금제 코드입니다.' };
      }
      return {
        success: false,
        error: '요금제 등록에 실패했습니다.'
      };
    }
  },

  // Update rate plan
  update: async (id: number, data: RentcarRatePlanFormData): Promise<RentcarApiResponse<RentcarRatePlan>> => {
    try {
      await db.execute(`
        UPDATE rentcar_rate_plans SET
          vehicle_id = ?, vehicle_class = ?, plan_name = ?, plan_code = ?, description = ?,
          start_date = ?, end_date = ?, daily_rate_krw = ?, weekly_rate_krw = ?, monthly_rate_krw = ?,
          min_rental_days = ?, max_rental_days = ?, weekend_surcharge_percent = ?, weekday_discount_percent = ?,
          early_bird_days = ?, early_bird_discount_percent = ?, long_term_days = ?, long_term_discount_percent = ?,
          priority = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        data.vehicle_id || null,
        data.vehicle_class || null,
        data.plan_name,
        data.plan_code,
        data.description || null,
        data.start_date,
        data.end_date,
        data.daily_rate_krw,
        data.weekly_rate_krw || null,
        data.monthly_rate_krw || null,
        data.min_rental_days || 1,
        data.max_rental_days || null,
        data.weekend_surcharge_percent || 0,
        data.weekday_discount_percent || 0,
        data.early_bird_days || null,
        data.early_bird_discount_percent || 0,
        data.long_term_days || null,
        data.long_term_discount_percent || 0,
        data.priority || 0,
        id
      ]);

      const ratePlan = await db.query(`SELECT * FROM rentcar_rate_plans WHERE id = ?`, [id]);

      return {
        success: true,
        data: ratePlan[0] as RentcarRatePlan,
        message: '요금제가 수정되었습니다.'
      };
    } catch (error) {
      console.error('Failed to update rate plan:', error);
      return {
        success: false,
        error: '요금제 수정에 실패했습니다.'
      };
    }
  },

  // Delete rate plan
  delete: async (id: number): Promise<RentcarApiResponse<void>> => {
    try {
      await db.execute(`DELETE FROM rentcar_rate_plans WHERE id = ?`, [id]);

      return {
        success: true,
        message: '요금제가 삭제되었습니다.'
      };
    } catch (error) {
      console.error('Failed to delete rate plan:', error);
      return {
        success: false,
        error: '요금제 삭제에 실패했습니다.'
      };
    }
  },

  // Toggle active status
  toggleActive: async (id: number, isActive: boolean): Promise<RentcarApiResponse<RentcarRatePlan>> => {
    try {
      await db.execute(`
        UPDATE rentcar_rate_plans SET is_active = ?, updated_at = NOW() WHERE id = ?
      `, [isActive, id]);

      const ratePlan = await db.query(`SELECT * FROM rentcar_rate_plans WHERE id = ?`, [id]);

      return {
        success: true,
        data: ratePlan[0] as RentcarRatePlan,
        message: isActive ? '요금제가 활성화되었습니다.' : '요금제가 비활성화되었습니다.'
      };
    } catch (error) {
      console.error('Failed to toggle rate plan status:', error);
      return {
        success: false,
        error: '상태 변경에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 7. INSURANCE PLANS API (보험 상품)
// ============================================

export const rentcarInsuranceApi = {
  // Get all insurance plans for a vendor
  getByVendor: async (vendorId: number): Promise<RentcarApiResponse<RentcarInsurancePlan[]>> => {
    try {
      const result = await db.query(`
        SELECT * FROM rentcar_insurance_plans
        WHERE vendor_id = ?
        ORDER BY display_order ASC, insurance_name ASC
      `, [vendorId]);

      return { success: true, data: result as RentcarInsurancePlan[] };
    } catch (error) {
      console.error('Failed to fetch insurance plans:', error);
      return {
        success: false,
        error: '보험 상품 조회에 실패했습니다.'
      };
    }
  },

  // Get active insurance plans
  getActive: async (vendorId: number): Promise<RentcarApiResponse<RentcarInsurancePlan[]>> => {
    try {
      const result = await db.query(`
        SELECT * FROM rentcar_insurance_plans
        WHERE vendor_id = ? AND is_active = 1
        ORDER BY display_order ASC, insurance_name ASC
      `, [vendorId]);

      return { success: true, data: result as RentcarInsurancePlan[] };
    } catch (error) {
      console.error('Failed to fetch active insurance plans:', error);
      return {
        success: false,
        error: '활성 보험 상품 조회에 실패했습니다.'
      };
    }
  },

  // Create insurance plan
  create: async (vendorId: number, data: RentcarInsurancePlanFormData): Promise<RentcarApiResponse<RentcarInsurancePlan>> => {
    try {
      const result = await db.execute(`
        INSERT INTO rentcar_insurance_plans (
          vendor_id, insurance_code, insurance_name, insurance_type, description,
          daily_price_krw, max_coverage_krw, deductible_krw,
          min_driver_age, requires_license_years,
          coverage_details, exclusions, is_recommended, display_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vendorId,
        data.insurance_code,
        data.insurance_name,
        data.insurance_type,
        data.description || null,
        data.daily_price_krw,
        data.max_coverage_krw || null,
        data.deductible_krw || 0,
        data.min_driver_age || 21,
        data.requires_license_years || 1,
        data.coverage_details ? JSON.stringify(data.coverage_details) : null,
        data.exclusions ? JSON.stringify(data.exclusions) : null,
        data.is_recommended || false,
        data.display_order || 0
      ]);

      const insertedId = result.insertId;
      const insurance = await db.query(`SELECT * FROM rentcar_insurance_plans WHERE id = ?`, [insertedId]);

      return {
        success: true,
        data: insurance[0] as RentcarInsurancePlan,
        message: '보험 상품이 등록되었습니다.'
      };
    } catch (error: any) {
      console.error('Failed to create insurance plan:', error);
      if (error.message.includes('Duplicate entry')) {
        return { success: false, error: '이미 존재하는 보험 코드입니다.' };
      }
      return {
        success: false,
        error: '보험 상품 등록에 실패했습니다.'
      };
    }
  },

  // Update insurance plan
  update: async (id: number, data: RentcarInsurancePlanFormData): Promise<RentcarApiResponse<RentcarInsurancePlan>> => {
    try {
      await db.execute(`
        UPDATE rentcar_insurance_plans SET
          insurance_code = ?, insurance_name = ?, insurance_type = ?, description = ?,
          daily_price_krw = ?, max_coverage_krw = ?, deductible_krw = ?,
          min_driver_age = ?, requires_license_years = ?,
          coverage_details = ?, exclusions = ?, is_recommended = ?, display_order = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        data.insurance_code,
        data.insurance_name,
        data.insurance_type,
        data.description || null,
        data.daily_price_krw,
        data.max_coverage_krw || null,
        data.deductible_krw || 0,
        data.min_driver_age || 21,
        data.requires_license_years || 1,
        data.coverage_details ? JSON.stringify(data.coverage_details) : null,
        data.exclusions ? JSON.stringify(data.exclusions) : null,
        data.is_recommended || false,
        data.display_order || 0,
        id
      ]);

      const insurance = await db.query(`SELECT * FROM rentcar_insurance_plans WHERE id = ?`, [id]);

      return {
        success: true,
        data: insurance[0] as RentcarInsurancePlan,
        message: '보험 상품이 수정되었습니다.'
      };
    } catch (error) {
      console.error('Failed to update insurance plan:', error);
      return {
        success: false,
        error: '보험 상품 수정에 실패했습니다.'
      };
    }
  },

  // Delete insurance plan
  delete: async (id: number): Promise<RentcarApiResponse<void>> => {
    try {
      await db.execute(`DELETE FROM rentcar_insurance_plans WHERE id = ?`, [id]);

      return {
        success: true,
        message: '보험 상품이 삭제되었습니다.'
      };
    } catch (error) {
      console.error('Failed to delete insurance plan:', error);
      return {
        success: false,
        error: '보험 상품 삭제에 실패했습니다.'
      };
    }
  },

  // Toggle active status
  toggleActive: async (id: number, isActive: boolean): Promise<RentcarApiResponse<RentcarInsurancePlan>> => {
    try {
      await db.execute(`
        UPDATE rentcar_insurance_plans SET is_active = ?, updated_at = NOW() WHERE id = ?
      `, [isActive, id]);

      const insurance = await db.query(`SELECT * FROM rentcar_insurance_plans WHERE id = ?`, [id]);

      return {
        success: true,
        data: insurance[0] as RentcarInsurancePlan,
        message: isActive ? '보험 상품이 활성화되었습니다.' : '보험 상품이 비활성화되었습니다.'
      };
    } catch (error) {
      console.error('Failed to toggle insurance status:', error);
      return {
        success: false,
        error: '상태 변경에 실패했습니다.'
      };
    }
  }
};

// ============================================
// 8. EXTRAS API (부가 옵션/서비스)
// ============================================

export const rentcarExtrasApi = {
  // Get all extras for a vendor
  getByVendor: async (vendorId: number): Promise<RentcarApiResponse<RentcarExtra[]>> => {
    try {
      const result = await db.query(`
        SELECT * FROM rentcar_extras
        WHERE vendor_id = ?
        ORDER BY display_order ASC, extra_name ASC
      `, [vendorId]);

      return { success: true, data: result as RentcarExtra[] };
    } catch (error) {
      console.error('Failed to fetch extras:', error);
      return {
        success: false,
        error: '부가 옵션 조회에 실패했습니다.'
      };
    }
  },

  // Get active extras
  getActive: async (vendorId: number): Promise<RentcarApiResponse<RentcarExtra[]>> => {
    try {
      const result = await db.query(`
        SELECT * FROM rentcar_extras
        WHERE vendor_id = ? AND is_active = 1
        ORDER BY display_order ASC, extra_name ASC
      `, [vendorId]);

      return { success: true, data: result as RentcarExtra[] };
    } catch (error) {
      console.error('Failed to fetch active extras:', error);
      return {
        success: false,
        error: '활성 부가 옵션 조회에 실패했습니다.'
      };
    }
  },

  // Create extra
  create: async (vendorId: number, data: RentcarExtraFormData): Promise<RentcarApiResponse<RentcarExtra>> => {
    try {
      const result = await db.execute(`
        INSERT INTO rentcar_extras (
          vendor_id, extra_code, extra_name, extra_type, description,
          pricing_type, price_krw, max_quantity, available_quantity,
          is_mandatory, is_prepaid, icon_url, image_url, display_order, badge_text
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vendorId,
        data.extra_code,
        data.extra_name,
        data.extra_type,
        data.description || null,
        data.pricing_type,
        data.price_krw,
        data.max_quantity || 1,
        data.available_quantity || null,
        data.is_mandatory || false,
        data.is_prepaid || false,
        data.icon_url || null,
        data.image_url || null,
        data.display_order || 0,
        data.badge_text || null
      ]);

      const insertedId = result.insertId;
      const extra = await db.query(`SELECT * FROM rentcar_extras WHERE id = ?`, [insertedId]);

      return {
        success: true,
        data: extra[0] as RentcarExtra,
        message: '부가 옵션이 등록되었습니다.'
      };
    } catch (error: any) {
      console.error('Failed to create extra:', error);
      if (error.message.includes('Duplicate entry')) {
        return { success: false, error: '이미 존재하는 옵션 코드입니다.' };
      }
      return {
        success: false,
        error: '부가 옵션 등록에 실패했습니다.'
      };
    }
  },

  // Update extra
  update: async (id: number, data: RentcarExtraFormData): Promise<RentcarApiResponse<RentcarExtra>> => {
    try {
      await db.execute(`
        UPDATE rentcar_extras SET
          extra_code = ?, extra_name = ?, extra_type = ?, description = ?,
          pricing_type = ?, price_krw = ?, max_quantity = ?, available_quantity = ?,
          is_mandatory = ?, is_prepaid = ?, icon_url = ?, image_url = ?, display_order = ?, badge_text = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        data.extra_code,
        data.extra_name,
        data.extra_type,
        data.description || null,
        data.pricing_type,
        data.price_krw,
        data.max_quantity || 1,
        data.available_quantity || null,
        data.is_mandatory || false,
        data.is_prepaid || false,
        data.icon_url || null,
        data.image_url || null,
        data.display_order || 0,
        data.badge_text || null,
        id
      ]);

      const extra = await db.query(`SELECT * FROM rentcar_extras WHERE id = ?`, [id]);

      return {
        success: true,
        data: extra[0] as RentcarExtra,
        message: '부가 옵션이 수정되었습니다.'
      };
    } catch (error) {
      console.error('Failed to update extra:', error);
      return {
        success: false,
        error: '부가 옵션 수정에 실패했습니다.'
      };
    }
  },

  // Delete extra
  delete: async (id: number): Promise<RentcarApiResponse<void>> => {
    try {
      await db.execute(`DELETE FROM rentcar_extras WHERE id = ?`, [id]);

      return {
        success: true,
        message: '부가 옵션이 삭제되었습니다.'
      };
    } catch (error) {
      console.error('Failed to delete extra:', error);
      return {
        success: false,
        error: '부가 옵션 삭제에 실패했습니다.'
      };
    }
  },

  // Toggle active status
  toggleActive: async (id: number, isActive: boolean): Promise<RentcarApiResponse<RentcarExtra>> => {
    try {
      await db.execute(`
        UPDATE rentcar_extras SET is_active = ?, updated_at = NOW() WHERE id = ?
      `, [isActive, id]);

      const extra = await db.query(`SELECT * FROM rentcar_extras WHERE id = ?`, [id]);

      return {
        success: true,
        data: extra[0] as RentcarExtra,
        message: isActive ? '부가 옵션이 활성화되었습니다.' : '부가 옵션이 비활성화되었습니다.'
      };
    } catch (error) {
      console.error('Failed to toggle extra status:', error);
      return {
        success: false,
        error: '상태 변경에 실패했습니다.'
      };
    }
  }
};

// ============================================
// Export all APIs
// ============================================

export const rentcarApi = {
  vendors: rentcarVendorApi,
  locations: rentcarLocationApi,
  vehicles: rentcarVehicleApi,
  bookings: rentcarBookingApi,
  stats: rentcarStatsApi,
  ratePlans: rentcarRatePlanApi,
  insurance: rentcarInsuranceApi,
  extras: rentcarExtrasApi
};

export default rentcarApi;
