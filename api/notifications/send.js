/**
 * 알림 발송 API
 * POST /api/notifications/send
 *
 * 이메일/SMS 알림을 발송하는 통합 API 엔드포인트
 *
 * ✅ 고객 알림 + 관리자 알림 통합
 * ✅ admin_settings 기반 설정 제어
 */

const sgMail = require('@sendgrid/mail');
const { connect } = require('@planetscale/database');

// SendGrid API 키 설정
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * 템플릿 렌더링 ({{variable}} 치환 + {{#if}} 조건문 지원)
 */
function renderTemplate(template, data) {
  let rendered = template;

  // 1. {{#if variable}}...{{/if}} 조건문 처리
  const ifBlockRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  rendered = rendered.replace(ifBlockRegex, (match, variable, content) => {
    const value = data[variable];
    if (value !== undefined && value !== null && value !== '' && value !== 0 && value !== false) {
      return content;
    }
    return '';
  });

  // 2. {{variable}} 치환
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    rendered = rendered.replace(new RegExp(escapedPlaceholder, 'g'), String(value || ''));
  }

  return rendered;
}

/**
 * 이메일 발송
 */
async function sendEmail({ to, subject, htmlTemplate, data }) {
  try {
    // SendGrid API 키가 없으면 로그만 출력
    if (!process.env.SENDGRID_API_KEY) {
      console.log('⚠️ [Email] SENDGRID_API_KEY not configured.');
      console.log('📧 [Email - DRY RUN]:', { to, subject, data });
      return { success: process.env.NODE_ENV === 'development', message: 'DRY RUN (no API key)' };
    }

    // 템플릿 렌더링
    const htmlContent = renderTemplate(htmlTemplate, data);

    // 이메일 발송
    const msg = {
      to,
      from: process.env.EMAIL_FROM || 'noreply@travleap.com',
      subject,
      html: htmlContent,
      text: htmlContent.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n')
    };

    await sgMail.send(msg);
    console.log(`✅ [Email] 발송 성공: ${to}`);

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error(`❌ [Email] 발송 실패: ${to}`, error);
    return { success: false, message: error.message, error: error.response?.body };
  }
}

/**
 * SMS 발송 (Aligo)
 */
async function sendSMS({ to, message }) {
  try {
    // 전화번호 포맷팅
    const formattedPhone = to.replace(/[^0-9]/g, '');

    // Aligo API 키가 없으면 로그만 출력
    if (!process.env.ALIGO_API_KEY || !process.env.ALIGO_USER_ID || !process.env.SMS_SENDER) {
      console.log('⚠️ [SMS] Aligo SMS not configured.');
      console.log('📱 [SMS - DRY RUN]:', { to: formattedPhone, message: message.substring(0, 100) });
      return { success: process.env.NODE_ENV === 'development', message: 'DRY RUN (no API key)' };
    }

    // Aligo SMS API 호출
    const params = new URLSearchParams({
      key: process.env.ALIGO_API_KEY,
      user_id: process.env.ALIGO_USER_ID,
      sender: process.env.SMS_SENDER,
      receiver: formattedPhone,
      msg: message,
      msg_type: message.length > 90 ? 'LMS' : 'SMS',
      title: message.length > 90 ? '[Travleap]' : ''
    });

    const response = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const result = await response.json();

    if (result.result_code === '1') {
      console.log(`✅ [SMS] 발송 성공: ${formattedPhone}`);
      return { success: true, message: 'SMS sent successfully', msgId: result.msg_id };
    } else {
      console.error(`❌ [SMS] 발송 실패: ${result.message} (code: ${result.result_code})`);
      return { success: false, message: result.message, code: result.result_code };
    }
  } catch (error) {
    console.error(`❌ [SMS] 발송 실패:`, error);
    return { success: false, message: error.message };
  }
}

/**
 * 결제 완료 알림 템플릿
 */
const PAYMENT_SUCCESS_TEMPLATE = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <h2>💳 결제가 완료되었습니다</h2>
  <p>안녕하세요 {{customerName}}님,</p>
  <p>주문하신 상품의 결제가 정상적으로 완료되었습니다.</p>

  <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
    <h3>주문 정보</h3>
    <p><strong>주문번호:</strong> {{orderNumber}}</p>
    <p><strong>주문일시:</strong> {{orderDate}}</p>
    <p><strong>상품명:</strong> {{productName}}</p>
  </div>

  <div style="background: #e8f5e9; padding: 20px; margin: 20px 0;">
    <h3>결제 정보</h3>
    <p><strong>상품 금액:</strong> ₩{{subtotal}}</p>
    {{#if deliveryFee}}
    <p><strong>배송비:</strong> ₩{{deliveryFee}}</p>
    {{/if}}
    {{#if couponDiscount}}
    <p><strong>쿠폰 할인:</strong> -₩{{couponDiscount}}</p>
    {{/if}}
    {{#if pointsUsed}}
    <p><strong>포인트 사용:</strong> -{{pointsUsed}}P</p>
    {{/if}}
    <p style="font-size: 18px; font-weight: bold; margin-top: 10px;">
      <strong>최종 결제 금액:</strong> ₩{{totalAmount}}
    </p>
    {{#if pointsEarned}}
    <p style="color: #4caf50;">
      <strong>적립 포인트:</strong> +{{pointsEarned}}P
    </p>
    {{/if}}
  </div>

  {{#if shippingAddress}}
  <div style="background: #fff3e0; padding: 20px; margin: 20px 0;">
    <h3>배송 정보</h3>
    <p><strong>받는 분:</strong> {{shippingName}}</p>
    <p><strong>연락처:</strong> {{shippingPhone}}</p>
    <p><strong>주소:</strong> {{shippingAddress}}</p>
    <p style="color: #666; margin-top: 10px;">상품은 영업일 기준 2-3일 내 배송될 예정입니다.</p>
  </div>
  {{/if}}

  <p style="color: #666; font-size: 14px; margin-top: 30px;">
    문의사항이 있으시면 고객센터로 연락주시기 바랍니다.
  </p>

  <p>감사합니다,<br>Travleap 팀</p>
</body>
</html>
`;

const PAYMENT_SUCCESS_SMS = `[Travleap] {{customerName}}님, 결제가 완료되었습니다. 주문번호: {{orderNumber}}, 결제금액: ₩{{totalAmount}}{{#if pointsEarned}} (포인트 {{pointsEarned}}P 적립){{/if}}`;

/**
 * 환불 완료 알림 템플릿
 */
const REFUND_PROCESSED_TEMPLATE = `
<!DOCTYPE html>
<html>
<body>
  <h2>💰 환불이 완료되었습니다</h2>
  <p>안녕하세요 {{customerName}}님,</p>
  <p>요청하신 환불이 정상적으로 처리되었습니다.</p>

  <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
    <h3>환불 정보</h3>
    <p><strong>주문번호:</strong> {{orderNumber}}</p>
    <p><strong>환불 처리일:</strong> {{refundProcessedDate}}</p>
  </div>

  <div style="background: #e3f2fd; padding: 20px; margin: 20px 0;">
    <h3>환불 금액</h3>
    <p><strong>원 결제 금액:</strong> ₩{{originalAmount}}</p>
    {{#if cancellationFee}}
    <p><strong>취소 수수료:</strong> -₩{{cancellationFee}}</p>
    {{/if}}
    {{#if pointsDeducted}}
    <p><strong>포인트 회수:</strong> -{{pointsDeducted}}P</p>
    {{/if}}
    <p style="font-size: 18px; font-weight: bold; margin-top: 10px; color: #1976d2;">
      <strong>최종 환불 금액:</strong> ₩{{refundAmount}}
    </p>
    {{#if pointsRefunded}}
    <p style="color: #4caf50;">
      <strong>포인트 환불:</strong> +{{pointsRefunded}}P
    </p>
    {{/if}}
  </div>

  <p style="color: #666;">
    환불 금액은 결제하신 수단으로 3-7 영업일 이내에 입금됩니다.
  </p>

  <p>감사합니다,<br>Travleap 팀</p>
</body>
</html>
`;

const REFUND_PROCESSED_SMS = `[Travleap] {{customerName}}님, 환불이 완료되었습니다. 주문번호: {{orderNumber}}, 환불금액: ₩{{refundAmount}}. 영업일 기준 3-7일 내 입금됩니다.`;

/**
 * ========================================
 * 관리자 알림 시스템 (새로 추가)
 * ========================================
 */

/**
 * admin_settings에서 이메일 설정 가져오기
 */
async function getEmailSettings() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const result = await connection.execute(
      "SELECT setting_key, setting_value FROM admin_settings WHERE setting_category = 'email'"
    );

    const settings = {};
    if (result.rows) {
      result.rows.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });
    }

    // admin_emails JSON 파싱
    let adminEmails = [];
    try {
      adminEmails = JSON.parse(settings.admin_emails || '[]');
    } catch (e) {
      console.error('Failed to parse admin_emails:', e);
      adminEmails = [];
    }

    return {
      adminEmails,
      emailNotificationsEnabled: settings.email_notifications_enabled === 'true',
      orderNotificationEnabled: settings.order_notification_enabled === 'true',
      refundNotificationEnabled: settings.refund_notification_enabled === 'true',
      paymentNotificationEnabled: settings.payment_notification_enabled === 'true',
      supportEmail: settings.support_email || 'support@travleap.com',
      smtpFrom: settings.smtp_from || 'noreply@travleap.com',
    };
  } catch (error) {
    console.error('❌ Failed to get email settings:', error);
    return {
      adminEmails: [],
      emailNotificationsEnabled: false,
      orderNotificationEnabled: false,
      refundNotificationEnabled: false,
      paymentNotificationEnabled: false,
      supportEmail: 'support@travleap.com',
      smtpFrom: 'noreply@travleap.com',
    };
  }
}

/**
 * 관리자용 주문 알림 템플릿
 */
function getAdminOrderNotificationTemplate(data) {
  const subject = `[Travleap] 새로운 주문 - ${data.orderNumber}`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>새로운 주문 알림</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #8B5FBF 0%, #6B46C1 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">🎉 새로운 주문</h1>
        <p style="color: #E9D5FF; margin: 10px 0 0 0; font-size: 14px;">주문이 접수되었습니다</p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #1F2937; margin: 0 0 24px 0; font-size: 18px; font-weight: 600;">주문 정보</h2>

        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; width: 120px;">주문번호</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px; font-weight: 500;">${data.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">주문자</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;">${data.userName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">이메일</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;">${data.userEmail}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">상품명</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;">${data.productName || '주문 상품'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">결제금액</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #8B5FBF; font-size: 18px; font-weight: 700;">₩${(data.amount || data.totalAmount || 0).toLocaleString()}</td>
          </tr>
          ${data.paymentMethod ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">결제수단</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;">${data.paymentMethod}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 12px 0; color: #6B7280; font-size: 14px;">주문시간</td>
            <td style="padding: 12px 0; color: #1F2937; font-size: 14px;">${data.createdAt || data.orderDate || new Date().toLocaleString('ko-KR')}</td>
          </tr>
        </table>

        <!-- Action Button -->
        <div style="margin-top: 32px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5174'}/admin?tab=orders"
             style="display: inline-block; padding: 14px 32px; background-color: #8B5FBF; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            관리자 페이지에서 확인
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #F9FAFB; padding: 24px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; margin: 0; font-size: 13px;">Travleap 관리자 알림</p>
        <p style="color: #9CA3AF; margin: 8px 0 0 0; font-size: 12px;">이 이메일은 자동으로 발송되었습니다</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * 관리자용 환불 알림 템플릿
 */
function getAdminRefundNotificationTemplate(data) {
  const subject = `[Travleap] 환불 처리 - ${data.orderNumber}`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>환불 처리 알림</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">🔄 환불 처리</h1>
        <p style="color: #FEE2E2; margin: 10px 0 0 0; font-size: 14px;">환불이 요청되었습니다</p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #1F2937; margin: 0 0 24px 0; font-size: 18px; font-weight: 600;">환불 정보</h2>

        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; width: 120px;">주문번호</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px; font-weight: 500;">${data.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">사용자</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;">${data.userName || data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">이메일</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;">${data.userEmail || data.customerEmail}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">상품명</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;">${data.productName || '환불 상품'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">원 결제금액</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">₩${(data.originalAmount || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">환불금액</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #DC2626; font-size: 18px; font-weight: 700;">₩${(data.refundAmount || 0).toLocaleString()}</td>
          </tr>
          ${data.refundReason || data.cancelReason ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">환불사유</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;">${data.refundReason || data.cancelReason}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 12px 0; color: #6B7280; font-size: 14px;">처리시간</td>
            <td style="padding: 12px 0; color: #1F2937; font-size: 14px;">${data.refundedAt || data.refundProcessedDate || new Date().toLocaleString('ko-KR')}</td>
          </tr>
        </table>

        <!-- Action Button -->
        <div style="margin-top: 32px; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5174'}/admin?tab=orders"
             style="display: inline-block; padding: 14px 32px; background-color: #DC2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            관리자 페이지에서 확인
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #F9FAFB; padding: 24px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; margin: 0; font-size: 13px;">Travleap 관리자 알림</p>
        <p style="color: #9CA3AF; margin: 8px 0 0 0; font-size: 12px;">이 이메일은 자동으로 발송되었습니다</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * 벤더(업체)용 주문 알림 템플릿
 */
function getVendorOrderNotificationTemplate(data) {
  const subject = `[Travleap] 새로운 주문 - ${data.orderNumber}`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>새로운 주문 알림</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">🎉 새로운 주문</h1>
        <p style="color: #D1FAE5; margin: 10px 0 0 0; font-size: 14px;">귀사 상품에 주문이 접수되었습니다</p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="color: #1F2937; margin: 0 0 24px 0; font-size: 16px;">안녕하세요 <strong>${data.vendorName}</strong>님,</p>
        <p style="color: #6B7280; margin: 0 0 32px 0; font-size: 14px;">Travleap을 통해 새로운 주문이 접수되었습니다. 고객에게 연락하여 예약을 확정해 주세요.</p>

        <h2 style="color: #1F2937; margin: 0 0 24px 0; font-size: 18px; font-weight: 600;">주문 정보</h2>

        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; width: 120px;">주문번호</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px; font-weight: 500;">${data.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">상품명</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;">${data.productName || '주문 상품'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">결제금액</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #10B981; font-size: 18px; font-weight: 700;">₩${(data.amount || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">주문시간</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;">${data.createdAt || new Date().toLocaleString('ko-KR')}</td>
          </tr>
        </table>

        <h2 style="color: #1F2937; margin: 32px 0 24px 0; font-size: 18px; font-weight: 600;">고객 정보</h2>

        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse; background-color: #F9FAFB; border-radius: 8px;">
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; width: 120px;">고객명</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px; font-weight: 500;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">이메일</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;"><a href="mailto:${data.customerEmail}" style="color: #10B981; text-decoration: none;">${data.customerEmail}</a></td>
          </tr>
          ${data.customerPhone ? `
          <tr>
            <td style="padding: 12px 16px; color: #6B7280; font-size: 14px;">연락처</td>
            <td style="padding: 12px 16px; color: #1F2937; font-size: 14px;"><a href="tel:${data.customerPhone}" style="color: #10B981; text-decoration: none;">${data.customerPhone}</a></td>
          </tr>
          ` : ''}
        </table>

        <div style="margin-top: 32px; padding: 16px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px;">
          <p style="color: #92400E; margin: 0; font-size: 14px; font-weight: 500;">📞 고객에게 연락이 필요합니다</p>
          <p style="color: #78350F; margin: 8px 0 0 0; font-size: 13px;">빠른 시일 내에 고객에게 연락하여 예약 세부 사항을 확정해 주세요.</p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #F9FAFB; padding: 24px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; margin: 0; font-size: 13px;">Travleap 파트너 알림</p>
        <p style="color: #9CA3AF; margin: 8px 0 0 0; font-size: 12px;">이 이메일은 자동으로 발송되었습니다</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * 벤더(업체)용 환불 알림 템플릿
 */
function getVendorRefundNotificationTemplate(data) {
  const subject = `[Travleap] 주문 취소 - ${data.orderNumber}`;

  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>주문 취소 알림</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">🔄 주문 취소</h1>
        <p style="color: #FEE2E2; margin: 10px 0 0 0; font-size: 14px;">주문이 취소되었습니다</p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="color: #1F2937; margin: 0 0 24px 0; font-size: 16px;">안녕하세요 <strong>${data.vendorName}</strong>님,</p>
        <p style="color: #6B7280; margin: 0 0 32px 0; font-size: 14px;">다음 주문이 취소되었습니다.</p>

        <h2 style="color: #1F2937; margin: 0 0 24px 0; font-size: 18px; font-weight: 600;">취소 정보</h2>

        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; width: 120px;">주문번호</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px; font-weight: 500;">${data.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">상품명</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;">${data.productName || '취소된 상품'}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">원 결제금액</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">₩${(data.originalAmount || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">환불금액</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #EF4444; font-size: 18px; font-weight: 700;">₩${(data.refundAmount || 0).toLocaleString()}</td>
          </tr>
          ${data.refundReason ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px;">취소사유</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;">${data.refundReason}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 12px 0; color: #6B7280; font-size: 14px;">처리시간</td>
            <td style="padding: 12px 0; color: #1F2937; font-size: 14px;">${data.refundedAt || new Date().toLocaleString('ko-KR')}</td>
          </tr>
        </table>

        <h2 style="color: #1F2937; margin: 32px 0 24px 0; font-size: 18px; font-weight: 600;">고객 정보</h2>

        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse; background-color: #F9FAFB; border-radius: 8px;">
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; width: 120px;">고객명</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #E5E7EB; color: #1F2937; font-size: 14px;">${data.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #6B7280; font-size: 14px;">이메일</td>
            <td style="padding: 12px 16px; color: #1F2937; font-size: 14px;">${data.customerEmail}</td>
          </tr>
        </table>

        <div style="margin-top: 32px; padding: 16px; background-color: #FEE2E2; border-left: 4px solid #EF4444; border-radius: 4px;">
          <p style="color: #991B1B; margin: 0; font-size: 14px; font-weight: 500;">ℹ️ 예약이 취소되었습니다</p>
          <p style="color: #7F1D1D; margin: 8px 0 0 0; font-size: 13px;">해당 예약 건은 더 이상 유효하지 않습니다.</p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #F9FAFB; padding: 24px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; margin: 0; font-size: 13px;">Travleap 파트너 알림</p>
        <p style="color: #9CA3AF; margin: 8px 0 0 0; font-size: 12px;">이 이메일은 자동으로 발송되었습니다</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * 벤더(업체)에게 알림 이메일 발송
 */
async function sendVendorNotification({ vendorEmail, subject, html }) {
  try {
    // 벤더 이메일이 없으면 발송 안 함
    if (!vendorEmail) {
      console.log('ℹ️  [Vendor Notification] No vendor email provided');
      return { success: false, reason: 'no_vendor_email' };
    }

    // SendGrid API 키가 없으면 로그만 출력
    if (!process.env.SENDGRID_API_KEY) {
      console.log('⚠️  [Vendor Notification] SENDGRID_API_KEY not configured');
      console.log('📧 [Vendor Notification - DRY RUN] Would send to:', vendorEmail);
      console.log('📧 Subject:', subject);
      return { success: false, reason: 'no_api_key' };
    }

    const settings = await getEmailSettings();

    // 벤더 이메일로 발송
    const msg = {
      to: vendorEmail,
      from: settings.smtpFrom,
      subject,
      html,
    };

    await sgMail.send(msg);
    console.log(`✅ [Vendor Notification] Email sent to vendor: ${vendorEmail}`);

    return { success: true, recipient: vendorEmail };
  } catch (error) {
    console.error('❌ [Vendor Notification] Failed to send:', error);
    if (error.response) {
      console.error('SendGrid error:', error.response.body);
    }
    return { success: false, error: error.message };
  }
}

/**
 * 관리자에게 알림 이메일 발송
 */
async function sendAdminNotification({ subject, html, notificationType }) {
  try {
    const settings = await getEmailSettings();

    // 전체 알림이 비활성화되어 있으면 발송 안 함
    if (!settings.emailNotificationsEnabled) {
      console.log('ℹ️  [Admin Notification] Email notifications are disabled');
      return { success: false, reason: 'notifications_disabled' };
    }

    // 특정 알림 타입이 비활성화되어 있으면 발송 안 함
    if (
      (notificationType === 'order' && !settings.orderNotificationEnabled) ||
      (notificationType === 'refund' && !settings.refundNotificationEnabled) ||
      (notificationType === 'payment' && !settings.paymentNotificationEnabled)
    ) {
      console.log(`ℹ️  [Admin Notification] ${notificationType} notifications are disabled`);
      return { success: false, reason: `${notificationType}_notifications_disabled` };
    }

    // 관리자 이메일이 없으면 발송 안 함
    if (settings.adminEmails.length === 0) {
      console.log('⚠️  [Admin Notification] No admin emails configured');
      return { success: false, reason: 'no_admin_emails' };
    }

    // SendGrid API 키가 없으면 로그만 출력
    if (!process.env.SENDGRID_API_KEY) {
      console.log('⚠️  [Admin Notification] SENDGRID_API_KEY not configured');
      console.log('📧 [Admin Notification - DRY RUN] Would send to:', settings.adminEmails);
      console.log('📧 Subject:', subject);
      return { success: false, reason: 'no_api_key' };
    }

    // 관리자 이메일로 발송
    const msg = {
      to: settings.adminEmails,
      from: settings.smtpFrom,
      subject,
      html,
    };

    await sgMail.send(msg);
    console.log(`✅ [Admin Notification] Email sent to ${settings.adminEmails.length} admin(s): ${settings.adminEmails.join(', ')}`);

    return { success: true, recipients: settings.adminEmails };
  } catch (error) {
    console.error('❌ [Admin Notification] Failed to send:', error);
    if (error.response) {
      console.error('SendGrid error:', error.response.body);
    }
    return { success: false, error: error.message };
  }
}

/**
 * API Handler
 */
module.exports = async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, data'
      });
    }

    console.log(`📧 [Notification API] 알림 발송 요청: ${type}`);

    let results = [];

    // 결제 완료 알림
    if (type === 'payment_success') {
      const emailData = {
        ...data,
        subtotal: data.subtotal?.toLocaleString() || '0',
        deliveryFee: data.deliveryFee?.toLocaleString() || '',
        couponDiscount: data.couponDiscount?.toLocaleString() || '',
        totalAmount: data.totalAmount?.toLocaleString() || '0'
      };

      // 고객 이메일 발송
      if (data.customerEmail) {
        const emailResult = await sendEmail({
          to: data.customerEmail,
          subject: '[Travleap] 결제가 완료되었습니다',
          htmlTemplate: PAYMENT_SUCCESS_TEMPLATE,
          data: emailData
        });
        results.push({ channel: 'email', target: 'customer', ...emailResult });
      }

      // 고객 SMS 발송
      if (data.customerPhone) {
        const smsMessage = renderTemplate(PAYMENT_SUCCESS_SMS, emailData);
        const smsResult = await sendSMS({
          to: data.customerPhone,
          message: smsMessage
        });
        results.push({ channel: 'sms', target: 'customer', ...smsResult });
      }

      // ✅ 관리자 이메일 알림 발송
      try {
        const adminTemplate = getAdminOrderNotificationTemplate({
          orderNumber: data.orderNumber,
          userName: data.customerName,
          userEmail: data.customerEmail,
          productName: data.productName,
          amount: data.totalAmount,
          paymentMethod: data.paymentMethod,
          createdAt: data.orderDate,
        });

        const adminResult = await sendAdminNotification({
          subject: adminTemplate.subject,
          html: adminTemplate.html,
          notificationType: 'order'
        });

        results.push({ channel: 'email', target: 'admin', ...adminResult });
        console.log(`📧 [Admin Notification] Order notification result:`, adminResult);
      } catch (adminError) {
        console.error('❌ [Admin Notification] Failed to send order notification:', adminError);
        results.push({ channel: 'email', target: 'admin', success: false, error: adminError.message });
      }

      // ✅ 벤더(업체) 이메일 알림 발송 (새로 추가)
      try {
        const connection = connect({ url: process.env.DATABASE_URL });
        let listingId = data.listingId;

        // listingId가 없으면 orderNumber로 booking에서 조회
        if (!listingId && data.orderNumber) {
          try {
            // ORDER_로 시작하면 장바구니 주문 (여러 booking)
            // BK로 시작하면 단일 예약
            // RC로 시작하면 렌트카 (listing이 없을 수 있음)

            if (data.orderNumber.startsWith('BK')) {
              // 단일 예약 - booking에서 listing_id 조회
              const bookingResult = await connection.execute(`
                SELECT listing_id FROM bookings
                WHERE booking_number = ? OR order_number = ?
                LIMIT 1
              `, [data.orderNumber, data.orderNumber]);

              if (bookingResult.rows && bookingResult.rows.length > 0) {
                listingId = bookingResult.rows[0].listing_id;
                console.log(`📧 [Vendor Notification] Found listing_id=${listingId} from booking`);
              }
            } else if (data.orderNumber.startsWith('ORDER_')) {
              // 장바구니 주문 - 첫 번째 booking의 listing_id 사용
              const bookingResult = await connection.execute(`
                SELECT listing_id FROM bookings
                WHERE order_number = ?
                LIMIT 1
              `, [data.orderNumber]);

              if (bookingResult.rows && bookingResult.rows.length > 0) {
                listingId = bookingResult.rows[0].listing_id;
                console.log(`📧 [Vendor Notification] Found listing_id=${listingId} from cart order (first item)`);
              }
            }
          } catch (lookupError) {
            console.error('❌ [Vendor Notification] Failed to lookup listing_id:', lookupError);
          }
        }

        // listing_id가 있으면 partner 정보 조회하여 알림 발송
        if (listingId) {
          const partnerResult = await connection.execute(`
            SELECT p.business_name, p.email
            FROM listings l
            LEFT JOIN partners p ON l.partner_id = p.id
            WHERE l.id = ? AND p.email IS NOT NULL AND p.email != ''
            LIMIT 1
          `, [listingId]);

          if (partnerResult.rows && partnerResult.rows.length > 0) {
            const partner = partnerResult.rows[0];

            console.log(`📧 [Vendor Notification] Sending to vendor: ${partner.business_name} (${partner.email})`);

            const vendorTemplate = getVendorOrderNotificationTemplate({
              orderNumber: data.orderNumber,
              vendorName: partner.business_name,
              productName: data.productName,
              amount: data.totalAmount,
              customerName: data.customerName,
              customerEmail: data.customerEmail,
              customerPhone: data.customerPhone,
              createdAt: data.orderDate,
            });

            const vendorResult = await sendVendorNotification({
              vendorEmail: partner.email,
              subject: vendorTemplate.subject,
              html: vendorTemplate.html
            });

            results.push({ channel: 'email', target: 'vendor', ...vendorResult });
            console.log(`📧 [Vendor Notification] Order notification result:`, vendorResult);
          } else {
            console.log(`ℹ️  [Vendor Notification] No vendor email found for listing_id=${listingId}`);
            results.push({ channel: 'email', target: 'vendor', success: false, reason: 'no_vendor_found' });
          }
        } else {
          console.log(`ℹ️  [Vendor Notification] No listing_id found, skipping vendor notification`);
          results.push({ channel: 'email', target: 'vendor', success: false, reason: 'no_listing_id' });
        }
      } catch (vendorError) {
        console.error('❌ [Vendor Notification] Failed to send order notification:', vendorError);
        results.push({ channel: 'email', target: 'vendor', success: false, error: vendorError.message });
      }
    }

    // 환불 완료 알림
    else if (type === 'refund_processed') {
      const emailData = {
        ...data,
        originalAmount: data.originalAmount?.toLocaleString() || '0',
        cancellationFee: data.cancellationFee?.toLocaleString() || '',
        refundAmount: data.refundAmount?.toLocaleString() || '0'
      };

      // 고객 이메일 발송
      if (data.customerEmail) {
        const emailResult = await sendEmail({
          to: data.customerEmail,
          subject: '[Travleap] 환불이 완료되었습니다',
          htmlTemplate: REFUND_PROCESSED_TEMPLATE,
          data: emailData
        });
        results.push({ channel: 'email', target: 'customer', ...emailResult });
      }

      // 고객 SMS 발송
      if (data.customerPhone) {
        const smsMessage = renderTemplate(REFUND_PROCESSED_SMS, emailData);
        const smsResult = await sendSMS({
          to: data.customerPhone,
          message: smsMessage
        });
        results.push({ channel: 'sms', target: 'customer', ...smsResult });
      }

      // ✅ 관리자 이메일 알림 발송
      try {
        const adminTemplate = getAdminRefundNotificationTemplate({
          orderNumber: data.orderNumber,
          userName: data.customerName,
          userEmail: data.customerEmail,
          productName: data.productName,
          originalAmount: parseInt(data.originalAmount) || 0,
          refundAmount: parseInt(data.refundAmount) || 0,
          refundReason: data.refundReason,
          refundedAt: data.refundProcessedDate,
        });

        const adminResult = await sendAdminNotification({
          subject: adminTemplate.subject,
          html: adminTemplate.html,
          notificationType: 'refund'
        });

        results.push({ channel: 'email', target: 'admin', ...adminResult });
        console.log(`📧 [Admin Notification] Refund notification result:`, adminResult);
      } catch (adminError) {
        console.error('❌ [Admin Notification] Failed to send refund notification:', adminError);
        results.push({ channel: 'email', target: 'admin', success: false, error: adminError.message });
      }

      // ✅ 벤더(업체) 이메일 알림 발송 (새로 추가)
      try {
        const connection = connect({ url: process.env.DATABASE_URL });
        let listingId = data.listingId;

        // listingId가 없으면 orderNumber로 booking에서 조회
        if (!listingId && data.orderNumber) {
          try {
            if (data.orderNumber.startsWith('BK')) {
              // 단일 예약
              const bookingResult = await connection.execute(`
                SELECT listing_id FROM bookings
                WHERE booking_number = ? OR order_number = ?
                LIMIT 1
              `, [data.orderNumber, data.orderNumber]);

              if (bookingResult.rows && bookingResult.rows.length > 0) {
                listingId = bookingResult.rows[0].listing_id;
                console.log(`📧 [Vendor Notification] Found listing_id=${listingId} from booking (refund)`);
              }
            } else if (data.orderNumber.startsWith('ORDER_')) {
              // 장바구니 주문
              const bookingResult = await connection.execute(`
                SELECT listing_id FROM bookings
                WHERE order_number = ?
                LIMIT 1
              `, [data.orderNumber]);

              if (bookingResult.rows && bookingResult.rows.length > 0) {
                listingId = bookingResult.rows[0].listing_id;
                console.log(`📧 [Vendor Notification] Found listing_id=${listingId} from cart order (refund)`);
              }
            }
          } catch (lookupError) {
            console.error('❌ [Vendor Notification] Failed to lookup listing_id (refund):', lookupError);
          }
        }

        // listing_id가 있으면 partner 정보 조회하여 알림 발송
        if (listingId) {
          const partnerResult = await connection.execute(`
            SELECT p.business_name, p.email
            FROM listings l
            LEFT JOIN partners p ON l.partner_id = p.id
            WHERE l.id = ? AND p.email IS NOT NULL AND p.email != ''
            LIMIT 1
          `, [listingId]);

          if (partnerResult.rows && partnerResult.rows.length > 0) {
            const partner = partnerResult.rows[0];

            console.log(`📧 [Vendor Notification] Sending refund notification to vendor: ${partner.business_name} (${partner.email})`);

            const vendorTemplate = getVendorRefundNotificationTemplate({
              orderNumber: data.orderNumber,
              vendorName: partner.business_name,
              productName: data.productName,
              originalAmount: parseInt(data.originalAmount) || 0,
              refundAmount: parseInt(data.refundAmount) || 0,
              refundReason: data.refundReason,
              customerName: data.customerName,
              customerEmail: data.customerEmail,
              refundedAt: data.refundProcessedDate,
            });

            const vendorResult = await sendVendorNotification({
              vendorEmail: partner.email,
              subject: vendorTemplate.subject,
              html: vendorTemplate.html
            });

            results.push({ channel: 'email', target: 'vendor', ...vendorResult });
            console.log(`📧 [Vendor Notification] Refund notification result:`, vendorResult);
          } else {
            console.log(`ℹ️  [Vendor Notification] No vendor email found for listing_id=${listingId} (refund)`);
            results.push({ channel: 'email', target: 'vendor', success: false, reason: 'no_vendor_found' });
          }
        } else {
          console.log(`ℹ️  [Vendor Notification] No listing_id found, skipping vendor notification (refund)`);
          results.push({ channel: 'email', target: 'vendor', success: false, reason: 'no_listing_id' });
        }
      } catch (vendorError) {
        console.error('❌ [Vendor Notification] Failed to send refund notification:', vendorError);
        results.push({ channel: 'email', target: 'vendor', success: false, error: vendorError.message });
      }
    }

    else {
      return res.status(400).json({
        success: false,
        message: `Unknown notification type: ${type}`
      });
    }

    // 결과 반환
    const allSuccessful = results.every(r => r.success);
    return res.status(200).json({
      success: allSuccessful,
      results,
      message: allSuccessful ? 'All notifications sent successfully' : 'Some notifications failed'
    });

  } catch (error) {
    console.error('❌ [Notification API] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
