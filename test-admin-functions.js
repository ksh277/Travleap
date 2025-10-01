// 관리자 페이지 기능 테스트
import { api } from './utils/api.js';
import { db } from './utils/database.js';

async function testAdminFunctions() {
  console.log('🚀 관리자 기능 테스트 시작...');

  try {
    // 1. 데이터베이스 초기화
    console.log('📊 데이터베이스 초기화 중...');
    await db.forceReinitialize();
    console.log('✅ 데이터베이스 초기화 완료');

    // 2. 대시보드 통계 테스트
    console.log('📈 대시보드 통계 조회 테스트...');
    const stats = await api.admin.getDashboardStats();
    console.log('✅ 대시보드 통계:', stats);

    // 3. 리뷰 관리 테스트
    console.log('⭐ 리뷰 관리 테스트...');
    const reviews = await api.admin.getAllReviews();
    console.log(`✅ 리뷰 조회: ${reviews.data?.length || 0}개`);

    // 4. 파트너 관리 테스트
    console.log('🤝 파트너 관리 테스트...');
    const partners = await api.admin.getPartners();
    console.log(`✅ 파트너 조회: ${partners.data?.length || 0}개`);

    // 5. 파트너 신청 관리 테스트
    console.log('📋 파트너 신청 관리 테스트...');
    const applications = await api.admin.getPartnerApplications();
    console.log(`✅ 파트너 신청 조회: ${applications.data?.length || 0}개`);

    // 6. 블로그 관리 테스트
    console.log('📝 블로그 관리 테스트...');
    const blogs = await api.admin.getBlogs();
    console.log(`✅ 블로그 조회: ${blogs.data?.length || 0}개`);

    // 7. 주문 관리 테스트
    console.log('📦 주문 관리 테스트...');
    const orders = await api.admin.getOrders();
    console.log(`✅ 주문 조회: ${orders.data?.length || 0}개`);

    // 8. 사용자 관리 테스트
    console.log('👥 사용자 관리 테스트...');
    const users = await api.admin.getAllUsers();
    console.log(`✅ 사용자 조회: ${users.data?.length || 0}개`);

    // 9. 이미지 관리 테스트
    console.log('🖼️ 이미지 관리 테스트...');
    const images = await api.admin.getImages();
    console.log(`✅ 이미지 조회: ${images.data?.length || 0}개`);

    // 10. 상품 관리 테스트
    console.log('📦 상품 관리 테스트...');
    const listings = await api.getListings();
    console.log(`✅ 상품 조회: ${listings.data?.length || 0}개`);

    console.log('🎉 모든 관리자 기능 테스트 완료!');
    return true;

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    return false;
  }
}

// 테스트 실행
testAdminFunctions().then(success => {
  if (success) {
    console.log('✅ 모든 관리자 기능이 정상 작동합니다!');
  } else {
    console.log('❌ 일부 기능에 문제가 있습니다.');
  }
});