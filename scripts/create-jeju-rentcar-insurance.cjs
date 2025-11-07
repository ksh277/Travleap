const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function createInsurance() {
  try {
    console.log('🏥 제주 렌터카(vendor_id: 15) 보험 상품 생성 중...\n');

    // 1. 기본 자차보험
    const basic = await connection.execute(`
      INSERT INTO rentcar_insurance (
        vendor_id, name, description, coverage_details,
        hourly_rate_krw, is_active, is_required, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      15,
      '기본 자차보험',
      '차량 파손 시 기본 보장 (자기부담금 100만원)',
      JSON.stringify({
        items: [
          '차량 파손 시 최대 1,000만원 보장',
          '자기부담금 100만원',
          '대물 배상 최대 2,000만원',
          '대인 배상 무제한'
        ]
      }),
      1000,
      1,
      0,
      1
    ]);
    console.log(`✅ 기본 자차보험 생성 (ID: ${basic.insertId})`);

    // 2. 완전 자차보험 (슈퍼커버)
    const full = await connection.execute(`
      INSERT INTO rentcar_insurance (
        vendor_id, name, description, coverage_details,
        hourly_rate_krw, is_active, is_required, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      15,
      '완전 자차보험 (슈퍼커버)',
      '자기부담금 0원! 차량 파손 시 100% 보장',
      JSON.stringify({
        items: [
          '차량 파손 시 자기부담금 0원',
          '차량 전손 시 최대 5,000만원 보장',
          '대물 배상 최대 5,000만원',
          '대인 배상 무제한',
          '개인 상해 최대 3,000만원'
        ]
      }),
      2500,
      1,
      0,
      2
    ]);
    console.log(`✅ 완전 자차보험 생성 (ID: ${full.insertId})`);

    // 3. 프리미엄 보험
    const premium = await connection.execute(`
      INSERT INTO rentcar_insurance (
        vendor_id, name, description, coverage_details,
        hourly_rate_krw, is_active, is_required, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      15,
      '프리미엄 올케어 보험',
      '모든 위험에서 완벽 보호! 여행자 보험 포함',
      JSON.stringify({
        items: [
          '차량 파손/전손 자기부담금 0원',
          '차량 전손 시 최대 1억원 보장',
          '대물/대인 배상 무제한',
          '개인 상해 최대 5,000만원',
          '질병/사망 최대 1억원',
          '휴대품 도난/파손 최대 100만원'
        ]
      }),
      4000,
      1,
      0,
      3
    ]);
    console.log(`✅ 프리미엄 올케어 보험 생성 (ID: ${premium.insertId})`);

    console.log('\n✅ 제주 렌터카 보험 상품 3개 생성 완료!');
    console.log('\n📋 생성된 보험 목록:');
    console.log('  1. 기본 자차보험 - 1,000원/시간');
    console.log('  2. 완전 자차보험 (슈퍼커버) - 2,500원/시간');
    console.log('  3. 프리미엄 올케어 보험 - 4,000원/시간');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    if (error.message.includes('Duplicate entry')) {
      console.log('\n⚠️  이미 보험 상품이 존재합니다. 기존 데이터를 확인하세요.');
    }
  }
}

createInsurance();
