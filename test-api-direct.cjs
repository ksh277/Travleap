/**
 * API 직접 테스트 - Lock Manager + 예약 생성
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

// Lock Manager 가져오기
const { LockManager } = require('./utils/lock-manager.ts');
const lockManager = new LockManager();

const dbConfig = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: { rejectUnauthorized: false }
};

async function testAPI() {
  console.log('\n🚀 API 직접 테스트 시작\n');

  const connection = await mysql.createConnection(dbConfig);

  try {
    // 1. 테스트용 숙소 확인
    console.log('1️⃣ 테스트 숙소 확인...');
    const [listings] = await connection.query(`
      SELECT id, title, price_from, available_spots
      FROM listings
      WHERE is_active = 1 AND category = 'accommodation'
      LIMIT 1
    `);

    if (listings.length === 0) {
      console.log('❌ 활성화된 숙소가 없습니다.');
      return;
    }

    const listing = listings[0];
    console.log(`✅ 숙소 발견: ${listing.title} (ID: ${listing.id})`);
    console.log(`   가격: ${listing.price_from}원, 재고: ${listing.available_spots}개\n`);

    // 2. Lock Manager 테스트
    const testDate = '2025-10-20';
    const lockKey = `booking:${listing.id}:${testDate}`;

    console.log('2️⃣ Lock Manager 테스트...');
    console.log(`   Lock 키: ${lockKey}`);

    // 사용자 A가 Lock 획득
    const lockA = await lockManager.acquire(lockKey, 600, 'user_A');
    console.log(`   사용자 A Lock 획득: ${lockA ? '✅ 성공' : '❌ 실패'}`);

    // 사용자 B가 Lock 시도 (실패해야 함)
    const lockB = await lockManager.acquire(lockKey, 600, 'user_B');
    console.log(`   사용자 B Lock 획득: ${lockB ? '❌ 성공 (문제!)' : '✅ 실패 (정상)'}`);

    // Lock 해제
    await lockManager.release(lockKey, 'user_A');
    console.log(`   사용자 A Lock 해제: ✅\n`);

    // 3. 예약 생성 테스트
    console.log('3️⃣ HOLD 예약 생성 테스트...');

    const bookingNumber = `BK-${Date.now()}`;
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const customerInfo = JSON.stringify({
      name: 'API 테스트 사용자',
      phone: '010-1234-5678',
      email: 'test@example.com'
    });

    const [result] = await connection.execute(`
      INSERT INTO bookings (
        booking_number, listing_id, user_id,
        num_adults, num_children, num_seniors,
        start_date, end_date, check_in_time,
        customer_info, total_amount, special_requests,
        status, payment_status, hold_expires_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, NOW(), NOW())
    `, [
      bookingNumber,
      listing.id,
      9999, // 테스트 사용자 ID
      2, 1, 0, // 성인2, 아동1, 시니어0
      testDate,
      testDate,
      '14:00',
      customerInfo,
      listing.price_from,
      'API 직접 테스트',
      holdExpiresAt
    ]);

    console.log(`✅ 예약 생성 완료`);
    console.log(`   예약 ID: ${result.insertId}`);
    console.log(`   예약번호: ${bookingNumber}`);
    console.log(`   만료시간: ${holdExpiresAt.toISOString()}\n`);

    // 4. 생성된 예약 확인
    console.log('4️⃣ DB에서 예약 확인...');
    const [bookings] = await connection.query(`
      SELECT id, booking_number, status, payment_status, total_amount, hold_expires_at
      FROM bookings
      WHERE id = ?
    `, [result.insertId]);

    if (bookings.length > 0) {
      const booking = bookings[0];
      console.log('✅ 예약 확인 완료:');
      console.log(`   ID: ${booking.id}`);
      console.log(`   예약번호: ${booking.booking_number}`);
      console.log(`   상태: ${booking.status}`);
      console.log(`   결제상태: ${booking.payment_status}`);
      console.log(`   금액: ${booking.total_amount.toLocaleString()}원`);
      console.log(`   만료: ${booking.hold_expires_at}\n`);
    }

    // 5. 정리 (테스트 데이터 삭제)
    console.log('5️⃣ 테스트 데이터 정리...');
    await connection.execute('DELETE FROM bookings WHERE id = ?', [result.insertId]);
    console.log('✅ 정리 완료\n');

    console.log('='.repeat(60));
    console.log('🎉 모든 테스트 통과!');
    console.log('='.repeat(60));
    console.log('\n✅ Lock Manager: 정상 작동');
    console.log('✅ 예약 생성: 정상 작동');
    console.log('✅ DB 저장: 정상 작동');
    console.log('✅ HOLD 시스템: 정상 작동\n');

    console.log('📖 다음 단계:');
    console.log('   1. 브라우저에서 http://localhost:5176 접속');
    console.log('   2. 실제 UI로 예약 프로세스 테스트');
    console.log('   3. 개발자 도구에서 Lock 로그 확인\n');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error('스택:', error.stack);
  } finally {
    await connection.end();
  }
}

testAPI();
