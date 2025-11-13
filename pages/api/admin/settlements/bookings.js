const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');
const { decrypt, decryptPhone, decryptEmail } = require('../../../../utils/encryption.cjs');

/**
 * 관리자 - 업체별 예약 목록 API
 * GET /api/admin/settlements/bookings?partner_id=X&partner_type=rentcar&period=today
 */
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

    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }

    const { partner_id, partner_type, period = 'total' } = req.query;

    if (!partner_id || !partner_type) {
      return res.status(400).json({ success: false, message: 'partner_id와 partner_type이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 기간 계산
    let dateCondition = '';
    const today = new Date();

    if (period === 'today') {
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString().split('T')[0];
      dateCondition = `AND DATE(b.created_at) = '${startOfDay}'`;
    } else if (period === 'this_week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      dateCondition = `AND b.created_at >= '${startOfWeek.toISOString()}'`;
    } else if (period === 'this_month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      dateCondition = `AND b.created_at >= '${startOfMonth.toISOString()}'`;
    }

    let query, params;

    if (partner_type === 'rentcar') {
      query = `
        SELECT
          b.id,
          b.booking_number,
          b.vendor_id as partner_id,
          b.customer_name,
          b.customer_phone,
          b.customer_email,
          b.pickup_date,
          b.pickup_time,
          b.dropoff_date,
          b.dropoff_time,
          b.total_krw as total_amount,
          b.insurance_fee_krw,
          b.status,
          b.payment_status,
          b.created_at,
          v.display_name as vehicle_name,
          i.name as insurance_name
        FROM rentcar_bookings b
        LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
        LEFT JOIN rentcar_insurance i ON b.insurance_id = i.id
        WHERE b.vendor_id = ?
          AND b.payment_status = 'paid'
          ${dateCondition}
        ORDER BY b.created_at DESC
      `;
      params = [partner_id];
    } else if (partner_type === 'lodging') {
      // 숙박 예약 (아직 구현 안됨)
      query = `
        SELECT
          1 as id,
          'LODGING-PLACEHOLDER' as booking_number,
          ? as partner_id,
          'Test Customer' as customer_name,
          '010-0000-0000' as customer_phone,
          'test@test.com' as customer_email,
          NOW() as check_in_date,
          NOW() as check_out_date,
          100000 as total_amount,
          'confirmed' as status,
          'paid' as payment_status,
          NOW() as created_at,
          'Test Room' as room_name
        WHERE 1=0
      `;
      params = [partner_id];
    }

    const result = await connection.execute(query, params);
    const bookings = result.rows || [];

    // 안전한 복호화
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

    // 복호화 적용
    const decryptedBookings = bookings.map(booking => ({
      ...booking,
      customer_name: safeDecrypt(booking.customer_name),
      customer_phone: safeDecryptPhone(booking.customer_phone),
      customer_email: safeDecryptEmail(booking.customer_email)
    }));

    console.log(`✅ [Admin Settlements Bookings] ${partner_type} 업체 ${partner_id} - ${period} 기간: ${decryptedBookings.length}건`);

    return res.status(200).json({
      success: true,
      data: decryptedBookings,
      total: decryptedBookings.length,
      period: period
    });

  } catch (error) {
    console.error('❌ [Admin Settlements Bookings API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '예약 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};
