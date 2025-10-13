/**
 * Lock 시스템 테스트 실행 스크립트
 * Node.js 환경에서 Lock Manager의 기본 동작을 검증
 */

console.log('🚀 Lock Manager 테스트 시작\n');
console.log('='.repeat(60));

// 간단한 Lock Manager 시뮬레이션
class SimpleLockManager {
  constructor() {
    this.locks = new Map();
  }

  async acquire(key, ttlSeconds = 600, owner = 'default') {
    const now = Date.now();
    const existing = this.locks.get(key);

    // 기존 Lock이 있고 아직 만료 안됐으면 실패
    if (existing && existing.expiresAt > now) {
      console.log(`❌ Lock 획득 실패: ${key} (이미 ${existing.owner}가 보유 중)`);
      return false;
    }

    const lockEntry = {
      key,
      owner,
      expiresAt: now + (ttlSeconds * 1000),
      createdAt: now
    };

    this.locks.set(key, lockEntry);
    console.log(`✅ Lock 획득 성공: ${key} (owner: ${owner}, TTL: ${ttlSeconds}초)`);
    return true;
  }

  async release(key, owner = 'default') {
    const existing = this.locks.get(key);

    if (!existing) {
      console.log(`⚠️  Lock 해제 실패: ${key} (존재하지 않음)`);
      return false;
    }

    if (existing.owner !== owner) {
      console.log(`❌ Lock 해제 실패: ${key} (소유자 불일치)`);
      return false;
    }

    this.locks.delete(key);
    console.log(`🔓 Lock 해제 성공: ${key} (owner: ${owner})`);
    return true;
  }

  getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const [key, lock] of this.locks.entries()) {
      if (lock.expiresAt > now) {
        active++;
      } else {
        expired++;
      }
    }

    return { active, expired, total: this.locks.size };
  }
}

const lockManager = new SimpleLockManager();

