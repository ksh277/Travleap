/**
 * 사용자 결제 내역 조회 API
 * GET /api/user/payments
 */

const { connect } = require('@planetscale/database');
const { verifyJWTFromRequest } = require('../../utils/auth-middleware.cjs');

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // JWT 토큰에서 userId 추출
    const user = verifyJWTFromRequest(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다. 로그인 후 다시 시도해주세요.'
      });
    }

    const userId = user.userId;

    const connection = connect({ url: process.env.DATABASE_URL });

    // 결제 내역 조회 (최신순, 숨김 처리된 내역 제외)
    // ✅ 렌트카 예약도 포함하도록 UNION 사용
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
        l.images as listing_images,
        NULL as vehicle_name,
        NULL as pickup_date,
        NULL as dropoff_date
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE p.user_id = ?
        AND (p.hidden_from_user IS NULL OR p.hidden_from_user = 0)
        AND (p.order_id_str IS NULL OR NOT p.order_id_str LIKE 'RC%')

      UNION ALL

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
        rb.booking_number,
        NULL as listing_id,
        rb.pickup_date as start_date,
        rb.dropoff_date as end_date,
        NULL as selected_option_id,
        NULL as guests,
        NULL as adults,
        NULL as children,
        NULL as infants,
        v.display_name as listing_title,
        '렌트카' as category,
        NULL as listing_images,
        v.display_name as vehicle_name,
        rb.pickup_date,
        rb.dropoff_date
      FROM payments p
      INNER JOIN rentcar_bookings rb ON p.order_id_str COLLATE utf8mb4_unicode_ci = rb.booking_number COLLATE utf8mb4_unicode_ci
      LEFT JOIN rentcar_vehicles v ON rb.vehicle_id = v.id
      WHERE p.user_id = ?
        AND (p.hidden_from_user IS NULL OR p.hidden_from_user = 0)
        AND p.order_id_str LIKE 'RC%'

      ORDER BY created_at DESC
      LIMIT 50
    `, [parseInt(userId), parseInt(userId)]);

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
};
