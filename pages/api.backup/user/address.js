const { neon } = require('@neondatabase/serverless');
const { withAuth } = require('../../../utils/auth-middleware');
const { withSecureCors } = require('../../../utils/cors-middleware');

async function handler(req, res) {

  const databaseUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    return res.status(500).json({
      success: false,
      error: 'Database URL not configured'
    });
  }

  const sql = neon(databaseUrl);

  try {
    // JWT에서 사용자 ID 가져오기
    const userId = req.user.userId;

    // PUT - 주소 업데이트
    if (req.method === 'PUT') {
      const { postalCode, address, detailAddress } = req.body;

      console.log('✏️ [Address] 주소 업데이트 요청:', userId);

      // 주소 필드 업데이트
      const result = await sql`
        UPDATE users
        SET postal_code = ${postalCode || ''},
            address = ${address || ''},
            detail_address = ${detailAddress || ''},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
        RETURNING id, email, name, postal_code, address, detail_address
      `;

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        });
      }

      const updatedUser = result[0];

      console.log('✅ [Address] 주소 업데이트 성공:', updatedUser.email);

      return res.status(200).json({
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          postalCode: updatedUser.postal_code || '',
          address: updatedUser.address || '',
          detailAddress: updatedUser.detail_address || ''
        }
      });
    }

    // GET - 주소 조회
    if (req.method === 'GET') {
      console.log('📖 [Address] 주소 조회 요청:', userId);

      const result = await sql`
        SELECT id, email, name, postal_code, address, detail_address
        FROM users
        WHERE id = ${userId}
      `;

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        });
      }

      const user = result[0];

      console.log('✅ [Address] 주소 조회 성공:', user.email);

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          postalCode: user.postal_code || '',
          address: user.address || '',
          detailAddress: user.detail_address || ''
        }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Address] 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error.message
    });
  }
}

// JWT 인증 및 보안 CORS 적용
module.exports = withSecureCors(
  withAuth(handler, { requireAuth: true })
);
