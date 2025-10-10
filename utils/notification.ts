// 파트너 알림 시스템 (야놀자 스타일)
import { db } from './database-cloud';

export interface BookingNotification {
  booking_id: number;
  order_number: string;
  partner_id: number;
  partner_name: string;
  partner_email: string;
  partner_phone?: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  product_name: string;
  category: string;
  start_date: string;
  end_date?: string;
  num_adults: number;
  num_children: number;
  num_seniors: number;
  total_amount: number;
  special_requests?: string;
  payment_status: string;
  booking_status: string;
}

/**
 * 예약 완료 시 파트너에게 이메일 + 알림톡 자동 발송
 */
export async function notifyPartnerNewBooking(booking: BookingNotification): Promise<boolean> {
  try {
    // 1. 이메일 발송
    await sendPartnerEmail(booking);

    // 2. 알림톡 발송 (선택사항 - KakaoTalk Biz API)
    if (booking.partner_phone) {
      await sendKakaoAlimtalk(booking);
    }

    // 3. 알림 로그 저장
    await db.insert('partner_notifications', {
      partner_id: booking.partner_id,
      booking_id: booking.booking_id,
      type: 'new_booking',
      status: 'sent',
      sent_at: new Date().toISOString(),
      email_sent: true,
      sms_sent: !!booking.partner_phone
    });

    console.log(`✅ 파트너 알림 발송 완료: ${booking.partner_name} - ${booking.order_number}`);
    return true;
  } catch (error) {
    console.error('파트너 알림 발송 실패:', error);
    return false;
  }
}

/**
 * 파트너에게 이메일 발송
 */
async function sendPartnerEmail(booking: BookingNotification): Promise<void> {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
        .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
        .info-label { font-weight: bold; width: 120px; color: #666; }
        .info-value { flex: 1; color: #333; }
        .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #999; padding: 20px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 새로운 예약이 접수되었습니다!</h1>
          <p>Travleap에서 고객 예약이 완료되었습니다</p>
        </div>

        <div class="content">
          <div class="info-box">
            <h2>📋 예약 정보</h2>
            <div class="info-row">
              <div class="info-label">주문번호</div>
              <div class="info-value"><strong>${booking.order_number}</strong></div>
            </div>
            <div class="info-row">
              <div class="info-label">상품명</div>
              <div class="info-value">${booking.product_name}</div>
            </div>
            <div class="info-row">
              <div class="info-label">카테고리</div>
              <div class="info-value">${booking.category}</div>
            </div>
            <div class="info-row">
              <div class="info-label">예약일</div>
              <div class="info-value">
                ${booking.start_date}
                ${booking.end_date && booking.end_date !== booking.start_date ? ` ~ ${booking.end_date}` : ''}
              </div>
            </div>
            <div class="info-row">
              <div class="info-label">인원</div>
              <div class="info-value">
                성인 ${booking.num_adults}명
                ${booking.num_children > 0 ? `, 아동 ${booking.num_children}명` : ''}
                ${booking.num_seniors > 0 ? `, 경로 ${booking.num_seniors}명` : ''}
              </div>
            </div>
            <div class="info-row">
              <div class="info-label">결제 금액</div>
              <div class="info-value"><strong style="color: #667eea; font-size: 18px;">₩${booking.total_amount.toLocaleString()}</strong></div>
            </div>
          </div>

          <div class="info-box">
            <h2>👤 고객 정보</h2>
            <div class="info-row">
              <div class="info-label">예약자명</div>
              <div class="info-value">${booking.customer_name}</div>
            </div>
            <div class="info-row">
              <div class="info-label">전화번호</div>
              <div class="info-value">${booking.customer_phone}</div>
            </div>
            <div class="info-row">
              <div class="info-label">이메일</div>
              <div class="info-value">${booking.customer_email}</div>
            </div>
            ${booking.special_requests ? `
            <div class="info-row">
              <div class="info-label">요청사항</div>
              <div class="info-value">${booking.special_requests}</div>
            </div>
            ` : ''}
          </div>

          <div class="highlight">
            <strong>⚠️ 중요:</strong> 고객에게 예약 확정 연락을 해주세요. 파트너 대시보드에서 예약을 확정하거나 거절할 수 있습니다.
          </div>

          <div style="text-align: center;">
            <a href="${process.env.VITE_APP_URL || 'https://travleap.vercel.app'}/partner/orders" class="button">
              파트너 대시보드에서 예약 관리하기
            </a>
          </div>
        </div>

        <div class="footer">
          <p>이 이메일은 Travleap 플랫폼에서 자동 발송되었습니다.</p>
          <p>문의사항: support@travleap.com | 전화: 1588-0000</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 이메일 발송 (실제 구현 시 EmailJS, SendGrid, AWS SES 등 사용)
  if (process.env.NODE_ENV === 'production') {
    // 실제 이메일 발송
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: booking.partner_email,
        subject: `[Travleap] 새 예약 접수: ${booking.order_number} - ${booking.product_name}`,
        html: emailHtml
      })
    });
  } else {
    // 개발 환경: 콘솔에 출력
    console.log('📧 이메일 발송 (개발 모드):');
    console.log(`To: ${booking.partner_email}`);
    console.log(`Subject: [Travleap] 새 예약 접수: ${booking.order_number}`);
  }
}

