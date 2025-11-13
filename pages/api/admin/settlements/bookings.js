/**
 * 정산 예약 목록 API - 특정 파트너의 예약 목록 조회
 * GET /api/admin/settlements/bookings
 *
 * Query Parameters:
 * - partner_id: 파트너 ID (필수)
 * - partner_type: 'rentcar' | 'lodging' (필수)
 * - period: 'today' | 'this_week' | 'this_month' | 'total' (기본값: 'total')
 *
 * Returns:
 * - bookings: 예약 목록 배열
 */

const { connect } = require('@planetscale/database');
const { decrypt, decryptPhone, decryptEmail } = require('../../../utils/encryption.cjs');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { partner_id, partner_type, period = 'total' } = req.query;

    if (!partner_id || !partner_type) {
      return res.status(400).json({
        success: false,
        error: 'partner_id and partner_type are required'
      });
    }

    console.log('📋 [Bookings API] partner_id:', partner_id, 'type:', partner_type, 'period:', period);

    // 기간 조건 생성
    let dateCondition = '1=1';
    if (period === 'today') {
      dateCondition = 'DATE(created_at) = CURDATE()';
    } else if (period === 'this_week') {
      dateCondition = 'YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)';
    } else if (period === 'this_month') {
      dateCondition = 'YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())';
    }

    let bookings = [];

    // 안전한 복호화 함수
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

    // 렌트카 예약 조회
    if (partner_type === 'rentcar') {
      const query = `
        SELECT
          rb.id,
          rb.booking_number,
          rb.customer_name,
          rb.customer_phone,
          rb.pickup_date,
          rb.pickup_time,
          rb.dropoff_date,
          rb.dropoff_time,
          rb.total_krw as total_amount,
          rb.payment_status,
          rb.created_at,
          rv.display_name as vehicle_name
        FROM rentcar_bookings rb
        LEFT JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
        WHERE rb.vendor_id = ?
          AND rb.payment_status = 'paid'
          AND ${dateCondition}
        ORDER BY rb.created_at DESC
      `;

      const result = await connection.execute(query, [partner_id]);
      bookings = (result.rows || []).map(booking => ({
        id: booking.id,
        booking_number: booking.booking_number,
        customer_name: safeDecrypt(booking.customer_name),
        customer_phone: safeDecryptPhone(booking.customer_phone),
        vehicle_name: booking.vehicle_name,
        pickup_date: booking.pickup_date,
        pickup_time: booking.pickup_time,
        dropoff_date: booking.dropoff_date,
        dropoff_time: booking.dropoff_time,
        total_amount: parseFloat(booking.total_amount || 0),
        payment_status: booking.payment_status,
        created_at: booking.created_at
      }));
    }
    // 숙박 예약 조회
    else if (partner_type === 'lodging') {
      const query = `
        SELECT
          b.id,
          b.booking_number,
          b.customer_name,
          b.customer_phone,
          b.check_in_date,
          b.check_out_date,
          pay.amount as total_amount,
          pay.payment_status,
          pay.created_at,
          l.title as listing_title
        FROM payments pay
        INNER JOIN bookings b ON pay.booking_id = b.id
        INNER JOIN listings l ON b.listing_id = l.id
        WHERE l.partner_id = ?
          AND pay.payment_status = 'paid'
          AND ${dateCondition}
        ORDER BY pay.created_at DESC
      `;

      const result = await connection.execute(query, [partner_id]);
      bookings = (result.rows || []).map(booking => ({
        id: booking.id,
        booking_number: booking.booking_number,
        customer_name: safeDecrypt(booking.customer_name),
        customer_phone: safeDecryptPhone(booking.customer_phone),
        listing_title: booking.listing_title,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        total_amount: parseFloat(booking.total_amount || 0),
        payment_status: booking.payment_status,
        created_at: booking.created_at
      }));
    }

    console.log(`✅ [Bookings API] ${bookings.length}건 예약 조회 완료`);

    return res.status(200).json({
      success: true,
      data: bookings
    });

  } catch (error) {
    console.error('❌ [Bookings API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
