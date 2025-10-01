// 완벽한 데이터 동기화 확인 및 수정 스크립트
async function debugCompleteSync() {
  console.log('🔍 === 완전한 데이터 동기화 디버깅 시작 ===');

  try {
    // 1. 관리자 페이지 상품 개수 확인
    console.log('\n1️⃣ 관리자 페이지 데이터 확인...');
    const adminResponse = await fetch('/api/admin/listings', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const adminData = await adminResponse.json();
    console.log(`관리자 페이지 상품 개수: ${adminData.data ? adminData.data.length : 0}개`);
    if (adminData.data) {
      adminData.data.forEach((item, idx) => {
        console.log(`  ${idx+1}. ${item.title} (카테고리: ${item.category})`);
      });
    }

    // 2. 일반 페이지들 상품 개수 확인
    console.log('\n2️⃣ 일반 페이지들 데이터 확인...');

    // 전체 상품 조회
    const allResponse = await fetch('/api/listings');
    const allData = await allResponse.json();
    console.log(`전체 상품 API 응답 개수: ${allData.data ? allData.data.length : 0}개`);

    // 카테고리별 상품 조회
    const categories = ['tour', 'stay', 'food', 'rentcar', 'tourist', 'popup', 'event', 'experience'];
    for (const cat of categories) {
      const catResponse = await fetch(`/api/listings?category=${cat}`);
      const catData = await catResponse.json();
      console.log(`${cat} 카테고리 상품: ${catData.data ? catData.data.length : 0}개`);
    }

    // 3. 데이터베이스 직접 확인
    console.log('\n3️⃣ 데이터베이스 상태 확인...');
    const dbResponse = await fetch('/api/debug/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'SELECT * FROM listings' })
    });
    const dbData = await dbResponse.json();
    console.log(`데이터베이스 listings 테이블 실제 레코드: ${dbData.data ? dbData.data.length : 0}개`);

    if (dbData.data) {
      dbData.data.forEach((item, idx) => {
        console.log(`  DB ${idx+1}. ${item.title} (category: ${item.category}, is_published: ${item.is_published}, is_active: ${item.is_active})`);
      });
    }

    // 4. 문제 진단
    console.log('\n🔍 === 문제 진단 ===');
    const adminCount = adminData.data ? adminData.data.length : 0;
    const allCount = allData.data ? allData.data.length : 0;
    const dbCount = dbData.data ? dbData.data.length : 0;

    if (adminCount !== allCount || adminCount !== dbCount) {
      console.log('❌ 데이터 불일치 발견!');
      console.log(`관리자: ${adminCount}, 전체API: ${allCount}, DB: ${dbCount}`);

      // 5. 데이터 동기화 수행
      console.log('\n5️⃣ 데이터 동기화 수행...');
      await fixDataSync();
    } else {
      console.log('✅ 모든 데이터가 일치합니다!');
    }

  } catch (error) {
    console.error('❌ 디버깅 중 오류:', error);
  }
}

async function fixDataSync() {
  console.log('🔧 데이터 동기화 수정 시작...');

  try {
    // 모든 비활성 상품을 활성화
    const updateResponse = await fetch('/api/debug/fix-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'activate_all_listings' })
    });

    const result = await updateResponse.json();
    console.log('✅ 동기화 수정 완료:', result.message);

    // 재확인
    setTimeout(() => {
      console.log('\n🔄 수정 후 재확인...');
      debugCompleteSync();
    }, 1000);

  } catch (error) {
    console.error('❌ 동기화 수정 실패:', error);
  }
}

// 브라우저에서 실행 가능하도록 전역 등록
if (typeof window !== 'undefined') {
  window.debugCompleteSync = debugCompleteSync;
  window.fixDataSync = fixDataSync;
  console.log('✅ debugCompleteSync() 함수가 등록되었습니다.');
  console.log('브라우저 콘솔에서 debugCompleteSync() 실행하세요.');
}