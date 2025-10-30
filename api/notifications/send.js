/**
 * 알림 발송 API
 * POST /api/notifications/send
 *
 * 이메일/SMS 알림을 발송하는 통합 API 엔드포인트
 */

const sgMail = require('@sendgrid/mail');

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

      // 이메일 발송
      if (data.customerEmail) {
        const emailResult = await sendEmail({
          to: data.customerEmail,
          subject: '[Travleap] 결제가 완료되었습니다',
          htmlTemplate: PAYMENT_SUCCESS_TEMPLATE,
          data: emailData
        });
        results.push({ channel: 'email', ...emailResult });
      }

      // SMS 발송
      if (data.customerPhone) {
        const smsMessage = renderTemplate(PAYMENT_SUCCESS_SMS, emailData);
        const smsResult = await sendSMS({
          to: data.customerPhone,
          message: smsMessage
        });
        results.push({ channel: 'sms', ...smsResult });
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

      // 이메일 발송
      if (data.customerEmail) {
        const emailResult = await sendEmail({
          to: data.customerEmail,
          subject: '[Travleap] 환불이 완료되었습니다',
          htmlTemplate: REFUND_PROCESSED_TEMPLATE,
          data: emailData
        });
        results.push({ channel: 'email', ...emailResult });
      }

      // SMS 발송
      if (data.customerPhone) {
        const smsMessage = renderTemplate(REFUND_PROCESSED_SMS, emailData);
        const smsResult = await sendSMS({
          to: data.customerPhone,
          message: smsMessage
        });
        results.push({ channel: 'sms', ...smsResult });
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
