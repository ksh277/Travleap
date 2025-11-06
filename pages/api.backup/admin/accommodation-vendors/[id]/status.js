/**
 * 숙박 벤더 상태 업데이트 API
 * PUT /api/admin/accommodation-vendors/[id]/status - 벤더 상태 변경
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
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const { id } = req.query;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      error: '상태 값이 필요합니다.'
    });
  }

  // 유효한 상태 값 검증
  const validStatuses = ['pending', 'active', 'suspended', 'inactive'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `유효하지 않은 상태값입니다. (${validStatuses.join(', ')})`
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log(`📥 [PUT] 벤더 상태 변경 요청 (id: ${id}, status: ${status})`);

    // 벤더 존재 확인
    const vendorCheck = await connection.execute(
      'SELECT id, business_name FROM partners WHERE id = ? AND partner_type = "lodging"',
      [id]
    );

    if (!vendorCheck.rows || vendorCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '벤더를 찾을 수 없습니다.'
      });
    }

    // 상태 업데이트
    await connection.execute(
      'UPDATE partners SET status = ?, updated_at = NOW() WHERE id = ? AND partner_type = "lodging"',
      [status, id]
    );

    console.log('✅ 벤더 상태 변경 완료:', {
      id,
      businessName: vendorCheck.rows[0].business_name,
      newStatus: status
    });

    return res.status(200).json({
      success: true,
      message: '벤더 상태가 변경되었습니다.',
      data: { status }
    });

  } catch (error) {
    console.error('Vendor status update error:', error);
    return res.status(500).json({
      success: false,
      error: '상태 변경 중 오류가 발생했습니다.',
      message: error.message
    });
  }
};
