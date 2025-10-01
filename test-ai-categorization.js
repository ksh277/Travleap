// 🤖 AI 자동 카테고리 분류 시스템 테스트

// AI 카테고리 분류 함수 (AdminPage.tsx에서 복사)
function autoSuggestCategory(title, description = '') {
  const text = (title + ' ' + description).toLowerCase();

  // 카테고리별 키워드 매핑
  const categoryKeywords = {
    '여행': ['여행', '투어', '관광', '여행지', '트레킹', '둘러보기', '탐방', '패키지', '일정', '코스'],
    '렌트카': ['렌트', '렌터카', '차량', '자동차', '운전', '드라이브', '렌탈', '차량대여', '승용차', '버스'],
    '숙박': ['숙박', '호텔', '펜션', '리조트', '민박', '게스트하우스', '카라반', '글램핑', '캠핑', '머물기', '잠자리', '객실'],
    '음식': ['음식', '맛집', '레스토랑', '카페', '식당', '요리', '먹거리', '디저트', '음료', '특산물', '젓갈', '해산물', '전통음식'],
    '관광지': ['관광지', '명소', '유적', '박물관', '전시관', '해수욕장', '해변', '섬', '산', '공원', '다리', '전망대', '풍경'],
    '팝업': ['팝업', '전시', '체험관', '임시', '한정', '기간한정', '특별전', '이벤트전', '전시회'],
    '행사': ['행사', '축제', '이벤트', '콘서트', '공연', '축제', '행사', '축하', '기념일', '개최', '열리는'],
    '체험': ['체험', '만들기', '배우기', '실습', '워크샵', '클래스', '수업', '프로그램', '활동', '참여', '직접']
  };

  // 각 카테고리별 점수 계산
  const scores = Object.entries(categoryKeywords).map(([category, keywords]) => {
    const score = keywords.reduce((acc, keyword) => {
      const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
      return acc + matches;
    }, 0);
    return { category, score };
  });

  // 가장 높은 점수의 카테고리 반환
  const bestMatch = scores.reduce((max, current) =>
    current.score > max.score ? current : max
  );

  console.log('🎯 스마트 카테고리 분석:', {
    input: text.substring(0, 50) + '...',
    scores: scores.filter(s => s.score > 0),
    suggested: bestMatch.score > 0 ? bestMatch.category : '여행'
  });

  return bestMatch.score > 0 ? bestMatch.category : '여행'; // 기본값은 '여행'
}

// 테스트 케이스들
const testCases = [
  {
    title: "신안 증도 염전 투어 패키지",
    description: "신안군 증도면의 아름다운 염전을 둘러보는 관광 코스입니다.",
    expected: "여행"
  },
  {
    title: "증도 펜션 바다뷰 객실",
    description: "바다가 보이는 펜션에서 편안한 숙박을 즐기세요. 글램핑도 가능합니다.",
    expected: "숙박"
  },
  {
    title: "신안 젓갈 맛집 투어",
    description: "신안 특산물인 젓갈과 해산물 요리를 맛볼 수 있는 레스토랑입니다.",
    expected: "음식"
  },
  {
    title: "렌터카 대여 서비스",
    description: "신안 여행을 위한 차량 대여 서비스입니다. 승용차와 버스 모두 이용 가능합니다.",
    expected: "렌트카"
  },
  {
    title: "증도 유리섬 박물관",
    description: "증도의 유명한 관광지인 유리섬 박물관을 방문해보세요.",
    expected: "관광지"
  },
  {
    title: "신안 소금 만들기 체험",
    description: "전통 방식으로 소금을 직접 만들어보는 체험 프로그램입니다.",
    expected: "체험"
  },
  {
    title: "신안 갯벌 축제",
    description: "매년 열리는 신안 갯벌 축제에 참여하세요. 다양한 이벤트와 공연이 있습니다.",
    expected: "행사"
  },
  {
    title: "한정판 신안 특산품 전시",
    description: "기간한정으로 열리는 신안 특산품 팝업 전시회입니다.",
    expected: "팝업"
  }
];

// 테스트 실행
console.log('🧪 AI 자동 카테고리 분류 시스템 테스트 시작\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`\n📝 테스트 ${index + 1}: "${testCase.title}"`);
  console.log(`📄 설명: "${testCase.description}"`);
  console.log(`🎯 예상 카테고리: ${testCase.expected}`);

  const result = autoSuggestCategory(testCase.title, testCase.description);

  console.log(`🤖 AI 추천 카테고리: ${result}`);

  if (result === testCase.expected) {
    console.log('✅ 테스트 통과!');
    passedTests++;
  } else {
    console.log('❌ 테스트 실패');
  }

  console.log('---');
});

console.log(`\n🎉 AI 카테고리 분류 테스트 결과: ${passedTests}/${totalTests} 통과 (${Math.round((passedTests/totalTests)*100)}%)`);

if (passedTests === totalTests) {
  console.log('🚀 모든 테스트 통과! AI 자동 카테고리 분류 시스템이 완벽하게 작동합니다.');
} else {
  console.log('⚠️ 일부 테스트가 실패했습니다. 키워드 매핑을 조정이 필요할 수 있습니다.');
}