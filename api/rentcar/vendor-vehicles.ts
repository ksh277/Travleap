// 렌트카 벤더 차량 관리 API
import { db } from '../../utils/database';

interface VehicleCreateRequest {
  vendor_id: number;
  display_name: string;
  vehicle_type: string; // sedan, suv, van, truck
  manufacturer: string;
  model: string;
  year: number;
  passenger_capacity: number;
  fuel_type: string; // gasoline, diesel, electric, hybrid
  transmission: string; // automatic, manual
  daily_rate_krw: number;
  features?: string[]; // ["navigation", "bluetooth", "backup_camera"]
  description?: string;
  thumbnail_url?: string;
  images?: string[]; // 추가 이미지 URL들
  license_plate?: string;
  is_active?: boolean;
}

interface VehicleUpdateRequest extends Partial<VehicleCreateRequest> {
  id: number;
}

/**
 * 벤더: 자기 차량 목록 조회
 */
export async function getVendorVehicles(vendorId: number, userId?: number) {
  try {
    // userId가 제공된 경우, user_id로부터 vendor_id 찾기
    let actualVendorId = vendorId;

    if (userId && !vendorId) {
      const vendors = await db.query(`
        SELECT id FROM rentcar_vendors WHERE user_id = ?
      `, [userId]);

      if (vendors.length === 0) {
        return {
          success: false,
          message: '벤더 정보를 찾을 수 없습니다',
          vehicles: []
        };
      }

      actualVendorId = vendors[0].id;
    }

    const vehicles = await db.query(`
      SELECT
        v.*,
        (
          SELECT COUNT(*)
          FROM rentcar_bookings rb
          WHERE rb.vehicle_id = v.id
          AND rb.status = 'completed'
        ) as completed_bookings,
        (
          SELECT COUNT(*)
          FROM rentcar_bookings rb
          WHERE rb.vehicle_id = v.id
          AND rb.status IN ('pending', 'confirmed')
        ) as active_bookings
      FROM rentcar_vehicles v
      WHERE v.vendor_id = ?
      ORDER BY v.created_at DESC
    `, [actualVendorId]);

    return {
      success: true,
      data: vehicles
    };

  } catch (error) {
    console.error('❌ [Vendor Vehicles] 목록 조회 오류:', error);
    return {
      success: false,
      message: '차량 목록 조회 중 오류가 발생했습니다',
      vehicles: []
    };
  }
}

/**
 * 벤더: 새 차량 등록
 */
