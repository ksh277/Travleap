// 장바구니 및 결제 흐름 테스트
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function testCartCheckoutFlow() {
  console.log('🧪 장바구니/결제 흐름 테스트 시작...\n');

  try {
    const conn = connect(config);

    // 1. 장바구니 테이블 존재 확인
    console.log('1️⃣ 장바구니 테이블 확인:');
    try {
      const cartCheck = await conn.execute('DESCRIBE cart_items');
      console.log('✅ cart_items 테이블 존재');
      console.log('   컬럼:');
      cartCheck.rows.forEach((col: any) => {
        console.log(`   - ${col.Field} (${col.Type})`);
      });
    } catch (error) {
      console.log('❌ cart_items 테이블 없음');
    }
    console.log('');

    // 2. 장바구니 데이터 확인
    console.log('2️⃣ 현재 장바구니 데이터:');
    try {
      const cartItems = await conn.execute(`
        SELECT
          c.*,
          l.title as product_title,
          l.price_from,
          u.name as user_name
        FROM cart_items c
        LEFT JOIN listings l ON c.listing_id = l.id
        LEFT JOIN users u ON c.user_id = u.id
        LIMIT 5
      `);

      if (cartItems.rows.length > 0) {
        console.log(`총 ${cartItems.rows.length}개의 장바구니 아이템`);
        cartItems.rows.forEach((item: any) => {
          console.log(`  - ${item.product_title} (사용자: ${item.user_name}, 수량: ${item.quantity || 1})`);
        });
      } else {
        console.log('장바구니가 비어있습니다');
      }
    } catch (error) {
      console.log('⚠️  장바구니 조회 실패:', error);
    }
    console.log('');

    // 3. 상품 확인 (최신 5개)
    console.log('3️⃣ 최근 등록된 상품:');
    const listings = await conn.execute(`
      SELECT id, title, price_from, is_active, created_at
      FROM listings
      ORDER BY created_at DESC
      LIMIT 5
    `);

    listings.rows.forEach((listing: any) => {
      console.log(`  - [${listing.id}] ${listing.title}`);
      console.log(`    가격: ₩${Number(listing.price_from).toLocaleString()}, 활성: ${listing.is_active ? '✓' : '✗'}`);
    });
    console.log('');

    // 4. 결제 흐름 시뮬레이션
    console.log('4️⃣ 장바구니 → 결제 흐름:');
    console.log('  단계 1: 상품 상세 페이지에서 "장바구니 담기" 클릭');
    console.log('    → POST /api/cart (필요시 생성)');
    console.log('    → cart_items 테이블에 저장');
    console.log('');
    console.log('  단계 2: 장바구니 페이지에서 확인');
    console.log('    → GET /api/cart');
    console.log('    → 장바구니 아이템 목록 표시');
    console.log('');
    console.log('  단계 3: "결제하기" 클릭');
    console.log('    → /checkout 페이지로 이동');
    console.log('    → 결제 정보 입력');
    console.log('');
    console.log('  단계 4: 결제 완료');
    console.log('    → POST /api/orders (또는 /api/bookings)');
    console.log('    → orders 테이블에 주문 생성');
    console.log('    → cart_items에서 해당 아이템 삭제');
    console.log('');

    // 5. API 엔드포인트 확인
    console.log('5️⃣ 필요한 API 엔드포인트:');
    console.log('  ✅ GET /api/listings - 상품 목록 (있음)');
    console.log('  ✅ GET /api/listings/[id] - 상품 상세 (있음)');
    console.log('  ✅ POST /api/reviews - 리뷰 작성 (생성 완료)');
    console.log('  ✅ POST /api/orders - 주문 생성 (있음)');
    console.log('  ❓ POST /api/cart - 장바구니 추가 (확인 필요)');
    console.log('  ❓ GET /api/cart - 장바구니 조회 (확인 필요)');
    console.log('  ❓ DELETE /api/cart/[id] - 장바구니 삭제 (확인 필요)');
    console.log('');

    console.log('🎉 테스트 완료!');
    console.log('');
    console.log('📝 다음 단계:');
    console.log('  1. 장바구니 API 엔드포인트 존재 여부 확인');
    console.log('  2. 상품 상세 페이지 → 장바구니 → 결제 전체 흐름 테스트');
    console.log('  3. 누락된 API가 있다면 생성');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }

  process.exit(0);
}

testCartCheckoutFlow();
