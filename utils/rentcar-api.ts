// ============================================
// 렌트카 API 모듈
// ============================================

import { db } from './database-cloud';
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
  RentcarAdminStats
} from '../types/rentcar';

// ============================================
// 1. VENDOR API (벤더 관리)
// ============================================

export const rentcarVendorApi = {
  // 벤더 목록 조회
  getAll: async (): Promise<RentcarApiResponse<RentcarVendor[]>> => {
    try {
      const vendors = await db.query<RentcarVendor>(`
        SELECT * FROM rentcar_vendors
        ORDER BY created_at DESC
      `);

      return {
        success: true,
        data: vendors
      };
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
      const result = await db.execute(`
        INSERT INTO rentcar_vendors (
          vendor_code, business_name, brand_name, business_number,
          contact_name, contact_email, contact_phone, description, logo_url,
          commission_rate, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `, [
        data.vendor_code,
        data.business_name,
        data.brand_name || null,
        data.business_number || null,
        data.contact_name,
        data.contact_email,
        data.contact_phone,
        data.description || null,
        data.logo_url || null,
        data.commission_rate || 15.00
      ]);

      const newVendor = await rentcarVendorApi.getById(result.insertId!);

      return {
        success: true,
        data: newVendor.data,
        message: '벤더가 성공적으로 등록되었습니다.'
      };
    } catch (error) {
      console.error('Failed to create vendor:', error);
      return {
        success: false,
        error: '벤더 등록에 실패했습니다.'
      };
    }
  },

  // 벤더 수정
  update: async (id: number, data: Partial<RentcarVendorFormData>): Promise<RentcarApiResponse<RentcarVendor>> => {
    try {
      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`);
        values.push(value);
      });

      values.push(id);

      await db.execute(`
        UPDATE rentcar_vendors
        SET ${fields.join(', ')}
        WHERE id = ?
      `, values);

      const updated = await rentcarVendorApi.getById(id);

      return {
        success: true,
        data: updated.data,
        message: '벤더 정보가 수정되었습니다.'
      };
    } catch (error) {
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
      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`);
        values.push(value);
      });

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

      // 벤더 차량 수 업데이트
      await db.execute(`
        UPDATE rentcar_vendors
        SET total_vehicles = (SELECT COUNT(*) FROM rentcar_vehicles WHERE vendor_id = ?)
        WHERE id = ?
      `, [vendorId, vendorId]);

      return {
        success: true,
        data: { id: result.insertId!, ...data } as any,
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
      const fields: string[] = [];
      const values: any[] = [];

      Object.entries(data).forEach(([key, value]) => {
        if (key === 'images' || key === 'features') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      values.push(id);

      await db.execute(`
        UPDATE rentcar_vehicles
        SET ${fields.join(', ')}
        WHERE id = ?
      `, values);

      return {
        success: true,
        data: null as any,
        message: '차량 정보가 수정되었습니다.'
      };
    } catch (error) {
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
      // 차량 정보 가져오기 (vendor_id 필요)
      const vehicle = await db.query(`SELECT vendor_id FROM rentcar_vehicles WHERE id = ?`, [id]);

      if (vehicle.length === 0) {
        return {
          success: false,
          error: '차량을 찾을 수 없습니다.'
        };
      }

      const vendorId = vehicle[0].vendor_id;

      await db.execute(`DELETE FROM rentcar_vehicles WHERE id = ?`, [id]);

      // 벤더 차량 수 업데이트
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
  }
};

// ============================================
// 5. STATISTICS API (통계)
// ============================================

export const rentcarStatsApi = {
  // 벤더 통계
  getVendorStats: async (vendorId: number): Promise<RentcarApiResponse<RentcarVendorStats>> => {
    try {
      const stats = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM rentcar_vehicles WHERE vendor_id = ?) as total_vehicles,
          (SELECT COUNT(*) FROM rentcar_vehicles WHERE vendor_id = ? AND is_active = 1) as active_vehicles,
          (SELECT COUNT(*) FROM rentcar_bookings WHERE vendor_id = ?) as total_bookings,
          (SELECT COUNT(*) FROM rentcar_bookings WHERE vendor_id = ? AND status = 'confirmed') as confirmed_bookings,
          (SELECT COALESCE(SUM(total_krw), 0) FROM rentcar_bookings WHERE vendor_id = ? AND payment_status = 'paid') as total_revenue_krw
      `, [vendorId, vendorId, vendorId, vendorId, vendorId]);

      return {
        success: true,
        data: stats[0] as any
      };
    } catch (error) {
      console.error('Failed to fetch vendor stats:', error);
      return {
        success: false,
        error: '통계 조회에 실패했습니다.'
      };
    }
  },

  // Admin 통계
  getAdminStats: async (): Promise<RentcarApiResponse<Partial<RentcarAdminStats>>> => {
    try {
      const stats = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM rentcar_vendors) as total_vendors,
          (SELECT COUNT(*) FROM rentcar_vendors WHERE status = 'active') as active_vendors,
          (SELECT COUNT(*) FROM rentcar_vehicles) as total_vehicles,
          (SELECT COUNT(*) FROM rentcar_bookings) as total_bookings,
          (SELECT COALESCE(SUM(total_krw), 0) FROM rentcar_bookings WHERE payment_status = 'paid') as total_revenue_krw
      `);

      return {
        success: true,
        data: stats[0] as any
      };
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
// Export all APIs
// ============================================

export const rentcarApi = {
  vendors: rentcarVendorApi,
  locations: rentcarLocationApi,
  vehicles: rentcarVehicleApi,
  bookings: rentcarBookingApi,
  stats: rentcarStatsApi
};

export default rentcarApi;