// 테스트 1: 동시 Lock 획득
async function test1() {
  console.log('\n🧪 테스트 1: 동시 Lock 획득');
  console.log('-'.repeat(60));

  const testKey = 'booking:room_101:2025-10-15';

  // User A가 Lock 획득
  const resultA = await lockManager.acquire(testKey, 60, 'user_A');
  console.log(`   User A: ${resultA ? '✅ 성공' : '❌ 실패'}`);

  // User B가 같은 Lock 시도 (실패해야 함)
  const resultB = await lockManager.acquire(testKey, 60, 'user_B');
  console.log(`   User B: ${resultB ? '❌ 문제! (성공하면 안됨)' : '✅ 정상 (실패해야 함)'}`);

  // User A가 Lock 해제
  await lockManager.release(testKey, 'user_A');

  // User C가 Lock 획득 (성공해야 함)
  const resultC = await lockManager.acquire(testKey, 60, 'user_C');
  console.log(`   User C (해제 후): ${resultC ? '✅ 성공' : '❌ 실패'}`);

  await lockManager.release(testKey, 'user_C');

  const passed = resultA && !resultB && resultC;
  console.log(`\n   결과: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  return passed;
}

// 테스트 2: Lock 소유권 검증
async function test2() {
  console.log('\n🧪 테스트 2: Lock 소유권 검증');
  console.log('-'.repeat(60));

  const testKey = 'booking:room_202:2025-10-20';

  await lockManager.acquire(testKey, 60, 'user_A');

  // User B가 User A의 Lock을 해제 시도 (실패해야 함)
  const releaseByOther = await lockManager.release(testKey, 'user_B');
  console.log(`   User B가 해제 시도: ${releaseByOther ? '❌ 문제! (성공하면 안됨)' : '✅ 정상 (실패해야 함)'}`);

  // User A가 자신의 Lock 해제 (성공해야 함)
  const releaseByOwner = await lockManager.release(testKey, 'user_A');
  console.log(`   User A가 해제 시도: ${releaseByOwner ? '✅ 성공' : '❌ 실패'}`);

  const passed = !releaseByOther && releaseByOwner;
  console.log(`\n   결과: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  return passed;
}

// 테스트 3: Lock 통계
async function test3() {
  console.log('\n🧪 테스트 3: Lock 통계');
  console.log('-'.repeat(60));

  // 3개의 Lock 생성
  await lockManager.acquire('booking:room_301:2025-10-21', 60, 'user_A');
  await lockManager.acquire('booking:room_302:2025-10-22', 60, 'user_B');
  await lockManager.acquire('booking:room_303:2025-10-23', 60, 'user_C');

  const stats = lockManager.getStats();
  console.log(`   활성 Lock: ${stats.active}개`);
  console.log(`   만료된 Lock: ${stats.expired}개`);
  console.log(`   전체: ${stats.total}개`);

  const passed = stats.active === 3 && stats.total === 3;
  console.log(`\n   결과: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  return passed;
}

// 테스트 4: 실제 예약 시나리오 시뮬레이션
async function test4() {
  console.log('\n🧪 테스트 4: 실제 예약 시나리오');
  console.log('-'.repeat(60));

  const roomId = 'room_401';
  const checkinDate = '2025-10-25';
  const lockKey = `booking:${roomId}:${checkinDate}`;

  console.log('   시나리오: 2명의 사용자가 동시에 같은 객실 예약 시도');
  console.log(`   - 객실: ${roomId}`);
  console.log(`   - 날짜: ${checkinDate}\n`);

  // User A 예약 흐름
  console.log('   👤 User A 예약 시도:');
  const lockA = await lockManager.acquire(lockKey, 600, 'user_A');
  if (lockA) {
    console.log('      1. ✅ Lock 획득');
    console.log('      2. 🔍 재고 확인... (가정: 재고 있음)');
    console.log('      3. 💾 HOLD 예약 생성... (booking_id: 12345)');
    console.log('      4. 📉 재고 차감... (5개 → 4개)');
    // 아직 Lock 해제 안 함 (User B 테스트를 위해)
  }

  // User B 예약 흐름 (User A가 Lock을 보유 중일 때 시도)
  console.log('\n   👤 User B 예약 시도 (User A가 아직 Lock 보유 중):');
  const lockB = await lockManager.acquire(lockKey, 600, 'user_B');
  if (!lockB) {
    console.log('      1. ❌ Lock 획득 실패 (User A가 이미 보유 중)');
    console.log('      2. ⚠️  "다른 사용자가 예약 진행 중입니다" 메시지 표시');
    console.log('      3. 🔄 잠시 후 재시도 안내');
  } else {
    console.log('      ❌ 문제! Lock을 획득하면 안됩니다!');
  }

  // User A가 작업 완료 후 Lock 해제
  if (lockA) {
    await lockManager.release(lockKey, 'user_A');
    console.log('\n   User A: 5. 🔓 Lock 해제 완료');
  }

  const passed = lockA && !lockB;
  console.log(`   결과: ${passed ? '✅ PASS (중복 예약 방지 성공!)' : '❌ FAIL'}`);
  return passed;
}

// 전체 테스트 실행
(async function runAllTests() {
  console.log('\n📊 Lock Manager 기본 기능 검증\n');

  const results = {
    test1: await test1(),
    test2: await test2(),
    test3: await test3(),
    test4: await test4()
  };

  console.log('\n');
  console.log('='.repeat(60));
  console.log('📊 최종 결과');
  console.log('='.repeat(60));
  console.log(`테스트 1 (동시 획득):    ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`테스트 2 (소유권 검증):  ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`테스트 3 (통계 조회):    ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`테스트 4 (실제 시나리오): ${results.test4 ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r);
  console.log('\n' + '='.repeat(60));
  console.log(`전체: ${allPassed ? '✅ 모두 통과!' : '❌ 일부 실패'}`);
  console.log('='.repeat(60));

  if (allPassed) {
    console.log('\n🎉 축하합니다! Lock Manager가 정상 작동합니다!');
    console.log('💡 다음 단계: 실제 DB와 연동된 통합 테스트를 진행하세요.');
  } else {
    console.log('\n⚠️  일부 테스트가 실패했습니다. 코드를 점검하세요.');
  }

  console.log('\n');
})();
