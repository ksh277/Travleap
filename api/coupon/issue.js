/**
 * 연동 쿠폰 자동 발급 API
 * POST /api/coupon/issue
 *
 * 결제 성공 시 호출되어 통합 쿠폰을 발급합니다.
 * - 쿠폰 대상 상품(is_coupon_eligible = 1)이 포함된 주문에 대해 발급
 * - 유저당 주문당 1개의 통합 쿠폰 발급
 * - 발급된 쿠폰으로 여러 가맹점에서 각각 1회씩 사용 가능
 */

const { connect } = require('@planetscale/database');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

/**
 * 유니크 쿠폰 코드 생성
 * 형식: GOGO-XXXXXXXX (8자리 영숫자)
 */
function generateCouponCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동되는 문자 제외 (0,O,1,I)
  let code = 'GOGO-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 쿠폰 발급 가능 여부 확인
 * - 주문에 is_coupon_eligible = 1인 상품이 포함되어 있는지 확인
 */
async function checkCouponEligibility(connection, orderId, orderType) {
  try {
    if (orderType === 'booking') {
      // 단일 예약: bookings → listings → is_coupon_eligible 확인
      const result = await connection.execute(`
        SELECT l.is_coupon_eligible, l.id as listing_id, l.title, l.location, c.name_ko as category_name
        FROM bookings b
        JOIN listings l ON b.listing_id = l.id
        LEFT JOIN categories c ON l.category_id = c.id
        WHERE b.booking_number = ? AND l.is_coupon_eligible = 1
      `, [orderId]);

      return {
        eligible: result.rows && result.rows.length > 0,
        listings: result.rows || []
      };
    } else if (orderType === 'cart') {
      // 장바구니 주문: payments.notes에서 items 추출 → listings 확인
      const paymentResult = await connection.execute(`
        SELECT notes FROM payments WHERE gateway_transaction_id = ? LIMIT 1
      `, [orderId]);

      if (!paymentResult.rows || paymentResult.rows.length === 0) {
        return { eligible: false, listings: [] };
      }

      const notes = paymentResult.rows[0].notes ? JSON.parse(paymentResult.rows[0].notes) : null;
      if (!notes || !notes.items || !Array.isArray(notes.items)) {
        return { eligible: false, listings: [] };
      }

      const listingIds = notes.items.map(item => item.listingId).filter(Boolean);
      if (listingIds.length === 0) {
        return { eligible: false, listings: [] };
      }

      const placeholders = listingIds.map(() => '?').join(',');
      const listingResult = await connection.execute(`
        SELECT l.id as listing_id, l.title, l.location, l.is_coupon_eligible, c.name_ko as category_name
        FROM listings l
        LEFT JOIN categories c ON l.category_id = c.id
        WHERE l.id IN (${placeholders}) AND l.is_coupon_eligible = 1
      `, listingIds);

      return {
        eligible: listingResult.rows && listingResult.rows.length > 0,
        listings: listingResult.rows || []
      };
    }

    return { eligible: false, listings: [] };
  } catch (error) {
    console.error('❌ [Coupon] 쿠폰 대상 확인 실패:', error);
    return { eligible: false, listings: [] };
  }
}

/**
 * 사용 가능한 가맹점 수 조회
 */
