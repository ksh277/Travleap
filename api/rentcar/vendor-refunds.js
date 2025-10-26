/**
 * 벤더 환불/정산 관리 API
 *
 * 기능:
 * - 취소된 예약 환불 목록 조회
 * - 보증금 정산 내역 조회
 * - 추가 결제 요청 내역 조회
 *
 * 라우트: GET /api/rentcar/vendor/refunds
 * 권한: 벤더
 */

const { db } = require('../../utils/database');

module.exports = async function handler(req, res) {
  try {
    // 1. GET 메서드만 허용
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // 2. 벤더 ID 추출 (쿼리 파라미터 또는 JWT에서)
    const { vendor_id } = req.query;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        error: 'vendor_id is required'
      });
    }

    // 3. 취소된 예약 환불 목록 조회
    const canceledRentalsQuery = `
      SELECT
        r.id,
        r.booking_number,
        r.vehicle_id,
        r.customer_name,
        r.customer_email,
        r.customer_phone,
        r.pickup_at_utc,
        r.return_at_utc,
        r.total_price_krw,
        r.status,
        r.canceled_at,
        r.cancel_reason,
        r.refund_amount_krw,
        r.refund_status,
        r.refund_processed_at,
        v.brand,
        v.model,
        v.display_name
      FROM rentcar_bookings r
      LEFT JOIN rentcar_vehicles v ON r.vehicle_id = v.id
      WHERE r.vendor_id = ?
        AND r.status = 'canceled'
        AND r.canceled_at IS NOT NULL
      ORDER BY r.canceled_at DESC
      LIMIT 100
    `;

    const canceledRentals = await db.query(canceledRentalsQuery, [vendor_id]);

    // 4. 보증금 정산 내역 조회 (환불 또는 차감)
    const depositSettlementsQuery = `
      SELECT
        d.id,
        d.rental_id,
        d.deposit_amount_krw,
        d.status,
        d.preauth_at,
        d.captured_at,
        d.captured_amount_krw,
        d.refunded_at,
        d.refunded_amount_krw,
        d.cancel_reason,
        r.booking_number,
        r.customer_name,
        r.customer_email,
        r.vehicle_id,
        r.pickup_at_utc,
        r.return_at_utc,
        r.actual_return_at_utc,
        r.late_return_fee_krw,
        r.total_additional_fee_krw,
        v.brand,
        v.model,
        v.display_name
      FROM rentcar_rental_deposits d
      INNER JOIN rentcar_bookings r ON d.rental_id = r.id
      LEFT JOIN rentcar_vehicles v ON r.vehicle_id = v.id
      WHERE r.vendor_id = ?
        AND d.status IN ('captured', 'refunded', 'partial_refunded')
      ORDER BY d.refunded_at DESC, d.captured_at DESC
      LIMIT 100
    `;

    const depositSettlements = await db.query(depositSettlementsQuery, [vendor_id]);

    // 5. 추가 결제 내역 조회 (보증금 부족 시)
    const additionalPaymentsQuery = `
      SELECT
        p.id,
        p.rental_id,
        p.payment_type,
        p.payment_method,
        p.amount_krw,
        p.payment_key,
        p.status,
        p.paid_at,
        p.reason,
        r.booking_number,
        r.customer_name,
        r.customer_email,
        r.vehicle_id,
        r.total_additional_fee_krw,
        v.brand,
        v.model,
        v.display_name
      FROM rentcar_rental_payments p
      INNER JOIN rentcar_bookings r ON p.rental_id = r.id
      LEFT JOIN rentcar_vehicles v ON r.vehicle_id = v.id
      WHERE r.vendor_id = ?
        AND p.payment_type = 'additional'
      ORDER BY p.paid_at DESC
      LIMIT 100
    `;

    const additionalPayments = await db.query(additionalPaymentsQuery, [vendor_id]);

    // 6. 통계 계산
    const stats = {
      total_canceled: canceledRentals.length,
      total_refunded: canceledRentals.filter(r => r.refund_status === 'completed').length,
      total_pending_refund: canceledRentals.filter(r => r.refund_status === 'pending').length,
      total_refund_amount: canceledRentals.reduce((sum, r) => sum + (r.refund_amount_krw || 0), 0),

      total_deposit_settlements: depositSettlements.length,
      total_deposit_refunded: depositSettlements.filter(d => d.status === 'refunded' || d.status === 'partial_refunded').length,
      total_deposit_refund_amount: depositSettlements.reduce((sum, d) => sum + (d.refunded_amount_krw || 0), 0),
      total_deposit_captured_amount: depositSettlements.reduce((sum, d) => sum + (d.captured_amount_krw || 0), 0),

      total_additional_payments: additionalPayments.length,
      total_additional_payment_amount: additionalPayments.reduce((sum, p) => sum + (p.amount_krw || 0), 0)
    };

    // 7. 응답
    return res.status(200).json({
      success: true,
      data: {
        canceled_rentals: canceledRentals.map(r => ({
          id: r.id,
          booking_number: r.booking_number,
          vehicle: {
            id: r.vehicle_id,
            brand: r.brand,
            model: r.model,
            display_name: r.display_name
          },
          customer: {
            name: r.customer_name,
            email: r.customer_email,
            phone: r.customer_phone
          },
          pickup_at: r.pickup_at_utc,
          return_at: r.return_at_utc,
          total_price: r.total_price_krw,
          canceled_at: r.canceled_at,
          cancel_reason: r.cancel_reason,
          refund_amount: r.refund_amount_krw,
          refund_status: r.refund_status,
          refund_processed_at: r.refund_processed_at
        })),
        deposit_settlements: depositSettlements.map(d => ({
          id: d.id,
          rental_id: d.rental_id,
          booking_number: d.booking_number,
          vehicle: {
            id: d.vehicle_id,
            brand: d.brand,
            model: d.model,
            display_name: d.display_name
          },
          customer: {
            name: d.customer_name,
            email: d.customer_email
          },
          deposit_amount: d.deposit_amount_krw,
          status: d.status,
          preauth_at: d.preauth_at,
          captured_at: d.captured_at,
          captured_amount: d.captured_amount_krw,
          refunded_at: d.refunded_at,
          refunded_amount: d.refunded_amount_krw,
          cancel_reason: d.cancel_reason,
          rental_info: {
            pickup_at: d.pickup_at_utc,
            return_at: d.return_at_utc,
            actual_return_at: d.actual_return_at_utc,
            late_fee: d.late_return_fee_krw,
            total_additional_fee: d.total_additional_fee_krw
          }
        })),
        additional_payments: additionalPayments.map(p => ({
          id: p.id,
          rental_id: p.rental_id,
          booking_number: p.booking_number,
          vehicle: {
            id: p.vehicle_id,
            brand: p.brand,
            model: p.model,
            display_name: p.display_name
          },
          customer: {
            name: p.customer_name,
            email: p.customer_email
          },
          payment_type: p.payment_type,
          payment_method: p.payment_method,
          amount: p.amount_krw,
          status: p.status,
          paid_at: p.paid_at,
          reason: p.reason,
          total_additional_fee: p.total_additional_fee_krw
        })),
        stats
      }
    });

  } catch (error) {
    console.error('[Vendor Refunds] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
};
