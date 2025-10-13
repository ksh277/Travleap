/**
 * Lock + DB 통합 테스트 (Node.js 버전)
 * 실제 PlanetScale DB에 연결하여 중복 예약 방지를 검증
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

// Lock Manager (간단 버전)
class LockManager {
  constructor() {
    this.locks = new Map();
  }

  async acquire(key, ttlSeconds = 600, owner = 'default') {
    const now = Date.now();
    const existing = this.locks.get(key);

    if (existing && existing.expiresAt > now) {
      console.log(`   ❌ Lock 획득 실패: ${key} (${existing.owner}가 보유 중)`);
      return false;
    }

    this.locks.set(key, {
      key,
      owner,
      expiresAt: now + (ttlSeconds * 1000),
      createdAt: now
    });

    console.log(`   ✅ Lock 획득 성공: ${key} (${owner})`);
    return true;
  }

  async release(key, owner = 'default') {
    const existing = this.locks.get(key);
    if (!existing || existing.owner !== owner) {
      return false;
    }
    this.locks.delete(key);
    console.log(`   🔓 Lock 해제: ${key}`);
    return true;
  }
}

const lockManager = new LockManager();

// DB 연결
async function getConnection() {
  return await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: { rejectUnauthorized: false }
  });
}

// 테스트용 임시 데이터 생성
async function setupTestData(conn) {
  console.log('\n📦 테스트 데이터 준비 중...');

  // 테스트용 listing 생성 (숙박)
  const [listingResult] = await conn.execute(`
    INSERT INTO listings (category_id, title, short_description, category, price_from, is_active, is_published, created_at, updated_at)
    VALUES (2, 'Lock 테스트 호텔', 'Lock 시스템 테스트용', 'accommodation', 100000, 1, 1, NOW(), NOW())
  `);

  const listingId = listingResult.insertId;
  console.log(`   ✅ 테스트 숙소 생성: ID ${listingId}`);

  return { listingId };
}

// 테스트 데이터 정리
async function cleanupTestData(conn, listingId) {
  console.log('\n🧹 테스트 데이터 정리 중...');

  await conn.execute('DELETE FROM bookings WHERE listing_id = ?', [listingId]);
  await conn.execute('DELETE FROM listings WHERE id = ?', [listingId]);

  console.log('   ✅ 정리 완료');
}

// 예약 생성 함수 (Lock 적용)
async function createBooking(conn, listingId, userId, lockManager) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startDate = tomorrow.toISOString().split('T')[0];

  const lockKey = `booking:${listingId}:${startDate}`;
  const lockOwner = `user_${userId}`;

  // 1. Lock 획득 시도
  const lockAcquired = await lockManager.acquire(lockKey, 10, lockOwner);

  if (!lockAcquired) {
    return {
      success: false,
      message: '다른 사용자가 예약 진행 중입니다',
      code: 'LOCK_FAILED'
    };
  }

  try {
    // 2. 예약 생성 (간단 버전)
    const [result] = await conn.execute(`
      INSERT INTO bookings
      (booking_number, listing_id, user_id, start_date, end_date, total_amount, payment_status, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW(), NOW())
    `, [
      `BK${Date.now()}`,
      listingId,
      userId,
      startDate,
      startDate, // 1일 숙박
      100000
    ]);

    console.log(`   💾 예약 생성 성공: booking_id ${result.insertId}`);

    return {
      success: true,
      bookingId: result.insertId
    };

  } finally {
    // 3. Lock 해제 (항상 실행)
    await lockManager.release(lockKey, lockOwner);
  }
}

// 테스트 1: 동시 예약 시도
async function testConcurrentBooking() {
  console.log('\n🧪 테스트 1: 동시 예약 요청 (중복 방지 검증)');
  console.log('='.repeat(60));

  let conn;
  let testData;

  try {
    conn = await getConnection();
    testData = await setupTestData(conn);

    console.log('\n⚡ 2명의 사용자가 **진짜 동시에** 같은 날짜 예약 시도...\n');

    // User A와 User B가 진짜 동시에 예약 시도 (Promise.all 사용)
    const [resultA, resultB] = await Promise.all([
      createBooking(conn, testData.listingId, 1001, lockManager),
      createBooking(conn, testData.listingId, 1002, lockManager)
    ]);

    console.log('👤 User A (ID: 1001):');
    console.log(`   결과: ${resultA.success ? '✅ 성공' : '❌ 실패'} - ${resultA.message || '예약 완료'}\n`);

    console.log('👤 User B (ID: 1002):');
    console.log(`   결과: ${resultB.success ? '✅ 성공' : '❌ 실패'} - ${resultB.message || '예약 완료'}\n`);

    // 검증
    console.log('🔍 검증:');
    const successCount = [resultA, resultB].filter(r => r.success).length;
    const lockFailCount = [resultA, resultB].filter(r => r.code === 'LOCK_FAILED').length;

    console.log(`   - 성공한 예약: ${successCount}개 (기대값: 1)`);
    console.log(`   - Lock 실패: ${lockFailCount}개 (기대값: 1)`);

    // DB에 생성된 예약 수 확인
    const [bookings] = await conn.query(
      'SELECT COUNT(*) as count FROM bookings WHERE listing_id = ?',
      [testData.listingId]
    );
    console.log(`   - DB에 생성된 예약: ${bookings[0].count}개 (기대값: 1)`);

    const passed = successCount === 1 && lockFailCount === 1 && bookings[0].count === 1;
    console.log(`\n결과: ${passed ? '✅ PASS (중복 예약 방지 성공!)' : '❌ FAIL'}`);

    return passed;

  } catch (error) {
    console.error('\n❌ 테스트 실행 중 오류:', error.message);
    return false;

  } finally {
    if (testData && conn) {
      await cleanupTestData(conn, testData.listingId);
    }
    if (conn) {
      await conn.end();
    }
  }
}

// 테스트 2: 순차적 예약
async function testSequentialBooking() {
  console.log('\n🧪 테스트 2: 순차적 예약 (Lock 해제 확인)');
  console.log('='.repeat(60));

  let conn;
  let testData;

  try {
    conn = await getConnection();
    testData = await setupTestData(conn);

    console.log('\n📝 1차 예약...\n');
    console.log('👤 User A (ID: 2001):');
    const result1 = await createBooking(conn, testData.listingId, 2001, lockManager);
    console.log(`   결과: ${result1.success ? '✅ 성공' : '❌ 실패'}\n`);

    // 잠시 대기 (Lock 해제 확인)
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('📝 2차 예약...\n');
    console.log('👤 User B (ID: 2002):');
    const result2 = await createBooking(conn, testData.listingId, 2002, lockManager);
    console.log(`   결과: ${result2.success ? '✅ 성공' : '❌ 실패'}\n`);

    const passed = result1.success && result2.success;
    console.log(`결과: ${passed ? '✅ PASS (Lock이 정상적으로 해제됨)' : '❌ FAIL'}`);

    return passed;

  } catch (error) {
    console.error('\n❌ 테스트 실행 중 오류:', error.message);
    return false;

  } finally {
    if (testData && conn) {
      await cleanupTestData(conn, testData.listingId);
    }
    if (conn) {
      await conn.end();
    }
  }
}

// 전체 테스트 실행
(async function runAllTests() {
  console.log('\n🚀 Lock + DB 통합 테스트 시작');
  console.log('='.repeat(60));
  console.log('⚠️  PlanetScale 클라우드 DB에 실제 데이터를 생성/삭제합니다.');
  console.log('='.repeat(60));

  try {
    // DB 연결 확인
    const testConn = await getConnection();
    await testConn.query('SELECT 1');
    await testConn.end();
    console.log('✅ PlanetScale 연결 확인\n');

  } catch (error) {
    console.error('❌ DB 연결 실패:', error.message);
    process.exit(1);
  }

  const results = {
    test1: await testConcurrentBooking(),
    test2: await testSequentialBooking()
  };

  console.log('\n');
  console.log('='.repeat(60));
  console.log('📊 최종 결과');
  console.log('='.repeat(60));
  console.log(`테스트 1 (동시 예약): ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`테스트 2 (순차 예약): ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r);
  console.log('\n' + '='.repeat(60));
  console.log(`전체: ${allPassed ? '✅ 모두 통과!' : '❌ 일부 실패'}`);
  console.log('='.repeat(60));

  if (allPassed) {
    console.log('\n🎉 축하합니다! Lock + DB 통합 시스템이 완벽하게 작동합니다!');
    console.log('✅ 중복 예약 방지 시스템이 정상 작동합니다.');
    console.log('💡 다음 단계: HOLD Worker 및 결제 연동을 진행하세요.');
  } else {
    console.log('\n⚠️  일부 테스트가 실패했습니다.');
  }

  console.log('\n');
})();
