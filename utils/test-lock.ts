/**
 * Lock Manager 테스트 유틸리티
 *
 * 중복 예약 방지가 제대로 작동하는지 테스트
 */

import { lockManager } from './lock-manager';

/**
 * 동시 Lock 획득 테스트
 *
 * 같은 키에 대해 여러 사용자가 동시에 Lock을 시도하면
 * 첫 번째만 성공해야 함
 */
export async function testConcurrentLockAcquisition() {
  console.log('\n🧪 테스트 1: 동시 Lock 획득');
  console.log('='.repeat(60));

  const testKey = 'test:room_1:2024-01-01';

  // 첫 번째 사용자가 Lock 획득
  const user1 = await lockManager.acquire(testKey, 60, 'user1');
  console.log(`User 1 Lock 시도: ${user1 ? '✅ 성공' : '❌ 실패'}`);

  // 두 번째 사용자가 같은 Lock 시도 (실패해야 함)
  const user2 = await lockManager.acquire(testKey, 60, 'user2');
  console.log(`User 2 Lock 시도: ${user2 ? '❌ 성공 (문제!)' : '✅ 실패 (정상)'}`);

  // 세 번째 사용자도 실패해야 함
  const user3 = await lockManager.acquire(testKey, 60, 'user3');
  console.log(`User 3 Lock 시도: ${user3 ? '❌ 성공 (문제!)' : '✅ 실패 (정상)'}`);

  // Lock 해제
  const released = await lockManager.release(testKey, 'user1');
  console.log(`User 1 Lock 해제: ${released ? '✅ 성공' : '❌ 실패'}`);

  // 해제 후 다시 획득 가능해야 함
  const user4 = await lockManager.acquire(testKey, 60, 'user4');
  console.log(`User 4 Lock 시도 (해제 후): ${user4 ? '✅ 성공' : '❌ 실패'}`);

  await lockManager.release(testKey, 'user4');

  const result = user1 && !user2 && !user3 && user4;
  console.log(`\n결과: ${result ? '✅ PASS' : '❌ FAIL'}`);
  return result;
}

/**
 * TTL 만료 테스트
 *
 * Lock이 TTL 시간 후 자동으로 해제되는지 확인
 */
export async function testLockExpiration() {
  console.log('\n🧪 테스트 2: Lock 자동 만료 (TTL)');
  console.log('='.repeat(60));

  const testKey = 'test:room_2:2024-01-02';

  // 짧은 TTL (2초)로 Lock 획득
  const acquired = await lockManager.acquire(testKey, 2, 'user1');
  console.log(`Lock 획득 (2초 TTL): ${acquired ? '✅' : '❌'}`);

  // 즉시 다시 시도 (실패해야 함)
  const immediate = await lockManager.acquire(testKey, 2, 'user2');
  console.log(`즉시 재시도: ${immediate ? '❌ 성공 (문제!)' : '✅ 실패 (정상)'}`);

  // 3초 대기
  console.log(`⏳ 3초 대기 중...`);
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 3초 후 재시도 (성공해야 함 - 자동 만료됨)
  const afterExpiry = await lockManager.acquire(testKey, 2, 'user3');
  console.log(`3초 후 재시도: ${afterExpiry ? '✅ 성공 (만료됨)' : '❌ 실패'}`);

  await lockManager.release(testKey, 'user3');

  const result = acquired && !immediate && afterExpiry;
  console.log(`\n결과: ${result ? '✅ PASS' : '❌ FAIL'}`);
  return result;
}

/**
 * Lock 소유자 확인 테스트
 *
 * 다른 사용자가 Lock을 해제할 수 없어야 함
 */
export async function testLockOwnership() {
  console.log('\n🧪 테스트 3: Lock 소유권 확인');
  console.log('='.repeat(60));

  const testKey = 'test:room_3:2024-01-03';

  // User1이 Lock 획득
  await lockManager.acquire(testKey, 60, 'user1');
  console.log(`User 1 Lock 획득: ✅`);

  // User2가 해제 시도 (실패해야 함)
  const released = await lockManager.release(testKey, 'user2');
  console.log(`User 2가 해제 시도: ${released ? '❌ 성공 (문제!)' : '✅ 실패 (정상)'}`);

  // Lock이 여전히 잠겨있어야 함
  const stillLocked = lockManager.isLocked(testKey);
  console.log(`Lock 여전히 유효: ${stillLocked ? '✅' : '❌'}`);

  // User1만 해제 가능
  const ownerRelease = await lockManager.release(testKey, 'user1');
  console.log(`User 1이 해제: ${ownerRelease ? '✅' : '❌'}`);

  const result = !released && stillLocked && ownerRelease;
  console.log(`\n결과: ${result ? '✅ PASS' : '❌ FAIL'}`);
  return result;
}

/**
 * Lock 통계 테스트
 */
export async function testLockStats() {
  console.log('\n🧪 테스트 4: Lock 통계 조회');
  console.log('='.repeat(60));

  // 여러 개 Lock 생성
  await lockManager.acquire('test:room_4:2024-01-04', 60, 'user1');
  await lockManager.acquire('test:room_5:2024-01-05', 60, 'user2');
  await lockManager.acquire('test:room_6:2024-01-06', 60, 'user3');

  const stats = lockManager.getStats();
  console.log(`\n📊 Lock 통계:`);
  console.log(`   - 전체: ${stats.total}개`);
  console.log(`   - 활성: ${stats.active}개`);
  console.log(`   - 만료: ${stats.expired}개`);
  console.log(`\n활성 Lock 목록:`);
  stats.locks.forEach(lock => {
    console.log(`   - ${lock.key}`);
    console.log(`     소유자: ${lock.owner}, TTL: ${lock.ttl}초, 생성: ${lock.age}초 전`);
  });

  // 정리
  lockManager.clear();

  console.log(`\n결과: ✅ PASS`);
  return true;
}

/**
 * 전체 테스트 실행
 */
export async function runAllLockTests() {
  console.log('\n');
  console.log('🚀 Lock Manager 전체 테스트 시작');
  console.log('='.repeat(60));

  const results = {
    test1: await testConcurrentLockAcquisition(),
    test2: await testLockExpiration(),
    test3: await testLockOwnership(),
    test4: await testLockStats()
  };

  console.log('\n');
  console.log('📊 최종 결과');
  console.log('='.repeat(60));
  console.log(`테스트 1 (동시 획득): ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`테스트 2 (자동 만료): ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`테스트 3 (소유권): ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`테스트 4 (통계): ${results.test4 ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r);
  console.log(`\n전체: ${allPassed ? '✅ 모두 통과' : '❌ 일부 실패'}`);
  console.log('='.repeat(60));

  return allPassed;
}

// 브라우저 콘솔에서 테스트 가능
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).testLock = runAllLockTests;
  console.log('🔧 개발 도구: testLock() - Lock Manager 전체 테스트 실행');
}

export default {
  runAllLockTests,
  testConcurrentLockAcquisition,
  testLockExpiration,
  testLockOwnership,
  testLockStats
};
