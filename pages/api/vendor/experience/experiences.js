/**
 * 벤더 - 체험 관리 API
 * GET /api/vendor/experience/experiences - 내 체험 목록 조회
 * POST /api/vendor/experience/experiences - 새 체험 등록
 * PUT /api/vendor/experience/experiences - 체험 정보 수정
 */

const { connect } = require('@planetscale/database');

function generateExperienceCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `EXP-${timestamp}-${random}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  const { vendor_id } = req.query;

  if (!vendor_id) {
    return res.status(401).json({
      success: false,
      error: '벤더 인증이 필요합니다.'
    });
  }

  // GET: 내 체험 목록 조회
  if (req.method === 'GET') {
    try {
      const { experience_id, is_active } = req.query;

      let query = `
        SELECT
          e.*,
          l.title as listing_title,
          l.location,
          l.rating_avg,
          l.rating_count,
          COUNT(DISTINCT eb.id) as total_bookings,
          SUM(CASE WHEN eb.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings
        FROM experiences e
        LEFT JOIN listings l ON e.listing_id = l.id
        LEFT JOIN experience_bookings eb ON e.id = eb.experience_id
        WHERE e.vendor_id = ?
      `;

      const params = [vendor_id];

      if (experience_id) {
        query += ` AND e.id = ?`;
        params.push(experience_id);
      }

      if (is_active !== undefined) {
        query += ` AND e.is_active = ?`;
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += ` GROUP BY e.id ORDER BY e.created_at DESC`;

      const result = await connection.execute(query, params);

      const experiences = (result.rows || []).map(exp => ({
        ...exp,
        images: exp.images ? JSON.parse(exp.images) : [],
        time_slots: exp.time_slots ? JSON.parse(exp.time_slots) : [],
        included_items: exp.included_items ? JSON.parse(exp.included_items) : [],
        excluded_items: exp.excluded_items ? JSON.parse(exp.excluded_items) : [],
        requirements: exp.requirements ? JSON.parse(exp.requirements) : []
      }));

      return res.status(200).json({
        success: true,
        experiences
      });

    } catch (error) {
      console.error('❌ [Vendor Experiences GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST: 새 체험 등록
  if (req.method === 'POST') {
    try {
      const {
        listing_id,
        name,
        description,
        experience_type,
        category,
        location,
        address,
        duration_minutes,
        min_participants,
        max_participants,
        price_per_person_krw,
        child_price_krw,
        time_slots,
        language,
        difficulty_level,
        age_restriction,
        included_items,
        excluded_items,
        requirements,
        what_to_bring,
        meeting_point,
        cancellation_policy,
        thumbnail_url,
        images,
        instructor_name,
        instructor_bio
      } = req.body;

      if (!listing_id || !name || !experience_type || !duration_minutes || !price_per_person_krw) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다. (listing_id, name, experience_type, duration_minutes, price_per_person_krw)'
        });
      }

      // 리스팅이 벤더 소유인지 확인
      const listingCheck = await connection.execute(`
        SELECT id FROM listings
        WHERE id = ? AND partner_id = ? AND category = 'experience'
      `, [listing_id, vendor_id]);

      if (!listingCheck.rows || listingCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 체험 리스팅에만 추가할 수 있습니다.'
        });
      }

      const experience_code = generateExperienceCode();

      const result = await connection.execute(`
        INSERT INTO experiences (
          listing_id,
          vendor_id,
          experience_code,
          name,
          description,
          experience_type,
          category,
          location,
          address,
          duration_minutes,
          min_participants,
          max_participants,
          price_per_person_krw,
          child_price_krw,
          time_slots,
          language,
          difficulty_level,
          age_restriction,
          included_items,
          excluded_items,
          requirements,
          what_to_bring,
          meeting_point,
          cancellation_policy,
          thumbnail_url,
          images,
          instructor_name,
          instructor_bio,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, [
        listing_id,
        vendor_id,
        experience_code,
        name,
        description || null,
        experience_type,
        category || null,
        location || null,
        address || null,
        duration_minutes,
        min_participants || 1,
        max_participants || null,
        price_per_person_krw,
        child_price_krw || null,
        JSON.stringify(time_slots || []),
        language || '한국어',
        difficulty_level || null,
        age_restriction || null,
        JSON.stringify(included_items || []),
        JSON.stringify(excluded_items || []),
        JSON.stringify(requirements || []),
        what_to_bring || null,
        meeting_point || null,
        cancellation_policy || null,
        thumbnail_url || null,
        JSON.stringify(images || []),
        instructor_name || null,
        instructor_bio || null
      ]);

      console.log(`✅ [Vendor Experience] 생성 완료: ${name} (${experience_code}) by vendor ${vendor_id}`);

      return res.status(201).json({
        success: true,
        experience_id: result.insertId,
        experience_code
      });

    } catch (error) {
      console.error('❌ [Vendor Experiences POST] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 체험 정보 수정
  if (req.method === 'PUT') {
    try {
      const { experience_id, ...fields } = req.body;

      if (!experience_id) {
        return res.status(400).json({
          success: false,
          error: 'experience_id가 필요합니다.'
        });
      }

      // 체험이 벤더 소유인지 확인
      const experienceCheck = await connection.execute(`
        SELECT id FROM experiences
        WHERE id = ? AND vendor_id = ?
      `, [experience_id, vendor_id]);

      if (!experienceCheck.rows || experienceCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 체험만 수정할 수 있습니다.'
        });
      }

      const updates = [];
      const values = [];

      const allowedFields = [
        'name', 'description', 'experience_type', 'category', 'location', 'address',
        'duration_minutes', 'min_participants', 'max_participants', 'price_per_person_krw',
        'child_price_krw', 'time_slots', 'language', 'difficulty_level', 'age_restriction',
        'included_items', 'excluded_items', 'requirements', 'what_to_bring', 'meeting_point',
        'cancellation_policy', 'thumbnail_url', 'images', 'instructor_name', 'instructor_bio',
        'is_active'
      ];

      for (const field of allowedFields) {
        if (fields[field] !== undefined) {
          if (['time_slots', 'included_items', 'excluded_items', 'requirements', 'images'].includes(field)) {
            updates.push(`${field} = ?`);
            values.push(JSON.stringify(fields[field]));
          } else if (typeof fields[field] === 'boolean') {
            updates.push(`${field} = ?`);
            values.push(fields[field] ? 1 : 0);
          } else {
            updates.push(`${field} = ?`);
            values.push(fields[field]);
          }
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(experience_id);

      const query = `UPDATE experiences SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(query, values);

      console.log(`✅ [Vendor Experience] 수정 완료: experience_id=${experience_id} by vendor ${vendor_id}`);

      return res.status(200).json({
        success: true,
        message: '체험 정보가 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Experiences PUT] Error:', error);
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
