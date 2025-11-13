const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'GET 메서드만 지원합니다.' });

  try {
    const { vendorId } = req.query;
    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'vendor_id가 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    const result = await connection.execute(
      `SELECT id, vendor_id, vehicle_code, brand, model, display_name, category, passengers,
              hourly_rate_krw, daily_rate_krw, stock,
              fuel_type, transmission, image_url, is_active, created_at
       FROM rentcar_vehicles WHERE vendor_id = ? ORDER BY created_at DESC`,
      [vendorId]
    );

    return res.status(200).json({ success: true, data: result.rows || [] });
  } catch (error) {
    console.error('❌ [Vendor Vehicles API] 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.', error: error.message });
  }
};
