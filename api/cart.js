const { connect } = require('@planetscale/database');
const { withAuth } = require('../utils/auth-middleware.cjs');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // JWT에서 userId 가져오기
  const userId = req.user.userId;

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    if (req.method === 'GET') {
      console.log('🛒 [Cart] GET request, userId:', userId, 'type:', typeof userId);
      console.log('🛒 [Cart] DATABASE_URL exists:', !!process.env.DATABASE_URL);

      // 장바구니 조회 (검증 포함) - ✅ 보험 및 옵션 필드 포함
      const result = await connection.execute(`
        SELECT
          c.id,
          c.user_id,
          c.listing_id,
          c.quantity,
          c.selected_date,
          c.num_adults,
          c.num_children,
          c.num_infants,
          c.num_seniors,
          c.price_snapshot,
          c.selected_options,
          c.selected_insurance,
          c.insurance_fee,
          c.created_at,
          c.updated_at,
          COALESCE(c.adult_price, l.adult_price) AS adult_price,
          COALESCE(c.child_price, l.child_price) AS child_price,
          COALESCE(c.infant_price, l.infant_price) AS infant_price,
          l.id AS listing_exists,
          l.title,
          l.price_from,
          l.images,
          l.category_id,
          l.category,
          l.is_active,
          l.location,
          COALESCE(l.category, cat.name_ko, '') AS category_name
        FROM cart_items c
        LEFT JOIN listings l ON c.listing_id = l.id
        LEFT JOIN categories cat ON l.category_id = cat.id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
      `, [userId]);

      console.log('🛒 [Cart] Query executed, rows:', result.rows?.length || 0);

      // 🔍 디버그: 첫 번째 row 출력
      if (result.rows && result.rows.length > 0) {
        console.log('🛒 [Cart] Sample row data:', JSON.stringify(result.rows[0], null, 2));
        console.log('🛒 [Cart] price_from value:', result.rows[0].price_from, 'type:', typeof result.rows[0].price_from);
      }

      const invalidItemIds = [];
      const items = (result.rows || []).map(item => {
        let images = [];
        let selectedOptions = {};
        let selectedInsurance = null;
        let validationStatus = 'valid';
        let validationMessage = '';

        try {
          if (item.images) images = JSON.parse(item.images);
          if (item.selected_options) selectedOptions = JSON.parse(item.selected_options);
          // ✅ 보험 정보 파싱
          if (item.selected_insurance) selectedInsurance = JSON.parse(item.selected_insurance);
        } catch (e) {
          console.error('❌ [Cart] JSON parsing error:', e);
        }

        // 🔍 상품 존재 여부 확인
        if (!item.listing_exists) {
          validationStatus = 'invalid';
          validationMessage = '상품이 삭제되었습니다';
          invalidItemIds.push(item.id);
        }
        // 🔍 상품 활성화 여부 확인
        else if (!item.is_active) {
          validationStatus = 'invalid';
          validationMessage = '판매가 중단된 상품입니다';
          invalidItemIds.push(item.id);
        }

        // 🔒 CRITICAL FIX: price_from이 없으면 cart_items.price_snapshot 사용
        const finalPrice = item.price_from || item.price_snapshot || 0;

        // 🔍 DEBUG: 가격 fallback 로그
        if (!item.price_from && item.price_snapshot) {
          console.log(`💰 [Cart] price_from 없음, price_snapshot 사용:`, {
            title: item.title,
            price_from: item.price_from,
            price_snapshot: item.price_snapshot,
            finalPrice
          });
        }

        return {
          ...item,
          price_from: finalPrice,  // ✅ FIX: price_snapshot 대체값 사용
          images: Array.isArray(images) ? images : [],
          selected_options: selectedOptions,
          // ✅ 보험 정보 추가
          selectedInsurance: selectedInsurance,
          insuranceFee: item.insurance_fee || 0,
          validationStatus,
          validationMessage,
          // ✅ camelCase 변환 (클라이언트 호환성)
          adultPrice: item.adult_price,
          childPrice: item.child_price,
          infantPrice: item.infant_price
        };
      });

      // 🗑️ 자동으로 유효하지 않은 항목 삭제 (옵션)
      if (invalidItemIds.length > 0) {
        console.log(`🗑️ [장바구니] 유효하지 않은 항목 ${invalidItemIds.length}개 발견:`, invalidItemIds);

        // 실제 삭제는 클라이언트에서 처리하도록 하고, 여기서는 로그만 남김
        // 필요시 자동 삭제를 원한다면 아래 코드 주석 해제:
        // await connection.execute(`
        //   DELETE FROM cart_items WHERE id IN (${invalidItemIds.join(',')})
        // `);
      }

      // 🔍 디버그: 첫 번째 item의 listing_id 확인
      if (items.length > 0) {
        console.log('🛒 [Cart] First item listing_id:', items[0].listing_id);
        console.log('🛒 [Cart] First item keys:', Object.keys(items[0]));
      }

      return res.status(200).json({
        success: true,
        data: items,
        invalidCount: invalidItemIds.length
      });
    }

    if (req.method === 'POST') {
      // 장바구니 추가 - ✅ 보험 및 옵션 지원
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
        num_seniors = 0,
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

      console.log('🛒 [Cart] POST - Adding to cart:', {
        userId,
        userIdType: typeof userId,
        listing_id,
        quantity,
        selected_date,
        num_adults,
        num_children,
        num_seniors
      });

      // 🔍 상품 존재 여부 및 활성화 상태 확인 + 가격 검증
      const listingCheck = await connection.execute(`
        SELECT id, is_active, price_from, category_id, category
        FROM listings
        WHERE id = ?
        LIMIT 1
      `, [listing_id]);

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

      // 🔒 CRITICAL: 팝업 상품 price_snapshot 검증 및 자동 보정
      let finalPriceSnapshot = price_snapshot;
      const isPopupProduct = listing.category_id === 1860 || listing.category === '팝업' || listing.category === 'popup';

      if (isPopupProduct && listing.price_from) {
        // 팝업 상품: price_snapshot은 단가여야 함
        if (price_snapshot) {
          const priceDiff = Math.abs(price_snapshot - listing.price_from);
          const priceRatio = listing.price_from > 0 ? (priceDiff / listing.price_from) : 0;

          // 10% 이상 차이나면 검증
          if (priceRatio > 0.1) {
            console.warn(`⚠️ [Cart] 팝업 상품 가격 불일치 감지:`, {
              listing_id,
              price_from: listing.price_from,
              price_snapshot,
              quantity,
              diff: priceDiff,
              ratio: `${(priceRatio * 100).toFixed(1)}%`
            });

            // 🔧 AUTO-FIX: price_snapshot이 price_from * quantity라면, 단가로 보정
            if (quantity > 1 && Math.abs(price_snapshot - (listing.price_from * quantity)) < listing.price_from * 0.1) {
              console.log(`🔧 [Cart] 총액이 감지되어 단가로 자동 보정: ${price_snapshot} → ${listing.price_from}`);
              finalPriceSnapshot = listing.price_from;
            }
          }
        } else {
          // price_snapshot이 없으면 listing.price_from 사용
          finalPriceSnapshot = listing.price_from;
          console.log(`📌 [Cart] price_snapshot 없음, listing.price_from 사용: ${finalPriceSnapshot}`);
        }
      }

      // ✅ 보험 및 옵션 포함하여 장바구니에 추가
      const result = await connection.execute(`
        INSERT INTO cart_items (
          user_id, listing_id, quantity, selected_date, selected_options,
          selected_insurance, insurance_fee,
          num_adults, num_children, num_infants, num_seniors,
          adult_price, child_price, infant_price, price_snapshot, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
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
        num_seniors,
        adult_price,
        child_price,
        infant_price,
        finalPriceSnapshot || null  // ✅ 보정된 price_snapshot 사용
      ]);

      console.log('장바구니 추가 성공:', result.insertId);

      return res.status(200).json({
        success: true,
        data: { id: result.insertId }
      });
    }

    if (req.method === 'PUT') {
      // 장바구니 수정 - ✅ 보험 및 옵션 지원
      const { itemId } = req.query;
      const {
        quantity,
        selected_date,
        selected_options,
        selected_insurance,
        insurance_fee,
        num_adults,
        num_children,
        num_infants,
        num_seniors,
        adult_price,
        child_price,
        infant_price,
        price_snapshot
      } = req.body;

      await connection.execute(`
        UPDATE cart_items
        SET
          quantity = COALESCE(?, quantity),
          selected_date = COALESCE(?, selected_date),
          selected_options = COALESCE(?, selected_options),
          selected_insurance = COALESCE(?, selected_insurance),
          insurance_fee = COALESCE(?, insurance_fee),
          num_adults = COALESCE(?, num_adults),
          num_children = COALESCE(?, num_children),
          num_infants = COALESCE(?, num_infants),
          num_seniors = COALESCE(?, num_seniors),
          adult_price = COALESCE(?, adult_price),
          child_price = COALESCE(?, child_price),
          infant_price = COALESCE(?, infant_price),
          price_snapshot = COALESCE(?, price_snapshot),
          updated_at = NOW()
        WHERE id = ? AND user_id = ?
      `, [
        quantity,
        selected_date,
        selected_options ? JSON.stringify(selected_options) : null,
        selected_insurance ? JSON.stringify(selected_insurance) : null,
        insurance_fee,
        num_adults,
        num_children,
        num_infants,
        num_seniors,
        adult_price,
        child_price,
        infant_price,
        price_snapshot,
        itemId,
        userId
      ]);

      return res.status(200).json({
        success: true
      });
    }

    if (req.method === 'DELETE') {
      // 장바구니 삭제
      const { itemId } = req.query;

      await connection.execute(`
        DELETE FROM cart_items
        WHERE id = ? AND user_id = ?
      `, [itemId, userId]);

      return res.status(200).json({
        success: true
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ [Cart] API Error:', error);
    console.error('❌ [Cart] Error stack:', error.stack);
    console.error('❌ [Cart] Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage
    });
    return res.status(500).json({
      success: false,
      error: error.message || '장바구니 처리 중 오류가 발생했습니다',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// JWT 인증 적용
module.exports = withAuth(handler, { requireAuth: true });
