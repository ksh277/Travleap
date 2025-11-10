/**
 * 이메일 템플릿
 *
 * 주문, 환불 등 각종 이메일 템플릿
 */

interface OrderEmailData {
  orderNumber: string;
  userName: string;
  userEmail: string;
  productName: string;
  amount: number;
  paymentMethod?: string;
  createdAt: string;
}

interface RefundEmailData {
  orderNumber: string;
  userName: string;
  userEmail: string;
  productName: string;
  originalAmount: number;
  refundAmount: number;
  refundReason?: string;
  refundedAt: string;
}

interface ExchangePaymentEmailData {
  customerName: string;
  orderNumber: string;
  productName: string;
  exchangeReason: string;
  exchangeFee: number;
  paymentLink: string;
  shippingAddress?: string;
  shippingZipcode?: string;
}

/**
 * 기본 이메일 레이아웃
 */
function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Travleap 알림</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- 헤더 -->
          <tr>
            <td style="background: linear-gradient(135deg, #8B5FBF 0%, #7A4FB5 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                Travleap
              </h1>
              <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">
                제주도 여행의 모든 것
              </p>
            </td>
          </tr>

          <!-- 콘텐츠 -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- 푸터 -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                문의사항이 있으시면 언제든지 연락주세요
              </p>
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                📧 support@travleap.com
              </p>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">
                © 2025 Travleap. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 주문 알림 이메일 (관리자용)
 */
