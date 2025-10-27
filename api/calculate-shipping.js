const { connect } = require('@planetscale/database');

/**
 * 배송비 계산 API
 * POST /api/calculate-shipping
 *
 * 기본 배송비: 3,000원
 * 50,000원 이상 무료 배송
 * 제주/도서산간 추가 배송비
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { items, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items array is required'
      });
    }

    // 1. 모든 상품 금액 합계 계산
    const totalProductAmount = items.reduce((sum, item) => {
      const itemPrice = item.price || 0;
      const quantity = item.quantity || 1;
      const optionAdjustment = item.selectedOption?.priceAdjustment || 0;
      return sum + ((itemPrice + optionAdjustment) * quantity);
    }, 0);

    console.log(`💰 [배송비] 상품 총액: ${totalProductAmount.toLocaleString()}원`);

    // 2. 배송비 정책
    const FREE_SHIPPING_THRESHOLD = 50000; // 5만원 이상 무료
    const BASE_FEE = 3000; // 기본 배송비
    const JEJU_EXTRA_FEE = 3000; // 제주 추가 배송비
    const ISLAND_EXTRA_FEE = 5000; // 도서산간 추가 배송비

    let baseFee = 0;
    let extraFee = 0;
    let freeShipping = false;

    // 3. 무료 배송 조건 확인
    if (totalProductAmount >= FREE_SHIPPING_THRESHOLD) {
      freeShipping = true;
      baseFee = 0;
      console.log(`✅ [배송비] 5만원 이상 - 무료 배송`);
    } else {
      baseFee = BASE_FEE;
      console.log(`📦 [배송비] 기본 배송비: ${baseFee.toLocaleString()}원`);
    }

    // 4. 제주/도서산간 추가 배송비 (무료 배송이어도 부과)
    if (shippingAddress) {
      if (isJejuAddress(shippingAddress)) {
        extraFee = JEJU_EXTRA_FEE;
        console.log(`🏝️ [배송비] 제주 추가: ${extraFee.toLocaleString()}원`);
      } else if (isIslandAddress(shippingAddress)) {
        extraFee = ISLAND_EXTRA_FEE;
        console.log(`🏝️ [배송비] 도서산간 추가: ${extraFee.toLocaleString()}원`);
      }
    }

    const totalFee = baseFee + extraFee;

    console.log(`✅ [배송비] 최종: ${totalFee.toLocaleString()}원 (기본: ${baseFee}, 추가: ${extraFee})`);

    return res.status(200).json({
      success: true,
      data: {
        base_fee: baseFee,
        extra_fee: extraFee,
        total_fee: totalFee,
        free_shipping: freeShipping,
        policy_name: freeShipping ? '5만원 이상 무료 배송' : '기본 배송비',
        product_amount: totalProductAmount
      }
    });

  } catch (error) {
    console.error('❌ [배송비] 계산 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '배송비 계산 중 오류가 발생했습니다'
    });
  }
};

/**
 * 제주 주소 판별
 */
function isJejuAddress(address) {
  const jejuKeywords = ['제주', '제주시', '제주도', '서귀포'];
  return jejuKeywords.some(keyword => address.includes(keyword));
}

/**
 * 도서산간 주소 판별
 */
function isIslandAddress(address) {
  const islandKeywords = [
    '울릉', '독도', '백령', '연평', '대청',
    '신안', '완도', '진도', '고흥', '여수',
    '남해', '거제', '통영', '사천',
    '인천 옹진', '경기 강화', '전남 신안'
  ];
  return islandKeywords.some(keyword => address.includes(keyword));
}
