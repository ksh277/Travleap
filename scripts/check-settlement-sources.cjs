/**
 * 정산 데이터 소스 확인
 * - payments (일반 상품)
 * - rentcar_bookings (렌트카)
 * - lodging_bookings (숙박)
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function check() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('  정산 데이터 소스 확인');
  console.log('========================================\n');

  // 1. payments - JSON notes에서 카테고리별 집계
  console.log('=== 1. payments 테이블 (JSON 파싱) ===');
  try {
    const payments = await conn.execute(`
      SELECT id, amount, status, notes, created_at
      FROM payments
      WHERE status = 'completed'
      ORDER BY created_at DESC
      LIMIT 20
    `);

    console.log(`완료된 결제: ${payments.rows.length}건`);

    // 카테고리별 집계
    const byCategory = {};
    payments.rows.forEach(p => {
      try {
        const notes = typeof p.notes === 'string' ? JSON.parse(p.notes) : p.notes;
        const cat = notes?.category || 'unknown';
        if (!byCategory[cat]) byCategory[cat] = { count: 0, total: 0 };
        byCategory[cat].count++;
        byCategory[cat].total += parseFloat(p.amount) || 0;
      } catch (e) {
        // JSON 파싱 실패
      }
    });

    console.log('\n카테고리별 결제:');
    Object.keys(byCategory).forEach(cat => {
      console.log(`  ${cat}: ${byCategory[cat].count}건, ${byCategory[cat].total.toLocaleString()}원`);
    });
  } catch (e) {
    console.log('오류:', e.message);
  }

  // 2. rentcar_bookings - vendor_id 기준
  console.log('\n=== 2. rentcar_bookings (렌트카) ===');
  try {
    const rentcar = await conn.execute(`
      SELECT
        rb.vendor_id,
        rv.company_name,
        COUNT(rb.id) as booking_count,
        SUM(rb.total_krw) as total_amount,
        SUM(CASE WHEN rb.status = 'confirmed' THEN rb.total_krw ELSE 0 END) as confirmed_amount,
        SUM(CASE WHEN rb.status = 'completed' THEN rb.total_krw ELSE 0 END) as completed_amount
      FROM rentcar_bookings rb
      LEFT JOIN rentcar_vendors rv ON rb.vendor_id = rv.id
      GROUP BY rb.vendor_id, rv.company_name
      ORDER BY total_amount DESC
    `);

    console.log(`총 ${rentcar.rows.length}개 업체`);
    rentcar.rows.forEach(r => {
      console.log(`  ${r.company_name || 'vendor_' + r.vendor_id}: ${r.booking_count}건, 총 ${(r.total_amount || 0).toLocaleString()}원`);
    });
  } catch (e) {
    console.log('오류:', e.message);
  }

  // 3. lodging_bookings 확인
  console.log('\n=== 3. lodging_bookings (숙박) ===');
  try {
    const lodgingCols = await conn.execute('DESCRIBE lodging_bookings');
    console.log('컬럼:');
    lodgingCols.rows.slice(0, 10).forEach(c => console.log(`  ${c.Field}`));

    // vendor_id 또는 property_id 찾기
    const hasVendor = lodgingCols.rows.some(c => c.Field === 'vendor_id');
    const hasPropertyId = lodgingCols.rows.some(c => c.Field === 'lodging_id');
    const hasTotalPrice = lodgingCols.rows.some(c => c.Field === 'total_price' || c.Field === 'total_amount');

    console.log(`\n  vendor_id 있음: ${hasVendor}`);
    console.log(`  lodging_id 있음: ${hasPropertyId}`);

    // 금액 필드 찾기
    const priceFields = lodgingCols.rows.filter(c =>
      c.Field.includes('price') || c.Field.includes('amount') || c.Field.includes('total')
    );
    console.log('  금액 관련 필드:', priceFields.map(f => f.Field).join(', '));
  } catch (e) {
    console.log('오류:', e.message);
  }

  // 4. listings + partners 연결 (일반 상품)
  console.log('\n=== 4. listings 상품 업체 연결 ===');
  try {
    const listings = await conn.execute(`
      SELECT
        l.partner_id,
        p.business_name,
        l.category,
        COUNT(l.id) as listing_count
      FROM listings l
      LEFT JOIN partners p ON l.partner_id = p.id
      GROUP BY l.partner_id, p.business_name, l.category
      LIMIT 15
    `);

    console.log('partner_id별 상품:');
    listings.rows.forEach(l => {
      console.log(`  partner_id: ${l.partner_id} | ${l.business_name || '-'} | ${l.category}: ${l.listing_count}개`);
    });
  } catch (e) {
    console.log('오류:', e.message);
  }

  console.log('\n✅ 확인 완료');
}

check().catch(console.error);
