// 메인 페이지 링크 테스트 스크립트
async function testPageLinks() {
  console.log('🔗 === 메인 페이지 링크 테스트 시작 ===');

  const links = [
    { name: '플레이스 굿즈 & 체험', url: '/shop', element: 'PlaceGoodsPage' },
    { name: '제휴업체와의 할인이벤트', url: '/partners', element: 'PartnerPage' },
    { name: 'AI 맞춤 추천', url: '/ai-recommendations', element: 'AIRecommendationPage' }
  ];

  for (const link of links) {
    console.log(`\n📄 ${link.name} 테스트 중...`);
    console.log(`   URL: ${link.url}`);

    try {
      // 현재 페이지에서 해당 링크로 이동 테스트
      const currentUrl = window.location.pathname;

      if (currentUrl !== link.url) {
        console.log(`   현재 위치: ${currentUrl}`);
        console.log(`   → ${link.url}로 이동 중...`);

        // React Router의 navigate 함수 사용
        if (window.navigate) {
          window.navigate(link.url);
          console.log(`   ✅ ${link.name} 페이지 이동 성공`);
        } else {
          // 직접 URL 변경으로 테스트
          window.history.pushState({}, '', link.url);
          console.log(`   ✅ ${link.name} URL 변경 성공`);
        }
      } else {
        console.log(`   ✅ 이미 ${link.name} 페이지에 있습니다`);
      }

    } catch (error) {
      console.log(`   ❌ ${link.name} 페이지 이동 실패:`, error.message);
    }
  }

  console.log('\n🎯 === 링크 테스트 완료 ===');
  console.log('각 링크를 수동으로 클릭해서 페이지 이동을 확인하세요:');
  console.log('1. 홈페이지 → "플레이스 굿즈 & 체험" 클릭');
  console.log('2. 홈페이지 → "제휴업체와의 할인이벤트" 클릭');
  console.log('3. 홈페이지 → "AI 맞춤 추천" 클릭');
}

// 메인 페이지의 기능 카드들 확인
function checkFeatureCards() {
  console.log('🔍 === 메인 페이지 기능 카드 확인 ===');

  // 홈페이지의 기능 카드들 찾기
  const featureCards = document.querySelectorAll('[data-testid="feature-card"], .feature-card, [class*="feature"]');

  if (featureCards.length > 0) {
    console.log(`✅ ${featureCards.length}개의 기능 카드 발견`);

    featureCards.forEach((card, index) => {
      const title = card.querySelector('h3, .title, [class*="title"]')?.textContent;
      const link = card.querySelector('a, [href]')?.getAttribute('href');

      console.log(`   ${index + 1}. ${title || '제목 없음'}`);
      console.log(`      링크: ${link || '링크 없음'}`);
    });
  } else {
    console.log('❌ 기능 카드를 찾을 수 없습니다');

    // 다른 방법으로 찾기
    const allLinks = document.querySelectorAll('a[href]');
    const relevantLinks = Array.from(allLinks).filter(link => {
      const href = link.getAttribute('href');
      return href === '/shop' || href === '/partners' || href === '/ai-recommendations';
    });

    if (relevantLinks.length > 0) {
      console.log(`✅ 관련 링크 ${relevantLinks.length}개 발견:`);
      relevantLinks.forEach((link, index) => {
        console.log(`   ${index + 1}. ${link.textContent} → ${link.getAttribute('href')}`);
      });
    } else {
      console.log('❌ 관련 링크를 찾을 수 없습니다');
    }
  }
}

// 수동 링크 클릭 시뮬레이션
function clickFeatureLink(linkText) {
  console.log(`🖱️ "${linkText}" 링크 클릭 시뮬레이션...`);

  const links = document.querySelectorAll('a');
  let foundLink = null;

  for (const link of links) {
    if (link.textContent.includes(linkText) ||
        link.getAttribute('href') === '/shop' && linkText.includes('굿즈') ||
        link.getAttribute('href') === '/partners' && linkText.includes('제휴') ||
        link.getAttribute('href') === '/ai-recommendations' && linkText.includes('AI')) {
      foundLink = link;
      break;
    }
  }

  if (foundLink) {
    console.log(`✅ 링크 발견: ${foundLink.getAttribute('href')}`);
    foundLink.click();
    console.log('🖱️ 링크 클릭 완료');
  } else {
    console.log(`❌ "${linkText}" 링크를 찾을 수 없습니다`);
  }
}

// 브라우저에서 실행 가능하도록 전역 등록
if (typeof window !== 'undefined') {
  window.testPageLinks = testPageLinks;
  window.checkFeatureCards = checkFeatureCards;
  window.clickFeatureLink = clickFeatureLink;

  // 편의 함수들
  window.testShopLink = () => clickFeatureLink('굿즈');
  window.testPartnersLink = () => clickFeatureLink('제휴');
  window.testAILink = () => clickFeatureLink('AI');

  console.log('✅ 페이지 링크 테스트 함수들이 등록되었습니다.');
  console.log('📋 사용 방법:');
  console.log('   testPageLinks() - 전체 링크 테스트');
  console.log('   checkFeatureCards() - 기능 카드 확인');
  console.log('   testShopLink() - 굿즈 페이지 링크 테스트');
  console.log('   testPartnersLink() - 파트너 페이지 링크 테스트');
  console.log('   testAILink() - AI 추천 페이지 링크 테스트');
}