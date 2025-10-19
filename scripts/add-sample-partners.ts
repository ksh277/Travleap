import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL });

async function addSamplePartners() {
  console.log('🤝 샘플 파트너 데이터 추가 중...\n');

  try {
    // 기존 샘플 파트너 삭제
    await connection.execute('DELETE FROM partners WHERE business_name LIKE "샘플%"');
    console.log('   ✅ 기존 샘플 파트너 삭제 완료');

    // 샘플 파트너 5개 추가
    const partners = [
      {
        user_id: 1,
        business_name: '샘플 렌트카 - 신안렌터카',
        contact_name: '김렌트',
        email: 'rentcar@sinan.com',
        phone: '010-1234-5678',
        lat: 34.9654,
        lng: 126.1234,
        services: '렌트카,차량대여',
        description: '신안 전 지역 렌트카 서비스. 신차 위주로 다양한 차량 보유. 전라남도 신안군 압해읍 압해로 123 위치',
        is_featured: 1,
        is_verified: 1,
        is_active: 1,
        tier: 'gold',
        status: 'approved'
      },
      {
        user_id: 1,
        business_name: '샘플 숙박 - 바다뷰 펜션',
        contact_name: '이숙박',
        email: 'ocean@sinan.com',
        phone: '010-2345-6789',
        lat: 34.9854,
        lng: 126.1434,
        services: '숙박,펜션',
        description: '증도 바다가 한눈에 보이는 오션뷰 펜션. 가족 단위 여행객 환영. 전라남도 신안군 증도면 바다로 456',
        is_featured: 1,
        is_verified: 1,
        is_active: 1,
        tier: 'gold',
        status: 'approved'
      },
      {
        user_id: 1,
        business_name: '샘플 투어 - 신안 섬투어',
        contact_name: '박투어',
        email: 'tour@sinan.com',
        phone: '010-3456-7890',
        lat: 34.9454,
        lng: 126.0834,
        services: '투어,체험',
        description: '신안의 아름다운 섬들을 한번에! 1004섬 투어 전문. 전라남도 신안군 지도읍 섬투어로 789',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'silver',
        status: 'approved'
      },
      {
        user_id: 1,
        business_name: '샘플 음식 - 신안 해산물',
        contact_name: '최맛집',
        email: 'seafood@sinan.com',
        phone: '010-4567-8901',
        lat: 35.0054,
        lng: 126.1634,
        services: '음식,맛집',
        description: '신안에서 잡은 신선한 해산물 요리 전문점. 전라남도 신안군 임자면 맛집로 321',
        is_featured: 0,
        is_verified: 1,
        is_active: 1,
        tier: 'bronze',
        status: 'approved'
      },
      {
        user_id: 1,
        business_name: '샘플 체험 - 소금밭 체험장',
        contact_name: '정체험',
        email: 'salt@sinan.com',
        phone: '010-5678-9012',
        lat: 34.9754,
        lng: 126.1334,
        services: '체험,관광',
        description: '천일염 만들기 체험, 염전 투어 프로그램 운영. 전라남도 신안군 증도면 소금로 654',
        is_featured: 1,
        is_verified: 1,
        is_active: 1,
        tier: 'silver',
        status: 'approved'
      }
    ];

    for (const partner of partners) {
      await connection.execute(
        `INSERT INTO partners
        (user_id, business_name, contact_name, email, phone, lat, lng, services, description, is_featured, is_verified, is_active, tier, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          partner.user_id,
          partner.business_name,
          partner.contact_name,
          partner.email,
          partner.phone,
          partner.lat,
          partner.lng,
          partner.services,
          partner.description,
          partner.is_featured,
          partner.is_verified,
          partner.is_active,
          partner.tier,
          partner.status
        ]
      );
      console.log(`   ✅ 파트너 추가: ${partner.business_name}`);
    }

    console.log('\n🎉 샘플 파트너 5개 추가 완료!');
    console.log('가맹점 페이지에서 확인해보세요: http://localhost:5173/partners\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

addSamplePartners();
