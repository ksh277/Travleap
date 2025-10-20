#!/usr/bin/env tsx
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function addRealPartner() {
  console.log('🏢 Adding real partner data to database...\n');

  const connection = connect({
    url: process.env.DATABASE_URL
  });

  const partner = {
    user_id: 1,
    business_name: '신안 바다여행사',
    contact_name: '김철수',
    email: 'kim@shinan-travel.com',
    phone: '061-123-4567',
    business_address: '전라남도 신안군 지도읍 읍내리 123-45',
    location: '전라남도 신안군',
    services: '갯벌 체험, 섬 투어, 낚시 체험, 자전거 여행',
    base_price: 50000,
    detailed_address: '전라남도 신안군 지도읍 읍내리 123-45',
    description: '신안의 아름다운 섬들을 탐험하는 특별한 여행 경험을 제공합니다. 1004개의 섬으로 이루어진 신안의 매력을 느껴보세요.',
    images: JSON.stringify([
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop'
    ]),
    business_hours: '평일 09:00-18:00, 주말 09:00-17:00',
    status: 'approved',
    is_active: 1
  };

  try {
    const result = await connection.execute(
      `INSERT INTO partners (
        user_id, business_name, contact_name, email, phone,
        business_address, location, services, base_price,
        detailed_address, description, images, business_hours,
        status, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        partner.user_id,
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
        partner.business_hours,
        partner.status,
        partner.is_active
      ]
    );

    console.log('✅ Partner created successfully!');
    console.log(`Partner ID: ${result.insertId}`);
    console.log(`Business Name: ${partner.business_name}`);
    console.log(`Contact: ${partner.contact_name}`);
    console.log(`Location: ${partner.location}`);
    console.log(`Base Price: ${partner.base_price}원`);
    console.log('\n🎉 You can now see this partner in the UI!');
  } catch (error: any) {
    console.error('❌ Failed to create partner:', error.message);
    process.exit(1);
  }
}

addRealPartner();
