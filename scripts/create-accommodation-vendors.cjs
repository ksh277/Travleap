const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function createAccommodationVendors() {
  console.log('🏨 숙박 업체 샘플 데이터 생성 중...\n');

  const vendors = [
    {
      business_name: '제주 오션뷰 호텔',
      contact_name: '김호텔',
      email: 'jeju.ocean@example.com',
      phone: '064-123-4567',
      description: '제주 바다가 한눈에 보이는 프리미엄 호텔',
      check_in_time: '15:00:00',
      check_out_time: '11:00:00'
    },
    {
      business_name: '서울 시티 호텔',
      contact_name: '이호텔',
      email: 'seoul.city@example.com',
      phone: '02-987-6543',
      description: '서울 도심 중심의 비즈니스 호텔',
      check_in_time: '14:00:00',
      check_out_time: '12:00:00'
    },
    {
      business_name: '부산 씨사이드 리조트',
      contact_name: '박리조트',
      email: 'busan.seaside@example.com',
      phone: '051-555-7777',
      description: '해운대 해변 바로 앞 프리미엄 리조트',
      check_in_time: '15:00:00',
      check_out_time: '11:00:00'
    }
  ];

  try {
    const createdVendors = [];

    for (const vendor of vendors) {
      const result = await connection.execute(`
        INSERT INTO partners (
          user_id,
          partner_type,
          business_name,
          contact_name,
          email,
          phone,
          description,
          check_in_time,
          check_out_time,
          status,
          is_active,
          tier,
          created_at,
          updated_at
        ) VALUES (
          1,
          'lodging',
          ?, ?, ?, ?, ?,
          ?, ?,
          'approved', 1, 'bronze',
          NOW(), NOW()
        )
      `, [
        vendor.business_name,
        vendor.contact_name,
        vendor.email,
        vendor.phone,
        vendor.description,
        vendor.check_in_time,
        vendor.check_out_time
      ]);

      createdVendors.push({
        id: result.insertId,
        ...vendor
      });

      console.log(`✅ ${vendor.business_name} (ID: ${result.insertId})`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 숙박 업체 3개 생성 완료!\n');

    console.log('📋 생성된 업체:');
    createdVendors.forEach(v => {
      console.log(`  ID ${v.id}: ${v.business_name}`);
      console.log(`    담당자: ${v.contact_name}`);
      console.log(`    연락처: ${v.phone}`);
      console.log(`    이메일: ${v.email}`);
      console.log();
    });

    console.log('🌐 관리자 페이지에서 확인:');
    console.log('  https://travelap.vercel.app/admin');
    console.log('  → 숙박 관리 탭');

  } catch (error) {
    console.error('❌ 에러:', error.message);
    throw error;
  }
}

createAccommodationVendors().then(() => {
  console.log('✅ 완료');
  process.exit(0);
}).catch(() => {
  console.error('❌ 실패');
  process.exit(1);
});
