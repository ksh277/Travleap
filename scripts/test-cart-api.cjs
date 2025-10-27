const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  try {
    console.log('=== PlanetScale 연결 테스트 ===\n');

    // database.ts와 동일한 설정으로 연결
    const config = {
      host: process.env.DATABASE_HOST,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
    };

    console.log('연결 설정:');
    console.log('  HOST:', config.host);
    console.log('  USERNAME:', config.username?.substring(0, 15) + '...');
    console.log('  PASSWORD:', config.password ? '설정됨 (****)' : '❌ 없음');

    if (!config.host || !config.username || !config.password) {
      throw new Error('DATABASE_HOST, DATABASE_USERNAME, DATABASE_PASSWORD 설정 필요');
    }

    console.log('\n✅ PlanetScale 연결 생성 중...');
    const connection = connect(config);

    // 1. 기본 연결 테스트
    console.log('\n=== 1. 기본 연결 테스트 ===');
    const testResult = await connection.execute('SELECT 1 as test');
    console.log('✅ 연결 성공:', testResult);
    console.log('   결과 타입:', Array.isArray(testResult) ? 'Array' : typeof testResult);

    // 2. cart_items 테이블 존재 확인
    console.log('\n=== 2. cart_items 테이블 확인 ===');
    const tableCheck = await connection.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'cart_items'
    `);
    console.log('cart_items 테이블:', tableCheck[0]?.count > 0 ? '✅ 존재' : '❌ 없음');

    // 3. cart_items 데이터 확인
    console.log('\n=== 3. cart_items 데이터 조회 ===');
    const cartResult = await connection.execute('SELECT * FROM cart_items LIMIT 5');
    console.log('레코드 수:', cartResult.length);
    console.log('결과 타입:', Array.isArray(cartResult) ? 'Array' : typeof cartResult);
    if (cartResult.length > 0) {
      console.log('첫 번째 레코드:', cartResult[0]);
    }

    // 4. listings 테이블 확인
    console.log('\n=== 4. listings 테이블 확인 ===');
    const listingsCheck = await connection.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'listings'
    `);
    console.log('listings 테이블:', listingsCheck[0]?.count > 0 ? '✅ 존재' : '❌ 없음');

    // 5. server-api.ts와 동일한 쿼리 테스트 (userId=1)
    console.log('\n=== 5. server-api.ts 쿼리 시뮬레이션 (userId=1) ===');
    try {
      const cartItems = await connection.execute(`
        SELECT
          ci.id as cart_item_id,
          ci.listing_id,
          ci.selected_date,
          ci.num_adults,
          ci.num_children,
          ci.num_seniors,
          ci.price_snapshot,
          l.title,
          l.images,
          l.category,
          l.location,
          l.price_from
        FROM cart_items ci
        LEFT JOIN listings l ON ci.listing_id = l.id
        WHERE ci.user_id = ?
        ORDER BY ci.created_at DESC
      `, [1]);

      console.log('✅ 쿼리 성공!');
      console.log('   결과 수:', cartItems.length);
      console.log('   결과 타입:', Array.isArray(cartItems) ? 'Array' : typeof cartItems);

      if (cartItems.length > 0) {
        console.log('   첫 번째 항목:', JSON.stringify(cartItems[0], null, 2));

        // map() 테스트
        console.log('\n   map() 테스트:');
        const formatted = cartItems.map((item) => {
          console.log('     - 처리 중:', item.cart_item_id);
          return {
            id: item.listing_id,
            title: item.title || '상품',
            price: item.price_snapshot || item.price_from || 0
          };
        });
        console.log('   ✅ map() 성공, 결과 수:', formatted.length);
      }
    } catch (error) {
      console.error('❌ 쿼리 실패:', error.message);
      console.error('   전체 에러:', error);
    }

    // 6. database.ts의 execute() 메서드 시뮬레이션
    console.log('\n=== 6. database.ts execute() 시뮬레이션 ===');
    const rawResult = await connection.execute('SELECT * FROM cart_items WHERE user_id = ? LIMIT 1', [1]);
    console.log('Raw result:', rawResult);
    console.log('  Array.isArray():', Array.isArray(rawResult));
    console.log('  rawResult.rows:', rawResult.rows);
    console.log('  rawResult.insertId:', rawResult.insertId);
    console.log('  rawResult.rowsAffected:', rawResult.rowsAffected);

    const wrapped = {
      rows: Array.isArray(rawResult) ? rawResult : [],
      insertId: rawResult.insertId ? Number(rawResult.insertId) : 0,
      affectedRows: rawResult.rowsAffected || 0
    };
    console.log('Wrapped result:', wrapped);
    console.log('  wrapped.rows.length:', wrapped.rows.length);

    console.log('\n✅ 모든 테스트 완료!');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error('에러 상세:', error);
    process.exit(1);
  }
})();
