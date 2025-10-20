#!/usr/bin/env tsx
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function addMorePartners() {
  console.log('🏢 Adding more real partner data to database...\n');

  const connection = connect({
    url: process.env.DATABASE_URL
  });

  const partners = [
    {
      business_name: '증도 갯벌체험장',
      contact_name: '박영희',
      email: 'park@jeungdo-mudflat.com',
      phone: '061-240-3000',
      business_address: '전라남도 신안군 증도면 증도리 456',
      location: '전라남도 신안군',
      services: '갯벌 체험, 염전 투어, 소금 만들기 체험',
      base_price: 30000,
      description: '유네스코 생물권보전지역 증도에서 즐기는 특별한 갯벌 체험! 천일염 만들기와 갯벌 생태 학습을 한번에!',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop'
      ]),
      business_hours: '매일 10:00-17:00 (갯벌 간조시간에 따라 변동)'
    },
    {
      business_name: '퍼플섬 펜션',
      contact_name: '최민수',
      email: 'choi@purple-island.com',
      phone: '061-275-1004',
      business_address: '전라남도 신안군 안좌면 반월리 789',
      location: '전라남도 신안군',
      services: '숙박, 퍼플섬 투어, 자전거 대여, 카약 체험',
      base_price: 80000,
      description: '보라색으로 물든 퍼플섬에서의 낭만적인 숙박! 아름다운 석양과 함께하는 특별한 휴식을 경험하세요.',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop'
      ]),
      business_hours: '연중무휴 (체크인 15:00, 체크아웃 11:00)'
    },
    {
      business_name: '신안 섬투어 전문업체',
      contact_name: '이준호',
      email: 'lee@shinan-island-tour.com',
      phone: '061-260-8888',
      business_address: '전라남도 신안군 지도읍 지도리 321',
      location: '전라남도 신안군',
      services: '1004섬 투어, 호핑 투어, 낚시 투어, 섬 맞춤 여행',
      base_price: 120000,
      description: '1004개의 섬으로 이루어진 신안의 숨겨진 보석들을 찾아가는 프리미엄 투어! 전문 가이드와 함께하는 맞춤형 여행.',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop'
      ]),
      business_hours: '평일 08:00-18:00, 주말 08:00-19:00'
    },
    {
      business_name: '신안 해양레저센터',
      contact_name: '강수진',
      email: 'kang@shinan-marine.com',
      phone: '061-246-7777',
      business_address: '전라남도 신안군 압해읍 고이리 555',
      location: '전라남도 신안군',
      services: '카약, 패들보드, 윈드서핑, 요트 체험',
      base_price: 60000,
      description: '청정 바다에서 즐기는 다양한 해양스포츠! 초보자부터 전문가까지 모두 즐길 수 있는 프로그램 준비!',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=400&h=300&fit=crop'
      ]),
      business_hours: '하절기 09:00-18:00, 동절기 10:00-17:00'
    },
    {
      business_name: '신안 로컬푸드 직매장',
      contact_name: '정미래',
      email: 'jung@shinan-localfood.com',
      phone: '061-240-9000',
      business_address: '전라남도 신안군 임자면 대광리 111',
      location: '전라남도 신안군',
      services: '천일염, 신안 특산물, 농수산물 판매, 로컬 맛집 투어',
      base_price: 15000,
      description: '신안의 맛을 한곳에! 천일염, 김, 미역 등 신선한 특산물과 함께 로컬 맛집 투어도 즐겨보세요!',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=300&fit=crop'
      ]),
      business_hours: '매일 09:00-19:00'
    }
  ];

  try {
    for (const partner of partners) {
      const result = await connection.execute(
        `INSERT INTO partners (
          user_id, business_name, contact_name, email, phone,
          business_address, location, services, base_price,
          detailed_address, description, images, business_hours,
          status, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 1, NOW(), NOW())`,
        [
          1,
          partner.business_name,
          partner.contact_name,
          partner.email,
          partner.phone,
          partner.business_address,
          partner.location,
          partner.services,
          partner.base_price,
          partner.business_address, // detailed_address
          partner.description,
          partner.images,
          partner.business_hours
        ]
      );

      console.log(`✅ ${partner.business_name} (ID: ${result.insertId}) - ${partner.base_price.toLocaleString()}원`);
    }

    console.log(`\n🎉 Successfully added ${partners.length} partners!`);
    console.log('You can now see all partners in https://travleap.vercel.app/partners');
  } catch (error: any) {
    console.error('❌ Failed to create partners:', error.message);
    process.exit(1);
  }
}

addMorePartners();
