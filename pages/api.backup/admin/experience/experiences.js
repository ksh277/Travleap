/**
 * 관리자 - 체험 관리 API
 * GET /api/admin/experience/experiences - 모든 체험 조회
 * POST /api/admin/experience/experiences - 체험 생성
 * PUT /api/admin/experience/experiences - 체험 수정
 * DELETE /api/admin/experience/experiences - 체험 삭제
 */

const { connect } = require('@planetscale/database');
const { verifyJWT } = require('../../../../utils/jwt');

async function handler(req, res) {
  // JWT 인증 (관리자만)
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '인증 토큰이 필요합니다.'
    });
  }

  let decoded;
  try {
    decoded = verifyJWT(token);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다.'
    });
  }

  if (decoded.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '관리자 권한이 필요합니다.'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // GET: 모든 체험 조회
  if (req.method === 'GET') {
    try {
      const { limit = '100', offset = '0' } = req.query;

      const experiencesResult = await connection.execute(
        `SELECT
          e.*,
          u.name as vendor_name,
          u.email as vendor_email,
          COUNT(DISTINCT eb.id) as total_bookings,
          SUM(CASE WHEN eb.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings
        FROM experiences e
        LEFT JOIN users u ON e.vendor_id = u.id
        LEFT JOIN experience_bookings eb ON e.id = eb.experience_id
        GROUP BY e.id
        ORDER BY e.created_at DESC
        LIMIT ? OFFSET ?`,
        [parseInt(limit), parseInt(offset)]
      );

      const experiences = (experiencesResult.rows || []).map(exp => ({
        ...exp,
        images: exp.images ? JSON.parse(exp.images) : [],
        time_slots: exp.time_slots ? JSON.parse(exp.time_slots) : [],
        included_items: exp.included_items ? JSON.parse(exp.included_items) : [],
        excluded_items: exp.excluded_items ? JSON.parse(exp.excluded_items) : [],
        requirements: exp.requirements ? JSON.parse(exp.requirements) : []
      }));

      return res.status(200).json({
        success: true,
        data: experiences
      });

    } catch (error) {
      console.error('❌ [Admin Experiences GET] Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST: 체험 생성
  if (req.method === 'POST') {
    try {
      const experienceData = req.body;

      if (!experienceData.vendor_id || !experienceData.name || !experienceData.price_per_person_krw) {
        return res.status(400).json({
          success: false,
          message: '필수 필드가 누락되었습니다. (vendor_id, name, price_per_person_krw)'
        });
      }

      function generateExperienceCode() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `EXP-${timestamp}-${random}`;
      }

      const experience_code = generateExperienceCode();

      const result = await connection.execute(`
        INSERT INTO experiences (
          vendor_id, experience_code, name, description, experience_type,
          category, location, address, duration_minutes,
          min_participants, max_participants, price_per_person_krw, child_price_krw,
          time_slots, language, difficulty_level, age_restriction,
          included_items, excluded_items, requirements,
          what_to_bring, meeting_point, cancellation_policy,
          thumbnail_url, images, instructor_name, instructor_bio,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, [
        experienceData.vendor_id,
        experience_code,
        experienceData.name,
        experienceData.description || null,
        experienceData.experience_type || 'activity',
        experienceData.category || null,
        experienceData.location || null,
        experienceData.address || null,
        experienceData.duration_minutes || 60,
        experienceData.min_participants || 1,
        experienceData.max_participants || null,
        experienceData.price_per_person_krw,
        experienceData.child_price_krw || null,
        JSON.stringify(experienceData.time_slots || []),
        experienceData.language || '한국어',
        experienceData.difficulty_level || null,
        experienceData.age_restriction || null,
        JSON.stringify(experienceData.included_items || []),
        JSON.stringify(experienceData.excluded_items || []),
        JSON.stringify(experienceData.requirements || []),
        experienceData.what_to_bring || null,
        experienceData.meeting_point || null,
        experienceData.cancellation_policy || null,
        experienceData.thumbnail_url || null,
        JSON.stringify(experienceData.images || []),
        experienceData.instructor_name || null,
        experienceData.instructor_bio || null
      ]);

      return res.status(201).json({
        success: true,
        message: '체험이 생성되었습니다.',
        data: {
          id: result.insertId,
          experience_code
        }
      });

    } catch (error) {
      console.error('❌ [Admin Experiences POST] Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // PUT: 체험 수정
  if (req.method === 'PUT') {
    try {
      const { id, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'experience ID가 필요합니다.'
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

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          if (['time_slots', 'included_items', 'excluded_items', 'requirements', 'images'].includes(key)) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: '수정할 필드가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      await connection.execute(
        `UPDATE experiences SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return res.status(200).json({
        success: true,
        message: '체험이 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Admin Experiences PUT] Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // DELETE: 체험 삭제
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'experience ID가 필요합니다.'
        });
      }

      await connection.execute(
        `DELETE FROM experiences WHERE id = ?`,
        [id]
      );

      return res.status(200).json({
        success: true,
        message: '체험이 삭제되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Admin Experiences DELETE] Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}

module.exports = handler;
