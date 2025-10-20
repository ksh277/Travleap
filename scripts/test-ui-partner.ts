#!/usr/bin/env tsx
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function testUIPartner() {
  console.log('🧪 Testing partner creation with UI data...\n');

  const connection = connect({
    url: process.env.DATABASE_URL
  });

  // 사용자가 UI에서 입력한 데이터 그대로
  const partner = {
    business_name: '신안집',
    contact_name: '신안지',
    email: 'ASD@gmail.com',
    phone: '01012345678',
    business_address: '전남 신안군 신의면 가락길 9',
    location: '전남 신안군',
    services: '구경',
    base_price: 3000,
    detailed_address: '전남 신안군 신의면 가락길 9',
    description: '구경 관리',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' // Preview 1
    ]),
    business_hours: '09:00 ~ 15:00'
  };

  try {
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
        partner.detailed_address,
        partner.description,
        partner.images,
        partner.business_hours
      ]
    );

    console.log('✅ Partner created successfully with UI data!');
    console.log(`Partner ID: ${result.insertId}`);
    console.log('\n📋 Data stored:');
    console.log(`  업체명: ${partner.business_name}`);
    console.log(`  담당자명: ${partner.contact_name}`);
    console.log(`  이메일: ${partner.email}`);
    console.log(`  전화번호: ${partner.phone}`);
    console.log(`  주소: ${partner.business_address}`);
    console.log(`  지역: ${partner.location}`);
    console.log(`  제공 서비스: ${partner.services}`);
    console.log(`  기본 가격: ${partner.base_price.toLocaleString()}원`);
    console.log(`  업체 설명: ${partner.description}`);
    console.log(`  영업시간: ${partner.business_hours}`);
    console.log(`  이미지: ${JSON.parse(partner.images).length}개`);

    console.log('\n🎉 이제 https://travleap.vercel.app/partners 에서 확인할 수 있습니다!');
    console.log(`직접 상세페이지: https://travleap.vercel.app/partners/${result.insertId}`);
  } catch (error: any) {
    console.error('\n❌ Failed to create partner:', error.message);
    process.exit(1);
  }
}

testUIPartner();
