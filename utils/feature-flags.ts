/**
 * 기능 플래그 시스템
 * - 위험 기능 안전 배포
 * - 장애 시 긴급 롤백
 * - A/B 테스트 지원
 */

export type FeatureFlag =
  | 'payment-checkout'          // 결제 기능
  | 'realtime-inventory'        // 실시간 재고 업데이트 (WebSocket)
  | 'notification-email'        // 이메일 알림
  | 'notification-sms'          // SMS 알림
  | 'price-cache'               // 가격 캐싱
  | 'circuit-breaker'           // 서킷 브레이커
  | 'audit-logging'             // 감사 로그
  | 'inventory-lock'            // 재고 잠금
  | 'csv-upload'                // CSV 대량 등록
  | 'ai-recommendation';        // AI 추천

interface FeatureFlagConfig {
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;  // A/B 테스트용 (0-100)
  enabledForUsers?: string[];  // 특정 사용자만 활성화
  enabledForAdmins?: boolean;  // 관리자만 활성화
  expiresAt?: Date;            // 자동 비활성화 시간
}

/**
 * 기능 플래그 저장소 (메모리 기반)
 * 프로덕션 환경에서는 Redis/DB 사용 권장
 */
class FeatureFlagStore {
  private flags: Map<FeatureFlag, FeatureFlagConfig> = new Map();

  constructor() {
    // 기본값 설정
    this.initializeDefaults();
  }

  /**
   * 기본 플래그 설정
   */
  private initializeDefaults() {
    // 핵심 기능: 기본 활성화
    this.flags.set('payment-checkout', {
      enabled: true,
      description: '토스페이먼츠 결제 기능'
    });

    this.flags.set('realtime-inventory', {
      enabled: true,
      description: 'WebSocket 실시간 재고 업데이트'
    });

    this.flags.set('notification-email', {
      enabled: true,
      description: '이메일 알림 발송'
    });

    // 선택적 기능: 기본 비활성화 (비용/성능 고려)
    this.flags.set('notification-sms', {
      enabled: false,
      description: 'SMS 알림 발송 (네이버 클라우드)'
    });

    // 고급 기능: 기본 활성화
    this.flags.set('price-cache', {
      enabled: true,
      description: '가격 조회 캐싱 (5분 TTL)'
    });

    this.flags.set('circuit-breaker', {
      enabled: true,
      description: '외부 API 서킷 브레이커'
    });

    this.flags.set('audit-logging', {
      enabled: true,
      description: '감사 로그 기록',
      enabledForAdmins: true
    });

    this.flags.set('inventory-lock', {
      enabled: true,
      description: '동시성 제어 재고 잠금'
    });

    // 관리 기능: 관리자만 활성화
    this.flags.set('csv-upload', {
      enabled: true,
      description: 'CSV 대량 등록',
      enabledForAdmins: true
    });

    // 베타 기능: 점진적 배포
    this.flags.set('ai-recommendation', {
      enabled: false,
      description: 'AI 기반 여행 추천',
      rolloutPercentage: 10  // 10% 사용자만
    });
  }

  /**
   * 플래그 활성화 여부 확인
   */
  isEnabled(
    flag: FeatureFlag,
    context?: {
      userId?: string;
      isAdmin?: boolean;
    }
  ): boolean {
    const config = this.flags.get(flag);
    if (!config) return false;

    // 1. 기본 활성화 여부
    if (!config.enabled) return false;

    // 2. 만료 시간 체크
    if (config.expiresAt && new Date() > config.expiresAt) {
      return false;
    }

    // 3. 관리자 전용 기능
    if (config.enabledForAdmins && !context?.isAdmin) {
      return false;
    }

    // 4. 특정 사용자만 활성화
    if (config.enabledForUsers && context?.userId) {
      if (!config.enabledForUsers.includes(context.userId)) {
        return false;
      }
    }

    // 5. A/B 테스트 (rollout percentage)
    if (config.rolloutPercentage !== undefined && context?.userId) {
      const hash = this.hashUserId(context.userId);
      const bucket = hash % 100;
      if (bucket >= config.rolloutPercentage) {
        return false;
      }
    }

    return true;
  }

  /**
   * 플래그 활성화
   */
  enable(flag: FeatureFlag, config?: Partial<FeatureFlagConfig>) {
    const current = this.flags.get(flag);
    if (current) {
      this.flags.set(flag, {
        ...current,
        ...config,
        enabled: true
      });
      console.log(`✅ [FeatureFlag] "${flag}" 활성화됨`);
    }
  }

  /**
   * 플래그 비활성화
   */
  disable(flag: FeatureFlag) {
    const current = this.flags.get(flag);
    if (current) {
      this.flags.set(flag, {
        ...current,
        enabled: false
      });
      console.log(`🚫 [FeatureFlag] "${flag}" 비활성화됨`);
    }
  }

