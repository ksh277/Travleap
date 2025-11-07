/**
 * 파트너 신청 관리 API
 * GET /api/admin/partners/applications - 파트너 신청 목록 조회
 * POST /api/admin/partners/applications - 신청 승인/거절 처리
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      // 신청 대기 중인 파트너 목록 조회
      const result = await connection.execute(`
        SELECT
          p.*,
          (SELECT COUNT(DISTINCT l.id) FROM listings l WHERE l.partner_id = p.id) as listing_count
        FROM partners p
        WHERE p.status = 'pending'
        ORDER BY p.created_at DESC
      `);

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      // 신청 승인/거절 처리
      const { partner_id, status, rejection_reason } = req.body;

      if (!partner_id || !status) {
        return res.status(400).json({
          success: false,
          error: 'partner_id and status are required'
        });
      }

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'status must be either approved or rejected'
        });
      }

      // 파트너 상태 업데이트
      await connection.execute(
        `UPDATE partners
         SET status = ?,
             is_active = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [status, status === 'approved' ? 1 : 0, partner_id]
      );

      return res.status(200).json({
        success: true,
        message: status === 'approved'
          ? '파트너 신청이 승인되었습니다.'
          : '파트너 신청이 거절되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ Partner Applications API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
