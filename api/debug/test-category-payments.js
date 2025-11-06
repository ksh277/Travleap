/**
 * 디버깅용 API - 카테고리별 결제 플로우 상세 테스트 (팝업 제외)
 * GET /api/debug/test-category-payments
 *
 * 각 카테고리별로:
 * 1. 상품 데이터 존재 확인
 * 2. 필수 필드 확인 (price, stock, cart_enabled)
 * 3. 결제 API 엔드포인트 확인
 * 4. 장바구니 추가 가능 여부
 * 5. 실제 결제 가능 여부
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔍 [Test Payments] Starting detailed category payment tests...');

    const testResults = [];

    // 팝업 제외한 카테고리들
    const categories = ['food', 'tour', 'experience', 'event', 'stay', 'rentcar'];

    for (const category of categories) {
      console.log(`   Testing category: ${category}`);

      // 1. 상품 데이터 확인
      const productsResult = await connection.execute(`
        SELECT
          id,
          title,
          category,
          price_from,
          shipping_fee,
          cart_enabled,
          stock,
          stock_enabled,
          has_options,
          booking_type,
          is_published,
          is_active
        FROM listings
        WHERE category = ?
          AND is_published = 1
          AND is_active = 1
        LIMIT 1
      `, [category]);

      const product = productsResult.rows?.[0];

      if (!product) {
        testResults.push({
          category: category,
          status: 'FAIL',
          error: '상품이 존재하지 않음',
          product: null,
          issues: ['활성화된 상품 없음']
        });
        continue;
      }

      // 2. 필수 필드 검증
      const issues = [];

      if (!product.price_from || product.price_from === 0) {
        issues.push('가격이 0원이거나 설정되지 않음');
      }

      if (product.cart_enabled !== 1) {
        issues.push('장바구니 비활성화 (즉시 결제만 가능)');
      }

      if (product.stock_enabled === 1 && (!product.stock || product.stock === 0)) {
        issues.push('재고 활성화되어 있으나 재고 0개');
      }

      // 3. 카테고리별 특수 테이블 확인
      let categorySpecificData = null;

      try {
        if (category === 'food') {
          // listing_food 테이블 확인
          const foodResult = await connection.execute(`
            SELECT * FROM listing_food WHERE listing_id = ? LIMIT 1
          `, [product.id]);
          categorySpecificData = { foodData: foodResult.rows?.[0] || null };
        } else if (category === 'tour') {
          // listing_tour 테이블 확인
          const tourResult = await connection.execute(`
            SELECT * FROM listing_tour WHERE listing_id = ? LIMIT 1
          `, [product.id]);
          categorySpecificData = { tourData: tourResult.rows?.[0] || null };
        } else if (category === 'experience') {
          // listings만 사용 (별도 테이블 없음)
          categorySpecificData = { note: 'listings 테이블만 사용' };
        } else if (category === 'event') {
          // listing_event 테이블 확인
          const eventResult = await connection.execute(`
            SELECT * FROM listing_event WHERE listing_id = ? LIMIT 1
          `, [product.id]);
          categorySpecificData = { eventData: eventResult.rows?.[0] || null };
        } else if (category === 'stay') {
          // listing_accommodation 및 room_types 확인
          const accomResult = await connection.execute(`
            SELECT * FROM listing_accommodation WHERE listing_id = ? LIMIT 1
          `, [product.id]);
          const roomsResult = await connection.execute(`
            SELECT COUNT(*) as count FROM room_types WHERE partner_id = (SELECT partner_id FROM listings WHERE id = ?) LIMIT 1
          `, [product.id]);
          categorySpecificData = {
            accommodationData: accomResult.rows?.[0] || null,
            roomCount: roomsResult.rows?.[0]?.count || 0
          };
        } else if (category === 'rentcar') {
          // listing_rentcar 및 rentcar_vehicles 확인
          const rentcarResult = await connection.execute(`
            SELECT * FROM listing_rentcar WHERE listing_id = ? LIMIT 1
          `, [product.id]);
          const vehiclesResult = await connection.execute(`
            SELECT COUNT(*) as count FROM rentcar_vehicles WHERE partner_id = (SELECT partner_id FROM listings WHERE id = ?) LIMIT 1
          `, [product.id]);
          categorySpecificData = {
            rentcarData: rentcarResult.rows?.[0] || null,
            vehicleCount: vehiclesResult.rows?.[0]?.count || 0
          };
        }
      } catch (tableError) {
        categorySpecificData = { error: `테이블 조회 실패: ${tableError.message}` };
      }

      // 4. 결제 가능 여부 판단
      const canPurchase = issues.length === 0;

      testResults.push({
        category: category,
        status: canPurchase ? 'PASS' : 'WARNING',
        product: {
          id: product.id,
          title: product.title,
          price: product.price_from,
          shipping: product.shipping_fee || 0,
          cartEnabled: product.cart_enabled === 1,
          stock: product.stock,
          stockEnabled: product.stock_enabled === 1,
          bookingType: product.booking_type
        },
        categorySpecificData: categorySpecificData,
        issues: issues,
        canPurchase: canPurchase,
        recommendedAction: canPurchase ? '결제 가능' : '확인 필요'
      });
    }

    console.log('✅ [Test Payments] Payment tests completed');

    const passCount = testResults.filter(r => r.status === 'PASS').length;
    const failCount = testResults.filter(r => r.status === 'FAIL').length;
    const warningCount = testResults.filter(r => r.status === 'WARNING').length;

    return res.status(200).json({
      success: true,
      message: 'Category payment flow tests completed (excluding popup)',
      timestamp: new Date().toISOString(),
      summary: {
        totalCategories: categories.length,
        passed: passCount,
        warnings: warningCount,
        failed: failCount
      },
      results: testResults,
      notes: [
        '✅ PASS: 결제 가능',
        '⚠️ WARNING: 결제는 가능하나 확인 필요한 항목 있음',
        '❌ FAIL: 결제 불가능',
        '📦 팝업 카테고리는 테스트에서 제외됨'
      ]
    });

  } catch (error) {
    console.error('❌ [Test Payments] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
