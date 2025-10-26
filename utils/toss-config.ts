/**
 * Toss Payments Configuration
 *
 * TOSS_MODE 환경 변수에 따라 TEST/LIVE 키를 자동 선택
 * - test: 테스트 키 사용
 * - live: 운영 키 사용
 *
 * 롤백 방법: TOSS_MODE=test로 변경 후 서버 재시작
 */

const TOSS_MODE = process.env.TOSS_MODE || 'test';

// 현재 모드 로그 출력
if (TOSS_MODE === 'live') {
  console.log('🔴 [Toss] LIVE MODE 활성화 - 실제 결제가 진행됩니다!');
} else {
  console.log('🟢 [Toss] TEST MODE 활성화 - 테스트 결제만 가능합니다.');
}

/**
 * 현재 모드에 맞는 Toss Client Key 반환
 */
export function getTossClientKey(): string {
  if (TOSS_MODE === 'live') {
    const key = process.env.VITE_TOSS_CLIENT_KEY_LIVE || process.env.VITE_TOSS_CLIENT_KEY;
    if (!key || key.startsWith('live_ck_REPLACE')) {
      console.error('❌ [Toss] LIVE 모드이지만 VITE_TOSS_CLIENT_KEY_LIVE가 설정되지 않았습니다!');
      throw new Error('LIVE Toss Client Key가 설정되지 않았습니다. .env 파일을 확인하세요.');
    }
    return key;
  } else {
    const key = process.env.VITE_TOSS_CLIENT_KEY_TEST || process.env.VITE_TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';
    return key;
  }
}

/**
 * 현재 모드에 맞는 Toss Secret Key 반환
 */
export function getTossSecretKey(): string {
  if (TOSS_MODE === 'live') {
    const key = process.env.TOSS_SECRET_KEY_LIVE || process.env.TOSS_SECRET_KEY;
    if (!key || key.startsWith('live_sk_REPLACE')) {
      console.error('❌ [Toss] LIVE 모드이지만 TOSS_SECRET_KEY_LIVE가 설정되지 않았습니다!');
      throw new Error('LIVE Toss Secret Key가 설정되지 않았습니다. .env 파일을 확인하세요.');
    }
    return key;
  } else {
    const key = process.env.TOSS_SECRET_KEY_TEST || process.env.TOSS_SECRET_KEY || 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R';
    return key;
  }
}

/**
 * 현재 모드에 맞는 Toss Webhook Secret 반환
 */
export function getTossWebhookSecret(): string {
  if (TOSS_MODE === 'live') {
    const secret = process.env.TOSS_WEBHOOK_SECRET_LIVE || process.env.TOSS_WEBHOOK_SECRET;
    if (!secret || secret === 'your_webhook_secret_live_here_change_in_production') {
      console.warn('⚠️  [Toss] LIVE 모드이지만 TOSS_WEBHOOK_SECRET_LIVE가 설정되지 않았습니다!');
      // Webhook secret은 없어도 일단 진행 가능 (서명 검증만 안됨)
    }
    return secret || '';
  } else {
    const secret = process.env.TOSS_WEBHOOK_SECRET_TEST || process.env.TOSS_WEBHOOK_SECRET || '';
    return secret;
  }
}

/**
 * 현재 Toss 모드 반환
 */
export function getTossMode(): 'test' | 'live' {
  return TOSS_MODE === 'live' ? 'live' : 'test';
}

/**
 * LIVE 모드 여부 확인
 */
export function isLiveMode(): boolean {
  return TOSS_MODE === 'live';
}

/**
 * TEST 모드 여부 확인
 */
export function isTestMode(): boolean {
  return TOSS_MODE !== 'live';
}

/**
 * Toss 설정 정보 출력 (디버깅용)
 */
export function printTossConfig(): void {
  console.log('================================');
  console.log('🔐 Toss Payments Configuration');
  console.log('================================');
  console.log(`Mode: ${getTossMode()}`);
  console.log(`Client Key: ${getTossClientKey().substring(0, 20)}...`);
  console.log(`Secret Key: ${getTossSecretKey().substring(0, 20)}...`);
  console.log(`Webhook Secret: ${getTossWebhookSecret() ? '설정됨' : '미설정'}`);
  console.log('================================');
}

// 서버 시작 시 설정 출력
printTossConfig();
