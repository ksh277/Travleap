const { connect } = require('@planetscale/database');
const { PMSSync } = require('../../../services/pms-sync');
const { requireVendorAuth } = require('../../../middleware/vendor-auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 벤더 인증 및 권한 확인
  const auth = await requireVendorAuth(req, res);
  if (!auth.success) return;

  const finalVendorId = auth.vendorId;

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('🔄 [PMS Sync Now] 수동 동기화 시작:', finalVendorId);

    // PMS 설정 가져오기
    const configResult = await connection.execute(
      `SELECT pms_provider, pms_api_key, pms_api_secret, pms_endpoint, pms_sync_enabled
       FROM rentcar_vendors
       WHERE id = ?`,
      [finalVendorId]
    );

    if (!configResult.rows || configResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vendor config not found' });
    }

    const pmsConfig = configResult.rows[0];

    // PMS 설정 확인
    if (!pmsConfig.pms_provider) {
      return res.status(400).json({
        success: false,
        error: 'PMS 제공자가 설정되지 않았습니다. PMS 설정을 먼저 완료해주세요.'
      });
    }

    // 동기화 실행
    const pmsSync = new PMSSync(finalVendorId, pmsConfig);
    const result = await pmsSync.sync();

    if (result.success) {
      console.log('✅ [PMS Sync Now] 동기화 성공:', result.stats);
      return res.status(200).json({
        success: true,
        message: '동기화가 완료되었습니다.',
        stats: result.stats
      });
    } else {
      console.error('❌ [PMS Sync Now] 동기화 실패:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error,
        stats: result.stats
      });
    }

  } catch (error) {
    console.error('❌ [PMS Sync Now] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
