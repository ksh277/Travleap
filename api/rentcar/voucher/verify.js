const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 렌트카 바우처 인증 API
 * POST /api/rentcar/voucher/verify
 * Body: { voucher_code: string }
 *
 * 바우처 코드로 예약을 조회하고 검증합니다.
 */
module.exports = async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'POST 메서드만 지원합니다.'
    });
  }

  try {
    // 벤더 인증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.'
      });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '벤더 권한이 필요합니다.'
      });
    }

    // 바우처 코드 검증
    const { voucher_code } = req.body;

    if (!voucher_code) {
      return res.status(400).json({
        success: false,
        message: '바우처 코드를 입력해주세요.'
      });
    }

    // DB 연결
    const connection = connect({ url: process.env.DATABASE_URL });

    // 벤더 ID 조회
    let vendorId;
    if (decoded.role === 'admin') {
      vendorId = req.body.vendorId;
    } else {
      const vendorResult = await connection.execute(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '등록된 벤더 정보가 없습니다.'
        });
      }

      vendorId = vendorResult.rows[0].id;
    }

    console.log('🎫 바우처 인증:', {
      vendorId,
      voucherCode: voucher_code
    });

    // 바우처 코드로 예약 조회
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
        b.customer_name,
        b.customer_phone,
        b.customer_email,
        b.driver_name,
        b.driver_license_no,
        b.driver_phone,
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
        v.image_url as vehicle_image,
        v.license_plate,
        i.name as insurance_name,
        i.hourly_rate_krw as insurance_hourly_rate
      FROM rentcar_bookings b
      LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN rentcar_insurance i ON b.insurance_id = i.id
      WHERE b.voucher_code = ?
        AND b.vendor_id = ?
        AND b.payment_status = 'paid'
      LIMIT 1`,
      [voucher_code, vendorId]
    );

    if (!result.rows || result.rows.length === 0) {
      console.log('❌ 바우처 코드를 찾을 수 없음:', voucher_code);
      return res.status(404).json({
        success: false,
        message: '유효하지 않은 바우처 코드입니다.'
      });
    }

    const row = result.rows[0];

    // 예약 상태 확인
    if (row.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: '취소된 예약입니다.'
      });
    }

    if (row.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: '이미 완료된 예약입니다.'
      });
    }

    // 체크인 여부 확인
    const isCheckedIn = !!row.pickup_checked_in_at;
    const isCheckedOut = !!row.return_checked_out_at;

    console.log('✅ 바우처 인증 성공:', {
      bookingNumber: row.booking_number,
      customerName: row.customer_name,
      isCheckedIn,
      isCheckedOut
    });

    // 응답 데이터 포맷팅
    const booking = {
      id: row.id,
      booking_number: row.booking_number,
      status: row.status,
      vehicle_id: row.vehicle_id,
      vehicle_model: row.vehicle_model,
      vehicle_code: row.vehicle_code,
      vehicle_image: row.vehicle_image,
      license_plate: row.license_plate,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      customer_email: row.customer_email,
      driver_name: row.driver_name,
      driver_license_no: row.driver_license_no,
      driver_phone: row.driver_phone,
      pickup_date: row.pickup_date,
      pickup_time: row.pickup_time,
      dropoff_date: row.dropoff_date,
      dropoff_time: row.dropoff_time,
      pickup_at_utc: `${row.pickup_date}T${row.pickup_time || '09:00:00'}Z`,
      return_at_utc: `${row.dropoff_date}T${row.dropoff_time || '18:00:00'}Z`,
      actual_return_at_utc: row.return_checked_out_at,
      pickup_location: '제주공항', // TODO: 실제 픽업 위치
      total_price_krw: parseInt(row.total_krw) || 0,
      insurance_name: row.insurance_name,
      insurance_fee: parseInt(row.insurance_fee_krw) || 0,
      late_return_hours: row.late_return_hours,
      late_return_fee_krw: parseInt(row.late_return_fee_krw) || 0,
      voucher_code: row.voucher_code,
      pickup_checked_in_at: row.pickup_checked_in_at,
      return_checked_out_at: row.return_checked_out_at,
      pickup_vehicle_condition: row.pickup_vehicle_condition,
      return_vehicle_condition: row.return_vehicle_condition,
      payment_status: row.payment_status,
      is_checked_in: isCheckedIn,
      is_checked_out: isCheckedOut
    };

    return res.status(200).json({
      success: true,
      data: booking,
      message: '바우처 인증이 완료되었습니다.'
    });

  } catch (error) {
    console.error('❌ [Voucher Verify API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
