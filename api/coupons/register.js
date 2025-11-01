const { connect } = require('@planetscale/database');

/**
 * 쿠폰 등록 API
 * POST /api/coupons/register
 * 사용자가 쿠폰 코드를 입력하여 자신의 보유 쿠폰에 추가
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { code, userId } = req.body;

    console.log('🎟️ [Coupon Register] 쿠폰 다운로드 요청:', { code, userId });

    if (!code || !userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: '쿠폰 코드와 사용자 ID가 필요합니다'
      });
    }

    // 🔒 트랜잭션 시작 - 동시성 제어 및 일관성 보장
    console.log('🔒 [Coupon Register] 트랜잭션 시작');
    await connection.execute('START TRANSACTION');

    // ✅ coupons 테이블 생성 (없으면)
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS coupons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          title VARCHAR(255),
          description TEXT,
          discount_type ENUM('percentage', 'fixed') NOT NULL,
          discount_value INT NOT NULL,
          min_amount INT DEFAULT 0,
          max_discount_amount INT NULL,
          target_category VARCHAR(50),
          valid_from TIMESTAMP NULL,
          valid_until TIMESTAMP NULL,
          is_active BOOLEAN DEFAULT TRUE,
          usage_limit INT NULL,
          current_usage INT DEFAULT 0,
          usage_per_user INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_code (code),
          INDEX idx_is_active (is_active),
          INDEX idx_valid_until (valid_until)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (tableError) {
      console.warn('⚠️ [Coupon Register] coupons 테이블 생성 오류 (무시):', tableError.message);
    }

    // ✅ user_coupons 테이블 생성 (없으면)
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS user_coupons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          coupon_id INT NOT NULL,
          registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_used BOOLEAN DEFAULT FALSE,
          used_at TIMESTAMP NULL,
          order_number VARCHAR(100) NULL,
          UNIQUE KEY unique_user_coupon (user_id, coupon_id),
          INDEX idx_user_id (user_id),
          INDEX idx_coupon_id (coupon_id),
          INDEX idx_is_used (is_used)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ [Coupon Register] user_coupons 테이블 확인 완료');
    } catch (tableError) {
      console.error('⚠️ [Coupon Register] 테이블 생성 오류 (무시):', tableError.message);
      // 테이블이 이미 존재하면 에러 무시
    }

    // 1. 쿠폰 코드 유효성 확인 (🔒 FOR UPDATE 락 - 동시성 제어)
    const couponResult = await connection.execute(`
      SELECT * FROM coupons
      WHERE code = ? AND is_active = 1
      FOR UPDATE
    `, [code.toUpperCase()]);

    if (!couponResult.rows || couponResult.rows.length === 0) {
      await connection.execute('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'INVALID_CODE',
        message: '유효하지 않은 쿠폰 코드입니다'
      });
    }

    const coupon = couponResult.rows[0];
    console.log(`🎟️ [Coupon Register] 쿠폰 정보:`, {
      id: coupon.id,
      code: coupon.code,
      usage_limit: coupon.usage_limit,
      used_count: coupon.used_count,
      usage_per_user: coupon.usage_per_user
    });

    // 2. 유효 기간 체크
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      await connection.execute('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'NOT_YET_VALID',
        message: `이 쿠폰은 ${new Date(coupon.valid_from).toLocaleDateString('ko-KR')}부터 사용 가능합니다`
      });
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      await connection.execute('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'EXPIRED',
        message: '만료된 쿠폰입니다'
      });
    }

    // 2-1. 🔥 수량 제한 체크 (전체 다운로드 가능 횟수) - FOR UPDATE 락 이후 재확인
    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      await connection.execute('ROLLBACK');
      console.warn(`⚠️ [Coupon Register] 쿠폰 소진: ${coupon.code} (${coupon.used_count}/${coupon.usage_limit})`);
      return res.status(400).json({
        success: false,
        error: 'SOLD_OUT',
        message: '쿠폰 발급 수량이 모두 소진되었습니다'
      });
    }

    // 3. 🔥 이미 등록했는지 확인 (중복 다운로드 방지)
    const alreadyRegistered = await connection.execute(`
      SELECT id, is_used FROM user_coupons
      WHERE user_id = ? AND coupon_id = ?
      LIMIT 1
    `, [userId, coupon.id]);

    if (alreadyRegistered.rows && alreadyRegistered.rows.length > 0) {
      await connection.execute('ROLLBACK');
      const isUsed = alreadyRegistered.rows[0].is_used;
      console.warn(`⚠️ [Coupon Register] 중복 다운로드 차단: user_id=${userId}, coupon_id=${coupon.id}, is_used=${isUsed}`);
      return res.status(400).json({
        success: false,
        error: 'ALREADY_DOWNLOADED',
        message: isUsed ? '이미 사용한 쿠폰입니다' : '이미 다운로드한 쿠폰입니다'
      });
    }

    // 3-1. 🔥 사용자당 다운로드 횟수 제한 체크 (usage_per_user)
    if (coupon.usage_per_user !== null && coupon.usage_per_user > 0) {
      const userDownloadCount = await connection.execute(`
        SELECT COUNT(*) as count FROM user_coupons
        WHERE user_id = ? AND coupon_id = ?
      `, [userId, coupon.id]);

      const currentDownloadCount = userDownloadCount.rows[0]?.count || 0;
      if (currentDownloadCount >= coupon.usage_per_user) {
        await connection.execute('ROLLBACK');
        console.warn(`⚠️ [Coupon Register] 사용자당 다운로드 한도 초과: user_id=${userId}, count=${currentDownloadCount}, limit=${coupon.usage_per_user}`);
        return res.status(400).json({
          success: false,
          error: 'USER_DOWNLOAD_LIMIT_EXCEEDED',
          message: `이 쿠폰은 1인당 ${coupon.usage_per_user}회만 다운로드 가능합니다`
        });
      }
    }

    // 4. 🔥 쿠폰 다운로드 (user_coupons 테이블 INSERT)
    const insertResult = await connection.execute(`
      INSERT INTO user_coupons (user_id, coupon_id, registered_at, is_used)
      VALUES (?, ?, NOW(), FALSE)
    `, [userId, coupon.id]);

    console.log(`✅ [Coupon Register] user_coupons INSERT 완료: insert_id=${insertResult.insertId}`);

    // 5. 🔥 쿠폰 다운로드 횟수 증가 (선착순 쿠폰 대비)
    // ⚠️ used_count는 실제 사용 시 증가하므로 여기서는 증가하지 않음
    // 대신 download_count 필드가 있다면 증가 (선택사항)

    // 🔒 트랜잭션 커밋
    await connection.execute('COMMIT');
    console.log(`✅ [Coupon Register] 쿠폰 다운로드 성공: user_id=${userId}, coupon_id=${coupon.id}, code=${coupon.code}`);

    return res.status(200).json({
      success: true,
      message: '쿠폰이 다운로드되었습니다',
      data: {
        code: coupon.code,
        title: coupon.title || coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        min_amount: coupon.min_amount,
        valid_until: coupon.valid_until
      }
    });

  } catch (error) {
    console.error('❌ [Coupon Register] API error:', error);
    console.error('❌ [Coupon Register] Error stack:', error.stack);

    // 🔒 트랜잭션 롤백
    try {
      await connection.execute('ROLLBACK');
      console.log('🔙 [Coupon Register] 트랜잭션 롤백 완료');
    } catch (rollbackError) {
      console.error('❌ [Coupon Register] 롤백 실패:', rollbackError);
    }

    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || '쿠폰 다운로드 중 오류가 발생했습니다'
    });
  }
};
