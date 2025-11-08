/**
 * API 응답에서 주문 ID 중복 확인
 * React key 중복으로 인한 렌더링 누락 확인
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

async function checkOrderIds() {
  console.log('🔍 주문 ID 중복 검사 시작...\n');

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // payments 주문 조회
    const paymentsResult = await connection.execute(`
      SELECT p.id, '일반주문' as type
      FROM payments p
      WHERE p.payment_status IN ('paid', 'completed', 'refunded')
      ORDER BY p.id
    `);

    // rentcar 주문 조회
    const rentcarResult = await connection.execute(`
      SELECT rb.id, '렌터카' as type
      FROM rentcar_bookings rb
      WHERE rb.payment_status IN ('paid', 'completed', 'refunded')
      ORDER BY rb.id
    `);

    const allIds = [
      ...(paymentsResult.rows || []),
      ...(rentcarResult.rows || [])
    ];

    console.log(`📊 전체 주문 수: ${allIds.length}`);
    console.log(`   - 일반 주문: ${paymentsResult.rows?.length || 0}개`);
    console.log(`   - 렌터카 주문: ${rentcarResult.rows?.length || 0}개\n`);

    // ID 중복 체크
    const idCount = new Map();
    allIds.forEach(order => {
      const count = idCount.get(order.id) || [];
      count.push(order.type);
      idCount.set(order.id, count);
    });

    const duplicates = Array.from(idCount.entries())
      .filter(([id, types]) => types.length > 1);

    if (duplicates.length > 0) {
      console.log(`❌ ID 중복 발견! React key 충돌로 ${duplicates.length}개 주문이 누락될 수 있습니다:\n`);
      duplicates.forEach(([id, types]) => {
        console.log(`   ID ${id}: ${types.join(' + ')}`);
      });
    } else {
      console.log('✅ ID 중복 없음 - React key 충돌 아님\n');
    }

    // 모든 주문 ID 목록
    console.log('\n📋 전체 주문 ID 목록:');
    const sortedIds = allIds.sort((a, b) => a.id - b.id);
    sortedIds.forEach(order => {
      console.log(`   ID ${order.id}: ${order.type}`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

checkOrderIds();
