#!/usr/bin/env node
/**
 * Phase 9: 요금 정책, 보험, 추가 옵션 시스템
 * 업체별 요금 정책 및 상품 관리 테이블 생성
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
        rejectUnauthorized: false  // PlanetScale용
      },
      multipleStatements: true  // 여러 쿼리 실행
    });

    console.log('✅ 연결 성공!\n');
    console.log('='.repeat(50) + '\n');
    console.log('📦 Phase 9: 요금 정책/보험/옵션 시스템\n');
    console.log('='.repeat(50) + '\n');

    // Phase 9 SQL 실행
    const sqlPath = path.join(__dirname, 'phase9-pricing-policies.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔧 SQL 파일 실행 중...\n');

    // 세미콜론으로 구분된 쿼리들을 배열로 분리
    const queries = sql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (query.trim()) {
        try {
          const preview = query.substring(0, 80).replace(/\s+/g, ' ');
          console.log(`실행 중 (${i + 1}/${queries.length}): ${preview}...`);
          await connection.execute(query);
          successCount++;
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_EXISTS' ||
              error.code === 'ER_DUP_ENTRY' ||
              error.message.includes('Duplicate')) {
            console.log(`  ⏭️  이미 존재함 (스킵)`);
            skipCount++;
          } else {
            console.error(`  ❌ 오류: ${error.message}`);
          }
        }
      }
    }

    console.log('\n✅ Phase 9 완료!\n');
    console.log('='.repeat(50));
    console.log('📊 실행 결과:');
    console.log(`  - 성공: ${successCount}개`);
    console.log(`  - 스킵: ${skipCount}개`);
    console.log('='.repeat(50));
    console.log('\n📋 생성된 테이블:');
    console.log('  1. rentcar_pricing_policies (요금 정책)');
    console.log('     - 기간별 할인 (3일+ 10%, 7일+ 20%, 30일+ 30%)');
    console.log('     - 요일별 요금 (금~일 +40%)');
    console.log('     - 시즌별 요금 (성수기 +30%, 비수기 -20%)');
    console.log('     - 얼리버드 할인');
    console.log('');
    console.log('  2. rentcar_insurance_products (보험 상품)');
    console.log('     - 기본 보험 (포함)');
    console.log('     - CDW 자차손해면책 (+10,000원/일)');
    console.log('     - 완전자차 (+20,000원/일)');
    console.log('     - 풀커버리지 (+30,000원/일)');
    console.log('');
    console.log('  3. rentcar_additional_options (추가 옵션)');
    console.log('     - 네비게이션 (+5,000원/일)');
    console.log('     - 아동 카시트 (+10,000원/일 + 설치비 5,000원)');
    console.log('     - 와이파이 (+5,000원/일)');
    console.log('     - 스노우 타이어 (+15,000원/일 + 교체비 20,000원)');
    console.log('     - 스키 거치대 (+8,000원/일 + 설치비 10,000원)');
    console.log('');
    console.log('  4. rentcar_booking_insurance (예약별 보험)');
    console.log('  5. rentcar_booking_options (예약별 옵션)');
    console.log('');
    console.log('  6. rentcar_bookings 테이블 컬럼 추가:');
    console.log('     - base_price (기본 차량 대여료)');
    console.log('     - discount_amount (할인 금액)');
    console.log('     - insurance_price (보험 총액)');
    console.log('     - options_price (추가 옵션 총액)');
    console.log('     - final_price (최종 결제 금액)');
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
