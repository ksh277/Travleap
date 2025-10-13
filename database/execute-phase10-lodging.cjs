#!/usr/bin/env node
/**
 * Phase 10: 숙박(Accommodation) 시스템
 * 호텔, 펜션, 모텔 등 숙박업체 전체 관리 시스템
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function executeMigration() {
  let connection;

  try {
    console.log('📡 PlanetScale 데이터베이스 연결 중...\n');

    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'aws.connect.psdb.cloud',
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('✅ 연결 성공!\n');
    console.log('='.repeat(50));
    console.log('📦 Phase 10: 숙박(Accommodation) 시스템');
    console.log('='.repeat(50) + '\n');

    const sqlPath = path.join(__dirname, 'phase10-lodging-system.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔧 SQL 파일 실행 중...\n');

    // 세미콜론으로 쿼리 분리
    const queries = sql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (query.trim()) {
        try {
          const preview = query.substring(0, 80).replace(/\s+/g, ' ');
          console.log(`실행 중 (${i + 1}/${queries.length}): ${preview}...`);
          await connection.execute(query);
          successCount++;
        } catch (error) {
          if (error.message.includes('already exists') ||
              error.message.includes('Duplicate') ||
              error.code === 'ER_TABLE_EXISTS_EXISTS') {
            console.log(`  ⏭️  이미 존재함 (스킵)`);
            skipCount++;
          } else {
            console.error(`  ❌ 오류: ${error.message}`);
            errorCount++;
          }
        }
      }
    }

    console.log('\n✅ Phase 10 완료!\n');
    console.log('='.repeat(50));
    console.log('📊 실행 결과:');
    console.log(`  - 성공: ${successCount}개`);
    console.log(`  - 스킵: ${skipCount}개`);
    console.log(`  - 오류: ${errorCount}개`);
    console.log('='.repeat(50));
    console.log('\n📋 생성된 테이블:');
    console.log('  1. lodgings (숙박업체 기본 정보)');
    console.log('  2. rooms (객실 타입 마스터)');
    console.log('  3. rate_plans (요금 정책)');
    console.log('  4. availability_daily (일별 재고/요금)');
    console.log('  5. lodging_bookings (숙박 예약)');
    console.log('  6. lodging_policies (정책 관리)');
    console.log('  7. pms_api_credentials (PMS 연동 정보)');
    console.log('  8. pms_sync_jobs (동기화 로그)');
    console.log('  9. lodging_inventory_locks (재고 잠금)');
    console.log('');
    console.log('📝 샘플 데이터:');
    console.log('  - 숙소 1개 (신안 비치 리조트)');
    console.log('  - 객실 2개 (디럭스 오션뷰, 스탠다드 트윈)');
    console.log('  - 요금제 2개 (조식 포함, 기본 요금)');
    console.log('  - 30일 재고 자동 생성');
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error('상세:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 연결 종료\n');
    }
  }
}

executeMigration();
