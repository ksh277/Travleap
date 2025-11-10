/**
 * 관리자 전용 주문 교환 API
 *
 * POST /api/admin/exchange-order
 *
 * 기능:
 * - 팝업 상품 교환 처리
 * - 왕복 배송비 6,000원 결제 링크 생성
 * - 고객에게 이메일로 결제 링크 전송
 * - 기존 주문을 "교환 대기" 상태로 변경
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withSecureCors } = require('../../utils/cors-middleware.cjs');
const { withStandardRateLimit } = require('../../utils/rate-limit-middleware.cjs');
const { v4: uuidv4 } = require('uuid');

async function handler(req, res) {
  // 관리자 권한 확인
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { bookingId, orderId, exchangeReason } = req.body;

    console.log(`📥 [Admin Exchange] 요청 받음:`, {
      bookingId,
      orderId,
      exchangeReason
    });

    if ((!bookingId && !orderId) || !exchangeReason) {
      return res.status(400).json({
        success: false,
        message: 'bookingId 또는 orderId와 exchangeReason은 필수입니다.'
      });
    }

    // 1. PlanetScale 연결
    const connection = connect({ url: process.env.DATABASE_URL });

    // 2. 주문 정보 조회
    let orderResult;
    let isCartOrder = false;

    if (bookingId) {
      // 단일 예약
      orderResult = await connection.execute(`
        SELECT
          p.id as payment_id,
          p.payment_key,
          p.amount,
          p.payment_status,
          p.notes,
          p.user_id,
          b.id as booking_id,
          b.booking_number,
          b.listing_id,
          b.shipping_name,
          b.shipping_phone,
          b.shipping_address,
          b.shipping_address_detail,
          b.shipping_zipcode,
          l.title as product_name,
          l.price as product_price
        FROM payments p
        INNER JOIN bookings b ON p.booking_id = b.id
        INNER JOIN listings l ON b.listing_id = l.id
        WHERE p.booking_id = ?
          AND (p.payment_status = 'paid' OR p.payment_status = 'completed')
        LIMIT 1
      `, [bookingId]);
    } else {
      // 장바구니 주문
      isCartOrder = true;
      orderResult = await connection.execute(`
        SELECT
          p.id as payment_id,
          p.payment_key,
          p.amount,
          p.payment_status,
          p.notes,
          p.user_id,
          NULL as booking_id,
          p.gateway_transaction_id as booking_number
        FROM payments p
        WHERE p.id = ?
          AND (p.payment_status = 'paid' OR p.payment_status = 'completed')
        LIMIT 1
      `, [orderId]);
    }

    if (!orderResult.rows || orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '주문 정보를 찾을 수 없습니다.'
      });
    }

    const order = orderResult.rows[0];

    // 3. 고객 정보 조회 (Neon PostgreSQL)
    const { db: neonDb } = require('../../utils/neon-db.cjs');
    const userResult = await neonDb.query(
      'SELECT email, name FROM users WHERE id = $1 LIMIT 1',
      [order.user_id]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '고객 정보를 찾을 수 없습니다.'
      });
    }

    const customer = userResult.rows[0];

    console.log(`👤 [Admin Exchange] 고객: ${customer.email}`);

    // 4. notes에서 배송지 및 상품 정보 추출
    let shippingInfo = {
      name: order.shipping_name || customer.name,
      phone: order.shipping_phone || '',
      address: order.shipping_address || '',
      addressDetail: order.shipping_address_detail || '',
      zipcode: order.shipping_zipcode || ''
    };

    let itemsInfo = [];
    let productName = order.product_name || '주문 상품';

    if (order.notes) {
      try {
        const notesData = typeof order.notes === 'string' ? JSON.parse(order.notes) : order.notes;

        // 장바구니 주문의 경우 배송지 정보 추출
        if (notesData.shippingInfo) {
          shippingInfo = {
            name: notesData.shippingInfo.name || shippingInfo.name,
            phone: notesData.shippingInfo.phone || shippingInfo.phone,
            address: notesData.shippingInfo.address || shippingInfo.address,
            addressDetail: notesData.shippingInfo.addressDetail || shippingInfo.addressDetail,
            zipcode: notesData.shippingInfo.zipcode || shippingInfo.zipcode
          };
        }

        // 장바구니 주문의 경우 items 정보 추출
        if (notesData.items && Array.isArray(notesData.items)) {
          itemsInfo = notesData.items;

          // 팝업 상품만 필터링
          const popupItems = notesData.items.filter(item => item.category === '팝업');
          if (popupItems.length > 0) {
            productName = popupItems.map(item => `${item.title || item.name} x${item.quantity || 1}`).join(', ');
          }
        }
      } catch (e) {
        console.error('❌ [Admin Exchange] notes 파싱 실패:', e);
      }
    }

    // 5. 교환 결제 정보 생성 (exchange_payments 테이블)
    const exchangeId = uuidv4();
    const EXCHANGE_FEE = 6000; // 왕복 배송비

    await connection.execute(`
      INSERT INTO exchange_payments (
        id,
        original_payment_id,
        original_booking_id,
        user_id,
        amount,
        payment_status,
        exchange_reason,
        created_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW())
    `, [
      exchangeId,
      order.payment_id,
      order.booking_id || null,
      order.user_id,
      EXCHANGE_FEE,
      exchangeReason
    ]);

    console.log(`✅ [Admin Exchange] 교환 결제 정보 생성: ${exchangeId}`);

    // 6. 결제 링크 생성
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const paymentLink = `${baseUrl}/exchange-payment?exchangeId=${exchangeId}`;

    console.log(`🔗 [Admin Exchange] 결제 링크: ${paymentLink}`);

    // 7. 이메일 발송
    try {
      const { sendEmail } = require('../../../utils/email-service.ts');
      const { getExchangePaymentEmail } = require('../../../utils/email-templates.ts');

      const emailHtml = getExchangePaymentEmail({
        customerName: customer.name || '고객님',
        orderNumber: order.booking_number,
        productName,
        exchangeReason,
        exchangeFee: EXCHANGE_FEE,
        paymentLink,
        shippingAddress: `${shippingInfo.address} ${shippingInfo.addressDetail}`,
        shippingZipcode: shippingInfo.zipcode
      });

      await sendEmail({
        to: customer.email,
        subject: `[Travleap] 교환 신청 - 왕복 배송비 결제 안내`,
        html: emailHtml
      });

      console.log(`📧 [Admin Exchange] 이메일 전송 완료: ${customer.email}`);
    } catch (emailError) {
      console.error('❌ [Admin Exchange] 이메일 발송 실패:', emailError);
      // 이메일 실패해도 계속 진행 (결제 링크는 생성됨)
    }

    // 8. 기존 주문 상태를 "교환 대기"로 변경
    if (bookingId) {
      await connection.execute(`
        UPDATE bookings
        SET status = 'exchange_pending',
            exchange_reason = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [exchangeReason, bookingId]);
    } else {
      // 장바구니 주문의 경우 payments 테이블의 notes에 교환 정보 추가
      const currentNotes = order.notes ? (typeof order.notes === 'string' ? JSON.parse(order.notes) : order.notes) : {};
      currentNotes.exchangeStatus = 'pending';
      currentNotes.exchangeReason = exchangeReason;
      currentNotes.exchangeId = exchangeId;

      await connection.execute(`
        UPDATE payments
        SET notes = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [JSON.stringify(currentNotes), order.payment_id]);
    }

    console.log(`✅ [Admin Exchange] 주문 상태 변경 완료`);

    // 9. 성공 응답
    return res.status(200).json({
      success: true,
      message: '교환 처리가 완료되었습니다.',
      exchangeId,
      paymentLink,
      customerEmail: customer.email,
      exchangeFee: EXCHANGE_FEE
    });

  } catch (error) {
    console.error('❌ [Admin Exchange] API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '교환 처리 중 오류가 발생했습니다.'
    });
  }
}

// 올바른 미들웨어 순서: CORS → RateLimit → Auth
module.exports = withSecureCors(
  withStandardRateLimit(
    withAuth(handler, { requireAuth: true, requireAdmin: true })
  )
);
