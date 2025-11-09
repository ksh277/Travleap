/**
 * 리뷰 답변 API
 * POST /api/admin/review-replies - 리뷰에 답변 작성
 * PUT /api/admin/review-replies/:id - 리뷰 답변 수정
 * DELETE /api/admin/review-replies/:id - 리뷰 답변 삭제
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // POST - 리뷰 답변 작성
    if (req.method === 'POST') {
      const { review_id, reply_text, admin_name } = req.body;

      if (!review_id || !reply_text) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다: review_id, reply_text'
        });
      }

      // 1. 리뷰가 존재하는지 확인
      const reviewResult = await connection.execute(
        'SELECT id FROM reviews WHERE id = ?',
        [review_id]
      );

      if (!reviewResult.rows || reviewResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '리뷰를 찾을 수 없습니다'
        });
      }

      // 2. 답변 추가
      const insertResult = await connection.execute(`
        INSERT INTO review_replies (
          review_id,
          reply_text,
          admin_name,
          created_at
        ) VALUES (?, ?, ?, NOW())
      `, [review_id, reply_text, admin_name || '관리자']);

      console.log(`✅ 리뷰 #${review_id}에 답변 추가 완료`);

      return res.status(200).json({
        success: true,
        data: {
          id: insertResult.insertId,
          review_id,
          reply_text,
          admin_name: admin_name || '관리자'
        },
        message: '리뷰 답변이 등록되었습니다'
      });
    }

    // PUT - 리뷰 답변 수정
    if (req.method === 'PUT') {
      const { id, reply_text } = req.body;

      if (!id || !reply_text) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다: id, reply_text'
        });
      }

      await connection.execute(`
        UPDATE review_replies
        SET reply_text = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [reply_text, id]);

      console.log(`✅ 리뷰 답변 #${id} 수정 완료`);

      return res.status(200).json({
        success: true,
        message: '리뷰 답변이 수정되었습니다'
      });
    }

    // DELETE - 리뷰 답변 삭제
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '답변 ID가 필요합니다'
        });
      }

      await connection.execute('DELETE FROM review_replies WHERE id = ?', [id]);

      console.log(`✅ 리뷰 답변 #${id} 삭제 완료`);

      return res.status(200).json({
        success: true,
        message: '리뷰 답변이 삭제되었습니다'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ 리뷰 답변 API 오류:', error);

    // 테이블이 없는 경우
    if (error.message && error.message.includes("doesn't exist")) {
      return res.status(500).json({
        success: false,
        error: 'review_replies 테이블이 존재하지 않습니다. 테이블을 먼저 생성해주세요.',
        need_table_creation: true
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
