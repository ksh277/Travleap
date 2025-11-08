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
        rb.pickup_location,
        rb.dropoff_location,
        rb.pickup_date,
        rb.pickup_time,
        rb.dropoff_date,
        rb.dropoff_time,
        rb.customer_name,
        rb.customer_email,
        rb.customer_phone,
        rb.driver_name,
        rb.driver_license_number,
        rb.total_price_krw as total_price,
        rb.insurance_type,
        rb.insurance_price,
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
      status: row.status,
      payment_status: row.payment_status,
      created_at: row.created_at
    }));

    console.log('✅ [Rentcar Bookings API] 조회 완료:', bookings.length, '건');

    return res.status(200).json({
      success: true,
      data: bookings,
      total: bookings.length
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