  /**
   * 점진적 배포 비율 설정
   */
  setRolloutPercentage(flag: FeatureFlag, percentage: number) {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    const current = this.flags.get(flag);
    if (current) {
      this.flags.set(flag, {
        ...current,
        rolloutPercentage: percentage
      });
      console.log(`📊 [FeatureFlag] "${flag}" 배포율 ${percentage}%로 설정`);
    }
  }

  /**
   * 특정 사용자에게만 활성화
   */
  enableForUsers(flag: FeatureFlag, userIds: string[]) {
    const current = this.flags.get(flag);
    if (current) {
      this.flags.set(flag, {
        ...current,
        enabledForUsers: userIds
      });
      console.log(`👥 [FeatureFlag] "${flag}" ${userIds.length}명에게 활성화`);
    }
  }

  /**
   * 자동 만료 시간 설정
   */
  setExpiration(flag: FeatureFlag, expiresAt: Date) {
    const current = this.flags.get(flag);
    if (current) {
      this.flags.set(flag, {
        ...current,
        expiresAt
      });
      console.log(`⏰ [FeatureFlag] "${flag}" 만료 시간: ${expiresAt.toISOString()}`);
    }
  }

  /**
   * 모든 플래그 상태 조회
   */
  getAllFlags(): Map<FeatureFlag, FeatureFlagConfig> {
    return new Map(this.flags);
  }

  /**
   * 플래그 상세 정보 조회
   */
  getConfig(flag: FeatureFlag): FeatureFlagConfig | undefined {
    return this.flags.get(flag);
  }

  /**
   * 사용자 ID 해싱 (A/B 테스트용)
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * 플래그 리셋 (테스트용)
   */
  reset() {
    this.flags.clear();
    this.initializeDefaults();
    console.log('🔄 [FeatureFlag] 모든 플래그 초기화됨');
  }
}

// 싱글톤 인스턴스
const featureFlagStore = new FeatureFlagStore();

/**
 * 기능 활성화 여부 확인 (편의 함수)
 */
export function isFeatureEnabled(
  flag: FeatureFlag,
  context?: {
    userId?: string;
    isAdmin?: boolean;
  }
): boolean {
  return featureFlagStore.isEnabled(flag, context);
}

/**
 * 플래그 활성화
 */
export function enableFeature(flag: FeatureFlag, config?: Partial<FeatureFlagConfig>) {
  featureFlagStore.enable(flag, config);
}

/**
 * 플래그 비활성화
 */
export function disableFeature(flag: FeatureFlag) {
  featureFlagStore.disable(flag);
}

/**
 * 점진적 배포 설정
 */
export function setRolloutPercentage(flag: FeatureFlag, percentage: number) {
  featureFlagStore.setRolloutPercentage(flag, percentage);
}

/**
 * 특정 사용자 활성화
 */
export function enableForUsers(flag: FeatureFlag, userIds: string[]) {
  featureFlagStore.enableForUsers(flag, userIds);
}

/**
 * 자동 만료 설정
 */
export function setExpiration(flag: FeatureFlag, expiresAt: Date) {
  featureFlagStore.setExpiration(flag, expiresAt);
}

/**
 * 모든 플래그 상태 조회
 */
export function getAllFlags() {
  return featureFlagStore.getAllFlags();
}

/**
 * 플래그 상세 정보 조회
 */
export function getFeatureConfig(flag: FeatureFlag) {
  return featureFlagStore.getConfig(flag);
}

/**
 * 플래그 리셋
 */
export function resetFeatureFlags() {
  featureFlagStore.reset();
}

// Export singleton store for advanced usage
export { featureFlagStore };

/**
 * 사용 예시:
 *
 * // 기본 사용
 * if (isFeatureEnabled('payment-checkout')) {
 *   await processPayment();
 * }
 *
 * // 사용자 컨텍스트 제공
 * if (isFeatureEnabled('ai-recommendation', { userId: '123', isAdmin: false })) {
 *   showAIRecommendations();
 * }
 *
 * // 긴급 비활성화
 * disableFeature('payment-checkout');
 *
 * // 점진적 배포 (10% → 50% → 100%)
 * setRolloutPercentage('ai-recommendation', 10);  // 1주차
 * setRolloutPercentage('ai-recommendation', 50);  // 2주차
 * setRolloutPercentage('ai-recommendation', 100); // 3주차
 *
 * // 베타 테스터에게만 활성화
 * enableForUsers('ai-recommendation', ['user-1', 'user-2', 'user-3']);
 *
 * // 프로모션 기간만 활성화
 * enableFeature('special-discount', {
 *   rolloutPercentage: 100,
 *   expiresAt: new Date('2025-01-31T23:59:59Z')
 * });
 */