async function getAvailableMerchantCount(connection, regionName = null) {
  try {
    let query = `
      SELECT COUNT(*) as count
      FROM partners p
      WHERE p.is_coupon_partner = 1 AND p.status = 'approved' AND p.is_active = 1
    `;
    const params = [];

    if (regionName) {
      query += ` AND (p.location LIKE ? OR p.business_address LIKE ?)`;
      params.push(`%${regionName}%`, `%${regionName}%`);
    }

    const result = await connection.execute(query, params);
    return result.rows?.[0]?.count || 0;
  } catch (error) {
    console.error('❌ [Coupon] 가맹점 수 조회 실패:', error);
    return 0;
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'POST 요청만 허용됩니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      user_id,
      order_id,           // 주문 번호 (BK-xxx, ORDER_xxx 등)
      payment_id,         // payments 테이블 ID
      region_name,        // 지역명 (선택)
      expires_days = 30,  // 유효기간 (기본 30일)
      coupon_type = 'INTEGRATED', // 쿠폰 유형: INTEGRATED, SINGLE, PRODUCT
      listing_id = null,          // PRODUCT 타입일 때 특정 상품 ID
      target_merchant_id = null   // SINGLE 타입일 때 특정 가맹점 ID
    } = req.body;

    if (!user_id || !order_id) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'user_id와 order_id가 필요합니다'
      });
    }

    // 1. 주문 유형 확인
    const isBooking = order_id.startsWith('BK-') || order_id.startsWith('FOOD-') ||
                      order_id.startsWith('ATR-') || order_id.startsWith('EXP-') ||
                      order_id.startsWith('TOUR-') || order_id.startsWith('EVT-') ||
                      order_id.startsWith('STAY-');
    const isCart = order_id.startsWith('ORDER_');
    const orderType = isBooking ? 'booking' : (isCart ? 'cart' : null);

    if (!orderType) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_ORDER_ID',
        message: '올바르지 않은 주문 번호 형식입니다'
      });
    }

    // 2. 쿠폰 대상 상품 확인
    const eligibility = await checkCouponEligibility(connection, order_id, orderType);

    if (!eligibility.eligible) {
      console.log(`ℹ️ [Coupon] 쿠폰 대상 상품 없음: ${order_id}`);
      return res.status(200).json({
        success: true,
        issued: false,
        message: '쿠폰 대상 상품이 없습니다'
      });
    }

    // 3. 이미 발급된 쿠폰이 있는지 확인 (중복 방지)
    const existingCoupon = await connection.execute(`
      SELECT id, code FROM coupon_master
      WHERE user_id = ? AND order_id = ?
    `, [user_id, order_id]);

    if (existingCoupon.rows && existingCoupon.rows.length > 0) {
      console.log(`ℹ️ [Coupon] 이미 발급된 쿠폰 존재: ${existingCoupon.rows[0].code}`);
      return res.status(200).json({
        success: true,
        issued: false,
        message: '이미 발급된 쿠폰이 있습니다',
        coupon: {
          id: existingCoupon.rows[0].id,
          code: existingCoupon.rows[0].code
        }
      });
    }

    // 4. 지역 정보 추출 (상품 위치 기반)
    let derivedRegionName = region_name;
    if (!derivedRegionName && eligibility.listings.length > 0) {
      // 첫 번째 상품의 위치에서 지역명 추출
      const location = eligibility.listings[0].location || '';
      // "전라남도 강진군" → "강진" 추출
      const match = location.match(/([\uAC00-\uD7A3]+[시군구])/);
      derivedRegionName = match ? match[1].replace(/[시군구]$/, '') : null;
    }

    // 5. 사용 가능한 가맹점 수 조회
    const merchantCount = await getAvailableMerchantCount(connection, derivedRegionName);

    // 6. 유니크 쿠폰 코드 생성 (중복 체크)
    let couponCode;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      couponCode = generateCouponCode();
      const codeCheck = await connection.execute(
        'SELECT id FROM coupon_master WHERE code = ?',
        [couponCode]
      );
      if (!codeCheck.rows || codeCheck.rows.length === 0) {
        break; // 유니크 코드 발견
      }
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.error('❌ [Coupon] 유니크 코드 생성 실패');
      return res.status(500).json({
        success: false,
        error: 'CODE_GENERATION_FAILED',
        message: '쿠폰 코드 생성에 실패했습니다'
      });
    }

    // 7. 유효기간 계산
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_days);

    // 8. QR URL 생성
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://travleap.com';
    const qrUrl = `${baseUrl}/coupon/${couponCode}`;

    // 9. 쿠폰명 생성
    const categoryName = eligibility.listings[0]?.category_name || '여행';
    const couponName = derivedRegionName
      ? `${derivedRegionName} ${categoryName} 통합 할인쿠폰`
      : `${categoryName} 통합 할인쿠폰`;

    // 10. 쿠폰 발급 (coupon_master 테이블)
    const insertResult = await connection.execute(`
      INSERT INTO coupon_master (
        user_id, order_id, payment_id, region_name, code, qr_url,
        name, description, status, coupon_type, listing_id, target_merchant_id,
        total_merchants, used_merchants, expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, 0, ?, NOW(), NOW())
    `, [
      user_id,
      order_id,
      payment_id || null,
      derivedRegionName || null,
      couponCode,
      qrUrl,
      couponName,
      `결제 상품과 연계된 가맹점에서 사용 가능한 통합 할인쿠폰입니다. (유효기간: ${expires_days}일)`,
      coupon_type,
      listing_id,
      target_merchant_id,
      merchantCount,
      expiresAt
    ]);

    const couponId = insertResult.insertId;

    console.log(`✅ [Coupon] 쿠폰 발급 완료: ${couponCode} (user_id: ${user_id}, order_id: ${order_id})`);

    return res.status(200).json({
      success: true,
      issued: true,
      message: '쿠폰이 발급되었습니다',
      coupon: {
        id: couponId,
        code: couponCode,
        name: couponName,
        coupon_type: coupon_type,
        listing_id: listing_id,
        target_merchant_id: target_merchant_id,
        qr_url: qrUrl,
        region_name: derivedRegionName,
        total_merchants: merchantCount,
        expires_at: expiresAt.toISOString(),
        eligible_products: eligibility.listings.map(l => ({
          id: l.listing_id,
          title: l.title,
          category: l.category_name
        }))
      }
    });

  } catch (error) {
    console.error('❌ [Coupon Issue] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '쿠폰 발급 중 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(handler);
