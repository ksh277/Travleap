/**
 * 알림 서비스 (이메일 + SMS)
 * EmailJS와 SMS API 연동
 */

import { api } from './api';

interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface SMSNotification {
  to: string;
  message: string;
}

interface BookingNotification {
  bookingId: number;
  userId: number;
  userEmail: string;
  userName: string;
  userPhone?: string;
  vehicleName: string;
  pickupDate: string;
  returnDate: string;
  totalAmount: number;
  vendorName: string;
}

/**
 * 이메일 발송 (EmailJS 사용)
 */
export async function sendEmail(notification: EmailNotification): Promise<void> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.warn('EmailJS 설정이 없습니다. 이메일 발송을 건너뜁니다.');
    return;
  }

  try {
    // EmailJS SDK 동적 로드
    const emailjs = await loadEmailJS();

    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: notification.to,
        subject: notification.subject,
        html_content: notification.html,
        from_name: notification.from || 'Travleap'
      },
      publicKey
    );

    console.log('이메일 발송 성공:', notification.to);
  } catch (error) {
    console.error('이메일 발송 실패:', error);
    throw error;
  }
}

/**
 * SMS 발송 (네이버 클라우드 SMS API 또는 다른 SMS 서비스)
 */
export async function sendSMS(notification: SMSNotification): Promise<void> {
  // SMS API가 설정되어 있지 않으면 스킵
  const smsEnabled = import.meta.env.VITE_SMS_ENABLED === 'true';

  if (!smsEnabled) {
    console.warn('SMS 기능이 비활성화되어 있습니다.');
    return;
  }

  try {
    // SMS API 호출 (서버사이드에서 처리)
    await api.post('/api/notifications/sms', {
      to: notification.to,
      message: notification.message
    });

    console.log('SMS 발송 성공:', notification.to);
  } catch (error) {
    console.error('SMS 발송 실패:', error);
    // SMS 실패는 치명적이지 않으므로 에러를 던지지 않음
  }
}

/**
 * EmailJS SDK 동적 로드
 */
function loadEmailJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).emailjs) {
      resolve((window as any).emailjs);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
    script.async = true;

    script.onload = () => {
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      (window as any).emailjs.init(publicKey);
      resolve((window as any).emailjs);
    };

    script.onerror = () => {
      reject(new Error('EmailJS SDK 로드 실패'));
    };

    document.head.appendChild(script);
  });
}

/**
 * 예약 확정 알림
 */
export async function sendBookingConfirmation(booking: BookingNotification): Promise<void> {
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .booking-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .booking-info table { width: 100%; }
    .booking-info td { padding: 8px 0; }
    .booking-info td:first-child { font-weight: bold; width: 120px; }
    .button { background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚗 렌트카 예약 확정</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${booking.userName}</strong>님!</p>
      <p>렌트카 예약이 확정되었습니다.</p>

      <div class="booking-info">
        <h2>예약 정보</h2>
        <table>
          <tr>
            <td>예약번호</td>
            <td>#${booking.bookingId}</td>
          </tr>
          <tr>
            <td>차량</td>
            <td><strong>${booking.vehicleName}</strong></td>
          </tr>
          <tr>
            <td>업체</td>
            <td>${booking.vendorName}</td>
          </tr>
          <tr>
            <td>픽업 날짜</td>
            <td>${booking.pickupDate}</td>
          </tr>
          <tr>
            <td>반납 날짜</td>
            <td>${booking.returnDate}</td>
          </tr>
          <tr>
            <td>결제 금액</td>
            <td><strong>${booking.totalAmount.toLocaleString()}원</strong></td>
          </tr>
        </table>
      </div>

      <p>픽업 시간 30분 전까지 도착해주세요.</p>
      <p>신분증과 운전면허증을 지참해주시기 바랍니다.</p>

      <center>
        <a href="${window.location.origin}/mypage" class="button">예약 상세보기</a>
      </center>

      <div class="footer">
        <p>문의사항이 있으시면 고객센터로 연락주세요.</p>
        <p>이메일: support@travleap.com | 전화: 1588-0000</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // 이메일 발송
  await sendEmail({
    to: booking.userEmail,
    subject: `[Travleap] 렌트카 예약 확정 - ${booking.vehicleName}`,
    html: emailHtml
  });

  // SMS 발송 (선택사항)
  if (booking.userPhone) {
    const smsMessage = `[Travleap] ${booking.userName}님, ${booking.vehicleName} 예약이 확정되었습니다. 예약번호: #${booking.bookingId}, 픽업일: ${booking.pickupDate}`;
    await sendSMS({
      to: booking.userPhone,
      message: smsMessage
    });
  }

  // DB에 알림 기록 저장
  await saveNotification({
    userId: booking.userId,
    type: 'booking_confirmed',
    title: '예약 확정',
    message: `${booking.vehicleName} 예약이 확정되었습니다.`,
    relatedId: booking.bookingId,
    relatedType: 'booking'
  });
}

/**
 * 예약 취소 알림
 */
export async function sendBookingCancellation(booking: BookingNotification): Promise<void> {
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ 예약 취소 완료</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${booking.userName}</strong>님!</p>
      <p>아래 예약이 취소되었습니다.</p>

      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>예약번호:</strong> #${booking.bookingId}</p>
        <p><strong>차량:</strong> ${booking.vehicleName}</p>
        <p><strong>취소 금액:</strong> ${booking.totalAmount.toLocaleString()}원</p>
      </div>

      <p>환불은 3-5영업일 내에 처리됩니다.</p>

      <div class="footer">
        <p>이용해주셔서 감사합니다.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: booking.userEmail,
    subject: `[Travleap] 예약 취소 완료 - #${booking.bookingId}`,
    html: emailHtml
  });

  if (booking.userPhone) {
    const smsMessage = `[Travleap] 예약번호 #${booking.bookingId} 취소가 완료되었습니다. 환불은 3-5영업일 내에 처리됩니다.`;
    await sendSMS({
      to: booking.userPhone,
      message: smsMessage
    });
  }

  await saveNotification({
    userId: booking.userId,
    type: 'booking_cancelled',
    title: '예약 취소',
    message: `${booking.vehicleName} 예약이 취소되었습니다.`,
    relatedId: booking.bookingId,
    relatedType: 'booking'
  });
}

