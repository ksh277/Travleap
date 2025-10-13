#!/usr/bin/env node

/**
 * 기능 플래그 CLI 도구
 *
 * 사용법:
 *   node scripts/feature-flags.js list
 *   node scripts/feature-flags.js enable payment-checkout
 *   node scripts/feature-flags.js disable notification-sms
 *   node scripts/feature-flags.js rollout ai-recommendation 50
 *   node scripts/feature-flags.js status payment-checkout
 */

const fs = require('fs');
const path = require('path');

// 플래그 저장 경로 (프로덕션에서는 Redis/DB 사용)
const CONFIG_FILE = path.join(__dirname, '../data/feature-flags.json');

// 기본 설정
const DEFAULT_FLAGS = {
  'payment-checkout': { enabled: true, description: '토스페이먼츠 결제 기능' },
  'realtime-inventory': { enabled: true, description: 'WebSocket 실시간 재고 업데이트' },
  'notification-email': { enabled: true, description: '이메일 알림 발송' },
  'notification-sms': { enabled: false, description: 'SMS 알림 발송' },
  'price-cache': { enabled: true, description: '가격 조회 캐싱' },
  'circuit-breaker': { enabled: true, description: '외부 API 서킷 브레이커' },
  'audit-logging': { enabled: true, description: '감사 로그 기록', enabledForAdmins: true },
  'inventory-lock': { enabled: true, description: '동시성 제어 재고 잠금' },
  'csv-upload': { enabled: true, description: 'CSV 대량 등록', enabledForAdmins: true },
  'ai-recommendation': { enabled: false, description: 'AI 기반 여행 추천', rolloutPercentage: 10 }
};

/**
 * 설정 파일 로드
 */
function loadConfig() {
  try {
    // data 디렉토리 생성
    const dataDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    }
    return DEFAULT_FLAGS;
  } catch (error) {
    console.error('❌ 설정 파일 로드 실패:', error.message);
    return DEFAULT_FLAGS;
  }
}

/**
 * 설정 파일 저장
 */
function saveConfig(config) {
  try {
    const dataDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('❌ 설정 파일 저장 실패:', error.message);
    return false;
  }
}

/**
 * 모든 플래그 목록 출력
 */
function listFlags() {
  const config = loadConfig();

  console.log('\n📋 기능 플래그 목록:\n');
  console.log('Flag Name                | Status    | Rollout | Description');
  console.log('-------------------------|-----------|---------|----------------------------------');

  Object.entries(config).forEach(([flag, settings]) => {
    const status = settings.enabled ? '✅ 활성화' : '🚫 비활성화';
    const rollout = settings.rolloutPercentage !== undefined
      ? `${settings.rolloutPercentage}%`
      : '-';
    const desc = settings.description || '-';

    console.log(
      `${flag.padEnd(24)} | ${status.padEnd(9)} | ${rollout.padEnd(7)} | ${desc}`
    );
  });

  console.log('');
}

/**
 * 플래그 활성화
 */
function enableFlag(flagName) {
  const config = loadConfig();

  if (!config[flagName]) {
    console.error(`❌ 알 수 없는 플래그: ${flagName}`);
    return;
  }

  config[flagName].enabled = true;

  if (saveConfig(config)) {
    console.log(`✅ "${flagName}" 활성화됨`);
  }
}

/**
 * 플래그 비활성화
 */
function disableFlag(flagName) {
  const config = loadConfig();

  if (!config[flagName]) {
    console.error(`❌ 알 수 없는 플래그: ${flagName}`);
    return;
  }

  config[flagName].enabled = false;

  if (saveConfig(config)) {
    console.log(`🚫 "${flagName}" 비활성화됨`);
  }
}

/**
 * 점진적 배포 설정
 */
function setRollout(flagName, percentage) {
  const config = loadConfig();

  if (!config[flagName]) {
    console.error(`❌ 알 수 없는 플래그: ${flagName}`);
    return;
  }

  const pct = parseInt(percentage, 10);
  if (isNaN(pct) || pct < 0 || pct > 100) {
    console.error('❌ 배포율은 0-100 사이의 숫자여야 합니다');
    return;
  }

  config[flagName].rolloutPercentage = pct;

  if (saveConfig(config)) {
    console.log(`📊 "${flagName}" 배포율 ${pct}%로 설정됨`);
  }
}

/**
 * 플래그 상태 출력
 */
function showStatus(flagName) {
  const config = loadConfig();

  if (!config[flagName]) {
    console.error(`❌ 알 수 없는 플래그: ${flagName}`);
    return;
  }

  const settings = config[flagName];

  console.log(`\n📌 플래그 상태: ${flagName}\n`);
  console.log(`상태: ${settings.enabled ? '✅ 활성화' : '🚫 비활성화'}`);
  console.log(`설명: ${settings.description || '-'}`);

  if (settings.rolloutPercentage !== undefined) {
    console.log(`배포율: ${settings.rolloutPercentage}%`);
  }

  if (settings.enabledForAdmins) {
    console.log(`권한: 관리자 전용`);
  }

  if (settings.enabledForUsers) {
    console.log(`활성화 사용자: ${settings.enabledForUsers.length}명`);
  }

  if (settings.expiresAt) {
    console.log(`만료: ${settings.expiresAt}`);
  }

  console.log('');
}

/**
 * 도움말 출력
 */
function showHelp() {
  console.log(`
기능 플래그 관리 도구

사용법:
  node scripts/feature-flags.js <command> [arguments]

명령어:
  list                          모든 플래그 목록 출력
  enable <flag>                 플래그 활성화
  disable <flag>                플래그 비활성화
  rollout <flag> <percentage>   점진적 배포 설정 (0-100)
  status <flag>                 플래그 상태 출력
  help                          도움말 출력

예시:
  node scripts/feature-flags.js list
  node scripts/feature-flags.js enable payment-checkout
  node scripts/feature-flags.js disable notification-sms
  node scripts/feature-flags.js rollout ai-recommendation 50
  node scripts/feature-flags.js status payment-checkout

긴급 상황 대응:
  # 결제 API 장애 시
  node scripts/feature-flags.js disable payment-checkout

  # 실시간 업데이트 부하 시
  node scripts/feature-flags.js disable realtime-inventory

  # SMS 비용 절감
  node scripts/feature-flags.js disable notification-sms
`);
}

/**
 * 메인 실행
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'list':
      listFlags();
      break;

    case 'enable':
      if (args.length < 2) {
        console.error('❌ 플래그 이름을 지정해주세요');
        console.log('사용법: node scripts/feature-flags.js enable <flag>');
      } else {
        enableFlag(args[1]);
      }
      break;

    case 'disable':
      if (args.length < 2) {
        console.error('❌ 플래그 이름을 지정해주세요');
        console.log('사용법: node scripts/feature-flags.js disable <flag>');
      } else {
        disableFlag(args[1]);
      }
      break;

    case 'rollout':
      if (args.length < 3) {
        console.error('❌ 플래그 이름과 배포율을 지정해주세요');
        console.log('사용법: node scripts/feature-flags.js rollout <flag> <percentage>');
      } else {
        setRollout(args[1], args[2]);
      }
      break;

    case 'status':
      if (args.length < 2) {
        console.error('❌ 플래그 이름을 지정해주세요');
        console.log('사용법: node scripts/feature-flags.js status <flag>');
      } else {
        showStatus(args[1]);
      }
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

// 실행
main();