export function getOrderNotificationTemplate(data: OrderEmailData): { subject: string; html: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: #E8F5E9; color: #2E7D32; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
        🎉 새로운 주문
      </div>
    </div>

    <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">
      새로운 주문이 접수되었습니다
    </h2>

    <div style="background-color: #f9f9f9; border-left: 4px solid #8B5FBF; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
          <td style="color: #666; font-size: 14px; width: 120px;">주문번호</td>
          <td style="color: #333; font-size: 14px; font-weight: 600;">${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">주문자</td>
          <td style="color: #333; font-size: 14px;">${data.userName}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">이메일</td>
          <td style="color: #333; font-size: 14px;">${data.userEmail}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">상품명</td>
          <td style="color: #333; font-size: 14px;">${data.productName}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">결제금액</td>
          <td style="color: #8B5FBF; font-size: 18px; font-weight: 700;">₩${data.amount.toLocaleString()}</td>
        </tr>
        ${data.paymentMethod ? `
        <tr>
          <td style="color: #666; font-size: 14px;">결제수단</td>
          <td style="color: #333; font-size: 14px;">${data.paymentMethod}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="color: #666; font-size: 14px;">주문시간</td>
          <td style="color: #333; font-size: 14px;">${data.createdAt}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="https://travelap.vercel.app/admin"
         style="display: inline-block; background-color: #8B5FBF; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
        관리자 페이지에서 확인하기
      </a>
    </div>

    <p style="margin-top: 30px; font-size: 14px; color: #666; line-height: 1.6;">
      주문 내역을 확인하시고 필요한 조치를 취해주세요.
    </p>
  `;

  return {
    subject: `[Travleap] 새로운 주문 - ${data.orderNumber}`,
    html: emailLayout(content),
  };
}

/**
 * 환불 알림 이메일 (관리자용)
 */
export function getRefundNotificationTemplate(data: RefundEmailData): { subject: string; html: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: #FFF3E0; color: #E65100; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
        🔄 환불 요청
      </div>
    </div>

    <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">
      환불이 처리되었습니다
    </h2>

    <div style="background-color: #fff8f0; border-left: 4px solid #E65100; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
          <td style="color: #666; font-size: 14px; width: 120px;">주문번호</td>
          <td style="color: #333; font-size: 14px; font-weight: 600;">${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">사용자</td>
          <td style="color: #333; font-size: 14px;">${data.userName}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">이메일</td>
          <td style="color: #333; font-size: 14px;">${data.userEmail}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">상품명</td>
          <td style="color: #333; font-size: 14px;">${data.productName}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">원 결제금액</td>
          <td style="color: #666; font-size: 14px;">₩${data.originalAmount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">환불금액</td>
          <td style="color: #E65100; font-size: 18px; font-weight: 700;">₩${data.refundAmount.toLocaleString()}</td>
        </tr>
        ${data.refundReason ? `
        <tr>
          <td style="color: #666; font-size: 14px; vertical-align: top;">환불사유</td>
          <td style="color: #333; font-size: 14px;">${data.refundReason}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="color: #666; font-size: 14px;">환불처리시간</td>
          <td style="color: #333; font-size: 14px;">${data.refundedAt}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="https://travelap.vercel.app/admin"
         style="display: inline-block; background-color: #E65100; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
        관리자 페이지에서 확인하기
      </a>
    </div>

    <p style="margin-top: 30px; font-size: 14px; color: #666; line-height: 1.6;">
      환불 처리가 완료되었습니다. 추가 조치가 필요한 경우 확인해주세요.
    </p>
  `;

  return {
    subject: `[Travleap] 환불 처리 - ${data.orderNumber}`,
    html: emailLayout(content),
  };
}

/**
 * 주문 확인 이메일 (사용자용)
 */
export function getOrderConfirmationTemplate(data: OrderEmailData): { subject: string; html: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: #E8F5E9; color: #2E7D32; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
        ✅ 주문 완료
      </div>
    </div>

    <h2 style="color: #333; margin: 0 0 10px 0; font-size: 22px; font-weight: 600;">
      주문이 완료되었습니다!
    </h2>

    <p style="color: #666; font-size: 14px; margin: 0 0 30px 0;">
      ${data.userName}님, Travleap을 이용해 주셔서 감사합니다.
    </p>

    <div style="background-color: #f9f9f9; border-left: 4px solid #8B5FBF; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
          <td style="color: #666; font-size: 14px; width: 120px;">주문번호</td>
          <td style="color: #333; font-size: 14px; font-weight: 600;">${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">상품명</td>
          <td style="color: #333; font-size: 14px;">${data.productName}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">결제금액</td>
          <td style="color: #8B5FBF; font-size: 18px; font-weight: 700;">₩${data.amount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">주문시간</td>
          <td style="color: #333; font-size: 14px;">${data.createdAt}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="https://travelap.vercel.app/mypage"
         style="display: inline-block; background-color: #8B5FBF; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
        내 주문 확인하기
      </a>
    </div>

    <p style="margin-top: 30px; font-size: 14px; color: #666; line-height: 1.6;">
      주문 내역은 마이페이지에서 확인하실 수 있습니다.<br>
      즐거운 제주 여행 되세요! 🌴
    </p>
  `;

  return {
    subject: `[Travleap] 주문 완료 - ${data.orderNumber}`,
    html: emailLayout(content),
  };
}

/**
 * 환불 완료 이메일 (사용자용)
 */
export function getRefundConfirmationTemplate(data: RefundEmailData): { subject: string; html: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: #FFF3E0; color: #E65100; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
        ✅ 환불 완료
      </div>
    </div>

    <h2 style="color: #333; margin: 0 0 10px 0; font-size: 22px; font-weight: 600;">
      환불이 완료되었습니다
    </h2>

    <p style="color: #666; font-size: 14px; margin: 0 0 30px 0;">
      ${data.userName}님의 환불 요청이 처리되었습니다.
    </p>

    <div style="background-color: #fff8f0; border-left: 4px solid #E65100; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
          <td style="color: #666; font-size: 14px; width: 120px;">주문번호</td>
          <td style="color: #333; font-size: 14px; font-weight: 600;">${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">상품명</td>
          <td style="color: #333; font-size: 14px;">${data.productName}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">환불금액</td>
          <td style="color: #E65100; font-size: 18px; font-weight: 700;">₩${data.refundAmount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">환불처리시간</td>
          <td style="color: #333; font-size: 14px;">${data.refundedAt}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #E3F2FD; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #1565C0;">
        💳 환불 금액은 결제하신 수단으로 영업일 기준 3-5일 이내 입금됩니다.
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="https://travelap.vercel.app/mypage"
         style="display: inline-block; background-color: #E65100; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
        내 주문 확인하기
      </a>
    </div>

    <p style="margin-top: 30px; font-size: 14px; color: #666; line-height: 1.6;">
      문의사항이 있으시면 고객센터로 연락주세요.<br>
      감사합니다.
    </p>
  `;

  return {
    subject: `[Travleap] 환불 완료 - ${data.orderNumber}`,
    html: emailLayout(content),
  };
}

/**
 * 교환 배송비 결제 안내 이메일 (사용자용)
 */
export function getExchangePaymentEmail(data: ExchangePaymentEmailData): string {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: #FFF9C4; color: #F57F17; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
        🔄 상품 교환
      </div>
    </div>

    <h2 style="color: #333; margin: 0 0 10px 0; font-size: 22px; font-weight: 600;">
      교환 신청이 접수되었습니다
    </h2>

    <p style="color: #666; font-size: 14px; margin: 0 0 30px 0;">
      ${data.customerName}님, 교환 신청이 정상적으로 접수되었습니다.<br>
      교환 처리를 위해 <strong>왕복 배송비 결제</strong>가 필요합니다.
    </p>

    <div style="background-color: #fff9e6; border-left: 4px solid #F57F17; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
          <td style="color: #666; font-size: 14px; width: 140px;">주문번호</td>
          <td style="color: #333; font-size: 14px; font-weight: 600;">${data.orderNumber}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">상품명</td>
          <td style="color: #333; font-size: 14px;">${data.productName}</td>
        </tr>
        <tr>
          <td style="color: #666; font-size: 14px;">교환 사유</td>
          <td style="color: #333; font-size: 14px;">${data.exchangeReason}</td>
        </tr>
        ${data.shippingAddress ? `
        <tr>
          <td style="color: #666; font-size: 14px; vertical-align: top;">배송지</td>
          <td style="color: #333; font-size: 14px;">
            [${data.shippingZipcode || ''}] ${data.shippingAddress}
          </td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="background-color: #fff3e0; border: 2px solid #FF9800; padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
        왕복 배송비
      </p>
      <p style="margin: 0; font-size: 28px; font-weight: 700; color: #F57F17;">
        ₩${data.exchangeFee.toLocaleString()}
      </p>
      <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
        (반품 배송비 3,000원 + 재발송 배송비 3,000원)
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.paymentLink}"
         style="display: inline-block; background-color: #F57F17; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 6px rgba(245, 127, 23, 0.3);">
        결제하기 →
      </a>
    </div>

    <div style="background-color: #E3F2FD; padding: 15px; border-radius: 6px; margin: 25px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #1565C0; font-weight: 600;">
        📌 교환 진행 절차
      </p>
      <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #1976D2; line-height: 1.8;">
        <li>왕복 배송비 6,000원 결제</li>
        <li>기존 상품 반품 배송</li>
        <li>새 상품 재발송</li>
        <li>교환 완료</li>
      </ol>
    </div>

    <div style="background-color: #FFEBEE; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #C62828;">
        ⚠️ <strong>안내사항</strong><br>
        • 결제 후 반품 배송지 안내를 별도로 전달드립니다.<br>
        • 상품에 하자가 있는 경우 배송비는 판매자 부담입니다.<br>
        • 문의사항은 고객센터로 연락주세요.
      </p>
    </div>

    <p style="margin-top: 30px; font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
      감사합니다.<br>
      즐거운 쇼핑 되세요! 🎁
    </p>
  `;

  return emailLayout(content);
}
