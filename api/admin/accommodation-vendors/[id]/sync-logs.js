/**
 * 숙박 업체 PMS 동기화 로그 조회 API
 * GET /api/admin/accommodation-vendors/[id]/sync-logs - 동기화 이력 조회
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id: vendorId } = req.query;
  const { limit = 20 } = req.query;

  if (!vendorId) {
    return res.status(400).json({ success: false, error: 'Vendor ID is required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const result = await connection.execute(
      `SELECT * FROM accommodation_sync_logs
       WHERE vendor_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [vendorId, parseInt(limit)]
    );

    return res.status(200).json({
      success: true,
      data: result || []
    });

  } catch (error) {
    console.error('Sync logs API error:', error);

    // 테이블이 없는 경우 빈 배열 반환
    if (error.message && error.message.includes("doesn't exist")) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
