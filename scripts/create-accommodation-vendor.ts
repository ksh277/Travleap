/**
 * 숙박 벤더 계정 생성 스크립트
 */

import { connect } from '@planetscale/database';
import dotenv from 'dotenv';

dotenv.config();

async function createAccommodationVendor() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL이 설정되지 않았습니다.');
    process.exit(1);
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🏨 숙박 벤더 계정 생성 시작...\n');

    // 1. user_id는 admin (1) 사용
    // users 테이블은 Neon DB에 있으므로 PlanetScale로 접근 불가
    const userId = 1; // admin user
    console.log(`✅ Admin 사용자 계정 사용 (ID: ${userId})`);
    console.log(`   ℹ️  users 테이블은 Neon DB에 있으므로 별도 관리 필요\n`);

    // 2. 숙박 벤더 생성 (PlanetScale)
    const vendorData = {
      business_name: '신안 바다뷰 펜션',
      business_number: '123-45-67890',
      contact_name: '홍길동',
      email: 'seaview@shinan.com',
      phone: '010-1234-5678',
      description: '신안 증도 앞바다가 보이는 아름다운 펜션입니다. 깨끗한 객실과 친절한 서비스를 제공합니다.'
    };

    const vendorResult = await connection.execute(
      `INSERT INTO partners (
        user_id,
        partner_type,
        business_name,
        business_number,
        contact_name,
        email,
        phone,
        description,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, 'lodging', ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        userId,
        vendorData.business_name,
        vendorData.business_number,
        vendorData.contact_name,
        vendorData.email,
        vendorData.phone,
        vendorData.description
      ]
    );

    const partnerId = vendorResult.insertId;
    console.log(`✅ 숙박 벤더 생성 완료 (ID: ${partnerId})\n`);

    // 3. 샘플 객실 3개 생성
    const rooms = [
      {
        name: '오션뷰 스위트',
        description: '바다가 한눈에 보이는 넓은 스위트룸',
        price: 180000,
        images: [
          'https://images.unsplash.com/photo-1566073771259-6a8506099945',
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'
        ]
      },
      {
        name: '디럭스 더블룸',
        description: '편안한 더블 침대가 있는 객실',
        price: 120000,
        images: [
          'https://images.unsplash.com/photo-1590490360182-c33d57733427',
          'https://images.unsplash.com/photo-1595576508898-0ad5c879a061'
        ]
      },
      {
        name: '스탠다드 트윈룸',
        description: '2인용 트윈 베드 객실',
        price: 90000,
        images: [
          'https://images.unsplash.com/photo-1611892440504-42a792e24d32',
          'https://images.unsplash.com/photo-1578683010236-d716f9a3f461'
        ]
      }
    ];

    console.log('🛏️  객실 생성 중...\n');

    for (const room of rooms) {
      const roomResult = await connection.execute(
        `INSERT INTO listings (
          partner_id,
          category_id,
          title,
          price_from,
          images,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, 1857, ?, ?, ?, 1, NOW(), NOW())`,
        [
          partnerId,
          room.name,
          room.price,
          JSON.stringify(room.images)
        ]
      );

      console.log(`  ✅ ${room.name} (₩${room.price.toLocaleString()}) - ID: ${roomResult.insertId}`);
    }

    console.log('\n🎉 모든 데이터 생성 완료!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 생성된 데이터 요약');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🏨 벤더명: ${vendorData.business_name}`);
    console.log(`📧 이메일: ${vendorData.email}`);
    console.log(`📞 연락처: ${vendorData.phone}`);
    console.log(`🆔 Partner ID: ${partnerId}`);
    console.log(`👤 User ID: ${userId}`);
    console.log(`🛏️  객실 수: ${rooms.length}개`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

createAccommodationVendor();
