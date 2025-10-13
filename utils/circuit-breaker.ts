/**
 * 서킷 브레이커 패턴
 * 외부 API 호출 실패율 >5% 시 자동으로 차단
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  failureThreshold: number; // 실패율 임계값 (0-1)
  successThreshold: number; // HALF_OPEN에서 CLOSED로 전환하기 위한 연속 성공 횟수
  timeout: number; // OPEN 상태 유지 시간 (ms)
  monitoringPeriod: number; // 실패율 계산 기간 (ms)
}

class CircuitBreaker {
  private state: CircuitState;
  private failureCount: number;
  private successCount: number;
  private totalRequests: number;
  private lastFailureTime: number;
  private openedAt: number;
  private options: CircuitBreakerOptions;
  private recentResults: boolean[]; // true = success, false = failure
  private maxResultsToTrack: number;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.lastFailureTime = 0;
    this.openedAt = 0;
    this.recentResults = [];
    this.maxResultsToTrack = 100; // 최근 100개 요청 추적

    this.options = {
      failureThreshold: options.failureThreshold || 0.05, // 5%
      successThreshold: options.successThreshold || 3, // 3번 연속 성공
      timeout: options.timeout || 60000, // 1분
      monitoringPeriod: options.monitoringPeriod || 300000 // 5분
    };
  }

  /**
   * API 호출 실행
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    // 1. OPEN 상태 확인
    if (this.state === 'OPEN') {
      const now = Date.now();

      // timeout 지났으면 HALF_OPEN으로 전환
      if (now - this.openedAt >= this.options.timeout) {
        console.log('[Circuit Breaker] OPEN → HALF_OPEN');
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        // 여전히 OPEN 상태면 fallback 실행
        console.log('[Circuit Breaker] OPEN 상태, fallback 실행');
        if (fallback) {
          return await fallback();
        } else {
          throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
        }
      }
    }

    // 2. 실제 호출 시도
    try {
      const result = await fn();

      // 성공 처리
      this.onSuccess();

      return result;
    } catch (error) {
      // 실패 처리
      this.onFailure();

      // fallback 있으면 실행
      if (fallback) {
        console.log('[Circuit Breaker] 실패, fallback 실행');
        return await fallback();
      } else {
        throw error;
      }
    }
  }

  /**
   * 성공 처리
   */
  private onSuccess(): void {
    this.totalRequests++;
    this.recentResults.push(true);
    this.trimResults();

    if (this.state === 'HALF_OPEN') {
      this.successCount++;

      // 연속 성공 횟수가 임계값 도달 시 CLOSED로 전환
      if (this.successCount >= this.options.successThreshold) {
        console.log('[Circuit Breaker] HALF_OPEN → CLOSED');
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
      }
    }
  }

  /**
   * 실패 처리
   */
  private onFailure(): void {
    this.totalRequests++;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.recentResults.push(false);
    this.trimResults();

    // HALF_OPEN에서 실패하면 즉시 OPEN으로
    if (this.state === 'HALF_OPEN') {
      console.log('[Circuit Breaker] HALF_OPEN → OPEN (실패)');
      this.state = 'OPEN';
      this.openedAt = Date.now();
      this.successCount = 0;
      return;
    }

    // CLOSED 상태에서 실패율 체크
    if (this.state === 'CLOSED') {
      const failureRate = this.getFailureRate();

      if (failureRate >= this.options.failureThreshold && this.recentResults.length >= 10) {
        console.log(`[Circuit Breaker] CLOSED → OPEN (실패율 ${(failureRate * 100).toFixed(2)}%)`);
        this.state = 'OPEN';
        this.openedAt = Date.now();
      }
    }
  }

  /**
   * 최근 결과 배열 크기 제한
   */
  private trimResults(): void {
    if (this.recentResults.length > this.maxResultsToTrack) {
      this.recentResults = this.recentResults.slice(-this.maxResultsToTrack);
    }
  }

  /**
   * 실패율 계산
   */
  private getFailureRate(): number {
    if (this.recentResults.length === 0) return 0;

    const failures = this.recentResults.filter(r => !r).length;
    return failures / this.recentResults.length;
  }

  /**
   * 상태 조회
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * 통계 조회
   */
  getStats(): {
    state: CircuitState;
    totalRequests: number;
    failureCount: number;
    failureRate: number;
    recentFailures: number;
    lastFailureTime: Date | null;
  } {
    const recentFailures = this.recentResults.filter(r => !r).length;
    const failureRate = this.getFailureRate();

    return {
      state: this.state,
      totalRequests: this.totalRequests,
      failureCount: this.failureCount,
      failureRate: Math.round(failureRate * 10000) / 100, // 백분율
      recentFailures,
      lastFailureTime: this.lastFailureTime > 0 ? new Date(this.lastFailureTime) : null
    };
  }

  /**
   * 수동으로 OPEN 상태로 전환
   */
  forceOpen(): void {
    console.log('[Circuit Breaker] 수동 OPEN');
    this.state = 'OPEN';
    this.openedAt = Date.now();
  }

  /**
   * 수동으로 CLOSED 상태로 전환
   */
  forceClose(): void {
    console.log('[Circuit Breaker] 수동 CLOSED');
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * 통계 초기화
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.lastFailureTime = 0;
    this.openedAt = 0;
    this.recentResults = [];
    console.log('[Circuit Breaker] 초기화 완료');
  }
}

// 외부 API별 서킷 브레이커 인스턴스
export const paymentAPICircuit = new CircuitBreaker({
  failureThreshold: 0.05, // 5%
  successThreshold: 3,
  timeout: 60000 // 1분
});

export const emailAPICircuit = new CircuitBreaker({
  failureThreshold: 0.10, // 10%
  successThreshold: 2,
  timeout: 30000 // 30초
});

export const smsAPICircuit = new CircuitBreaker({
  failureThreshold: 0.10, // 10%
  successThreshold: 2,
  timeout: 30000 // 30초
});

export const vendorAPICircuit = new CircuitBreaker({
  failureThreshold: 0.05, // 5%
  successThreshold: 3,
  timeout: 60000 // 1분
});

export default CircuitBreaker;
