/**
 * 정산 API 구조 검증
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function verify() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('  정산 API 데이터 검증');
  console.log('========================================\n');

  // 1. rentcar_vendors 테이블 컬럼 확인
  console.log('=== 1. rentcar_vendors 컬럼 ===');
  try {
    const cols = await conn.execute('DESCRIBE rentcar_vendors');
    console.log('주요 컬럼:');
    cols.rows.slice(0, 8).forEach(c => console.log(`  ${c.Field} (${c.Type})`));
  } catch (e) {
    console.log('오류:', e.message);
  }

  // 2. rentcar_bookings 테이블 컬럼 확인
  console.log('\n=== 2. rentcar_bookings 컬럼 ===');
  try {
    const cols = await conn.execute('DESCRIBE rentcar_bookings');
    console.log('주요 컬럼:');
    const important = cols.rows.filter(c =>
      c.Field.includes('vendor') ||
      c.Field.includes('total') ||
      c.Field.includes('status') ||
      c.Field.includes('customer') ||
      c.Field.includes('refund')
    );
    important.forEach(c => console.log(`  ${c.Field} (${c.Type})`));
  } catch (e) {
    console.log('오류:', e.message);
  }

  // 3. 렌트카 정산 쿼리 테스트 (business_name 컬럼 사용)
  console.log('\n=== 3. 렌트카 정산 쿼리 테스트 ===');
  try {
    const result = await conn.execute(`
      SELECT
        rv.id as partner_id,
        rv.business_name as business_name,
        'rentcar' as partner_type,
        rv.contact_email as email,
        rv.contact_phone as phone,
        COUNT(DISTINCT rb.id) as total_orders,
        SUM(rb.total_krw) as total_sales,
        COALESCE(SUM(rb.refund_amount_krw), 0) as total_refunded
      FROM rentcar_vendors rv
      LEFT JOIN rentcar_bookings rb ON rb.vendor_id = rv.id
      GROUP BY rv.id, rv.business_name, rv.contact_email, rv.contact_phone
      HAVING COUNT(DISTINCT rb.id) > 0
      ORDER BY total_sales DESC
      LIMIT 5
    `);
    console.log(`✅ 렌트카 업체 ${result.rows.length}개 조회 성공`);
    result.rows.forEach(r => {
      console.log(`  ${r.business_name}: ${r.total_orders}건, ${(r.total_sales || 0).toLocaleString()}원`);
    });
  } catch (e) {
    console.log('❌ 오류:', e.message);
  }

  // 4. lodging_bookings 테이블 컬럼 확인
  console.log('\n=== 4. lodging_bookings 컬럼 ===');
  try {
    const cols = await conn.execute('DESCRIBE lodging_bookings');
    console.log('주요 컬럼:');
    const important = cols.rows.filter(c =>
      c.Field.includes('listing') ||
      c.Field.includes('total') ||
      c.Field.includes('status') ||
      c.Field.includes('guest')
    );
    important.forEach(c => console.log(`  ${c.Field} (${c.Type})`));
  } catch (e) {
    console.log('오류:', e.message);
  }

  // 5. 숙박 정산 쿼리 테스트
  console.log('\n=== 5. 숙박 정산 쿼리 테스트 ===');
  try {
    const result = await conn.execute(`
      SELECT
        lb.listing_id as partner_id,
        COALESCE(l.title, CONCAT('숙박 #', lb.listing_id)) as business_name,
        'lodging' as partner_type,
        p.email,
        p.phone,
        COUNT(DISTINCT lb.id) as total_orders,
        COALESCE(SUM(lb.total_amount), 0) as total_sales,
        0 as total_refunded
      FROM lodging_bookings lb
      LEFT JOIN listings l ON lb.listing_id = l.id
      LEFT JOIN partners p ON l.partner_id = p.id
      GROUP BY lb.listing_id, l.title, p.email, p.phone
      HAVING COUNT(DISTINCT lb.id) > 0
      ORDER BY total_sales DESC
      LIMIT 5
    `);
    console.log(`✅ 숙박 업체 ${result.rows.length}개 조회 성공`);
    result.rows.forEach(r => {
      console.log(`  ${r.business_name}: ${r.total_orders}건, ${(r.total_sales || 0).toLocaleString()}원`);
    });
  } catch (e) {
    console.log('❌ 오류:', e.message);
  }

  // 6. 쿠폰 통계 쿼리 테스트
  console.log('\n=== 6. 쿠폰 통계 쿼리 테스트 ===');
  try {
    const result = await conn.execute(`
      SELECT
        c.id, c.code, c.name,
        c.discount_type, c.discount_value, c.is_active,
        COUNT(uc.id) as issued_count,
        SUM(CASE WHEN uc.status = 'USED' THEN 1 ELSE 0 END) as used_count
      FROM coupons c
      LEFT JOIN user_coupons uc ON c.id = uc.coupon_id
      GROUP BY c.id, c.code, c.name, c.discount_type, c.discount_value, c.is_active
      ORDER BY issued_count DESC
      LIMIT 5
    `);
    console.log(`✅ 쿠폰 ${result.rows.length}개 조회 성공`);
    result.rows.forEach(c => {
      const discountText = c.discount_type === 'percentage' ? `${c.discount_value}%` : `${c.discount_value}원`;
      console.log(`  ${c.code}: ${discountText} | 발급 ${c.issued_count}건, 사용 ${c.used_count}건`);
    });
  } catch (e) {
    console.log('❌ 오류:', e.message);
  }

  console.log('\n✅ 검증 완료');
}

verify().catch(console.error);
