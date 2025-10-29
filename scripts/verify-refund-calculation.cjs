/**
 * 환불 금액 계산 검증 스크립트
 *
 * 테스트 케이스:
 * - 상품 7,000원 + 배송비 3,000원 = 총 10,000원
 *
 * 환불 정책:
 * 1. 배송 시작 전 (PENDING/READY): 전액 환불 10,000원
 * 2. 배송 중/완료 (SHIPPING/DELIVERED): 배송비(3,000) + 반품비(3,000) 차감 → 4,000원
 * 3. 상품 하자/오배송: 전액 환불 10,000원
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function verifyRefundCalculation() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🔍 [환불 금액 계산 검증] 시작...\n');

  try {
    // 테스트 케이스
    const testCases = [
      {
        name: '배송 시작 전 (단순 변심)',
        amount: 10000,
        deliveryFee: 3000,
        subtotal: 7000,
        deliveryStatus: 'READY',
        cancelReason: '단순 변심',
        expected: 10000
      },
      {
        name: '배송 중 (단순 변심)',
        amount: 10000,
        deliveryFee: 3000,
        subtotal: 7000,
        deliveryStatus: 'SHIPPING',
        cancelReason: '단순 변심',
        expected: 4000
      },
      {
        name: '배송 완료 (단순 변심)',
        amount: 10000,
        deliveryFee: 3000,
        subtotal: 7000,
        deliveryStatus: 'DELIVERED',
        cancelReason: '단순 변심',
        expected: 4000
      },
      {
        name: '배송 중 (상품 하자)',
        amount: 10000,
        deliveryFee: 3000,
        subtotal: 7000,
        deliveryStatus: 'SHIPPING',
        cancelReason: '상품 불량/하자',
        expected: 10000
      },
      {
        name: '배송 완료 (오배송)',
        amount: 10000,
        deliveryFee: 3000,
        subtotal: 7000,
        deliveryStatus: 'DELIVERED',
        cancelReason: '상품 오배송',
        expected: 10000
      },
      {
        name: '5만원 이상 (배송비 무료)',
        amount: 55000,
        deliveryFee: 0,
        subtotal: 55000,
        deliveryStatus: 'SHIPPING',
        cancelReason: '단순 변심',
        expected: 52000 // 55000 - 3000(반품비)
      }
    ];

    console.log('📋 환불 금액 계산 로직 시뮬레이션\n');
    console.log('─'.repeat(120));
    console.log('테스트 케이스                    | 결제 금액 | 배송비 | 배송 상태  | 사유          | 예상 환불 | 계산 환불 | 결과');
    console.log('─'.repeat(120));

    let passCount = 0;
    let failCount = 0;

    for (const testCase of testCases) {
      // 환불 금액 계산 로직 (api/admin/refund-booking.js와 동일)
      const RETURN_FEE = 3000;
      let refundAmount;

      const isDefectOrWrongItem =
        testCase.cancelReason.includes('하자') ||
        testCase.cancelReason.includes('오배송') ||
        testCase.cancelReason.includes('불량');

      if (isDefectOrWrongItem) {
        // 하자/오배송: 전액 환불
        refundAmount = testCase.amount;
      } else if (testCase.deliveryStatus === 'SHIPPING' || testCase.deliveryStatus === 'DELIVERED') {
        // 배송 중/완료: 배송비 + 반품비 차감
        const deduction = testCase.deliveryFee + RETURN_FEE;
        refundAmount = Math.max(0, testCase.amount - deduction);
      } else {
        // 배송 전: 전액 환불
        refundAmount = testCase.amount;
      }

      const result = refundAmount === testCase.expected ? '✅ PASS' : '❌ FAIL';
      if (refundAmount === testCase.expected) {
        passCount++;
      } else {
        failCount++;
      }

      const name = testCase.name.padEnd(32);
      const amount = String(testCase.amount).padStart(9);
      const deliveryFee = String(testCase.deliveryFee).padStart(6);
      const deliveryStatus = testCase.deliveryStatus.padEnd(11);
      const cancelReason = testCase.cancelReason.padEnd(14);
      const expected = String(testCase.expected).padStart(9);
      const calculated = String(refundAmount).padStart(9);

      console.log(`${name} | ${amount}원 | ${deliveryFee}원 | ${deliveryStatus} | ${cancelReason} | ${expected}원 | ${calculated}원 | ${result}`);
    }

    console.log('─'.repeat(120));
    console.log(`\n✅ 통과: ${passCount}/${testCases.length}  ❌ 실패: ${failCount}/${testCases.length}\n`);

    // 실제 환불 내역 확인
    console.log('\n📊 실제 환불 내역 확인 (최근 5건)\n');

    const refundsResult = await connection.execute(`
      SELECT
        p.id,
        p.order_id_str,
        p.amount,
        p.refund_amount,
        p.refund_reason,
        p.notes,
        b.delivery_status
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE p.payment_status = 'refunded'
      ORDER BY p.refunded_at DESC
      LIMIT 5
    `);

    if (refundsResult.rows && refundsResult.rows.length > 0) {
      console.log('ID  | 주문번호                        | 결제 금액 | 환불 금액 | 배송 상태  | 환불 사유');
      console.log('─'.repeat(120));

      for (const refund of refundsResult.rows) {
        let notes = null;
        try {
          notes = refund.notes ? JSON.parse(refund.notes) : null;
        } catch (e) {}

        const orderId = (refund.order_id_str || '-').substring(0, 30).padEnd(30);
        const amount = String(refund.amount).padStart(9);
        const refundAmount = String(refund.refund_amount || 'N/A').padStart(9);
        const deliveryStatus = (refund.delivery_status || 'N/A').padEnd(11);
        const reason = (refund.refund_reason || 'N/A').substring(0, 50);

        console.log(`${String(refund.id).padStart(3)} | ${orderId} | ${amount}원 | ${refundAmount}원 | ${deliveryStatus} | ${reason}`);

        if (notes && notes.deliveryFee) {
          console.log(`     → 배송비: ${notes.deliveryFee}원, 상품: ${notes.subtotal}원`);
        }
      }
    } else {
      console.log('환불 내역이 없습니다.');
    }

    console.log('\n✅ [검증 완료]\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

verifyRefundCalculation();
