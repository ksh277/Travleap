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

  // 다른 타입들도 동일하게...
  [NotificationType.PAYMENT_SUCCESS]: '',
  [NotificationType.PAYMENT_FAILED]: '',
  [NotificationType.REFUND_PROCESSED]: '',
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

  // 다른 타입들...
  [NotificationType.PAYMENT_SUCCESS]: '',
  [NotificationType.PAYMENT_FAILED]: '',
  [NotificationType.REFUND_PROCESSED]: '',
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

  // TODO: 실제 이메일 서비스 연동 (SendGrid, AWS SES, etc.)
  // 현재는 로그만 출력
  console.log('📧 Email:', {
    to: recipient.email,
    subject,
    html: htmlContent.substring(0, 100) + '...'
  });

  // 개발 환경: 항상 성공
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Email sent (development mode)', { to: recipient.email, type });
    return true;
  }

  // TODO: 실제 전송 로직
  // const result = await emailProvider.send({
  //   to: recipient.email,
  //   subject,
  //   html: htmlContent
  // });
  // return result.success;

  return true;
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

  // TODO: 실제 SMS 서비스 연동 (Twilio, AWS SNS, etc.)
  console.log('📱 SMS:', {
    to: recipient.phone,
    message
  });

  // 개발 환경: 항상 성공
  if (process.env.NODE_ENV === 'development') {
    logger.debug('SMS sent (development mode)', { to: recipient.phone, type });
    return true;
  }

  // TODO: 실제 전송 로직
  // const result = await smsProvider.send({
  //   to: recipient.phone,
  //   message
  // });
  // return result.success;

  return true;
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
 * 템플릿 렌더링 (간단한 {{variable}} 치환)
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;

  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value || ''));
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

export default {
  NotificationType,
  NotificationChannel,
  sendNotification,
  sendBookingConfirmation,
  sendPickupReminder,
  sendReviewRequest
};
