/**
 * 렌트카 벤더 - 전체 예약 목록 API
 * GET /api/vendor/rentcar/bookings
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');
const { decrypt, decryptPhone, decryptEmail } = require('../../../../utils/encryption.cjs');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  }

  try {
    // JWT 토큰 검증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // user_id로 렌트카 벤더 ID 조회
    let vendorId;

    if (decoded.role === 'admin' && req.query.vendorId) {
      vendorId = req.query.vendorId;
    } else {
      const vendorResult = await connection.execute(
        `SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`,
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '등록된 렌트카 업체 정보가 없습니다.'
        });
      }

      vendorId = vendorResult.rows[0].id;
    }

    console.log('📋 [Rentcar All Bookings API] vendorId:', vendorId);

    // 벤더의 모든 렌트카 예약 목록 조회
    const result = await connection.execute(
      `SELECT
        b.id,
        b.booking_number,
        b.vendor_id,
        b.vehicle_id,
        b.user_id,
        b.pickup_date,
        b.pickup_time,
        b.dropoff_date,
        b.dropoff_time,
        b.total_krw,
        b.insurance_id,
        b.insurance_fee_krw,
        b.discount_krw,
        b.customer_name,
        b.customer_phone,
        b.customer_email,
        b.driver_name,
        b.driver_birth,
        b.driver_license_no,
        b.status,
        b.payment_status,
        b.voucher_code,
        b.pickup_checked_in_at,
        b.return_checked_out_at,
        b.pickup_vehicle_condition,
        b.return_vehicle_condition,
        b.late_return_hours,
        b.late_return_fee_krw,
        b.created_at,
        v.display_name as vehicle_model,
        v.vehicle_code,
        v.thumbnail_url as vehicle_image,
        i.name as insurance_name,
        i.hourly_rate_krw as insurance_hourly_rate,
        p.points_used,
        p.notes as payment_notes
      FROM rentcar_bookings b
      LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN rentcar_insurance i ON b.insurance_id = i.id
      LEFT JOIN payments p ON b.payment_key = p.payment_key
      WHERE b.vendor_id = ?
        AND b.payment_status IN ('paid', 'pending', 'confirmed')
      ORDER BY b.created_at DESC`,
      [vendorId]
    );

    console.log(`✅ ${result.rows?.length || 0}건 조회 완료`);

    // 안전한 복호화 함수 (평문/NULL 처리)
    const safeDecrypt = (value) => {
      if (!value) return null;
      try {
        if (typeof value === 'string' && value.length > 50) {
          return decrypt(value);
        }
        return value;
      } catch (err) {
        return value;
      }
    };

    const safeDecryptPhone = (value) => {
      if (!value) return null;
      try {
        if (typeof value === 'string' && value.length > 50) {
          return decryptPhone(value);
        }
        return value;
      } catch (err) {
        return value;
      }
    };

    const safeDecryptEmail = (value) => {
      if (!value) return null;
      try {
        if (typeof value === 'string' && value.length > 50) {
          return decryptEmail(value);
        }
        return value;
      } catch (err) {
        return value;
      }
    };

    // 응답 데이터 매핑
    const bookings = (result.rows || []).map(row => {
      // pickup_vehicle_condition, return_vehicle_condition JSON 파싱
      let pickupCondition = null;
      let returnCondition = null;

      try {
        if (row.pickup_vehicle_condition) {
          pickupCondition = typeof row.pickup_vehicle_condition === 'string'
            ? JSON.parse(row.pickup_vehicle_condition)
            : row.pickup_vehicle_condition;
        }
      } catch (e) {
        console.warn('⚠️  pickup_vehicle_condition JSON 파싱 실패:', e);
      }

      try {
        if (row.return_vehicle_condition) {
          returnCondition = typeof row.return_vehicle_condition === 'string'
            ? JSON.parse(row.return_vehicle_condition)
            : row.return_vehicle_condition;
        }
      } catch (e) {
        console.warn('⚠️  return_vehicle_condition JSON 파싱 실패:', e);
      }

      // ✅ points_used 추출 (payments 테이블 또는 notes에서)
      let pointsUsed = row.points_used || 0;

      // notes에서 추가 정보 추출 (points_used가 없을 경우 대비)
      if (!pointsUsed && row.payment_notes) {
        try {
          const notesData = typeof row.payment_notes === 'string'
            ? JSON.parse(row.payment_notes)
            : row.payment_notes;

          pointsUsed = notesData.pointsUsed || 0;
        } catch (e) {
          // notes 파싱 실패 시 무시
        }
      }

      const totalAmount = parseInt(row.total_krw) || 0;

      return {
        id: row.id,
        booking_number: row.booking_number,
        status: row.status,
        vehicle_id: row.vehicle_id,
        vehicle_model: row.vehicle_model,
        vehicle_code: row.vehicle_code,
        vehicle_image: row.vehicle_image,
        customer_name: safeDecrypt(row.customer_name),
        customer_phone: safeDecryptPhone(row.customer_phone),
        customer_email: safeDecryptEmail(row.customer_email),
        driver_name: safeDecrypt(row.driver_name),
        driver_birth: row.driver_birth,
        driver_license_no: safeDecrypt(row.driver_license_no),
        pickup_date: row.pickup_date,
        pickup_time: row.pickup_time,
        dropoff_date: row.dropoff_date,
        dropoff_time: row.dropoff_time,
        // UTC 형식으로 변환 (프론트엔드 호환)
        pickup_at_utc: `${row.pickup_date}T${row.pickup_time || '09:00:00'}Z`,
        return_at_utc: `${row.dropoff_date}T${row.dropoff_time || '18:00:00'}Z`,
        actual_pickup_at: row.pickup_checked_in_at,
        actual_return_at_utc: row.return_checked_out_at,
        pickup_location: '제주공항', // TODO: 실제 픽업 위치 필드 추가 필요
        total_amount: totalAmount, // ✅ 프론트엔드 호환을 위해 추가
        total_price_krw: totalAmount,
        insurance_name: row.insurance_name,
        insurance_fee_krw: parseInt(row.insurance_fee_krw) || 0,
        late_return_hours: row.late_return_hours,
        late_return_fee_krw: parseInt(row.late_return_fee_krw) || 0,
        voucher_code: row.voucher_code,
        pickup_vehicle_condition: pickupCondition,
        return_vehicle_condition: returnCondition,
        payment_status: row.payment_status,
        points_used: pointsUsed // ✅ 포인트 사용액 추가
      };
    });

    // 예약 ID 목록 추출
    const bookingIds = bookings.map(b => b.id);

    // extras 정보 조회 (있는 경우만)
    let extrasData = [];
    if (bookingIds.length > 0) {
      try {
        const extrasResult = await connection.execute(
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

        extrasData = extrasResult.rows || [];
      } catch (extrasError) {
        console.warn('⚠️  extras 조회 실패:', extrasError.message);
      }
    }

    // extras를 각 예약에 매핑
    const bookingsWithExtras = bookings.map(booking => {
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
        extras: bookingExtras,
        extras_count: bookingExtras.length,
        extras_total: bookingExtras.reduce((sum, e) => sum + e.total_price, 0)
      };
    });

    console.log('✅ [Rentcar All Bookings API] 조회 완료:', bookingsWithExtras.length, '건 (extras 포함)');

    return res.status(200).json({
      success: true,
      data: bookingsWithExtras,
      total: bookingsWithExtras.length
    });

  } catch (error) {
    console.error('❌ [Rentcar All Bookings API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '예약 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};
