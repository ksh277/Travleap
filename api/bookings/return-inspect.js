/**
 * 반납 검수 API
 *
 * 기능:
 * - 차량 상태 검수
 * - 패널티 계산
 * - 보증금 정산 (partial capture 또는 void)
 *
 * 프로세스:
 * 1. 예약 조회 (deposit_auth_id 확인)
 * 2. 검수 결과 기록
 * 3. 패널티 금액 계산
 * 4. penalty > 0 → captureDepositPartial
 *    penalty = 0 → voidDeposit
 */

const { db } = require('../../utils/database');
const { tossPaymentsServer } = require('../../utils/toss-payments-server');

/**
 * 패널티 계산
 */
function calculatePenalty(inspection) {
  const penalties = [];

  // 1. 손상 비용
  if (inspection.damages && inspection.damages.length > 0) {
    for (const damage of inspection.damages) {
      penalties.push({
        type: 'DAMAGE',
        amount: damage.estimatedCost,
        description: `${damage.type} (${damage.severity}): ${damage.description}`
      });
    }
  }

  // 2. 연료 부족 페널티 (50% 미만 시)
  if (inspection.fuel_level < 50) {
    const fuelPenalty = Math.round((50 - inspection.fuel_level) * 1000); // 1% = 1000원
    penalties.push({
      type: 'FUEL',
      amount: fuelPenalty,
      description: `연료 부족 (${inspection.fuel_level}%)`
    });
  }

  // 3. 추가 비용
  if (inspection.additional_fees && inspection.additional_fees.length > 0) {
    for (const fee of inspection.additional_fees) {
      penalties.push({
        type: 'ADDITIONAL_FEE',
        amount: fee.amount,
        description: `${fee.type}: ${fee.description}`
      });
    }
  }

  const total = penalties.reduce((sum, p) => sum + p.amount, 0);

  return { total, breakdown: penalties };
}

/**
 * 반납 검수 실행
 */


/**
 * 검수 이력 조회
 */


module.exports = async function handler(req, res) {
};
