/**
 * 사용자용 - 투어 패키지 검색/목록 API
 * GET /api/tour/packages - 투어 패키지 목록 (검색, 필터링)
 * GET /api/tour/packages?id=123 - 특정 패키지 상세 조회
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  if (req.method === 'GET') {
    try {
      const {
        id,
        location,
        min_price,
        max_price,
        duration_days,
        keyword,
        sort_by = 'popular', // popular, price_low, price_high, newest
        limit = 20,
        offset = 0
      } = req.query;

      // 특정 패키지 상세 조회
      if (id) {
        const query = `
          SELECT
            tp.*,
            l.title as listing_title,
            l.location,
            l.rating_avg,
            l.rating_count,
            l.thumbnail_url as listing_thumbnail,
            COUNT(DISTINCT ts.id) as available_schedules
          FROM tour_packages tp
          LEFT JOIN listings l ON tp.listing_id = l.id
          LEFT JOIN tour_schedules ts ON tp.id = ts.package_id
            AND ts.departure_date >= CURDATE()
            AND ts.status IN ('scheduled', 'confirmed')
          WHERE tp.id = ? AND tp.is_active = 1
          GROUP BY tp.id
        `;

        const result = await connection.execute(query, [id]);

        if (!result.rows || result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '투어 패키지를 찾을 수 없습니다.'
          });
        }

        const packageData = result.rows[0];

        // JSON 필드 파싱
        const formattedPackage = {
          ...packageData,
          itinerary: packageData.itinerary ? JSON.parse(packageData.itinerary) : [],
          included: packageData.included ? JSON.parse(packageData.included) : [],
          excluded: packageData.excluded ? JSON.parse(packageData.excluded) : [],
          images: packageData.images ? JSON.parse(packageData.images) : [],
          tags: packageData.tags ? JSON.parse(packageData.tags) : []
        };

        return res.status(200).json({
          success: true,
          package: formattedPackage
        });
      }

      // 목록 조회
      let query = `
        SELECT
          tp.id,
          tp.package_code,
          tp.package_name,
          tp.description,
          tp.duration_days,
          tp.duration_nights,
          tp.price_adult_krw,
          tp.price_child_krw,
          tp.thumbnail_url,
          tp.tags,
          tp.difficulty,
          l.title as listing_title,
          l.location,
          l.rating_avg,
          l.rating_count,
          COUNT(DISTINCT ts.id) as available_schedules,
          MIN(ts.departure_date) as nearest_departure
        FROM tour_packages tp
        LEFT JOIN listings l ON tp.listing_id = l.id
        LEFT JOIN tour_schedules ts ON tp.id = ts.package_id
          AND ts.departure_date >= CURDATE()
          AND ts.status IN ('scheduled', 'confirmed')
        WHERE tp.is_active = 1
      `;

      const params = [];

      // 필터링
      if (location) {
        query += ` AND l.location LIKE ?`;
        params.push(`%${location}%`);
      }

      if (min_price) {
        query += ` AND tp.price_adult_krw >= ?`;
        params.push(parseInt(min_price));
      }

      if (max_price) {
        query += ` AND tp.price_adult_krw <= ?`;
        params.push(parseInt(max_price));
      }

      if (duration_days) {
        query += ` AND tp.duration_days = ?`;
        params.push(parseInt(duration_days));
      }

      if (keyword) {
        query += ` AND (tp.package_name LIKE ? OR tp.description LIKE ? OR l.title LIKE ?)`;
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }

      query += ` GROUP BY tp.id`;

      // 정렬
      switch (sort_by) {
        case 'price_low':
          query += ` ORDER BY tp.price_adult_krw ASC`;
          break;
        case 'price_high':
          query += ` ORDER BY tp.price_adult_krw DESC`;
          break;
        case 'newest':
          query += ` ORDER BY tp.created_at DESC`;
          break;
        case 'popular':
        default:
          query += ` ORDER BY l.rating_avg DESC, l.rating_count DESC`;
          break;
      }

      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await connection.execute(query, params);

      // JSON 필드 파싱
      const packages = (result.rows || []).map(pkg => ({
        ...pkg,
        tags: pkg.tags ? JSON.parse(pkg.tags) : [],
        has_availability: pkg.available_schedules > 0
      }));

      // 전체 개수 조회
      let countQuery = `
        SELECT COUNT(DISTINCT tp.id) as total
        FROM tour_packages tp
        LEFT JOIN listings l ON tp.listing_id = l.id
        WHERE tp.is_active = 1
      `;

      const countParams = [];

      if (location) {
        countQuery += ` AND l.location LIKE ?`;
        countParams.push(`%${location}%`);
      }

      if (min_price) {
        countQuery += ` AND tp.price_adult_krw >= ?`;
        countParams.push(parseInt(min_price));
      }

      if (max_price) {
        countQuery += ` AND tp.price_adult_krw <= ?`;
        countParams.push(parseInt(max_price));
      }

      if (duration_days) {
        countQuery += ` AND tp.duration_days = ?`;
        countParams.push(parseInt(duration_days));
      }

      if (keyword) {
        countQuery += ` AND (tp.package_name LIKE ? OR tp.description LIKE ? OR l.title LIKE ?)`;
        countParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }

      const countResult = await connection.execute(countQuery, countParams);
      const total = countResult.rows[0]?.total || 0;

      return res.status(200).json({
        success: true,
        packages,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: parseInt(offset) + packages.length < total
        }
      });

    } catch (error) {
      console.error('❌ [Tour Packages API] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};
