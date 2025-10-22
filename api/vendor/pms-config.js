const { connect } = require('@planetscale/database');
const { requireVendorAuth } = require('../../middleware/vendor-auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 벤더 인증 및 권한 확인
  const auth = await requireVendorAuth(req, res);
  if (!auth.success) return;

  const finalVendorId = auth.vendorId;

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    if (!finalVendorId) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    // GET: PMS 설정 조회
    if (req.method === 'GET') {
      console.log('📊 [PMS Config] 설정 조회:', finalVendorId);

      const result = await connection.execute(
        `SELECT id, pms_provider, pms_api_key, pms_api_secret, pms_endpoint,
                pms_sync_enabled, pms_last_sync, pms_sync_interval
         FROM rentcar_vendors
         WHERE id = ?`,
        [finalVendorId]
      );

      if (result.rows && result.rows.length > 0) {
        return res.status(200).json({
          success: true,
          data: result.rows[0]
        });
      } else {
        return res.status(404).json({ success: false, error: 'PMS config not found' });
      }
    }

    // PUT: PMS 설정 업데이트
    if (req.method === 'PUT') {
      const {
        pms_provider,
        pms_api_key,
        pms_api_secret,
        pms_endpoint,
        pms_sync_enabled,
        pms_sync_interval
      } = req.body;

      console.log('✏️ [PMS Config] 설정 업데이트:', finalVendorId);

      await connection.execute(
        `UPDATE rentcar_vendors
         SET pms_provider = ?, pms_api_key = ?, pms_api_secret = ?,
             pms_endpoint = ?, pms_sync_enabled = ?, pms_sync_interval = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [pms_provider, pms_api_key, pms_api_secret, pms_endpoint,
         pms_sync_enabled ? 1 : 0, pms_sync_interval, finalVendorId]
      );

      console.log('✅ [PMS Config] 설정 업데이트 완료');

      return res.status(200).json({
        success: true,
        message: 'PMS 설정이 업데이트되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ [PMS Config] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
