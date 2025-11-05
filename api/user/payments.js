/**
 * 사용자 결제 내역 조회 API
 * GET /api/user/payments
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware');
const { withSecureCors } = require('../../utils/cors-middleware');

async function handler(req, res) {

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // JWT에서 userId 읽기
    const userId = req.user.userId;

    const connection = connect({ url: process.env.DATABASE_URL });

    // 결제 내역 조회 (최신순, 숨김 처리된 내역 제외)
    const result = await connection.execute(`
      SELECT
        p.id,
        p.booking_id,
        p.order_id,
        p.order_id_str,
        p.gateway_transaction_id,
        p.amount,
        p.payment_method,
        p.payment_status,
        p.payment_key,
        p.approved_at,
        p.receipt_url,
        p.card_company,
        p.card_number,
        p.created_at,
        p.notes,
        p.refund_amount,
        p.refund_reason,
        p.refunded_at,
        b.booking_number,
        b.listing_id,
        b.start_date,
        b.end_date,
        b.selected_option_id,
        b.guests,
        b.adults,
        b.children,
        b.infants,
        l.title as listing_title,
        l.category,
        l.images as listing_images
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE p.user_id = ?
        AND (p.hidden_from_user IS NULL OR p.hidden_from_user = 0)
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [parseInt(userId)]);

    // notes.items에서 listingId를 추출하여 상품명 조회
    const payments = result.rows || [];

    for (const payment of payments) {
      if (payment.notes) {
        try {
          const notes = typeof payment.notes === 'string' ? JSON.parse(payment.notes) : payment.notes;

          // items 배열에 listingId가 있는 경우, 실제 상품명 조회
          if (notes.items && Array.isArray(notes.items)) {
            for (const item of notes.items) {
              if (item.listingId && !item.title && !item.name) {
                // listing 조회
                const listingResult = await connection.execute(`
                  SELECT id, title, category
                  FROM listings
                  WHERE id = ?
                  LIMIT 1
                `, [item.listingId]);

                if (listingResult.rows && listingResult.rows.length > 0) {
                  const listing = listingResult.rows[0];
                  item.title = listing.title; // title 추가
                  item.category = listing.category; // category도 추가
                  console.log(`✅ [User Payments] listingId ${item.listingId}의 title 조회: ${listing.title}`);
                }
              }
            }

            // 업데이트된 notes를 다시 문자열로 변환
            payment.notes = JSON.stringify(notes);
          }
        } catch (e) {
          console.error(`❌ [User Payments] notes 처리 실패 (payment_id: ${payment.id}):`, e);
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: payments
    });

  } catch (error) {
    console.error('❌ [User Payments] API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '결제 내역 조회에 실패했습니다.'
    });
  }
}

// JWT 인증 및 보안 CORS 적용
module.exports = withSecureCors(
  withAuth(handler, { requireAuth: true })
);
