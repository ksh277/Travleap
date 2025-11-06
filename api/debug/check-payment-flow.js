/**
 * 디버깅용 API - 카테고리별 결제 플로우 점검 (팝업 제외)
 * GET /api/debug/check-payment-flow
 *
 * 확인 항목:
 * 1. 각 카테고리별 상품 목록
 * 2. 상품의 결제 필수 정보 (price, cart_enabled 등)
 * 3. 카테고리별 배송비 정책
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
    console.log('🔍 [Check Payment] Checking payment flow for non-popup categories...');

    // 1. 팝업 제외한 카테고리별 상품 조회
    const categoriesResult = await connection.execute(`
      SELECT
        l.category,
        COUNT(*) as total_count,
        COUNT(CASE WHEN l.is_published = 1 AND l.is_active = 1 THEN 1 END) as visible_count,
        MIN(l.price_from) as min_price,
        MAX(l.price_from) as max_price,
        COUNT(CASE WHEN l.cart_enabled = 1 THEN 1 END) as cart_enabled_count,
        COUNT(CASE WHEN l.shipping_fee IS NOT NULL THEN 1 END) as has_shipping_fee
      FROM listings l
      WHERE l.category != '팝업'
        AND l.is_published = 1
        AND l.is_active = 1
      GROUP BY l.category
      ORDER BY l.category
    `);

    const categories = categoriesResult.rows || [];
    console.log(`   Found ${categories.length} categories (excluding popup)`);

    // 2. 각 카테고리별 상세 상품 정보
    const categoryDetails = {};

    for (const cat of categories) {
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
          booking_type
        FROM listings
        WHERE category = ?
          AND is_published = 1
          AND is_active = 1
        LIMIT 3
      `, [cat.category]);

      categoryDetails[cat.category] = {
        summary: cat,
        sampleProducts: productsResult.rows || []
      };
    }

    // 3. 결제 플로우 점검
    const paymentCheckResults = [];

    for (const [category, details] of Object.entries(categoryDetails)) {
      const issues = [];

      // 가격 확인
      if (details.summary.min_price === null || details.summary.min_price === 0) {
        issues.push('가격이 0원이거나 설정되지 않은 상품 있음');
      }

      // 장바구니 활성화 확인
      if (details.summary.cart_enabled_count === 0) {
        issues.push('장바구니 비활성화된 상품만 있음 (즉시 결제만 가능)');
      }

      // 배송비 설정 확인
      const shippingPolicy = details.summary.has_shipping_fee > 0
        ? '일부 상품에 배송비 설정됨'
        : '배송비 설정 없음 (기본 무료배송)';

      paymentCheckResults.push({
        category: category,
        status: issues.length === 0 ? 'OK' : 'WARNING',
        totalProducts: details.summary.visible_count,
        priceRange: `₩${details.summary.min_price?.toLocaleString() || 0} - ₩${details.summary.max_price?.toLocaleString() || 0}`,
        cartEnabled: `${details.summary.cart_enabled_count}/${details.summary.visible_count}개`,
        shippingPolicy: shippingPolicy,
        issues: issues,
        sampleProducts: details.sampleProducts.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price_from,
          shipping: p.shipping_fee || 0,
          cartEnabled: p.cart_enabled === 1,
          bookingType: p.booking_type
        }))
      });
    }

    console.log('✅ [Check Payment] Payment flow check completed');

    return res.status(200).json({
      success: true,
      message: 'Payment flow check completed (excluding popup category)',
      timestamp: new Date().toISOString(),
      summary: {
        totalCategories: categories.length,
        okCategories: paymentCheckResults.filter(r => r.status === 'OK').length,
        warningCategories: paymentCheckResults.filter(r => r.status === 'WARNING').length
      },
      results: paymentCheckResults,
      notes: [
        '✅ 팝업 카테고리는 확인 대상에서 제외됨',
        '⚠️ WARNING 상태는 결제 불가를 의미하지 않으며, 확인이 필요한 항목입니다',
        '📦 배송비 설정이 없는 카테고리는 무료배송으로 처리됩니다'
      ]
    });

  } catch (error) {
    console.error('❌ [Check Payment] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
