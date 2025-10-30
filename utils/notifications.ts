/**
 * 알림 시스템 (Email & SMS)
 * Phase 7-4: Notification System
 *
 * 기능:
 * - 이메일 알림 (예약 확인, 취소, 리마인더 등)
 * - SMS 알림 (예약 확인, 픽업 안내 등)
 * - 템플릿 기반 메시지
 * - 큐잉 및 재시도 로직
 * - 알림 이력 추적
 */

import { logger } from './logger';
import { db } from './database.js';
import sgMail from '@sendgrid/mail';

// SendGrid API 키 설정
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// ============================================
// 알림 타입 정의
// ============================================

export enum NotificationType {
  // 예약 관련
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_REMINDER = 'booking_reminder',
  PICKUP_REMINDER = 'pickup_reminder',
  RETURN_REMINDER = 'return_reminder',

  // 결제 관련
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_PROCESSED = 'refund_processed',

  // 리뷰 관련
  REVIEW_REQUEST = 'review_request',

  // 시스템 알림
  VENDOR_APPROVED = 'vendor_approved',
  VENDOR_REJECTED = 'vendor_rejected'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

export interface NotificationTemplate {
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string; // Email only
  template: string;
}

export interface NotificationData {
  type: NotificationType;
  channel: NotificationChannel;
  recipient: {
    email?: string;
    phone?: string;
    userId?: number;
  };
  data: Record<string, any>;
}

// ============================================
// 이메일 템플릿
// ============================================

const EMAIL_TEMPLATES: Record<NotificationType, string> = {
  [NotificationType.BOOKING_CONFIRMED]: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body>
  <h2>🎉 예약이 확정되었습니다!</h2>
  <p>안녕하세요 {{customerName}}님,</p>
  <p>렌트카 예약이 성공적으로 확정되었습니다.</p>

  <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
    <h3>예약 정보</h3>
    <p><strong>예약 번호:</strong> {{bookingNumber}}</p>
    <p><strong>차량:</strong> {{vehicleName}}</p>
    <p><strong>픽업:</strong> {{pickupDate}} {{pickupTime}} - {{pickupLocation}}</p>
    <p><strong>반납:</strong> {{dropoffDate}} {{dropoffTime}} - {{dropoffLocation}}</p>
    <p><strong>총 금액:</strong> ₩{{totalAmount}}</p>
  </div>

  <p>픽업 시간 24시간 전에 다시 한 번 안내드리겠습니다.</p>

  <p>감사합니다,<br>Travleap 렌트카팀</p>
</body>
</html>
  `,

  [NotificationType.BOOKING_CANCELLED]: `
<!DOCTYPE html>
<html>
<body>
  <h2>예약이 취소되었습니다</h2>
  <p>안녕하세요 {{customerName}}님,</p>
  <p>예약번호 {{bookingNumber}}가 취소되었습니다.</p>

  <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
    <p><strong>취소 수수료:</strong> ₩{{cancellationFee}}</p>
    <p><strong>환불 금액:</strong> ₩{{refundAmount}}</p>
    <p><strong>환불 예정일:</strong> {{refundDate}}</p>
  </div>

  <p>문의사항이 있으시면 고객센터로 연락주시기 바랍니다.</p>
  <p>감사합니다,<br>Travleap 렌트카팀</p>
</body>
</html>
  `,

  [NotificationType.PICKUP_REMINDER]: `
<!DOCTYPE html>
<html>
<body>
  <h2>🚗 내일 픽업 예정입니다!</h2>
  <p>안녕하세요 {{customerName}}님,</p>
  <p>내일 픽업 예정인 예약에 대해 안내드립니다.</p>

  <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
    <p><strong>픽업 일시:</strong> {{pickupDate}} {{pickupTime}}</p>
    <p><strong>픽업 장소:</strong> {{pickupLocation}}</p>
    <p><strong>차량:</strong> {{vehicleName}}</p>
  </div>

  <h3>체크리스트</h3>
  <ul>
    <li>✓ 운전면허증</li>
    <li>✓ 신용카드 (보증금)</li>
    <li>✓ 예약 확인서</li>
  </ul>

  <p>즐거운 여행 되시기 바랍니다!</p>
  <p>Travleap 렌트카팀</p>
</body>
</html>
  `,

  [NotificationType.REVIEW_REQUEST]: `
<!DOCTYPE html>
<html>
<body>
  <h2>⭐ 이용 후기를 남겨주세요</h2>
  <p>안녕하세요 {{customerName}}님,</p>
  <p>Travleap 렌트카를 이용해주셔서 감사합니다.</p>
  <p>소중한 후기를 남겨주시면 더 나은 서비스로 보답하겠습니다.</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="{{reviewUrl}}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">
      후기 작성하기
    </a>
  </div>

  <p>감사합니다,<br>Travleap 렌트카팀</p>
</body>
</html>
  `,

  [NotificationType.PAYMENT_SUCCESS]: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body>
  <h2>💳 결제가 완료되었습니다</h2>
  <p>안녕하세요 {{customerName}}님,</p>
  <p>주문하신 상품의 결제가 정상적으로 완료되었습니다.</p>

  <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
    <h3>주문 정보</h3>
    <p><strong>주문번호:</strong> {{orderNumber}}</p>
    <p><strong>주문일시:</strong> {{orderDate}}</p>
    <p><strong>상품명:</strong> {{productName}}</p>
    {{#if quantity}}
    <p><strong>수량:</strong> {{quantity}}개</p>
    {{/if}}
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

  <div style="margin: 30px 0;">
    <a href="{{orderDetailUrl}}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
      주문 상세 확인
    </a>
  </div>

  <p style="color: #666; font-size: 14px; margin-top: 30px;">
    문의사항이 있으시면 고객센터(1234-5678)로 연락주시기 바랍니다.
  </p>

  <p>감사합니다,<br>Travleap 팀</p>
</body>
</html>
  `,

  [NotificationType.PAYMENT_FAILED]: `
<!DOCTYPE html>
<html>
<body>
  <h2>❌ 결제에 실패했습니다</h2>
  <p>안녕하세요 {{customerName}}님,</p>
  <p>주문하신 상품의 결제 처리 중 문제가 발생했습니다.</p>

  <div style="background: #ffebee; padding: 20px; margin: 20px 0;">
    <p><strong>주문번호:</strong> {{orderNumber}}</p>
    <p><strong>실패 사유:</strong> {{failureReason}}</p>
  </div>

  <p>다시 시도하시려면 아래 버튼을 눌러주세요.</p>

  <div style="margin: 30px 0;">
    <a href="{{retryUrl}}" style="background: #f44336; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
      다시 결제하기
    </a>
  </div>

  <p style="color: #666; font-size: 14px;">
    문제가 계속될 경우 고객센터(1234-5678)로 문의해주세요.
  </p>

  <p>감사합니다,<br>Travleap 팀</p>
</body>
</html>
  `,

  [NotificationType.REFUND_PROCESSED]: `
<!DOCTYPE html>
<html>
<body>
  <h2>💰 환불이 완료되었습니다</h2>
  <p>안녕하세요 {{customerName}}님,</p>
  <p>요청하신 환불이 정상적으로 처리되었습니다.</p>

  <div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
    <h3>환불 정보</h3>
    <p><strong>주문번호:</strong> {{orderNumber}}</p>
    <p><strong>환불 요청일:</strong> {{refundRequestDate}}</p>
    <p><strong>환불 처리일:</strong> {{refundProcessedDate}}</p>
  </div>

  <div style="background: #e3f2fd; padding: 20px; margin: 20px 0;">
    <h3>환불 금액</h3>
    <p><strong>원 결제 금액:</strong> ₩{{originalAmount}}</p>
    {{#if cancellationFee}}
    <p><strong>취소 수수료:</strong> -₩{{cancellationFee}}</p>
    {{/if}}
    {{#if returnShippingFee}}
    <p><strong>반송 배송비:</strong> -₩{{returnShippingFee}}</p>
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
    환불 금액은 결제하신 수단으로 {{refundDays}}일 이내에 입금됩니다.<br>
    (카드 결제: 3-7 영업일, 계좌이체: 1-3 영업일)
  </p>

  <p style="color: #666; font-size: 14px; margin-top: 30px;">
    문의사항이 있으시면 고객센터(1234-5678)로 연락주시기 바랍니다.
  </p>

  <p>감사합니다,<br>Travleap 팀</p>
</body>
</html>
  `,
  [NotificationType.BOOKING_REMINDER]: '',
  [NotificationType.RETURN_REMINDER]: '',
  [NotificationType.VENDOR_APPROVED]: '',
  [NotificationType.VENDOR_REJECTED]: ''
};

// ============================================
// SMS 템플릿
// ============================================

const SMS_TEMPLATES: Record<NotificationType, string> = {
  [NotificationType.BOOKING_CONFIRMED]: `[Travleap] {{customerName}}님, 예약이 확정되었습니다. 예약번호: {{bookingNumber}}, 픽업: {{pickupDate}} {{pickupTime}}`,

  [NotificationType.BOOKING_CANCELLED]: `[Travleap] 예약번호 {{bookingNumber}}가 취소되었습니다. 환불금액: ₩{{refundAmount}}`,

  [NotificationType.PICKUP_REMINDER]: `[Travleap] {{customerName}}님, 내일 {{pickupTime}} 픽업 예정입니다. 장소: {{pickupLocation}}`,

  [NotificationType.RETURN_REMINDER]: `[Travleap] {{customerName}}님, 오늘 {{dropoffTime}}까지 차량 반납 부탁드립니다. 장소: {{dropoffLocation}}`,

  [NotificationType.REVIEW_REQUEST]: `[Travleap] 이용해주셔서 감사합니다. 후기 작성: {{reviewUrl}}`,

  [NotificationType.PAYMENT_SUCCESS]: `[Travleap] {{customerName}}님, 결제가 완료되었습니다. 주문번호: {{orderNumber}}, 결제금액: ₩{{totalAmount}} (포인트 {{pointsEarned}}P 적립)`,

  [NotificationType.PAYMENT_FAILED]: `[Travleap] 결제 실패: {{orderNumber}}. 사유: {{failureReason}}. 다시 시도해주세요.`,

  [NotificationType.REFUND_PROCESSED]: `[Travleap] {{customerName}}님, 환불이 완료되었습니다. 주문번호: {{orderNumber}}, 환불금액: ₩{{refundAmount}}. 영업일 기준 {{refundDays}}일 내 입금됩니다.`,
  [NotificationType.BOOKING_REMINDER]: '',
  [NotificationType.VENDOR_APPROVED]: '',
  [NotificationType.VENDOR_REJECTED]: ''
};

// ============================================
// 알림 전송 함수
// ============================================

/**
 * 알림 전송 (통합 인터페이스)
 */
export async function sendNotification(notification: NotificationData): Promise<boolean> {
  try {
    logger.info('Sending notification', {
      type: notification.type,
      channel: notification.channel,
      recipient: notification.recipient
    });

    let result = false;

    switch (notification.channel) {
      case NotificationChannel.EMAIL:
        result = await sendEmail(notification);
        break;
      case NotificationChannel.SMS:
        result = await sendSMS(notification);
        break;
      case NotificationChannel.PUSH:
        result = await sendPushNotification(notification);
        break;
    }

    // 알림 이력 저장
    await saveNotificationHistory(notification, result);

    return result;
  } catch (error) {
    logger.error('Failed to send notification', error as Error, notification);
    await saveNotificationHistory(notification, false, error);
    return false;
  }
}

/**
 * 이메일 전송
 */
async function sendEmail(notification: NotificationData): Promise<boolean> {
  const { recipient, type, data } = notification;

  if (!recipient.email) {
    logger.warn('Email recipient not provided');
    return false;
  }

  // 템플릿 렌더링
  const template = EMAIL_TEMPLATES[type];
  const htmlContent = renderTemplate(template, data);
  const subject = getEmailSubject(type, data);

  // ✅ SendGrid를 사용한 실제 이메일 발송
  try {
    // SendGrid API 키가 설정되어 있지 않으면 로그만 출력
    if (!process.env.SENDGRID_API_KEY) {
      console.log('⚠️ [Email] SENDGRID_API_KEY not configured. Email not sent.');
      console.log('📧 [Email - DRY RUN]:', {
        to: recipient.email,
        from: process.env.EMAIL_FROM || 'noreply@travleap.com',
        subject,
        html: htmlContent.substring(0, 150) + '...'
      });

      // 개발 환경에서는 성공으로 간주
      return process.env.NODE_ENV === 'development';
    }

    // SendGrid로 이메일 발송
    const msg = {
      to: recipient.email,
      from: process.env.EMAIL_FROM || 'noreply@travleap.com', // 발송자 이메일 (SendGrid에서 인증 필요)
      subject,
      html: htmlContent,
      // 텍스트 버전 (HTML을 지원하지 않는 이메일 클라이언트용)
      text: htmlContent.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n')
    };

    await sgMail.send(msg);
    console.log(`✅ [Email] 이메일 발송 성공: ${recipient.email} (${type})`);
    logger.info('Email sent successfully', { to: recipient.email, type });

    return true;
  } catch (error: any) {
    console.error(`❌ [Email] 이메일 발송 실패: ${recipient.email}`, error);
    logger.error('Email sending failed', error as Error, { to: recipient.email, type });

    // SendGrid 에러 처리
    if (error.response) {
      console.error('SendGrid Error Response:', {
        statusCode: error.response.statusCode,
        body: error.response.body
      });
    }

    return false;
  }
}

/**
 * SMS 전송
 */
async function sendSMS(notification: NotificationData): Promise<boolean> {
  const { recipient, type, data } = notification;

  if (!recipient.phone) {
    logger.warn('SMS recipient not provided');
    return false;
  }

  // 템플릿 렌더링
  const template = SMS_TEMPLATES[type];
  const message = renderTemplate(template, data);

  // 전화번호 포맷팅 (010-1234-5678 → 01012345678)
  const formattedPhone = recipient.phone.replace(/[^0-9]/g, '');

  // ✅ Aligo SMS API를 사용한 실제 SMS 발송
  try {
    // SMS API 키가 설정되어 있지 않으면 로그만 출력
    if (!process.env.ALIGO_API_KEY || !process.env.ALIGO_USER_ID || !process.env.SMS_SENDER) {
      console.log('⚠️ [SMS] Aligo SMS not configured (ALIGO_API_KEY, ALIGO_USER_ID, SMS_SENDER required).');
      console.log('📱 [SMS - DRY RUN]:', {
        to: formattedPhone,
        from: process.env.SMS_SENDER || '1234567890',
        message: message.substring(0, 100) + (message.length > 100 ? '...' : '')
      });

      // 개발 환경에서는 성공으로 간주
      return process.env.NODE_ENV === 'development';
    }

    // Aligo SMS API 호출
    const params = new URLSearchParams({
      key: process.env.ALIGO_API_KEY,
      user_id: process.env.ALIGO_USER_ID,
      sender: process.env.SMS_SENDER, // 발신번호 (Aligo에서 등록 필요)
      receiver: formattedPhone,
      msg: message,
      msg_type: message.length > 90 ? 'LMS' : 'SMS', // 90자 초과 시 LMS (장문)
      title: message.length > 90 ? '[Travleap]' : '' // LMS인 경우 제목
    });

    const response = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const result = await response.json();

    // Aligo API 응답 체크
    if (result.result_code === '1') {
      console.log(`✅ [SMS] SMS 발송 성공: ${formattedPhone} (${type})`);
      logger.info('SMS sent successfully', { to: formattedPhone, type, msgId: result.msg_id });
      return true;
    } else {
      console.error(`❌ [SMS] SMS 발송 실패: ${result.message} (code: ${result.result_code})`);
      logger.error('SMS sending failed', new Error(result.message), { to: formattedPhone, type, code: result.result_code });
      return false;
    }
  } catch (error: any) {
    console.error(`❌ [SMS] SMS 발송 실패: ${formattedPhone}`, error);
    logger.error('SMS sending failed', error as Error, { to: formattedPhone, type });
    return false;
  }
}

/**
 * 푸시 알림 전송
 */
async function sendPushNotification(notification: NotificationData): Promise<boolean> {
  const { recipient, type, data } = notification;

  if (!recipient.userId) {
    logger.warn('Push notification userId not provided');
    return false;
  }

  // TODO: 푸시 알림 서비스 연동 (Firebase, OneSignal, etc.)
  console.log('🔔 Push:', { userId: recipient.userId, type, data });

  return true;
}

// ============================================
// 헬퍼 함수
// ============================================

/**
 * 템플릿 렌더링 ({{variable}} 치환 + {{#if}} 조건문 지원)
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;

  // 1. {{#if variable}}...{{/if}} 조건문 처리
  const ifBlockRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  rendered = rendered.replace(ifBlockRegex, (match, variable, content) => {
    // 변수가 존재하고, truthy한 값이면 content 표시
    const value = data[variable];
    if (value !== undefined && value !== null && value !== '' && value !== 0 && value !== false) {
      return content;
    }
    return ''; // 조건 미충족 시 빈 문자열
  });

  // 2. {{variable}} 치환
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value || ''));
  }

  return rendered;
}

/**
 * 이메일 제목 생성
 */
function getEmailSubject(type: NotificationType, data: Record<string, any>): string {
  const subjects: Record<NotificationType, string> = {
    [NotificationType.BOOKING_CONFIRMED]: '[Travleap] 예약이 확정되었습니다',
    [NotificationType.BOOKING_CANCELLED]: '[Travleap] 예약이 취소되었습니다',
    [NotificationType.PICKUP_REMINDER]: '[Travleap] 내일 픽업 예정입니다',
    [NotificationType.RETURN_REMINDER]: '[Travleap] 차량 반납 안내',
    [NotificationType.REVIEW_REQUEST]: '[Travleap] 이용 후기를 남겨주세요',
    [NotificationType.PAYMENT_SUCCESS]: '[Travleap] 결제가 완료되었습니다',
    [NotificationType.PAYMENT_FAILED]: '[Travleap] 결제에 실패했습니다',
    [NotificationType.REFUND_PROCESSED]: '[Travleap] 환불이 처리되었습니다',
    [NotificationType.BOOKING_REMINDER]: '[Travleap] 예약 리마인더',
    [NotificationType.VENDOR_APPROVED]: '[Travleap] 벤더 승인 완료',
    [NotificationType.VENDOR_REJECTED]: '[Travleap] 벤더 승인 거절'
  };

  return subjects[type] || '[Travleap] 알림';
}

/**
 * 알림 이력 저장
 */
async function saveNotificationHistory(
  notification: NotificationData,
  success: boolean,
  error?: any
): Promise<void> {
  try {
    await db.execute(`
      INSERT INTO notification_history (
        type, channel, recipient_email, recipient_phone, recipient_user_id,
        data, success, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      notification.type,
      notification.channel,
      notification.recipient.email || null,
      notification.recipient.phone || null,
      notification.recipient.userId || null,
      JSON.stringify(notification.data),
      success ? 1 : 0,
      error ? String(error) : null
    ]);
  } catch (err) {
    logger.error('Failed to save notification history', err as Error);
  }
}

// ============================================
// 편의 함수 (특정 알림 전송)
// ============================================

/**
 * 예약 확정 알림
 */
export async function sendBookingConfirmation(booking: any): Promise<void> {
  const data = {
    customerName: booking.customer_name,
    bookingNumber: booking.booking_number,
    vehicleName: booking.vehicle_name,
    pickupDate: booking.pickup_date,
    pickupTime: booking.pickup_time,
    pickupLocation: booking.pickup_location,
    dropoffDate: booking.dropoff_date,
    dropoffTime: booking.dropoff_time,
    dropoffLocation: booking.dropoff_location,
    totalAmount: booking.total_krw?.toLocaleString() || '0'
  };

  // 이메일 + SMS 동시 전송
  await Promise.all([
    sendNotification({
      type: NotificationType.BOOKING_CONFIRMED,
      channel: NotificationChannel.EMAIL,
      recipient: { email: booking.customer_email },
      data
    }),
    sendNotification({
      type: NotificationType.BOOKING_CONFIRMED,
      channel: NotificationChannel.SMS,
      recipient: { phone: booking.customer_phone },
      data
    })
  ]);
}

/**
 * 픽업 리마인더
 */
export async function sendPickupReminder(booking: any): Promise<void> {
  const data = {
    customerName: booking.customer_name,
    pickupDate: booking.pickup_date,
    pickupTime: booking.pickup_time,
    pickupLocation: booking.pickup_location,
    vehicleName: booking.vehicle_name
  };

  await sendNotification({
    type: NotificationType.PICKUP_REMINDER,
    channel: NotificationChannel.SMS,
    recipient: { phone: booking.customer_phone },
    data
  });
}

/**
 * 리뷰 요청
 */
export async function sendReviewRequest(booking: any, reviewUrl: string): Promise<void> {
  const data = {
    customerName: booking.customer_name,
    reviewUrl
  };

  await sendNotification({
    type: NotificationType.REVIEW_REQUEST,
    channel: NotificationChannel.EMAIL,
    recipient: { email: booking.customer_email },
    data
  });
}

/**
 * 결제 완료 알림
 */
export async function sendPaymentSuccess(paymentData: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  orderNumber: string;
  orderDate: string;
  productName: string;
  quantity?: number;
  subtotal: number;
  deliveryFee?: number;
  couponDiscount?: number;
  pointsUsed?: number;
  totalAmount: number;
  pointsEarned?: number;
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  orderDetailUrl?: string;
}): Promise<void> {
  const data = {
    ...paymentData,
    subtotal: paymentData.subtotal.toLocaleString(),
    deliveryFee: paymentData.deliveryFee?.toLocaleString() || '0',
    couponDiscount: paymentData.couponDiscount?.toLocaleString() || '0',
    totalAmount: paymentData.totalAmount.toLocaleString(),
    orderDetailUrl: paymentData.orderDetailUrl || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://travleap.com'}/mypage?tab=orders`
  };

  // 이메일 + SMS 동시 전송 (SMS는 전화번호가 있을 경우만)
  const notifications = [
    sendNotification({
      type: NotificationType.PAYMENT_SUCCESS,
      channel: NotificationChannel.EMAIL,
      recipient: { email: paymentData.customerEmail },
      data
    })
  ];

  if (paymentData.customerPhone) {
    notifications.push(
      sendNotification({
        type: NotificationType.PAYMENT_SUCCESS,
        channel: NotificationChannel.SMS,
        recipient: { phone: paymentData.customerPhone },
        data
      })
    );
  }

  await Promise.all(notifications);
}

/**
 * 환불 완료 알림
 */
export async function sendRefundProcessed(refundData: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  orderNumber: string;
  refundRequestDate: string;
  refundProcessedDate: string;
  originalAmount: number;
  cancellationFee?: number;
  returnShippingFee?: number;
  pointsDeducted?: number;
  refundAmount: number;
  pointsRefunded?: number;
  refundDays?: number;
}): Promise<void> {
  const data = {
    ...refundData,
    originalAmount: refundData.originalAmount.toLocaleString(),
    cancellationFee: refundData.cancellationFee?.toLocaleString(),
    returnShippingFee: refundData.returnShippingFee?.toLocaleString(),
    refundAmount: refundData.refundAmount.toLocaleString(),
    refundDays: refundData.refundDays || 7
  };

  // 이메일 + SMS 동시 전송
  const notifications = [
    sendNotification({
      type: NotificationType.REFUND_PROCESSED,
      channel: NotificationChannel.EMAIL,
      recipient: { email: refundData.customerEmail },
      data
    })
  ];

  if (refundData.customerPhone) {
    notifications.push(
      sendNotification({
        type: NotificationType.REFUND_PROCESSED,
        channel: NotificationChannel.SMS,
        recipient: { phone: refundData.customerPhone },
        data
      })
    );
  }

  await Promise.all(notifications);
}

export default {
  NotificationType,
  NotificationChannel,
  sendNotification,
  sendBookingConfirmation,
  sendPickupReminder,
  sendReviewRequest,
  sendPaymentSuccess,
  sendRefundProcessed
};
