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

    console.log('✅ [PMS Logs] 로그 조회 완료:', result.rows.length, '개');

    return res.status(200).json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('❌ [PMS Logs] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
