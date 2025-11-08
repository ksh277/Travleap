/**
 * 이메일 템플릿 생성 유틸리티
 */

/**
 * 주문 알림 이메일 템플릿
 */
function createOrderNotificationEmail(orderDetails) {
  const {
    orderNumber,
    orderDate,
    category,
    productName,
    customerName,
    customerEmail,
    customerPhone,
    amount,
    quantity,
    bookingDate,
    reservationInfo,
    vendorName
  } = orderDetails;

  const categoryEmoji = {
    '팝업': '🎪',
    '렌트카': '🚗',
    '숙박': '🏨',
    '여행': '✈️',
    '음식': '🍽️',
    '관광': '🎭',
    '체험': '🎨'
  };

  const emoji = categoryEmoji[category] || '📦';

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>새 주문 알림</title>
  <style>
    body {
      font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
    }
    .order-info {
      background-color: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e9ecef;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #495057;
    }
    .value {
      color: #212529;
      text-align: right;
    }
    .amount {
      font-size: 24px;
      font-weight: 700;
      color: #667eea;
      text-align: center;
      margin: 20px 0;
    }
    .customer-info {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .customer-info h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #856404;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }
    .button {
      display: inline-block;
      background-color: #667eea;
      color: white;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${emoji} 새 주문이 접수되었습니다!</h1>
      <p>${vendorName || '파트너 업체'}님께 새로운 예약/주문이 들어왔습니다.</p>
    </div>

    <div class="content">
      <div class="order-info">
        <div class="info-row">
          <span class="label">주문번호</span>
          <span class="value">${orderNumber}</span>
        </div>
        <div class="info-row">
          <span class="label">주문일시</span>
          <span class="value">${orderDate}</span>
        </div>
        <div class="info-row">
          <span class="label">카테고리</span>
          <span class="value">${emoji} ${category}</span>
        </div>
        <div class="info-row">
          <span class="label">상품/서비스</span>
          <span class="value">${productName}</span>
        </div>
        ${quantity ? `
        <div class="info-row">
          <span class="label">수량</span>
          <span class="value">${quantity}개</span>
        </div>
        ` : ''}
        ${bookingDate ? `
        <div class="info-row">
          <span class="label">예약일</span>
          <span class="value">${bookingDate}</span>
        </div>
        ` : ''}
        ${reservationInfo ? `
        <div class="info-row">
          <span class="label">예약정보</span>
          <span class="value">${reservationInfo}</span>
        </div>
        ` : ''}
      </div>

      <div class="amount">
        총 결제금액: ₩${amount.toLocaleString()}
      </div>

      <div class="customer-info">
        <h3>주문자 정보</h3>
        <div style="margin: 5px 0;">
          <strong>이름:</strong> ${customerName}
        </div>
        ${customerEmail ? `
        <div style="margin: 5px 0;">
          <strong>이메일:</strong> ${customerEmail}
        </div>
        ` : ''}
        ${customerPhone ? `
        <div style="margin: 5px 0;">
          <strong>연락처:</strong> ${customerPhone}
        </div>
        ` : ''}
      </div>

      <div style="text-align: center;">
        <a href="${process.env.VERCEL_URL || 'https://travelap.vercel.app'}/vendor/dashboard" class="button">
          벤더 대시보드에서 확인하기
        </a>
      </div>
    </div>

    <div class="footer">
      <p>이 이메일은 Travleap 주문 알림 시스템에서 자동으로 발송되었습니다.</p>
      <p>문의사항이 있으시면 support@travleap.com으로 연락해주세요.</p>
      <p style="margin-top: 20px;">© ${new Date().getFullYear()} Travleap. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 간단한 텍스트 버전 (HTML을 지원하지 않는 이메일 클라이언트용)
 */
function createOrderNotificationText(orderDetails) {
  const {
    orderNumber,
    orderDate,
    category,
    productName,
    customerName,
    customerEmail,
    customerPhone,
    amount,
    quantity,
    bookingDate,
    vendorName
  } = orderDetails;

  return `
새 주문 알림 - ${vendorName || '파트너 업체'}

주문번호: ${orderNumber}
주문일시: ${orderDate}
카테고리: ${category}
상품/서비스: ${productName}
${quantity ? `수량: ${quantity}개\n` : ''}
${bookingDate ? `예약일: ${bookingDate}\n` : ''}

총 결제금액: ₩${amount.toLocaleString()}

주문자 정보:
- 이름: ${customerName}
${customerEmail ? `- 이메일: ${customerEmail}\n` : ''}
${customerPhone ? `- 연락처: ${customerPhone}\n` : ''}

벤더 대시보드에서 주문을 확인하고 처리해주세요.
${process.env.VERCEL_URL || 'https://travelap.vercel.app'}/vendor/dashboard

---
이 이메일은 Travleap 주문 알림 시스템에서 자동으로 발송되었습니다.
  `.trim();
}

module.exports = {
  createOrderNotificationEmail,
  createOrderNotificationText
};
