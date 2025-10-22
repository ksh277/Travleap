const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });
    const { vendorId, userId } = req.query;

    if (!vendorId && !userId) {
      return res.status(400).json({ success: false, error: 'vendorId or userId required' });
    }

    // userId로 vendorId 찾기
    let finalVendorId = vendorId;
    if (!finalVendorId && userId) {
      const vendorResult = await connection.execute(
        'SELECT id FROM rentcar_vendors WHERE contact_email = (SELECT email FROM users WHERE id = ?)',
        [userId]
      );
      if (vendorResult.rows && vendorResult.rows.length > 0) {
        finalVendorId = vendorResult.rows[0].id;
      }
    }

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
