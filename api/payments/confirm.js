/**
 * 결제 승인 API
 *
 * Toss Payments에서 결제 완료 후 우리 서버로 돌아왔을 때 호출
 * HOLD 상태의 예약을 CONFIRMED로 변경하고 결제 정보를 기록
 */

const { db } = require('../../utils/database');
const { tossPayments } = require('../../utils/toss-payments');





/**
 * 결제 승인 처리
 *
 * 1. Toss Payments API로 결제 승인 요청
 * 2. 결제 정보 검증
 * 3. 예약 상태 변경 (HOLD → CONFIRMED)
 * 4. 결제 정보 기록 (payment_history)
 * 5. 로그 기록 (booking_logs)
 */


/**
 * 결제 실패 처리
 *
 * 사용자가 결제를 취소하거나 실패했을 때 호출
 */



module.exports = async function handler(req, res) {
};
