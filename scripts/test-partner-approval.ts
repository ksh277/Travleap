/**
 * 파트너 승인/거절 테스트 스크립트
 */

const API_BASE = 'http://localhost:3004';
const ADMIN_TOKEN = 'admin-test-token'; // 실제 토큰이 필요하면 로그인 후 가져와야 함

async function getPartnerApplications() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/partners/applications`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
      },
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ 파트너 신청 ${result.total}개 조회 완료\n`);
      result.data.forEach((app: any, index: number) => {
        console.log(`${index + 1}. ${app.business_name}`);
        console.log(`   ID: ${app.id}, 상태: ${app.status}, 타입: ${app.partner_type || 'NULL'}`);
        console.log(`   담당자: ${app.contact_name}, 이메일: ${app.email}`);
        console.log(`   신청일: ${app.created_at}\n`);
      });
      return result.data;
    } else {
      console.log('❌ 파트너 신청 조회 실패:', result.message);
      return [];
    }
  } catch (error) {
    console.error('❌ API 호출 오류:', error);
    return [];
  }
}

async function approvePartner(partnerId: number, businessName: string) {
  try {
    const response = await fetch(`${API_BASE}/api/admin/partners/${partnerId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ status: 'approved' }),
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ "${businessName}" 승인 완료`);
    } else {
      console.log(`❌ "${businessName}" 승인 실패:`, result.message);
    }

    return result;
  } catch (error) {
    console.error('❌ API 호출 오류:', error);
    return { success: false, error };
  }
}

async function rejectPartner(partnerId: number, businessName: string, reason?: string) {
  try {
    const response = await fetch(`${API_BASE}/api/admin/partners/${partnerId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        status: 'rejected',
        reason: reason || '서비스 요건 불충족'
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ "${businessName}" 거절 완료`);
    } else {
      console.log(`❌ "${businessName}" 거절 실패:`, result.message);
    }

    return result;
  } catch (error) {
    console.error('❌ API 호출 오류:', error);
    return { success: false, error };
  }
}

async function main() {
  console.log('🚀 파트너 승인/거절 테스트 시작\n');
  console.log('⚠️  주의: 이 스크립트는 실제 관리자 인증이 필요합니다.');
  console.log('   관리자 페이지에서 직접 테스트해주세요!\n');

  console.log('📋 신청 현황 조회 중...\n');
  const applications = await getPartnerApplications();

  if (applications.length === 0) {
    console.log('\n❌ 대기 중인 파트너 신청이 없습니다.');
    console.log('먼저 test-partner-apply.ts를 실행하여 신청을 추가하세요.');
    return;
  }

  console.log('\n📝 테스트 시나리오:');
  console.log('1. 첫 번째 파트너 ("신안 맛집 식당") 승인');
  console.log('2. 두 번째 파트너 ("증도 카페 바다") 거절');
  console.log('\n⚠️  실제 승인/거절은 관리자 페이지에서 진행해주세요!');
  console.log('   (이 스크립트는 인증 토큰이 없어 실행되지 않을 수 있습니다)\n');

  // 테스트용 코드 (실제로는 인증 필요)
  // if (applications.length >= 1) {
  //   await approvePartner(applications[0].id, applications[0].business_name);
  // }
  // if (applications.length >= 2) {
  //   await rejectPartner(applications[1].id, applications[1].business_name);
  // }
}

main().catch(console.error);
