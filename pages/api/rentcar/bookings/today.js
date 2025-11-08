const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 렌트카 오늘 예약 조회 API
 * GET /api/rentcar/bookings/today?start=ISO_DATE&end=ISO_DATE
 *
 * 오늘 픽업 또는 반납 예정인 예약들을 조회합니다.
 */
module.exports = async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'GET 메서드만 지원합니다.'
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

    // DB 연결
    const connection = connect({ url: process.env.DATABASE_URL });

    // 벤더 ID 조회
    let vendorId;
    if (decoded.role === 'admin') {
      vendorId = req.query.vendorId;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: '관리자는 vendorId를 명시해야 합니다.'
        });
      }
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

    // 날짜 파라미터 (옵션)
    const { start, end } = req.query;

    // 오늘 날짜 계산 (파라미터가 없으면 오늘 날짜 사용)
    let startDate, endDate;
    if (start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
    } else {
      const today = new Date();
      startDate = new Date(today.setHours(0, 0, 0, 0));
      endDate = new Date(today.setHours(23, 59, 59, 999));
    }

    const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log('📅 오늘 예약 조회:', {
      vendorId,
      startDate: startDateStr,
      endDate: endDateStr
    });

    // 오늘 픽업 또는 반납 예정인 예약 조회
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
        b.check_in_at,
        b.check_out_at,
        b.vehicle_condition_checkin,
        b.fuel_level_checkin,
        b.mileage_checkin,
        b.vehicle_condition_checkout,
        b.fuel_level_checkout,
        b.mileage_checkout,
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
      WHERE b.vendor_id = ?
        AND b.payment_status = 'paid'
        AND (
          b.pickup_date = ? OR
          b.dropoff_date = ? OR
          (b.pickup_date <= ? AND b.dropoff_date >= ?)
        )
      ORDER BY b.pickup_date ASC, b.pickup_time ASC`,
      [vendorId, startDateStr, startDateStr, startDateStr, startDateStr]
    );

    console.log(`✅ 오늘 예약 ${result.rows?.length || 0}건 조회 완료`);

    // 응답 데이터 포맷팅
    const bookings = (result.rows || []).map(row => ({
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
      // UTC 형식으로 변환 (프론트엔드 호환)
      pickup_at_utc: `${row.pickup_date}T${row.pickup_time || '09:00:00'}Z`,
      return_at_utc: `${row.dropoff_date}T${row.dropoff_time || '18:00:00'}Z`,
      actual_return_at_utc: row.check_out_at,
      pickup_location: '제주공항', // TODO: 실제 픽업 위치 필드 추가 필요
      total_price_krw: parseInt(row.total_krw) || 0,
      insurance_name: row.insurance_name,
      insurance_fee: parseInt(row.insurance_fee_krw) || 0,
      late_return_hours: row.late_return_hours,
      late_return_fee_krw: parseInt(row.late_return_fee_krw) || 0,
      voucher_code: row.voucher_code,
      check_in_at: row.check_in_at,
      check_out_at: row.check_out_at,
      vehicle_condition_checkin: row.vehicle_condition_checkin,
      fuel_level_checkin: row.fuel_level_checkin,
      mileage_checkin: row.mileage_checkin,
      vehicle_condition_checkout: row.vehicle_condition_checkout,
      fuel_level_checkout: row.fuel_level_checkout,
      mileage_checkout: row.mileage_checkout,
      payment_status: row.payment_status
    }));

    return res.status(200).json({
      success: true,
      data: bookings,
      meta: {
        total: bookings.length,
        date: startDateStr
      }
    });

  } catch (error) {
    console.error('❌ [Today Bookings API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
