/**
 * 관리자 페이지 데이터 확인
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function check() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('  관리자 페이지 데이터 확인');
  console.log('========================================\n');

  // 1. coupons 테이블
  console.log('=== 1. coupons 테이블 ===');
  const coupons = await conn.execute('SELECT id, code, name, is_active, discount_type, discount_value FROM coupons LIMIT 10');
  if (coupons.rows.length === 0) {
    console.log('❌ 쿠폰 데이터 없음');
  } else {
    console.log(`총 ${coupons.rows.length}개:`);
    coupons.rows.forEach(c => {
      console.log(`  ID: ${c.id} | ${c.code} | ${c.name || '-'} | 활성: ${c.is_active} | ${c.discount_type} ${c.discount_value}`);
    });
  }

  // 2. partners 테이블
  console.log('\n=== 2. partners 테이블 (승인됨) ===');
  const partners = await conn.execute(`
    SELECT id, business_name, services, is_coupon_partner, status
    FROM partners
    WHERE status = 'approved'
    LIMIT 10
  `);
  console.log(`총 승인 파트너: ${partners.rows.length}개 (표시: 최대 10개)`);
  partners.rows.forEach(p => {
    console.log(`  ID: ${p.id} | ${p.business_name} | ${p.services || '-'} | 쿠폰: ${p.is_coupon_partner ? 'ON' : 'OFF'}`);
  });

  // 3. coupon_usage 테이블 (쿠폰 사용 내역)
  console.log('\n=== 3. coupon_usage 테이블 (사용 내역) ===');
  try {
    const usage = await conn.execute('SELECT COUNT(*) as cnt FROM coupon_usage');
    console.log(`총 사용 내역: ${usage.rows[0].cnt}건`);
  } catch (e) {
    console.log('❌ coupon_usage 테이블 없음 또는 오류:', e.message);
  }

  // 4. payments 테이블 (정산용)
  console.log('\n=== 4. payments 테이블 ===');
  try {
    const payments = await conn.execute('SELECT COUNT(*) as cnt, SUM(amount) as total FROM payments WHERE status = "completed"');
    console.log(`완료된 결제: ${payments.rows[0].cnt}건, 총액: ${payments.rows[0].total?.toLocaleString() || 0}원`);
  } catch (e) {
    console.log('❌ payments 테이블 오류:', e.message);
  }

  // 5. listings 테이블 (상품)
  console.log('\n=== 5. listings 테이블 (상품) ===');
  try {
    const listings = await conn.execute(`
      SELECT category, COUNT(*) as cnt
      FROM listings
      GROUP BY category
      ORDER BY cnt DESC
    `);
    console.log('카테고리별 상품 수:');
    listings.rows.forEach(l => {
      console.log(`  ${l.category || 'NULL'}: ${l.cnt}개`);
    });
  } catch (e) {
    console.log('❌ listings 테이블 오류:', e.message);
  }

  // 6. lodging_properties 테이블 (숙박)
  console.log('\n=== 6. lodging_properties 테이블 (숙박) ===');
  try {
    const lodging = await conn.execute('SELECT COUNT(*) as cnt FROM lodging_properties');
    console.log(`총 숙박: ${lodging.rows[0].cnt}개`);
  } catch (e) {
    console.log('❌ lodging_properties 테이블 오류:', e.message);
  }

  // 7. rentcar_vehicles 테이블 (렌트카)
  console.log('\n=== 7. rentcar_vehicles 테이블 (렌트카) ===');
  try {
    const rentcar = await conn.execute('SELECT COUNT(*) as cnt FROM rentcar_vehicles');
    console.log(`총 렌트카: ${rentcar.rows[0].cnt}대`);
  } catch (e) {
    console.log('❌ rentcar_vehicles 테이블 오류:', e.message);
  }

  // 8. 테이블 목록 확인
  console.log('\n=== 8. 전체 테이블 목록 ===');
  try {
    const tables = await conn.execute('SHOW TABLES');
    console.log(`총 ${tables.rows.length}개 테이블`);
    // settlement 관련 테이블 찾기
    const settlementTables = tables.rows.filter(t => {
      const name = Object.values(t)[0];
      return name.includes('settlement') || name.includes('정산');
    });
    if (settlementTables.length > 0) {
      console.log('정산 관련 테이블:');
      settlementTables.forEach(t => console.log(`  - ${Object.values(t)[0]}`));
    } else {
      console.log('❌ 정산(settlement) 관련 테이블 없음');
    }
  } catch (e) {
    console.log('오류:', e.message);
  }
}

check().catch(console.error);
