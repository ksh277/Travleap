/**
 * 벤더 - 음식 주문 관리 API
 * GET /api/vendor/food/orders - 내 식당 주문 목록 조회
 * PUT /api/vendor/food/orders - 주문 상태 변경
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  const { vendor_id } = req.query;

  if (!vendor_id) {
    return res.status(401).json({
      success: false,
      error: '벤더 인증이 필요합니다.'
    });
  }

  // GET: 내 식당 주문 목록 조회
  if (req.method === 'GET') {
    try {
      const {
        order_id,
        restaurant_id,
        status,
        order_type,
        from_date,
        to_date
      } = req.query;

      let query = `
        SELECT
          fo.*,
          r.name as restaurant_name,
          r.phone as restaurant_phone
        FROM food_orders fo
        LEFT JOIN restaurants r ON fo.restaurant_id = r.id
        WHERE r.vendor_id = ?
      `;

      const params = [vendor_id];

      if (order_id) {
        query += ` AND fo.id = ?`;
        params.push(order_id);
      }

      if (restaurant_id) {
        query += ` AND fo.restaurant_id = ?`;
        params.push(restaurant_id);
      }

      if (status) {
        query += ` AND fo.status = ?`;
        params.push(status);
      }

      if (order_type) {
        query += ` AND fo.order_type = ?`;
        params.push(order_type);
      }

      if (from_date) {
        query += ` AND fo.created_at >= ?`;
        params.push(from_date);
      }

      if (to_date) {
        query += ` AND fo.created_at <= ?`;
        params.push(to_date);
      }

      query += ` ORDER BY fo.created_at DESC`;

      const result = await connection.execute(query, params);

      // JSON 필드 파싱
      const orders = (result.rows || []).map(order => ({
        ...order,
        items: order.items ? (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) : []
      }));

      return res.status(200).json({
        success: true,
        orders
      });

    } catch (error) {
      console.error('❌ [Vendor Food Orders GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 주문 상태 변경
  if (req.method === 'PUT') {
    try {
      const { order_id, status, estimated_ready_time } = req.body;

      if (!order_id || !status) {
        return res.status(400).json({
          success: false,
          error: 'order_id와 status가 필요합니다.'
        });
      }

      // 유효한 상태 값 체크
      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'canceled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 상태입니다.'
        });
      }

      // 주문이 벤더 소유의 식당 주문인지 확인
      const orderCheck = await connection.execute(`
        SELECT fo.id, fo.status as current_status
        FROM food_orders fo
        LEFT JOIN restaurants r ON fo.restaurant_id = r.id
        WHERE fo.id = ? AND r.vendor_id = ?
      `, [order_id, vendor_id]);

      if (!orderCheck.rows || orderCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 식당 주문만 관리할 수 있습니다.'
        });
      }

      // 상태 업데이트
      let updateQuery = 'UPDATE food_orders SET status = ?, updated_at = NOW()';
      const values = [status];

      if (estimated_ready_time) {
        updateQuery += ', estimated_ready_time = ?';
        values.push(estimated_ready_time);
      }

      // 상태별 특수 처리
      if (status === 'ready') {
        updateQuery += ', ready_at = NOW()';
      } else if (status === 'completed') {
        updateQuery += ', completed_at = NOW()';
      }

      updateQuery += ' WHERE id = ?';
      values.push(order_id);

      await connection.execute(updateQuery, values);

      console.log(`✅ [Vendor Food Order] 상태 변경: order_id=${order_id}, status=${status} by vendor ${vendor_id}`);

      return res.status(200).json({
        success: true,
        message: '주문 상태가 변경되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Food Orders PUT] Error:', error);
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
