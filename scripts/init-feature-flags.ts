/**
 * Feature Flags 초기화 스크립트
 *
 * 실행 방법:
 * npx tsx scripts/init-feature-flags.ts
 *
 * 목적:
 * - feature_flags 테이블 생성
 * - 초기 플래그 데이터 삽입
 * - 기존 플래그는 유지 (is_enabled 값 변경 안 함)
 */

// .env 파일 로드
import * as dotenv from 'dotenv';
dotenv.config();

import { getDatabase } from '../utils/database';

interface FeatureFlag {
  flag_name: string;
  description: string;
  is_enabled: boolean;
  disabled_message: string | null;
}

const INITIAL_FLAGS: FeatureFlag[] = [
  // 전역 결제 플래그
  {
    flag_name: 'payment_enabled',
    description: '전체 결제 시스템 활성화 여부',
    is_enabled: true,
    disabled_message: null
  },

  // 카테고리별 결제 플래그
  {
    flag_name: 'popup_payment_enabled',
    description: '팝업 상품 결제 활성화 여부',
    is_enabled: true,
    disabled_message: null
  },
  {
    flag_name: 'travel_payment_enabled',
    description: '여행 상품 결제 활성화 여부',
    is_enabled: true,
    disabled_message: null
  },
  {
    flag_name: 'accommodation_payment_enabled',
    description: '숙박 상품 결제 활성화 여부',
    is_enabled: true,
    disabled_message: null
  },
  {
    flag_name: 'rentcar_payment_enabled',
    description: '렌트카 결제 활성화 여부',
    is_enabled: true,
    disabled_message: null
  },
  {
    flag_name: 'experience_payment_enabled',
    description: '체험 상품 결제 활성화 여부',
    is_enabled: true,
    disabled_message: null
  },
  {
    flag_name: 'food_payment_enabled',
    description: '음식 상품 결제 활성화 여부',
    is_enabled: true,
    disabled_message: null
  },
  {
    flag_name: 'event_payment_enabled',
    description: '행사 상품 결제 활성화 여부',
    is_enabled: true,
    disabled_message: null
  },
  {
    flag_name: 'attraction_payment_enabled',
    description: '관광지 상품 결제 활성화 여부',
    is_enabled: true,
    disabled_message: null
  },

  // 기능별 플래그
  {
    flag_name: 'cart_enabled',
    description: '장바구니 기능 활성화',
    is_enabled: true,
    disabled_message: null
  },
  {
    flag_name: 'points_enabled',
    description: '포인트 시스템 활성화',
    is_enabled: true,
    disabled_message: null
  },
  {
    flag_name: 'reviews_enabled',
    description: '리뷰 작성 기능 활성화',
    is_enabled: true,
    disabled_message: null
  },
  {
    flag_name: 'vendor_registration_enabled',
    description: '벤더 회원가입 활성화',
    is_enabled: true,
    disabled_message: null
  },

  // 비상 스위치
  {
    flag_name: 'maintenance_mode',
    description: '점검 모드 (모든 기능 차단)',
    is_enabled: false,
    disabled_message: '시스템 점검 중입니다. 잠시 후 다시 시도해주세요.'
  }
];

