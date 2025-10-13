/**
 * Lock Manager + 클라우드 DB 통합 테스트
 *
 * 실제 PlanetScale DB에 연결하여 중복 예약 방지를 테스트
 */

import { db } from './database-cloud';
import { lockManager } from './lock-manager';
import { createBooking, cancelBooking } from '../api/lodging';
import type { LodgingBooking } from '../api/lodging';

/**
 * 테스트용 임시 객실 생성
 */
async function createTestRoom() {
  try {
    // 테스트용 숙소 생성
    const lodgingResult = await db.execute(`
      INSERT INTO lodgings (vendor_id, name, type, status, created_at, updated_at)
      VALUES (1, 'Lock 테스트 호텔', 'HOTEL', 'ACTIVE', NOW(), NOW())
    `);

    const lodgingId = lodgingResult.insertId;

    // 테스트용 객실 생성
    const roomResult = await db.execute(`
      INSERT INTO rooms (lodging_id, name, type, status, max_occupancy,
                         base_occupancy, base_price, created_at, updated_at)
      VALUES (?, 'Lock 테스트 룸', 'STANDARD', 'ACTIVE', 2, 2, 100000, NOW(), NOW())
    `, [lodgingId]);

    const roomId = roomResult.insertId;

    // 재고 생성 (내일부터 7일)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (let i = 0; i < 7; i++) {
      const date = new Date(tomorrow);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      await db.execute(`
        INSERT INTO availability_daily
        (room_id, date, available_rooms, sold_rooms, blocked_rooms, created_at, updated_at)
        VALUES (?, ?, 5, 0, 0, NOW(), NOW())
      `, [roomId, dateStr]);
    }

    console.log(`✅ 테스트용 객실 생성: Room ID ${roomId}, Lodging ID ${lodgingId}`);
    return { lodgingId, roomId };

  } catch (error) {
    console.error('❌ 테스트 객실 생성 실패:', error);
    throw error;
  }
}

/**
 * 테스트 데이터 정리
 */
async function cleanupTestData(lodgingId: number, roomId: number) {
  try {
    await db.execute('DELETE FROM lodging_bookings WHERE room_id = ?', [roomId]);
    await db.execute('DELETE FROM availability_daily WHERE room_id = ?', [roomId]);
    await db.execute('DELETE FROM rooms WHERE id = ?', [roomId]);
    await db.execute('DELETE FROM lodgings WHERE id = ?', [lodgingId]);
    console.log(`🧹 테스트 데이터 정리 완료`);
  } catch (error) {
    console.error('⚠️ 정리 실패:', error);
  }
}

/**
 * 테스트 1: 동시 예약 요청 (DB 연동)
 *
 * 2명의 사용자가 같은 객실, 같은 날짜를 동시에 예약 시도
 * → 1명만 성공해야 함
 */
export async function testConcurrentBookingWithDB() {
  console.log('\n🧪 통합 테스트 1: 동시 예약 요청 (중복 방지)');
  console.log('='.repeat(60));

  let testRoom: { lodgingId: number; roomId: number } | null = null;

  try {
    // 1. 테스트 객실 생성
    testRoom = await createTestRoom();
    const { lodgingId, roomId } = testRoom;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkinDate = tomorrow.toISOString().split('T')[0];

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    const checkoutDate = dayAfter.toISOString().split('T')[0];

    console.log(`📅 예약 날짜: ${checkinDate} ~ ${checkoutDate}`);

    // 2. 동일한 예약 정보 (2명의 사용자)
    const booking1: LodgingBooking = {
      room_id: roomId,
      lodging_id: lodgingId,
      user_id: 1001,
      guest_name: '테스터 A',
      guest_phone: '010-1111-1111',
      guest_email: 'userA@test.com',
      guest_count: 2,
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      nights: 1,
      room_price: 100000,
      total_price: 100000
    };

    const booking2: LodgingBooking = {
      ...booking1,
      user_id: 1002,
      guest_name: '테스터 B',
      guest_phone: '010-2222-2222',
      guest_email: 'userB@test.com'
    };

    // 3. 동시 예약 시도
    console.log('\n⚡ 동시 예약 시도 시작...');

    const [result1, result2] = await Promise.all([
      createBooking(booking1),
      createBooking(booking2)
    ]);

    console.log('\n📊 결과:');
    console.log(`   사용자 A: ${result1.success ? '✅ 성공' : '❌ 실패'} - ${result1.message}`);
    console.log(`   사용자 B: ${result2.success ? '✅ 성공' : '❌ 실패'} - ${result2.message}`);

    // 4. 검증
    const successCount = [result1, result2].filter(r => r.success).length;
    const lockFailCount = [result1, result2].filter(r => r.code === 'LOCK_FAILED').length;

    console.log('\n🔍 검증:');
    console.log(`   - 성공한 예약: ${successCount}개 (기대값: 1)`);
    console.log(`   - Lock 실패: ${lockFailCount}개 (기대값: 1)`);

    // 5. DB 재고 확인
    const inventory = await db.query(`
      SELECT sold_rooms FROM availability_daily
      WHERE room_id = ? AND date = ?
    `, [roomId, checkinDate]);

    console.log(`   - DB 재고 차감: ${inventory[0]?.sold_rooms || 0}개 (기대값: 1)`);

    const passed = successCount === 1 && lockFailCount === 1 && inventory[0]?.sold_rooms === 1;
    console.log(`\n결과: ${passed ? '✅ PASS' : '❌ FAIL'}`);

    // 6. 정리
    if (testRoom) {
      await cleanupTestData(testRoom.lodgingId, testRoom.roomId);
    }

    return passed;

  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error);
    if (testRoom) {
      await cleanupTestData(testRoom.lodgingId, testRoom.roomId);
    }
    return false;
  }
}

