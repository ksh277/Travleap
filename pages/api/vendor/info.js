const { connect } = require('@planetscale/database');
const { neon } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // JWT 토큰 검증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // user_id로 vendor_id 조회
    let vendorId;
    if (decoded.role === 'admin') {
      vendorId = req.query.vendorId || req.body?.vendorId;
    } else {
      const vendorResult = await connection.execute(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '등록된 벤더 정보가 없습니다.' });
      }

      vendorId = vendorResult.rows[0].id;
    }

    console.log('ℹ️ [Vendor Info API] 요청:', { method: req.method, vendorId, user: decoded.email });

    if (req.method === 'GET') {
      // 업체 정보 조회
      const result = await connection.execute(
        `SELECT
          id,
          vendor_code,
          business_name as name,
          contact_name as contact_person,
          contact_email,
          contact_phone,
          address,
          address_detail,
          latitude,
          longitude,
          description,
          logo_url,
          images,
          cancellation_policy,
          cancellation_rules,
          rental_guide,
          check_in_time,
          check_out_time,
          status,
          is_verified,
          total_vehicles as vehicle_count
        FROM rentcar_vendors
        WHERE id = ?
        LIMIT 1`,
        [vendorId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendor = result.rows[0];
      return res.status(200).json({
        success: true,
        data: {
          ...vendor,
          is_verified: vendor.is_verified === 1,
          images: vendor.images ? JSON.parse(vendor.images) : [],
          cancellation_rules: vendor.cancellation_rules ? JSON.parse(vendor.cancellation_rules) : {
            '3_days_before': 100,
            '1_2_days_before': 50,
            'same_day': 0
          }
        }
      });
    }

    if (req.method === 'PUT') {
      // 업체 정보 수정
      const {
        name,
        contact_person,
        contact_email,
        contact_phone,
        address,
        address_detail,
        latitude,
        longitude,
        cancellation_policy,
        cancellation_rules,
        rental_guide,
        description,
        logo_url,
        images,
        check_in_time,
        check_out_time,
        email,
        password
      } = req.body;

      console.log('📝 [Vendor Info Update] 받은 데이터:', {
        name, contact_person, contact_email, address, address_detail,
        hasEmail: !!email, hasPassword: !!password
      });

      // rentcar_vendors 테이블 업데이트
      await connection.execute(
        `UPDATE rentcar_vendors
        SET
          business_name = ?,
          contact_name = ?,
          contact_email = ?,
          contact_phone = ?,
          address = ?,
          address_detail = ?,
          latitude = ?,
          longitude = ?,
          cancellation_policy = ?,
          cancellation_rules = ?,
          rental_guide = ?,
          description = ?,
          logo_url = ?,
          images = ?,
          check_in_time = ?,
          check_out_time = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          name,
          contact_person,
          contact_email,
          contact_phone,
          address,
          address_detail || null,
          latitude || null,
          longitude || null,
          cancellation_policy || null,
          cancellation_rules ? JSON.stringify(cancellation_rules) : null,
          rental_guide || null,
          description || null,
          logo_url || null,
          images ? JSON.stringify(images) : null,
          check_in_time || null,
          check_out_time || null,
          vendorId
        ]
      );

      // 이메일 또는 비밀번호 변경 시 Neon DB의 users 테이블 업데이트
      if (email || password) {
        const bcrypt = require('bcryptjs');
        const sql = neon(process.env.POSTGRES_DATABASE_URL);

        try {
          // 현재 사용자 정보 조회 (Neon)
          const userResult = await sql`
            SELECT id, email FROM users WHERE id = ${decoded.userId}
          `;

          if (userResult && userResult.length > 0) {
            const currentUser = userResult[0];

            if (email && email !== currentUser.email) {
              // 이메일 중복 체크 (Neon)
              const emailCheck = await sql`
                SELECT id FROM users WHERE email = ${email} AND id != ${decoded.userId}
              `;

              if (emailCheck && emailCheck.length > 0) {
                return res.status(400).json({
                  success: false,
                  message: '이미 사용 중인 이메일입니다.'
                });
              }

              // 이메일만 변경
              if (!password) {
                await sql`
                  UPDATE users
                  SET email = ${email}, updated_at = NOW()
                  WHERE id = ${decoded.userId}
                `;
                console.log('✅ [Vendor Info Update] 이메일 업데이트 완료 (Neon)');
              }
            }

            if (password) {
              const hashedPassword = await bcrypt.hash(password, 10);

              // 비밀번호만 변경하거나 이메일과 함께 변경
              if (email && email !== currentUser.email) {
                await sql`
                  UPDATE users
                  SET email = ${email}, password_hash = ${hashedPassword}, updated_at = NOW()
                  WHERE id = ${decoded.userId}
                `;
                console.log('✅ [Vendor Info Update] 이메일 + 비밀번호 업데이트 완료 (Neon)');
              } else {
                await sql`
                  UPDATE users
                  SET password_hash = ${hashedPassword}, updated_at = NOW()
                  WHERE id = ${decoded.userId}
                `;
                console.log('✅ [Vendor Info Update] 비밀번호 업데이트 완료 (Neon)');
              }
            }
          }
        } catch (neonError) {
          console.error('❌ [Vendor Info Update] Neon DB 업데이트 오류:', neonError);
          // Neon DB 오류가 발생해도 rentcar_vendors 업데이트는 성공했으므로 warning만 표시
          console.warn('⚠️  업체 정보는 업데이트되었으나 계정 정보 업데이트 실패');
        }
      }

      return res.status(200).json({
        success: true,
        message: '업체 정보가 수정되었습니다.'
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });

  } catch (error) {
    console.error('❌ [Vendor Info API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
