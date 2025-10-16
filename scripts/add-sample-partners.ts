import { db } from '../utils/database';

async function addSamplePartners() {
  try {
    console.log('🚀 Adding sample partners...');

    // 샘플 파트너 데이터 3개
    const samplePartners = [
      {
        company_name: '신안해상관광',
        business_number: '123-45-67890',
        representative_name: '김해상',
        email: 'info@shinan-marine.com',
        phone: '061-240-1234',
        address: '전라남도 신안군 지도읍 읍내리 123',
        category: '투어',
        description: '신안 섬 투어 전문 업체입니다. 홍도, 흑산도 등 아름다운 섬 투어를 제공합니다.',
        website: 'https://shinan-marine.com',
        status: 'active',
        commission_rate: 10.00
      },
      {
        company_name: '신안맛집',
        business_number: '234-56-78901',
        representative_name: '박맛집',
        email: 'contact@shinan-food.kr',
        phone: '061-240-5678',
        address: '전라남도 신안군 증도면 태평염전로 10',
        category: '음식',
        description: '신안 특산물을 이용한 건강한 한식 전문점입니다. 천일염 정식이 유명합니다.',
        website: 'https://shinan-food.kr',
        status: 'active',
        commission_rate: 8.00
      },
      {
        company_name: '신안펜션',
        business_number: '345-67-89012',
        representative_name: '이숙박',
        email: 'stay@shinan-pension.com',
        phone: '061-240-9012',
        address: '전라남도 신안군 임자면 진리 456',
        category: '숙박',
        description: '바다가 보이는 깨끗한 펜션입니다. 가족 단위 여행객에게 적합합니다.',
        website: 'https://shinan-pension.com',
        status: 'active',
        commission_rate: 12.00
      }
    ];

    // 데이터 삽입
    for (const partner of samplePartners) {
      const result = await db.execute(`
        INSERT INTO partners (
          company_name, business_number, representative_name,
          email, phone, address, category, description,
          website, status, commission_rate, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        partner.company_name,
        partner.business_number,
        partner.representative_name,
        partner.email,
        partner.phone,
        partner.address,
        partner.category,
        partner.description,
        partner.website,
        partner.status,
        partner.commission_rate
      ]);

      console.log(`✅ Added partner: ${partner.company_name} (ID: ${result.insertId})`);
    }

    // 추가된 파트너 확인
    const partners = await db.query('SELECT * FROM partners WHERE status = ?', ['active']);
    console.log(`\n📊 Total active partners: ${partners.length}`);
    console.log('\nPartner list:');
    partners.forEach((p: any) => {
      console.log(`  - ${p.company_name} (${p.category}) - ${p.phone}`);
    });

    console.log('\n🎉 Sample partners added successfully!');
  } catch (error) {
    console.error('❌ Error adding sample partners:', error);
    throw error;
  }
}

// 스크립트 실행
addSamplePartners()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
