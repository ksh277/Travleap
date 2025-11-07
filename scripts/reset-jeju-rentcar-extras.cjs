/**
 * 제주 렌터카 옵션 초기화 및 4개만 추가
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function resetJejuExtras() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const vendorId = 15; // 제주 렌터카

    console.log('🗑️  기존 옵션 삭제 중...\n');

    const deleteResult = await connection.execute(
      'DELETE FROM rentcar_extras WHERE vendor_id = ?',
      [vendorId]
    );

    console.log(`✅ ${deleteResult.rowsAffected || 0}개 삭제 완료\n`);

    console.log('🎁 새로운 옵션 4개 추가 중...\n');

    const newExtras = [
      {
        name: 'GPS 내비게이션',
        description: '최신 GPS 내비게이션 장비',
        category: 'equipment',
        price_krw: 10000,
        price_type: 'per_day',
        has_inventory: true,
        current_stock: 5,
        max_quantity: 1,
        display_order: 1
      },
      {
        name: '카시트',
        description: '유아/어린이용 카시트',
        category: 'equipment',
        price_krw: 15000,
        price_type: 'per_day',
        has_inventory: true,
        current_stock: 3,
        max_quantity: 2,
        display_order: 2
      },
      {
        name: '공항 픽업 서비스',
        description: '제주공항에서 차량 인도 서비스',
        category: 'service',
        price_krw: 30000,
        price_type: 'per_rental',
        has_inventory: false,
        current_stock: 0,
        max_quantity: 1,
        display_order: 3
      },
      {
        name: '추가 운전자 등록',
        description: '추가 운전자 1명당',
        category: 'driver',
        price_krw: 20000,
        price_type: 'per_rental',
        has_inventory: false,
        current_stock: 0,
        max_quantity: 3,
        display_order: 4
      }
    ];

    for (const extra of newExtras) {
      await connection.execute(
        `INSERT INTO rentcar_extras (
          vendor_id, name, description, category,
          price_krw, price_type,
          has_inventory, current_stock, max_quantity,
          display_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vendorId,
          extra.name,
          extra.description,
          extra.category,
          extra.price_krw,
          extra.price_type,
          extra.has_inventory,
          extra.current_stock,
          extra.max_quantity,
          extra.display_order,
          true
        ]
      );

      console.log(`✅ ${extra.name} - ₩${extra.price_krw.toLocaleString()} (${extra.price_type})`);
    }

    console.log('\n✅ 완료! 4개의 옵션이 추가되었습니다.');
    console.log(`\n👉 확인: http://localhost:3000/vendor/rentcar/extras`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

resetJejuExtras();
