const { connect } = require('@planetscale/database');

/**
 * 음식 주문 조회/수정 API
 * GET /api/food/orders/[id] - 주문 조회
 * PATCH /api/food/orders/[id] - 주문 상태 업데이트
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: '주문 ID가 필요합니다.'
      });
    }

    // GET: 주문 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT
          fo.*,
          r.name as restaurant_name,
          r.phone as restaurant_phone,
          r.address as restaurant_address
         FROM food_orders fo
         INNER JOIN restaurants r ON fo.restaurant_id = r.id
         WHERE fo.id = ?`,
        [id]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '주문을 찾을 수 없습니다.'
        });
      }

      const order = result.rows[0];

      return res.status(200).json({
        success: true,
        data: {
          ...order,
          items: order.items ? JSON.parse(order.items) : []
        }
      });
    }

    // PATCH: 주문 상태 업데이트
    if (req.method === 'PATCH') {
      const { status, payment_status } = req.body;

      const updates = [];
      const values = [];

      if (status) {
        updates.push('status = ?');
        values.push(status);

        // 조리 완료 시 ready_at 설정
        if (status === 'ready') {
          updates.push('ready_at = NOW()');
        }

        // 완료 시 completed_at 설정
        if (status === 'completed') {
          updates.push('completed_at = NOW()');
        }
      }

      if (payment_status) {
        updates.push('payment_status = ?');
        values.push(payment_status);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '업데이트할 정보가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      await connection.execute(
        `UPDATE food_orders SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      console.log(`✅ [Food Order Update] 주문 ID ${id} 상태 업데이트`);

      return res.status(200).json({
        success: true,
        message: '주문 상태가 업데이트되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Food Order Detail API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
