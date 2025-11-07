/**
 * 파트너 상태 업데이트 API
 * PATCH /api/admin/partners/[id]/status - 파트너 상태 변경 (승인/거절)
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const { id } = req.query;
  const { status, rejection_reason } = req.body;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Partner ID is required'
    });
  }

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Valid status is required (approved, rejected, pending)'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 파트너 상태 업데이트
    await connection.execute(
      \`UPDATE partners
       SET status = ?,
           is_active = ?,
           updated_at = NOW()
       WHERE id = ?\`,
      [
        status,
        status === 'approved' ? 1 : 0,
        id
      ]
    );

    console.log(\`✅ Partner \${id} status updated to \${status}\`);

    return res.status(200).json({
      success: true,
      message: status === 'approved'
        ? '파트너 신청이 승인되었습니다.'
        : status === 'rejected'
        ? '파트너 신청이 거절되었습니다.'
        : '파트너 상태가 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('❌ Partner status update error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
