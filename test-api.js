// API 테스트 스크립트
import { api } from './utils/api.js';

async function testAPI() {
  console.log('=== API 테스트 시작 ===\n');

  try {
    // 1. 데이터베이스 연결 테스트
    console.log('1. 데이터베이스 연결 테스트...');
    const isConnected = await api.testConnection();
    console.log(`   연결 상태: ${isConnected ? '성공' : '실패'}\n`);

    // 2. 카테고리 가져오기 테스트
    console.log('2. 카테고리 가져오기...');
    const categories = await api.getCategories();
    console.log(`   카테고리 수: ${categories.length}`);
    if (categories.length > 0) {
      console.log(`   첫 번째 카테고리: ${categories[0].name_ko} (${categories[0].slug})`);
    }
    console.log('');

    // 3. 리스팅 가져오기 테스트
    console.log('3. 리스팅 가져오기...');
    const listingsResult = await api.getListings({ limit: 5 });
    console.log(`   리스팅 수: ${listingsResult.data.length}`);
    if (listingsResult.data.length > 0) {
      const firstListing = listingsResult.data[0];
      console.log(`   첫 번째 리스팅: ${firstListing.title}`);
      console.log(`   위치: ${firstListing.location || '정보 없음'}`);
      console.log(`   가격: ${firstListing.price_from ? `${firstListing.price_from}원` : '문의'}`);
      console.log(`   평점: ${firstListing.rating_avg}/5.0 (${firstListing.rating_count}개 리뷰)`);
    }
    console.log('');

    // 4. 검색 테스트
    console.log('4. 검색 테스트...');
    const searchResults = await api.searchListings('신안', { category: 'tour' });
    console.log(`   검색 결과: ${searchResults.length}개`);
    console.log('');

    // 5. 개별 리스팅 가져오기 테스트
    if (listingsResult.data.length > 0) {
      console.log('5. 개별 리스팅 가져오기...');
      const listing = await api.getListing(listingsResult.data[0].id);
      console.log(`   리스팅 제목: ${listing ? listing.title : '찾을 수 없음'}`);
      console.log('');
    }

    console.log('✅ 모든 API 테스트 완료!');

  } catch (error) {
    console.error('❌ API 테스트 실패:', error);
  }
}

// Node.js 환경에서 실행
if (typeof window === 'undefined') {
  testAPI();
} else {
  // 브라우저 환경에서는 window에 함수 등록
  window.testAPI = testAPI;
}