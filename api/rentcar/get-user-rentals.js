/**
 * 사용자 렌트카 예약 목록 조회 API
 *
 * 기능:
 * - 사용자별 예약 목록 조회
 * - 체크인/체크아웃 상세 정보 포함
 * - 보증금 정산 정보 포함
 * - 차량 및 업체 정보 JOIN
 *
 * 라우트: GET /api/rentcar/user/rentals
 * 권한: 로그인한 사용자
 */

const { db } = require('../../utils/database.cjs');

module.exports = async function handler(req, res) {
  try {
    // 1. GET 메서드만 허용
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // 2. 사용자 ID 추출 (쿼리 파라미터 또는 JWT에서)
    // 임시로 query parameter 사용 (나중에 JWT로 변경)
    const { user_id, customer_email } = req.query;

    if (!user_id && !customer_email) {
      return res.status(400).json({
        success: false,
        error: 'user_id or customer_email is required'
      });
    }

    // 3. 예약 목록 조회 (상세 정보 포함)
    let query = `
      SELECT
        r.id,
        r.booking_number,
        r.vendor_id,
        r.vehicle_id,
        r.status,
        r.payment_status,
        r.customer_name,
        r.customer_email,
        r.customer_phone,
        r.driver_name,
        r.driver_birth,
        r.driver_license_no,
        r.driver_license_exp,
        r.pickup_at_utc,
        r.return_at_utc,
        r.actual_return_at_utc,
        r.total_price_krw,
        r.deposit_amount_krw,
        r.voucher_code,
        r.qr_code,
        r.created_at,
        r.hold_expires_at,
        r.pickup_checked_in_at,
        r.pickup_checked_in_by,
        r.pickup_vehicle_condition,
        r.return_checked_out_at,
        r.return_checked_out_by,
        r.return_vehicle_condition,
        r.late_return_hours,
        r.late_return_fee_krw,
        r.total_additional_fee_krw,
        v.display_name,
        v.thumbnail_url,
        vn.business_name as vendor_business_name,
        vn.brand_name as vendor_brand_name,
        pl.name as pickup_location,
        dl.name as dropoff_location
      FROM rentcar_bookings r
      LEFT JOIN rentcar_vehicles v ON r.vehicle_id = v.id
      LEFT JOIN rentcar_vendors vn ON r.vendor_id = vn.id
      LEFT JOIN rentcar_locations pl ON r.pickup_location_id = pl.id
      LEFT JOIN rentcar_locations dl ON r.dropoff_location_id = dl.id
      WHERE ${user_id ? 'r.user_id = ?' : 'r.customer_email = ?'}
      ORDER BY r.created_at DESC
    `;

    const rentals = await db.query(query, [user_id || customer_email]);

    // 4. 보증금 정보 조회 (있는 경우)
    const rentalIds = rentals.map(r => r.id);
    let deposits = [];

    if (rentalIds.length > 0) {
      const depositQuery = `
        SELECT
          rental_id,
          deposit_amount_krw,
          payment_key,
          order_id,
          status,
          preauth_at,
          captured_at,
          captured_amount_krw,
          refunded_at,
          refunded_amount_krw,
          cancel_reason
        FROM rentcar_rental_deposits
        WHERE rental_id IN (${rentalIds.map(() => '?').join(',')})
      `;
      deposits = await db.query(depositQuery, rentalIds);
    }

    // 5. 데이터 포맷팅
    const formatted = rentals.map((rental) => {
      // 보증금 정보 찾기
      const deposit = deposits.find(d => d.rental_id === rental.id);

      // 체크인 정보 파싱
      let checkInInfo = null;
      if (rental.pickup_vehicle_condition) {
        try {
          const condition = JSON.parse(rental.pickup_vehicle_condition);
          checkInInfo = {
            checked_in_at: rental.pickup_checked_in_at,
            checked_in_by: rental.pickup_checked_in_by,
            mileage: condition.mileage,
            fuel_level: condition.fuel_level,
            condition: condition.condition,
            damage_notes: condition.damage_notes || condition.notes,
            photos: condition.photos || []
          };
        } catch (e) {
          console.error('Failed to parse pickup_vehicle_condition:', e);
        }
      }

      // 체크아웃 정보 파싱
      let checkOutInfo = null;
      if (rental.return_vehicle_condition) {
        try {
          const condition = JSON.parse(rental.return_vehicle_condition);
          checkOutInfo = {
            checked_out_at: rental.return_checked_out_at,
            checked_out_by: rental.return_checked_out_by,
            actual_return_at: rental.actual_return_at_utc,
            mileage: condition.mileage,
            fuel_level: condition.fuel_level,
            condition: condition.condition,
            damage_notes: condition.damage_notes || condition.notes,
            photos: condition.photos || [],
            late_return_hours: rental.late_return_hours,
            late_return_fee_krw: rental.late_return_fee_krw,
            total_additional_fee_krw: rental.total_additional_fee_krw
          };
        } catch (e) {
          console.error('Failed to parse return_vehicle_condition:', e);
        }
      }

      // 보증금 정산 정보
      let depositSettlement = null;
      if (deposit) {
        depositSettlement = {
          deposit_amount: deposit.deposit_amount_krw,
          status: deposit.status,
          preauth_at: deposit.preauth_at,
          captured_at: deposit.captured_at,
          captured_amount: deposit.captured_amount_krw,
          refunded_at: deposit.refunded_at,
          refunded_amount: deposit.refunded_amount_krw,
          cancel_reason: deposit.cancel_reason
        };
      }

      return {
        id: rental.id,
        booking_number: rental.booking_number,
        status: rental.status,
        payment_status: rental.payment_status,
        vehicle: {
          id: rental.vehicle_id,
          display_name: rental.display_name,
          image: rental.thumbnail_url
        },
        vendor: {
          id: rental.vendor_id,
          business_name: rental.vendor_business_name,
          brand_name: rental.vendor_brand_name
        },
        customer: {
          name: rental.customer_name,
          email: rental.customer_email,
          phone: rental.customer_phone
        },
        driver: {
          name: rental.driver_name,
          birth: rental.driver_birth,
          license_no: rental.driver_license_no,
          license_exp: rental.driver_license_exp
        },
        pickup_at: rental.pickup_at_utc,
        return_at: rental.return_at_utc,
        pickup_location: rental.pickup_location || '위치 미정',
        dropoff_location: rental.dropoff_location || '위치 미정',
        total_price_krw: rental.total_price_krw,
        deposit_amount_krw: rental.deposit_amount_krw,
        voucher_code: rental.voucher_code,
        qr_code: rental.qr_code,
        hold_expires_at: rental.hold_expires_at,
        created_at: rental.created_at,
        check_in: checkInInfo,
        check_out: checkOutInfo,
        deposit_settlement: depositSettlement
      };
    });

    // 6. 응답
    return res.status(200).json({
      success: true,
      data: formatted
    });

  } catch (error) {
    console.error('[Get User Rentals] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
