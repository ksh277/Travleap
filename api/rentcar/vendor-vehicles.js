// 렌트카 벤더 차량 관리 API
const { db } = require('../../utils/database');



interface VehicleUpdateRequest extends Partial<VehicleCreateRequest> {
  id;
}

/**
 * 벤더: 자기 차량 목록 조회
 */


/**
 * 벤더: 새 차량 등록
 */


/**
 * 벤더: 차량 정보 수정
 */


/**
 * 벤더: 차량 삭제 (비활성화)
 */


/**
 * 벤더: 차량별 예약 내역 조회
 */


/**
 * 벤더: 전체 예약 내역 조회 (모든 차량)
 */


/**
 * 벤더: 대시보드 통계
 */


module.exports = async function handler(req, res) {
};
