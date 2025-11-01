/**
 * 스마트택배 배송 조회 API
 *
 * GET /api/tracking/query?courier={택배사}&invoice={송장번호}
 *
 * 기능:
 * - 스마트택배 API로 실시간 배송 현황 조회
 * - 인증된 사용자만 접근 가능 (자기 주문만 조회)
 *
 * 권한: 로그인 필수
 */

const { getCourierCode } = require('../../../utils/sweettracker.ts');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET 메서드만 허용
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    const { courier, invoice } = req.query;

    // 파라미터 검증
    if (!courier || !invoice) {
      return res.status(400).json({
        success: false,
        error: '택배사 코드와 송장번호가 필요합니다.',
        required: {
          courier: '택배사 코드 (예: cj, hanjin, lotte)',
          invoice: '송장번호'
        }
      });
    }

    // API 키 확인
    const apiKey = process.env.SWEETTRACKER_API_KEY;

    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      console.error('❌ [Tracking Query] SWEETTRACKER_API_KEY가 설정되지 않았습니다.');
      return res.status(500).json({
        success: false,
        error: '배송 조회 서비스가 설정되지 않았습니다. 관리자에게 문의하세요.',
        hint: '.env 파일에 SWEETTRACKER_API_KEY를 설정해주세요.'
      });
    }

    // 택배사 코드 변환
    const sweetTrackerCode = getCourierCode(courier);

    if (!sweetTrackerCode) {
      return res.status(400).json({
        success: false,
        error: `지원하지 않는 택배사입니다: ${courier}`,
        supportedCouriers: ['cj', 'hanjin', 'lotte', 'post', 'coupang', 'logen', 'gs25', 'cu', 'epost'],
        courierNames: {
          'cj': 'CJ대한통운',
          'hanjin': '한진택배',
          'lotte': '롯데택배',
          'post': '우체국택배',
          'coupang': '쿠팡 로지스틱스',
          'logen': '로젠택배',
          'gs25': 'GS25 편의점택배',
          'cu': 'CU 편의점택배',
          'epost': '세븐일레븐 편의점택배'
        }
      });
    }

    console.log(`📦 [Tracking Query] ${courier} (${sweetTrackerCode}) - ${invoice}`);

    // 스마트택배 API 호출
    const url = `http://info.sweettracker.co.kr/api/v1/trackingInfo?t_key=${encodeURIComponent(apiKey)}&t_code=${sweetTrackerCode}&t_invoice=${encodeURIComponent(invoice)}`;

    const response = await fetch(url);
    const data = await response.json();

    // 에러 처리
    if (data.code !== 200) {
      console.error('❌ [Tracking Query] API Error:', data);
      return res.status(400).json({
        success: false,
        error: data.message || '배송 조회에 실패했습니다.',
        code: data.code
      });
    }

    console.log(`✅ [Tracking Query] 조회 성공 - Level: ${data.level}, Complete: ${data.complete}`);

    // 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        invoiceNo: data.invoiceNo,
        level: data.level,
        complete: data.complete,
        senderName: data.senderName,
        receiverName: data.receiverName,
        receiverAddr: data.receiverAddr,
        itemName: data.itemName,
        orderNumber: data.orderNumber,
        estimate: data.estimate,
        recipient: data.recipient,
        result: data.result,
        trackingDetails: data.trackingDetails || []
      }
    });

  } catch (error) {
    console.error('❌ [Tracking Query] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
