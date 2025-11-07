const { connect } = require('@planetscale/database');

const connection = connect({ url: process.env.DATABASE_URL });

/**
 * 차량 추가 옵션(Extras) 조회 API
 * GET /api/rentcar/vehicles/{id}/extras
 */
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

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Vehicle ID is required'
    });
  }

  try {
    console.log(`🎁 [Vehicle Extras API] 차량 ID: ${id}`);

    // 해당 차량의 업체 ID 조회
    const vehicleResult = await connection.execute(
      'SELECT vendor_id FROM rentcar_vehicles WHERE id = ?',
      [id]
    );

    if (!vehicleResult.rows || vehicleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '차량을 찾을 수 없습니다'
      });
    }

    const vendorId = vehicleResult.rows[0].vendor_id;

    // 해당 업체의 추가 옵션 조회
    const extrasResult = await connection.execute(
      `SELECT
        id,
        vendor_id,
        name,
        description,
        category,
        price_krw,
        price_type,
        has_inventory,
        current_stock,
        max_quantity,
        display_order,
        is_active
      FROM rentcar_extras
      WHERE vendor_id = ? AND is_active = 1
      ORDER BY display_order ASC, name ASC`,
      [vendorId]
    );

    const extras = (extrasResult.rows || []).map(extra => ({
      ...extra,
      is_active: extra.is_active === 1,
      has_inventory: extra.has_inventory === 1
    }));

    console.log(`✅ [Vehicle Extras API] ${extras.length}개 옵션 조회 완료`);

    return res.status(200).json({
      success: true,
      data: {
        vehicleId: parseInt(id),
        vendorId: vendorId,
        extras: extras
      }
    });

  } catch (error) {
    console.error('❌ [Vehicle Extras API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다',
      message: error.message
    });
  }
};
