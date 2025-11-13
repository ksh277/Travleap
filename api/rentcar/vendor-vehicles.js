// 렌트카 벤더 차량 관리 API
const { db } = require('../../utils/database.cjs');

/**
 * 벤더: 자기 차량 목록 조회
 */
async function getVendorVehicles(vendorId, userId) {
  try {
    console.log(`📋 [Vendor Vehicles] Getting vehicles for vendorId: ${vendorId}, userId: ${userId}`);

    // userId로 vendor_id 조회
    if (!vendorId && userId) {
      const vendorResult = await db.query(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [userId]
      );

      if (!vendorResult || vendorResult.length === 0) {
        console.log('⚠️  [Vendor Vehicles] No vendor found for userId:', userId);
        return {
          success: false,
          message: '렌트카 벤더 정보를 찾을 수 없습니다.',
          data: [],
          vehicles: []
        };
      }

      vendorId = vendorResult[0].id;
      console.log(`✅ [Vendor Vehicles] Found vendorId: ${vendorId} for userId: ${userId}`);
    }

    if (!vendorId) {
      return {
        success: false,
        message: '벤더 ID가 필요합니다.',
        data: [],
        vehicles: []
      };
    }

    // 차량 목록 조회 (stock 포함)
    const vehiclesResult = await db.query(
      `SELECT
        id,
        vendor_id,
        vehicle_code,
        brand,
        model,
        year,
        display_name,
        vehicle_class,
        vehicle_type,
        fuel_type,
        transmission,
        seating_capacity,
        door_count,
        thumbnail_url,
        images,
        daily_rate_krw,
        hourly_rate_krw,
        weekly_rate_krw,
        monthly_rate_krw,
        stock,
        is_active,
        is_featured,
        created_at,
        updated_at
      FROM rentcar_vehicles
      WHERE vendor_id = ?
      ORDER BY id ASC`,
      [vendorId]
    );

    console.log(`✅ [Vendor Vehicles] Found ${vehiclesResult?.length || 0} vehicles for vendorId: ${vendorId}`);

    return {
      success: true,
      data: vehiclesResult || [],
      vehicles: vehiclesResult || [] // 하위 호환성을 위해
    };

  } catch (error) {
    console.error('❌ [Vendor Vehicles API] Get vehicles error:', error);
    return {
      success: false,
      message: '차량 목록을 불러오는 중 오류가 발생했습니다.',
      error: error.message,
      data: [],
      vehicles: []
    };
  }
}

/**
 * 벤더: 새 차량 등록
 */
async function createVehicle(vehicleData, userId) {
  try {
    // userId로 vendor_id 조회
    const vendorResult = await db.query(
      'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!vendorResult || vendorResult.length === 0) {
      return {
        success: false,
        message: '렌트카 벤더 정보를 찾을 수 없습니다.'
      };
    }

    const vendorId = vendorResult[0].id;

    // 차량 등록 로직 구현 필요
    return {
      success: false,
      message: 'createVehicle: Not implemented yet',
      vendorId
    };
  } catch (error) {
    console.error('❌ [Vendor Vehicles API] Create vehicle error:', error);
    return {
      success: false,
      message: '차량 등록 중 오류가 발생했습니다.',
      error: error.message
    };
  }
}

/**
 * 벤더: 차량 정보 수정
 */
async function updateVehicle(vehicleId, updateData, userId) {
  return {
    success: false,
    message: 'updateVehicle: Not implemented yet'
  };
}

/**
 * 벤더: 차량 삭제
 */
async function deleteVehicle(vehicleId, userId) {
  return {
    success: false,
    message: 'deleteVehicle: Not implemented yet'
  };
}

/**
 * 벤더: 예약 목록 조회 (보험, 옵션 포함, 고객 정보 복호화)
 */
