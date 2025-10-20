/**
 * 모든 상품에 장바구니 담기 기능 활성화
 */

import 'dotenv/config';
import { connect } from '@planetscale/database';

const db = connect({ url: process.env.DATABASE_URL! });

async function enableCartForAll() {
  try {
    console.log('🛒 모든 상품에 장바구니 기능 활성화 중...\n');

    // 1. 컬럼 존재 여부 확인
    console.log('1️⃣  테이블 구조 확인 중...');

    // PlanetScale은 ALTER TABLE ADD COLUMN IF NOT EXISTS를 지원하지 않으므로
    // 직접 컬럼 추가 시도 (이미 있으면 에러 무시)

    const columnsToAdd = [
      { name: 'cart_enabled', type: 'BOOLEAN DEFAULT true' },
      { name: 'instant_booking', type: 'BOOLEAN DEFAULT false' },
      { name: 'requires_approval', type: 'BOOLEAN DEFAULT false' },
      { name: 'booking_type', type: "VARCHAR(20) DEFAULT 'instant'" },
      { name: 'cancellation_policy', type: "VARCHAR(50) DEFAULT 'flexible'" }
    ];

    for (const col of columnsToAdd) {
      try {
        await db.execute(`ALTER TABLE listings ADD COLUMN ${col.name} ${col.type}`);
        console.log(`   ✅ ${col.name} 컬럼 추가됨`);
      } catch (error: any) {
        if (error.message?.includes('Duplicate column')) {
          console.log(`   ⏭️  ${col.name} 컬럼 이미 존재`);
        } else {
          console.error(`   ❌ ${col.name} 추가 실패:`, error.message);
        }
      }
    }

    console.log('');

    // 2. 기존 모든 상품을 장바구니 담기 가능하도록 설정
    console.log('2️⃣  기존 상품들 업데이트 중...');

    const updateResult = await db.execute(`
      UPDATE listings
      SET
        cart_enabled = true,
        instant_booking = true,
        booking_type = 'instant',
        cancellation_policy = 'flexible'
      WHERE is_published = true AND is_active = true
    `);

    console.log(`   ✅ ${(updateResult as any).rowsAffected || 0}개 상품 업데이트 완료\n`);

    // 3. 카테고리별 통계
    console.log('3️⃣  카테고리별 통계...\n');

    const statsResult = await db.execute(`
      SELECT
        l.category_id,
        COUNT(*) as total,
        SUM(CASE WHEN l.cart_enabled = true THEN 1 ELSE 0 END) as cart_enabled_count,
        SUM(CASE WHEN l.instant_booking = true THEN 1 ELSE 0 END) as instant_booking_count
      FROM listings l
      WHERE l.is_published = true AND l.is_active = true
      GROUP BY l.category_id
      ORDER BY total DESC
    `);

    const stats = statsResult.rows as any[];

    if (stats.length > 0) {
      console.log('📊 카테고리별 장바구니 활성화 현황:');
      stats.forEach((stat) => {
        console.log(`   카테고리 ID ${stat.category_id}:`);
        console.log(`      전체: ${stat.total}개`);
        console.log(`      장바구니 가능: ${stat.cart_enabled_count}개`);
        console.log(`      즉시 예약 가능: ${stat.instant_booking_count}개\n`);
      });
    }

    // 4. 전체 통계
    const totalResult = await db.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN cart_enabled = true THEN 1 ELSE 0 END) as cart_enabled,
        SUM(CASE WHEN instant_booking = true THEN 1 ELSE 0 END) as instant_booking
      FROM listings
      WHERE is_published = true AND is_active = true
    `);

    const total = (totalResult.rows as any[])[0];

    console.log('✅ 완료!\n');
    console.log('📈 전체 통계:');
    console.log(`   전체 상품: ${total.total}개`);
    console.log(`   장바구니 가능: ${total.cart_enabled}개 (${((total.cart_enabled / total.total) * 100).toFixed(1)}%)`);
    console.log(`   즉시 예약 가능: ${total.instant_booking}개 (${((total.instant_booking / total.total) * 100).toFixed(1)}%)`);

    console.log('\n🎉 이제 모든 상품을 장바구니에 담을 수 있습니다!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

enableCartForAll();