/**
 * 카카오 알림톡 발송
 */
async function sendKakaoAlimtalk(booking: BookingNotification): Promise<void> {
  const message = `[Travleap] 새 예약 접수

📋 주문번호: ${booking.order_number}
🏨 상품: ${booking.product_name}
📅 날짜: ${booking.start_date}${booking.end_date && booking.end_date !== booking.start_date ? ` ~ ${booking.end_date}` : ''}
👤 예약자: ${booking.customer_name}
📞 연락처: ${booking.customer_phone}
👥 인원: 성인 ${booking.num_adults}명${booking.num_children > 0 ? `, 아동 ${booking.num_children}명` : ''}
💰 금액: ${booking.total_amount.toLocaleString()}원

파트너 대시보드에서 예약을 확정해주세요.
${process.env.VITE_APP_URL || 'https://travleap.vercel.app'}/partner/orders`;

  // 카카오 알림톡 발송 (실제 구현 시 KakaoTalk Biz API 사용)
  if (process.env.VITE_KAKAO_ALIMTALK_API_KEY) {
    await fetch('https://alimtalk-api.bizmsg.kr/v2/sender/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'userid': process.env.VITE_KAKAO_BIZ_USER_ID || '',
        'Authorization': `Bearer ${process.env.VITE_KAKAO_ALIMTALK_API_KEY}`
      },
      body: JSON.stringify({
        senderkey: process.env.VITE_KAKAO_SENDER_KEY,
        tpl_code: 'new_booking_alert',
        receiver: booking.partner_phone?.replace(/-/g, ''),
        recvname: booking.partner_name,
        message: message
      })
    });
  } else {
    console.log('📱 알림톡 발송 (개발 모드):');
    console.log(`To: ${booking.partner_phone}`);
    console.log(message);
  }
}

/**
 * 고객에게 예약 확정 알림
 */
export async function notifyCustomerBookingConfirmed(booking: BookingNotification): Promise<void> {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
        .success-box { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
        .info-label { font-weight: bold; width: 120px; color: #666; }
        .info-value { flex: 1; color: #333; }
        .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ 예약이 확정되었습니다!</h1>
          <p>${booking.partner_name}에서 예약을 승인했습니다</p>
        </div>

        <div class="content">
          <div class="success-box">
            <h2>🎉 예약 확정 완료</h2>
            <p>예약번호: <strong>${booking.order_number}</strong></p>
          </div>

          <div class="info-box">
            <h2>📋 예약 상세 정보</h2>
            <div class="info-row">
              <div class="info-label">상품명</div>
              <div class="info-value">${booking.product_name}</div>
            </div>
            <div class="info-row">
              <div class="info-label">파트너</div>
              <div class="info-value">${booking.partner_name}</div>
            </div>
            <div class="info-row">
              <div class="info-label">예약일</div>
              <div class="info-value">${booking.start_date}${booking.end_date && booking.end_date !== booking.start_date ? ` ~ ${booking.end_date}` : ''}</div>
            </div>
            <div class="info-row">
              <div class="info-label">인원</div>
              <div class="info-value">성인 ${booking.num_adults}명${booking.num_children > 0 ? `, 아동 ${booking.num_children}명` : ''}</div>
            </div>
            <div class="info-row">
              <div class="info-label">결제 금액</div>
              <div class="info-value"><strong>₩${booking.total_amount.toLocaleString()}</strong></div>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.VITE_APP_URL || 'https://travleap.vercel.app'}/mypage/bookings" class="button">
              내 예약 확인하기
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  if (process.env.NODE_ENV === 'production') {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: booking.customer_email,
        subject: `[Travleap] 예약 확정: ${booking.product_name} - ${booking.order_number}`,
        html: emailHtml
      })
    });
  } else {
    console.log('📧 고객 예약 확정 이메일 (개발 모드):');
    console.log(`To: ${booking.customer_email}`);
  }
}

/**
 * 정산 알림 (매월 자동 정산)
 */
export async function notifyPartnerSettlement(partnerId: number, month: string, amount: number): Promise<void> {
  const partner = await db.findOne('partners', { id: partnerId });

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Malgun Gothic', sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #667eea; color: white; padding: 30px; text-align: center; }
        .amount { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; margin: 30px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 ${month} 정산 내역</h1>
        </div>
        <div class="amount">
          ₩${amount.toLocaleString()}
        </div>
        <p style="text-align: center;">
          정산 금액이 등록하신 계좌로 입금될 예정입니다.<br>
          입금 예정일: 익월 10일
        </p>
      </div>
    </body>
    </html>
  `;

  if (partner) {
    console.log(`💰 정산 알림: ${partner.business_name} - ${amount.toLocaleString()}원`);
  }
}
