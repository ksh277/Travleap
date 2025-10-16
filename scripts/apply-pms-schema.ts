/**
 * PMS 통합 스키마 적용 스크립트
 *
 * 실행 방법:
 * tsx scripts/apply-pms-schema.ts
 */

import { connect } from '@planetscale/database';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 환경 변수 로드
dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
};

async function applyPMSSchema() {
  console.log('🚀 PMS 통합 스키마 적용 시작...\n');

  // 환경 변수 확인
  if (!config.host || !config.username || !config.password) {
    console.error('❌ 데이터베이스 환경 변수가 설정되지 않았습니다.');
    console.error('   .env 파일에 다음 변수를 확인하세요:');
    console.error('   - DATABASE_HOST');
    console.error('   - DATABASE_USERNAME');
    console.error('   - DATABASE_PASSWORD');
    process.exit(1);
  }

  const conn = connect(config);

  try {
    // SQL 파일 읽기
    const sqlFilePath = path.join(process.cwd(), 'scripts', 'add_pms_integration.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    // SQL을 개별 쿼리로 분리 (세미콜론 기준)
    const queries = sqlContent
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--') && !q.startsWith('SELECT'));

    console.log(`📄 ${queries.length}개의 SQL 쿼리를 실행합니다...\n`);

    // 1. rentcar_vendors 테이블에 PMS 필드 추가
    console.log('1️⃣  rentcar_vendors 테이블에 PMS 필드 추가 중...');

    const pmsColumns = [
      { name: 'pms_provider', def: 'VARCHAR(50) COMMENT "PMS 제공사 (turo, getaround, rentcars, custom)"' },
      { name: 'pms_api_key', def: 'VARCHAR(255) COMMENT "PMS API 키 (암호화 권장)"' },
      { name: 'pms_api_secret', def: 'VARCHAR(255) COMMENT "PMS API Secret (암호화 권장)"' },
      { name: 'pms_endpoint', def: 'VARCHAR(500) COMMENT "PMS API 엔드포인트 URL"' },
      { name: 'pms_sync_enabled', def: 'BOOLEAN DEFAULT FALSE COMMENT "PMS 자동 동기화 활성화"' },
      { name: 'pms_last_sync', def: 'DATETIME COMMENT "마지막 동기화 시간"' },
      { name: 'pms_sync_interval', def: 'INT DEFAULT 3600 COMMENT "동기화 주기 (초, 기본 1시간)"' },
    ];

    for (const col of pmsColumns) {
      try {
        await conn.execute(`ALTER TABLE rentcar_vendors ADD COLUMN ${col.name} ${col.def}`);
        console.log(`   ✅ ${col.name} 추가 완료`);
      } catch (error: any) {
        if (error.message.includes('Duplicate column') || error.message.includes('duplicate')) {
          console.log(`   ⚠️  ${col.name} 이미 존재 (건너뜀)`);
        } else {
          console.error(`   ❌ ${col.name} 추가 실패:`, error.message);
        }
      }
    }
    console.log();

    // 2. pms_sync_logs 테이블 생성
    console.log('2️⃣  pms_sync_logs 테이블 생성 중...');
    try {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS pms_sync_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          vendor_id INT NOT NULL,
          sync_status ENUM('success', 'failed', 'partial') NOT NULL,
          vehicles_added INT DEFAULT 0,
          vehicles_updated INT DEFAULT 0,
          vehicles_deleted INT DEFAULT 0,
          error_message TEXT,
          sync_started_at DATETIME NOT NULL,
          sync_completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_vendor_id (vendor_id),
          INDEX idx_sync_status (sync_status),
          INDEX idx_created_at (created_at)
        ) COMMENT='PMS 동기화 로그'
      `);
      console.log('   ✅ pms_sync_logs 테이블 생성 완료\n');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️  pms_sync_logs 테이블이 이미 존재합니다 (건너뜀)\n');
      } else {
        throw error;
      }
    }

    // 3. pms_vehicle_mapping 테이블 생성
    console.log('3️⃣  pms_vehicle_mapping 테이블 생성 중...');
    try {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS pms_vehicle_mapping (
          id INT AUTO_INCREMENT PRIMARY KEY,
          vendor_id INT NOT NULL,
          pms_vehicle_id VARCHAR(255) NOT NULL COMMENT 'PMS에서의 차량 ID',
          local_vehicle_id INT NOT NULL COMMENT '우리 시스템의 rentcar_vehicles.id',
          pms_provider VARCHAR(50) NOT NULL,
          last_synced_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_pms_vehicle (vendor_id, pms_provider, pms_vehicle_id),
          INDEX idx_local_vehicle_id (local_vehicle_id)
        ) COMMENT='PMS 차량 ID 매핑'
      `);
      console.log('   ✅ pms_vehicle_mapping 테이블 생성 완료\n');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️  pms_vehicle_mapping 테이블이 이미 존재합니다 (건너뜀)\n');
      } else {
        throw error;
      }
    }

    // 4. 스키마 확인
    console.log('4️⃣  스키마 확인 중...');

    const pmsFields = await conn.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'rentcar_vendors'
        AND COLUMN_NAME LIKE 'pms_%'
    `);

    console.log(`   📊 rentcar_vendors 테이블의 PMS 필드: ${pmsFields.rows.length}개`);
    (pmsFields.rows as any[]).forEach((row: any) => {
      console.log(`      - ${row.COLUMN_NAME} (${row.DATA_TYPE})`);
    });

    const syncLogsCheck = await conn.execute(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pms_sync_logs'
    `);

    const mappingCheck = await conn.execute(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pms_vehicle_mapping'
    `);

    console.log(`   📊 pms_sync_logs 테이블: ${(syncLogsCheck.rows[0] as any).count > 0 ? '✅ 존재' : '❌ 없음'}`);
    console.log(`   📊 pms_vehicle_mapping 테이블: ${(mappingCheck.rows[0] as any).count > 0 ? '✅ 존재' : '❌ 없음'}`);

    console.log('\n✅ PMS 통합 스키마 적용 완료!\n');
    console.log('📝 다음 단계:');
    console.log('   1. 렌트카 업체로 로그인');
    console.log('   2. 대시보드에서 "PMS 연동" 버튼 클릭');
    console.log('   3. PMS 제공사 선택 및 API 키 입력');
    console.log('   4. "지금 동기화" 버튼으로 차량 정보 가져오기\n');

  } catch (error) {
    console.error('\n❌ 스키마 적용 실패:', error);
    process.exit(1);
  }
}

// 실행
applyPMSSchema();
