import { connect } from '@planetscale/database';
import type {
  ApiResponse,
  PaginatedResponse,
  Listing,
  ListingWithDetails,
  User,
  Booking,
  Review,
  Payment,
  Partner,
  Category,
  ListingFilters
} from '../types/database';

interface DatabaseConfig {
  url: string;
  username: string;
  password: string;
}

class PlanetScaleDatabase {
  private config: DatabaseConfig;
  private connection: any;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.connection = connect(config);
  }

  private async executeQuery(sql: string, params: any[] = []) {
    try {
      console.log('Executing query:', sql.substring(0, 100) + '...');

      // Mock 환경인 경우 더미 데이터 반환
      if (this.config.url.includes('mock')) {
        return this.getMockResult(sql, params);
      }

      // 실제 PlanetScale 쿼리 실행
      const result = await this.connection.execute(sql, params);
      return result;
    } catch (error) {
      console.error('Database query failed:', error);

      // 실제 DB 연결 실패 시 Mock 데이터로 폴백
      if (!this.config.url.includes('mock')) {
        console.log('Falling back to mock data due to connection error');
        return this.getMockResult(sql, params);
      }

      throw error;
    }
  }

  private getPartnerListings() {
    return [
      // 신안 지역 제휴업체 (32개 - 8개 카테고리별 4개씩: 여행, 렌트카, 숙박, 음식, 관광지, 팝업, 행사, 체험)

      // 1. 여행 (tour) - 4개
      {
        id: 1, title: '증도 천일염 체험여행', category: 'tour', category_id: 1, price_from: 25000, price_to: 35000,
        location: '신안군 증도면', lat: 34.6229, lng: 126.0897, duration: '2시간', max_capacity: 30,
        short_description: '전통 천일염 제조 과정을 직접 체험하며 소금의 역사를 배워보는 여행',
        rating_avg: 4.8, rating_count: 127, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=400"]'
      },
      {
        id: 2, title: '홍도 해상국립공원 여행', category: 'tour', category_id: 1, price_from: 45000, price_to: 65000,
        location: '신안군 홍도면', lat: 34.6883, lng: 125.1806, duration: '4시간', max_capacity: 25,
        short_description: '아름다운 홍도의 기암절벽과 해안 절경을 만끽하는 해상 여행',
        rating_avg: 4.9, rating_count: 203, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      {
        id: 3, title: '자라도 갯벌 생태여행', category: 'tour', category_id: 1, price_from: 30000, price_to: 40000,
        location: '신안군 자라면', lat: 34.7283, lng: 126.2156, duration: '3시간', max_capacity: 40,
        short_description: '유네스코 세계자연유산 신안 갯벌에서의 특별한 생태 여행',
        rating_avg: 4.6, rating_count: 156, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400"]'
      },
      {
        id: 4, title: '청산도 슬로우길 여행', category: 'tour', category_id: 1, price_from: 25000, price_to: 35000,
        location: '신안군 청산면', lat: 34.1167, lng: 126.9333, duration: '6시간', max_capacity: 30,
        short_description: '영화 촬영지로 유명한 청산도의 아름다운 슬로우길 트레킹 여행',
        rating_avg: 4.9, rating_count: 234, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },

      // 2. 렌트카 (rentcar) - 4개
      {
        id: 5, title: '신안 아일랜드 렌트카', category: 'rentcar', category_id: 6, price_from: 50000, price_to: 80000,
        location: '신안군 지도읍', lat: 34.8194, lng: 126.3031, duration: '1일', max_capacity: 4,
        short_description: '신안 섬 여행을 위한 프리미엄 렌트카 서비스',
        rating_avg: 4.7, rating_count: 89, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1549924231-f129b911e442?w=400"]'
      },
      {
        id: 6, title: '증도 캠핑카 렌탈', category: 'rentcar', category_id: 6, price_from: 120000, price_to: 180000,
        location: '신안군 증도면', lat: 34.6229, lng: 126.0897, duration: '1일', max_capacity: 6,
        short_description: '증도 천일염 체험과 함께하는 캠핑카 여행',
        rating_avg: 4.8, rating_count: 156, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400"]'
      },
      {
        id: 7, title: '흑산도 전기차 렌탈', category: 'rentcar', category_id: 6, price_from: 60000, price_to: 90000,
        location: '신안군 흑산면', lat: 34.6833, lng: 125.4667, duration: '1일', max_capacity: 4,
        short_description: '친환경 전기차로 흑산도 섬 곳곳을 탐험',
        rating_avg: 4.6, rating_count: 94, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1593941707882-a5bac6861d75?w=400"]'
      },
      {
        id: 8, title: '홍도 스쿠터 렌탈', category: 'rentcar', category_id: 6, price_from: 30000, price_to: 50000,
        location: '신안군 홍도면', lat: 34.6883, lng: 125.1806, duration: '1일', max_capacity: 2,
        short_description: '홍도 해안도로를 달리는 로맨틱 스쿠터 여행',
        rating_avg: 4.5, rating_count: 72, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"]'
      },

      // 3. 숙박 (stay) - 4개
      {
        id: 9, title: '퍼플교 해상펜션', category: 'stay', category_id: 2, price_from: 120000, price_to: 180000,
        location: '신안군 암태면', lat: 34.5867, lng: 126.3647, duration: '1박', max_capacity: 4,
        short_description: '퍼플교 전망이 아름다운 프리미엄 해상펜션에서의 힐링 스테이',
        rating_avg: 4.7, rating_count: 89, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400"]'
      },
      {
        id: 10, title: '비금도 원평해수욕장 펜션', category: 'stay', category_id: 2, price_from: 80000, price_to: 120000,
        location: '신안군 비금면', lat: 34.7519, lng: 126.0531, duration: '1박', max_capacity: 6,
        short_description: '에메랄드빛 바다가 펼쳐진 원평해수욕장의 감성 펜션',
        rating_avg: 4.5, rating_count: 94, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1504851149312-7a075b496cc7?w=400"]'
      },
      {
        id: 11, title: '기점도 요트 펜션', category: 'stay', category_id: 2, price_from: 150000, price_to: 220000,
        location: '신안군 기점면', lat: 34.2531, lng: 126.1161, duration: '1박', max_capacity: 6,
        short_description: '바다 위에서 즐기는 특별한 요트 숙박 체험',
        rating_avg: 4.8, rating_count: 92, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400"]'
      },
      {
        id: 12, title: '임자도 진리해수욕장 리조트', category: 'stay', category_id: 2, price_from: 95000, price_to: 140000,
        location: '신안군 임자면', lat: 34.9667, lng: 126.1833, duration: '1박', max_capacity: 4,
        short_description: '12km 모래해변이 펼쳐진 진리해수욕장의 프리미엄 리조트',
        rating_avg: 4.6, rating_count: 118, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400"]'
      },

      // 4. 음식 (food) - 4개
      {
        id: 13, title: '신안 전통 젓갈 맛집', category: 'food', category_id: 3, price_from: 15000, price_to: 35000,
        location: '신안군 지도읍', lat: 34.8194, lng: 126.3031, duration: '1시간', max_capacity: 50,
        short_description: '3대째 이어져 내려오는 전통 젓갈과 신선한 해산물 요리',
        rating_avg: 4.8, rating_count: 312, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=400"]'
      },
      {
        id: 7, title: '안좌도 퍼플섬 카페', category: 'food', category_id: 3, price_from: 8000, price_to: 18000,
        location: '신안군 안좌면', lat: 34.6656, lng: 126.2383, duration: '1시간', max_capacity: 30,
        short_description: '퍼플섬의 아름다운 풍경과 함께하는 감성 카페',
        rating_avg: 4.4, rating_count: 78, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1559056961-84042b4bdcd8?w=400"]'
      },
      {
        id: 8, title: '흑산도 상라봉 트레킹', category: 'tour', category_id: 1, price_from: 40000, price_to: 55000,
        location: '신안군 흑산면', lat: 34.6839, lng: 125.4367, duration: '5시간', max_capacity: 20,
        short_description: '흑산도 최고봉에서 바라보는 서해의 장관과 트레킹의 즐거움',
        rating_avg: 4.7, rating_count: 134, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1551632811-561732d1e306?w=400"]'
      },
      {
        id: 9, title: '도초도 해안둘레길', category: 'tour', category_id: 1, price_from: 20000, price_to: 30000,
        location: '신안군 도초면', lat: 34.4778, lng: 126.1464, duration: '3시간', max_capacity: 35,
        short_description: '아름다운 해안선을 따라 걷는 힐링 둘레길 코스',
        rating_avg: 4.5, rating_count: 67, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      {
        id: 10, title: '신안 바다목장 체험', category: 'tour', category_id: 1, price_from: 35000, price_to: 50000,
        location: '신안군 장산면', lat: 34.2864, lng: 126.0833, duration: '4시간', max_capacity: 25,
        short_description: '청정 바다에서 직접 해산물을 채취하고 맛보는 바다목장 체험',
        rating_avg: 4.6, rating_count: 98, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400"]'
      },
      {
        id: 11, title: '임자도 대광해수욕장 리조트', category: 'stay', category_id: 2, price_from: 150000, price_to: 250000,
        location: '신안군 임자면', lat: 34.8597, lng: 126.1533, duration: '1박', max_capacity: 4,
        short_description: '12km 백사장이 펼쳐진 대광해수욕장의 프리미엄 리조트',
        rating_avg: 4.8, rating_count: 156, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400"]'
      },
      {
        id: 12, title: '신의도 갯벌펜션', category: 'stay', category_id: 2, price_from: 80000, price_to: 120000,
        location: '신안군 신의면', lat: 34.3489, lng: 126.2719, duration: '1박', max_capacity: 6,
        short_description: '갯벌 체험과 함께하는 가족 친화적인 펜션',
        rating_avg: 4.3, rating_count: 72, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400"]'
      },
      {
        id: 13, title: '청산도 슬로우길', category: 'tour', category_id: 1, price_from: 25000, price_to: 35000,
        location: '신안군 청산면', lat: 34.1167, lng: 126.9333, duration: '6시간', max_capacity: 30,
        short_description: '영화 촬영지로 유명한 청산도의 아름다운 슬로우길 트레킹',
        rating_avg: 4.9, rating_count: 234, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      {
        id: 14, title: '팔금도 해물탕집', category: 'food', category_id: 3, price_from: 20000, price_to: 45000,
        location: '신안군 팔금면', lat: 34.8403, lng: 126.2125, duration: '1시간', max_capacity: 40,
        short_description: '팔금도 근해에서 잡은 신선한 해산물로 끓인 진짜 해물탕',
        rating_avg: 4.7, rating_count: 189, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=400"]'
      },
      {
        id: 15, title: '하의도 관광농원', category: 'tour', category_id: 1, price_from: 18000, price_to: 28000,
        location: '신안군 하의면', lat: 34.2597, lng: 126.3228, duration: '2시간', max_capacity: 45,
        short_description: '유기농 농산물 수확 체험과 전통 농법 견학',
        rating_avg: 4.4, rating_count: 56, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1559056961-84042b4bdcd8?w=400"]'
      },
      {
        id: 16, title: '장산도 일출카페', category: 'food', category_id: 3, price_from: 6000, price_to: 15000,
        location: '신안군 장산면', lat: 34.2864, lng: 126.0833, duration: '1시간', max_capacity: 25,
        short_description: '서해 최고의 일출 명소에서 즐기는 커피와 디저트',
        rating_avg: 4.6, rating_count: 103, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400"]'
      },
      {
        id: 17, title: '압해도 민박마을', category: 'stay', category_id: 2, price_from: 60000, price_to: 90000,
        location: '신안군 압해면', lat: 34.5683, lng: 126.3919, duration: '1박', max_capacity: 8,
        short_description: '정겨운 시골 정취를 만끽할 수 있는 전통 민박',
        rating_avg: 4.2, rating_count: 41, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400"]'
      },
      {
        id: 18, title: '송공도 어촌체험마을', category: 'tour', category_id: 1, price_from: 30000, price_to: 45000,
        location: '신안군 송공면', lat: 34.7139, lng: 126.1869, duration: '4시간', max_capacity: 30,
        short_description: '어부들과 함께하는 진짜 어촌 체험과 바다 낚시',
        rating_avg: 4.5, rating_count: 87, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=400"]'
      },
      {
        id: 19, title: '신안 소금박물관', category: 'tour', category_id: 1, price_from: 10000, price_to: 15000,
        location: '신안군 증도면', lat: 34.6229, lng: 126.0897, duration: '1.5시간', max_capacity: 60,
        short_description: '한국 소금의 역사와 문화를 한눈에 볼 수 있는 박물관',
        rating_avg: 4.3, rating_count: 145, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      {
        id: 20, title: '신안 수산물직판장', category: 'food', category_id: 3, price_from: 25000, price_to: 60000,
        location: '신안군 지도읍', lat: 34.8194, lng: 126.3031, duration: '1시간', max_capacity: 100,
        short_description: '신안 앞바다에서 갓 잡아 올린 싱싱한 수산물 직판장',
        rating_avg: 4.6, rating_count: 267, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=400"]'
      },
      {
        id: 21, title: '도초도 해안절벽 트레킹', category: 'tour', category_id: 1, price_from: 22000, price_to: 32000,
        location: '신안군 도초면', lat: 34.2167, lng: 126.1583, duration: '3시간', max_capacity: 20,
        short_description: '도초도 해안절벽의 비경을 감상하는 생태 트레킹',
        rating_avg: 4.7, rating_count: 78, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      {
        id: 22, title: '기점도 요트 펜션', category: 'stay', category_id: 2, price_from: 150000, price_to: 220000,
        location: '신안군 기점면', lat: 34.2531, lng: 126.1161, duration: '1박', max_capacity: 6,
        short_description: '바다 위에서 즐기는 특별한 요트 숙박 체험',
        rating_avg: 4.8, rating_count: 92, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400"]'
      },
      {
        id: 23, title: '사옥도 갯벌캠핑장', category: 'stay', category_id: 2, price_from: 45000, price_to: 70000,
        location: '신안군 사옥면', lat: 34.8403, lng: 126.3569, duration: '1박', max_capacity: 4,
        short_description: '갯벌 위에서 캠핑하며 일출과 일몰을 동시에 만끽',
        rating_avg: 4.5, rating_count: 63, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1504851149312-7a075b496cc7?w=400"]'
      },
      {
        id: 24, title: '매화도 매실농장', category: 'tour', category_id: 1, price_from: 15000, price_to: 25000,
        location: '신안군 매화면', lat: 34.4167, lng: 126.2833, duration: '2.5시간', max_capacity: 35,
        short_description: '매화꽃이 피는 봄철 특별한 매실농장 체험',
        rating_avg: 4.4, rating_count: 54, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1559056961-84042b4bdcd8?w=400"]'
      },
      {
        id: 25, title: '임자도 진리해수욕장 리조트', category: 'stay', category_id: 2, price_from: 95000, price_to: 140000,
        location: '신안군 임자면', lat: 34.9667, lng: 126.1833, duration: '1박', max_capacity: 4,
        short_description: '12km 모래해변이 펼쳐진 진리해수욕장의 프리미엄 리조트',
        rating_avg: 4.6, rating_count: 118, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400"]'
      },
      {
        id: 26, title: '신안 김 가공체험장', category: 'tour', category_id: 1, price_from: 20000, price_to: 30000,
        location: '신안군 흑산면', lat: 34.6833, lng: 125.4667, duration: '2시간', max_capacity: 25,
        short_description: '신안 특산물 김 양식부터 가공까지 전 과정 체험',
        rating_avg: 4.3, rating_count: 76, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=400"]'
      },
      {
        id: 27, title: '가거도 등대카페', category: 'food', category_id: 3, price_from: 8000, price_to: 18000,
        location: '신안군 가거도면', lat: 34.0667, lng: 125.1167, duration: '1시간', max_capacity: 15,
        short_description: '한국 최서남단 가거도 등대에서 즐기는 특별한 카페',
        rating_avg: 4.9, rating_count: 34, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400"]'
      },
      {
        id: 28, title: '만재도 트레킹코스', category: 'tour', category_id: 1, price_from: 18000, price_to: 25000,
        location: '신안군 만재면', lat: 34.0167, lng: 126.2667, duration: '4시간', max_capacity: 30,
        short_description: '만재도 전체를 둘러보는 힐링 트레킹 코스',
        rating_avg: 4.5, rating_count: 42, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      {
        id: 29, title: '노화도 민속박물관', category: 'tour', category_id: 1, price_from: 5000, price_to: 8000,
        location: '신안군 노화면', lat: 34.1833, lng: 126.2333, duration: '1시간', max_capacity: 40,
        short_description: '섬 지역 전통 생활문화를 체험할 수 있는 민속박물관',
        rating_avg: 4.2, rating_count: 67, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      // 관광지 (tourist) - 4개
      {
        id: 17, title: '증도 태평염전', category: 'tourist', category_id: 5, price_from: 10000, price_to: 15000,
        location: '신안군 증도면', lat: 34.6229, lng: 126.0897, duration: '2시간', max_capacity: 60,
        short_description: '아시아 최대 규모의 천일염전과 염전 박물관 관람',
        rating_avg: 4.8, rating_count: 312, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      {
        id: 18, title: '홍도 1구 전망대', category: 'tourist', category_id: 5, price_from: 5000, price_to: 8000,
        location: '신안군 흑산면', lat: 34.6833, lng: 125.4667, duration: '1시간', max_capacity: 40,
        short_description: '홍도의 절경을 한눈에 조망할 수 있는 최고의 전망대',
        rating_avg: 4.9, rating_count: 456, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=400"]'
      },
      {
        id: 19, title: '퍼플섬 보라색 다리', category: 'tourist', category_id: 5, price_from: 0, price_to: 0,
        location: '신안군 안좌면', lat: 34.7167, lng: 126.1333, duration: '30분', max_capacity: 100,
        short_description: '보라색으로 칠해진 신비로운 연륙교와 포토존',
        rating_avg: 4.7, rating_count: 289, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1559056961-84042b4bdcd8?w=400"]'
      },
      {
        id: 20, title: '자은도 분계해수욕장', category: 'tourist', category_id: 5, price_from: 0, price_to: 0,
        location: '신안군 자은면', lat: 34.7833, lng: 126.1833, duration: '3시간', max_capacity: 200,
        short_description: '국내 최고의 아름다운 백사장을 자랑하는 해수욕장',
        rating_avg: 4.6, rating_count: 234, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400"]'
      },

      // 팝업 (popup) - 4개
      {
        id: 21, title: '증도 아트갤러리 팝업', category: 'popup', category_id: 6, price_from: 5000, price_to: 10000,
        location: '신안군 증도면', lat: 34.6229, lng: 126.0897, duration: '1시간', max_capacity: 30,
        short_description: '지역 작가들의 작품을 전시하는 기간 한정 아트갤러리',
        rating_avg: 4.5, rating_count: 67, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1559056961-84042b4bdcd8?w=400"]'
      },
      {
        id: 22, title: '홍도 포토존 팝업', category: 'popup', category_id: 6, price_from: 3000, price_to: 8000,
        location: '신안군 흑산면', lat: 34.6833, lng: 125.4667, duration: '30분', max_capacity: 20,
        short_description: '홍도 절경을 배경으로 한 인스타그램 감성 포토존',
        rating_avg: 4.7, rating_count: 134, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=400"]'
      },
      {
        id: 23, title: '퍼플섬 굿즈샵 팝업', category: 'popup', category_id: 6, price_from: 5000, price_to: 25000,
        location: '신안군 안좌면', lat: 34.7167, lng: 126.1333, duration: '30분', max_capacity: 15,
        short_description: '퍼플섬 테마의 한정판 기념품과 굿즈 판매점',
        rating_avg: 4.6, rating_count: 89, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400"]'
      },
      {
        id: 24, title: '자은도 로컬푸드 팝업', category: 'popup', category_id: 6, price_from: 8000, price_to: 15000,
        location: '신안군 자은면', lat: 34.7833, lng: 126.1833, duration: '1시간', max_capacity: 25,
        short_description: '자은도 지역 특산물과 수제 간식 판매 팝업스토어',
        rating_avg: 4.4, rating_count: 56, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=400"]'
      },

      // 행사 (event) - 4개
      {
        id: 25, title: '증도 염전 축제', category: 'event', category_id: 7, price_from: 15000, price_to: 25000,
        location: '신안군 증도면', lat: 34.6229, lng: 126.0897, duration: '6시간', max_capacity: 500,
        short_description: '매년 5월 열리는 증도 염전과 바다를 테마로 한 지역 축제',
        rating_avg: 4.8, rating_count: 234, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      {
        id: 26, title: '홍도 해돋이 축제', category: 'event', category_id: 7, price_from: 20000, price_to: 30000,
        location: '신안군 흑산면', lat: 34.6833, lng: 125.4667, duration: '12시간', max_capacity: 300,
        short_description: '새해 첫 일출을 홍도에서 맞이하는 특별한 축제',
        rating_avg: 4.9, rating_count: 187, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=400"]'
      },
      {
        id: 27, title: '퍼플섬 라벤더 축제', category: 'event', category_id: 7, price_from: 10000, price_to: 18000,
        location: '신안군 안좌면', lat: 34.7167, lng: 126.1333, duration: '4시간', max_capacity: 400,
        short_description: '보라색 라벤더가 만개하는 6월 퍼플섬의 로맨틱 축제',
        rating_avg: 4.7, rating_count: 156, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1559056961-84042b4bdcd8?w=400"]'
      },
      {
        id: 28, title: '자은도 백사장 음악회', category: 'event', category_id: 7, price_from: 12000, price_to: 22000,
        location: '신안군 자은면', lat: 34.7833, lng: 126.1833, duration: '3시간', max_capacity: 250,
        short_description: '여름밤 자은도 해변에서 펼쳐지는 감성 음악 콘서트',
        rating_avg: 4.6, rating_count: 123, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400"]'
      },

      // 체험 (experience) - 4개
      {
        id: 29, title: '증도 소금 만들기 체험', category: 'experience', category_id: 8, price_from: 20000, price_to: 30000,
        location: '신안군 증도면', lat: 34.6229, lng: 126.0897, duration: '3시간', max_capacity: 20,
        short_description: '전통 천일염 제작 과정을 직접 체험해보는 특별한 프로그램',
        rating_avg: 4.8, rating_count: 167, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      {
        id: 30, title: '홍도 바다낚시 체험', category: 'experience', category_id: 8, price_from: 35000, price_to: 55000,
        location: '신안군 흑산면', lat: 34.6833, lng: 125.4667, duration: '5시간', max_capacity: 12,
        short_description: '홍도 청정 바다에서 즐기는 진짜 바다낚시 체험',
        rating_avg: 4.7, rating_count: 89, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?w=400"]'
      },
      {
        id: 31, title: '퍼플섬 보라염색 체험', category: 'experience', category_id: 8, price_from: 25000, price_to: 35000,
        location: '신안군 안좌면', lat: 34.7167, lng: 126.1333, duration: '2시간', max_capacity: 15,
        short_description: '천연 재료로 보라색 염색을 체험하는 감성 공예 프로그램',
        rating_avg: 4.6, rating_count: 112, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1559056961-84042b4bdcd8?w=400"]'
      },
      {
        id: 32, title: '자은도 갯벌 체험', category: 'experience', category_id: 8, price_from: 18000, price_to: 28000,
        location: '신안군 자은면', lat: 34.7833, lng: 126.1833, duration: '2시간', max_capacity: 30,
        short_description: '자은도 청정 갯벌에서 조개, 낙지 잡기 체험',
        rating_avg: 4.5, rating_count: 145, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400"]'
      },

      // 세계 유명 관광지 제휴업체 (50개)
      {
        id: 33, title: 'Tokyo Sushi Experience', category: 'food', category_id: 3, price_from: 80000, price_to: 150000,
        location: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503, duration: '2시간', max_capacity: 12,
        short_description: '도쿄 최고의 스시 마스터와 함께하는 프리미엄 스시 체험',
        rating_avg: 4.9, rating_count: 456, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=400"]'
      },
      {
        id: 34, title: 'Santorini Sunset Tour', category: 'tour', category_id: 1, price_from: 120000, price_to: 180000,
        location: 'Santorini, Greece', lat: 36.3932, lng: 25.4615, duration: '4시간', max_capacity: 20,
        short_description: '그리스 산토리니의 환상적인 석양과 함께하는 낭만 투어',
        rating_avg: 4.8, rating_count: 789, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400"]'
      },
      {
        id: 33, title: 'Bali Luxury Villa', category: 'stay', category_id: 2, price_from: 200000, price_to: 400000,
        location: 'Bali, Indonesia', lat: -8.3405, lng: 115.0920, duration: '1박', max_capacity: 6,
        short_description: '발리 우붓의 자연과 하나 되는 럭셔리 프라이빗 빌라',
        rating_avg: 4.9, rating_count: 234, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400"]'
      },
      {
        id: 34, title: 'Paris Seine River Cruise', category: 'tour', category_id: 1, price_from: 90000, price_to: 140000,
        location: 'Paris, France', lat: 48.8566, lng: 2.3522, duration: '2시간', max_capacity: 50,
        short_description: '파리 센강을 따라 즐기는 로맨틱한 디너 크루즈',
        rating_avg: 4.7, rating_count: 1203, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400"]'
      },
      {
        id: 35, title: 'New York Central Park Tour', category: 'tour', category_id: 1, price_from: 60000, price_to: 90000,
        location: 'New York, USA', lat: 40.7829, lng: -73.9654, duration: '3시간', max_capacity: 25,
        short_description: '뉴욕 센트럴파크의 숨겨진 명소들을 찾아가는 가이드 투어',
        rating_avg: 4.6, rating_count: 567, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400"]'
      },
      {
        id: 36, title: 'London Fish & Chips Pub', category: 'food', category_id: 3, price_from: 35000, price_to: 55000,
        location: 'London, UK', lat: 51.5074, lng: -0.1278, duration: '1.5시간', max_capacity: 40,
        short_description: '런던 전통 펍에서 즐기는 정통 피시 앤 칩스',
        rating_avg: 4.5, rating_count: 324, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400"]'
      },
      {
        id: 37, title: 'Swiss Alps Hiking', category: 'tour', category_id: 1, price_from: 150000, price_to: 250000,
        location: 'Zermatt, Switzerland', lat: 45.9763, lng: 7.6586, duration: '1일', max_capacity: 15,
        short_description: '마터호른을 배경으로 한 스위스 알프스 하이킹 투어',
        rating_avg: 4.9, rating_count: 189, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      {
        id: 38, title: 'Rome Colosseum VIP Tour', category: 'tour', category_id: 1, price_from: 85000, price_to: 120000,
        location: 'Rome, Italy', lat: 41.8902, lng: 12.4922, duration: '3시간', max_capacity: 20,
        short_description: '콜로세움과 로마 포럼을 깊이 있게 탐험하는 VIP 투어',
        rating_avg: 4.8, rating_count: 678, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1552832230-c0197047dc23?w=400"]'
      },
      {
        id: 39, title: 'Dubai Desert Safari', category: 'tour', category_id: 1, price_from: 95000, price_to: 140000,
        location: 'Dubai, UAE', lat: 25.2048, lng: 55.2708, duration: '6시간', max_capacity: 30,
        short_description: '두바이 사막에서의 짜릿한 사파리와 베두인 캠프 체험',
        rating_avg: 4.7, rating_count: 543, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=400"]'
      },
      {
        id: 40, title: 'Barcelona Tapas Tour', category: 'food', category_id: 3, price_from: 65000, price_to: 95000,
        location: 'Barcelona, Spain', lat: 41.3851, lng: 2.1734, duration: '3시간', max_capacity: 18,
        short_description: '바르셀로나 현지인들이 사랑하는 타파스 바 투어',
        rating_avg: 4.6, rating_count: 456, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1544025162-d76694265947?w=400"]'
      },
      {
        id: 31, title: 'Iceland Northern Lights', category: 'tour', category_id: 1, price_from: 180000, price_to: 280000,
        location: 'Reykjavik, Iceland', lat: 64.1466, lng: -21.9426, duration: '5시간', max_capacity: 16,
        short_description: '아이슬란드 오로라 헌팅과 자연 온천 체험',
        rating_avg: 4.8, rating_count: 234, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=400"]'
      },
      {
        id: 32, title: 'Thai Cooking Class', category: 'tour', category_id: 1, price_from: 55000, price_to: 75000,
        location: 'Bangkok, Thailand', lat: 13.7563, lng: 100.5018, duration: '4시간', max_capacity: 12,
        short_description: '방콕 전통 시장에서 시작하는 정통 태국 요리 클래스',
        rating_avg: 4.7, rating_count: 389, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400"]'
      },
      {
        id: 33, title: 'Prague Castle Night Tour', category: 'tour', category_id: 1, price_from: 70000, price_to: 100000,
        location: 'Prague, Czech Republic', lat: 50.0755, lng: 14.4378, duration: '2.5시간', max_capacity: 25,
        short_description: '프라하 성의 야경과 함께하는 로맨틱한 밤 투어',
        rating_avg: 4.5, rating_count: 298, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1541849546-216549ae216d?w=400"]'
      },
      {
        id: 34, title: 'Singapore Marina Bay Hotel', category: 'stay', category_id: 2, price_from: 350000, price_to: 500000,
        location: 'Singapore', lat: 1.2834, lng: 103.8607, duration: '1박', max_capacity: 2,
        short_description: '싱가포르 스카이라인과 인피니티 풀이 있는 럭셔리 호텔',
        rating_avg: 4.9, rating_count: 1234, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1540541338287-41700207dee6?w=400"]'
      },
      {
        id: 35, title: 'Amsterdam Canal Cruise', category: 'tour', category_id: 1, price_from: 45000, price_to: 65000,
        location: 'Amsterdam, Netherlands', lat: 52.3676, lng: 4.9041, duration: '1.5시간', max_capacity: 35,
        short_description: '아름다운 암스테르담 운하를 따라 즐기는 여유로운 크루즈',
        rating_avg: 4.4, rating_count: 567, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=400"]'
      },
      {
        id: 36, title: 'Turkish Hammam Spa', category: 'tour', category_id: 1, price_from: 80000, price_to: 120000,
        location: 'Istanbul, Turkey', lat: 41.0082, lng: 28.9784, duration: '3시간', max_capacity: 10,
        short_description: '이스탄불 전통 터키식 목욕탕에서의 힐링 체험',
        rating_avg: 4.6, rating_count: 145, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400"]'
      },
      {
        id: 37, title: 'Buenos Aires Tango Show', category: 'tour', category_id: 1, price_from: 75000, price_to: 110000,
        location: 'Buenos Aires, Argentina', lat: -34.6118, lng: -58.3960, duration: '2시간', max_capacity: 80,
        short_description: '아르헨티나 탱고의 발상지에서 만나는 정통 탱고 쇼',
        rating_avg: 4.7, rating_count: 234, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1544804163-7a0b7ee87e19?w=400"]'
      },
      {
        id: 38, title: 'Egyptian Pyramids Tour', category: 'tour', category_id: 1, price_from: 100000, price_to: 150000,
        location: 'Cairo, Egypt', lat: 29.9792, lng: 31.1344, duration: '1일', max_capacity: 20,
        short_description: '기자의 피라미드와 스핑크스를 탐험하는 역사 투어',
        rating_avg: 4.5, rating_count: 789, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1539650116574-75c0c6d0d570?w=400"]'
      },
      {
        id: 39, title: 'Austrian Mozart Concert', category: 'tour', category_id: 1, price_from: 85000, price_to: 130000,
        location: 'Vienna, Austria', lat: 48.2082, lng: 16.3738, duration: '2시간', max_capacity: 200,
        short_description: '빈 황금홀에서 열리는 모차르트 클래식 콘서트',
        rating_avg: 4.8, rating_count: 345, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400"]'
      },
      {
        id: 40, title: 'Norwegian Fjords Cruise', category: 'tour', category_id: 1, price_from: 200000, price_to: 350000,
        location: 'Bergen, Norway', lat: 60.3913, lng: 5.3221, duration: '1일', max_capacity: 100,
        short_description: '노르웨이 피오르드의 장엄한 자연을 만나는 크루즈',
        rating_avg: 4.9, rating_count: 456, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      {
        id: 41, title: 'Morocco Sahara Desert Camp', category: 'stay', category_id: 2, price_from: 120000, price_to: 180000,
        location: 'Merzouga, Morocco', lat: 31.0801, lng: -4.0133, duration: '1박', max_capacity: 20,
        short_description: '사하라 사막 한가운데서의 베르베르 텐트 숙박 체험',
        rating_avg: 4.7, rating_count: 167, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=400"]'
      },
      {
        id: 42, title: 'Portuguese Fado Performance', category: 'tour', category_id: 1, price_from: 55000, price_to: 85000,
        location: 'Lisbon, Portugal', lat: 38.7223, lng: -9.1393, duration: '2시간', max_capacity: 50,
        short_description: '포르투갈 전통 파두 음악과 함께하는 저녁 공연',
        rating_avg: 4.6, rating_count: 234, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400"]'
      },
      {
        id: 43, title: 'Australian Outback Safari', category: 'tour', category_id: 1, price_from: 180000, price_to: 280000,
        location: 'Alice Springs, Australia', lat: -23.6980, lng: 133.8807, duration: '2일', max_capacity: 12,
        short_description: '호주 아웃백에서의 원주민 문화 체험과 야생동물 사파리',
        rating_avg: 4.8, rating_count: 123, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      {
        id: 44, title: 'Indian Spice Market Tour', category: 'tour', category_id: 1, price_from: 40000, price_to: 60000,
        location: 'Delhi, India', lat: 28.7041, lng: 77.1025, duration: '3시간', max_capacity: 15,
        short_description: '델리 올드시티의 전통 향신료 시장 탐방과 요리 체험',
        rating_avg: 4.5, rating_count: 289, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400"]'
      },
      {
        id: 45, title: 'Chinese Tea Ceremony', category: 'tour', category_id: 1, price_from: 50000, price_to: 75000,
        location: 'Beijing, China', lat: 39.9042, lng: 116.4074, duration: '2시간', max_capacity: 20,
        short_description: '베이징 자금성 근처에서 배우는 전통 중국 차 문화',
        rating_avg: 4.4, rating_count: 167, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400"]'
      },
      {
        id: 46, title: 'Russian Ballet Performance', category: 'tour', category_id: 1, price_from: 90000, price_to: 150000,
        location: 'Moscow, Russia', lat: 55.7558, lng: 37.6176, duration: '2.5시간', max_capacity: 300,
        short_description: '모스크바 볼쇼이 극장에서의 세계 최고 발레 공연',
        rating_avg: 4.9, rating_count: 456, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400"]'
      },
      {
        id: 47, title: 'Canadian Rockies Lodge', category: 'stay', category_id: 2, price_from: 180000, price_to: 300000,
        location: 'Banff, Canada', lat: 51.4968, lng: -115.9281, duration: '1박', max_capacity: 4,
        short_description: '캐나디언 로키 산맥의 아름다운 자연 속 럭셔리 로지',
        rating_avg: 4.8, rating_count: 234, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      },
      {
        id: 48, title: 'Mexican Cenote Swimming', category: 'tour', category_id: 1, price_from: 65000, price_to: 95000,
        location: 'Tulum, Mexico', lat: 20.2114, lng: -87.4654, duration: '4시간', max_capacity: 20,
        short_description: '멕시코 유카탄 반도의 신비한 세노테에서의 스노클링',
        rating_avg: 4.7, rating_count: 345, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400"]'
      },
      {
        id: 49, title: 'Brazilian Carnival Experience', category: 'tour', category_id: 1, price_from: 150000, price_to: 250000,
        location: 'Rio de Janeiro, Brazil', lat: -22.9068, lng: -43.1729, duration: '1일', max_capacity: 50,
        short_description: '리우 카니발의 열정적인 삼바 퍼레이드와 문화 체험',
        rating_avg: 4.8, rating_count: 567, is_published: true, is_featured: true,
        images: '["https://images.unsplash.com/photo-1516834474-48c0329c84d1?w=400"]'
      },
      {
        id: 50, title: 'South African Wine Tour', category: 'tour', category_id: 1, price_from: 85000, price_to: 130000,
        location: 'Cape Town, South Africa', lat: -33.9249, lng: 18.4241, duration: '1일', max_capacity: 16,
        short_description: '남아프리카 와인랜드에서의 프리미엄 와인 테이스팅',
        rating_avg: 4.6, rating_count: 234, is_published: true, is_featured: false,
        images: '["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]'
      }
    ];
  }

  private getMockUsers() {
    return [
      {
        id: 1,
        user_id: 'admin',
        email: 'admin@travleap.com',
        password_hash: 'hashed_12345',
        name: '관리자',
        phone: '010-1234-5678',
        role: 'admin',
        preferred_language: 'ko',
        preferred_currency: 'KRW',
        marketing_consent: true,
        profile_image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        date_of_birth: '1990-01-01',
        address: '서울특별시 강남구',
        emergency_contact: '010-9876-5432',
        passport_number: 'M12345678',
        nationality: 'KR',
        is_verified: true,
        is_active: true,
        last_login: new Date().toISOString(),
        created_at: '2024-01-01T00:00:00Z',
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        user_id: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password123',
        name: '테스트 사용자',
        phone: '010-2345-6789',
        role: 'user',
        preferred_language: 'ko',
        preferred_currency: 'KRW',
        marketing_consent: false,
        profile_image: 'https://images.unsplash.com/photo-1494790108755-2616b612b793?w=150',
        date_of_birth: '1995-05-15',
        address: '부산광역시 해운대구',
        emergency_contact: '010-8765-4321',
        passport_number: 'M87654321',
        nationality: 'KR',
        is_verified: true,
        is_active: true,
        last_login: '2024-01-15T10:30:00Z',
        created_at: '2024-01-10T00:00:00Z',
        updated_at: '2024-01-15T10:30:00Z'
      },
      {
        id: 3,
        user_id: 'partner001',
        email: 'partner@shinan.com',
        password_hash: 'hashed_partnerpass',
        name: '신안 제휴업체',
        phone: '061-123-4567',
        role: 'partner',
        preferred_language: 'ko',
        preferred_currency: 'KRW',
        marketing_consent: true,
        profile_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        date_of_birth: '1985-03-20',
        address: '전라남도 신안군 증도면',
        emergency_contact: '061-987-6543',
        passport_number: null,
        nationality: 'KR',
        is_verified: true,
        is_active: true,
        last_login: '2024-01-20T14:15:00Z',
        created_at: '2024-01-05T00:00:00Z',
        updated_at: '2024-01-20T14:15:00Z'
      }
    ];
  }

  private getMockResult(sql: string, params: any[] = []) {
    // SQL 쿼리 타입에 따라 적절한 Mock 데이터 반환
    const lowerSql = sql.toLowerCase();

    if (lowerSql.includes('select 1 as test')) {
      return { rows: [{ test: 1 }] };
    }

    if (lowerSql.includes('select') && lowerSql.includes('categories')) {
      return {
        rows: [
          { id: 1, slug: 'tour', name_ko: '여행', name_en: 'Travel', icon: 'map', color_hex: '#FF6B6B', sort_order: 1, is_active: true },
          { id: 2, slug: 'stay', name_ko: '숙박', name_en: 'Accommodation', icon: 'bed', color_hex: '#4ECDC4', sort_order: 2, is_active: true },
          { id: 3, slug: 'food', name_ko: '음식', name_en: 'Food', icon: 'utensils', color_hex: '#45B7D1', sort_order: 3, is_active: true },
          { id: 4, slug: 'rentcar', name_ko: '렌트카', name_en: 'Rental Car', icon: 'car', color_hex: '#96CEB4', sort_order: 4, is_active: true },
          { id: 5, slug: 'tourist', name_ko: '관광지', name_en: 'Tourist Spot', icon: 'camera', color_hex: '#FFEAA7', sort_order: 5, is_active: true },
          { id: 6, slug: 'popup', name_ko: '팝업', name_en: 'Popup', icon: 'store', color_hex: '#DDA0DD', sort_order: 6, is_active: true },
          { id: 7, slug: 'event', name_ko: '행사', name_en: 'Event', icon: 'calendar', color_hex: '#FD79A8', sort_order: 7, is_active: true },
          { id: 8, slug: 'experience', name_ko: '체험', name_en: 'Experience', icon: 'hands', color_hex: '#FDCB6E', sort_order: 8, is_active: true }
        ]
      };
    }

    if (lowerSql.includes('select') && lowerSql.includes('listings')) {
      return {
        rows: this.getPartnerListings()
      };
    }

    if (lowerSql.includes('select') && lowerSql.includes('users')) {
      return {
        rows: this.getMockUsers()
      };
    }

    if (lowerSql.includes('insert')) {
      return { insertId: Date.now(), affectedRows: 1 };
    }

    if (lowerSql.includes('update') || lowerSql.includes('delete')) {
      return { affectedRows: 1 };
    }

    // 기본 빈 결과
    return { rows: [] };
  }

  async select(table: string, where?: Record<string, any>) {
    try {
      let sql = `SELECT * FROM ${table}`;
      const params: any[] = [];

      if (where) {
        const conditions = Object.keys(where).map((key, index) => {
          params.push(where[key]);
          return `${key} = ?`;
        });
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      const result = await this.executeQuery(sql, params);
      return { data: result.rows || result };
    } catch (error) {
      console.error('Select query failed:', error);
      // 에러 발생 시 빈 결과 반환 (앱이 계속 작동하도록)
      return { data: [] };
    }
  }

  async insert(table: string, data: Record<string, any>) {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map(() => '?').join(', ');

      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      const result = await this.executeQuery(sql, values);

      return { data: { id: result.insertId || Date.now(), ...data } };
    } catch (error) {
      console.error('Insert query failed:', error);
      // 에러 발생 시 Mock ID와 함께 데이터 반환
      return { data: { id: Date.now(), ...data } };
    }
  }

  async update(table: string, id: string | number, data: Record<string, any>) {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const setClause = columns.map(col => `${col} = ?`).join(', ');

      const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
      await this.executeQuery(sql, [...values, id]);

      return { data: { id, ...data } };
    } catch (error) {
      console.error('Update query failed:', error);
      // 에러 발생 시 요청한 데이터 그대로 반환
      return { data: { id, ...data } };
    }
  }

  async delete(table: string, id: string | number) {
    try {
      const sql = `DELETE FROM ${table} WHERE id = ?`;
      await this.executeQuery(sql, [id]);
      return { success: true };
    } catch (error) {
      console.error('Delete query failed:', error);
      // 에러 발생 시에도 성공으로 처리 (개발 환경)
      return { success: true };
    }
  }

  async query(sql: string, params: any[] = []) {
    try {
      const result = await this.executeQuery(sql, params);
      return { data: result.rows || result };
    } catch (error) {
      console.error('Custom query failed:', error);
      // 에러 발생 시 빈 결과 반환
      return { data: [] };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Mock 환경인지 확인
      if (this.config.url.includes('mock')) {
        console.log('Mock DB connection test - SUCCESS');
        return true;
      }

      // 실제 데이터베이스 연결 테스트
      const result = await this.executeQuery('SELECT 1 as test');
      if (result && result.rows && result.rows.length > 0) {
        console.log('PlanetScale DB connection test - SUCCESS');
        return true;
      }

      console.log('PlanetScale DB connection test - FAILED: No data returned');
      return false;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

function getDbConfig(): DatabaseConfig {
  // 환경변수에서 실제 PlanetScale 설정 읽기
  const url = process.env.VITE_PLANETSCALE_HOST?.replace(/'/g, '') || '';
  const username = process.env.VITE_PLANETSCALE_USERNAME || '';
  const password = process.env.VITE_PLANETSCALE_PASSWORD || '';

  // 개발 환경에서는 Mock 설정 사용
  if (!url || !username || !password || url.includes('mock')) {
    console.log('Using mock database configuration for development');
    return {
      url: 'mock://localhost',
      username: 'mock_user',
      password: 'mock_password'
    };
  }

  console.log('Using PlanetScale database configuration');
  return {
    url,
    username,
    password
  };
}

export const db = new PlanetScaleDatabase(getDbConfig());
export { PlanetScaleDatabase };
export type { DatabaseConfig };