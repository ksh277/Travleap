/**
 * 벤더 - 투어 패키지 관리 API
 * GET /api/vendor/tour/packages - 내 투어 패키지 목록 조회
 * POST /api/vendor/tour/packages - 새 투어 패키지 생성
 * PUT /api/vendor/tour/packages - 투어 패키지 수정
 */

const { connect } = require('@planetscale/database');

function generatePackageCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TOUR-${timestamp}-${random}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // 벤더 인증 (실제로는 JWT 토큰 등으로 검증해야 함)
  const { vendor_id } = req.query;

  if (!vendor_id) {
    return res.status(401).json({
      success: false,
      error: '벤더 인증이 필요합니다.'
    });
  }

  // GET: 내 투어 패키지 목록 조회
  if (req.method === 'GET') {
    try {
      const { package_id, is_active } = req.query;

      let query = `
        SELECT
          tp.*,
          l.title as listing_title,
          l.location,
          l.rating_avg,
          l.rating_count,
          COUNT(DISTINCT ts.id) as schedule_count,
          SUM(ts.current_participants) as total_bookings
        FROM tour_packages tp
        LEFT JOIN listings l ON tp.listing_id = l.id
        LEFT JOIN tour_schedules ts ON tp.id = ts.package_id
        WHERE tp.vendor_id = ?
      `;

      const params = [vendor_id];

      if (package_id) {
        query += ` AND tp.id = ?`;
        params.push(package_id);
      }

      if (is_active !== undefined) {
        query += ` AND tp.is_active = ?`;
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += `
        GROUP BY tp.id
        ORDER BY tp.display_order DESC, tp.created_at DESC
      `;

      const result = await connection.execute(query, params);

      // JSON 필드 파싱
      const packages = (result.rows || []).map(pkg => ({
        ...pkg,
        itinerary: pkg.itinerary ? JSON.parse(pkg.itinerary) : [],
        included: pkg.included ? JSON.parse(pkg.included) : [],
        excluded: pkg.excluded ? JSON.parse(pkg.excluded) : [],
        images: pkg.images ? JSON.parse(pkg.images) : [],
        tags: pkg.tags ? JSON.parse(pkg.tags) : []
      }));

      return res.status(200).json({
        success: true,
        packages
      });

    } catch (error) {
      console.error('❌ [Vendor Tour Packages GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST: 새 투어 패키지 생성
  if (req.method === 'POST') {
    try {
      const {
        listing_id,
        package_name,
        description,
        duration_days,
        duration_nights,
        itinerary,
        included,
        excluded,
        meeting_point,
        meeting_time,
        departure_location,
        min_participants,
        max_participants,
        price_adult_krw,
        price_child_krw,
        price_infant_krw,
        thumbnail_url,
        images,
        difficulty,
        tags
      } = req.body;

      // 필수 필드 검증
      if (!listing_id || !package_name || !duration_days || !price_adult_krw) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        });
      }

      // 리스팅이 벤더 소유인지 확인
      const listingCheck = await connection.execute(`
        SELECT id FROM listings
        WHERE id = ? AND vendor_id = ? AND category = 'tour'
      `, [listing_id, vendor_id]);

      if (!listingCheck.rows || listingCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 투어 리스팅에만 패키지를 추가할 수 있습니다.'
        });
      }

      const package_code = generatePackageCode();

      const result = await connection.execute(`
        INSERT INTO tour_packages (
          listing_id,
          vendor_id,
          package_code,
          package_name,
          description,
          duration_days,
          duration_nights,
          itinerary,
          included,
          excluded,
          meeting_point,
          meeting_time,
          departure_location,
          min_participants,
          max_participants,
          price_adult_krw,
          price_child_krw,
          price_infant_krw,
          thumbnail_url,
          images,
          difficulty,
          tags,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        listing_id,
        vendor_id,
        package_code,
        package_name,
        description || null,
        duration_days,
        duration_nights || 0,
        JSON.stringify(itinerary || []),
        JSON.stringify(included || []),
        JSON.stringify(excluded || []),
        meeting_point || null,
        meeting_time || null,
        departure_location || null,
        min_participants || 10,
        max_participants || 30,
        price_adult_krw,
        price_child_krw || null,
        price_infant_krw || null,
        thumbnail_url || null,
        JSON.stringify(images || []),
        difficulty || 'easy',
        JSON.stringify(tags || [])
      ]);

      console.log(`✅ [Vendor Tour Package] 생성 완료: ${package_name} (${package_code}) by vendor ${vendor_id}`);

      return res.status(201).json({
        success: true,
        package_id: result.insertId,
        package_code
      });

    } catch (error) {
      console.error('❌ [Vendor Tour Packages POST] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 투어 패키지 수정
  if (req.method === 'PUT') {
    try {
      const {
        package_id,
        package_name,
        description,
        duration_days,
        duration_nights,
        itinerary,
        included,
        excluded,
        meeting_point,
        meeting_time,
        departure_location,
        min_participants,
        max_participants,
        price_adult_krw,
        price_child_krw,
        price_infant_krw,
        thumbnail_url,
        images,
        difficulty,
        tags
      } = req.body;

      if (!package_id) {
        return res.status(400).json({
          success: false,
          error: 'package_id가 필요합니다.'
        });
      }

      // 패키지가 벤더 소유인지 확인
      const packageCheck = await connection.execute(`
        SELECT id FROM tour_packages
        WHERE id = ? AND vendor_id = ?
      `, [package_id, vendor_id]);

      if (!packageCheck.rows || packageCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 투어 패키지만 수정할 수 있습니다.'
        });
      }

      // 업데이트할 필드만 동적으로 구성
      const updates = [];
      const values = [];

      if (package_name !== undefined) {
        updates.push('package_name = ?');
        values.push(package_name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (duration_days !== undefined) {
        updates.push('duration_days = ?');
        values.push(duration_days);
      }
      if (duration_nights !== undefined) {
        updates.push('duration_nights = ?');
        values.push(duration_nights);
      }
      if (itinerary !== undefined) {
        updates.push('itinerary = ?');
        values.push(JSON.stringify(itinerary));
      }
      if (included !== undefined) {
        updates.push('included = ?');
        values.push(JSON.stringify(included));
      }
      if (excluded !== undefined) {
        updates.push('excluded = ?');
        values.push(JSON.stringify(excluded));
      }
      if (meeting_point !== undefined) {
        updates.push('meeting_point = ?');
        values.push(meeting_point);
      }
      if (meeting_time !== undefined) {
        updates.push('meeting_time = ?');
        values.push(meeting_time);
      }
      if (departure_location !== undefined) {
        updates.push('departure_location = ?');
        values.push(departure_location);
      }
      if (min_participants !== undefined) {
        updates.push('min_participants = ?');
        values.push(min_participants);
      }
      if (max_participants !== undefined) {
        updates.push('max_participants = ?');
        values.push(max_participants);
      }
      if (price_adult_krw !== undefined) {
        updates.push('price_adult_krw = ?');
        values.push(price_adult_krw);
      }
      if (price_child_krw !== undefined) {
        updates.push('price_child_krw = ?');
        values.push(price_child_krw);
      }
      if (price_infant_krw !== undefined) {
        updates.push('price_infant_krw = ?');
        values.push(price_infant_krw);
      }
      if (thumbnail_url !== undefined) {
        updates.push('thumbnail_url = ?');
        values.push(thumbnail_url);
      }
      if (images !== undefined) {
        updates.push('images = ?');
        values.push(JSON.stringify(images));
      }
      if (difficulty !== undefined) {
        updates.push('difficulty = ?');
        values.push(difficulty);
      }
      if (tags !== undefined) {
        updates.push('tags = ?');
        values.push(JSON.stringify(tags));
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(package_id);

      const query = `UPDATE tour_packages SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(query, values);

      console.log(`✅ [Vendor Tour Package] 수정 완료: package_id=${package_id} by vendor ${vendor_id}`);

      return res.status(200).json({
        success: true,
        message: '투어 패키지가 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Tour Packages PUT] Error:', error);
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