/**
 * 테스트 2: 순차적 예약 요청
 *
 * Lock 해제 후 다음 예약이 정상적으로 가능한지 확인
 */
export async function testSequentialBookings() {
  console.log('\n🧪 통합 테스트 2: 순차적 예약 (Lock 해제 확인)');
  console.log('='.repeat(60));

  let testRoom: { lodgingId: number; roomId: number } | null = null;

  try {
    testRoom = await createTestRoom();
    const { lodgingId, roomId } = testRoom;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkinDate = tomorrow.toISOString().split('T')[0];

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    const checkoutDate = dayAfter.toISOString().split('T')[0];

    // 1차 예약
    const booking1: LodgingBooking = {
      room_id: roomId,
      lodging_id: lodgingId,
      guest_name: '테스터 1',
      guest_phone: '010-1111-1111',
      guest_count: 2,
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      nights: 1,
      room_price: 100000,
      total_price: 100000
    };

    console.log('📝 1차 예약 시도...');
    const result1 = await createBooking(booking1);
    console.log(`   결과: ${result1.success ? '✅ 성공' : '❌ 실패'} - ${result1.message}`);

    // 잠시 대기 (Lock 해제 확인)
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2차 예약 (다른 날짜)
    const day3 = new Date(tomorrow);
    day3.setDate(day3.getDate() + 2);
    const day4 = new Date(tomorrow);
    day4.setDate(day4.getDate() + 3);

    const booking2: LodgingBooking = {
      ...booking1,
      guest_name: '테스터 2',
      guest_phone: '010-2222-2222',
      checkin_date: day3.toISOString().split('T')[0],
      checkout_date: day4.toISOString().split('T')[0]
    };

    console.log('\n📝 2차 예약 시도 (다른 날짜)...');
    const result2 = await createBooking(booking2);
    console.log(`   결과: ${result2.success ? '✅ 성공' : '❌ 실패'} - ${result2.message}`);

    const passed = result1.success && result2.success;
    console.log(`\n결과: ${passed ? '✅ PASS' : '❌ FAIL'}`);

    if (testRoom) {
      await cleanupTestData(testRoom.lodgingId, testRoom.roomId);
    }

    return passed;

  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error);
    if (testRoom) {
      await cleanupTestData(testRoom.lodgingId, testRoom.roomId);
    }
    return false;
  }
}

/**
 * 테스트 3: 재고 부족 시나리오
 *
 * 재고가 5개인 객실에 5개 예약 후 6번째 시도 → 실패해야 함
 */
