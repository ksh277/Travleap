/**
 * 숙박 검증 시스템 통합 테스트
 *
 * 테스트 시나리오:
 * 1. 숙박 예약 생성
 * 2. 결제 완료 처리
 * 3. 바우처 생성 (QR 코드 포함)
 * 4. 바우처 검증
 * 5. 게스트 체크인
 * 6. 게스트 체크아웃 (미니바 및 추가 요금 포함)
 */

import 'dotenv/config';
import { getDatabase } from '../utils/database';

async function testLodgingVerificationSystem() {
  const db = getDatabase();

  console.log('🏨 숙박 검증 시스템 통합 테스트 시작\n');
  console.log('='.repeat(60));

  let testBookingId: number | null = null;
  let voucherCode: string | null = null;

  try {
    // Step 0: 검증 컬럼 확인
    console.log('\n📋 Step 0: 검증 컬럼 존재 확인');

    const columns = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'lodging_bookings'
      AND COLUMN_NAME IN (
        'voucher_code', 'qr_code', 'checked_in_at', 'checked_in_by',
        'room_condition_checkin', 'checked_out_at', 'checked_out_by',
        'room_condition_checkout', 'minibar_charges', 'additional_charges_detail',
        'total_additional_charges', 'used_at', 'cancellation_policy_id'
      )
    `);

    console.log(`   발견된 검증 컬럼: ${columns.length}개`);
    columns.forEach((col: any) => console.log(`   - ${col.COLUMN_NAME}`));

    if (columns.length < 13) {
      throw new Error('검증 컬럼이 누락되었습니다. 마이그레이션을 먼저 실행하세요.');
    }

    console.log('   ✅ 모든 검증 컬럼이 존재합니다.');

    // Step 1: 테스트용 숙소 및 객실 조회
    console.log('\n🏨 Step 1: 테스트용 숙소 및 객실 조회');

    const rooms = await db.query(`
      SELECT
        r.id,
        r.name as room_name,
        r.type as room_type,
        r.lodging_id,
        l.name as lodging_name,
        l.address,
        l.checkin_time,
        l.checkout_time,
        rp.base_price_per_night
      FROM rooms r
      JOIN lodgings l ON r.lodging_id = l.id
      LEFT JOIN rate_plans rp ON rp.room_id = r.id
      WHERE r.is_active = 1
      LIMIT 1
    `);

    if (rooms.length === 0) {
      throw new Error('테스트용 객실이 없습니다.');
    }

    const room = rooms[0];
    console.log(`   ✅ 테스트 숙소: ${room.lodging_name}`);
    console.log(`   객실: ${room.room_name} (${room.room_type})`);
    console.log(`   1박 요금: ${room.base_price_per_night?.toLocaleString() || 'N/A'}원`);

    // Step 2: 테스트 예약 생성
    console.log('\n📝 Step 2: 테스트 예약 생성');

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const checkinDate = today.toISOString().split('T')[0];
    const checkoutDate = tomorrow.toISOString().split('T')[0];
    const nights = 1;
    const roomPrice = room.base_price_per_night || 100000;
    const totalPrice = roomPrice * nights;

    const bookingResult = await db.execute(`
      INSERT INTO lodging_bookings (
        room_id,
        lodging_id,
        user_id,
        guest_name,
        guest_phone,
        guest_email,
        guest_count,
        checkin_date,
        checkout_date,
        nights,
        room_price,
        total_price,
        status,
        payment_status,
        created_at,
        updated_at
      ) VALUES (?, ?, 1, '테스트게스트', '010-1234-5678', 'test@example.com',
        2, ?, ?, ?, ?, ?, 'HOLD', 'pending', NOW(), NOW())
    `, [
      room.id,
      room.lodging_id,
      checkinDate,
      checkoutDate,
      nights,
      roomPrice,
      totalPrice
    ]);

    testBookingId = bookingResult.insertId as number;
    console.log(`   ✅ 예약 생성 완료: ID ${testBookingId}`);
    console.log(`   체크인: ${checkinDate}, 체크아웃: ${checkoutDate}`);
    console.log(`   총 요금: ${totalPrice.toLocaleString()}원`);

    // Step 3: 결제 완료 처리
    console.log('\n💳 Step 3: 결제 완료 시뮬레이션');

    await db.execute(`
      UPDATE lodging_bookings
      SET status = 'CONFIRMED', payment_status = 'paid', updated_at = NOW()
      WHERE id = ?
    `, [testBookingId]);

    console.log(`   ✅ 결제 완료 처리됨 (status: CONFIRMED, payment_status: paid)`);

    // Step 4: 바우처 생성 (QR 포함)
    console.log('\n🎫 Step 4: 바우처 생성');

    // 바우처 코드 생성
    voucherCode = 'TEST' + Math.random().toString(36).substr(2, 4).toUpperCase();

    const qrData = JSON.stringify({
      type: 'lodging_booking',
      booking_id: testBookingId,
      voucher_code: voucherCode,
      guest_name: '테스트게스트',
      lodging_name: room.lodging_name,
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      nights: nights,
      issued_at: new Date().toISOString()
    });

    await db.execute(`
      UPDATE lodging_bookings
      SET voucher_code = ?, qr_code = ?, updated_at = NOW()
      WHERE id = ?
    `, [voucherCode, qrData, testBookingId]);

    console.log(`   ✅ 바우처 생성 완료`);
    console.log(`   바우처 코드: ${voucherCode}`);
    console.log(`   QR 데이터: ${qrData.substring(0, 100)}...`);

    // Step 5: 바우처 검증
    console.log('\n🔍 Step 5: 바우처 검증');

    const verifyResult = await db.query(`
      SELECT
        lb.id,
        lb.voucher_code,
        lb.status,
        lb.payment_status,
        lb.checked_in_at,
        lb.guest_name,
        l.name as lodging_name,
        r.name as room_name
      FROM lodging_bookings lb
      JOIN lodgings l ON lb.lodging_id = l.id
      JOIN rooms r ON lb.room_id = r.id
      WHERE lb.voucher_code = ?
    `, [voucherCode]);

    if (verifyResult.length === 0) {
      throw new Error('바우처 검증 실패');
    }

    console.log(`   ✅ 바우처 검증 성공`);
    console.log(`   게스트: ${verifyResult[0].guest_name}`);
    console.log(`   숙소: ${verifyResult[0].lodging_name}`);
    console.log(`   객실: ${verifyResult[0].room_name}`);
    console.log(`   예약 상태: ${verifyResult[0].status}`);
    console.log(`   결제 상태: ${verifyResult[0].payment_status}`);
    console.log(`   체크인 여부: ${verifyResult[0].checked_in_at ? '완료' : '대기 중'}`);

    // Step 6: 게스트 체크인
    console.log('\n🏨 Step 6: 게스트 체크인');

    const roomConditionCheckin = {
      cleanliness: 'excellent',
      amenities_status: {
        tv: 'working',
        aircon: 'working',
        minibar: 'stocked',
        refrigerator: 'working',
        wifi: 'working'
      },
      damages: [],
      notes: '객실 상태 양호',
      recorded_at: new Date().toISOString(),
      recorded_by: 'test_frontdesk'
    };

    await db.execute(`
      UPDATE lodging_bookings
      SET
        status = 'CHECKED_IN',
        checked_in_at = NOW(),
        checked_in_by = 'test_frontdesk',
        room_condition_checkin = ?,
        used_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [JSON.stringify(roomConditionCheckin), testBookingId]);

    console.log(`   ✅ 게스트 체크인 완료`);
    console.log(`   체크인 처리자: test_frontdesk`);
    console.log(`   객실 청결도: ${roomConditionCheckin.cleanliness}`);
    console.log(`   편의시설 상태: 모두 정상`);

    // Step 7: 게스트 체크아웃
    console.log('\n📦 Step 7: 게스트 체크아웃');

    const minibarItems = [
      { item: '콜라', quantity: 2, price: 3000 },
      { item: '맥주', quantity: 1, price: 5000 }
    ];

    const minibarTotal = minibarItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const additionalCharges = [
      { type: '레이트 체크아웃', amount: 20000, description: '1시간 연장' }
    ];

    const additionalTotal = additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
    const totalAdditionalCharges = minibarTotal + additionalTotal;

    const roomConditionCheckout = {
      cleanliness: 'good',
      amenities_status: {
        tv: 'working',
        aircon: 'working',
        minibar: 'consumed',
        refrigerator: 'working',
        wifi: 'working'
      },
      damages: [],
      minibar_items: minibarItems,
      minibar_total: minibarTotal,
      additional_charges: additionalCharges,
      additional_total: additionalTotal,
      notes: '정상 체크아웃',
      recorded_at: new Date().toISOString(),
      recorded_by: 'test_frontdesk'
    };

    await db.execute(`
      UPDATE lodging_bookings
      SET
        status = 'CHECKED_OUT',
        checked_out_at = NOW(),
        checked_out_by = 'test_frontdesk',
        room_condition_checkout = ?,
        minibar_charges = ?,
        additional_charges_detail = ?,
        total_additional_charges = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      JSON.stringify(roomConditionCheckout),
      JSON.stringify(minibarItems),
      JSON.stringify(additionalCharges),
      totalAdditionalCharges,
      testBookingId
    ]);

    console.log(`   ✅ 게스트 체크아웃 완료`);
    console.log(`   체크아웃 처리자: test_frontdesk`);
    console.log(`   미니바 소비: ${minibarTotal.toLocaleString()}원`);
    console.log(`   추가 요금: ${additionalTotal.toLocaleString()}원`);
    console.log(`   총 추가 요금: ${totalAdditionalCharges.toLocaleString()}원`);

    // Step 8: 최종 예약 정보 확인
    console.log('\n📊 Step 8: 최종 예약 정보 확인');

    const finalBooking = await db.query(`
      SELECT
        lb.id,
        lb.voucher_code,
        lb.status,
        lb.payment_status,
        lb.checked_in_at,
        lb.checked_out_at,
        lb.used_at,
        lb.total_additional_charges,
        lb.guest_name,
        l.name as lodging_name,
        r.name as room_name
      FROM lodging_bookings lb
      JOIN lodgings l ON lb.lodging_id = l.id
      JOIN rooms r ON lb.room_id = r.id
      WHERE lb.id = ?
    `, [testBookingId]);

    if (finalBooking.length > 0) {
      const booking = finalBooking[0];
      console.log('\n   📋 예약 정보:');
      console.log(`   - 예약 ID: ${booking.id}`);
      console.log(`   - 바우처 코드: ${booking.voucher_code}`);
      console.log(`   - 게스트: ${booking.guest_name}`);
      console.log(`   - 숙소: ${booking.lodging_name}`);
      console.log(`   - 객실: ${booking.room_name}`);
      console.log(`   - 예약 상태: ${booking.status}`);
      console.log(`   - 결제 상태: ${booking.payment_status}`);
      console.log(`   - 체크인 시각: ${booking.checked_in_at}`);
      console.log(`   - 체크아웃 시각: ${booking.checked_out_at}`);
      console.log(`   - 바우처 사용 시각: ${booking.used_at}`);
      console.log(`   - 추가 요금: ${booking.total_additional_charges?.toLocaleString() || 0}원`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 숙박 검증 시스템 통합 테스트 완료!');
    console.log('='.repeat(60));

    console.log('\n📊 테스트 결과 요약:');
    console.log('   ✅ 검증 컬럼 존재 확인');
    console.log('   ✅ 숙박 예약 생성');
    console.log('   ✅ 결제 완료 처리');
    console.log('   ✅ 바우처 생성 (QR 코드 포함)');
    console.log('   ✅ 바우처 검증');
    console.log('   ✅ 게스트 체크인');
    console.log('   ✅ 게스트 체크아웃 (미니바 및 추가 요금 포함)');

    console.log('\n🎉 모든 테스트를 통과했습니다!');

    console.log(`\n📝 테스트 예약 ID: ${testBookingId}`);
    console.log(`📝 바우처 코드: ${voucherCode}`);

    // 테스트 데이터 정리 옵션
    console.log('\n🧹 테스트 데이터 정리');
    console.log('   테스트 예약을 삭제하시겠습니까? (보존됨)');
    console.log(`   삭제하려면: DELETE FROM lodging_bookings WHERE id = ${testBookingId};`);

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    throw error;
  }
}

// 실행
testLodgingVerificationSystem()
  .then(() => {
    console.log('\n✅ 스크립트 정상 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
