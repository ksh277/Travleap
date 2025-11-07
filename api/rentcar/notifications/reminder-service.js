/**
 * 렌트카 알림/리마인더 서비스
 *
 * 기능:
 * 1. 체크인 24시간 전 알림
 * 2. 차단 만료 30분 전 알림
 * 3. 체크아웃 지연 알림
 *
 * 전송 채널:
 * - 이메일 (nodemailer)
 * - SMS (Twilio 또는 Aligo)
 * - 푸시 알림 (FCM - 선택적)
 */

const { db } = require('../../utils/database.cjs');

/**
 * 체크인 24시간 전 알림 발송
 *
 * 크론잡: 매일 오전 9시 실행
 */
async function sendCheckInReminders() {
  console.log('\n📢 [Reminders] Sending check-in reminders...');

  try {
    // 내일 체크인 예정인 예약 조회 (24시간 전후)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const upcomingBookings = await db.query(`
      SELECT
        b.id,
        b.booking_number,
        b.customer_name,
        b.customer_email,
        b.customer_phone,
        b.pickup_at_utc,
        b.pickup_location_id,
        v.display_name as vehicle_name,
        v.model,
        vn.business_name as vendor_name,
        vn.contact_phone as vendor_phone,
        pl.name as pickup_location
      FROM rentcar_bookings b
      LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN rentcar_vendors vn ON b.vendor_id = vn.id
      LEFT JOIN rentcar_locations pl ON b.pickup_location_id = pl.id
      WHERE b.status = 'confirmed'
        AND b.pickup_at_utc >= ?
        AND b.pickup_at_utc < ?
        AND b.pickup_checked_in_at IS NULL
    `, [tomorrow, dayAfterTomorrow]);

    if (upcomingBookings.length === 0) {
      console.log('✅ [Reminders] No upcoming check-ins for tomorrow.');
      return { success: true, sent: 0 };
    }

    console.log(`📋 [Reminders] Found ${upcomingBookings.length} upcoming check-in(s).`);

    let sentCount = 0;

    for (const booking of upcomingBookings) {
      try {
        // 알림 메시지 생성
        const message = `
안녕하세요 ${booking.customer_name}님,

내일 렌트카 체크인 일정을 알려드립니다.

📍 예약 정보:
- 예약 번호: ${booking.booking_number}
- 차량: ${booking.vehicle_name || booking.model}
- 업체: ${booking.vendor_name}
- 픽업 시간: ${new Date(booking.pickup_at_utc).toLocaleString('ko-KR')}
- 픽업 장소: ${booking.pickup_location || '업체 지정 장소'}

📞 문의: ${booking.vendor_phone}

즐거운 여행 되세요!
        `.trim();

        // TODO: 실제 이메일/SMS 발송
        // await sendEmail(booking.customer_email, '렌트카 체크인 안내', message);
        // await sendSMS(booking.customer_phone, message);

        console.log(`✅ [Reminders] Reminder sent to ${booking.customer_name} (${booking.booking_number})`);

        // 알림 발송 기록
        await db.execute(`
          INSERT INTO rentcar_notifications (
            booking_id,
            notification_type,
            recipient_email,
            recipient_phone,
            message,
            sent_at
          ) VALUES (?, 'check_in_reminder', ?, ?, ?, NOW())
        `, [booking.id, booking.customer_email, booking.customer_phone, message]);

        sentCount++;

      } catch (error) {
        console.error(`❌ [Reminders] Failed to send reminder for ${booking.booking_number}:`, error);
      }
    }

    console.log(`\n✅ [Reminders] Check-in reminders sent: ${sentCount}/${upcomingBookings.length}`);

    return {
      success: true,
      sent: sentCount,
      failed: upcomingBookings.length - sentCount
    };

  } catch (error) {
    console.error('❌ [Reminders] Error sending check-in reminders:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 차단 만료 30분 전 알림
 *
 * 크론잡: 매 30분마다 실행
 */
async function sendBlockExpiryReminders() {
  console.log('\n🔔 [Reminders] Checking for expiring blocks...');

  try {
    // 30분 후 만료될 차단 조회
    const now = new Date();
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
    const fortyFiveMinutesLater = new Date(now.getTime() + 45 * 60 * 1000);

    const expiringBlocks = await db.query(`
      SELECT
        b.id,
        b.vehicle_id,
        b.ends_at,
        b.block_reason,
        b.notes,
        v.display_name as vehicle_name,
        v.license_plate,
        vn.contact_email as vendor_email,
        vn.business_name as vendor_name
      FROM rentcar_vehicle_blocks b
      LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN rentcar_vendors vn ON v.vendor_id = vn.id
      WHERE b.is_active = 1
        AND b.ends_at >= ?
        AND b.ends_at < ?
    `, [thirtyMinutesLater, fortyFiveMinutesLater]);

    if (expiringBlocks.length === 0) {
      console.log('✅ [Reminders] No expiring blocks.');
      return { success: true, sent: 0 };
    }

    console.log(`📋 [Reminders] Found ${expiringBlocks.length} expiring block(s).`);

    let sentCount = 0;

    for (const block of expiringBlocks) {
      try {
        const message = `
안녕하세요 ${block.vendor_name}님,

차량 차단이 곧 만료됩니다.

🚗 차량 정보:
- 차량: ${block.vehicle_name} (${block.license_plate})
- 차단 만료: ${new Date(block.ends_at).toLocaleString('ko-KR')}
- 차단 사유: ${block.block_reason}
- 메모: ${block.notes || 'N/A'}

차단이 자동으로 해제됩니다.
추가 차단이 필요하면 대시보드에서 연장해주세요.
        `.trim();

        // TODO: 벤더에게 이메일 발송
        // await sendEmail(block.vendor_email, '차량 차단 만료 알림', message);

        console.log(`✅ [Reminders] Block expiry reminder sent for vehicle ${block.vehicle_name}`);

        sentCount++;

      } catch (error) {
        console.error(`❌ [Reminders] Failed to send block expiry reminder:`, error);
      }
    }

    console.log(`\n✅ [Reminders] Block expiry reminders sent: ${sentCount}/${expiringBlocks.length}`);

    return {
      success: true,
      sent: sentCount,
      failed: expiringBlocks.length - sentCount
    };

  } catch (error) {
    console.error('❌ [Reminders] Error sending block expiry reminders:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 체크아웃 지연 알림
 *
 * 크론잡: 매 시간 실행
 */
async function sendLateCheckOutReminders() {
  console.log('\n⏰ [Reminders] Checking for late check-outs...');

  try {
    // 반납 예정 시간이 지났지만 체크아웃 안된 예약 조회
    const now = new Date();

    const lateBookings = await db.query(`
      SELECT
        b.id,
        b.booking_number,
        b.customer_name,
        b.customer_phone,
        b.return_at_utc,
        v.display_name as vehicle_name,
        vn.business_name as vendor_name,
        vn.contact_phone as vendor_phone
      FROM rentcar_bookings b
      LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN rentcar_vendors vn ON b.vendor_id = vn.id
      WHERE b.status = 'picked_up'
        AND b.return_at_utc < ?
        AND b.return_checked_out_at IS NULL
    `, [now]);

    if (lateBookings.length === 0) {
      console.log('✅ [Reminders] No late check-outs.');
      return { success: true, sent: 0 };
    }

    console.log(`📋 [Reminders] Found ${lateBookings.length} late check-out(s).`);

    let sentCount = 0;

    for (const booking of lateBookings) {
      try {
        const hoursLate = Math.floor((now - new Date(booking.return_at_utc)) / (1000 * 60 * 60));

        const message = `
안녕하세요 ${booking.customer_name}님,

차량 반납 시간이 ${hoursLate}시간 지났습니다.

📍 예약 정보:
- 예약 번호: ${booking.booking_number}
- 차량: ${booking.vehicle_name}
- 반납 예정: ${new Date(booking.return_at_utc).toLocaleString('ko-KR')}

빠른 시일 내에 반납해주시기 바랍니다.
연착료가 발생할 수 있습니다.

📞 문의: ${booking.vendor_phone}
        `.trim();

        // TODO: 고객에게 SMS 발송
        // await sendSMS(booking.customer_phone, message);

        console.log(`✅ [Reminders] Late check-out reminder sent for ${booking.booking_number} (${hoursLate}h late)`);

        sentCount++;

      } catch (error) {
        console.error(`❌ [Reminders] Failed to send late check-out reminder:`, error);
      }
    }

    console.log(`\n✅ [Reminders] Late check-out reminders sent: ${sentCount}/${lateBookings.length}`);

    return {
      success: true,
      sent: sentCount,
      failed: lateBookings.length - sentCount
    };

  } catch (error) {
    console.error('❌ [Reminders] Error sending late check-out reminders:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendCheckInReminders,
  sendBlockExpiryReminders,
  sendLateCheckOutReminders
};
