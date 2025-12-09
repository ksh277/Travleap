/**
 * 메뉴 유사도 매칭 유틸리티
 * - 사용자 입력 메뉴명의 오타/띄어쓰기 처리
 * - 유사한 메뉴명 자동 매칭
 */

/**
 * 문자열 정규화 - 띄어쓰기, 특수문자 제거, 소문자 변환
 */
function normalizeMenuName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, '')      // 모든 공백 제거
    .replace(/[^\w가-힣]/g, '') // 특수문자 제거 (한글, 영숫자만 유지)
    .trim();
}

/**
 * Levenshtein 거리 계산 (두 문자열 간의 편집 거리)
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;

  // 빈 문자열 처리
  if (m === 0) return n;
  if (n === 0) return m;

  // DP 테이블 생성
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // 초기값 설정
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // DP 계산
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // 삭제
          dp[i][j - 1],     // 삽입
          dp[i - 1][j - 1]  // 교체
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * 유사도 점수 계산 (0~100%)
 */
function calculateSimilarity(str1, str2) {
  const norm1 = normalizeMenuName(str1);
  const norm2 = normalizeMenuName(str2);

  if (norm1 === norm2) return 100;
  if (!norm1 || !norm2) return 0;

  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);

  // 유사도 = (1 - 편집거리/최대길이) * 100
  return Math.round((1 - distance / maxLength) * 100);
}

/**
 * 기존 메뉴 목록에서 가장 유사한 메뉴 찾기
 * @param {string} inputMenu - 사용자 입력 메뉴명
 * @param {string[]} existingMenus - 기존 메뉴명 목록
 * @param {number} threshold - 유사도 임계값 (기본 80%)
 * @returns {{ match: string|null, similarity: number, isNew: boolean }}
 */
function findSimilarMenu(inputMenu, existingMenus, threshold = 80) {
  if (!inputMenu || !existingMenus || existingMenus.length === 0) {
    return { match: null, similarity: 0, isNew: true };
  }

  let bestMatch = null;
  let bestSimilarity = 0;

  for (const menu of existingMenus) {
    const similarity = calculateSimilarity(inputMenu, menu);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = menu;
    }
  }

  // 임계값 이상이면 매칭된 메뉴 반환
  if (bestSimilarity >= threshold) {
    return {
      match: bestMatch,
      similarity: bestSimilarity,
      isNew: false
    };
  }

  // 임계값 미만이면 새로운 메뉴로 처리
  return {
    match: null,
    similarity: bestSimilarity,
    isNew: true,
    suggestedName: normalizeDisplayName(inputMenu)
  };
}

/**
 * 표시용 메뉴명 정규화 (첫글자 대문자, 적절한 띄어쓰기)
 */
function normalizeDisplayName(name) {
  if (!name) return '';

  // 기본 정리
  let cleaned = name.trim();

  // 연속 공백 제거
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned;
}

/**
 * 여러 메뉴 입력을 처리하고 유사한 것들을 그룹화
 * @param {string[]} menuInputs - 사용자들이 입력한 메뉴명 목록
 * @param {number} threshold - 유사도 임계값
 * @returns {Map<string, { count: number, originalNames: string[] }>}
 */
function groupSimilarMenus(menuInputs, threshold = 80) {
  const groups = new Map();

  for (const input of menuInputs) {
    if (!input || !input.trim()) continue;

    const normalizedInput = normalizeDisplayName(input);

    // 기존 그룹에서 유사한 메뉴 찾기
    let foundGroup = null;
    let foundSimilarity = 0;

    for (const [groupName, data] of groups) {
      const similarity = calculateSimilarity(normalizedInput, groupName);
      if (similarity >= threshold && similarity > foundSimilarity) {
        foundGroup = groupName;
        foundSimilarity = similarity;
      }
    }

    if (foundGroup) {
      // 기존 그룹에 추가
      const data = groups.get(foundGroup);
      data.count++;
      if (!data.originalNames.includes(normalizedInput)) {
        data.originalNames.push(normalizedInput);
      }
    } else {
      // 새 그룹 생성
      groups.set(normalizedInput, {
        count: 1,
        originalNames: [normalizedInput]
      });
    }
  }

  return groups;
}

/**
 * 인기 메뉴 순위 계산
 * @param {Map} groupedMenus - groupSimilarMenus 결과
 * @param {number} topN - 상위 N개
 * @returns {Array<{ name: string, count: number, variants: string[] }>}
 */
function getTopMenus(groupedMenus, topN = 10) {
  const menuArray = [];

  for (const [name, data] of groupedMenus) {
    menuArray.push({
      name,
      count: data.count,
      variants: data.originalNames
    });
  }

  // 언급 횟수 내림차순 정렬
  menuArray.sort((a, b) => b.count - a.count);

  return menuArray.slice(0, topN);
}

module.exports = {
  normalizeMenuName,
  levenshteinDistance,
  calculateSimilarity,
  findSimilarMenu,
  normalizeDisplayName,
  groupSimilarMenus,
  getTopMenus
};
