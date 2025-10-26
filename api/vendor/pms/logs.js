const { connect } = require('@planetscale/database');
const { requireVendorAuth } = require('../../../middleware/vendor-auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 벤더 인증 및 권한 확인
  const auth = await requireVendorAuth(req, res);
  if (!auth.success) return;

  const finalVendorId = auth.vendorId;

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📜 [PMS Logs] 동기화 로그 조회:', finalVendorId);

    // 최근 20개의 동기화 로그 조회
    const result = await connection.execute(
      `SELECT
        id,
        vendor_id,
        sync_status,
        vehicles_added,
        vehicles_updated,
        vehicles_deleted,
        error_message,
        sync_started_at,
        sync_completed_at,
        created_at
       FROM pms_sync_logs
       WHERE vendor_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [finalVendorId]
    );

    console.log('✅ [PMS Logs] 로그 조회 완료:', result.length, '개');

    return res.status(200).json({
      success: true,
      data: result || []
    });
  } catch (error) {
    console.error('❌ [PMS Logs] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
