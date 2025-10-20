/**
 * 렌트카 업체 셀프 등록 API
 *
 * 사용 방법:
 * 1. 업체가 이 페이지에서 직접 등록 신청
 * 2. 관리자 승인 후 계정 활성화
 * 3. 업체는 자기 차량만 관리 가능
 */

import { db } from '../../utils/database.js';
import { authService } from '../../utils/auth';
import bcrypt from 'bcryptjs';





/**
 * 렌트카 업체 등록 신청
 */
export async function registerVendor(request) {
  try {
    console.log('🚗 렌트카 업체 등록 신청:', request.business_name);

    // 1. 이메일 중복 확인
    const existingUser = await db.query(`
      SELECT id FROM users WHERE email = ?
    `, [request.account_email]);

    if (existingUser.length > 0) {
      return {
        success: false,
        message: '이미 사용 중인 이메일입니다.',
        error: 'EMAIL_ALREADY_EXISTS'
      };
    }

    // 2. 사업자등록번호 중복 확인 (있는 경우)
    if (request.business_registration_number) {
      const existingVendor = await db.query(`
        SELECT id FROM rentcar_vendors
        WHERE business_registration_number = ?
      `, [request.business_registration_number]);

      if (existingVendor.length > 0) {
        return {
          success: false,
          message: '이미 등록된 사업자등록번호입니다.',
          error: 'BUSINESS_NUMBER_EXISTS'
        };
      }
    }

    // 3. 비밀번호 해싱 (bcrypt)
    const hashedPassword = await bcrypt.hash(request.account_password, 10);

    // 4. Users 테이블에 계정 생성 (role: 'vendor')
    const userResult = await db.execute(`
      INSERT INTO users (
        user_id, email, password_hash, name, phone, role,
        preferred_language, preferred_currency, marketing_consent,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      `vendor_${Date.now()}`,
      request.account_email,
      hashedPassword,
      request.contact_person,
      request.contact_phone,
      'vendor', // 새로운 role: vendor
      'ko',
      'KRW',
      false
    ]);

    const userId = userResult.insertId;

    // 4. rentcar_vendors 테이블에 업체 정보 등록
    const vendorResult = await db.execute(`
      INSERT INTO rentcar_vendors (
        business_name, business_number,
        contact_email, contact_phone, contact_name,
        description, logo_url, commission_rate,
        status, user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      request.business_name,
      request.business_registration_number || null,
      request.contact_email,
      request.contact_phone,
      request.contact_person,
      request.description || null,
      null, // logo_url
      10.00, // commission_rate (기본 10% - admin_settings와 동일)
      'pending', // status (관리자 승인 대기)
      userId
    ]);

    const vendorId = vendorResult.insertId || 0;

    console.log(`✅ 렌트카 업체 등록 완료: ${request.business_name} (ID: ${vendorId})`);
    console.log(`👤 연결된 사용자 계정 ID: ${userId}`);

    // 5. 관리자에게 알림 (선택사항)
    await notifyAdminNewVendor({
      vendorId,
      businessName: request.business_name,
      contactEmail: request.contact_email,
      contactPhone: request.contact_phone
    });

    return {
      success: true,
      vendorId,
      userId,
      message: '등록 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.'
    };

  } catch (error) {
    console.error('❌ 렌트카 업체 등록 실패:', error);
    return {
      success: false,
      message: '등록 신청 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
}

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
export async function approveVendor(vendorId: number) {
  try {
    // 1. 업체 승인 (status를 'active'로 변경)
    await db.execute(`
      UPDATE rentcar_vendors
      SET status = 'active', updated_at = NOW()
      WHERE id = ?
    `, [vendorId]);

    // 2. 연결된 사용자 계정도 활성화 (필요시)
    const vendor = await db.query(`
      SELECT user_id, contact_email FROM rentcar_vendors WHERE id = ?
    `, [vendorId]);

    if (vendor.length > 0 && vendor[0].user_id) {
      await db.execute(`
        UPDATE users SET is_active = true WHERE id = ?
      `, [vendor[0].user_id]);
    }

    console.log(`✅ 렌트카 업체 승인 완료: ID ${vendorId}`);

    // 3. 업체에게 승인 이메일 발송 (선택사항)
    if (vendor.length > 0) {
      await sendVendorApprovalEmail(vendor[0].contact_email);
    }

    return {
      success: true,
      message: '업체가 승인되었습니다.'
    };

  } catch (error) {
    console.error('업체 승인 실패:', error);
    return {
      success: false,
      message: '업체 승인 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 업체에게 승인 이메일 발송
 */
async function sendVendorApprovalEmail(email: string) {
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
export async function createTemporaryVendorAccount(email, password, tempName) {
  try {
    console.log(`🔧 임시 벤더 계정 생성: ${email}`);

    // 1. 비밀번호 해싱 (bcrypt)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Users 계정 생성
    const userResult = await db.execute(`
      INSERT INTO users (
        user_id, email, password_hash, name, role,
        preferred_language, preferred_currency,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      `vendor_temp_${Date.now()}`,
      email,
      hashedPassword,
      tempName,
      'vendor',
      'ko',
      'KRW'
    ]);

    const userId = userResult.insertId;

    // 2. 빈 rentcar_vendors 레코드 생성
    const vendorResult = await db.execute(`
      INSERT INTO rentcar_vendors (
        business_name, contact_email, contact_name,
        status, user_id, commission_rate,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      tempName,
      email,
      tempName,
      'pending', // 관리자 승인 대기
      userId,
      10.00 // 기본 수수료율 10% (admin_settings와 동일)
    ]);

    const vendorId = vendorResult.insertId || 0;

    console.log(`✅ 임시 계정 생성 완료: User ID ${userId}, Vendor ID ${vendorId}`);
    console.log(`📝 이메일: ${email}`);
    console.log(`🔑 임시 비밀번호: ${password}`);

    return {
      success: true,
      vendorId,
      userId,
      message: `임시 계정이 생성되었습니다.\n이메일: ${email}\n비밀번호: ${password}`
    };

  } catch (error) {
    console.error('임시 계정 생성 실패:', error);
    return {
      success: false,
      message: '임시 계정 생성 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
}

/**
 * 업체 정보 업데이트 (업체 본인 또는 관리자)
 */
export async function updateVendorInfo(
  vendorId: number,
  userId: number,
  updateData: Partial<VendorRegistrationRequest>
) {
  try {
    // 권한 확인: 해당 업체의 user_id와 일치하는지 또는 관리자인지
    const vendor = await db.query(`
      SELECT user_id FROM rentcar_vendors WHERE id = ?
    `, [vendorId]);

    if (vendor.length === 0) {
      return { success: false, message: '업체를 찾을 수 없습니다.' };
    }

    const user = await db.query(`
      SELECT role FROM users WHERE id = ?
    `, [userId]);

    const isOwner = vendor[0].user_id === userId;
    const isAdmin = user.length > 0 && user[0].role === 'admin';

    if (!isOwner && !isAdmin) {
      return { success: false, message: '권한이 없습니다.' };
    }

    // 업데이트할 필드 동적 생성
    const fields = [];
    const values = [];

    if (updateData.business_name) {
      fields.push('business_name = ?');
      values.push(updateData.business_name);
    }
    if (updateData.business_registration_number) {
      fields.push('business_number = ?');
      values.push(updateData.business_registration_number);
    }
    if (updateData.contact_email) {
      fields.push('contact_email = ?');
      values.push(updateData.contact_email);
    }
    if (updateData.contact_phone) {
      fields.push('contact_phone = ?');
      values.push(updateData.contact_phone);
    }
    if (updateData.contact_person) {
      fields.push('contact_name = ?');
      values.push(updateData.contact_person);
    }
    if (updateData.description) {
      fields.push('description = ?');
      values.push(updateData.description);
    }

    fields.push('updated_at = NOW()');

    if (fields.length === 1) { // updated_at만 있으면
      return { success: false, message: '업데이트할 정보가 없습니다.' };
    }

    values.push(vendorId);

    await db.execute(`
      UPDATE rentcar_vendors SET ${fields.join(', ')} WHERE id = ?
    `, values);

    console.log(`✅ 업체 정보 업데이트 완료: Vendor ID ${vendorId}`);

    return {
      success: true,
      message: '업체 정보가 업데이트되었습니다.'
    };

  } catch (error) {
    console.error('업체 정보 업데이트 실패:', error);
    return {
      success: false,
      message: '업데이트 중 오류가 발생했습니다.'
    };
  }
}
