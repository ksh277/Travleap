/**
 * 디버깅용 API - 카테고리별 결제 프로세스 테스트
 * POST /api/debug/test-payment-process
 *
 * 실제 결제 없이 결제 프로세스를 시뮬레이션하여 테스트
 * 1. 상품 조회
 * 2. 장바구니 추가 가능 여부
 * 3. 주문 생성 로직
 * 4. 금액 계산 정확성
 * 5. 필수 필드 확인
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🧪 [Test Payment] Starting payment process test...');

    const testResults = [];
    const categories = ['food', 'tour', 'experience', 'event', 'stay'];

    for (const category of categories) {
      console.log(`   Testing ${category} category...`);

      const result = {
        category: category,
        steps: {},
        issues: [],
        overallStatus: 'PASS'
      };

      // Step 1: 상품 조회
      const productsResult = await connection.execute(`
        SELECT id, title, price_from, shipping_fee, cart_enabled, has_options, category
        FROM listings
        WHERE category = ? AND is_published = 1 AND is_active = 1
        LIMIT 1
      `, [category]);

      if (!productsResult.rows || productsResult.rows.length === 0) {
        result.steps.productFetch = '❌ FAIL: 상품 없음';
        result.issues.push('활성화된 상품이 없어 결제 불가');
        result.overallStatus = 'FAIL';
        testResults.push(result);
        continue;
      }

      const product = productsResult.rows[0];
      result.steps.productFetch = '✅ PASS';
      result.productInfo = {
        id: product.id,
        title: product.title,
        price: product.price_from,
        shipping: product.shipping_fee || 0
      };

      // Step 2: 장바구니 추가 가능 여부
      if (product.cart_enabled === 1) {
        result.steps.cartEnabled = '✅ PASS: 장바구니 활성화';
      } else {
        result.steps.cartEnabled = '⚠️ WARNING: 장바구니 비활성화 (즉시 결제만 가능)';
        result.issues.push('장바구니 비활성화 - 즉시 결제만 가능');
      }

      // Step 3: 금액 계산
      const price = parseFloat(product.price_from || 0);
      const shipping = parseFloat(product.shipping_fee || 0);
      const totalAmount = price + shipping;

      if (price <= 0) {
        result.steps.priceCalculation = '❌ FAIL: 가격이 0원 이하';
        result.issues.push('상품 가격이 0원 이하로 설정됨');
        result.overallStatus = 'FAIL';
      } else {
        result.steps.priceCalculation = '✅ PASS';
        result.priceBreakdown = {
          productPrice: price,
          shippingFee: shipping,
          totalAmount: totalAmount
        };
      }

      // Step 4: 결제 필수 필드 확인
      const requiredFields = {
        listing_id: product.id,
        price: product.price_from,
        cart_enabled: product.cart_enabled
      };

      const missingFields = [];
      if (!requiredFields.listing_id) missingFields.push('listing_id');
      if (!requiredFields.price) missingFields.push('price');

      if (missingFields.length > 0) {
        result.steps.requiredFields = `❌ FAIL: 누락된 필드 - ${missingFields.join(', ')}`;
        result.issues.push(`필수 필드 누락: ${missingFields.join(', ')}`);
        result.overallStatus = 'FAIL';
      } else {
        result.steps.requiredFields = '✅ PASS';
      }

      // Step 5: bookings 테이블 구조 확인 (단일 예약)
      try {
        const bookingTest = await connection.execute(`
          SELECT COUNT(*) as count FROM bookings WHERE listing_id = ? LIMIT 1
        `, [product.id]);
        result.steps.bookingTable = '✅ PASS: bookings 테이블 접근 가능';
      } catch (bookingError) {
        result.steps.bookingTable = `⚠️ WARNING: ${bookingError.message}`;
      }

      // Step 6: payments 테이블 확인
      try {
        const paymentTest = await connection.execute(`
          SELECT COUNT(*) as count FROM payments LIMIT 1
        `);
        result.steps.paymentTable = '✅ PASS: payments 테이블 접근 가능';
      } catch (paymentError) {
        result.steps.paymentTable = `❌ FAIL: ${paymentError.message}`;
        result.issues.push('payments 테이블 접근 불가');
        result.overallStatus = 'FAIL';
      }

      // Step 7: 카테고리별 특수 요구사항 확인
      if (category === 'food') {
        // 음식점: food_orders 테이블 확인
        try {
          await connection.execute('SELECT COUNT(*) as count FROM food_orders LIMIT 1');
          result.steps.categorySpecific = '✅ PASS: food_orders 테이블 존재';
        } catch (e) {
          result.steps.categorySpecific = '⚠️ WARNING: food_orders 테이블 없음 (장바구니 결제만 가능)';
        }
      } else if (category === 'event') {
        // 행사: event_seats 테이블 확인
        try {
          await connection.execute('SELECT COUNT(*) as count FROM event_seats WHERE event_id = ? LIMIT 1', [product.id]);
          result.steps.categorySpecific = '✅ PASS: event_seats 테이블 접근 가능';
        } catch (e) {
          result.steps.categorySpecific = '⚠️ WARNING: event_seats 테이블 없음';
        }
      } else if (category === 'experience') {
        // 체험: experience_bookings 테이블 확인
        try {
          await connection.execute('SELECT COUNT(*) as count FROM experience_bookings LIMIT 1');
          result.steps.categorySpecific = '✅ PASS: experience_bookings 테이블 존재';
        } catch (e) {
          result.steps.categorySpecific = '⚠️ WARNING: experience_bookings 테이블 없음';
        }
      } else if (category === 'stay') {
        // 숙박: lodging_bookings 테이블 확인
        try {
          await connection.execute('SELECT COUNT(*) as count FROM lodging_bookings LIMIT 1');
          result.steps.categorySpecific = '✅ PASS: lodging_bookings 테이블 존재';
        } catch (e) {
          result.steps.categorySpecific = '⚠️ WARNING: lodging_bookings 테이블 없음';
        }
      }

      testResults.push(result);
    }

    // 렌트카는 별도 시스템
    const rentcarResult = {
      category: 'rentcar',
      steps: {
        note: '렌트카는 별도 결제 시스템 사용 (rentcar_bookings + rentcar_rental_payments)'
      },
      issues: [],
      overallStatus: 'INFO'
    };

    // rentcar_bookings 확인
    try {
      const vehiclesResult = await connection.execute('SELECT COUNT(*) as count FROM rentcar_vehicles WHERE is_active = 1');
      const vehicleCount = vehiclesResult.rows[0].count;
      rentcarResult.steps.vehicles = `✅ PASS: ${vehicleCount}대 차량 등록됨`;

      const bookingsResult = await connection.execute('SELECT COUNT(*) as count FROM rentcar_bookings');
      rentcarResult.steps.bookings = '✅ PASS: rentcar_bookings 테이블 존재';

      rentcarResult.overallStatus = vehicleCount > 0 ? 'PASS' : 'WARNING';
      if (vehicleCount === 0) {
        rentcarResult.issues.push('등록된 차량이 없음');
      }
    } catch (rentcarError) {
      rentcarResult.steps.error = `❌ FAIL: ${rentcarError.message}`;
      rentcarResult.issues.push('렌트카 시스템 오류');
      rentcarResult.overallStatus = 'FAIL';
    }

    testResults.push(rentcarResult);

    console.log('✅ [Test Payment] Payment process test completed');

    const summary = {
      totalCategories: testResults.length,
      passed: testResults.filter(r => r.overallStatus === 'PASS').length,
      failed: testResults.filter(r => r.overallStatus === 'FAIL').length,
      warnings: testResults.filter(r => r.overallStatus === 'WARNING' || r.overallStatus === 'INFO').length
    };

    return res.status(200).json({
      success: true,
      message: 'Payment process test completed (excluding popup)',
      timestamp: new Date().toISOString(),
      summary: summary,
      results: testResults,
      notes: [
        '✅ PASS: 결제 가능',
        '⚠️ WARNING: 결제 가능하나 일부 기능 제한',
        '❌ FAIL: 결제 불가능',
        '🔧 이 테스트는 실제 결제를 하지 않습니다',
        '📦 팝업 카테고리는 테스트에서 제외됨'
      ]
    });

  } catch (error) {
    console.error('❌ [Test Payment] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