async function initFeatureFlags() {
  const db = getDatabase();

  console.log('🚀 Feature Flags 초기화 시작...\n');

  try {
    // 1. 테이블 생성 (존재하지 않는 경우)
    console.log('📋 feature_flags 테이블 생성 중...');

    await db.execute(`
      CREATE TABLE IF NOT EXISTS feature_flags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        flag_name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255) NULL COMMENT '플래그 설명',
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '플래그 활성화 여부',
        disabled_message VARCHAR(255) NULL COMMENT '비활성화 시 사용자에게 보여줄 메시지',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_flag_name (flag_name),
        INDEX idx_is_enabled (is_enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='기능 플래그 테이블 - 운영 중 기능 제어'
    `);

    console.log('✅ feature_flags 테이블 생성 완료\n');

    // 2. 초기 플래그 삽입 (UPSERT)
    console.log('📝 초기 플래그 데이터 삽입 중...\n');

    for (const flag of INITIAL_FLAGS) {
      try {
        // 플래그가 이미 존재하는지 확인
        const existing = await db.query(
          'SELECT id, is_enabled FROM feature_flags WHERE flag_name = ?',
          [flag.flag_name]
        );

        if (existing.length > 0) {
          // 이미 존재하는 플래그: description만 업데이트 (is_enabled는 유지)
          await db.execute(
            `UPDATE feature_flags
             SET description = ?,
                 disabled_message = ?,
                 updated_at = NOW()
             WHERE flag_name = ?`,
            [flag.description, flag.disabled_message, flag.flag_name]
          );

          console.log(`   ♻️  ${flag.flag_name}: 업데이트 (is_enabled=${existing[0].is_enabled} 유지)`);
        } else {
          // 새 플래그: 전체 데이터 삽입
          await db.execute(
            `INSERT INTO feature_flags (flag_name, description, is_enabled, disabled_message)
             VALUES (?, ?, ?, ?)`,
            [flag.flag_name, flag.description, flag.is_enabled, flag.disabled_message]
          );

          console.log(`   ✅ ${flag.flag_name}: 생성 (is_enabled=${flag.is_enabled})`);
        }
      } catch (error) {
        console.error(`   ❌ ${flag.flag_name}: 오류 - ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 3. 결과 확인
    console.log('\n📊 현재 Feature Flags 목록:\n');

    const allFlags = await db.query(`
      SELECT flag_name, description, is_enabled, disabled_message
      FROM feature_flags
      ORDER BY
        CASE
          WHEN flag_name = 'payment_enabled' THEN 1
          WHEN flag_name = 'maintenance_mode' THEN 999
          WHEN flag_name LIKE '%_payment_enabled' THEN 2
          ELSE 3
        END,
        flag_name
    `);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('FLAG NAME'.padEnd(35) + ' | ' + 'STATUS'.padEnd(10) + ' | ' + 'DESCRIPTION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const flag of allFlags) {
      const status = flag.is_enabled ? '✅ ON' : '🚫 OFF';
      const name = flag.flag_name.padEnd(35);
      const statusStr = status.padEnd(10);
      const desc = flag.description || '';

      console.log(`${name} | ${statusStr} | ${desc}`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 4. 사용 가이드 출력
    console.log('📖 Feature Flags 사용 가이드:\n');
    console.log('   1. 특정 플래그 비활성화:');
    console.log('      UPDATE feature_flags');
    console.log("      SET is_enabled = FALSE,");
    console.log("          disabled_message = '결제 시스템 점검 중입니다.',");
    console.log("          updated_at = NOW()");
    console.log("      WHERE flag_name = 'payment_enabled';\n");

    console.log('   2. 플래그 다시 활성화:');
    console.log('      UPDATE feature_flags');
    console.log("      SET is_enabled = TRUE,");
    console.log("          disabled_message = NULL,");
    console.log("          updated_at = NOW()");
    console.log("      WHERE flag_name = 'payment_enabled';\n");

    console.log('   3. 코드에서 사용:');
    console.log("      import { checkFeatureFlag } from '../utils/feature-flags-db';");
    console.log("      const flag = await checkFeatureFlag('payment_enabled');");
    console.log("      if (!flag.isEnabled) {");
    console.log("        return res.status(503).json({");
    console.log("          success: false,");
    console.log("          message: flag.disabledMessage");
    console.log("        });");
    console.log("      }\n");

    console.log('✅ Feature Flags 초기화 완료!\n');

  } catch (error) {
    console.error('❌ Feature Flags 초기화 실패:', error);
    process.exit(1);
  }
}

// 스크립트 실행
initFeatureFlags()
  .then(() => {
    console.log('👋 스크립트 종료\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 치명적 오류:', error);
    process.exit(1);
  });
