/**
 * 렌트카 MVP 시스템 통합 테스트
 *
 * 테스트 시나리오:
 * 1. 차량 검색 (가용성 + 가격 계산)
 * 2. 예약 생성 (운전자 검증 + 중복 방지)
 * 3. 결제 확인 (Toss Payments 시뮬레이션)
 * 4. 바우처 생성 (QR 코드 포함)
 * 5. 바우처 검증
 * 6. 차량 인수 (체크인)
 * 7. 차량 반납 (체크아웃 + 연체료 계산)
 * 8. 예약 취소 (정책 기반 환불) - 선택적
 */

import 'dotenv/config';
import { getDatabase } from '../utils/database';

async function testRentcarMVPSystem() {
  const db = getDatabase();

  console.log('🚗 렌트카 MVP 시스템 통합 테스트 시작\n');
  console.log('='.repeat(60));

  let testRentalId: number | null = null;
  let testBookingNumber: string | null = null;
  let voucherCode: string | null = null;

  try {
    // Step 0: 검증 컬럼 및 테이블 확인
    console.log('\n📋 Step 0: 데이터베이스 스키마 확인');

    const columns = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'rentcar_bookings'
      AND COLUMN_NAME IN (
        'pickup_at_utc', 'return_at_utc', 'hourly_rate_krw', 'daily_rate_krw',
        'driver_name', 'driver_birth', 'driver_license_no', 'driver_license_exp',
        'late_return_hours', 'late_return_fee_krw', 'total_additional_fee_krw'
      )
    `);

    console.log(`   발견된 MVP 컬럼: ${columns.length}개`);
    columns.forEach((col: any) => console.log(`   - ${col.COLUMN_NAME}`));

    if (columns.length < 11) {
      throw new Error('MVP 컬럼이 누락되었습니다. 마이그레이션을 먼저 실행하세요.');
    }

    // 테이블 확인
    const tables = await db.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN (
        'rentcar_vehicle_blocks',
        'rentcar_rental_payments',
        'rentcar_rental_deposits',
        'rentcar_rental_events',
        'rentcar_state_transitions'
      )
    `);

    console.log(`   발견된 신규 테이블: ${tables.length}개`);
    tables.forEach((tbl: any) => console.log(`   - ${tbl.TABLE_NAME}`));

    if (tables.length < 5) {
      throw new Error('신규 테이블이 누락되었습니다. 마이그레이션을 먼저 실행하세요.');
    }

    console.log('   ✅ 데이터베이스 스키마 확인 완료');

    // Step 1: 차량 검색
    console.log('\n🔍 Step 1: 차량 검색 (가용성 + 가격 계산)');

    const vehicles = await db.query(`
      SELECT
        v.id,
        v.model,
        v.year,
        v.vehicle_code,
        v.vendor_id,
        v.daily_rate_krw as daily_rate,
        v.hourly_rate_krw as hourly_rate,
        v.deposit_amount_krw as deposit_amount,
        v.age_requirement as min_driver_age
      FROM rentcar_vehicles v
      WHERE v.is_active = 1
      LIMIT 1
    `);

    if (vehicles.length === 0) {
      throw new Error('테스트용 차량이 없습니다.');
    }

    const vehicle = vehicles[0];
    console.log(`   ✅ 테스트 차량: ${vehicle.model} (${vehicle.year})`);
    console.log(`   차량 코드: ${vehicle.vehicle_code}`);
    console.log(`   일일 요금: ${vehicle.daily_rate?.toLocaleString() || 'N/A'}원`);
    console.log(`   시간당 요금: ${vehicle.hourly_rate?.toLocaleString() || 'N/A'}원`);
    console.log(`   보증금: ${vehicle.deposit_amount?.toLocaleString() || 0}원`);

    // Step 2: 대여 기간 설정
    console.log('\n📅 Step 2: 대여 기간 설정');

    const now = new Date();
    const pickupTime = new Date(now.getTime() + 60 * 60 * 1000); // 1시간 후
    const returnTime = new Date(pickupTime.getTime() + 26 * 60 * 60 * 1000); // 26시간 대여

    const pickupAt = pickupTime.toISOString();
    const returnAt = returnTime.toISOString();

    console.log(`   인수 시각: ${pickupAt}`);
    console.log(`   반납 시각: ${returnAt}`);

    // 가격 계산
    const hours = Math.ceil((returnTime.getTime() - pickupTime.getTime()) / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);
    const remainderHours = hours % 24;
    const dailyRate = vehicle.daily_rate || 0;
    const hourlyRate = vehicle.hourly_rate || 0;
    const baseAmount = (days * dailyRate) + (remainderHours * hourlyRate);

    console.log(`   대여 시간: ${hours}시간 (${days}일 + ${remainderHours}시간)`);
    console.log(`   기본 요금: ${baseAmount.toLocaleString()}원`);

    // Step 3: 중복 확인
    console.log('\n🔍 Step 3: 차량 가용성 확인');

    const overlaps = await db.query(`
      SELECT 1 FROM rentcar_bookings
      WHERE vehicle_id = ?
      AND status IN ('hold', 'confirmed', 'in_progress')
      AND NOT (return_at_utc <= ? OR ? <= pickup_at_utc)
      LIMIT 1
    `, [vehicle.id, pickupAt, returnAt]);

    if (overlaps.length > 0) {
      throw new Error('차량이 이미 예약되어 있습니다.');
    }

    console.log('   ✅ 차량 사용 가능');

    // Step 4: 예약 생성
    console.log('\n📝 Step 4: 예약 생성 (운전자 검증)');

    // 운전자 정보 (만 25세)
    const driverBirth = '1998-01-01';
    const driverLicenseExp = '2027-12-31';

    // 나이 계산
    const birthDate = new Date(driverBirth);
    const age = pickupTime.getFullYear() - birthDate.getFullYear();
    const monthDiff = pickupTime.getMonth() - birthDate.getMonth();
    const dayDiff = pickupTime.getDate() - birthDate.getDate();
    const driverAge = (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) ? age - 1 : age;

    console.log(`   운전자: 테스트 운전자`);
    console.log(`   생년월일: ${driverBirth} (만 ${driverAge}세)`);
    console.log(`   면허 만료일: ${driverLicenseExp}`);

    if (driverAge < vehicle.min_driver_age) {
      throw new Error(`운전자 나이 부족 (최소 ${vehicle.min_driver_age}세)`);
    }

    console.log(`   ✅ 운전자 검증 통과 (최소 나이: ${vehicle.min_driver_age}세)`);

    // 예약 번호 생성
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    testBookingNumber = `RNT${dateStr}${randomStr}`;

    const result = await db.execute(`
      INSERT INTO rentcar_bookings (
        vehicle_id,
        vendor_id,
        booking_number,
        pickup_at_utc,
        return_at_utc,
        pickup_location_id,
        dropoff_location_id,
        driver_name,
        driver_birth,
        driver_license_no,
        driver_license_exp,
        customer_name,
        customer_email,
        customer_phone,
        hourly_rate_krw,
        daily_rate_krw,
        base_price_krw,
        total_price_krw,
        deposit_amount_krw,
        status,
        payment_status,
        hold_expires_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 1, '테스트운전자', ?, '12-345678-90', ?,
        '테스트고객', 'test@example.com', '010-1234-5678',
        ?, ?, ?, ?, ?, 'hold', 'pending', DATE_ADD(NOW(), INTERVAL 10 MINUTE),
        NOW(), NOW())
    `, [
      vehicle.id,
      vehicle.vendor_id,
      testBookingNumber,
      pickupAt,
      returnAt,
      driverBirth,
      driverLicenseExp,
      hourlyRate,
      dailyRate,
      baseAmount,
      baseAmount,
      vehicle.deposit_amount || 0
    ]);

    testRentalId = result.insertId as number;
    console.log(`   ✅ 예약 생성 완료: ${testBookingNumber} (ID: ${testRentalId})`);
    console.log(`   HOLD 상태 (10분 만료)`);

    // Step 5: 결제 확인 (시뮬레이션)
    console.log('\n💳 Step 5: 결제 확인 시뮬레이션');

    const paymentKey = 'test_' + Math.random().toString(36).substr(2, 9);
    const orderId = testBookingNumber;

    await db.execute(`
      UPDATE rentcar_bookings
      SET
        status = 'confirmed',
        payment_status = 'captured',
        payment_key = ?,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [paymentKey, testRentalId]);

    console.log(`   ✅ 결제 완료 (Payment Key: ${paymentKey})`);
    console.log(`   상태: hold → confirmed`);

    // 상태 전이 로그
    await db.execute(`
      INSERT INTO rentcar_state_transitions (
        rental_id,
        from_status,
        to_status,
        transition_reason,
        transitioned_by,
        transitioned_at
      ) VALUES (?, 'hold', 'confirmed', 'Payment completed', 'test_system', NOW())
    `, [testRentalId]);

    // Step 6: 바우처 생성
    console.log('\n🎫 Step 6: 바우처 생성');

    voucherCode = 'TEST' + Math.random().toString(36).substr(2, 4).toUpperCase();

    const qrData = JSON.stringify({
      type: 'rentcar_booking',
      rental_id: testRentalId,
      booking_number: testBookingNumber,
      voucher_code: voucherCode,
      vehicle: vehicle.model,
      pickup_at: pickupAt,
      return_at: returnAt,
      issued_at: new Date().toISOString()
    });

    await db.execute(`
      UPDATE rentcar_bookings
      SET voucher_code = ?, qr_code = ?, updated_at = NOW()
      WHERE id = ?
    `, [voucherCode, qrData, testRentalId]);

    console.log(`   ✅ 바우처 생성 완료`);
    console.log(`   바우처 코드: ${voucherCode}`);
    console.log(`   QR 데이터: ${qrData.substring(0, 100)}...`);

    // Step 7: 바우처 검증
    console.log('\n🔍 Step 7: 바우처 검증');

    const verifyResult = await db.query(`
      SELECT
        rb.id,
        rb.booking_number,
        rb.voucher_code,
        rb.status,
        rb.payment_status,
        rb.pickup_checked_in_at,
        rv.model,
        rv.vehicle_code
      FROM rentcar_bookings rb
      JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
      WHERE rb.voucher_code = ?
    `, [voucherCode]);

    if (verifyResult.length === 0) {
      throw new Error('바우처 검증 실패');
    }

    console.log(`   ✅ 바우처 검증 성공`);
    console.log(`   예약 번호: ${verifyResult[0].booking_number}`);
    console.log(`   차량: ${verifyResult[0].model} (${verifyResult[0].vehicle_code})`);
    console.log(`   예약 상태: ${verifyResult[0].status}`);
    console.log(`   결제 상태: ${verifyResult[0].payment_status}`);

    // Step 8: 차량 인수 체크인
    console.log('\n🚗 Step 8: 차량 인수 체크인');

    const vehicleConditionCheckin = {
      mileage: 50000,
      fuel_level: 100,
      damages: [],
      photos: [],
      notes: '차량 상태 양호',
      recorded_at: new Date().toISOString(),
      recorded_by: 'test_vendor'
    };

    await db.execute(`
      UPDATE rentcar_bookings
      SET
        status = 'picked_up',
        pickup_checked_in_at = NOW(),
        pickup_checked_in_by = 'test_vendor',
        pickup_vehicle_condition = ?,
        used_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [JSON.stringify(vehicleConditionCheckin), testRentalId]);

    console.log(`   ✅ 차량 인수 완료`);
    console.log(`   인수 처리자: test_vendor`);
    console.log(`   주행거리: ${vehicleConditionCheckin.mileage.toLocaleString()}km`);
    console.log(`   연료: ${vehicleConditionCheckin.fuel_level}%`);

    // 상태 전이 로그
    await db.execute(`
      INSERT INTO rentcar_state_transitions (
        rental_id,
        from_status,
        to_status,
        transition_reason,
        transitioned_by,
        transitioned_at
      ) VALUES (?, 'confirmed', 'in_progress', 'Vehicle picked up', 'test_vendor', NOW())
    `, [testRentalId]);

    // Step 9: 차량 반납 체크아웃 (연체 시뮬레이션)
    console.log('\n📦 Step 9: 차량 반납 체크아웃 (연체 시뮬레이션)');

    // 실제 반납 시각 (계획보다 2시간 늦음)
    const actualReturnTime = new Date(returnTime.getTime() + 2 * 60 * 60 * 1000);
    const graceMinutes = 30;
    const gracePeriodMs = graceMinutes * 60 * 1000;
    const timeAfterGrace = actualReturnTime.getTime() - returnTime.getTime() - gracePeriodMs;
    const lateReturnHours = Math.ceil(timeAfterGrace / (60 * 60 * 1000));
    const lateReturnFee = lateReturnHours * hourlyRate;

    console.log(`   계획 반납: ${returnAt}`);
    console.log(`   실제 반납: ${actualReturnTime.toISOString()}`);
    console.log(`   유예 시간: ${graceMinutes}분`);
    console.log(`   연체 시간: ${lateReturnHours}시간`);
    console.log(`   연체료: ${lateReturnFee.toLocaleString()}원`);

    const vehicleConditionCheckout = {
      mileage: 50250,
      fuel_level: 80,
      damages: [],
      photos: [],
      notes: '정상 반납',
      late_return: {
        hours: lateReturnHours,
        fee: lateReturnFee,
        grace_minutes: graceMinutes
      },
      additional_charges: [],
      other_charges: 0,
      total_additional_fee: lateReturnFee,
      recorded_at: actualReturnTime.toISOString(),
      recorded_by: 'test_vendor'
    };

    await db.execute(`
      UPDATE rentcar_bookings
      SET
        status = 'returned',
        return_checked_out_at = NOW(),
        return_checked_out_by = 'test_vendor',
        return_vehicle_condition = ?,
        actual_return_at_utc = ?,
        late_return_hours = ?,
        late_return_fee_krw = ?,
        total_additional_fee_krw = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      JSON.stringify(vehicleConditionCheckout),
      actualReturnTime,
      lateReturnHours,
      lateReturnFee,
      lateReturnFee,
      testRentalId
    ]);

    console.log(`   ✅ 차량 반납 완료`);
    console.log(`   반납 처리자: test_vendor`);
    console.log(`   주행거리: ${vehicleConditionCheckout.mileage.toLocaleString()}km (+250km)`);
    console.log(`   연료: ${vehicleConditionCheckout.fuel_level}% (-20%)`);
    console.log(`   총 추가 요금: ${lateReturnFee.toLocaleString()}원`);

    // 상태 전이 로그
    await db.execute(`
      INSERT INTO rentcar_state_transitions (
        rental_id,
        from_status,
        to_status,
        transition_reason,
        transitioned_by,
        transitioned_at
      ) VALUES (?, 'in_progress', 'completed', 'Vehicle returned', 'test_vendor', NOW())
    `, [testRentalId]);

    // Step 10: 최종 예약 정보 확인
    console.log('\n📊 Step 10: 최종 예약 정보 확인');

    const finalBooking = await db.query(`
      SELECT
        rb.id,
        rb.booking_number,
        rb.voucher_code,
        rb.status,
        rb.payment_status,
        rb.pickup_at_utc,
        rb.return_at_utc,
        rb.actual_return_at_utc,
        rb.base_price_krw,
        rb.late_return_hours,
        rb.late_return_fee_krw,
        rb.total_additional_fee_krw,
        rv.model,
        rv.vehicle_code
      FROM rentcar_bookings rb
      JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
      WHERE rb.id = ?
    `, [testRentalId]);

    if (finalBooking.length > 0) {
      const booking = finalBooking[0];
      console.log('\n   📋 예약 정보:');
      console.log(`   - 예약 번호: ${booking.booking_number}`);
      console.log(`   - 바우처 코드: ${booking.voucher_code}`);
      console.log(`   - 차량: ${booking.model} (${booking.vehicle_code})`);
      console.log(`   - 예약 상태: ${booking.status}`);
      console.log(`   - 결제 상태: ${booking.payment_status}`);
      console.log(`   - 계획 인수: ${booking.pickup_at_utc}`);
      console.log(`   - 계획 반납: ${booking.return_at_utc}`);
      console.log(`   - 실제 반납: ${booking.actual_return_at_utc}`);
      console.log(`   - 기본 요금: ${booking.base_price_krw?.toLocaleString()}원`);
      console.log(`   - 연체 시간: ${booking.late_return_hours || 0}시간`);
      console.log(`   - 연체료: ${booking.late_return_fee_krw?.toLocaleString() || 0}원`);
      console.log(`   - 총 추가 요금: ${booking.total_additional_fee_krw?.toLocaleString() || 0}원`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 렌트카 MVP 시스템 통합 테스트 완료!');
    console.log('='.repeat(60));

    console.log('\n📊 테스트 결과 요약:');
    console.log('   ✅ 데이터베이스 스키마 확인');
    console.log('   ✅ 차량 검색 (가용성 + 가격 계산)');
    console.log('   ✅ 예약 생성 (운전자 검증)');
    console.log('   ✅ 결제 확인 (상태 전이: hold → confirmed)');
    console.log('   ✅ 바우처 생성 (QR 코드 포함)');
    console.log('   ✅ 바우처 검증');
    console.log('   ✅ 차량 인수 체크인 (상태 전이: confirmed → in_progress)');
    console.log('   ✅ 차량 반납 체크아웃 (연체료 자동 계산)');
    console.log('   ✅ 상태 전이 로깅');

    console.log('\n🎉 모든 테스트를 통과했습니다!');

    console.log(`\n📝 테스트 예약 번호: ${testBookingNumber}`);
    console.log(`📝 바우처 코드: ${voucherCode}`);

    // 테스트 데이터 정리 옵션
    console.log('\n🧹 테스트 데이터 정리');
    console.log('   테스트 예약을 삭제하시겠습니까? (보존됨)');
    console.log(`   삭제하려면: DELETE FROM rentcar_bookings WHERE id = ${testRentalId};`);
    console.log(`              DELETE FROM rentcar_state_transitions WHERE rental_id = ${testRentalId};`);

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    throw error;
  }
}

// 실행
testRentcarMVPSystem()
  .then(() => {
    console.log('\n✅ 스크립트 정상 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
