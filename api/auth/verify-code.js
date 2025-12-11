/**
 * SMS 인증코드 확인 API
 * POST /api/auth/verify-code
 */

const { verifyCode, normalizePhone } = require('../../utils/sms-verify.cjs');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        error: '전화번호와 인증번호를 입력해주세요.'
      });
    }

    const normalizedPhone = normalizePhone(phone);

    // 전화번호 형식 검증
    if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        error: '올바른 전화번호 형식이 아닙니다.'
      });
    }

    // 인증코드 형식 검증 (6자리 숫자)
    if (!/^[0-9]{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: '인증번호는 6자리 숫자입니다.'
      });
    }

    // 인증코드 검증
    const result = await verifyCode(normalizedPhone, code);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: '인증이 완료되었습니다.',
        verified: true,
        phone: normalizedPhone
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || '인증에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('SMS 인증코드 확인 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
};
