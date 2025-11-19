/**
 * 렌트카 벤더 - 예약 관리 API
 * GET /api/vendor/rentcar/bookings - 벤더의 예약 목록 조회
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

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
    let vendorId = req.query.vendorId;

    if (!vendorId) {
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

    console.log('📋 [Rentcar Bookings API] 예약 조회:', { vendorId });

    // 벤더의 렌트카 예약 목록 조회
    const result = await connection.execute(
      `SELECT
        rb.id,
        rb.booking_number,
        rb.vehicle_id,
        rb.pickup_location_id,
        rb.dropoff_location_id,
        rb.pickup_date,
        rb.pickup_time,
        rb.dropoff_date,
        rb.dropoff_time,
        rb.customer_name,
        rb.customer_email,
        rb.customer_phone,
        rb.driver_name,
        rb.driver_license_no as driver_license_number,
        rb.total_krw as total_price,
        rb.insurance_id,
        rb.insurance_fee_krw as insurance_price,
        rb.damage_fee_krw,
        rb.status,
        rb.payment_status,
        rb.created_at,
        rv.model as vehicle_model,
        rv.brand as vehicle_brand,
        rv.year as vehicle_year
      FROM rentcar_bookings rb
      INNER JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
      WHERE rv.vendor_id = ?
      ORDER BY rb.created_at DESC`,
      [vendorId]
    );

    const bookings = (result.rows || []).map(row => ({
      id: row.id,
      booking_number: row.booking_number,
      vehicle_id: row.vehicle_id,
      vehicle_name: `${row.vehicle_brand} ${row.vehicle_model} (${row.vehicle_year})`,
      pickup_location: row.pickup_location,
      dropoff_location: row.dropoff_location,
      pickup_datetime: `${row.pickup_date} ${row.pickup_time}`,
      dropoff_datetime: `${row.dropoff_date} ${row.dropoff_time}`,
      customer_name: row.customer_name,
      customer_email: row.customer_email,
      customer_phone: row.customer_phone,
      driver_name: row.driver_name,
      driver_license: row.driver_license_number,
      total_price: Number(row.total_price || 0),
      insurance_type: row.insurance_type,
      insurance_price: Number(row.insurance_price || 0),
      damage_fee: Number(row.damage_fee_krw || 0),
      status: row.status,
      payment_status: row.payment_status,
      created_at: row.created_at
    }));

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
        // rentcar_booking_extras 테이블이 없을 수 있음
        console.warn('⚠️  [Rentcar Bookings API] extras 조회 실패 (테이블 없음):', extrasError.message);
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

    console.log('✅ [Rentcar Bookings API] 조회 완료:', bookingsWithExtras.length, '건 (extras 포함)');

    return res.status(200).json({
      success: true,
      data: bookingsWithExtras,
      total: bookingsWithExtras.length
    });

  } catch (error) {
    console.error('❌ [Rentcar Bookings API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '예약 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};
