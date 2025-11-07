const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
require('dotenv').config();

(async () => {
  try {
    const neonPool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });
    const planetscale = connect({ url: process.env.DATABASE_URL });

    console.log('🚗 새로운 렌트카 업체 생성:\n');

    const timestamp = Date.now();
    const email = `rentcar.jeju.${timestamp}@travleap.com`;
    const password = 'rentcar1234!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Neon에 사용자 생성
    console.log('1️⃣  Neon users 테이블에 사용자 생성...');
    const username = `jejurentcar_${timestamp}`;
    const userResult = await neonPool.query(`
      INSERT INTO users (username, email, password_hash, name, phone, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, email, name, role
    `, [username, email, hashedPassword, '제주 렌터카', '064-1234-5678', 'partner']);

    const userId = userResult.rows[0].id;
    console.log(`✅ 사용자 생성 완료: ID=${userId}, Email=${email}`);

    // 2. PlanetScale에 파트너 생성
    console.log('\n2️⃣  PlanetScale partners 테이블에 파트너 생성...');
    const partnerResult = await planetscale.execute(`
      INSERT INTO partners (
        user_id, business_name, partner_type, contact_name, email, phone,
        business_address, description, location, is_active, is_verified, is_featured,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      userId,
      '제주 렌터카',
      'rentcar',
      '제주 렌터카 대표',
      email,
      '064-1234-5678',
      '제주특별자치도 제주시 공항로 2',
      '제주공항 인근 최신 차량 보유, 24시간 픽업/반납 가능',
      '제주',
      1,
      1,
      0
    ]);

    const partnerId = partnerResult.insertId;
    console.log(`✅ 파트너 생성 완료: Partner ID=${partnerId}`);

    // 3. 차량 데이터 생성
    console.log('\n3️⃣  차량 데이터 생성...');

    const vehicles = [
      {
        title: '아반떼 (소형)',
        description: '연비가 좋은 경제적인 소형 세단. 제주 여행에 적합한 차량입니다.',
        price: 45000,
        imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
        capacity: 4,
        transmission: '자동',
        fuel: '가솔린',
        category: '소형'
      },
      {
        title: 'K5 (중형)',
        description: '넓은 실내 공간과 편안한 승차감의 중형 세단',
        price: 65000,
        imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800',
        capacity: 5,
        transmission: '자동',
        fuel: '가솔린',
        category: '중형'
      },
      {
        title: '쏘렌토 (SUV)',
        description: '넓은 트렁크와 승차감이 뛰어난 7인승 SUV',
        price: 85000,
        imageUrl: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800',
        capacity: 7,
        transmission: '자동',
        fuel: '디젤',
        category: 'SUV'
      },
      {
        title: '스타렉스 (승합)',
        description: '대가족/단체 여행에 최적, 넓은 공간의 12인승 승합차',
        price: 95000,
        imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
        capacity: 12,
        transmission: '자동',
        fuel: '디젤',
        category: '승합'
      },
      {
        title: '아이오닉5 (전기차)',
        description: '친환경 전기차, 넓은 실내와 첨단 기능',
        price: 75000,
        imageUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800',
        capacity: 5,
        transmission: '자동',
        fuel: '전기',
        category: '전기차'
      }
    ];

    for (const vehicle of vehicles) {
      const listingResult = await planetscale.execute(`
        INSERT INTO listings (
          category_id, partner_id, title, category, short_description, description_md,
          price_from, location, max_capacity, images, is_active,
          cart_enabled, has_options, created_at, updated_at
        ) VALUES (1856, ?, ?, 'rentcar', ?, ?, ?, ?, ?, ?, 1, 1, 1, NOW(), NOW())
      `, [
        partnerId,
        vehicle.title,
        vehicle.description,
        vehicle.description,
        vehicle.price,
        '제주',
        vehicle.capacity,
        JSON.stringify([vehicle.imageUrl])
      ]);

      console.log(`  ✅ ${vehicle.title} 생성 완료 (ID: ${listingResult.insertId}, ₩${vehicle.price.toLocaleString()}/일)`);
    }

    console.log('\n✅ 모든 작업 완료!');
    console.log('\n📋 로그인 정보:');
    console.log(`  이메일: ${email}`);
    console.log(`  비밀번호: ${password}`);
    console.log(`  업체명: 제주 렌터카`);
    console.log(`  파트너 ID: ${partnerId}`);
    console.log(`  차량 수: ${vehicles.length}대`);

    await neonPool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  process.exit(0);
})();
