const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');
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
    // 사용자 ID 가져오기
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다.'
      });
    }

    // GET - 프로필 조회
    if (req.method === 'GET') {
      console.log('📖 [Profile] 프로필 조회 요청:', userId);

      const result = await sql`
        SELECT id, email, name, phone,
               postal_code, address, detail_address,
               provider, created_at, updated_at
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

      console.log('✏️ [Profile] 프로필 업데이트 요청:', userId, '| name:', name, '| phone:', phone);

      // 업데이트할 필드만 처리
      const updateFields = [];
      const updateValues = [];

      if (name !== undefined) {
        updateFields.push('name');
        updateValues.push(name);
      }

      if (phone !== undefined) {
        updateFields.push('phone');
        updateValues.push(phone);
      }

      if (postalCode !== undefined) {
        updateFields.push('postal_code');
        updateValues.push(postalCode);
      }

      if (address !== undefined) {
        updateFields.push('address');
        updateValues.push(address);
      }

      if (detailAddress !== undefined) {
        updateFields.push('detail_address');
        updateValues.push(detailAddress);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: '업데이트할 내용이 없습니다.'
        });
      }

      // 동적 쿼리 생성
      const setClause = updateFields.map((field, index) =>
        `${field} = $${index + 2}`
      ).join(', ');

      const query = `
        UPDATE users
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, email, name, phone, postal_code, address, detail_address
      `;

      const result = await sql.unsafe(query, [userId, ...updateValues]);

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        });
      }

      const updatedUser = result[0];

      console.log('✅ [Profile] 프로필 업데이트 성공:', updatedUser.email, '| name:', updatedUser.name);

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