export async function testInventoryDepletion() {
  console.log('\n🧪 통합 테스트 3: 재고 소진 시나리오');
  console.log('='.repeat(60));

  let testRoom: { lodgingId: number; roomId: number } | null = null;

  try {
    testRoom = await createTestRoom();
    const { lodgingId, roomId } = testRoom;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkinDate = tomorrow.toISOString().split('T')[0];

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    const checkoutDate = dayAfter.toISOString().split('T')[0];

    console.log(`📦 초기 재고: 5개`);
    console.log(`📅 예약 날짜: ${checkinDate} ~ ${checkoutDate}`);

    // 5개 예약 생성
    const bookings: Promise<any>[] = [];
    for (let i = 1; i <= 5; i++) {
      const booking: LodgingBooking = {
        room_id: roomId,
        lodging_id: lodgingId,
        guest_name: `테스터 ${i}`,
        guest_phone: `010-${i.toString().padStart(4, '0')}-${i.toString().padStart(4, '0')}`,
        guest_count: 2,
        checkin_date: checkinDate,
        checkout_date: checkoutDate,
        nights: 1,
        room_price: 100000,
        total_price: 100000
      };

      // 순차적으로 예약 (Lock 해제 시간 확보)
      console.log(`\n📝 ${i}번째 예약 시도...`);
      const result = await createBooking(booking);
      console.log(`   결과: ${result.success ? '✅ 성공' : '❌ 실패'} - ${result.message}`);

      await new Promise(resolve => setTimeout(resolve, 100)); // Lock 해제 대기
    }

    // 재고 확인
    const inventory = await db.query(`
      SELECT sold_rooms, available_rooms FROM availability_daily
      WHERE room_id = ? AND date = ?
    `, [roomId, checkinDate]);

    console.log(`\n📊 현재 재고:`);
    console.log(`   - 판매: ${inventory[0]?.sold_rooms || 0}개`);
    console.log(`   - 가용: ${inventory[0]?.available_rooms || 0}개`);

    // 6번째 예약 시도 (실패해야 함)
    console.log(`\n📝 6번째 예약 시도 (재고 없음)...`);
    const extraBooking: LodgingBooking = {
      room_id: roomId,
      lodging_id: lodgingId,
      guest_name: '테스터 6',
      guest_phone: '010-6666-6666',
      guest_count: 2,
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      nights: 1,
      room_price: 100000,
      total_price: 100000
    };

    await new Promise(resolve => setTimeout(resolve, 100));
    const extraResult = await createBooking(extraBooking);
    console.log(`   결과: ${extraResult.success ? '❌ 성공 (문제!)' : '✅ 실패 (정상)'} - ${extraResult.message}`);
    console.log(`   에러 코드: ${extraResult.code}`);

    const passed = inventory[0]?.sold_rooms === 5 &&
                   !extraResult.success &&
                   extraResult.code === 'NO_AVAILABILITY';

    console.log(`\n결과: ${passed ? '✅ PASS' : '❌ FAIL'}`);

    if (testRoom) {
      await cleanupTestData(testRoom.lodgingId, testRoom.roomId);
    }

    return passed;

  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error);
    if (testRoom) {
      await cleanupTestData(testRoom.lodgingId, testRoom.roomId);
    }
    return false;
  }
}

/**
 * 전체 통합 테스트 실행
 */
export async function runAllDBIntegrationTests() {
  console.log('\n');
  console.log('🚀 Lock Manager + 클라우드 DB 통합 테스트 시작');
  console.log('='.repeat(60));
  console.log('⚠️  PlanetScale 클라우드 DB에 실제 데이터를 생성/삭제합니다.');
  console.log('='.repeat(60));

  try {
    // DB 연결 확인
    await db.query('SELECT 1');
    console.log('✅ PlanetScale 연결 확인\n');

  } catch (error) {
    console.error('❌ DB 연결 실패:', error);
    return false;
  }

  const results = {
    test1: await testConcurrentBookingWithDB(),
    test2: await testSequentialBookings(),
    test3: await testInventoryDepletion()
  };

  console.log('\n');
  console.log('📊 최종 결과');
  console.log('='.repeat(60));
  console.log(`테스트 1 (동시 예약): ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`테스트 2 (순차 예약): ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`테스트 3 (재고 소진): ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r);
  console.log(`\n전체: ${allPassed ? '✅ 모두 통과' : '❌ 일부 실패'}`);
  console.log('='.repeat(60));

  return allPassed;
}

// 브라우저 콘솔에서 테스트 가능
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).testLockDB = runAllDBIntegrationTests;
  console.log('🔧 개발 도구: testLockDB() - Lock + DB 통합 테스트 실행');
}

export default {
  runAllDBIntegrationTests,
  testConcurrentBookingWithDB,
  testSequentialBookings,
  testInventoryDepletion
};
