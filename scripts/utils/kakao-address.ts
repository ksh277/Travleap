/**
 * 카카오 주소 검색 API 헬퍼
 *
 * 주소를 검색하면 정확한 주소와 좌표(위도, 경도)를 반환
 */

import 'dotenv/config';

const KAKAO_REST_API_KEY = process.env.VITE_KAKAO_APP_KEY || process.env.KAKAO_REST_API_KEY;

export interface AddressResult {
  address: string;           // 전체 주소
  road_address?: string;     // 도로명 주소
  jibun_address?: string;    // 지번 주소
  latitude: number;          // 위도
  longitude: number;         // 경도
  place_name?: string;       // 장소명
  category?: string;         // 카테고리
}

/**
 * 주소로 좌표 검색
 */
export async function searchAddress(query: string): Promise<AddressResult[]> {
  if (!KAKAO_REST_API_KEY) {
    throw new Error('카카오 API 키가 설정되지 않았습니다. .env 파일에 VITE_KAKAO_APP_KEY를 추가해주세요.');
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`카카오 API 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.documents || data.documents.length === 0) {
      return [];
    }

    return data.documents.map((doc: any) => ({
      address: doc.address_name,
      road_address: doc.road_address?.address_name,
      jibun_address: doc.address?.address_name,
      latitude: parseFloat(doc.y),
      longitude: parseFloat(doc.x),
      place_name: doc.address_name,
      category: doc.category_name
    }));

  } catch (error) {
    console.error('주소 검색 오류:', error);
    throw error;
  }
}

/**
 * 키워드로 장소 검색 (예: "신안군 청사", "증도 해수욕장")
 */
export async function searchPlace(query: string, category?: string): Promise<AddressResult[]> {
  if (!KAKAO_REST_API_KEY) {
    throw new Error('카카오 API 키가 설정되지 않았습니다.');
  }

  try {
    let url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`;
    if (category) {
      url += `&category_group_code=${category}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`카카오 API 오류: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.documents || data.documents.length === 0) {
      return [];
    }

    return data.documents.map((doc: any) => ({
      address: doc.address_name,
      road_address: doc.road_address_name,
      jibun_address: doc.address_name,
      latitude: parseFloat(doc.y),
      longitude: parseFloat(doc.x),
      place_name: doc.place_name,
      category: doc.category_name
    }));

  } catch (error) {
    console.error('장소 검색 오류:', error);
    throw error;
  }
}

/**
 * 주소 검색 (주소 or 장소명 둘 다 시도)
 */
export async function searchAddressSmart(query: string): Promise<AddressResult[]> {
  // 먼저 주소로 검색
  let results = await searchAddress(query);

  // 결과 없으면 장소명으로 검색
  if (results.length === 0) {
    results = await searchPlace(query);
  }

  return results;
}

/**
 * 대화형 주소 검색 (CLI용)
 */
export async function searchAddressInteractive(query: string): Promise<AddressResult | null> {
  console.log(`🔍 "${query}" 검색 중...\n`);

  const results = await searchAddressSmart(query);

  if (results.length === 0) {
    console.log('❌ 검색 결과가 없습니다.');
    return null;
  }

  console.log(`✅ ${results.length}개 결과 발견:\n`);

  results.forEach((result, idx) => {
    console.log(`${idx + 1}. ${result.place_name || result.address}`);
    if (result.road_address) {
      console.log(`   도로명: ${result.road_address}`);
    }
    console.log(`   지번: ${result.jibun_address || result.address}`);
    console.log(`   좌표: ${result.latitude}, ${result.longitude}`);
    if (result.category) {
      console.log(`   카테고리: ${result.category}`);
    }
    console.log('');
  });

  // 첫 번째 결과 자동 선택
  const selected = results[0];
  console.log(`📍 선택: ${selected.place_name || selected.address}\n`);

  return selected;
}

// CLI에서 직접 실행할 때
if (import.meta.url === `file://${process.argv[1]}`) {
  const query = process.argv[2];

  if (!query) {
    console.log('사용법: npx tsx scripts/utils/kakao-address.ts "검색할 주소"');
    console.log('예시: npx tsx scripts/utils/kakao-address.ts "전라남도 신안군 증도면"');
    process.exit(1);
  }

  searchAddressInteractive(query).catch(console.error);
}
