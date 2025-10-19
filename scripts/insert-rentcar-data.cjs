/**
 * 렌트카 데이터 대량 삽입 스크립트
 * CSV 형식의 차량 데이터를 DB에 삽입합니다
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// 한글 → 영어 매핑 함수
function mapVehicleClass(korClass) {
  const mapping = {
    '경형': 'mini',
    '소형': 'economy',
    '준중형': 'compact',
    '중형': 'midsize',
    '대형': 'fullsize',
    'SUV': 'suv',
    '소형SUV': 'compact_suv',
    '대형SUV': 'fullsize_suv',
    '승합': 'van',
    '수입중형': 'luxury_sedan'
  };
  return mapping[korClass] || 'midsize';
}

function mapTransmission(korTrans) {
  return korTrans === '자동' ? 'automatic' : 'manual';
}

function mapFuelType(korFuel) {
  const mapping = {
    '가솔린': 'gasoline',
    '디젤': 'diesel',
    '전기': 'electric',
    '하이브리드': 'hybrid',
    'LPG': 'lpg',
    '수소': 'hydrogen'
  };
  return mapping[korFuel] || 'gasoline';
}

const FIRST_BATCH = [
  {
    vendor_name: "신안 렌터카",
    display_name: "현대 아반떼 2024",
    brand: "현대",
    model: "아반떼",
    year: 2024,
    vehicle_class: "준중형",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "가솔린",
    daily_rate_krw: 45000,
    weekly_rate_krw: 270000,
    monthly_rate_krw: 1125000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 100,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "기아 K5 2024",
    brand: "기아",
    model: "K5",
    year: 2024,
    vehicle_class: "중형",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "가솔린",
    daily_rate_krw: 55000,
    weekly_rate_krw: 330000,
    monthly_rate_krw: 1375000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 100,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800",
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라, 열선시트",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "현대 쏘나타 하이브리드 2024",
    brand: "현대",
    model: "쏘나타 하이브리드",
    year: 2024,
    vehicle_class: "중형",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "하이브리드",
    daily_rate_krw: 58000,
    weekly_rate_krw: 348000,
    monthly_rate_krw: 1450000,
    mileage_limit_km: 250,
    excess_mileage_fee_krw: 100,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800",
      "https://images.unsplash.com/photo-1583267746897-c554f8e6c9e2?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라, 스마트크루즈, 차선유지",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "현대 투싼 2024",
    brand: "현대",
    model: "투싼",
    year: 2024,
    vehicle_class: "SUV",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "디젤",
    daily_rate_krw: 68000,
    weekly_rate_krw: 408000,
    monthly_rate_krw: 1700000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 150,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800",
      "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라, 파노라마 선루프",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "기아 스포티지 2024",
    brand: "기아",
    model: "스포티지",
    year: 2024,
    vehicle_class: "SUV",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "하이브리드",
    daily_rate_krw: 72000,
    weekly_rate_krw: 432000,
    monthly_rate_krw: 1800000,
    mileage_limit_km: 220,
    excess_mileage_fee_krw: 150,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1611859266238-4b98091d9d9b?w=800",
      "https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라, 전방충돌방지",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "현대 싼타페 2024",
    brand: "현대",
    model: "싼타페",
    year: 2024,
    vehicle_class: "SUV",
    seating_capacity: 7,
    transmission_type: "자동",
    fuel_type: "디젤",
    daily_rate_krw: 85000,
    weekly_rate_krw: 510000,
    monthly_rate_krw: 2125000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 150,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1609097260671-af3810b62e63?w=800",
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라, 파노라마 선루프, 3열시트",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "기아 카니발 2024",
    brand: "기아",
    model: "카니발",
    year: 2024,
    vehicle_class: "승합",
    seating_capacity: 11,
    transmission_type: "자동",
    fuel_type: "디젤",
    daily_rate_krw: 95000,
    weekly_rate_krw: 570000,
    monthly_rate_krw: 2375000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 200,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1622548416811-8c1c8a92e9b2?w=800",
      "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라, 11인승, 전동슬라이딩도어",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "현대 아이오닉5 2024",
    brand: "현대",
    model: "아이오닉5",
    year: 2024,
    vehicle_class: "SUV",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "전기",
    daily_rate_krw: 78000,
    weekly_rate_krw: 468000,
    monthly_rate_krw: 1950000,
    mileage_limit_km: 250,
    excess_mileage_fee_krw: 120,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800",
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상, 배터리보험",
    available_options: "GPS, 블랙박스, 후방카메라, 급속충전, V2L",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "기아 EV6 2024",
    brand: "기아",
    model: "EV6",
    year: 2024,
    vehicle_class: "SUV",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "전기",
    daily_rate_krw: 82000,
    weekly_rate_krw: 492000,
    monthly_rate_krw: 2050000,
    mileage_limit_km: 250,
    excess_mileage_fee_krw: 120,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1617886322207-897a0e976229?w=800",
      "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상, 배터리보험",
    available_options: "GPS, 블랙박스, 후방카메라, 급속충전, HDA2",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "제네시스 G70 2024",
    brand: "제네시스",
    model: "G70",
    year: 2024,
    vehicle_class: "중형",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "가솔린",
    daily_rate_krw: 95000,
    weekly_rate_krw: 570000,
    monthly_rate_krw: 2375000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 150,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
      "https://images.unsplash.com/photo-1614200187524-dc4b892acf16?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상, 고급차량특약",
    available_options: "GPS, 블랙박스, 후방카메라, 프리미엄 오디오, 통풍시트",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "제네시스 GV70 2024",
    brand: "제네시스",
    model: "GV70",
    year: 2024,
    vehicle_class: "SUV",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "디젤",
    daily_rate_krw: 105000,
    weekly_rate_krw: 630000,
    monthly_rate_krw: 2625000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 150,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1618843479619-f3d0d3e8e729?w=800",
      "https://images.unsplash.com/photo-1617654112368-307921291f42?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상, 고급차량특약",
    available_options: "GPS, 블랙박스, 후방카메라, 파노라마 선루프, HUD",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "쌍용 토레스 2024",
    brand: "쌍용",
    model: "토레스",
    year: 2024,
    vehicle_class: "SUV",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "가솔린",
    daily_rate_krw: 62000,
    weekly_rate_krw: 372000,
    monthly_rate_krw: 1550000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 120,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800",
      "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  }
];

const SECOND_BATCH = [
  {
    vendor_name: "신안 렌터카",
    display_name: "현대 그랜저 2024",
    brand: "현대",
    model: "그랜저",
    year: 2024,
    vehicle_class: "대형",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "가솔린",
    daily_rate_krw: 88000,
    weekly_rate_krw: 528000,
    monthly_rate_krw: 2200000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 150,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=800",
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라, 통풍시트, 프리미엄 사운드",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "기아 K8 2024",
    brand: "기아",
    model: "K8",
    year: 2024,
    vehicle_class: "대형",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "가솔린",
    daily_rate_krw: 86000,
    weekly_rate_krw: 516000,
    monthly_rate_krw: 2150000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 150,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라, 열선시트, HUD",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "르노 SM6 2024",
    brand: "르노",
    model: "SM6",
    year: 2024,
    vehicle_class: "중형",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "가솔린",
    daily_rate_krw: 52000,
    weekly_rate_krw: 312000,
    monthly_rate_krw: 1300000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 100,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "쉐보레 말리부 2024",
    brand: "쉐보레",
    model: "말리부",
    year: 2024,
    vehicle_class: "중형",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "가솔린",
    daily_rate_krw: 54000,
    weekly_rate_krw: 324000,
    monthly_rate_krw: 1350000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 100,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1583267746897-c554f8e6c9e2?w=800",
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라, 열선시트",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "현대 코나 2024",
    brand: "현대",
    model: "코나",
    year: 2024,
    vehicle_class: "소형SUV",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "가솔린",
    daily_rate_krw: 48000,
    weekly_rate_krw: 288000,
    monthly_rate_krw: 1200000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 100,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800",
      "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "기아 셀토스 2024",
    brand: "기아",
    model: "셀토스",
    year: 2024,
    vehicle_class: "소형SUV",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "가솔린",
    daily_rate_krw: 50000,
    weekly_rate_krw: 300000,
    monthly_rate_krw: 1250000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 100,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1611859266238-4b98091d9d9b?w=800",
      "https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "현대 팰리세이드 2024",
    brand: "현대",
    model: "팰리세이드",
    year: 2024,
    vehicle_class: "대형SUV",
    seating_capacity: 8,
    transmission_type: "자동",
    fuel_type: "디젤",
    daily_rate_krw: 98000,
    weekly_rate_krw: 588000,
    monthly_rate_krw: 2450000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 150,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1609097260671-af3810b62e63?w=800",
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라, 파노라마 선루프, 3열시트, 통풍시트",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "기아 모하비 2024",
    brand: "기아",
    model: "모하비",
    year: 2024,
    vehicle_class: "대형SUV",
    seating_capacity: 7,
    transmission_type: "자동",
    fuel_type: "디젤",
    daily_rate_krw: 92000,
    weekly_rate_krw: 552000,
    monthly_rate_krw: 2300000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 150,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800",
      "https://images.unsplash.com/photo-1611859266238-4b98091d9d9b?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상",
    available_options: "GPS, 블랙박스, 후방카메라, 7인승",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "현대 넥쏘 2024",
    brand: "현대",
    model: "넥쏘",
    year: 2024,
    vehicle_class: "SUV",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "수소",
    daily_rate_krw: 88000,
    weekly_rate_krw: 528000,
    monthly_rate_krw: 2200000,
    mileage_limit_km: 300,
    excess_mileage_fee_krw: 150,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800",
      "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상, 수소차량특약",
    available_options: "GPS, 블랙박스, 후방카메라, 공기청정, HDA",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "제네시스 G80 2024",
    brand: "제네시스",
    model: "G80",
    year: 2024,
    vehicle_class: "대형",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "가솔린",
    daily_rate_krw: 125000,
    weekly_rate_krw: 750000,
    monthly_rate_krw: 3125000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 200,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800",
      "https://images.unsplash.com/photo-1614200187524-dc4b892acf16?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상, 고급차량특약",
    available_options: "GPS, 블랙박스, 후방카메라, 프리미엄 오디오, 통풍시트, HUD",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "제네시스 GV80 2024",
    brand: "제네시스",
    model: "GV80",
    year: 2024,
    vehicle_class: "대형SUV",
    seating_capacity: 7,
    transmission_type: "자동",
    fuel_type: "디젤",
    daily_rate_krw: 135000,
    weekly_rate_krw: 810000,
    monthly_rate_krw: 3375000,
    mileage_limit_km: 200,
    excess_mileage_fee_krw: 200,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1618843479619-f3d0d3e8e729?w=800",
      "https://images.unsplash.com/photo-1617654112368-307921291f42?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상, 고급차량특약",
    available_options: "GPS, 블랙박스, 후방카메라, 파노라마 선루프, HUD, 3D 계기판",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  },
  {
    vendor_name: "신안 렌터카",
    display_name: "BMW 3시리즈 2024",
    brand: "BMW",
    model: "3시리즈",
    year: 2024,
    vehicle_class: "수입중형",
    seating_capacity: 5,
    transmission_type: "자동",
    fuel_type: "가솔린",
    daily_rate_krw: 145000,
    weekly_rate_krw: 870000,
    monthly_rate_krw: 3625000,
    mileage_limit_km: 150,
    excess_mileage_fee_krw: 250,
    images: JSON.stringify([
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800",
      "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800"
    ]),
    is_available: 1,
    insurance_included: 1,
    insurance_options: "자차손해보험(CDW), 대인배상Ⅰ, 대물배상, 수입차특약",
    available_options: "GPS, 블랙박스, 후방카메라, 하만카돈 사운드, 통풍시트",
    pickup_location: "신안군 압해읍 렌터카 본점",
    dropoff_location: "신안군 압해읍 렌터카 본점",
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: 1
  }
];

async function insertRentcarData() {
  let connection;

  try {
    console.log('🔌 데이터베이스 연결 중...');
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'aws.connect.psdb.cloud',
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: {
        rejectUnauthorized: true
      }
    });

    console.log('✅ 데이터베이스 연결 성공!');

    // 1. 렌터카 벤더 생성 또는 가져오기
    console.log('\n📋 렌터카 벤더 확인 중...');

    // business_number로 기존 벤더 찾기
    const [vendors] = await connection.execute(
      `SELECT id, business_name FROM rentcar_vendors WHERE business_number = ? LIMIT 1`,
      ['123-45-67890']
    );

    let vendorId;
    if (vendors.length > 0) {
      vendorId = vendors[0].id;
      console.log(`✅ 기존 벤더 사용: "${vendors[0].business_name}" (ID: ${vendorId})`);
    } else {
      // 없으면 business_name으로 찾기
      const [vendorsByName] = await connection.execute(
        `SELECT id FROM rentcar_vendors WHERE business_name LIKE ? LIMIT 1`,
        ['%신안%렌터카%']
      );

      if (vendorsByName.length > 0) {
        vendorId = vendorsByName[0].id;
        console.log(`✅ 기존 벤더 사용 (이름 검색): ID ${vendorId}`);
      } else {
        // 정말 없으면 새로 생성
        const [result] = await connection.execute(
          `INSERT INTO rentcar_vendors (
            vendor_code, business_name, brand_name, business_number, contact_name,
            contact_email, contact_phone, status, commission_rate, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            'SHINAN_001',
            '신안 렌터카',
            '신안 렌터카',
            '123-45-67890',
            '김렌터',
            'rentcar@shinan.com',
            '010-1234-5678',
            'active',
            15.0
          ]
        );
        vendorId = result.insertId;
        console.log(`✅ 새 벤더 생성: ID ${vendorId}`);
      }
    }

    // 2. 렌트카 카테고리 ID 가져오기
    const [categories] = await connection.execute(
      `SELECT id FROM categories WHERE slug = 'rentcar' LIMIT 1`
    );
    const categoryId = categories[0]?.id || 5;

    // 3. 첫 번째 배치 (12대) 삽입
    console.log('\n📦 첫 번째 배치 (12대) 삽입 중...');
    for (let i = 0; i < FIRST_BATCH.length; i++) {
      const vehicle = FIRST_BATCH[i];

      // 차량 코드 생성 (VENDOR_MODEL_YEAR_INDEX)
      const vehicleCode = `V${vendorId}_${vehicle.brand.substring(0,3).toUpperCase()}_${vehicle.year}_${String(i+1).padStart(3, '0')}`;

      // rentcar_vehicles 테이블에 삽입 (실제 스키마에 맞춤 + 영어 매핑)
      const [vehicleResult] = await connection.execute(
        `INSERT INTO rentcar_vehicles (
          vendor_id, vehicle_code, brand, model, year, display_name, vehicle_class,
          fuel_type, transmission, seating_capacity, images, daily_rate_krw,
          mileage_limit_per_day, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          vendorId, vehicleCode, vehicle.brand, vehicle.model, vehicle.year, vehicle.display_name,
          mapVehicleClass(vehicle.vehicle_class), mapFuelType(vehicle.fuel_type), mapTransmission(vehicle.transmission_type),
          vehicle.seating_capacity, vehicle.images, vehicle.daily_rate_krw,
          vehicle.mileage_limit_km, vehicle.is_available
        ]
      );

      // listings 테이블 삽입 생략 (rentcar_vehicles만 사용)
      // await connection.execute(...);

      console.log(`  ✓ ${i + 1}. ${vehicle.display_name} (${vehicleCode}) 등록 완료`);
    }

    console.log(`\n✅ 첫 번째 배치 ${FIRST_BATCH.length}대 삽입 완료!`);

    // 4. 두 번째 배치 (12대) 삽입
    console.log('\n📦 두 번째 배치 (12대) 삽입 중...');
    for (let i = 0; i < SECOND_BATCH.length; i++) {
      const vehicle = SECOND_BATCH[i];

      // 차량 코드 생성 (VENDOR_MODEL_YEAR_INDEX)
      const vehicleCode = `V${vendorId}_${vehicle.brand.substring(0,3).toUpperCase()}_${vehicle.year}_${String(i+1).padStart(3, '0')}`;

      // rentcar_vehicles 테이블에 삽입 (실제 스키마에 맞춤 + 영어 매핑)
      const [vehicleResult] = await connection.execute(
        `INSERT INTO rentcar_vehicles (
          vendor_id, vehicle_code, brand, model, year, display_name, vehicle_class,
          fuel_type, transmission, seating_capacity, images, daily_rate_krw,
          mileage_limit_per_day, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          vendorId, vehicleCode, vehicle.brand, vehicle.model, vehicle.year, vehicle.display_name,
          mapVehicleClass(vehicle.vehicle_class), mapFuelType(vehicle.fuel_type), mapTransmission(vehicle.transmission_type),
          vehicle.seating_capacity, vehicle.images, vehicle.daily_rate_krw,
          vehicle.mileage_limit_km, vehicle.is_available
        ]
      );

      // listings 테이블 삽입 생략 (rentcar_vehicles만 사용)
      // await connection.execute(...);

      console.log(`  ✓ ${i + 1}. ${vehicle.display_name} (${vehicleCode}) 등록 완료`);
    }

    console.log(`\n✅ 두 번째 배치 ${SECOND_BATCH.length}대 삽입 완료!`);

    console.log(`\n🎉 총 ${FIRST_BATCH.length + SECOND_BATCH.length}대의 차량이 성공적으로 등록되었습니다!`);
    console.log(`\n📊 등록 요약:`);
    console.log(`   - 벤더: 신안 렌터카 (ID: ${vendorId})`);
    console.log(`   - 첫 번째 배치: ${FIRST_BATCH.length}대`);
    console.log(`   - 두 번째 배치: ${SECOND_BATCH.length}대`);
    console.log(`   - 총 차량: ${FIRST_BATCH.length + SECOND_BATCH.length}대`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
insertRentcarData()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
