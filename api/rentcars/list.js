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
    const { vehicle_class, fuel_type, transmission, page = '1', limit = '12', sortBy = 'popular' } = req.query;
    const connection = connect({ url: process.env.DATABASE_URL });

    // 렌트카 업체별로 그룹핑된 리스트
    let sql = `
      SELECT
        v.id,
        v.vendor_code,
        v.business_name,
        v.brand_name,
        v.description,
        v.logo_url,
        v.status,
        v.is_verified,
        v.total_vehicles,
        v.total_bookings,
        v.average_rating,
        (SELECT MIN(daily_rate_krw)
         FROM rentcar_vehicles rv
         WHERE rv.vendor_id = v.id AND rv.is_active = 1) as min_price,
        (SELECT COUNT(*)
         FROM rentcar_vehicles rv
         WHERE rv.vendor_id = v.id AND rv.is_active = 1) as active_vehicle_count
      FROM rentcar_vendors v
      WHERE v.status = 'active'
    `;

    // 정렬
    if (sortBy === 'popular' || sortBy === 'recommended') {
      sql += ` ORDER BY v.total_bookings DESC, v.average_rating DESC`;
    } else if (sortBy === 'latest') {
      sql += ` ORDER BY v.created_at DESC`;
    } else if (sortBy === 'price_low') {
      sql += ` ORDER BY min_price ASC`;
    } else if (sortBy === 'price_high') {
      sql += ` ORDER BY min_price DESC`;
    } else if (sortBy === 'rating') {
      sql += ` ORDER BY v.average_rating DESC`;
    } else {
      sql += ` ORDER BY v.created_at DESC`;
    }

    // 페이지네이션
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    sql += ` LIMIT ${limitNum} OFFSET ${offset}`;

    const result = await connection.execute(sql);

    const vendors = (result.rows || []).map(vendor => ({
      id: vendor.id,
      vendor_code: vendor.vendor_code,
      business_name: vendor.business_name,
      brand_name: vendor.brand_name,
      description: vendor.description || '',
      logo_url: vendor.logo_url,
      status: vendor.status,
      is_verified: vendor.is_verified || false,
      total_vehicles: vendor.total_vehicles || 0,
      active_vehicle_count: vendor.active_vehicle_count || 0,
      total_bookings: vendor.total_bookings || 0,
      average_rating: parseFloat(vendor.average_rating) || 0,
      min_price: vendor.min_price || 0
    }));

    // 총 개수 조회
    const countResult = await connection.execute(`
      SELECT COUNT(*) as total
      FROM rentcar_vendors
      WHERE status = 'active'
    `);
    const total = countResult.rows?.[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: vendors,
      total: parseInt(total),
      page: pageNum,
      limit: limitNum,
      hasMore: offset + vendors.length < total
    });
  } catch (error) {
    console.error('Error fetching rentcar list:', error);
    return res.status(200).json({
      success: true,
      data: [],
      total: 0,
      page: 1,
      limit: 12
    });
  }
};
