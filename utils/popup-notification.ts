/**
 * 팝업 상품 결제 알림 서비스
 * - 주문 확인, 결제 완료, 배송 시작, 배송 완료, 환불 완료 알림
 */

import { getDatabase } from './database.js';

export interface PopupOrderNotification {
  orderId: string;
  userId: number;
  userEmail: string;
  userName: string;
  userPhone?: string;
  orderAmount: number;
  shippingFee: number;
  trackingNumber?: string;
  courierCompany?: string;
  refundAmount?: number;
}

/**
 * 알림 로그 저장
 */
async function saveNotificationLog(
  userId: number | null,
  notificationType: 'email' | 'sms',
  recipient: string,
  subject: string | null,
  message: string,
  template: string,
  orderId: string
): Promise<number> {
  const db = getDatabase();

  try {
    const result = await db.execute(`
      INSERT INTO notification_logs (user_id, notification_type, recipient, subject, message, template_name, related_order_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [userId, notificationType, recipient, subject, message, template, orderId]);

    return result.insertId;
  } catch (error) {
    console.error('❌ [Notification] Failed to save log:', error);
    return 0;
  }
}

/**
 * 알림 로그 상태 업데이트
 */
async function updateNotificationLog(
  logId: number,
  status: 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  const db = getDatabase();

  try {
    if (status === 'sent') {
      await db.execute(`
        UPDATE notification_logs SET status = 'sent', sent_at = NOW() WHERE id = ?
      `, [logId]);
    } else {
      await db.execute(`
        UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?
      `, [errorMessage, logId]);
    }
  } catch (error) {
    console.error('❌ [Notification] Failed to update log:', error);
  }
}

/**
 * 이메일 발송 (실제 구현 시 SendGrid/AWS SES 연동)
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  // 환경 변수 체크
  const emailEnabled = process.env.EMAIL_SERVICE_KEY;

  if (!emailEnabled) {
    console.log(`📧 [Email] (Mock) Would send to ${to}: ${subject}`);
    return true; // 개발 환경에서는 true 반환
  }

  try {
    // TODO: SendGrid/AWS SES 연동
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.EMAIL_SERVICE_KEY);
    // await sgMail.send({ to, from: 'noreply@travleap.com', subject, html });

    console.log(`✅ [Email] Sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('❌ [Email] Send failed:', error);
    return false;
  }
}

/**
 * SMS 발송 (실제 구현 시 Naver Cloud/Twilio 연동)
 */
async function sendSMS(to: string, message: string): Promise<boolean> {
  // 환경 변수 체크
  const smsEnabled = process.env.SMS_SERVICE_KEY;

  if (!smsEnabled) {
    console.log(`📱 [SMS] (Mock) Would send to ${to}: ${message.substring(0, 50)}...`);
    return true; // 개발 환경에서는 true 반환
  }

  try {
    // TODO: Naver Cloud/Twilio 연동
    // const axios = require('axios');
    // await axios.post('https://sens.apigw.ntruss.com/sms/v2/services/...', { ... });

    console.log(`✅ [SMS] Sent to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ [SMS] Send failed:', error);
    return false;
  }
}

/**
 * 주문 확인 알림 (주문 생성 시)
 */
export async function notifyOrderConfirmed(data: PopupOrderNotification): Promise<void> {
  const subject = `[어썸플랜] 주문이 접수되었습니다 (${data.orderId})`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 주문 접수 완료</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.userName}</strong>님!</p>
      <p>주문이 정상적으로 접수되었습니다.</p>

      <div class="info-box">
        <p><strong>주문번호:</strong> ${data.orderId}</p>
        <p><strong>주문금액:</strong> ${data.orderAmount.toLocaleString()}원</p>
        <p><strong>배송비:</strong> ${data.shippingFee.toLocaleString()}원</p>
        <p><strong>총 결제금액:</strong> ${(data.orderAmount + data.shippingFee).toLocaleString()}원</p>
      </div>

      <p>배송 준비가 완료되면 다시 알려드리겠습니다.</p>

      <div class="footer">
        <p>감사합니다.</p>
        <p>- 어썸플랜 드림</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const logId = await saveNotificationLog(
    data.userId,
    'email',
    data.userEmail,
    subject,
    html,
    'order_confirmed',
    data.orderId
  );

  const sent = await sendEmail(data.userEmail, subject, html);
  await updateNotificationLog(logId, sent ? 'sent' : 'failed', sent ? undefined : 'Email send failed');
}

/**
 * 결제 완료 알림 (결제 성공 시)
 */
export async function notifyPaymentCompleted(data: PopupOrderNotification): Promise<void> {
  const subject = `[어썸플랜] 결제가 완료되었습니다 (${data.orderId})`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ 결제 완료</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.userName}</strong>님!</p>
      <p>결제가 정상적으로 완료되었습니다.</p>

      <div class="info-box">
        <p><strong>주문번호:</strong> ${data.orderId}</p>
        <p><strong>결제금액:</strong> ${(data.orderAmount + data.shippingFee).toLocaleString()}원</p>
      </div>

      <p>주문 상품을 준비하여 빠르게 배송해드리겠습니다.</p>

      <div class="footer">
        <p>감사합니다.</p>
        <p>- 어썸플랜 드림</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const logId = await saveNotificationLog(
    data.userId,
    'email',
    data.userEmail,
    subject,
    html,
    'payment_completed',
    data.orderId
  );

  const sent = await sendEmail(data.userEmail, subject, html);
  await updateNotificationLog(logId, sent ? 'sent' : 'failed');
}

/**
 * 배송 시작 알림 (송장 번호 입력 시)
 */
export async function notifyShippingStarted(data: PopupOrderNotification): Promise<void> {
  const trackingUrl = `https://tracker.delivery/#/${data.courierCompany}/${data.trackingNumber}`;
  const subject = `[어썸플랜] 상품이 발송되었습니다 (${data.orderId})`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚚 배송 시작</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.userName}</strong>님!</p>
      <p>주문하신 상품이 발송되었습니다.</p>

      <div class="info-box">
        <p><strong>주문번호:</strong> ${data.orderId}</p>
        <p><strong>택배사:</strong> ${data.courierCompany}</p>
        <p><strong>송장번호:</strong> ${data.trackingNumber}</p>
      </div>

      <center>
        <a href="${trackingUrl}" class="button">배송 조회하기</a>
      </center>

      <div class="footer">
        <p>감사합니다.</p>
        <p>- 어썸플랜 드림</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // 이메일 발송
  const emailLogId = await saveNotificationLog(
    data.userId,
    'email',
    data.userEmail,
    subject,
    html,
    'shipping_started',
    data.orderId
  );

  const emailSent = await sendEmail(data.userEmail, subject, html);
  await updateNotificationLog(emailLogId, emailSent ? 'sent' : 'failed');

  // SMS 발송 (선택사항)
  if (data.userPhone) {
    const smsMessage = `[어썸플랜] ${data.userName}님, 주문하신 상품이 발송되었습니다.\n택배사: ${data.courierCompany}\n송장번호: ${data.trackingNumber}\n배송조회: ${trackingUrl}`;

    const smsLogId = await saveNotificationLog(
      data.userId,
      'sms',
      data.userPhone,
      null,
      smsMessage,
      'shipping_started',
      data.orderId
    );

    const smsSent = await sendSMS(data.userPhone, smsMessage);
    await updateNotificationLog(smsLogId, smsSent ? 'sent' : 'failed');
  }
}

/**
 * 배송 완료 알림
 */
export async function notifyShippingDelivered(data: PopupOrderNotification): Promise<void> {
  const subject = `[어썸플랜] 상품이 배송 완료되었습니다 (${data.orderId})`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ 배송 완료</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.userName}</strong>님!</p>
      <p>주문하신 상품이 배송 완료되었습니다.</p>

      <p>상품에 만족하셨다면 리뷰를 남겨주세요!</p>

      <div class="footer">
        <p>감사합니다.</p>
        <p>- 어썸플랜 드림</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const logId = await saveNotificationLog(
    data.userId,
    'email',
    data.userEmail,
    subject,
    html,
    'shipping_delivered',
    data.orderId
  );

  const sent = await sendEmail(data.userEmail, subject, html);
  await updateNotificationLog(logId, sent ? 'sent' : 'failed');
}

/**
 * 환불 완료 알림
 */
export async function notifyRefundCompleted(data: PopupOrderNotification): Promise<void> {
  const subject = `[어썸플랜] 환불이 완료되었습니다 (${data.orderId})`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 환불 완료</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.userName}</strong>님!</p>
      <p>환불이 정상적으로 완료되었습니다.</p>

      <div class="info-box">
        <p><strong>주문번호:</strong> ${data.orderId}</p>
        <p><strong>환불금액:</strong> ${(data.refundAmount || 0).toLocaleString()}원</p>
      </div>

      <p>환불 금액은 영업일 기준 3~5일 내에 입금됩니다.</p>

      <div class="footer">
        <p>감사합니다.</p>
        <p>- 어썸플랜 드림</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const logId = await saveNotificationLog(
    data.userId,
    'email',
    data.userEmail,
    subject,
    html,
    'refund_completed',
    data.orderId
  );

  const sent = await sendEmail(data.userEmail, subject, html);
  await updateNotificationLog(logId, sent ? 'sent' : 'failed');
}
