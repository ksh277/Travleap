// 🔧 관리자 페이지 모달 테스트 스크립트
console.log('🔧 관리자 페이지 모달 테스트 시작');

// 1. 현재 페이지가 관리자 페이지인지 확인
const isAdminPage = window.location.pathname.includes('/admin');
console.log(`1️⃣ 관리자 페이지 여부: ${isAdminPage}`);

if (!isAdminPage) {
  console.log('❌ 관리자 페이지로 이동해주세요: /admin');
  console.log('💡 브라우저 콘솔에서 adminLogin() 실행 후 /admin으로 이동하세요');
} else {
  console.log('✅ 관리자 페이지에 있습니다');

  // 2. 상품 관리 탭 확인
  const productTab = document.querySelector('[data-state="inactive"][value="products"], [data-state="active"][value="products"]');
  console.log(`2️⃣ 상품 관리 탭 존재: ${!!productTab}`);

  if (productTab) {
    console.log('✅ 상품 관리 탭 발견됨');

    // 3. 상품 관리 탭 클릭 테스트
    console.log('🖱️ 상품 관리 탭 클릭 중...');
    productTab.click();

    setTimeout(() => {
      // 4. 상품 추가 버튼 확인
      const addButton = document.querySelector('button:has(svg + span), button[class*="bg-[#8B5FBF]"]');
      console.log(`3️⃣ 상품 추가 버튼 존재: ${!!addButton}`);

      if (addButton) {
        console.log('✅ 상품 추가 버튼 발견됨');
        console.log('버튼 텍스트:', addButton.textContent);

        // 5. 상품 추가 버튼 클릭 테스트
        console.log('🖱️ 상품 추가 버튼 클릭 중...');
        addButton.click();

        setTimeout(() => {
          // 6. 모달 확인
          const modal = document.querySelector('[role="dialog"], .dialog, [class*="dialog"]');
          console.log(`4️⃣ 모달 창 존재: ${!!modal}`);

          if (modal) {
            console.log('✅ 모달이 성공적으로 열렸습니다!');
            console.log('모달 내용:', modal.innerHTML.substring(0, 200) + '...');
          } else {
            console.log('❌ 모달이 열리지 않았습니다');

            // 디버깅 정보
            console.log('🔍 디버깅 정보:');
            console.log('- 모든 dialog 요소:', document.querySelectorAll('[role="dialog"]'));
            console.log('- 모든 .dialog 요소:', document.querySelectorAll('.dialog'));
            console.log('- body의 자식 요소들:', document.body.children);
          }
        }, 500);

      } else {
        console.log('❌ 상품 추가 버튼을 찾을 수 없습니다');

        // 디버깅 정보
        console.log('🔍 디버깅 정보:');
        console.log('- 모든 버튼 요소:', document.querySelectorAll('button'));
        console.log('- Plus 아이콘이 있는 요소:', document.querySelectorAll('svg[class*="plus"], [class*="Plus"]'));
      }
    }, 500);

  } else {
    console.log('❌ 상품 관리 탭을 찾을 수 없습니다');

    // 디버깅 정보
    console.log('🔍 디버깅 정보:');
    console.log('- 모든 탭 요소:', document.querySelectorAll('[role="tab"], .tab, [class*="tab"]'));
    console.log('- value 속성이 있는 요소:', document.querySelectorAll('[value]'));
  }
}

// 7. 전역 상태 확인
console.log('\n5️⃣ 전역 상태 확인:');
if (window.globalAuthState) {
  console.log('✅ 인증 상태:', window.globalAuthState.isLoggedIn);
  console.log('✅ 관리자 권한:', window.globalAuthState.isAdmin);
  console.log('✅ 사용자:', window.globalAuthState.user?.email || 'none');
} else {
  console.log('❌ 전역 인증 상태에 접근할 수 없습니다');
}

console.log('\n🎯 테스트 완료! 위의 결과를 확인해주세요.');
console.log('💡 문제가 있다면 각 단계별로 확인해보세요.');