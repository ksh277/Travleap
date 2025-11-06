/**
 * 숙박 예약 관리 API (실제 테이블 사용)
 * GET /api/admin/accommodation-bookings - 모든 숙박 예약 조회
 */

const { connect } = require('@planetscale/database');
const { withPublicCors } = require('../../../utils/cors-middleware');

const STAY_CATEGORY_ID = 1857; // categories 테이블의 stay 카테고리 ID

async function handler(req, res) {

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // DATABASE_URL 체크
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다!');
    return res.status(500).json({
      success: false,
      error: 'Database configuration error',
      message: 'DATABASE_URL is not configured'
    });
  }

  let connection;
  try {
    connection = connect({ url: process.env.DATABASE_URL });

    const { vendor_id } = req.query;

    console.log(`📥 [GET] 숙박 예약 목록 조회 (vendor_id: ${vendor_id})`);

    let query = `
      SELECT
        b.*,
        b.start_date as check_in_date,
        b.end_date as check_out_date,
        b.total_amount as total_price,
        p.business_name as vendor_name,
        p.id as vendor_id,
        l.title as room_name,
        l.room_code,
        u.name as customer_name,
        u.email as customer_email
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      JOIN partners p ON l.partner_id = p.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE l.category = 'stay' AND l.category_id = ? AND p.partner_type = 'lodging'
    `;

    const params = [STAY_CATEGORY_ID];

    // 특정 벤더의 예약만 조회하는 경우
    if (vendor_id) {
      query += ' AND p.id = ?';
      params.push(vendor_id);
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await connection.execute(query, params);

    console.log(`✅ ${result.rows?.length || 0}개 예약 조회 완료`);

    // customer_info JSON 파싱
    const bookings = (result.rows || []).map(booking => {
      let customerInfo = {};
      try {
        if (booking.customer_info) {
          customerInfo = typeof booking.customer_info === 'string'
            ? JSON.parse(booking.customer_info)
            : booking.customer_info;
        }
      } catch (e) {
        console.warn('⚠️ customer_info JSON 파싱 실패:', booking.id);
      }

      return {
        ...booking,
        customer_info: customerInfo,
        customer_name: booking.customer_name || customerInfo.name || 'Unknown',
        customer_email: booking.customer_email || customerInfo.email || ''
      };
    });

    return res.status(200).json({
      success: true,
      data: bookings
    });

  } catch (error) {
    console.error('❌ Bookings API error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno
    });

    return res.status(500).json({
      success: false,
      error: '예약 조회 중 오류가 발생했습니다.',
      details: error.message
    });
  }
}

// 공개 CORS 적용
module.exports = withPublicCors(handler);
