/**
 * 재고 Lock 관리 시스템 (Redis 대체)
 *
 * 중복 예약 방지를 위한 분산 락(Distributed Lock) 구현
 * 메모리 기반이지만 TTL, 자동 해제 등 Redis와 동일한 기능 제공
 */

interface LockEntry {
  key: string;
  owner: string;
  expiresAt: number;
  createdAt: number;
}

class LockManager {
  private locks: Map<string, LockEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 1초마다 만료된 락 정리
    this.startCleanup();
  }

  /**
   * Lock 획득 시도
   * @param key - Lock 키 (예: "room_123_2024-01-01")
   * @param ttlSeconds - 만료 시간 (초)
   * @param owner - Lock 소유자 ID
   * @returns 성공 여부
   */
  async acquire(key: string, ttlSeconds: number = 600, owner: string = 'default'): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(key);

    // 기존 Lock이 있고 아직 만료 안됐으면 실패
    if (existing && existing.expiresAt > now) {
      console.log(`❌ Lock 획득 실패: ${key} (이미 ${existing.owner}가 보유 중, ${Math.ceil((existing.expiresAt - now) / 1000)}초 남음)`);
      return false;
    }

    // Lock 생성
    const lockEntry: LockEntry = {
      key,
      owner,
      expiresAt: now + (ttlSeconds * 1000),
      createdAt: now
    };

    this.locks.set(key, lockEntry);
    console.log(`✅ Lock 획득 성공: ${key} (${owner}, ${ttlSeconds}초 TTL)`);
    return true;
  }

  /**
   * Lock 해제
   * @param key - Lock 키
   * @param owner - Lock 소유자 (일치해야 해제 가능)
   * @returns 성공 여부
   */
  async release(key: string, owner: string = 'default'): Promise<boolean> {
    const existing = this.locks.get(key);

    if (!existing) {
      console.log(`⚠️  Lock 해제 실패: ${key} (존재하지 않음)`);
      return false;
    }

    if (existing.owner !== owner) {
      console.log(`❌ Lock 해제 실패: ${key} (소유자 불일치: ${existing.owner} vs ${owner})`);
      return false;
    }

    this.locks.delete(key);
    console.log(`🔓 Lock 해제 성공: ${key} (${owner})`);
    return true;
  }

  /**
   * Lock 존재 여부 확인
   */
  isLocked(key: string): boolean {
    const existing = this.locks.get(key);
    if (!existing) return false;

    const now = Date.now();
    if (existing.expiresAt <= now) {
      this.locks.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Lock 남은 시간 (초)
   */
  getTTL(key: string): number {
    const existing = this.locks.get(key);
    if (!existing) return -1;

    const now = Date.now();
    const remaining = Math.max(0, existing.expiresAt - now);
    return Math.ceil(remaining / 1000);
  }

  /**
   * Lock 연장
   */
  async extend(key: string, additionalSeconds: number, owner: string = 'default'): Promise<boolean> {
    const existing = this.locks.get(key);

    if (!existing || existing.owner !== owner) {
      return false;
    }

    existing.expiresAt += (additionalSeconds * 1000);
    console.log(`⏱️  Lock 연장: ${key} (+${additionalSeconds}초)`);
    return true;
  }

  /**
   * 만료된 Lock 자동 정리
   */
  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, entry] of this.locks.entries()) {
        if (entry.expiresAt <= now) {
          this.locks.delete(key);
          cleanedCount++;
          console.log(`🧹 만료된 Lock 정리: ${key} (${entry.owner})`);
        }
      }

      if (cleanedCount > 0) {
        console.log(`✨ Lock 정리 완료: ${cleanedCount}개 제거, 현재 ${this.locks.size}개 활성`);
      }
    }, 1000); // 1초마다 실행
  }

  /**
   * 통계 조회
   */
  getStats() {
    const now = Date.now();
    const activeLocks = Array.from(this.locks.values()).filter(l => l.expiresAt > now);

    return {
      total: this.locks.size,
      active: activeLocks.length,
      expired: this.locks.size - activeLocks.length,
      locks: activeLocks.map(l => ({
        key: l.key,
        owner: l.owner,
        ttl: Math.ceil((l.expiresAt - now) / 1000),
        age: Math.ceil((now - l.createdAt) / 1000)
      }))
    };
  }

  /**
   * 모든 Lock 초기화 (테스트용)
   */
  clear() {
    const count = this.locks.size;
    this.locks.clear();
    console.log(`🗑️  모든 Lock 초기화: ${count}개 제거`);
  }

  /**
   * 정리 작업 중지
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('⏹️  LockManager 정리 작업 중지');
    }
  }
}

// 싱글톤 인스턴스
export const lockManager = new LockManager();

// 개발 환경에서 전역으로 노출
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).lockManager = lockManager;
  console.log('🔧 개발 도구: lockManager.getStats() - Lock 상태 확인');
}

/**
 * 편의 함수: Try-with-resources 패턴
 *
 * @example
 * await withLock('room_123', async () => {
 *   // 이 블록 안에서는 Lock이 보장됨
 *   await processBooking();
 * });
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 600,
  owner: string = 'default'
): Promise<{ success: boolean; result?: T; error?: string }> {
  const acquired = await lockManager.acquire(key, ttlSeconds, owner);

  if (!acquired) {
    return {
      success: false,
      error: 'Lock 획득 실패 - 다른 사용자가 처리 중입니다.'
    };
  }

  try {
    const result = await fn();
    return { success: true, result };
  } catch (error) {
    console.error(`❌ Lock 실행 중 오류 (${key}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  } finally {
    await lockManager.release(key, owner);
  }
}

export default lockManager;
