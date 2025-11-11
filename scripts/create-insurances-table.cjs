/**
 * 보험 관리 테이블 생성 스크립트
 * insurances 테이블을 PlanetScale 데이터베이스에 생성합니다.
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');
const fs = require('fs');
const path = require('path');

async function createInsurancesTable() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔧 Creating insurances table...\n');

    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'create-insurances-table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // SQL 실행 (주석 및 빈 줄 제거)
    const sqlStatements = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');

    await connection.execute(sqlStatements);

    console.log('✅ insurances 테이블이 생성되었습니다.\n');

    // 테이블 구조 확인
    const descResult = await connection.execute('DESCRIBE insurances');
    console.log('📋 테이블 구조:');
    console.table(descResult.rows);

    // 샘플 데이터 추가 (렌트카 보험 예시)
    console.log('\n🔧 샘플 보험 데이터 추가 중...\n');

    const sampleInsurances = [
      {
        name: '자차손해면책제도 (CDW)',
        category: 'rentcar',
        price: 15000,
        pricing_unit: 'daily',
        coverage_amount: 10000000,
        description: '차량 사고 시 자차 손해에 대한 면책 제도',
        coverage_details: JSON.stringify({
          items: ['자차 손해 보상 (최대 1,000만원)', '대인/대물 사고 보상'],
          exclusions: ['운전자 과실', '음주운전', '무면허 운전']
        })
      },
      {
        name: '슈퍼 커버 보험',
        category: 'rentcar',
        price: 25000,
        pricing_unit: 'daily',
        coverage_amount: 50000000,
        description: '최고 수준의 종합 보험 (자차+대인+대물 완전 보상)',
        coverage_details: JSON.stringify({
          items: ['자차 손해 완전 보상', '대인/대물 완전 보상', '긴급 출동 서비스', '대체 차량 제공'],
          exclusions: ['고의 사고', '범죄 행위']
        })
      },
      {
        name: '기본 보험',
        category: 'rentcar',
        price: 8000,
        pricing_unit: 'daily',
        coverage_amount: 5000000,
        description: '기본적인 렌트카 보험 (최소 보장)',
        coverage_details: JSON.stringify({
          items: ['대인 배상 (최대 500만원)', '대물 배상 (최대 500만원)'],
          exclusions: ['자차 손해', '운전자 과실']
        })
      }
    ];

    for (const insurance of sampleInsurances) {
      await connection.execute(
        `INSERT INTO insurances (name, category, price, pricing_unit, coverage_amount, description, coverage_details, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          insurance.name,
          insurance.category,
          insurance.price,
          insurance.pricing_unit,
          insurance.coverage_amount,
          insurance.description,
          insurance.coverage_details
        ]
      );
    }

    console.log('✅ 샘플 보험 데이터가 추가되었습니다.\n');

    // 추가된 데이터 확인
    const dataResult = await connection.execute('SELECT id, name, category, price, pricing_unit, coverage_amount FROM insurances');
    console.log('📊 추가된 보험 데이터:');
    console.table(dataResult.rows);

    console.log('\n🎉 보험 테이블 생성 및 데이터 추가 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

createInsurancesTable()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
