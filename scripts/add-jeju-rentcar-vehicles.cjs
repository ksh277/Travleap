const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  const db = connect({ url: process.env.DATABASE_URL });

  console.log('🚗 제주 렌터카에 차량 3대 등록\n');

  // 1. 제주 렌터카 vendor_id 확인
  const vendorResult = await db.execute(`
    SELECT id, business_name, vendor_code FROM rentcar_vendors
    WHERE business_name = '제주 렌터카'
  `);

  if (!vendorResult.rows || vendorResult.rows.length === 0) {
    console.log('❌ 제주 렌터카를 찾을 수 없습니다.');
    process.exit(1);
  }

  const vendor = vendorResult.rows[0];
  const vendorId = vendor.id;
  console.log(`제주 렌터카 vendor_id: ${vendorId} (${vendor.vendor_code})\n`);

  // 2. 등록할 차량 3대 데이터
  const vehicles = [
    {
      name: '현대 아반떼',
      brand: '현대',
      model: '아반떼 CN7',
      vehicle_class: 'compact',
      seating_capacity: 5,
      fuel_type: 'gasoline',
      transmission: 'automatic',
      daily_rate_krw: 45000,
      deposit_krw: 100000,
      description: '제주 여행에 최적화된 준중형 세단입니다.',
      features: JSON.stringify(['블랙박스', '네비게이션', '후방카메라', '블루투스']),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800',
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800'
      ]),
      door_count: 4,
      large_bags: 2,
      small_bags: 2
    },
    {
      name: '기아 K5',
      brand: '기아',
      model: 'K5 DL3',
      vehicle_class: 'midsize',
      seating_capacity: 5,
      fuel_type: 'gasoline',
      transmission: 'automatic',
      daily_rate_krw: 55000,
      deposit_krw: 100000,
      description: '편안하고 넓은 중형 세단입니다.',
      features: JSON.stringify(['스마트 크루즈 컨트롤', 'HUD', '통풍시트', '열선시트', '네비게이션']),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800',
        'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800'
      ]),
      door_count: 4,
      large_bags: 3,
      small_bags: 2
    },
    {
      name: '현대 싼타페',
      brand: '현대',
      model: '싼타페 TM',
      vehicle_class: 'suv',
      seating_capacity: 7,
      fuel_type: 'diesel',
      transmission: 'automatic',
      daily_rate_krw: 85000,
      deposit_krw: 150000,
      description: '가족 여행에 완벽한 7인승 SUV입니다.',
      features: JSON.stringify(['전방위 카메라', '스마트 파킹', '파노라마 선루프', '3열 시트', '네비게이션']),
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800',
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800'
      ]),
      door_count: 4,
      large_bags: 4,
      small_bags: 3
    }
  ];

  console.log('차량 등록 중...\n');

  for (const vehicle of vehicles) {
    // 차량 코드 생성
    const vehicleCode = `${vendor.vendor_code}_${vehicle.vehicle_class.toUpperCase()}_${vehicle.model.split(' ')[0]}`;

    await db.execute(`
      INSERT INTO rentcar_vehicles (
        vendor_id, vehicle_code, display_name, brand, model, vehicle_class,
        seating_capacity, fuel_type, transmission, daily_rate_krw, deposit_amount_krw,
        features, images, door_count, large_bags, small_bags,
        is_active, year, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      vendorId,
      vehicleCode,
      vehicle.name, // display_name
      vehicle.brand,
      vehicle.model,
      vehicle.vehicle_class,
      vehicle.seating_capacity,
      vehicle.fuel_type,
      vehicle.transmission,
      vehicle.daily_rate_krw,
      vehicle.deposit_krw, // deposit_amount_krw
      vehicle.features,
      vehicle.images,
      vehicle.door_count,
      vehicle.large_bags,
      vehicle.small_bags,
      1, // is_active = true
      2024 // year
    ]);

    console.log(`✅ ${vehicle.name} (${vehicle.model}) - ${vehicle.daily_rate_krw.toLocaleString()}원/일`);
    console.log(`   └─ 차량코드: ${vehicleCode}`);
  }

  console.log('\n✅ 차량 3대 등록 완료!');

  // 최종 확인
  const result = await db.execute(`
    SELECT v.display_name, v.daily_rate_krw, rv.business_name as vendor_name
    FROM rentcar_vehicles v
    LEFT JOIN rentcar_vendors rv ON v.vendor_id = rv.id
    WHERE v.vendor_id = ?
  `, [vendorId]);

  console.log(`\n제주 렌터카 등록 차량: ${result.rows?.length || 0}대\n`);
  for (const v of result.rows || []) {
    console.log(`  - ${v.display_name}: ${parseInt(v.daily_rate_krw).toLocaleString()}원/일`);
  }

  process.exit(0);
})();
