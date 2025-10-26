/**
 * 파트너 신청 승인/거절 API
 * PATCH /api/admin/partners/[id]/status
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
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { status, reason } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Partner ID is required' });
  }

  if (!status || !['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Valid status (approved/rejected) is required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 파트너 신청 상태 확인
    const partnerCheck = await connection.execute(
      `SELECT id, status, business_name FROM partners WHERE id = ?`,
      [id]
    );

    if (!partnerCheck || partnerCheck.length === 0) {
      return res.status(404).json({ success: false, error: '파트너를 찾을 수 없습니다.' });
    }

    const partner = partnerCheck[0];

    // 승인 처리
    if (status === 'approved') {
      await connection.execute(
        `UPDATE partners SET
          status = 'approved',
          is_verified = 1,
          approved_at = NOW(),
          updated_at = NOW()
        WHERE id = ?`,
        [id]
      );

      return res.status(200).json({
        success: true,
        message: `${partner.business_name} 파트너가 승인되었습니다.`,
        data: { id, status: 'approved' }
      });
    }

    // 거절 처리
    if (status === 'rejected') {
      await connection.execute(
        `UPDATE partners SET
          status = 'rejected',
          rejection_reason = ?,
          rejected_at = NOW(),
          updated_at = NOW()
        WHERE id = ?`,
        [reason || '관리자에 의해 거절됨', id]
      );

      return res.status(200).json({
        success: true,
        message: `${partner.business_name} 파트너가 거절되었습니다.`,
        data: { id, status: 'rejected', reason }
      });
    }

  } catch (error) {
    console.error('Error updating partner status:', error);
    return res.status(500).json({
      success: false,
      error: '파트너 상태 업데이트 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
