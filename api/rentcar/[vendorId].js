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
    const { vendorId } = req.query;
    const connection = connect({ url: process.env.DATABASE_URL });

    // 벤더 정보 조회
    const vendorResult = await connection.execute(`
      SELECT * FROM rentcar_vendors
      WHERE id = ? AND status = 'active'
      LIMIT 1
    `, [vendorId]);

    if (!vendorResult || vendorResult.length === 0) {
      return res.status(404).json({ success: false, error: '렌트카 업체를 찾을 수 없습니다.' });
    }

    const vendor = vendorResult[0];

    // 차량 목록 조회
    const vehiclesResult = await connection.execute(`
      SELECT * FROM rentcar_vehicles
      WHERE vendor_id = ? AND is_active = 1
      ORDER BY daily_rate_krw ASC
    `, [vendorId]);

    const vehicles = (vehiclesResult || []).map(vehicle => {
      // PlanetScale는 JSON 컬럼을 자동으로 파싱하므로 타입 체크 필요
      const images = vehicle.images
        ? (typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images)
        : [];
      const features = vehicle.features
        ? (typeof vehicle.features === 'string' ? JSON.parse(vehicle.features) : vehicle.features)
        : [];

      return {
        ...vehicle,
        images: Array.isArray(images) ? images : [],
        features: Array.isArray(features) ? features : []
      };
    });

    // vendor images 파싱 (차량과 동일한 방식) - 에러 핸들링 추가
    let vendorImages = [];
    try {
      if (vendor.images) {
        vendorImages = typeof vendor.images === 'string' ? JSON.parse(vendor.images) : vendor.images;
      }
    } catch (e) {
      console.error('Failed to parse vendor images for vendor', vendor.id, ':', e);
      vendorImages = [];
    }

    return res.status(200).json({
      success: true,
      data: {
        vendor: {
          ...vendor,
          images: Array.isArray(vendorImages) ? vendorImages : []
        },
        vehicles
      }
    });
  } catch (error) {
    console.error('Error fetching rentcar details:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
