/**
 * 관리자용 - 음식 주문 관리 API
 * GET /api/admin/food/orders - 전체 주문 목록 조회
 * PATCH /api/admin/food/orders?id=123 - 주문 상태 변경
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

// JWT 검증 함수
function verifyAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'travleap-secret-2025');

    if (decoded.role !== 'admin' && decoded.userType !== 'admin') {
      throw new Error('FORBIDDEN');
    }

    return decoded;
  } catch (error) {
    throw new Error('INVALID_TOKEN');
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // 관리자 권한 확인
  try {
    verifyAdmin(req);
  } catch (error) {
    return res.status(error.message === 'UNAUTHORIZED' ? 401 : 403).json({
      success: false,
      error: error.message,
      message: '관리자 권한이 필요합니다.'
    });
  }

  // GET: 전체 주문 목록 조회
  if (req.method === 'GET') {
    try {
      const {
        search,
        restaurant_id,
        status,
        payment_status,
        order_type,
        start_date,
        end_date
      } = req.query;

      let query = `
        SELECT
          fo.*,
          r.name as restaurant_name,
          r.phone as restaurant_phone,
          r.address as restaurant_address
        FROM food_orders fo
        LEFT JOIN restaurants r ON fo.restaurant_id = r.id
        WHERE 1=1
      `;

      const params = [];

      if (search) {
        query += ` AND (fo.order_number LIKE ? OR r.name LIKE ? OR fo.delivery_address LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      if (restaurant_id) {
        query += ` AND fo.restaurant_id = ?`;
        params.push(restaurant_id);
      }

      if (status) {
        query += ` AND fo.status = ?`;
        params.push(status);
      }

      if (payment_status) {
        query += ` AND fo.payment_status = ?`;
        params.push(payment_status);
      }

      if (order_type) {
        query += ` AND fo.order_type = ?`;
        params.push(order_type);
      }

      if (start_date) {
        query += ` AND fo.created_at >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        query += ` AND fo.created_at <= ?`;
        params.push(end_date);
      }

      query += ` ORDER BY fo.created_at DESC LIMIT 500`;

      const result = await connection.execute(query, params);

      // JSON 필드 파싱 및 통계 계산
      const orders = (result.rows || []).map(order => ({
        ...order,
        items: order.items ?
          (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) : []
      }));

      // 통계
      const stats = {
        total_orders: orders.length,
        total_revenue: orders.reduce((sum, order) =>
          sum + (order.status === 'completed' ? parseFloat(order.total_krw || 0) : 0), 0
        ),
        pending_orders: orders.filter(o => o.status === 'pending').length,
        preparing_orders: orders.filter(o => o.status === 'preparing').length,
        ready_orders: orders.filter(o => o.status === 'ready').length,
        completed_orders: orders.filter(o => o.status === 'completed').length,
        cancelled_orders: orders.filter(o => o.status === 'cancelled').length
      };

      return res.status(200).json({
        success: true,
        orders,
        stats
      });

    } catch (error) {
      console.error('❌ [Admin Food Orders] 목록 조회 실패:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PATCH: 주문 상태 변경
  if (req.method === 'PATCH') {
    try {
      const { id } = req.query;
      const { status, payment_status, estimated_ready_time } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'order_id가 필요합니다.'
        });
      }

      const updateFields = [];
      const params = [];

      if (status) {
        updateFields.push('status = ?');
        params.push(status);

        // 상태별 자동 타임스탬프
        if (status === 'preparing') {
          updateFields.push('prepared_at = NOW()');
        } else if (status === 'ready') {
          updateFields.push('ready_at = NOW()');
        } else if (status === 'completed') {
          updateFields.push('completed_at = NOW()');
        } else if (status === 'cancelled') {
          updateFields.push('cancelled_at = NOW()');
        }
      }

      if (payment_status) {
        updateFields.push('payment_status = ?');
        params.push(payment_status);

        if (payment_status === 'paid') {
          updateFields.push('paid_at = NOW()');
        }
      }

      if (estimated_ready_time) {
        updateFields.push('estimated_ready_time = ?');
        params.push(estimated_ready_time);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다.'
        });
      }

      updateFields.push('updated_at = NOW()');
      params.push(id);

      const query = `
        UPDATE food_orders
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      await connection.execute(query, params);

      console.log(`✅ [Admin Food Orders] 주문 상태 변경 완료: ID ${id}, status=${status}`);

      return res.status(200).json({
        success: true,
        message: '주문 상태가 변경되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Admin Food Orders] 상태 변경 실패:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};
