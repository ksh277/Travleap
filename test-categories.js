// 브라우저에서 실행할 카테고리별 상품 생성 테스트
async function testAllCategories() {
  console.log('8개 카테고리 상품 생성 테스트 시작...');

  const categories = [
    { name: '여행', slug: 'tour', title: '신안 퍼플섬 당일투어', price: 45000 },
    { name: '숙박', slug: 'stay', title: '임자도 대광해수욕장 펜션', price: 120000 },
    { name: '음식', slug: 'food', title: '신안 전통 젓갈 맛집', price: 25000 },
    { name: '렌트카', slug: 'rentcar', title: '신안 여행 렌트카', price: 80000 },
    { name: '관광지', slug: 'tourist', title: '증도 태평염전', price: 15000 },
    { name: '팝업', slug: 'popup', title: '신안 해넘이 팝업 카페', price: 12000 },
    { name: '행사', slug: 'event', title: '신안 갯벌 축제', price: 8000 },
    { name: '체험', slug: 'experience', title: '신안 전통 소금 만들기', price: 20000 }
  ];

  for (const cat of categories) {
    try {
      const product = {
        category: cat.name,
        title: cat.title,
        description: cat.title + ' - 신안군의 특별한 ' + cat.name + ' 경험',
        price: cat.price.toString(),
        images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop']
      };

      // 상품 생성 API 호출
      const response = await fetch('/api/admin/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product)
      });

      if (response.ok) {
        console.log('✅ ' + cat.name + ' 카테고리 상품 생성 성공 - /category/' + cat.slug + ' 확인하세요');
      } else {
        console.log('❌ ' + cat.name + ' 카테고리 상품 생성 실패');
      }

      // 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log('❌ ' + cat.name + ' 오류:', error.message);
    }
  }

  console.log('모든 카테고리 테스트 완료! 각 카테고리 페이지를 확인하세요.');
}

// 전역 함수로 등록
window.testAllCategories = testAllCategories;
console.log('testAllCategories() 함수가 준비되었습니다.');