export async function createVehicle(request: VehicleCreateRequest, userId: number) {
  try {
    console.log('🚗 [Vendor] 차량 등록:', request.display_name);

    // 1. 벤더 권한 확인
    const vendors = await db.query(`
      SELECT id, status FROM rentcar_vendors
      WHERE id = ? AND user_id = ?
    `, [request.vendor_id, userId]);

    if (vendors.length === 0) {
      return {
        success: false,
        message: '벤더 권한이 없습니다'
      };
    }

    const vendor = vendors[0];

    // 2. 벤더 승인 상태 확인
    if (vendor.status !== 'active') {
      return {
        success: false,
        message: '승인된 벤더만 차량을 등록할 수 있습니다'
      };
    }

    // 3. 차량 번호판 중복 확인 (있는 경우)
    if (request.license_plate) {
      const existing = await db.query(`
        SELECT id FROM rentcar_vehicles
        WHERE license_plate = ? AND vendor_id = ?
      `, [request.license_plate, request.vendor_id]);

      if (existing.length > 0) {
        return {
          success: false,
          message: '이미 등록된 차량 번호입니다'
        };
      }
    }

    // 4. 차량 등록
    const result = await db.execute(`
      INSERT INTO rentcar_vehicles (
        vendor_id, display_name, vehicle_type, manufacturer, model, year,
        passenger_capacity, fuel_type, transmission, daily_rate_krw,
        features, description, thumbnail_url, images, license_plate,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      request.vendor_id,
      request.display_name,
      request.vehicle_type,
      request.manufacturer,
      request.model,
      request.year,
      request.passenger_capacity,
      request.fuel_type,
      request.transmission,
      request.daily_rate_krw,
      request.features ? JSON.stringify(request.features) : null,
      request.description || null,
      request.thumbnail_url || null,
      request.images ? JSON.stringify(request.images) : null,
      request.license_plate || null,
      request.is_active !== false ? 1 : 0
    ]);

    const vehicleId = result.insertId;

    console.log(`✅ [Vendor] 차량 등록 완료: ${request.display_name} (ID: ${vehicleId})`);

    return {
      success: true,
      message: '차량이 등록되었습니다',
      vehicle_id: vehicleId
    };

  } catch (error) {
    console.error('❌ [Vendor] 차량 등록 오류:', error);
    return {
      success: false,
      message: '차량 등록 중 오류가 발생했습니다'
    };
  }
}

/**
 * 벤더: 차량 정보 수정
 */
export async function updateVehicle(request: VehicleUpdateRequest, userId: number) {
  try {
    console.log('✏️ [Vendor] 차량 수정:', request.id);

    // 1. 권한 확인: 이 차량이 해당 벤더 소유인지
    const vehicles = await db.query(`
      SELECT v.id, v.vendor_id
      FROM rentcar_vehicles v
      JOIN rentcar_vendors vendor ON v.vendor_id = vendor.id
      WHERE v.id = ? AND vendor.user_id = ?
    `, [request.id, userId]);

    if (vehicles.length === 0) {
      return {
        success: false,
        message: '차량을 찾을 수 없거나 권한이 없습니다'
      };
    }

    // 2. 업데이트할 필드 동적 생성
    const fields: string[] = [];
    const values: any[] = [];

    if (request.display_name !== undefined) {
      fields.push('display_name = ?');
      values.push(request.display_name);
    }
    if (request.vehicle_type !== undefined) {
      fields.push('vehicle_type = ?');
      values.push(request.vehicle_type);
    }
    if (request.manufacturer !== undefined) {
      fields.push('manufacturer = ?');
      values.push(request.manufacturer);
    }
    if (request.model !== undefined) {
      fields.push('model = ?');
      values.push(request.model);
    }
    if (request.year !== undefined) {
      fields.push('year = ?');
      values.push(request.year);
    }
    if (request.passenger_capacity !== undefined) {
      fields.push('passenger_capacity = ?');
      values.push(request.passenger_capacity);
    }
    if (request.fuel_type !== undefined) {
      fields.push('fuel_type = ?');
      values.push(request.fuel_type);
    }
    if (request.transmission !== undefined) {
      fields.push('transmission = ?');
      values.push(request.transmission);
    }
    if (request.daily_rate_krw !== undefined) {
      fields.push('daily_rate_krw = ?');
      values.push(request.daily_rate_krw);
    }
    if (request.features !== undefined) {
      fields.push('features = ?');
      values.push(JSON.stringify(request.features));
    }
    if (request.description !== undefined) {
      fields.push('description = ?');
      values.push(request.description);
    }
    if (request.thumbnail_url !== undefined) {
      fields.push('thumbnail_url = ?');
      values.push(request.thumbnail_url);
    }
    if (request.images !== undefined) {
      fields.push('images = ?');
      values.push(JSON.stringify(request.images));
    }
    if (request.license_plate !== undefined) {
      fields.push('license_plate = ?');
      values.push(request.license_plate);
    }
    if (request.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(request.is_active ? 1 : 0);
    }

    fields.push('updated_at = NOW()');

    if (fields.length === 1) { // updated_at만 있으면
      return {
        success: false,
        message: '업데이트할 정보가 없습니다'
      };
    }

    values.push(request.id);

    await db.execute(`
      UPDATE rentcar_vehicles SET ${fields.join(', ')} WHERE id = ?
    `, values);

    console.log(`✅ [Vendor] 차량 수정 완료: ID ${request.id}`);

    return {
      success: true,
      message: '차량 정보가 수정되었습니다'
    };

  } catch (error) {
    console.error('❌ [Vendor] 차량 수정 오류:', error);
    return {
      success: false,
      message: '차량 수정 중 오류가 발생했습니다'
    };
  }
}

/**
 * 벤더: 차량 삭제 (비활성화)
 */
export async function deleteVehicle(vehicleId: number, userId: number) {
  try {
    console.log('🗑️ [Vendor] 차량 삭제:', vehicleId);

    // 1. 권한 확인
    const vehicles = await db.query(`
      SELECT v.id, v.vendor_id
      FROM rentcar_vehicles v
      JOIN rentcar_vendors vendor ON v.vendor_id = vendor.id
      WHERE v.id = ? AND vendor.user_id = ?
    `, [vehicleId, userId]);

    if (vehicles.length === 0) {
      return {
        success: false,
        message: '차량을 찾을 수 없거나 권한이 없습니다'
      };
    }

    // 2. 활성 예약이 있는지 확인
    const activeBookings = await db.query(`
      SELECT COUNT(*) as count
      FROM rentcar_bookings
      WHERE vehicle_id = ?
      AND status IN ('pending', 'confirmed', 'in_progress')
    `, [vehicleId]);

    if (activeBookings[0].count > 0) {
      return {
        success: false,
        message: '활성 예약이 있는 차량은 삭제할 수 없습니다. 먼저 예약을 처리하거나 비활성화하세요.'
      };
    }

    // 3. 완전 삭제 대신 비활성화 (데이터 보존)
    await db.execute(`
      UPDATE rentcar_vehicles
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = ?
    `, [vehicleId]);

    console.log(`✅ [Vendor] 차량 비활성화 완료: ID ${vehicleId}`);

    return {
      success: true,
      message: '차량이 비활성화되었습니다'
    };

  } catch (error) {
    console.error('❌ [Vendor] 차량 삭제 오류:', error);
    return {
      success: false,
      message: '차량 삭제 중 오류가 발생했습니다'
    };
  }
}

/**
 * 벤더: 차량별 예약 내역 조회
 */
export async function getVehicleBookings(vehicleId: number, userId: number) {
  try {
    // 1. 권한 확인
    const vehicles = await db.query(`
      SELECT v.id
      FROM rentcar_vehicles v
      JOIN rentcar_vendors vendor ON v.vendor_id = vendor.id
      WHERE v.id = ? AND vendor.user_id = ?
    `, [vehicleId, userId]);

    if (vehicles.length === 0) {
      return {
        success: false,
        message: '차량을 찾을 수 없거나 권한이 없습니다',
        bookings: []
      };
    }

    // 2. 예약 내역 조회
    const bookings = await db.query(`
      SELECT
        rb.*,
        v.display_name as vehicle_name,
        u.name as customer_name,
        u.email as customer_email
      FROM rentcar_bookings rb
      LEFT JOIN rentcar_vehicles v ON rb.vehicle_id = v.id
      LEFT JOIN users u ON rb.user_id = u.id
      WHERE rb.vehicle_id = ?
      ORDER BY rb.created_at DESC
      LIMIT 100
    `, [vehicleId]);

    return {
      success: true,
      bookings
    };

  } catch (error) {
    console.error('❌ [Vendor] 차량 예약 내역 조회 오류:', error);
    return {
      success: false,
      message: '예약 내역 조회 중 오류가 발생했습니다',
      bookings: []
    };
  }
}

/**
 * 벤더: 전체 예약 내역 조회 (모든 차량)
 */
export async function getVendorBookings(vendorId: number, userId: number) {
  try {
    // 1. 권한 확인
    const vendors = await db.query(`
      SELECT id FROM rentcar_vendors
      WHERE id = ? AND user_id = ?
    `, [vendorId, userId]);

    if (vendors.length === 0) {
      return {
        success: false,
        message: '벤더 권한이 없습니다',
        bookings: []
      };
    }

    // 2. 전체 예약 내역 조회
    const bookings = await db.query(`
      SELECT
        rb.*,
        v.display_name as vehicle_name,
        v.license_plate,
        u.name as customer_name,
        u.email as customer_email,
        u.phone as customer_phone
      FROM rentcar_bookings rb
      LEFT JOIN rentcar_vehicles v ON rb.vehicle_id = v.id
      LEFT JOIN users u ON rb.user_id = u.id
      WHERE rb.vendor_id = ?
      ORDER BY rb.created_at DESC
      LIMIT 200
    `, [vendorId]);

    return {
      success: true,
      bookings
    };

  } catch (error) {
    console.error('❌ [Vendor] 예약 내역 조회 오류:', error);
    return {
      success: false,
      message: '예약 내역 조회 중 오류가 발생했습니다',
      bookings: []
    };
  }
}

/**
 * 벤더: 대시보드 통계
 */
export async function getVendorDashboard(vendorId: number, userId: number) {
  try {
    // 1. 권한 확인
    const vendors = await db.query(`
      SELECT id, business_name FROM rentcar_vendors
      WHERE id = ? AND user_id = ?
    `, [vendorId, userId]);

    if (vendors.length === 0) {
      return {
        success: false,
        message: '벤더 권한이 없습니다'
      };
    }

    // 2. 차량 통계
    const vehicleStats = await db.query(`
      SELECT
        COUNT(*) as total_vehicles,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_vehicles
      FROM rentcar_vehicles
      WHERE vendor_id = ?
    `, [vendorId]);

    // 3. 예약 통계
    const bookingStats = await db.query(`
      SELECT
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings
      FROM rentcar_bookings
      WHERE vendor_id = ?
    `, [vendorId]);

    // 4. 수익 통계
    const revenueStats = await db.query(`
      SELECT
        SUM(CASE WHEN payment_status = 'completed' THEN vendor_amount_krw ELSE 0 END) as total_revenue,
        SUM(CASE WHEN payment_status = 'completed' AND MONTH(paid_at) = MONTH(NOW()) THEN vendor_amount_krw ELSE 0 END) as this_month_revenue
      FROM rentcar_bookings
      WHERE vendor_id = ?
    `, [vendorId]);

    // 5. 최근 예약
    const recentBookings = await db.query(`
      SELECT
        rb.id,
        rb.booking_number,
        rb.pickup_date,
        rb.dropoff_date,
        rb.status,
        rb.total_krw,
        v.display_name as vehicle_name,
        u.name as customer_name
      FROM rentcar_bookings rb
      LEFT JOIN rentcar_vehicles v ON rb.vehicle_id = v.id
      LEFT JOIN users u ON rb.user_id = u.id
      WHERE rb.vendor_id = ?
      ORDER BY rb.created_at DESC
      LIMIT 10
    `, [vendorId]);

    return {
      success: true,
      dashboard: {
        vendor: vendors[0],
        vehicles: vehicleStats[0],
        bookings: bookingStats[0],
        revenue: revenueStats[0],
        recent_bookings: recentBookings
      }
    };

  } catch (error) {
    console.error('❌ [Vendor] 대시보드 조회 오류:', error);
    return {
      success: false,
      message: '대시보드 조회 중 오류가 발생했습니다'
    };
  }
}
