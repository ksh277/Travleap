import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL });

// 파트너 타입 정의
interface Partner {
  user_id: number;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  business_address: string;
  services: string;
  description: string;
  business_hours: string;
  is_featured: number;
  is_verified: number;
  is_active: number;
  tier: string;
  status: string;
  partner_type: string;
  lat: number;
  lng: number;
  website?: string;
}

// 대략적인 신안군 좌표
const SINAN_COORDS = {
  SOAKDO: { lat: 34.985400, lng: 126.023400 },
  APHAE: { lat: 34.845400, lng: 126.283400 },
  AMTAE: { lat: 34.955400, lng: 126.353400 },
  JAEUN: { lat: 34.975400, lng: 126.193400 },
  JEUNGDO: { lat: 34.985400, lng: 126.023400 },
  ANJWA: { lat: 34.965400, lng: 126.213400 },
};

// 좌표 매핑 (주소 기반)
function getCoordinates(address: string): { lat: number; lng: number } {
  if (address.includes('소악길')) return SINAN_COORDS.SOAKDO;
  if (address.includes('압해')) return SINAN_COORDS.APHAE;
  if (address.includes('암태')) return SINAN_COORDS.AMTAE;
  if (address.includes('자은')) return SINAN_COORDS.JAEUN;
  if (address.includes('증도')) return SINAN_COORDS.JEUNGDO;
  if (address.includes('안좌')) return SINAN_COORDS.ANJWA;
  return SINAN_COORDS.APHAE; // 기본값
}

