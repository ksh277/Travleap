import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Star, MapPin, Clock, Gift, Sparkles, Heart, Zap } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Users } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatPrice, t } from '../utils/translations';
import { api, type TravelItem } from '../utils/api';
import type { Category } from '../types/database';

interface HomePageProps {
  selectedCurrency?: string;
  selectedLanguage?: string;
}

export function HomePage({ selectedCurrency = 'KRW', selectedLanguage = 'ko' }: HomePageProps) {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [guestCounts, setGuestCounts] = useState({
    rooms: 1,
    adults: 1,
    children: 0
  });

  // 새로운 상태 추가
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredListings, setFeaturedListings] = useState<TravelItem[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 샘플 카테고리 데이터
        const sampleCategories: Category[] = [
          { id: 1, slug: 'tour', name_ko: '투어', icon: '🎯', sort_order: 1, is_active: true },
          { id: 2, slug: 'stay', name_ko: '숙박', icon: '🏨', sort_order: 2, is_active: true },
          { id: 3, slug: 'food', name_ko: '음식', icon: '🍽️', sort_order: 3, is_active: true },
          { id: 4, slug: 'attraction', name_ko: '관광지', icon: '🏛️', sort_order: 4, is_active: true },
          { id: 5, slug: 'experience', name_ko: '체험', icon: '🎨', sort_order: 5, is_active: true },
          { id: 6, slug: 'rental', name_ko: '렌트카', icon: '🚗', sort_order: 6, is_active: true }
        ];

        // 리뷰 데이터 (실제로는 DB에서 가져와야 함)
        const reviewsData = [
          { product_id: 1, rating: 5, user_name: '김민지' },
          { product_id: 1, rating: 5, user_name: '정유진' },
          { product_id: 2, rating: 5, user_name: '이수연' },
          { product_id: 2, rating: 4, user_name: '임지호' },
          { product_id: 3, rating: 4, user_name: '최동하' },
          { product_id: 3, rating: 4, user_name: '박소영' },
          { product_id: 3, rating: 5, user_name: '강민수' },
          { product_id: 4, rating: 4, user_name: '윤서진' },
          { product_id: 5, rating: 5, user_name: '김태현' },
          { product_id: 5, rating: 4, user_name: '이지은' },
          { product_id: 6, rating: 4, user_name: '박준혁' },
          { product_id: 7, rating: 5, user_name: '최수빈' },
          { product_id: 8, rating: 4, user_name: '정민호' },
          { product_id: 9, rating: 5, user_name: '한지원' },
          { product_id: 10, rating: 4, user_name: '김영진' },
          { product_id: 11, rating: 5, user_name: '박세연' },
          { product_id: 12, rating: 4, user_name: '박정훈' },
          { product_id: 12, rating: 3, user_name: '한지민' },
          { product_id: 13, rating: 5, user_name: '이현우' },
          { product_id: 14, rating: 4, user_name: '송민정' },
          { product_id: 15, rating: 5, user_name: '김도현' },
          { product_id: 16, rating: 5, user_name: '장예린' },
          { product_id: 17, rating: 4, user_name: '오승헌' },
          { product_id: 18, rating: 4, user_name: '신유라' },
          { product_id: 19, rating: 5, user_name: '홍민석' },
          { product_id: 20, rating: 4, user_name: '백지혜' }
        ];

        // 각 상품의 리뷰 점수 계산
        const calculateProductRating = (productId: number) => {
          const productReviews = reviewsData.filter(review => review.product_id === productId);
          if (productReviews.length === 0) return { rating_avg: 0, rating_count: 0 };

          const totalRating = productReviews.reduce((sum, review) => sum + review.rating, 0);
          const rating_avg = Number((totalRating / productReviews.length).toFixed(1));
          const rating_count = productReviews.length;

          return { rating_avg, rating_count };
        };

        // 신안군 여행 상품 20가지 샘플 데이터
        const sampleListings: TravelItem[] = [
          {
            id: 1,
            title: '신안 퍼플섬 투어',
            category: 'tour',
            category_id: 1,
            price_from: 45000,
            price_to: 65000,
            location: '신안군 안좌면',
            ...calculateProductRating(1),
            duration: '3시간',
            max_capacity: 20,
            images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'],
            short_description: '보라색으로 물든 아름다운 퍼플섬에서의 특별한 투어 체험',
            description_md: '신안군 안좌면에 위치한 퍼플섬은 온 마을이 보라색으로 꾸며진 독특한 관광지입니다. 아름다운 바다와 어우러진 보라색 마을의 풍경을 감상하며 특별한 추억을 만들어보세요.',
            features: ['전문 가이드', '기념품 제공', '포토존 운영'],
            included_items: ['가이드 투어', '기념품', '보험'],
            excluded_items: ['개인 용품', '추가 음료'],
            policies: ['1일 전 무료 취소', '전 연령 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '퍼플섬관광협회',
              tier: 'gold',
              is_verified: true
            }
          },
          {
            id: 2,
            title: '증도 천일염 체험',
            category: 'experience',
            category_id: 5,
            price_from: 25000,
            price_to: 35000,
            location: '신안군 증도면',
            ...calculateProductRating(2),
            duration: '2시간',
            max_capacity: 15,
            images: ['https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop'],
            short_description: '전통 염전에서 직접 소금을 만들어보는 특별한 체험',
            description_md: '증도의 유네스코 생물권보전지역에서 천일염을 직접 만들어보는 체험입니다. 전통 염전의 역사와 소금 제조 과정을 배우며 직접 소금을 채취해볼 수 있습니다.',
            features: ['체험 키트 제공', '기념품 증정', '전문 해설사'],
            included_items: ['체험비', '기념품', '안전장비', '간식'],
            excluded_items: ['교통비', '식사'],
            policies: ['우천시 실내 체험 가능', '당일 취소 불가'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '증도염전체험장',
              tier: 'silver',
              is_verified: true
            }
          },
          {
            id: 3,
            title: '홍도 서해 최고 절경 투어',
            category: 'tour',
            category_id: 1,
            price_from: 55000,
            price_to: 75000,
            location: '신안군 흑산면 홍도리',
            rating_avg: 4.9,
            rating_count: 203,
            duration: '4시간',
            max_capacity: 25,
            images: ['https://images.unsplash.com/photo-1464822759880-4601b726be04?w=400&h=300&fit=crop'],
            short_description: '서해의 보석 홍도에서 만나는 기암괴석과 절경 투어',
            description_md: '홍도는 서해의 보석이라 불리는 아름다운 섬입니다. 33개의 기암괴석과 원시림이 어우러진 천혜의 절경을 유람선을 타고 감상할 수 있습니다.',
            features: ['유람선 투어', '전문 가이드', '사진 촬영 서비스'],
            included_items: ['유람선 탑승료', '가이드', '보험', '음료'],
            excluded_items: ['개인 용품', '점심식사'],
            policies: ['기상 악화시 취소 가능', '전 연령 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '홍도관광',
              tier: 'gold',
              is_verified: true
            }
          },
          {
            id: 4,
            title: '임자도 대광해수욕장 펜션',
            category: 'stay',
            category_id: 2,
            price_from: 120000,
            price_to: 200000,
            location: '신안군 임자면',
            rating_avg: 4.7,
            rating_count: 145,
            duration: '1박',
            max_capacity: 6,
            images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop'],
            short_description: '12km 백사장이 펼쳐진 대광해수욕장 바로 앞 오션뷰 펜션',
            description_md: '임자도 대광해수욕장 바로 앞에 위치한 오션뷰 펜션입니다. 넓은 백사장과 에메랄드빛 바다를 바로 앞에서 즐길 수 있는 최고의 위치입니다.',
            features: ['오션뷰', '독채 펜션', '바베큐장', '무료 주차'],
            included_items: ['조식', '무료 WiFi', '주차', '해변 이용'],
            excluded_items: ['저녁식사', '바베큐 도구 대여'],
            policies: ['3일 전 무료 취소', '전 연령 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '임자도 오션뷰펜션',
              tier: 'silver',
              is_verified: true
            }
          },
          {
            id: 5,
            title: '신안 전통 젓갈 맛집',
            category: 'food',
            category_id: 3,
            price_from: 25000,
            price_to: 45000,
            location: '신안군 지도읍',
            rating_avg: 4.9,
            rating_count: 234,
            duration: '1시간',
            max_capacity: 50,
            images: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop'],
            short_description: '3대째 이어져 내려오는 전통 젓갈과 신선한 해산물 요리',
            description_md: '신안군 지도읍에서 3대째 운영되고 있는 전통 젓갈 전문점입니다. 신안 근해에서 잡은 신선한 해산물로 만든 젓갈과 다양한 해산물 요리를 맛보실 수 있습니다.',
            features: ['전통 젓갈', '신선한 해산물', '현지 특산물'],
            included_items: ['젓갈 시식', '기본 반찬', '김치'],
            excluded_items: ['주류', '추가 요리'],
            policies: ['당일 취소 불가', '전 연령 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '신안전통음식점',
              tier: 'gold',
              is_verified: true
            }
          },
          {
            id: 6,
            title: '흑산도 상라봉 트레킹',
            category: 'tour',
            category_id: 1,
            price_from: 50000,
            price_to: 70000,
            location: '신안군 흑산면',
            rating_avg: 4.6,
            rating_count: 112,
            duration: '5시간',
            max_capacity: 15,
            images: ['https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop'],
            short_description: '흑산도 최고봉에서 바라보는 서해의 장관과 트레킹의 즐거움',
            description_md: '흑산도의 최고봉인 상라봉(227m)을 오르는 트레킹 코스입니다. 정상에서 바라보는 서해의 장관과 흑산도의 아름다운 자연을 만끽할 수 있습니다.',
            features: ['전문 가이드', '안전 장비', '정상 인증샷'],
            included_items: ['가이드', '안전 장비', '간식', '보험'],
            excluded_items: ['개인 장비', '점심식사'],
            policies: ['2일 전 무료 취소', '10세 이상 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '흑산도트레킹협회',
              tier: 'bronze',
              is_verified: true
            }
          },
          {
            id: 7,
            title: '자은도 분계해수욕장 캠핑',
            category: 'stay',
            category_id: 2,
            price_from: 35000,
            price_to: 55000,
            location: '신안군 자은면',
            rating_avg: 4.5,
            rating_count: 98,
            duration: '1박',
            max_capacity: 4,
            images: ['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop'],
            short_description: '분계해수욕장에서 즐기는 해변 캠핑의 낭만',
            description_md: '자은도 분계해수욕장에서 즐기는 해변 캠핑입니다. 맑은 바다와 고운 모래사장, 그리고 아름다운 일몰을 텐트에서 바로 감상할 수 있습니다.',
            features: ['해변 캠핑', '일몰 명소', '캠핑 장비 대여'],
            included_items: ['캠핑장 이용료', '샤워시설', '화장실', '주차'],
            excluded_items: ['텐트 대여', '캠핑 도구', '식사'],
            policies: ['우천시 환불 가능', '성인만 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '분계해수욕장캠핑장',
              tier: 'bronze',
              is_verified: true
            }
          },
          {
            id: 8,
            title: '압해도 전어회 맛집',
            category: 'food',
            category_id: 3,
            price_from: 35000,
            price_to: 55000,
            location: '신안군 압해읍',
            rating_avg: 4.8,
            rating_count: 167,
            duration: '1시간',
            max_capacity: 40,
            images: ['https://images.unsplash.com/photo-1563379091339-03246968d4d6?w=400&h=300&fit=crop'],
            short_description: '가을 전어의 진미를 맛볼 수 있는 압해도 대표 맛집',
            description_md: '압해도에서 잡은 싱싱한 전어로 만든 전어회와 전어구이를 맛볼 수 있는 맛집입니다. 가을 전어의 고소하고 담백한 맛을 제대로 느껴보세요.',
            features: ['현지 전어', '계절 메뉴', '바다뷰 식당'],
            included_items: ['전어회', '기본 반찬', '된장국'],
            excluded_items: ['주류', '추가 메뉴'],
            policies: ['당일 취소 불가', '전 연령 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '압해도전어마을',
              tier: 'silver',
              is_verified: true
            }
          },
          {
            id: 9,
            title: '도초도 슬로시티 힐링투어',
            category: 'tour',
            category_id: 1,
            price_from: 40000,
            price_to: 60000,
            location: '신안군 도초면',
            rating_avg: 4.7,
            rating_count: 134,
            duration: '4시간',
            max_capacity: 20,
            images: ['https://images.unsplash.com/photo-1682687982107-14492010e05e?w=400&h=300&fit=crop'],
            short_description: '아시아 최초 슬로시티 도초도에서 만나는 느린 여행의 진미',
            description_md: '아시아 최초로 슬로시티로 인증받은 도초도에서 느린 여행의 참맛을 경험해보세요. 천천히 걸으며 자연과 하나되는 힐링 투어입니다.',
            features: ['슬로시티 투어', '자연 체험', '힐링 프로그램'],
            included_items: ['가이드', '체험비', '간식', '보험'],
            excluded_items: ['개인 용품', '점심식사'],
            policies: ['1일 전 무료 취소', '전 연령 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '도초슬로시티협회',
              tier: 'gold',
              is_verified: true
            }
          },
          {
            id: 10,
            title: '비금도 원평해수욕장 글램핑',
            category: 'stay',
            category_id: 2,
            price_from: 150000,
            price_to: 250000,
            location: '신안군 비금면',
            rating_avg: 4.8,
            rating_count: 92,
            duration: '1박',
            max_capacity: 4,
            images: ['https://images.unsplash.com/photo-1517824806704-9040b037703b?w=400&h=300&fit=crop'],
            short_description: '원평해수욕장의 아름다운 일몰을 감상할 수 있는 럭셔리 글램핑',
            description_md: '비금도 원평해수욕장에서 즐기는 프리미엄 글램핑입니다. 넓은 백사장과 아름다운 일몰을 바라보며 특별한 하룻밤을 보내세요.',
            features: ['오션뷰', '럭셔리 텐트', '바베큐 시설', '일몰 명소'],
            included_items: ['숙박', '조식', '바베큐 세트', '와이파이'],
            excluded_items: ['저녁식사', '개인 용품'],
            policies: ['2일 전 무료 취소', '전 연령 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '비금도글램핑리조트',
              tier: 'gold',
              is_verified: true
            }
          },
          {
            id: 11,
            title: '장산도 갯벌체험 & 바지락 캐기',
            category: 'experience',
            category_id: 5,
            price_from: 20000,
            price_to: 30000,
            location: '신안군 장산면',
            rating_avg: 4.5,
            rating_count: 76,
            duration: '2시간',
            max_capacity: 25,
            images: ['https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400&h=300&fit=crop'],
            short_description: '신안 갯벌에서 직접 바지락을 캐며 자연을 체험하는 특별한 시간',
            description_md: '장산도의 넓은 갯벌에서 바지락 캐기 체험을 해보세요. 갯벌 생태계를 배우고 직접 잡은 바지락을 가져갈 수 있습니다.',
            features: ['갯벌 체험', '바지락 캐기', '생태 교육'],
            included_items: ['체험비', '도구 대여', '안전장비', '수확물'],
            excluded_items: ['교통비', '식사'],
            policies: ['날씨에 따라 취소 가능', '5세 이상 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '장산갯벌체험센터',
              tier: 'bronze',
              is_verified: true
            }
          },
          {
            id: 12,
            title: '신의도 해상펜션 & 낚시투어',
            category: 'stay',
            category_id: 2,
            price_from: 80000,
            price_to: 120000,
            location: '신안군 지도읍 신의도',
            rating_avg: 4.6,
            rating_count: 158,
            duration: '1박',
            max_capacity: 6,
            images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop'],
            short_description: '바다 위 펜션에서 즐기는 낚시와 바다 전망의 완벽한 조화',
            description_md: '신의도 해상펜션에서 바다 위의 특별한 숙박을 경험하세요. 펜션에서 바로 낚시를 할 수 있고 신선한 회를 맛볼 수 있습니다.',
            features: ['해상펜션', '낚시 체험', '바다뷰', '신선한 회'],
            included_items: ['숙박', '낚시 도구', '미끼', '와이파이'],
            excluded_items: ['식사', '낚시 라이센스'],
            policies: ['기상 악화시 환불 가능', '성인만 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '신의도해상펜션',
              tier: 'silver',
              is_verified: true
            }
          },
          {
            id: 13,
            title: '안좌도 향토음식 체험관',
            category: 'food',
            category_id: 3,
            price_from: 30000,
            price_to: 50000,
            location: '신안군 안좌면',
            rating_avg: 4.8,
            rating_count: 201,
            duration: '2시간',
            max_capacity: 30,
            images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop'],
            short_description: '안좌도 할머니들이 직접 만드는 전통 향토음식 체험과 시식',
            description_md: '안좌도에서 3대째 전해내려오는 전통 요리법으로 만드는 향토음식을 직접 체험해보세요. 할머니들의 손맛을 배울 수 있는 특별한 시간입니다.',
            features: ['전통 요리', '할머니 레시피', '체험 프로그램'],
            included_items: ['체험비', '재료', '시식', '레시피북'],
            excluded_items: ['개인 용품', '추가 음식'],
            policies: ['당일 취소 불가', '전 연령 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '안좌향토음식체험관',
              tier: 'gold',
              is_verified: true
            }
          },
          {
            id: 14,
            title: '팔금도 바다목장 투어',
            category: 'tour',
            category_id: 1,
            price_from: 35000,
            price_to: 55000,
            location: '신안군 팔금면',
            rating_avg: 4.4,
            rating_count: 87,
            duration: '3시간',
            max_capacity: 20,
            images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop'],
            short_description: '팔금도 바다목장에서 만나는 해양생물과 양식장 견학 투어',
            description_md: '팔금도의 바다목장에서 다양한 해양생물을 관찰하고 굴, 전복 양식장을 견학해보세요. 신선한 해산물 시식도 포함되어 있습니다.',
            features: ['양식장 견학', '해양생물 관찰', '해산물 시식'],
            included_items: ['투어비', '가이드', '시식', '보험'],
            excluded_items: ['개인 용품', '추가 구매'],
            policies: ['날씨에 따라 취소 가능', '전 연령 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '팔금바다목장',
              tier: 'silver',
              is_verified: true
            }
          },
          {
            id: 15,
            title: '암태도 1004섬 드라이브 코스',
            category: 'rental',
            category_id: 6,
            price_from: 60000,
            price_to: 100000,
            location: '신안군 암태면',
            rating_avg: 4.7,
            rating_count: 143,
            duration: '6시간',
            max_capacity: 4,
            images: ['https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=300&fit=crop'],
            short_description: '신안 1004개 섬을 잇는 천사대교를 달리는 환상적인 드라이브',
            description_md: '암태도를 시작으로 신안의 아름다운 섬들을 연결하는 천사대교를 달리는 드라이브 코스입니다. 절경 포인트마다 사진 촬영이 가능합니다.',
            features: ['렌터카 제공', '드라이브 코스', '절경 포인트'],
            included_items: ['차량 대여', '연료', '내비게이션', '보험'],
            excluded_items: ['개인 비용', '주차비'],
            policies: ['면허 필수', '만 21세 이상 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '신안드라이브렌터카',
              tier: 'gold',
              is_verified: true
            }
          },
          {
            id: 16,
            title: '하의도 해변 승마체험',
            category: 'experience',
            category_id: 5,
            price_from: 45000,
            price_to: 65000,
            location: '신안군 하의면',
            rating_avg: 4.9,
            rating_count: 67,
            duration: '1시간',
            max_capacity: 8,
            images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'],
            short_description: '하의도 해변을 말을 타고 달리는 환상적인 승마 체험',
            description_md: '하의도의 아름다운 해변을 말을 타고 달려보세요. 전문 승마 강사의 지도하에 안전하게 승마를 체험할 수 있습니다.',
            features: ['해변 승마', '전문 강사', '사진 서비스'],
            included_items: ['승마 체험', '안전장비', '강사', '사진'],
            excluded_items: ['개인 용품', '추가 레슨'],
            policies: ['체중 80kg 이하', '10세 이상 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '하의도승마클럽',
              tier: 'gold',
              is_verified: true
            }
          },
          {
            id: 17,
            title: '신안 미네랄 스파 & 온천',
            category: 'stay',
            category_id: 2,
            price_from: 80000,
            price_to: 150000,
            location: '신안군 지도읍',
            rating_avg: 4.6,
            rating_count: 189,
            duration: '3시간',
            max_capacity: 50,
            images: ['https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=300&fit=crop'],
            short_description: '신안 바닷물의 미네랄을 이용한 힐링 스파와 온천 체험',
            description_md: '신안 바닷물의 풍부한 미네랄을 이용한 스파와 온천에서 피로를 풀어보세요. 다양한 스파 프로그램과 사우나를 즐길 수 있습니다.',
            features: ['미네랄 스파', '온천', '사우나', '마사지'],
            included_items: ['입장료', '기본 서비스', '수건', '음료'],
            excluded_items: ['마사지', '개인 용품'],
            policies: ['수영복 필수', '전 연령 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '신안미네랄스파',
              tier: 'silver',
              is_verified: true
            }
          },
          {
            id: 18,
            title: '신안 1004 섬 헬기투어',
            category: 'tour',
            category_id: 1,
            price_from: 300000,
            price_to: 500000,
            location: '신안군 지도읍',
            rating_avg: 5.0,
            rating_count: 23,
            duration: '30분',
            max_capacity: 3,
            images: ['https://images.unsplash.com/photo-1526829761737-e7966e05b1fc?w=400&h=300&fit=crop'],
            short_description: '하늘에서 바라보는 신안 1004개 섬의 장관, 헬기투어',
            description_md: '신안의 1004개 섬을 하늘에서 한눈에 볼 수 있는 특별한 헬기투어입니다. 천사대교와 아름다운 섬들의 전경을 감상할 수 있습니다.',
            features: ['헬기 투어', '항공 촬영', '전문 파일럿'],
            included_items: ['헬기 탑승', '안전교육', '기념품', '보험'],
            excluded_items: ['개인 촬영장비', '추가 서비스'],
            policies: ['기상 조건에 따라 취소', '만 12세 이상 이용'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '신안헬기투어',
              tier: 'vip',
              is_verified: true
            }
          },
          {
            id: 19,
            title: '흑산도 철새 탐조투어',
            category: 'tour',
            category_id: 1,
            price_from: 40000,
            price_to: 60000,
            location: '신안군 흑산면',
            rating_avg: 4.5,
            rating_count: 94,
            duration: '4시간',
            max_capacity: 15,
            images: ['https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400&h=300&fit=crop'],
            short_description: '흑산도 철새도래지에서 만나는 다양한 철새들의 생태 관찰',
            description_md: '흑산도는 철새들의 중요한 도래지입니다. 전문 탐조 가이드와 함께 다양한 철새들을 관찰하고 생태를 배워보세요.',
            features: ['탐조 투어', '전문 가이드', '망원경 제공'],
            included_items: ['가이드', '망원경', '자료집', '간식'],
            excluded_items: ['개인 장비', '점심식사'],
            policies: ['조용한 관찰 필수', '전 연령 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '흑산철새관찰센터',
              tier: 'bronze',
              is_verified: true
            }
          },
          {
            id: 20,
            title: '신안 특산품 직판장 투어',
            category: 'experience',
            category_id: 5,
            price_from: 15000,
            price_to: 25000,
            location: '신안군 지도읍',
            rating_avg: 4.3,
            rating_count: 312,
            duration: '2시간',
            max_capacity: 40,
            images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop'],
            short_description: '신안의 특산품을 직접 보고 구매할 수 있는 로컬 마켓 투어',
            description_md: '신안의 천일염, 김, 젓갈 등 다양한 특산품을 직접 보고 구매할 수 있는 투어입니다. 현지 농어민들과 직접 만나 이야기를 들을 수 있습니다.',
            features: ['특산품 견학', '시식 체험', '할인 구매'],
            included_items: ['투어 가이드', '시식', '쇼핑백', '할인쿠폰'],
            excluded_items: ['상품 구매비', '배송비'],
            policies: ['구매 필수 아님', '전 연령 이용 가능'],
            is_active: true,
            is_featured: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            partner: {
              business_name: '신안특산품협회',
              tier: 'silver',
              is_verified: true
            }
          }
        ];

        // 실제 API 호출 시도 후 실패하면 샘플 데이터 사용
        try {
          const [categoriesResult, listingsResult, reviewsResult] = await Promise.all([
            api.getCategories(),
            api.getListings({ sortBy: 'popular', limit: 8 }),
            api.getRecentReviews(4)
          ]);

          setCategories(categoriesResult.length > 0 ? categoriesResult : sampleCategories);
          setFeaturedListings(listingsResult.data.length > 0 ? listingsResult.data : sampleListings);
          setRecentReviews(reviewsResult || []);
        } catch (apiError) {
          console.log('API failed, using sample data:', apiError);
          setCategories(sampleCategories);
          setFeaturedListings(sampleListings);
          setRecentReviews([]);
        }
      } catch (error) {
        console.error('Failed to load homepage data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 날짜 포맷팅 함수
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  const serviceCards = [
    {
      title: "플레이스 굿즈",
      description: "각 여행지에 해당되는 특이한 굿즈,상품판매",
      icon: <Gift className="h-8 w-8" />,
      color: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      title: "제휴업체와의 할인이벤트",
      description: "약 300여개와 제휴되어 어딜가든지 최대 20%할인",
      icon: <Sparkles className="h-8 w-8" />,
      color: "bg-purple-50",
      iconColor: "text-purple-600"
    },
    {
      title: "AI 맞춤 추천",
      description: "개인의 취향에 맞는 최적의 여행 코스 추천",
      icon: <Star className="h-8 w-8" />,
      color: "bg-yellow-50",
      iconColor: "text-yellow-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div
        className="relative h-[48vh] bg-cover bg-center bg-no-repeat overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1693098436985-4a7dece474b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMHBhbG0lMjB0cmVlcyUyMGJlYWNoJTIwdmFjYXRpb258ZW58MXx8fHwxNzU3NTcwNjQzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col items-center justify-center">
          {/* Main Title */}
          <div className="text-center text-white space-y-3 max-w-4xl mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-wide">
              My Travel Awesomeplan
            </h1>
            <p className="text-sm md:text-base text-white/90 font-light">
              어떤곳을 내게만 여행상품을 찾아볼 느낌이
            </p>
          </div>

          {/* Search Form */}
          <div className="w-full max-w-6xl">
            <div className="bg-white rounded-lg shadow-2xl p-6">
              <div className="flex flex-col gap-4">
                {/* 첫 번째 행: 검색 필드들 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 목적지 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">{t('destination', selectedLanguage)}</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder={t('destinationPlaceholder', selectedLanguage)}
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  {/* 체크인 날짜 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">{t('checkIn', selectedLanguage)}</label>
                    <input
                      type="date"
                      value={checkInDate ? checkInDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setCheckInDate(e.target.value ? new Date(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* 체크아웃 날짜 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">{t('checkOut', selectedLanguage)}</label>
                    <input
                      type="date"
                      value={checkOutDate ? checkOutDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setCheckOutDate(e.target.value ? new Date(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* 게스트 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 block">{t('guests', selectedLanguage)}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <Users className="mr-2 h-4 w-4" />
                          {`${t('rooms', selectedLanguage)} ${guestCounts.rooms}, ${t('adults', selectedLanguage)} ${guestCounts.adults}${guestCounts.children > 0 ? `, ${t('children', selectedLanguage)} ${guestCounts.children}` : ''}`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          {/* 객실 수 */}
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">{t('rooms', selectedLanguage)}</label>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGuestCounts(prev => ({ ...prev, rooms: Math.max(1, prev.rooms - 1) }))}
                                disabled={guestCounts.rooms <= 1}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{guestCounts.rooms}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGuestCounts(prev => ({ ...prev, rooms: prev.rooms + 1 }))}
                              >
                                +
                              </Button>
                            </div>
                          </div>

                          {/* 성인 수 */}
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">{t('adults', selectedLanguage)}</label>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGuestCounts(prev => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))}
                                disabled={guestCounts.adults <= 1}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{guestCounts.adults}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGuestCounts(prev => ({ ...prev, adults: prev.adults + 1 }))}
                              >
                                +
                              </Button>
                            </div>
                          </div>

                          {/* 어린이 수 */}
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">{t('children', selectedLanguage)}</label>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGuestCounts(prev => ({ ...prev, children: Math.max(0, prev.children - 1) }))}
                                disabled={guestCounts.children <= 0}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{guestCounts.children}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setGuestCounts(prev => ({ ...prev, children: prev.children + 1 }))}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* 두 번째 행: 추가 정보 및 검색 버튼 */}
                <div className="flex items-center justify-between">
                  {/* 날짜 범위 표시 */}
                  <div className="flex-1">
                    {checkInDate && checkOutDate && checkOutDate > checkInDate && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">
                          {Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))}박
                          {Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)) + 1}일
                        </span>
                        <span className="ml-2 text-gray-500">
                          {formatDate(checkInDate)} - {formatDate(checkOutDate)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 검색 버튼 */}
                  <div className="flex-shrink-0">
                    <Button
                      className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-8 rounded-md text-sm font-medium"
                      onClick={() => {
                        const searchParams = new URLSearchParams();
                        if (destination) searchParams.set('q', destination);
                        if (checkInDate) searchParams.set('checkin', checkInDate.toISOString().split('T')[0]);
                        if (checkOutDate) searchParams.set('checkout', checkOutDate.toISOString().split('T')[0]);
                        searchParams.set('rooms', guestCounts.rooms.toString());
                        searchParams.set('adults', guestCounts.adults.toString());
                        searchParams.set('children', guestCounts.children.toString());

                        navigate(`/search?${searchParams.toString()}`);
                      }}
                    >
                      {t('search', selectedLanguage)}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-4 py-16 space-y-16">
        {/* Service Cards */}
        <section className="-mt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {serviceCards.map((card, index) => (
              <div key={index} className="text-center">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">{card.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 인기 상품 섹션 */}
        <section>
          <div className="mb-8">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-semibold text-gray-800 mb-6">지금 신안은?</h2>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 h-[500px] rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    {
                      id: 1,
                      title: '소악도 민박',
                      category: '민박',
                      location: '신안군 흑산면 소악도',
                      images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'],
                      rating_avg: 4.8,
                      rating_count: 32,
                      duration: '1박',
                      price_from: 80000,
                      partner: {
                        business_name: '소악도민박협회',
                        tier: 'silver',
                        is_verified: true
                      }
                    },
                    {
                      id: 2,
                      title: '갯벌체험장',
                      category: '체험',
                      location: '신안군 증도면',
                      images: ['https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400&h=300&fit=crop'],
                      rating_avg: 4.6,
                      rating_count: 89,
                      duration: '2시간',
                      price_from: 25000,
                      partner: {
                        business_name: '증도갯벌체험센터',
                        tier: 'bronze',
                        is_verified: true
                      }
                    },
                    {
                      id: 3,
                      title: '홍도 유람선',
                      category: '투어',
                      location: '신안군 흑산면 홍도',
                      images: ['https://images.unsplash.com/photo-1464822759880-4601b726be04?w=400&h=300&fit=crop'],
                      rating_avg: 4.9,
                      rating_count: 156,
                      duration: '3시간',
                      price_from: 55000,
                      partner: {
                        business_name: '홍도관광',
                        tier: 'gold',
                        is_verified: true
                      }
                    },
                    {
                      id: 4,
                      title: '천일염 체험',
                      category: '체험',
                      location: '신안군 증도면 염전',
                      images: ['https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop'],
                      rating_avg: 4.7,
                      rating_count: 73,
                      duration: '2시간',
                      price_from: 30000,
                      partner: {
                        business_name: '증도염전체험장',
                        tier: 'silver',
                        is_verified: true
                      }
                    }
                  ].map((listing) => (
                    <div key={listing.id}>
                      <Card
                        className="overflow-hidden shadow-lg h-[500px] flex flex-col hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                        onClick={() => navigate(`/detail/${listing.id}`)}
                      >
                        <div className="relative flex-shrink-0">
                          <ImageWithFallback
                            src={listing.images?.[0] || 'https://via.placeholder.com/400x300'}
                            alt={listing.title}
                            className="w-full h-56 object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                            {listing.category}
                          </div>
                          <div className="absolute top-2 right-2">
                            <Heart className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <CardContent className="p-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-start text-gray-600 text-sm mb-2">
                              <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{listing.location || '신안군'}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">{listing.title}</h3>

                            <div className="flex items-center">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= Math.floor(listing.rating_avg)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'fill-gray-300 text-gray-300'
                                    }`}
                                  />
                                ))}
                                <span className="ml-2 text-sm text-gray-600">
                                  {listing.rating_count} 리뷰
                                </span>
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="text-lg font-semibold text-gray-800">
                                {listing.price_from ? (
                                  <>
                                    <span className="text-lg">
                                      {formatPrice(listing.price_from, selectedCurrency)}
                                    </span>
                                    <span className="text-sm text-gray-600 ml-1">/1인</span>
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-600">가격 문의</span>
                                )}
                              </div>
                            </div>

                            {listing.duration && (
                              <div className="flex items-center text-gray-600 text-sm">
                                <Clock className="h-4 w-4 mr-1" />
                                <span>{listing.duration}</span>
                              </div>
                            )}

                            {listing.partner && (
                              <div className="flex items-center text-gray-600 text-sm">
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {listing.partner.business_name}
                                  {listing.partner.is_verified && (
                                    <span className="ml-1 text-blue-500">✓</span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 액티비티 */}
        <section>
          <h2 className="text-3xl font-semibold text-gray-800 mb-8">액티비티</h2>

          {loading ? (
            <div className="flex gap-4 h-96">
              <div className="w-1/2 animate-pulse">
                <div className="bg-gray-200 h-full rounded-lg"></div>
              </div>
              <div className="w-1/2 flex flex-col gap-4">
                <div className="h-1/2 animate-pulse">
                  <div className="bg-gray-200 h-full rounded-lg"></div>
                </div>
                <div className="h-1/2 animate-pulse">
                  <div className="bg-gray-200 h-full rounded-lg"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 h-96">
              {/* 왼쪽 큰 이미지 */}
              <div className="w-1/2">
                <div
                  className="cursor-pointer hover:scale-105 transition-transform duration-200 h-full"
                  onClick={() => console.log('액티비티 이미지 클릭: 민박')}
                >
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&h=400&fit=crop"
                    alt="신안 민박"
                    className="w-full h-full object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  />
                </div>
              </div>

              {/* 오른쪽 작은 이미지들 */}
              <div className="w-1/2 flex flex-col gap-4">
                <div className="h-1/2">
                  <div
                    className="cursor-pointer hover:scale-105 transition-transform duration-200 h-full"
                    onClick={() => console.log('액티비티 이미지 클릭: 갯벌체험')}
                  >
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=300&h=200&fit=crop"
                      alt="갯벌체험"
                      className="w-full h-full object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    />
                  </div>
                </div>
                <div className="h-1/2">
                  <div
                    className="cursor-pointer hover:scale-105 transition-transform duration-200 h-full"
                    onClick={() => console.log('액티비티 이미지 클릭: 유람선')}
                  >
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1464822759880-4601b726be04?w=300&h=200&fit=crop"
                      alt="홍도 유람선"
                      className="w-full h-full object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 주변 숙소 */}
        <section>
          <h2 className="text-3xl font-semibold text-gray-800 mb-8">주변 숙소 보기</h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-80 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  id: 101,
                  title: '해운대 오션뷰 펜션',
                  category: 'stay',
                  category_id: 2,
                  price_from: 120000,
                  price_to: 180000,
                  location: '신안군 임자면',
                  rating_avg: 4.7,
                  rating_count: 89,
                  duration: '1박',
                  images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop'],
                  short_description: '바다가 보이는 프라이빗 펜션에서 특별한 휴식을'
                },
                {
                  id: 102,
                  title: '증도 한옥스테이',
                  category: 'stay',
                  category_id: 2,
                  price_from: 90000,
                  price_to: 140000,
                  location: '신안군 증도면',
                  rating_avg: 4.8,
                  rating_count: 124,
                  duration: '1박',
                  images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'],
                  short_description: '전통 한옥에서 경험하는 한국의 미'
                },
                {
                  id: 103,
                  title: '비금도 글램핑장',
                  category: 'stay',
                  category_id: 2,
                  price_from: 150000,
                  price_to: 220000,
                  location: '신안군 비금면',
                  rating_avg: 4.6,
                  rating_count: 67,
                  duration: '1박',
                  images: ['https://images.unsplash.com/photo-1517824806704-9040b037703b?w=400&h=300&fit=crop'],
                  short_description: '자연 속에서 즐기는 럭셔리 캠핑'
                },
                {
                  id: 104,
                  title: '흑산도 어촌민박',
                  category: 'stay',
                  category_id: 2,
                  price_from: 70000,
                  price_to: 100000,
                  location: '신안군 흑산면',
                  rating_avg: 4.5,
                  rating_count: 156,
                  duration: '1박',
                  images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop'],
                  short_description: '어촌 마을의 정겨운 민박 체험'
                }
              ].map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                  onClick={() => navigate(`/detail/${item.id}`)}
                >
                  <div className="relative">
                    <ImageWithFallback
                      src={item.images?.[0] || 'https://via.placeholder.com/400x300'}
                      alt={item.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-800 px-2 py-1 rounded text-xs font-medium">
                      {item.category}
                    </div>
                    <div className="absolute top-2 right-2">
                      <Heart className="h-5 w-5 text-white drop-shadow-sm" />
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-600 text-sm">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{item.location || '신안군'}</span>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">{item.title}</h3>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= Math.floor(item.rating_avg)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'fill-gray-300 text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-2 text-sm text-gray-600">{item.rating_count} 리뷰</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        {item.duration && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{item.duration}</span>
                          </div>
                        )}
                        <div className="text-lg font-semibold text-gray-800">
                          {item.price_from ? (
                            <>
                              <span>{formatPrice(item.price_from, selectedCurrency)}</span>
                              <span className="text-sm text-gray-600 ml-1">/1인</span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-600">가격 문의</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 더 보기 버튼 */}
          <div className="text-center mt-8">
            <Button
              variant="outline"
              className="px-8 py-2"
              onClick={() => navigate('/search')}
            >
              더 많은 상품 보기
            </Button>
          </div>
        </section>

        {/* 사용자 리뷰 섹션 */}
        <section className="mt-16">
          <h2 className="text-3xl font-semibold text-gray-800 mb-8">사용자 리뷰</h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-64 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* DB에서 가져온 실제 리뷰 데이터 */}
              {recentReviews.map((review) => (
                <Card key={review.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* 사용자 정보 */}
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          <ImageWithFallback
                            src={review.images?.[0] || review.profile_image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'}
                            alt={review.user_name || '사용자'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">{review.user_name || '익명'}</h4>
                          <p className="text-sm text-gray-500">
                            {review.created_at ? new Date(review.created_at).toLocaleDateString('ko-KR') : '2024.03.15'}
                          </p>
                        </div>
                      </div>

                      {/* 별점 */}
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < (review.rating || 5)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm font-medium text-gray-700">{review.rating || 5}.0</span>
                      </div>

                      {/* 상품명 */}
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-sm font-medium text-gray-700">{review.listing_title || review.product_name || '신안 여행 상품'}</p>
                      </div>

                      {/* 리뷰 내용 */}
                      <p className="text-gray-600 text-sm leading-relaxed line-clamp-4">
                        {review.review_text || '정말 좋은 여행이었습니다. 추천드려요!'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 더 많은 리뷰 보기 버튼 */}
          <div className="text-center mt-8">
            <Button
              variant="outline"
              className="px-8 py-2"
              onClick={() => navigate('/reviews')}
            >
              더 많은 리뷰 보기
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}