/**
 * SMS 인증코드 발송 API
 * POST /api/auth/send-code
 */

const { sendVerificationCode, checkPhoneDuplicate, normalizePhone } = require('../../utils/sms-verify.cjs');

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
    const { phone, checkDuplicate = true } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: '전화번호를 입력해주세요.'
      });
    }

    const normalizedPhone = normalizePhone(phone);

    // 전화번호 형식 검증
    if (!/^01[0-9]{8,9}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        error: '올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)'
      });
    }

    // 중복 확인 (회원가입 시)
    if (checkDuplicate) {
      const duplicateCheck = await checkPhoneDuplicate(normalizedPhone);
      if (duplicateCheck.exists) {
        return res.status(409).json({
          success: false,
          error: '이미 가입된 전화번호입니다.'
        });
      }
    }

    // 인증코드 발송
    const result = await sendVerificationCode(normalizedPhone);

    if (result.success) {
      const response = {
        success: true,
        message: result.message || '인증번호가 발송되었습니다.'
      };

      // 개발 모드에서는 인증코드 포함 (테스트용)
      if (result.devCode) {
        response.devCode = result.devCode;
      }

      return res.status(200).json(response);
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || '인증번호 발송에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('SMS 인증코드 발송 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
};