async function addSinanPartners() {
  console.log('🏝️  신안 제휴 파트너 27개소 데이터 추가 중...\n');

  try {
    // 기존 신안 파트너 삭제 (중복 방지)
    const partnerNames = [
      '소악도 민박', '섬티아 민박', '파인클라우드', '여인송 빌리지', '노두길 민박', '천사바다펜션', '라마다호텔&리조트',
      '보라해물부대전골', '하하호호', '섬티아 식당', '신바다 횟집', '섬마을 회정식', '진번칼국수', '자은신안뻘낙지',
      '뻘 땅', '드림하우스 해원', '맛나제', '백길천사횟집', '신안횟집', '천사아구찜',
      '산티아고커피', '파인클라우드 카페', '송공항 1004 카페', '문카페', '천사바다블라썸', '1004 떡공방', '1004 요트'
    ];

    for (const name of partnerNames) {
      await connection.execute('DELETE FROM partners WHERE business_name = ?', [name]);
    }
    console.log('   ✅ 기존 신안 파트너 삭제 완료\n');

    // 신안 제휴 파트너 27개소
    const partners = [
      // 1. 숙박 시설 (7개)
      {
        user_id: 1,
        business_name: '소악도 민박',
        contact_name: '소악도민박',
        email: 'soakdo@sinan.com',
        phone: '010-3499-6292',
        business_address: '신안군 증도면 소악길 15',
        services: '숙박,민박',
        description: '침대형 2개와 온돌형 2개로 구성된 소악도 민박. 욕실용품 완비. 조식과 석식 백반식 1만원 제공. 할인: 방4개 전체 예약시 20,000원 할인',
        business_hours: '연중무휴',
        is_featured: 1,
        is_verified: 1,
        is_active: 1,
        tier: 'gold',
        status: 'approved',
        partner_type: 'lodging',
        ...getCoordinates('신안군 증도면 소악길 15')
      },
      {
        user_id: 1,
        business_name: '섬티아 민박',
        contact_name: '섬티아민박',
        email: 'sumtea@sinan.com',
        phone: '010-7113-6151',
        business_address: '신안군 증도면 소악길 19',
        services: '숙박,민박',
        description: '침대형 1개, 온돌형 2개 총 3개 방. 독채형 단독 숙박. 조식(낙지/전복죽 선택) 15,000원, 석식 10,000원. 할인: 방4개 전체 예약시 20,000원 할인',
        business_hours: '연중무휴',
        is_featured: 1,
        is_verified: 1,
        is_active: 1,
        tier: 'gold',
        status: 'approved',
        partner_type: 'lodging',
        ...getCoordinates('신안군 증도면 소악길 19')
      },
      {
        user_id: 1,
        business_name: '파인클라우드',
        contact_name: '파인클라우드',
        email: 'finecloud@sinan.com',
        phone: '010-5255-4178',
        business_address: '신안군 암태면 중부로 2113',
        services: '숙박,독채,카라반',
        description: '독채형 4동, 개별 바비큐장 및 소형 풀장 구비. 욕실용품 완비, 조식 제공(빵+음료). 할인: 숙박비 할인, 숙박 고객 대상 빵+음료 무료 및 입장권 할인',
        business_hours: '연중무휴',
        is_featured: 1,
        is_verified: 1,
        is_active: 1,
        tier: 'gold',
        status: 'approved',
        partner_type: 'lodging',
        ...getCoordinates('신안군 암태면 중부로 2113')
      },
      {
        user_id: 1,
        business_name: '여인송 빌리지',
        contact_name: '여인송빌리지',
        email: 'yeoinsong@sinan.com',
        phone: '010-5455-0771',
        business_address: '신안군 자은면 백산리 883',
        services: '숙박,펜션',
        description: '침대형 4개, 온돌형 4개 총 8개 방. 욕실용품 구비. 체험 할인 적용 가능. 할인: 숙박비 할인',
        business_hours: '연중무휴',
        is_featured: 1,
        is_verified: 1,
        is_active: 1,
        tier: 'silver',
        status: 'approved',
        partner_type: 'lodging',
        ...getCoordinates('신안군 자은면 백산리 883')
      },
      {
        user_id: 1,
        business_name: '노두길 민박',
        contact_name: '노두길민박',
        email: 'nodugil@sinan.com',
        phone: '010-3726-9929',
        business_address: '신안군 증도면 기점길 8-28',
        services: '숙박,민박',
        description: '일반 온돌형 방 4개, 별관 2개(총 6개). 숙박 고객 대상 조식+석식 2식 25,000원 제공. 할인: 20인 이상 단체 시 방 1개 무료 제공',
        business_hours: '연중무휴',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'silver',
        status: 'approved',
        partner_type: 'lodging',
        ...getCoordinates('신안군 증도면 기점길 8-28')
      },
      {
        user_id: 1,
        business_name: '천사바다펜션',
        contact_name: '천사바다펜션',
        email: 'angelsea@sinan.com',
        phone: '010-7654-5107',
        business_address: '신안군 암태면 진작지길 227-2',
        services: '숙박,펜션',
        description: '2~12인 방 구성, 침대형, 공동 바비큐장. 할인: 개인 10% / 단체 비수기 25,000 / 성수기 30,000',
        business_hours: '연중무휴',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'silver',
        status: 'approved',
        partner_type: 'lodging',
        ...getCoordinates('신안군 암태면 진작지길 227-2')
      },
      {
        user_id: 1,
        business_name: '라마다호텔&리조트',
        contact_name: '라마다',
        email: 'ramada@sinan.com',
        phone: '061-988-8888',
        business_address: '신안군 자은면 자은서부1길 163-101',
        services: '숙박,호텔,리조트',
        description: '리조트동/호텔동, 식당·세탁소·노래방·편의점 등 부대시설 완비. 할인: 여행사 단가표 기준 10% 할인',
        business_hours: '연중무휴',
        website: 'www.class-one.co.kr',
        is_featured: 1,
        is_verified: 1,
        is_active: 1,
        tier: 'gold',
        status: 'approved',
        partner_type: 'lodging',
        ...getCoordinates('신안군 자은면 자은서부1길 163-101')
      },

      // 2. 음식점 (13개)
      {
        user_id: 1,
        business_name: '보라해물부대전골',
        contact_name: '보라해물',
        email: 'bora@sinan.com',
        phone: '010-7204-5228',
        business_address: '신안군 암태면 박달로 84',
        services: '음식,맛집',
        description: '최대 232명 수용, 프라이빗룸 2개. 해물부대전골(소/중/대). 할인: 단체(20인) 한 테이블당 생선구이 제공',
        business_hours: '매주 월 휴무; 10:00-14:30',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'silver',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 암태면 박달로 84')
      },
      {
        user_id: 1,
        business_name: '하하호호',
        contact_name: '하하호호',
        email: 'hahahoho@sinan.com',
        phone: '010-3499-6292',
        business_address: '신안군 증도면 소악길 15',
        services: '음식,맛집',
        description: '최대 30명 수용, 바다 전망. 수제호박식혜, 김·굴칼국수 인기. 할인: 식사 시 후식 음료 제공',
        business_hours: '07:30-18:30',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'bronze',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 증도면 소악길 15')
      },
      {
        user_id: 1,
        business_name: '섬티아 식당',
        contact_name: '섬티아식당',
        email: 'sumtea-food@sinan.com',
        phone: '010-7113-6151',
        business_address: '신안군 증도면 소악길 19',
        services: '음식,맛집',
        description: '최대 80명 수용, 백반 및 낙지볶음 등 메인 메뉴 제공. 할인: 식사 시 아메리카노 1,000원 할인',
        business_hours: '09:00-19:00',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'bronze',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 증도면 소악길 19')
      },
      {
        user_id: 1,
        business_name: '신바다 횟집',
        contact_name: '신바다',
        email: 'sinbada@sinan.com',
        phone: '010-5355-1290',
        business_address: '신안군 압해읍 압해로 1848',
        services: '음식,횟집',
        description: '최대 130명 수용, 프라이빗 룸 보유, 낙지요리 전문. 할인: 회덮밥 2,000원 할인',
        business_hours: '격주 월 휴무; 08:30-20:00',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'silver',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 압해읍 압해로 1848')
      },
      {
        user_id: 1,
        business_name: '섬마을 회정식',
        contact_name: '섬마을',
        email: 'island@sinan.com',
        phone: '010-5782-5660',
        business_address: '신안군 압해읍 압해로 1844',
        services: '음식,횟집',
        description: '최대 128명 수용, 2층 구조, 회 한상차림 전문. 할인: 전 메뉴 인당 1,000원 할인',
        business_hours: '매주 수 휴무; 11:00-20:30',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'silver',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 압해읍 압해로 1844')
      },
      {
        user_id: 1,
        business_name: '진번칼국수',
        contact_name: '진번칼국수',
        email: 'jinbun@sinan.com',
        phone: '010-8600-6089',
        business_address: '신안군 안좌면 소곡두리길 319',
        services: '음식,칼국수',
        description: '최대 56명 수용, 전복·낙지 칼국수 대표 메뉴. 할인: 전 메뉴 인당 1,000원 할인',
        business_hours: '08:00-18:00',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'bronze',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 안좌면 소곡두리길 319')
      },
      {
        user_id: 1,
        business_name: '자은신안뻘낙지',
        contact_name: '자은뻘낙지',
        email: 'jaeun-nakji@sinan.com',
        phone: '010-3231-1038',
        business_address: '신안군 자은면 자은서부1길 95',
        services: '음식,낙지요리',
        description: '최대 64명 수용, 자연산 낙지 코스요리. 할인: 전 메뉴 1인 1,000원 할인',
        business_hours: '08:00-22:00',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'bronze',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 자은면 자은서부1길 95')
      },
      {
        user_id: 1,
        business_name: '뻘 땅',
        contact_name: '뻘땅',
        email: 'mud@sinan.com',
        phone: '010-9068-1083',
        business_address: '신안군 자은면 자은서부1길 163-93',
        services: '음식,횟집',
        description: '최대 100명 수용, 회 한상차림·개체굴 인기. 할인: 음료 제공',
        business_hours: '09:00-21:00',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'silver',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 자은면 자은서부1길 163-93')
      },
      {
        user_id: 1,
        business_name: '드림하우스 해원',
        contact_name: '드림하우스',
        email: 'dreamhouse@sinan.com',
        phone: '010-6691-0191',
        business_address: '신안군 압해읍 무지개길 315',
        services: '음식,칼국수,카페',
        description: '시금치칼국수 전문 음식점, 카페 병행 운영. 할인: 54,000원 (6,000원 할인)',
        business_hours: '10:00-18:00 (사전예약)',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'bronze',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 압해읍 무지개길 315')
      },
      {
        user_id: 1,
        business_name: '맛나제',
        contact_name: '맛나제',
        email: 'matnaje@sinan.com',
        phone: '010-8619-4880',
        business_address: '신안군 자은면 중부로 3008',
        services: '음식,정식',
        description: '최대 100명 수용, 오곡정식 대표. 할인: 잡곡정식 2,000원 할인',
        business_hours: '11:00-14:00',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'bronze',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 자은면 중부로 3008')
      },
      {
        user_id: 1,
        business_name: '백길천사횟집',
        contact_name: '백길천사',
        email: 'baekgil@sinan.com',
        phone: '010-5424-8073',
        business_address: '신안군 자은면 자은서부1길 86-12',
        services: '음식,횟집',
        description: '최대 150명 수용, 좌식형 테이블, 자연산 회 한상차림. 할인: 음료 제공',
        business_hours: '월3회 월 휴무; 10:00-21:00',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'silver',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 자은면 자은서부1길 86-12')
      },
      {
        user_id: 1,
        business_name: '신안횟집',
        contact_name: '신안횟집',
        email: 'sinan-raw@sinan.com',
        phone: '010-4015-9592',
        business_address: '신안군 압해읍 압해로 1852-5',
        services: '음식,횟집',
        description: '단체 수용, 테라스 바다뷰 낙지한상차림. 할인: 음료 제공',
        business_hours: '06:00-20:00',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'bronze',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 압해읍 압해로 1852-5')
      },
      {
        user_id: 1,
        business_name: '천사아구찜',
        contact_name: '천사아구찜',
        email: 'angel-agu@sinan.com',
        phone: '0507-1388-7739',
        business_address: '신안군 압해읍 무지개길 321',
        services: '음식,아구찜',
        description: '최대 200명 수용, VIP룸 보유, 아구찜·육회비빔밥 등. 할인: 아구찜 1인 10% 할인',
        business_hours: '매주 월 휴무; 11:00-20:00',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'silver',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 압해읍 무지개길 321')
      },

      // 3. 카페 (6개)
      {
        user_id: 1,
        business_name: '산티아고커피',
        contact_name: '산티아고',
        email: 'santiago@sinan.com',
        phone: '010-5255-4179',
        business_address: '신안군 압해읍 무지개길 321 1층',
        services: '카페,음료',
        description: '바다 조망 테라스 카페, 수제청·디저트 판매. 할인: 음료 10% 할인',
        business_hours: '매주 월 휴무; 11:00-20:00',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'bronze',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 압해읍 무지개길 321')
      },
      {
        user_id: 1,
        business_name: '파인클라우드 카페',
        contact_name: '파인클라우드카페',
        email: 'finecloud-cafe@sinan.com',
        phone: '010-5255-4178',
        business_address: '신안군 암태면 중부로 2113',
        services: '카페,체험',
        description: '커피+소금빵 포함 입장권. 식물원, 동물농장 등 체험 가능. 할인: 입장료 10,000원 (기존 13,000/15,000)',
        business_hours: '연중무휴',
        is_featured: 1,
        is_verified: 1,
        is_active: 1,
        tier: 'silver',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 암태면 중부로 2113')
      },
      {
        user_id: 1,
        business_name: '송공항 1004 카페',
        contact_name: '송공항카페',
        email: 'airport1004@sinan.com',
        phone: '010-5777-9623',
        business_address: '신안군 압해읍 압해로 1852-5 5호',
        services: '카페,베이커리',
        description: '수제 자몽·레몬청, 땅콩빵으로 유명한 카페. 할인: 음료 5% 할인 + 땅콩빵 1개 증정',
        business_hours: '07:30-17:00',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'bronze',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 압해읍 압해로 1852-5')
      },
      {
        user_id: 1,
        business_name: '문카페',
        contact_name: '문카페',
        email: 'mooncafe@sinan.com',
        phone: '010-4001-5774',
        business_address: '신안군 안좌면 소곡두리길 319 2층',
        services: '카페,음료',
        description: '바다 전망 테라스, 건강 주스 3종 대표. 할인: 전 메뉴 10% 할인',
        business_hours: '09:00-22:00',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'bronze',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 안좌면 소곡두리길 319')
      },
      {
        user_id: 1,
        business_name: '천사바다블라썸',
        contact_name: '천사바다블라썸',
        email: 'blossom@sinan.com',
        phone: '010-7654-5107',
        business_address: '신안군 암태면 진작지길 227-2',
        services: '카페,음식',
        description: '식사 및 카페 병행, 수제차·푸른바다소다 인기. 할인: 음료 10% 할인',
        business_hours: '매주 화 휴무; 10:30-18:00',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'bronze',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 암태면 진작지길 227-2')
      },
      {
        user_id: 1,
        business_name: '1004 떡공방',
        contact_name: '떡공방',
        email: 'ricecake@sinan.com',
        phone: '010-5455-0771',
        business_address: '신안군 자은면 백산리 883',
        services: '카페,체험',
        description: '떡·쿠키 만들기 체험 가능 카페. 할인: 5,000원 이상 구매 시 아메리카노 무료 증정',
        business_hours: '연중무휴',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'bronze',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 자은면 백산리 883')
      },

      // 4. 투어/체험 (1개)
      {
        user_id: 1,
        business_name: '1004 요트',
        contact_name: '1004요트',
        email: 'yacht@sinan.com',
        phone: '010-9629-1880',
        business_address: '신안군 암태면 박달로 9',
        services: '투어,요트,체험',
        description: '일반/선셋 투어 운영, 최소 20명 출발. 할인: 60분 투어 20,000원 이용권',
        business_hours: '매주 월 휴무; 10:00-18:30',
        website: 'http://www.1004yacht.com/',
        is_featured: 1,
        is_verified: 1,
        is_active: 1,
        tier: 'gold',
        status: 'approved',
        partner_type: 'general',
        ...getCoordinates('신안군 암태면 박달로 9')
      }
    ];

    // 파트너 추가
    let addedCount = 0;
    for (const partner of partners) {
      try {
        await connection.execute(
          `INSERT INTO partners
          (user_id, business_name, contact_name, email, phone, business_address, lat, lng, services, description, business_hours, website, is_featured, is_verified, is_active, tier, status, partner_type, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            partner.user_id,
            partner.business_name,
            partner.contact_name,
            partner.email,
            partner.phone,
            partner.business_address,
            partner.lat,
            partner.lng,
            partner.services,
            partner.description,
            partner.business_hours || null,
            partner.website || null,
            partner.is_featured,
            partner.is_verified,
            partner.is_active,
            partner.tier,
            partner.status,
            partner.partner_type
          ]
        );
        addedCount++;
        console.log(`   ✅ [${addedCount}/27] ${partner.business_name} - ${partner.services}`);
      } catch (error: any) {
        console.error(`   ❌ ${partner.business_name} 추가 실패:`, error.message);
      }
    }

    console.log('\n🎉 신안 제휴 파트너 추가 완료!');
    console.log(`✅ 총 ${addedCount}개 파트너 추가됨`);
    console.log('\n📊 카테고리별 분류:');
    console.log('   - 숙박: 7개 (민박, 펜션, 호텔, 리조트 등)');
    console.log('   - 음식: 13개 (횟집, 칼국수, 낙지요리, 백반 등)');
    console.log('   - 카페: 6개 (커피, 음료, 베이커리, 체험 등)');
    console.log('   - 투어: 1개 (요트 투어)');
    console.log('\n가맹점 페이지에서 확인해보세요: http://localhost:5173/partners\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

addSinanPartners();
