const { neon } = require('@neondatabase/serverless');
const { verifyJWTFromRequest } = require('../../utils/auth-middleware.cjs');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const databaseUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    return res.status(500).json({
      success: false,
      error: 'Database URL not configured'
    });
  }

  const sql = neon(databaseUrl);

  try {
    // JWT 토큰에서 userId와 email 추출
    const user = verifyJWTFromRequest(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.'
      });
    }

    const userId = user.userId;
    const email = user.email; // ID 대신 email 사용 (마이그레이션으로 ID 변경되어도 email은 불변)

    // GET - 프로필 조회
    if (req.method === 'GET') {
      console.log('📖 [Profile] 프로필 조회 요청:', userId);

      const result = await sql`
        SELECT id, email, name, phone,
               postal_code, address, detail_address,
               provider, created_at, updated_at
        FROM users
        WHERE email = ${email}
      `;

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        });
      }

      const user = result[0];

      console.log('✅ [Profile] 프로필 조회 성공:', user.email, '| name:', user.name);

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone || '',
          postalCode: user.postal_code || '',
          address: user.address || '',
          detailAddress: user.detail_address || '',
          provider: user.provider || null
        }
      });
    }

    // PUT - 프로필 업데이트
    if (req.method === 'PUT') {
      const { name, phone, postalCode, address, detailAddress } = req.body;

      console.log('✏️ [Profile] 프로필 업데이트 요청:', userId, '| email:', email, '| name:', name, '| phone:', phone);

      // 먼저 현재 값 조회
      const current = await sql`SELECT * FROM users WHERE email = ${email}`;

      if (current.length === 0) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        });
      }

      // 변경되지 않은 필드는 기존 값 유지
      const currentUser = current[0];
      const finalName = name !== undefined ? name : currentUser.name;
      const finalPhone = phone !== undefined ? phone : (currentUser.phone || '');
      const finalPostalCode = postalCode !== undefined ? postalCode : (currentUser.postal_code || '');
      const finalAddress = address !== undefined ? address : (currentUser.address || '');
      const finalDetailAddress = detailAddress !== undefined ? detailAddress : (currentUser.detail_address || '');

      // Neon tagged template 사용 (모든 필드 업데이트)
      const result = await sql`
        UPDATE users
        SET name = ${finalName},
            phone = ${finalPhone},
            postal_code = ${finalPostalCode},
            address = ${finalAddress},
            detail_address = ${finalDetailAddress},
            updated_at = CURRENT_TIMESTAMP
        WHERE email = ${email}
        RETURNING id, email, name, phone, postal_code, address, detail_address
      `;

      console.log('🔍 [Profile] UPDATE result:', result.length, 'rows');

      if (!result || result.length === 0) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        });
      }

      const updatedUser = result[0];

      console.log('✅ [Profile] 프로필 업데이트 성공:', updatedUser?.email || 'unknown', '| name:', updatedUser?.name || 'unknown');

      return res.status(200).json({
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          phone: updatedUser.phone || '',
          postalCode: updatedUser.postal_code || '',
          address: updatedUser.address || '',
          detailAddress: updatedUser.detail_address || ''
        }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Profile] 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error.message
    });
  }
};
