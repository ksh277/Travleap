/**
 * 렌트카 추가 옵션 샘플 데이터 생성
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function createSampleExtras() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🎁 렌트카 옵션 샘플 데이터 생성 중...\n');

    // vendor_id = 15 (제주 렌터카) 기준
    const vendorId = 15;

    const sampleExtras = [
      {
        name: 'GPS 내비게이션',
        description: '최신 GPS 내비게이션 장비 대여',
        category: 'equipment',
        price_krw: 10000,
        price_type: 'per_day',
        has_inventory: true,
        current_stock: 5,
        max_quantity: 2,
        display_order: 1
      },
      {
        name: '카시트 (유아용)',
        description: '0-4세 유아용 카시트',
        category: 'equipment',
        price_krw: 15000,
        price_type: 'per_day',
        has_inventory: true,
        current_stock: 3,
        max_quantity: 2,
        display_order: 2
      },
      {
        name: '카시트 (어린이용)',
        description: '4-12세 어린이용 카시트',
        category: 'equipment',
        price_krw: 12000,
        price_type: 'per_day',
        has_inventory: true,
        current_stock: 4,
        max_quantity: 2,
        display_order: 3
      },
      {
        name: '블랙박스',
        description: '전후방 블랙박스',
        category: 'equipment',
        price_krw: 8000,
        price_type: 'per_rental',
        has_inventory: false,
        current_stock: 0,
        max_quantity: 1,
        display_order: 4
      },
      {
        name: '스노우 체인',
        description: '겨울철 스노우 체인 (한라산 방문 시 필수)',
        category: 'equipment',
        price_krw: 20000,
        price_type: 'per_rental',
        has_inventory: true,
        current_stock: 10,
        max_quantity: 1,
        display_order: 5
      },
      {
        name: '공항 픽업 서비스',
        description: '제주공항에서 차량 인도',
        category: 'service',
        price_krw: 30000,
        price_type: 'per_rental',
        has_inventory: false,
        current_stock: 0,
        max_quantity: 1,
        display_order: 6
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
        display_order: 7
      },
      {
        name: '유류 풀옵션',
        description: '기름 가득 채워서 반납 (연료비 걱정 없음)',
        category: 'service',
        price_krw: 50000,
        price_type: 'per_rental',
        has_inventory: false,
        current_stock: 0,
        max_quantity: 1,
        display_order: 8
      }
    ];

    console.log(`📝 ${sampleExtras.length}개의 옵션 추가 중...\n`);

    for (const extra of sampleExtras) {
      const result = await connection.execute(
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

      console.log(`✅ ${extra.name} (₩${extra.price_krw.toLocaleString()} / ${extra.price_type})`);
    }

    console.log('\n✅ 모든 샘플 데이터 생성 완료!');
    console.log(`\n👉 벤더 대시보드에서 확인: http://localhost:3000/vendor/rentcar/extras`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

createSampleExtras();
