/**
 * 팝업 벤더 주문 목록 조회 API
 *
 * 기능:
 * - 벤더의 팝업 주문 목록 조회
 * - JWT 인증 필수
 * - 필터링 (payment_status, order_status)
 * - 검색 (order_number, customer_name)
 *
 * 라우트: GET /api/vendor/popup/orders
 */

const { connect } = require('@planetscale/database');
const { verifyJWT } = require('../../../../utils/jwt');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  // JWT 인증
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '인증 토큰이 필요합니다.'
    });
  }

  let decoded;
  try {
    decoded = verifyJWT(token);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다.'
    });
  }

  if (decoded.role !== 'vendor') {
    return res.status(403).json({
      success: false,
      message: '벤더 권한이 필요합니다.'
    });
  }

  const vendorId = decoded.userId;
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      paymentStatus,
      orderStatus,
      search,
      limit = '50',
      offset = '0'
    } = req.query;

    // 쿼리 빌드
    let whereConditions = ['p.vendor_id = ?'];
    let queryParams = [vendorId];

    // 결제 상태 필터
    if (paymentStatus) {
      whereConditions.push('po.payment_status = ?');
      queryParams.push(paymentStatus);
    }

    // 주문 상태 필터
    if (orderStatus) {
      whereConditions.push('po.order_status = ?');
      queryParams.push(orderStatus);
    }

    // 검색 필터
    if (search) {
      whereConditions.push('(po.order_number LIKE ? OR po.customer_name LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // 총 개수 조회
    const countResult = await connection.execute(
      `SELECT COUNT(*) as total
       FROM popup_orders po
       JOIN popups p ON po.popup_id = p.id
       ${whereClause}`,
      queryParams
    );

    const total = countResult.rows && countResult.rows.length > 0
      ? countResult.rows[0].total
      : 0;

    // 주문 목록 조회
    const ordersResult = await connection.execute(
      `SELECT
        po.id,
        po.order_number,
        po.popup_id,
        po.visit_date,
        po.visit_time,
        po.visitor_count,
        po.customer_name,
        po.customer_phone,
        po.customer_email,
        po.total_amount,
        po.payment_status,
        po.payment_method,
        po.paid_at,
        po.order_status,
        po.refunded_at,
        po.refund_amount,
        po.cancel_reason,
        po.canceled_at,
        po.special_requests,
        po.created_at,
        po.updated_at,
        p.brand_name,
        p.popup_name,
        p.location_name,
        p.image_url
      FROM popup_orders po
      JOIN popups p ON po.popup_id = p.id
      ${whereClause}
      ORDER BY po.created_at DESC
      LIMIT ? OFFSET ?`,
      [...queryParams, parseInt(limit), parseInt(offset)]
    );

    const orders = ordersResult.rows || [];

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('팝업 주문 목록 조회 실패:', error);
    return res.status(500).json({
      success: false,
      message: '주문 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}

module.exports = handler;