async function getVendorBookings(vendorId, userId) {
  try {
    const { decrypt, decryptPhone, decryptEmail } = require('../../utils/encryption.cjs');

    console.log(`📋 [Vendor Bookings] Getting bookings for vendorId: ${vendorId}, userId: ${userId}`);

    // userId로 vendor_id 조회
    if (!vendorId && userId) {
      const vendorResult = await db.query(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [userId]
      );

      if (!vendorResult || vendorResult.length === 0) {
        console.log('⚠️  [Vendor Bookings] No vendor found for userId:', userId);
        return {
          success: false,
          message: '렌트카 벤더 정보를 찾을 수 없습니다.',
          bookings: []
        };
      }

      vendorId = vendorResult[0].id;
      console.log(`✅ [Vendor Bookings] Found vendorId: ${vendorId} for userId: ${userId}`);
    }

    if (!vendorId) {
      return {
        success: false,
        message: '벤더 ID가 필요합니다.',
        bookings: []
      };
    }

    // 예약 목록 조회 (보험 정보 포함)
    const bookingsResult = await db.query(
      `SELECT
        rb.id,
        rb.booking_number,
        rb.status,
        rb.vehicle_id,
        rb.customer_name,
        rb.customer_phone,
        rb.customer_email,
        rb.driver_name,
        rb.driver_birth,
        rb.driver_license_no,
        rb.driver_license_exp,
        rb.pickup_at_utc,
        rb.return_at_utc,
        rb.actual_pickup_at_utc,
        rb.actual_return_at_utc,
        rb.pickup_location,
        rb.total_price_krw,
        rb.late_return_hours,
        rb.late_return_fee_krw,
        rb.voucher_code,
        rb.insurance_id,
        rb.insurance_fee_krw,
        rb.created_at,
        rv.model as vehicle_model,
        rv.vehicle_code,
        rv.primary_image as vehicle_image,
        ri.name as insurance_name
      FROM rentcar_bookings rb
      INNER JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
      LEFT JOIN rentcar_insurance ri ON rb.insurance_id = ri.id
      WHERE rv.vendor_id = ?
      ORDER BY rb.created_at DESC`,
      [vendorId]
    );

    console.log(`✅ [Vendor Bookings] Found ${bookingsResult?.length || 0} bookings for vendorId: ${vendorId}`);

    // 예약 ID 목록 추출
    const bookingIds = (bookingsResult || []).map(b => b.id);

    // extras 정보 조회 (있는 경우만)
    let extrasData = [];
    if (bookingIds.length > 0) {
      try {
        const extrasResult = await db.query(
          `SELECT
            rbe.booking_id,
            rbe.extra_id,
            rbe.quantity,
            rbe.unit_price_krw,
            rbe.total_price_krw,
            re.name as extra_name,
            re.category,
            re.price_type
          FROM rentcar_booking_extras rbe
          LEFT JOIN rentcar_extras re ON rbe.extra_id = re.id
          WHERE rbe.booking_id IN (${bookingIds.map(() => '?').join(',')})`,
          bookingIds
        );

        extrasData = extrasResult || [];
      } catch (extrasError) {
        // rentcar_booking_extras 테이블이 없을 수 있음
        console.warn('⚠️  [Vendor Bookings API] extras 조회 실패 (테이블 없음):', extrasError.message);
      }
    }

    // extras를 각 예약에 매핑 및 고객 정보 복호화
    const bookingsWithExtras = (bookingsResult || []).map(booking => {
      const bookingExtras = extrasData
        .filter(e => e.booking_id === booking.id)
        .map(e => ({
          extra_id: e.extra_id,
          name: e.extra_name || '(삭제된 옵션)',
          category: e.category,
          price_type: e.price_type,
          quantity: e.quantity,
          unit_price: Number(e.unit_price_krw || 0),
          total_price: Number(e.total_price_krw || 0)
        }));

      return {
        ...booking,
        // 고객 정보 복호화 (PIPA 준수)
        customer_name: booking.customer_name ? decrypt(booking.customer_name) : '',
        customer_email: booking.customer_email ? decryptEmail(booking.customer_email) : '',
        customer_phone: booking.customer_phone ? decryptPhone(booking.customer_phone) : '',
        driver_name: booking.driver_name ? decrypt(booking.driver_name) : null,
        driver_license_no: booking.driver_license_no ? decrypt(booking.driver_license_no) : null,
        driver_birth: booking.driver_birth ? decrypt(booking.driver_birth) : null,
        extras: bookingExtras,
        extras_count: bookingExtras.length,
        extras_total: bookingExtras.reduce((sum, e) => sum + e.total_price, 0)
      };
    });

    return {
      success: true,
      bookings: bookingsWithExtras
    };

  } catch (error) {
    console.error('❌ [Vendor Bookings API] Get bookings error:', error);
    return {
      success: false,
      message: '예약 목록을 불러오는 중 오류가 발생했습니다.',
      error: error.message,
      bookings: []
    };
  }
}

module.exports = {
  getVendorVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVendorBookings
};
