const { connect } = require('@planetscale/database');

/**
 * 관리자 투어 패키지 관리 API
 * GET /api/admin/tour/packages - 패키지 목록 조회
 * POST /api/admin/tour/packages - 패키지 생성
 * PUT /api/admin/tour/packages - 패키지 수정
 * DELETE /api/admin/tour/packages - 패키지 삭제
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET: 패키지 목록 조회
    if (req.method === 'GET') {
      const { vendor_id, is_active, limit = 50, offset = 0 } = req.query;

      const conditions = [];
      const params = [];

      if (vendor_id) {
        conditions.push('tp.vendor_id = ?');
        params.push(vendor_id);
      }

      if (is_active !== undefined) {
        conditions.push('tp.is_active = ?');
        params.push(is_active === 'true' ? 1 : 0);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await connection.execute(
        `SELECT
          tp.*,
          l.title as listing_title,
          l.category,
          COUNT(ts.id) as schedule_count
         FROM tour_packages tp
         LEFT JOIN listings l ON tp.listing_id = l.id
         LEFT JOIN tour_schedules ts ON tp.id = ts.package_id
         ${whereClause}
         GROUP BY tp.id
         ORDER BY tp.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), parseInt(offset)]
      );

      const packages = result.rows.map(pkg => ({
        ...pkg,
        itinerary: pkg.itinerary ? JSON.parse(pkg.itinerary) : [],
        included: pkg.included ? JSON.parse(pkg.included) : [],
        excluded: pkg.excluded ? JSON.parse(pkg.excluded) : [],
        images: pkg.images ? JSON.parse(pkg.images) : [],
        tags: pkg.tags ? JSON.parse(pkg.tags) : []
      }));

      return res.status(200).json({
        success: true,
        data: packages
      });
    }

    // POST: 패키지 생성
    if (req.method === 'POST') {
      const {
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
        tags
      } = req.body;

      // 필수 필드 확인
      if (!listing_id || !vendor_id || !package_code || !package_name || !duration_days || !price_adult_krw) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        });
      }

      const result = await connection.execute(
        `INSERT INTO tour_packages (
          listing_id, vendor_id, package_code, package_name, description,
          duration_days, duration_nights, itinerary, included, excluded,
          meeting_point, meeting_time, departure_location,
          min_participants, max_participants,
          price_adult_krw, price_child_krw, price_infant_krw,
          thumbnail_url, images, difficulty, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          listing_id, vendor_id, package_code, package_name, description,
          duration_days, duration_nights,
          JSON.stringify(itinerary || []),
          JSON.stringify(included || []),
          JSON.stringify(excluded || []),
          meeting_point, meeting_time, departure_location,
          min_participants || 10, max_participants || 30,
          price_adult_krw, price_child_krw, price_infant_krw,
          thumbnail_url, JSON.stringify(images || []),
          difficulty || 'easy',
          JSON.stringify(tags || [])
        ]
      );

      console.log(`✅ [Admin] 투어 패키지 생성 완료: ${package_code}`);

      return res.status(201).json({
        success: true,
        message: '패키지가 생성되었습니다.',
        data: { id: result.insertId }
      });
    }

    // PUT: 패키지 수정
    if (req.method === 'PUT') {
      const { id, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '패키지 ID가 필요합니다.'
        });
      }

      const updates = [];
      const values = [];

      // 동적으로 업데이트할 필드 생성
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          // JSON 필드는 stringify
          if (['itinerary', 'included', 'excluded', 'images', 'tags'].includes(key)) {
            updates.push(`${key} = ?`);
            values.push(JSON.stringify(updateData[key]));
          } else {
            updates.push(`${key} = ?`);
            values.push(updateData[key]);
          }
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '업데이트할 정보가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      await connection.execute(
        `UPDATE tour_packages SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      console.log(`✅ [Admin] 투어 패키지 수정 완료: ID ${id}`);

      return res.status(200).json({
        success: true,
        message: '패키지가 수정되었습니다.'
      });
    }

    // DELETE: 패키지 삭제 (soft delete)
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '패키지 ID가 필요합니다.'
        });
      }

      await connection.execute(
        'UPDATE tour_packages SET is_active = 0, updated_at = NOW() WHERE id = ?',
        [id]
      );

      console.log(`✅ [Admin] 투어 패키지 비활성화: ID ${id}`);

      return res.status(200).json({
        success: true,
        message: '패키지가 비활성화되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Admin Tour Packages API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
