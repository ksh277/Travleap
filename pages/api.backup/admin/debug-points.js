/**
 * 포인트 회수 디버깅 API
 * GET /api/admin/debug-points?payment_id=123
 *
 * 특정 payment_id로 적립된 포인트를 조회하고 회수 가능 여부를 확인합니다.
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { payment_id, user_id } = req.query;

    if (!payment_id && !user_id) {
      return res.status(400).json({
        error: 'payment_id 또는 user_id 파라미터가 필요합니다'
      });
    }

    const response = {
      timestamp: new Date().toISOString(),
      query: { payment_id, user_id },
      results: {}
    };

    // 1. payment_id로 payment 정보 조회
    if (payment_id) {
      const paymentResult = await connection.execute(`
        SELECT id, user_id, amount, payment_status, gateway_transaction_id, order_number, created_at
        FROM payments
        WHERE id = ?
      `, [payment_id]);

      response.results.payment = paymentResult.rows?.[0] || null;

      if (response.results.payment) {
        const actualUserId = response.results.payment.user_id;
        const relatedOrderId = String(payment_id);

        console.log(`🔍 [Debug] payment_id=${payment_id}, user_id=${actualUserId}, related_order_id=${relatedOrderId}`);

        // 2. 정확한 매칭으로 적립 포인트 조회
        const exactMatchResult = await connection.execute(`
          SELECT id, points, point_type, reason, related_order_id, balance_after, created_at
          FROM user_points
          WHERE user_id = ? AND related_order_id = ? AND point_type = 'earn' AND points > 0
          ORDER BY created_at DESC
        `, [actualUserId, relatedOrderId]);

        response.results.exact_match = {
          query: {
            user_id: actualUserId,
            related_order_id: relatedOrderId,
            related_order_id_type: typeof relatedOrderId
          },
          count: exactMatchResult.rows?.length || 0,
          records: exactMatchResult.rows || []
        };

        // 3. LIKE 검색으로 적립 포인트 조회
        const likeMatchResult = await connection.execute(`
          SELECT id, points, point_type, reason, related_order_id, balance_after, created_at
          FROM user_points
          WHERE user_id = ? AND related_order_id LIKE ? AND point_type = 'earn' AND points > 0
          ORDER BY created_at DESC
          LIMIT 10
        `, [actualUserId, `%${payment_id}%`]);

        response.results.like_match = {
          query: {
            user_id: actualUserId,
            pattern: `%${payment_id}%`
          },
          count: likeMatchResult.rows?.length || 0,
          records: likeMatchResult.rows || []
        };

        // 4. 해당 사용자의 최근 적립 내역 (디버깅용)
        const recentEarnResult = await connection.execute(`
          SELECT id, points, point_type, reason, related_order_id, balance_after, created_at
          FROM user_points
          WHERE user_id = ? AND point_type = 'earn' AND points > 0
          ORDER BY created_at DESC
          LIMIT 10
        `, [actualUserId]);

        response.results.recent_earn_history = {
          count: recentEarnResult.rows?.length || 0,
          records: recentEarnResult.rows || []
        };

        // 5. 회수 내역 조회
        const refundHistoryResult = await connection.execute(`
          SELECT id, points, point_type, reason, related_order_id, balance_after, created_at
          FROM user_points
          WHERE user_id = ? AND point_type = 'refund' AND points < 0
          ORDER BY created_at DESC
          LIMIT 10
        `, [actualUserId]);

        response.results.refund_history = {
          count: refundHistoryResult.rows?.length || 0,
          records: refundHistoryResult.rows || []
        };

        // 6. 진단
        response.diagnosis = {
          payment_found: true,
          user_id: actualUserId,
          exact_match_found: response.results.exact_match.count > 0,
          like_match_found: response.results.like_match.count > 0,
          total_earned_points: response.results.exact_match.records.reduce((sum, r) => sum + (r.points || 0), 0),
          problem: null,
          solution: null
        };

        if (response.results.exact_match.count === 0 && response.results.like_match.count === 0) {
          response.diagnosis.problem = '해당 payment_id로 적립된 포인트가 없습니다';
          response.diagnosis.solution = 'confirm.js에서 포인트 적립이 실패했거나, 이미 회수되었을 수 있습니다';
        } else if (response.results.exact_match.count === 0 && response.results.like_match.count > 0) {
          response.diagnosis.problem = 'LIKE 검색으로는 찾아지지만 정확한 매칭으로는 찾을 수 없습니다';
          response.diagnosis.solution = 'related_order_id의 데이터 타입이나 형식이 다를 수 있습니다';
          response.diagnosis.stored_values = response.results.like_match.records.map(r => ({
            related_order_id: r.related_order_id,
            type: typeof r.related_order_id
          }));
        } else {
          response.diagnosis.problem = null;
          response.diagnosis.solution = '포인트가 정상적으로 적립되어 있으며 회수 가능합니다';
        }
      } else {
        response.diagnosis = {
          payment_found: false,
          problem: `payment_id=${payment_id}를 찾을 수 없습니다`
        };
      }
    }

    // 7. user_id로만 조회하는 경우
    if (user_id && !payment_id) {
      const allEarnResult = await connection.execute(`
        SELECT id, points, point_type, reason, related_order_id, balance_after, created_at
        FROM user_points
        WHERE user_id = ? AND point_type = 'earn' AND points > 0
        ORDER BY created_at DESC
        LIMIT 20
      `, [user_id]);

      response.results.all_earned_points = {
        count: allEarnResult.rows?.length || 0,
        records: allEarnResult.rows || []
      };
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ [Debug Points] 에러:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
};
