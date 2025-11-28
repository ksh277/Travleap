/**
 * 정산 관리용 데이터 구조 분석
 * - payments 테이블 구조
 * - 업체별 결제 데이터 현황
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function analyze() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('  정산 관리 데이터 구조 분석');
  console.log('========================================\n');

  // 1. payments 테이블 구조
  console.log('=== 1. payments 테이블 컬럼 ===');
  try {
    const columns = await conn.execute('DESCRIBE payments');
    columns.rows.forEach(c => {
      console.log(`  ${c.Field} (${c.Type})`);
    });
  } catch (e) {
    console.log('❌ payments 테이블 없음:', e.message);
  }

  // 2. payments 데이터 샘플
  console.log('\n=== 2. payments 데이터 샘플 ===');
  try {
    const payments = await conn.execute(`
      SELECT * FROM payments ORDER BY created_at DESC LIMIT 3
    `);
    console.log(`총 샘플: ${payments.rows.length}건`);
    payments.rows.forEach((p, i) => {
      console.log(`\n[${i + 1}] ID: ${p.id}`);
      Object.keys(p).forEach(key => {
        if (p[key] !== null && p[key] !== undefined) {
          console.log(`    ${key}: ${p[key]}`);
        }
      });
    });
  } catch (e) {
    console.log('❌ payments 조회 오류:', e.message);
  }

  // 3. 업체/카테고리별 결제 집계
  console.log('\n=== 3. 카테고리별 결제 현황 ===');
  try {
    const byCategory = await conn.execute(`
      SELECT
        COALESCE(listing_type, item_type, 'unknown') as category,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount
      FROM payments
      GROUP BY COALESCE(listing_type, item_type, 'unknown')
    `);
    byCategory.rows.forEach(c => {
      console.log(`  ${c.category}: ${c.count}건, ${(c.total_amount || 0).toLocaleString()}원`);
    });
  } catch (e) {
    console.log('❌ 카테고리별 집계 오류:', e.message);
  }

  // 4. vendor_id 또는 partner_id가 있는지 확인
  console.log('\n=== 4. 업체 연결 필드 확인 ===');
  try {
    const vendorCheck = await conn.execute(`
      SELECT
        COUNT(*) as total,
        COUNT(vendor_id) as has_vendor_id,
        COUNT(partner_id) as has_partner_id,
        COUNT(listing_id) as has_listing_id
      FROM payments
    `);
    const v = vendorCheck.rows[0];
    console.log(`  전체 결제: ${v.total}건`);
    console.log(`  vendor_id 있음: ${v.has_vendor_id}건`);
    console.log(`  partner_id 있음: ${v.has_partner_id}건`);
    console.log(`  listing_id 있음: ${v.has_listing_id}건`);
  } catch (e) {
    console.log('오류:', e.message);
  }

  // 5. listings 테이블과 연결
  console.log('\n=== 5. listings 기반 업체별 결제 ===');
  try {
    const byVendor = await conn.execute(`
      SELECT
        l.vendor_id,
        l.title as listing_title,
        l.category,
        COUNT(p.id) as payment_count,
        SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as total_amount
      FROM payments p
      LEFT JOIN listings l ON p.listing_id = l.id
      WHERE p.listing_id IS NOT NULL
      GROUP BY l.vendor_id, l.title, l.category
      ORDER BY total_amount DESC
      LIMIT 10
    `);
    console.log('상품별 결제 현황 (상위 10개):');
    byVendor.rows.forEach(v => {
      console.log(`  vendor_id: ${v.vendor_id || 'NULL'} | ${v.listing_title || '-'} | ${v.category} | ${v.payment_count}건 | ${(v.total_amount || 0).toLocaleString()}원`);
    });
  } catch (e) {
    console.log('오류:', e.message);
  }

  // 6. rentcar_bookings 테이블 확인
  console.log('\n=== 6. rentcar_bookings 테이블 ===');
  try {
    const rentcar = await conn.execute(`
      SELECT
        vendor_id,
        COUNT(*) as booking_count,
        SUM(total_price) as total_amount
      FROM rentcar_bookings
      WHERE status IN ('confirmed', 'completed')
      GROUP BY vendor_id
    `);
    console.log('렌트카 업체별 예약:');
    rentcar.rows.forEach(r => {
      console.log(`  vendor_id: ${r.vendor_id} | ${r.booking_count}건 | ${(r.total_amount || 0).toLocaleString()}원`);
    });
  } catch (e) {
    console.log('rentcar_bookings 없거나 오류:', e.message);
  }

  // 7. 숙박 예약 테이블 확인
  console.log('\n=== 7. 숙박 예약 테이블 ===');
  try {
    const lodging = await conn.execute(`
      SELECT
        property_id,
        COUNT(*) as booking_count,
        SUM(total_price) as total_amount
      FROM lodging_bookings
      WHERE status IN ('confirmed', 'completed')
      GROUP BY property_id
      LIMIT 10
    `);
    console.log('숙박 업체별 예약:');
    lodging.rows.forEach(l => {
      console.log(`  property_id: ${l.property_id} | ${l.booking_count}건 | ${(l.total_amount || 0).toLocaleString()}원`);
    });
  } catch (e) {
    console.log('lodging_bookings 없거나 오류:', e.message);
  }

  console.log('\n✅ 분석 완료');
}

analyze().catch(console.error);
