/**
 * 렌트카 업체 셀프 등록 API
 *
 * 사용 방법:
 * 1. 업체가 이 페이지에서 직접 등록 신청
 * 2. 관리자 승인 후 계정 활성화
 * 3. 업체는 자기 차량만 관리 가능
 */

const { db } = require('../../utils/database.js');
const { authService } = require('../../utils/auth');
const bcrypt = require('bcryptjs');





/**
 * 렌트카 업체 등록 신청
 */


/**
 * 관리자에게 새 업체 등록 알림
 */
async function notifyAdminNewVendor(data: {
  vendorId;
  businessName;
  contactEmail;
  contactPhone;
}) {
  try {
    // admin_notifications 테이블에 알림 추가
    await db.execute(`
      INSERT INTO admin_notifications (
        type, title, message, priority, is_read, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `, [
      'new_vendor_registration',
      '새 렌트카 업체 등록 신청',
      `${data.businessName}(${data.contactEmail}) 업체가 등록을 신청했습니다. 승인이 필요합니다.`,
      'high',
      false
    ]);

    console.log(`📧 관리자에게 알림 발송: ${data.businessName} 등록 신청`);
  } catch (error) {
    console.error('관리자 알림 발송 실패:', error);
  }
}

/**
 * 관리자: 업체 승인
 */


/**
 * 업체에게 승인 이메일 발송
 */
async function sendVendorApprovalEmail(email) {
  // 이메일 발송 로직 (추후 구현)
  console.log(`📧 승인 이메일 발송: ${email}`);
}

/**
 * 임시 계정 생성 (관리자용)
 *
 * 사용 시나리오:
 * - 업체명을 모를 때 먼저 계정 생성
 * - 나중에 업체 정보 입력
 */


/**
 * 업체 정보 업데이트 (업체 본인 또는 관리자)
 */


module.exports = async function handler(req, res) {
};
