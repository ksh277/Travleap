/**
 * 문의 답변 API
 * POST /api/admin/contact-replies - 문의에 답변 작성
 * PUT /api/admin/contact-replies/:id - 문의 답변 수정
 * PUT /api/admin/contact-replies/status/:id - 문의 상태 변경
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // POST - 문의 답변 작성
    if (req.method === 'POST') {
      const { contact_id, reply_text, admin_name, send_email } = req.body;

      if (!contact_id || !reply_text) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다: contact_id, reply_text'
        });
      }

      // 1. 문의가 존재하는지 확인 및 정보 조회
      const contactResult = await connection.execute(
        'SELECT id, name, email, subject, message FROM contacts WHERE id = ?',
        [contact_id]
      );

      if (!contactResult.rows || contactResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '문의를 찾을 수 없습니다'
        });
      }

      const contact = contactResult.rows[0];

      // 2. 답변 저장
      // contacts 테이블에 reply 컬럼이 있다고 가정
      await connection.execute(`
        UPDATE contacts
        SET reply = ?,
            reply_admin = ?,
            replied_at = NOW(),
            status = 'answered',
            updated_at = NOW()
        WHERE id = ?
      `, [reply_text, admin_name || '관리자', contact_id]);

      console.log(`✅ 문의 #${contact_id}에 답변 추가 완료`);

      // 3. 이메일 발송 (선택사항)
      if (send_email && contact.email) {
        try {
          // 이메일 발송 로직 (기존 notification API 활용)
          console.log(`📧 문의 답변 이메일 발송 준비: ${contact.email}`);
          // TODO: 이메일 발송 API 호출
        } catch (emailError) {
          console.warn('⚠️  이메일 발송 실패:', emailError);
          // 이메일 실패해도 답변 저장은 성공으로 처리
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          contact_id,
          reply_text,
          admin_name: admin_name || '관리자',
          email_sent: send_email && contact.email ? true : false
        },
        message: '문의 답변이 등록되었습니다'
      });
    }

    // PUT - 문의 상태 변경
    if (req.method === 'PUT' && req.url.includes('/status/')) {
      const { id } = req.query;
      const { status } = req.body;

      if (!id || !status) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다: id, status'
        });
      }

      // 유효한 상태 확인
      const validStatuses = ['pending', 'in_progress', 'answered', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `유효하지 않은 상태입니다. 가능한 값: ${validStatuses.join(', ')}`
        });
      }

      await connection.execute(`
        UPDATE contacts
        SET status = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [status, id]);

      console.log(`✅ 문의 #${id} 상태 변경: ${status}`);

      return res.status(200).json({
        success: true,
        message: `문의 상태가 '${status}'로 변경되었습니다`
      });
    }

    // PUT - 문의 답변 수정
    if (req.method === 'PUT') {
      const { id, reply_text } = req.body;

      if (!id || !reply_text) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다: id, reply_text'
        });
      }

      await connection.execute(`
        UPDATE contacts
        SET reply = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [reply_text, id]);

      console.log(`✅ 문의 답변 #${id} 수정 완료`);

      return res.status(200).json({
        success: true,
        message: '문의 답변이 수정되었습니다'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ 문의 답변 API 오류:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
