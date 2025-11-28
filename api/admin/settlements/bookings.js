/**
 * 정산 관리 - 업체별 예약/결제 목록 조회 API
 * GET /api/admin/settlements/bookings?partner_id=X&partner_type=rentcar&period=total
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../../utils/cors-middleware.cjs');

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  // 관리자 권한 확인
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: '관리자 권한이 필요합니다'
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

    console.log('[정산 예약목록] 조회:', { partner_id, partner_type, period });

    // 기간 필터 설정
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const formatDate = (date) => date.toISOString().split('T')[0];

    let dateFilter = '';
    let dateParam = null;

    switch (period) {
      case 'today':
        dateFilter = 'AND DATE(created_at) = ?';
        dateParam = formatDate(today);
        break;
      case 'this_week':
        dateFilter = 'AND created_at >= ?';
        dateParam = formatDate(weekAgo);
        break;
      case 'this_month':
        dateFilter = 'AND created_at >= ?';
        dateParam = formatDate(monthAgo);
        break;
      default:
        // total: 필터 없음
        break;
    }

    let bookings = [];

    if (partner_type === 'rentcar') {
      // 렌트카 예약 목록 (실제 컬럼명: total_krw)
      let query = `
        SELECT
          rb.id,
          rb.booking_number,
          rb.customer_name,
          rb.customer_phone,
          rb.customer_email,
          rb.vehicle_name,
          rb.pickup_date,
          rb.pickup_time,
          rb.dropoff_date,
          rb.dropoff_time,
          rb.pickup_location,
          rb.dropoff_location,
          rb.total_krw as total_amount,
          rb.status,
          rb.created_at
        FROM rentcar_bookings rb
        WHERE rb.vendor_id = ?
          AND rb.status IN ('confirmed', 'completed', 'checked_in', 'in_progress', 'returned')
          ${dateFilter}
        ORDER BY rb.created_at DESC
        LIMIT 100
      `;

      const params = dateParam ? [partner_id, dateParam] : [partner_id];
      const result = await connection.execute(query, params);
      bookings = result.rows || [];

    } else if (partner_type === 'lodging') {
      // 숙박 예약 목록 (lodging_bookings, booking_status 컬럼 사용)
      let query = `
        SELECT
          lb.id,
          lb.booking_number,
          lb.guest_name as customer_name,
          lb.guest_phone as customer_phone,
          lb.guest_email as customer_email,
          lb.check_in_date,
          lb.check_out_date,
          lb.room_name,
          lb.num_guests as guests,
          lb.total_amount,
          lb.booking_status as status,
          lb.created_at
        FROM lodging_bookings lb
        WHERE lb.listing_id = ?
          AND lb.booking_status IN ('confirmed', 'checked_in', 'checked_out')
          ${dateFilter}
        ORDER BY lb.created_at DESC
        LIMIT 100
      `;

      const params = dateParam ? [partner_id, dateParam] : [partner_id];
      const result = await connection.execute(query, params);
      bookings = result.rows || [];

    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid partner_type (must be rentcar or lodging)'
      });
    }

    console.log(`✅ [정산 예약목록] 조회 완료: ${bookings.length}건`);

    return res.status(200).json({
      success: true,
      data: bookings
    });

  } catch (error) {
    console.error('❌ [정산 예약목록] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true, requireAdmin: true }));
