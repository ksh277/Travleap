/**
 * SMS 본인인증 유틸리티
 * 전화번호 인증을 위한 인증코드 발송 및 검증
 */

const { connect } = require('@planetscale/database');

// 인증코드 유효시간 (3분)
const CODE_EXPIRY_MINUTES = 3;

// 메모리 기반 인증코드 저장소 (프로덕션에서는 Redis 권장)
// DB에도 저장하지만, 빠른 검증을 위해 메모리에도 캐시
const verificationCodes = new Map();

/**
 * 6자리 인증코드 생성
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 전화번호 정규화 (하이픈 제거)
 */
function normalizePhone(phone) {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * SMS 발송 (알리고 SMS API 사용)
 * 환경변수: ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER
 */
async function sendSMS(phone, message) {
  const apiKey = process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const sender = process.env.ALIGO_SENDER;

  // SMS API가 설정되지 않은 경우 (개발 환경)
  if (!apiKey || !userId || !sender) {
    console.warn('[SMS] SMS API가 설정되지 않았습니다. 개발 모드로 실행됩니다.');
    console.log('[SMS] 수신번호:', phone);
    console.log('[SMS] 메시지:', message);
    return { success: true, skipped: true, message: '개발 모드 - SMS 발송 생략' };
  }

  try {
    // 알리고 SMS API 호출
    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('user_id', userId);
    formData.append('sender', sender);
    formData.append('receiver', normalizePhone(phone));
    formData.append('msg', message);
    formData.append('testmode_yn', process.env.NODE_ENV === 'production' ? 'N' : 'Y');

    const response = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.result_code === '1') {
      console.log('[SMS] 발송 성공:', phone);
      return { success: true, msgId: result.msg_id };
    } else {
      console.error('[SMS] 발송 실패:', result.message);
      return { success: false, error: result.message };
    }
  } catch (error) {
    console.error('[SMS] API 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 인증코드 발송
 * @param {string} phone - 전화번호
 * @returns {Promise<{success: boolean, message?: string, code?: string, error?: string}>}
 */
async function sendVerificationCode(phone) {
  const normalizedPhone = normalizePhone(phone);

  // 전화번호 형식 검증
  if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
    return { success: false, error: '올바른 전화번호 형식이 아닙니다.' };
  }

  // 6자리 인증코드 생성
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  // 메모리에 저장
  verificationCodes.set(normalizedPhone, {
    code,
    expiresAt,
    attempts: 0
  });

  // DB에도 저장 (선택적)
  try {
    const conn = connect({ url: process.env.DATABASE_URL });

    // 기존 미사용 코드 무효화
    await conn.execute(
      `UPDATE phone_verifications
       SET is_used = 1
       WHERE phone = ? AND is_used = 0`,
      [normalizedPhone]
    );

    // 새 인증코드 저장
    await conn.execute(
      `INSERT INTO phone_verifications (phone, code, expires_at, is_used, created_at)
       VALUES (?, ?, ?, 0, NOW())`,
      [normalizedPhone, code, expiresAt.toISOString().slice(0, 19).replace('T', ' ')]
    );
  } catch (dbError) {
    console.warn('[SMS] DB 저장 실패 (테이블 없을 수 있음):', dbError.message);
    // DB 저장 실패해도 메모리에는 저장되어 있으므로 계속 진행
  }

  // SMS 발송
  const smsMessage = `[Travleap] 인증번호는 [${code}]입니다. ${CODE_EXPIRY_MINUTES}분 내에 입력해주세요.`;
  const smsResult = await sendSMS(normalizedPhone, smsMessage);

  if (smsResult.success) {
    // 개발 모드에서는 인증코드 반환 (테스트용)
    if (smsResult.skipped) {
      return {
        success: true,
        message: `인증번호가 발송되었습니다. (개발모드: ${code})`,
        devCode: code // 개발 환경에서만 코드 노출
      };
    }
    return { success: true, message: '인증번호가 발송되었습니다.' };
  } else {
    return { success: false, error: smsResult.error || 'SMS 발송에 실패했습니다.' };
  }
}

/**
 * 인증코드 검증
 * @param {string} phone - 전화번호
 * @param {string} code - 입력한 인증코드
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function verifyCode(phone, code) {
  const normalizedPhone = normalizePhone(phone);

  // 메모리에서 먼저 확인
  const stored = verificationCodes.get(normalizedPhone);

  if (!stored) {
    // 메모리에 없으면 DB에서 확인
    try {
      const conn = connect({ url: process.env.DATABASE_URL });
      const result = await conn.execute(
        `SELECT code, expires_at, attempts FROM phone_verifications
         WHERE phone = ? AND is_used = 0
         ORDER BY created_at DESC LIMIT 1`,
        [normalizedPhone]
      );

      if (!result.rows || result.rows.length === 0) {
        return { success: false, error: '인증 요청 내역이 없습니다. 인증번호를 다시 요청해주세요.' };
      }

      const dbRecord = result.rows[0];
      const expiresAt = new Date(dbRecord.expires_at);

      if (new Date() > expiresAt) {
        return { success: false, error: '인증번호가 만료되었습니다. 다시 요청해주세요.' };
      }

      if (dbRecord.attempts >= 5) {
        return { success: false, error: '인증 시도 횟수를 초과했습니다. 다시 요청해주세요.' };
      }

      if (dbRecord.code !== code) {
        // 시도 횟수 증가
        await conn.execute(
          `UPDATE phone_verifications SET attempts = attempts + 1 WHERE phone = ? AND is_used = 0`,
          [normalizedPhone]
        );
        return { success: false, error: '인증번호가 일치하지 않습니다.' };
      }

      // 인증 성공 - 사용 처리
      await conn.execute(
        `UPDATE phone_verifications SET is_used = 1, verified_at = NOW() WHERE phone = ? AND is_used = 0`,
        [normalizedPhone]
      );

      return { success: true };
    } catch (dbError) {
      console.error('[SMS] DB 조회 실패:', dbError.message);
      return { success: false, error: '인증 처리 중 오류가 발생했습니다.' };
    }
  }

  // 메모리에서 검증
  if (new Date() > stored.expiresAt) {
    verificationCodes.delete(normalizedPhone);
    return { success: false, error: '인증번호가 만료되었습니다. 다시 요청해주세요.' };
  }

  if (stored.attempts >= 5) {
    verificationCodes.delete(normalizedPhone);
    return { success: false, error: '인증 시도 횟수를 초과했습니다. 다시 요청해주세요.' };
  }

  if (stored.code !== code) {
    stored.attempts++;
    return { success: false, error: '인증번호가 일치하지 않습니다.' };
  }

  // 인증 성공
  verificationCodes.delete(normalizedPhone);

  // DB에서도 사용 처리
  try {
    const conn = connect({ url: process.env.DATABASE_URL });
    await conn.execute(
      `UPDATE phone_verifications SET is_used = 1, verified_at = NOW() WHERE phone = ? AND is_used = 0`,
      [normalizedPhone]
    );
  } catch (dbError) {
    console.warn('[SMS] DB 업데이트 실패:', dbError.message);
  }

  return { success: true };
}

/**
 * 전화번호 중복 확인
 * @param {string} phone - 전화번호
 * @returns {Promise<{exists: boolean, error?: string}>}
 */
async function checkPhoneDuplicate(phone) {
  const { Pool } = require('@neondatabase/serverless');
  const normalizedPhone = normalizePhone(phone);

  try {
    const pool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });
    const result = await pool.query(
      'SELECT id FROM users WHERE phone = $1 LIMIT 1',
      [normalizedPhone]
    );
    await pool.end();

    return { exists: result.rows && result.rows.length > 0 };
  } catch (error) {
    console.error('[SMS] 전화번호 중복 확인 실패:', error.message);
    return { exists: false, error: error.message };
  }
}

module.exports = {
  sendVerificationCode,
  verifyCode,
  checkPhoneDuplicate,
  normalizePhone,
  CODE_EXPIRY_MINUTES
};
