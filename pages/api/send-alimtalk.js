/**
 * 카카오 알림톡 발송 API
 * POST /api/send-alimtalk - 알림톡 발송
 */

export default async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { phone, templateCode, templateParams, partnerName, userName, reservationDate } = req.body;

    // 전화번호 검증
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '전화번호가 필요합니다.'
      });
    }

    // 전화번호 포맷 정리 (010-1234-5678 → 01012345678)
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    // 카카오 API 키 확인
    const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
    const KAKAO_SENDER_KEY = process.env.KAKAO_SENDER_KEY;

    if (!KAKAO_REST_API_KEY || !KAKAO_SENDER_KEY) {
      console.warn('⚠️ Kakao API keys not configured, skipping alimtalk');
      return res.status(200).json({
        success: true,
        message: 'Alimtalk skipped (API keys not configured)',
        skipped: true
      });
    }

    // 알림톡 발송 (카카오 비즈니스 API)
    const kakaoResponse = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KAKAO_REST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        receiver: cleanPhone,
        sender_key: KAKAO_SENDER_KEY,
        template_code: templateCode || 'RESERVATION_CONFIRM',
        template_params: templateParams || {
          partner_name: partnerName || '가맹점',
          user_name: userName || '고객님',
          reservation_date: reservationDate || new Date().toLocaleDateString('ko-KR')
        }
      })
    });

    const kakaoResult = await kakaoResponse.json();

    if (!kakaoResponse.ok) {
      console.error('❌ Kakao Alimtalk API error:', kakaoResult);
      return res.status(500).json({
        success: false,
        message: '알림톡 발송에 실패했습니다.',
        error: kakaoResult
      });
    }

    console.log('✅ Alimtalk sent successfully:', cleanPhone);

    return res.status(200).json({
      success: true,
      message: '알림톡이 성공적으로 발송되었습니다.',
      data: kakaoResult
    });

  } catch (error) {
    console.error('❌ Alimtalk API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
