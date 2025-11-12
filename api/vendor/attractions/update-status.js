const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 관광지 티켓 주문 상태 변경 API
 * POST /api/vendor/attractions/update-status
 *
 * Body:
 * - order_id: 주문 ID
 * - status: 변경할 상태 (confirmed, canceled, completed)
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  // JWT 인증 확인
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - No token provided'
    });
  }

  const token = authHeader.substring(7);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid token'
    });
  }

  // 벤더 또는 관리자 권한 확인
  if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden - Vendor role required'
    });
  }

  const { order_id, status } = req.body;

  if (!order_id || !status) {
    return res.status(400).json({
      success: false,
      error: 'order_id와 status는 필수입니다.'
    });
  }

  const validStatuses = ['pending', 'confirmed', 'canceled', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `유효하지 않은 상태입니다. 가능한 값: ${validStatuses.join(', ')}`
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 벤더의 vendor_id 조회
    let vendor_id;
    if (decoded.role === 'admin') {
      vendor_id = null;
    } else {
      const vendorResult = await connection.execute(
        'SELECT id FROM partners WHERE user_id = ? AND partner_type = ? LIMIT 1',
        [decoded.userId, 'attractions']
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '등록된 관광지 벤더 정보가 없습니다.'
        });
      }

      vendor_id = vendorResult.rows[0].id;
    }

    // 주문 정보 확인 (벤더 소유 확인)
    let orderCheck;
    if (vendor_id) {
      orderCheck = await connection.execute(
        `SELECT ato.id, ato.status, a.vendor_id
         FROM attraction_ticket_orders ato
         INNER JOIN attractions a ON ato.attraction_id = a.id
         WHERE ato.id = ? AND a.vendor_id = ?`,
        [order_id, vendor_id]
      );
    } else {
      orderCheck = await connection.execute(
        'SELECT id, status FROM attraction_ticket_orders WHERE id = ?',
        [order_id]
      );
    }

    if (!orderCheck.rows || orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '주문을 찾을 수 없거나 권한이 없습니다.'
      });
    }

    // 상태 변경
    const updateResult = await connection.execute(
      'UPDATE attraction_ticket_orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, order_id]
    );

    if (updateResult.rowsAffected === 0) {
      return res.status(500).json({
        success: false,
        error: '상태 변경에 실패했습니다.'
      });
    }

    return res.status(200).json({
      success: true,
      message: '티켓 주문 상태가 변경되었습니다.',
      data: {
        order_id,
        old_status: orderCheck.rows[0].status,
        new_status: status
      }
    });

  } catch (error) {
    console.error('❌ [Attractions Update Status API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
