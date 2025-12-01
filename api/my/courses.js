/**
 * 내 코스 관리 API
 * GET /api/my/courses - 저장된 코스 목록 조회
 * POST /api/my/courses - 새 코스 저장
 * DELETE /api/my/courses?id=123 - 코스 삭제
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '로그인이 필요합니다'
      });
    }

    // GET: 내 코스 목록 조회
    if (req.method === 'GET') {
      const courses = await connection.execute(`
        SELECT
          uc.id,
          uc.course_name,
          uc.description,
          uc.travel_style,
          uc.budget,
          uc.duration,
          uc.group_size,
          uc.total_price,
          uc.match_percentage,
          uc.tips,
          uc.created_at,
          (SELECT COUNT(*) FROM user_course_items WHERE course_id = uc.id) as item_count
        FROM user_courses uc
        WHERE uc.user_id = ?
        ORDER BY uc.created_at DESC
        LIMIT 50
      `, [userId]);

      // 각 코스의 아이템(상품) 정보 조회
      const coursesWithItems = await Promise.all(
        (courses.rows || []).map(async (course) => {
          const items = await connection.execute(`
            SELECT
              uci.id,
              uci.listing_id,
              uci.item_order,
              uci.day_number,
              uci.reason,
              l.title,
              l.category,
              l.short_description,
              l.price_from,
              l.location,
              l.lat,
              l.lng,
              l.images,
              l.rating_avg
            FROM user_course_items uci
            LEFT JOIN listings l ON uci.listing_id = l.id
            WHERE uci.course_id = ?
            ORDER BY uci.day_number, uci.item_order
          `, [course.id]);

          return {
            ...course,
            travel_style: course.travel_style ? JSON.parse(course.travel_style) : [],
            tips: course.tips ? JSON.parse(course.tips) : [],
            items: (items.rows || []).map(item => ({
              ...item,
              images: item.images ? JSON.parse(item.images) : []
            }))
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: coursesWithItems,
        count: coursesWithItems.length
      });
    }

    // POST: 새 코스 저장
    if (req.method === 'POST') {
      const {
        courseName,
        description,
        travelStyle,
        budget,
        duration,
        groupSize,
        totalPrice,
        matchPercentage,
        tips,
        recommendations
      } = req.body;

      if (!courseName || !recommendations || recommendations.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_INPUT',
          message: '코스명과 추천 상품이 필요합니다'
        });
      }

      // 코스 저장
      const courseResult = await connection.execute(`
        INSERT INTO user_courses (
          user_id,
          course_name,
          description,
          travel_style,
          budget,
          duration,
          group_size,
          total_price,
          match_percentage,
          tips
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        courseName,
        description || '',
        JSON.stringify(travelStyle || []),
        budget || 0,
        duration || 1,
        groupSize || 1,
        totalPrice || 0,
        matchPercentage || 0,
        JSON.stringify(tips || [])
      ]);

      const courseId = courseResult.insertId;

      // 코스 아이템 저장
      for (const rec of recommendations) {
        await connection.execute(`
          INSERT INTO user_course_items (
            course_id,
            listing_id,
            item_order,
            day_number,
            reason
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          courseId,
          rec.listing_id || rec.listing?.id,
          rec.order || 0,
          rec.day || 1,
          rec.reason || ''
        ]);
      }

      console.log(`✅ [My Courses] 코스 저장 완료: userId=${userId}, courseId=${courseId}, items=${recommendations.length}`);

      return res.status(201).json({
        success: true,
        message: '코스가 저장되었습니다',
        data: {
          id: courseId,
          course_name: courseName,
          item_count: recommendations.length
        }
      });
    }

    // DELETE: 코스 삭제
    if (req.method === 'DELETE') {
      const courseId = req.query.id;

      if (!courseId) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_INPUT',
          message: '코스 ID가 필요합니다'
        });
      }

      // 본인 코스인지 확인
      const courseCheck = await connection.execute(
        'SELECT id FROM user_courses WHERE id = ? AND user_id = ?',
        [courseId, userId]
      );

      if (!courseCheck.rows || courseCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: '코스를 찾을 수 없습니다'
        });
      }

      // 코스 아이템 삭제
      await connection.execute(
        'DELETE FROM user_course_items WHERE course_id = ?',
        [courseId]
      );

      // 코스 삭제
      await connection.execute(
        'DELETE FROM user_courses WHERE id = ?',
        [courseId]
      );

      console.log(`✅ [My Courses] 코스 삭제 완료: userId=${userId}, courseId=${courseId}`);

      return res.status(200).json({
        success: true,
        message: '코스가 삭제되었습니다'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'GET, POST, DELETE 요청만 허용됩니다'
    });

  } catch (error) {
    console.error('❌ [My Courses] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '코스 처리 중 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true }));
