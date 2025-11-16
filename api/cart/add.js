/**
 * 장바구니 추가 API
 * POST /api/cart/add
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  // JWT에서 userId 가져오기
  const userId = req.user.userId;

  const {
    listing_id,
    quantity = 1,
    selected_date,
    selected_options,
    selected_insurance,
    insurance_fee = 0,
    num_adults = 1,
    num_children = 0,
    num_infants = 0,
    adult_price = 0,
    child_price = 0,
    infant_price = 0,
    price_snapshot
  } = req.body;

  if (!listing_id) {
    return res.status(400).json({
      success: false,
      error: 'listing_id is required'
    });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // 상품 존재 여부 및 활성화 상태 확인
    const listingCheck = await connection.execute(
      'SELECT id, is_active FROM listings WHERE id = ? LIMIT 1',
      [listing_id]
    );

    if (!listingCheck.rows || listingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'LISTING_NOT_FOUND',
        message: '상품을 찾을 수 없습니다.'
      });
    }

    const listing = listingCheck.rows[0];

    if (!listing.is_active) {
      return res.status(400).json({
        success: false,
        error: 'LISTING_INACTIVE',
        message: '판매가 중단된 상품입니다.'
      });
    }

    // ✅ 장바구니에 추가 (보험 및 옵션 포함)
    const result = await connection.execute(
      `INSERT INTO cart_items (
        user_id, listing_id, quantity, selected_date, selected_options,
        selected_insurance, insurance_fee,
        num_adults, num_children, num_infants, num_seniors,
        adult_price, child_price, infant_price, price_snapshot, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        listing_id,
        quantity,
        selected_date || null,
        JSON.stringify(selected_options || {}),
        selected_insurance ? JSON.stringify(selected_insurance) : null,
        insurance_fee || 0,
        num_adults,
        num_children,
        num_infants,
        0, // num_seniors (not used for tour/food/attractions/events/experience)
        adult_price,
        child_price,
        infant_price,
        price_snapshot || null
      ]
    );

    console.log('✅ [Cart Add] 장바구니 추가 성공:', result.insertId);

    return res.status(200).json({
      success: true,
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('❌ [Cart Add] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '장바구니 추가 중 오류가 발생했습니다'
    });
  }
}

// JWT 인증 적용
module.exports = withAuth(handler, { requireAuth: true });
