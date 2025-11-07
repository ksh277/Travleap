const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      const { vendor_id } = req.query;

      let sql = `
        SELECT
          v.*,
          ve.vendor_code, ve.business_name, ve.brand_name as vendor_brand_name
        FROM rentcar_vehicles v
        INNER JOIN rentcar_vendors ve ON v.vendor_id = ve.id
        WHERE 1=1
      `;
      const params = [];

      if (vendor_id) {
        sql += ` AND v.vendor_id = ?`;
        params.push(vendor_id);
      }

      sql += ` ORDER BY v.is_featured DESC, v.created_at DESC`;

      const vehicles = await connection.execute(sql, params);

      const formatted = (vehicles.rows || []).map((row) => ({
        ...row,
        vendor: {
          id: row.vendor_id,
          vendor_code: row.vendor_code,
          business_name: row.business_name,
          brand_name: row.vendor_brand_name
        }
      }));

      return res.status(200).json({
        success: true,
        data: formatted
      });
    }

    if (req.method === 'POST') {
      const {
        vendor_id,
        vehicle_code,
        display_name,
        daily_rate_krw,
        hourly_rate_krw,
        // 선택적 필드들
        brand,
        model,
        year,
        vehicle_class,
        fuel_type,
        transmission,
        seating_capacity,
        thumbnail_url,
        images
      } = req.body;

      // 필수 필드 검증
      if (!vendor_id || !display_name || !daily_rate_krw) {
        return res.status(400).json({
          success: false,
          error: '필수 필드: vendor_id, display_name, daily_rate_krw'
        });
      }

      // hourly_rate_krw가 없으면 자동 계산 (daily_rate / 24)
      const hourlyRate = hourly_rate_krw || Math.ceil(daily_rate_krw / 24);

      const result = await connection.execute(`
        INSERT INTO rentcar_vehicles (
          vendor_id, vehicle_code, display_name, daily_rate_krw, hourly_rate_krw,
          brand, model, year, vehicle_class, fuel_type, transmission,
          seating_capacity, thumbnail_url, images
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vendor_id,
        vehicle_code || `V${Date.now()}`,
        display_name,
        daily_rate_krw,
        hourlyRate,
        brand || null,
        model || null,
        year || null,
        vehicle_class || null,
        fuel_type || null,
        transmission || null,
        seating_capacity || null,
        thumbnail_url || null,
        JSON.stringify(images || [])
      ]);

      return res.status(200).json({
        success: true,
        data: { id: result.insertId },
        message: '차량이 등록되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('Vehicles API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
