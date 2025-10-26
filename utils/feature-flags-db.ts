/**
 * DB 기반 기능 플래그 (Feature Flags) 시스템
 *
 * 프로덕션 환경을 위한 DB 저장 기반 플래그 시스템
 * - 비상 스위치로 특정 기능을 ON/OFF
 * - 관리자가 실시간으로 플래그 변경 가능
 * - 캐싱으로 성능 최적화 (15초 TTL)
 */

import { getDatabase } from './database.js';

// 플래그 캐시 (15초 TTL)
interface FlagCacheEntry {
  isEnabled: boolean;
  disabledMessage: string | null;
  cachedAt: number;
}

const flagCache = new Map<string, FlagCacheEntry>();
const CACHE_TTL = 15000; // 15초

/**
 * 기능 플래그 확인
 *
 * @param flagName - 플래그 이름 (예: 'payment_enabled', 'popup_payment_enabled')
 * @returns { isEnabled: boolean, disabledMessage: string | null }
 */
export async function checkFeatureFlag(flagName: string): Promise<{ isEnabled: boolean; disabledMessage: string | null }> {
  const db = getDatabase();

  // 캐시 확인
  const cached = flagCache.get(flagName);
  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL) {
    return { isEnabled: cached.isEnabled, disabledMessage: cached.disabledMessage };
  }

  try {
    const flags = await db.query(
      'SELECT is_enabled, disabled_message FROM feature_flags WHERE flag_name = ? LIMIT 1',
      [flagName]
    );

    if (flags.length === 0) {
      // 플래그가 없으면 기본적으로 활성화
      const result = { isEnabled: true, disabledMessage: null };
      flagCache.set(flagName, { ...result, cachedAt: Date.now() });
      return result;
    }

    const flag = flags[0];
    const result = {
      isEnabled: Boolean(flag.is_enabled),
      disabledMessage: flag.disabled_message || null
    };

    // 캐시 업데이트
    flagCache.set(flagName, { ...result, cachedAt: Date.now() });

    return result;

  } catch (error) {
    console.error(`❌ [FeatureFlag] Error checking flag ${flagName}:`, error);
    // 에러 발생 시 안전하게 활성화 상태로 처리
    return { isEnabled: true, disabledMessage: null };
  }
}

/**
 * 카테고리별 결제 플래그 확인
 *
 * 우선순위:
 * 1. 전체 결제 플래그 (payment_enabled) 확인
 * 2. 카테고리별 플래그 (예: popup_payment_enabled) 확인
 *
 * @param category - 카테고리 이름 (예: '팝업', '여행')
 * @returns { isEnabled: boolean, disabledMessage: string | null }
 */
export async function checkPaymentByCategory(category: string | null): Promise<{ isEnabled: boolean; disabledMessage: string | null }> {
  // 1. 전체 결제 플래그 확인
  const globalPaymentFlag = await checkFeatureFlag('payment_enabled');
  if (!globalPaymentFlag.isEnabled) {
    return globalPaymentFlag;
  }

  // 2. 카테고리별 플래그 확인
  if (category) {
    const categoryFlagName = `${category.toLowerCase()}_payment_enabled`;
    const categoryFlag = await checkFeatureFlag(categoryFlagName);
    if (!categoryFlag.isEnabled) {
      return categoryFlag;
    }
  }

  return { isEnabled: true, disabledMessage: null };
}

/**
 * Express 미들웨어: 기능 플래그 확인
 *
 * 사용 예:
 * app.post('/api/payments/confirm', requireFeature('payment_enabled'), async (req, res) => { ... });
 */
export function requireFeature(flagName: string) {
  return async (req: any, res: any, next: any) => {
    const flag = await checkFeatureFlag(flagName);

    if (!flag.isEnabled) {
      return res.status(503).json({
        success: false,
        code: 'FEATURE_DISABLED',
        message: flag.disabledMessage || '이 기능은 현재 사용할 수 없습니다.'
      });
    }

    next();
  };
}

/**
 * Express 미들웨어: 카테고리별 결제 플래그 확인
 *
 * 사용 예:
 * app.post('/api/orders', requirePaymentByCategory(), async (req, res) => { ... });
 */
export function requirePaymentByCategory() {
  return async (req: any, res: any, next: any) => {
    // 요청 바디에서 카테고리 추출
    const category = req.body?.category || req.body?.items?.[0]?.category || null;

    const flag = await checkPaymentByCategory(category);

    if (!flag.isEnabled) {
      return res.status(503).json({
        success: false,
        code: 'PAYMENT_DISABLED',
        message: flag.disabledMessage || '결제 서비스가 일시 중지되었습니다.'
      });
    }

    next();
  };
}

/**
 * 플래그 캐시 초기화 (관리자가 플래그 변경 시 호출)
 */
export function clearFlagCache(flagName?: string) {
  if (flagName) {
    flagCache.delete(flagName);
    console.log(`🔄 [FeatureFlag] Cache cleared for ${flagName}`);
  } else {
    flagCache.clear();
    console.log('🔄 [FeatureFlag] All cache cleared');
  }
}

/**
 * 플래그 활성화 (DB 업데이트)
 */
export async function enableFlag(flagName: string): Promise<boolean> {
  const db = getDatabase();
  try {
    await db.execute(
      'UPDATE feature_flags SET is_enabled = TRUE, updated_at = NOW() WHERE flag_name = ?',
      [flagName]
    );
    clearFlagCache(flagName);
    console.log(`✅ [FeatureFlag] "${flagName}" 활성화됨`);
    return true;
  } catch (error) {
    console.error(`❌ [FeatureFlag] Error enabling flag ${flagName}:`, error);
    return false;
  }
}

/**
 * 플래그 비활성화 (DB 업데이트)
 */
export async function disableFlag(flagName: string, disabledMessage?: string): Promise<boolean> {
  const db = getDatabase();
  try {
    const message = disabledMessage || '이 기능은 현재 사용할 수 없습니다.';
    await db.execute(
      'UPDATE feature_flags SET is_enabled = FALSE, disabled_message = ?, updated_at = NOW() WHERE flag_name = ?',
      [message, flagName]
    );
    clearFlagCache(flagName);
    console.log(`🚫 [FeatureFlag] "${flagName}" 비활성화됨`);
    return true;
  } catch (error) {
    console.error(`❌ [FeatureFlag] Error disabling flag ${flagName}:`, error);
    return false;
  }
}

/**
 * 모든 플래그 조회
 */
export async function getAllFlags(): Promise<any[]> {
  const db = getDatabase();
  try {
    const flags = await db.query('SELECT * FROM feature_flags ORDER BY flag_name');
    return flags;
  } catch (error) {
    console.error('❌ [FeatureFlag] Error fetching all flags:', error);
    return [];
  }
}
