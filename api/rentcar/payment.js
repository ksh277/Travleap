// 렌트카 결제 처리 API
const { db } = require('../../utils/database.cjs');



/**
 * 렌트카 결제 확정
 *
 * 프로세스:
 * 1. 예약 정보 조회 및 검증
 * 2. Toss Payments 결제 확정 요청
 * 3. 예약 상태 업데이트 (pending → confirmed)
 * 4. 결제 내역 저장
 */


/**
 * 렌트카 결제 취소/환불
 */


/**
 * 결제 상태 조회
 */


module.exports = async function handler(req, res) {
};
