/**
 * 투어 예약 API 테스트
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 투어 예약 API 테스트 준비 중...\n');

    // 1. 투어 상품 확인
    console.log('=== 1. 투어 상품 확인 (category_id=1855) ===');
    const toursResult = await connection.execute(
      `SELECT
        l.id,
        l.title,
        l.price_from,
        l.is_active,
        l.is_published,
        lt.tour_type,
        lt.duration_hours
       FROM listings l
       LEFT JOIN listing_tour lt ON l.id = lt.listing_id
       WHERE l.category_id = 1855
       LIMIT 5`
    );

    if (toursResult.rows && toursResult.rows.length > 0) {
      console.log(`✅ ${toursResult.rows.length}개의 투어 상품 발견:`);
      toursResult.rows.forEach((tour, i) => {
        console.log(`[${i + 1}] ID: ${tour.id}`);
        console.log(`    제목: ${tour.title}`);
        console.log(`    가격: ${tour.price_from}원`);
        console.log(`    활성: ${tour.is_active ? 'YES' : 'NO'} / 공개: ${tour.is_published ? 'YES' : 'NO'}`);
        console.log(`    타입: ${tour.tour_type || 'N/A'} / 소요시간: ${tour.duration_hours || 0}시간`);
        console.log();
      });
    } else {
      console.log('❌ 투어 상품이 없습니다.');
      console.log('테스트를 위해 투어 상품을 먼저 생성해야 합니다.\n');
      return;
    }

    // 2. 테스트용 사용자 확인
    console.log('=== 2. 테스트 사용자 확인 ===');
    const { Pool } = require('@neondatabase/serverless');
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    let testUserId;
    try {
      const userResult = await poolNeon.query(
        `SELECT id, email, name FROM users WHERE role = 'customer' LIMIT 1`
      );

      if (userResult.rows && userResult.rows.length > 0) {
        testUserId = userResult.rows[0].id;
        console.log(`✅ 테스트 사용자: ${userResult.rows[0].name} (${userResult.rows[0].email})`);
        console.log(`   User ID: ${testUserId}`);
      } else {
        console.log('⚠️  고객 사용자가 없습니다. API는 user_email로도 작동 가능합니다.');
      }
    } finally {
      await poolNeon.end();
    }

    // 3. 테스트 데이터 시뮬레이션
    console.log('\n=== 3. 테스트 데이터 예시 ===');
    const testTour = toursResult.rows[0];
    const testData = {
      listing_id: testTour.id,
      user_id: testUserId || null,
      user_email: 'test@example.com',
      user_name: '테스트사용자',
      user_phone: '010-1234-5678',
      tour_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7일 후
      participants: [
        { name: '홍길동', age: 35, passport: 'M12345678' },
        { name: '김영희', age: 8, passport: 'M87654321' }
      ],
      adult_count: 1,
      child_count: 1,
      infant_count: 0,
      price_adult: testTour.price_from || 50000,
      price_child: Math.floor((testTour.price_from || 50000) * 0.7),
      price_infant: 0,
      special_requests: '채식 식사 요청',
      total_amount: (testTour.price_from || 50000) + Math.floor((testTour.price_from || 50000) * 0.7)
    };

    console.log('POST /api/tour/book');
    console.log(JSON.stringify(testData, null, 2));

    console.log('\n=== 4. API 수동 테스트 방법 ===');
    console.log('1. 개발 서버 실행: npm run dev');
    console.log('2. Postman 또는 curl로 POST 요청:');
    console.log(`   curl -X POST http://localhost:3000/api/tour/book \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '${JSON.stringify(testData)}'`);

    console.log('\n✅ 투어 예약 API 테스트 준비 완료');
    console.log('수동으로 API를 테스트하여 예약 생성을 확인하세요.');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();
