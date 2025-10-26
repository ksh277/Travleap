/**
 * 렌트카 검증 시스템 통합 테스트
 *
 * 테스트 시나리오:
 * 1. 렌트카 예약 생성
 * 2. 결제 완료 처리
 * 3. 바우처 생성 (QR 코드 포함)
 * 4. 바우처 검증
 * 5. 차량 인수 체크인
 * 6. 차량 반납 체크아웃
 */

import 'dotenv/config';
import { getDatabase } from '../utils/database';

async function testRentcarVerificationSystem() {
  const db = getDatabase();

  console.log('🚗 렌트카 검증 시스템 통합 테스트 시작\n');
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
      AND TABLE_NAME = 'rentcar_bookings'
      AND COLUMN_NAME IN (
        'voucher_code', 'qr_code', 'pickup_checked_in_at',
        'return_checked_out_at', 'used_at'
      )
    `);

    console.log(`   발견된 검증 컬럼: ${columns.length}개`);
    columns.forEach((col: any) => console.log(`   - ${col.COLUMN_NAME}`));

    if (columns.length < 5) {
      throw new Error('검증 컬럼이 누락되었습니다. 마이그레이션을 먼저 실행하세요.');
    }

    console.log('   ✅ 모든 검증 컬럼이 존재합니다.');

    // Step 1: 테스트용 렌트카 차량 조회
    console.log('\n🚗 Step 1: 테스트용 렌트카 차량 조회');

    const vehicles = await db.query(`
      SELECT v.id, v.brand, v.model, v.daily_rate_krw, v.vendor_id
      FROM rentcar_vehicles v
      WHERE v.is_active = 1
      LIMIT 1
    `);

    if (vehicles.length === 0) {
      throw new Error('테스트용 렌트카 차량이 없습니다.');
    }

    const vehicle = vehicles[0];
    console.log(`   ✅ 테스트 차량: ${vehicle.brand} ${vehicle.model}`);
    console.log(`   차량 ID: ${vehicle.id}, 일일 요금: ${vehicle.daily_rate_krw.toLocaleString()}원`);

    // Step 2: 테스트 예약 생성
    console.log('\n📝 Step 2: 테스트 예약 생성');

    const bookingNumber = `TEST_RC${Date.now()}`;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pickupDate = today.toISOString().split('T')[0];
    const dropoffDate = tomorrow.toISOString().split('T')[0];

    const bookingResult = await db.execute(`
      INSERT INTO rentcar_bookings (
        booking_number,
        vendor_id,
        vehicle_id,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        pickup_date,
        pickup_time,
        dropoff_date,
        dropoff_time,
        daily_rate_krw,
        rental_days,
        subtotal_krw,
        total_krw,
        status,
        payment_status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, 1, '테스트고객', 'test@example.com', '010-1234-5678',
        ?, '10:00:00', ?, '18:00:00',
        ?, 1, ?, ?, 'pending', 'pending', NOW(), NOW())
    `, [
      bookingNumber,
      vehicle.vendor_id,
      vehicle.id,
      pickupDate,
      dropoffDate,
      vehicle.daily_rate_krw,
      vehicle.daily_rate_krw,
      vehicle.daily_rate_krw
    ]);

    testBookingId = bookingResult.insertId as number;
    console.log(`   ✅ 예약 생성 완료: ID ${testBookingId}`);
    console.log(`   예약번호: ${bookingNumber}`);

    // Step 3: 결제 완료 처리
    console.log('\n💳 Step 3: 결제 완료 시뮬레이션');

    await db.execute(`
      UPDATE rentcar_bookings
      SET status = 'confirmed', payment_status = 'paid', updated_at = NOW()
      WHERE id = ?
    `, [testBookingId]);

    console.log(`   ✅ 결제 완료 처리됨 (status: confirmed, payment_status: paid)`);

    // Step 4: 바우처 생성 (QR 포함)
    console.log('\n🎫 Step 4: 바우처 생성');

    // 바우처 코드 생성
    voucherCode = 'TEST' + Math.random().toString(36).substr(2, 4).toUpperCase();

    const qrData = JSON.stringify({
      type: 'rentcar_booking',
      booking_id: testBookingId,
      booking_number: bookingNumber,
      voucher_code: voucherCode,
      customer_name: '테스트고객',
      issued_at: new Date().toISOString()
    });

    await db.execute(`
      UPDATE rentcar_bookings
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
        id,
        booking_number,
        voucher_code,
        status,
        payment_status,
        pickup_checked_in_at
      FROM rentcar_bookings
      WHERE voucher_code = ?
    `, [voucherCode]);

    if (verifyResult.length === 0) {
      throw new Error('바우처 검증 실패');
    }

    console.log(`   ✅ 바우처 검증 성공`);
    console.log(`   예약 상태: ${verifyResult[0].status}`);
    console.log(`   결제 상태: ${verifyResult[0].payment_status}`);
    console.log(`   체크인 여부: ${verifyResult[0].pickup_checked_in_at ? '완료' : '대기 중'}`);

    // Step 6: 차량 인수 체크인
    console.log('\n🚗 Step 6: 차량 인수 체크인');

    const vehicleCondition = {
      mileage: 50000,
      fuel_level: 100,
      damages: [],
      notes: '차량 상태 양호',
      recorded_at: new Date().toISOString(),
      recorded_by: 'test_staff'
    };

    await db.execute(`
      UPDATE rentcar_bookings
      SET
        status = 'picked_up',
        pickup_checked_in_at = NOW(),
        pickup_checked_in_by = 'test_staff',
        pickup_vehicle_condition = ?,
        used_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [JSON.stringify(vehicleCondition), testBookingId]);

    console.log(`   ✅ 차량 인수 체크인 완료`);
    console.log(`   체크인 처리자: test_staff`);
    console.log(`   주행거리: ${vehicleCondition.mileage.toLocaleString()}km`);
    console.log(`   연료량: ${vehicleCondition.fuel_level}%`);

    // Step 7: 차량 반납 체크아웃
    console.log('\n📦 Step 7: 차량 반납 체크아웃');

    const returnCondition = {
      mileage: 50250,
      fuel_level: 80,
      damages: [],
      notes: '정상 반납',
      additional_charges: [],
      recorded_at: new Date().toISOString(),
      recorded_by: 'test_staff'
    };

    await db.execute(`
      UPDATE rentcar_bookings
      SET
        status = 'returned',
        return_checked_out_at = NOW(),
        return_checked_out_by = 'test_staff',
        return_vehicle_condition = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [JSON.stringify(returnCondition), testBookingId]);

    const mileageDriven = returnCondition.mileage - vehicleCondition.mileage;
    const fuelUsed = vehicleCondition.fuel_level - returnCondition.fuel_level;

    console.log(`   ✅ 차량 반납 체크아웃 완료`);
    console.log(`   체크아웃 처리자: test_staff`);
    console.log(`   주행 거리: ${mileageDriven}km`);
    console.log(`   연료 사용: ${fuelUsed}%`);

    // Step 8: 최종 예약 정보 확인
    console.log('\n📊 Step 8: 최종 예약 정보 확인');

    const finalBooking = await db.query(`
      SELECT
        id,
        booking_number,
        voucher_code,
        status,
        payment_status,
        pickup_checked_in_at,
        return_checked_out_at,
        used_at
      FROM rentcar_bookings
      WHERE id = ?
    `, [testBookingId]);

    if (finalBooking.length > 0) {
      const booking = finalBooking[0];
      console.log('\n   📋 예약 정보:');
      console.log(`   - 예약 ID: ${booking.id}`);
      console.log(`   - 예약번호: ${booking.booking_number}`);
      console.log(`   - 바우처 코드: ${booking.voucher_code}`);
      console.log(`   - 예약 상태: ${booking.status}`);
      console.log(`   - 결제 상태: ${booking.payment_status}`);
      console.log(`   - 차량 인수 시각: ${booking.pickup_checked_in_at}`);
      console.log(`   - 차량 반납 시각: ${booking.return_checked_out_at}`);
      console.log(`   - 바우처 사용 시각: ${booking.used_at}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 렌트카 검증 시스템 통합 테스트 완료!');
    console.log('='.repeat(60));

    console.log('\n📊 테스트 결과 요약:');
    console.log('   ✅ 검증 컬럼 존재 확인');
    console.log('   ✅ 렌트카 예약 생성');
    console.log('   ✅ 결제 완료 처리');
    console.log('   ✅ 바우처 생성 (QR 코드 포함)');
    console.log('   ✅ 바우처 검증');
    console.log('   ✅ 차량 인수 체크인');
    console.log('   ✅ 차량 반납 체크아웃');

    console.log('\n🎉 모든 테스트를 통과했습니다!');

    console.log(`\n📝 테스트 예약 ID: ${testBookingId}`);
    console.log(`📝 바우처 코드: ${voucherCode}`);

    // 테스트 데이터 정리 옵션
    console.log('\n🧹 테스트 데이터 정리');
    console.log('   테스트 예약을 삭제하시겠습니까? (보존됨)');
    console.log(`   삭제하려면: DELETE FROM rentcar_bookings WHERE id = ${testBookingId};`);

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    throw error;
  }
}

// 실행
testRentcarVerificationSystem()
  .then(() => {
    console.log('\n✅ 스크립트 정상 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
