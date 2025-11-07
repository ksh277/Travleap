/**
 * 숙박 업체 상태 변경 API
 * PUT /api/admin/accommodation-vendors/[id]/status
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { status } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Vendor ID is required' });
  }

  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required' });
  }

  // 유효한 상태 값 확인
  const validStatuses = ['pending', 'active', 'suspended'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 업체 상태 업데이트
    const result = await connection.execute(
      'UPDATE accommodation_vendors SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    console.log('Vendor status update result:', result);

    return res.status(200).json({
      success: true,
      message: '업체 상태가 변경되었습니다.',
      data: { id, status }
    });

  } catch (error) {
    console.error('Vendor status update error:', error);
    return res.status(500).json({
      success: false,
      error: '업체 상태 변경 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