/**
 * 픽업 리마인더 알림 (픽업 1일 전)
 */
export async function sendPickupReminder(booking: BookingNotification): Promise<void> {
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .checklist { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .checklist li { margin: 10px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ 픽업 안내</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${booking.userName}</strong>님!</p>
      <p>내일 렌트카 픽업 예정입니다.</p>

      <div class="checklist">
        <h3>📋 준비물 체크리스트</h3>
        <ul>
          <li>✅ 신분증 (주민등록증 또는 운전면허증)</li>
          <li>✅ 운전면허증</li>
          <li>✅ 예약 확인서 (화면 캡처 또는 인쇄)</li>
          <li>✅ 결제 카드</li>
        </ul>

        <h3>📍 픽업 정보</h3>
        <p><strong>날짜:</strong> ${booking.pickupDate}</p>
        <p><strong>차량:</strong> ${booking.vehicleName}</p>
        <p><strong>업체:</strong> ${booking.vendorName}</p>
      </div>

      <p><strong>※ 픽업 시간 30분 전까지 도착해주세요.</strong></p>

      <div class="footer">
        <p>즐거운 여행 되세요!</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail({
    to: booking.userEmail,
    subject: `[Travleap] 내일 픽업 예정 - ${booking.vehicleName}`,
    html: emailHtml
  });

  if (booking.userPhone) {
    const smsMessage = `[Travleap] 내일 ${booking.pickupDate} 렌트카 픽업 예정입니다. 신분증, 운전면허증을 지참해주세요. 예약번호: #${booking.bookingId}`;
    await sendSMS({
      to: booking.userPhone,
      message: smsMessage
    });
  }

  await saveNotification({
    userId: booking.userId,
    type: 'pickup_reminder',
    title: '픽업 리마인더',
    message: `내일 ${booking.vehicleName} 픽업 예정입니다.`,
    relatedId: booking.bookingId,
    relatedType: 'booking'
  });
}

/**
 * 알림 DB 저장
 */
async function saveNotification(notification: {
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedId?: number;
  relatedType?: string;
}): Promise<void> {
  try {
    await api.post('/api/notifications', {
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      related_id: notification.relatedId,
      related_type: notification.relatedType,
      is_read: false,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('알림 저장 실패:', error);
  }
}

/**
 * 사용자 알림 조회
 */
export async function getUserNotifications(userId: number, limit = 50) {
  try {
    const response = await api.get(`/api/notifications?userId=${userId}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('알림 조회 실패:', error);
    return [];
  }
}

/**
 * 알림 읽음 처리
 */
export async function markNotificationAsRead(notificationId: number): Promise<void> {
  try {
    await api.put(`/api/notifications/${notificationId}/read`, {
      is_read: true
    });
  } catch (error) {
    console.error('알림 읽음 처리 실패:', error);
  }
}
