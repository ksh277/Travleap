/**
 * 숙박 관련 테이블 상세 점검
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkLodgingTables() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('숙박 관련 테이블 상세 점검');
  console.log('========================================\n');

  // 1. lodging_bookings 테이블
  console.log('🔍 1. lodging_bookings 테이블\n');
  try {
    const desc = await conn.execute('DESCRIBE lodging_bookings');
    console.log('✅ 테이블 존재 확인');

    const columns = desc.rows.map(r => r.Field);
    console.log('\n📋 전체 컬럼 목록:');
    desc.rows.forEach(row => {
      console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    // 필수 컬럼 확인
    const requiredColumns = ['id', 'user_id', 'booking_number', 'listing_id', 'room_type_id', 'check_in', 'check_out', 'total_amount', 'booking_status'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));

    console.log('\n필수 컬럼 체크:');
    if (missingColumns.length > 0) {
      console.log(`⚠️  누락된 필수 컬럼: ${missingColumns.join(', ')}`);
    } else {
      console.log('✅ 필수 컬럼 모두 존재');
    }

    // 데이터 확인
    const count = await conn.execute('SELECT COUNT(*) as count FROM lodging_bookings');
    console.log(`\n📊 총 레코드 수: ${count.rows[0].count}`);

    if (count.rows[0].count === 0) {
      console.log('🔍 데이터 없음 - 아직 숙박 예약이 없음');
    }

  } catch (error) {
    console.log(`❌ 테이블 조회 실패: ${error.message}`);
  }

  // 2. room_types 테이블
  console.log('\n\n🔍 2. room_types 테이블\n');
  try {
    const desc = await conn.execute('DESCRIBE room_types');
    console.log('✅ 테이블 존재 확인');

    console.log('\n📋 전체 컬럼 목록:');
    desc.rows.forEach(row => {
      console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    const count = await conn.execute('SELECT COUNT(*) as count FROM room_types');
    console.log(`\n📊 총 레코드 수: ${count.rows[0].count}`);

    if (count.rows[0].count > 0) {
      const sample = await conn.execute('SELECT * FROM room_types LIMIT 1');
      console.log('\n📄 샘플 데이터:');
      console.log(JSON.stringify(sample.rows[0], null, 2));
    } else {
      console.log('⚠️  데이터 없음 - 객실 타입 데이터 필수');
    }

  } catch (error) {
    console.log(`❌ 테이블 조회 실패: ${error.message}`);
  }

  // 3. lodging_partners 확인 (listings 또는 별도 테이블)
  console.log('\n\n🔍 3. 숙박 파트너 데이터 확인\n');

  // listings 테이블에서 숙박 카테고리 확인
  try {
    const partners = await conn.execute(`
      SELECT
        id,
        title,
        category,
        partner_id,
        location,
        price_from,
        is_active,
        created_at
      FROM listings
      WHERE category IN ('숙박', 'accommodation', 'stay', 'lodging')
      ORDER BY created_at DESC
    `);

    console.log(`📊 listings 테이블의 숙박 시설: ${partners.rows.length}건\n`);

    if (partners.rows.length > 0) {
      console.log('숙박 시설 목록:');
      partners.rows.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.title} (ID: ${p.id})`);
        console.log(`      - 카테고리: ${p.category}`);
        console.log(`      - 위치: ${p.location || '미지정'}`);
        console.log(`      - 가격: ${p.price_from?.toLocaleString()}원~`);
        console.log(`      - partner_id: ${p.partner_id || 'NULL'}`);
        console.log(`      - 활성화: ${p.is_active ? '예' : '아니오'}`);
        console.log('');
      });

      // partner_id가 NULL인 경우 확인
      const nullPartners = partners.rows.filter(p => p.partner_id === null);
      if (nullPartners.length > 0) {
        console.log(`⚠️  partner_id가 NULL인 숙박 시설: ${nullPartners.length}건`);
        console.log('   → listings 테이블이 직접 숙박 시설을 관리하고 있음 (별도 파트너 테이블 불필요)');
      }

    } else {
      console.log('⚠️  숙박 시설 데이터 없음');
    }

  } catch (error) {
    console.log(`❌ 조회 실패: ${error.message}`);
  }

  // 4. room_inventory 테이블
  console.log('\n\n🔍 4. room_inventory 테이블\n');
  try {
    const desc = await conn.execute('DESCRIBE room_inventory');
    console.log('✅ 테이블 존재 확인');

    console.log('\n📋 주요 컬럼:');
    const importantCols = desc.rows.filter(r =>
      r.Field.includes('id') ||
      r.Field.includes('room') ||
      r.Field.includes('listing') ||
      r.Field.includes('date') ||
      r.Field.includes('available') ||
      r.Field.includes('price') ||
      r.Field.includes('status')
    );

    importantCols.forEach(row => {
      console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''}`);
    });

    const count = await conn.execute('SELECT COUNT(*) as count FROM room_inventory');
    console.log(`\n📊 총 레코드 수: ${count.rows[0].count}`);

    if (count.rows[0].count > 0) {
      const sample = await conn.execute('SELECT * FROM room_inventory LIMIT 1');
      console.log('\n📄 샘플 데이터:');
      console.log(JSON.stringify(sample.rows[0], null, 2));
    } else {
      console.log('🔍 데이터 없음 - 재고 데이터 미설정');
    }

  } catch (error) {
    console.log(`❌ 테이블 조회 실패: ${error.message}`);
  }

  // 5. 예약 시스템 비교 - bookings vs lodging_bookings
  console.log('\n\n🔍 5. 예약 시스템 비교\n');

  try {
    // bookings 테이블 확인
    const bookingsDesc = await conn.execute('DESCRIBE bookings');
    const bookingsColumns = bookingsDesc.rows.map(r => r.Field);

    console.log('📋 bookings 테이블 (범용 예약):');
    const importantBookingCols = bookingsColumns.filter(col =>
      col.includes('id') ||
      col.includes('listing') ||
      col.includes('user') ||
      col.includes('amount') ||
      col.includes('status') ||
      col.includes('category')
    );
    console.log(`   주요 컬럼: ${importantBookingCols.join(', ')}`);

    const bookingsCount = await conn.execute('SELECT COUNT(*) as count FROM bookings');
    console.log(`   레코드 수: ${bookingsCount.rows[0].count}건`);

    // 카테고리별 분포
    if (bookingsColumns.includes('category')) {
      const categoryDist = await conn.execute(`
        SELECT category, COUNT(*) as count
        FROM bookings
        WHERE category IS NOT NULL
        GROUP BY category
      `);

      if (categoryDist.rows.length > 0) {
        console.log('   카테고리 분포:');
        categoryDist.rows.forEach(row => {
          console.log(`      - ${row.category || '(NULL)'}: ${row.count}건`);
        });
      }
    }

    // listing_id 분석
    if (bookingsColumns.includes('listing_id')) {
      const lodgingBookings = await conn.execute(`
        SELECT COUNT(*) as count
        FROM bookings b
        INNER JOIN listings l ON b.listing_id = l.id
        WHERE l.category IN ('숙박', 'accommodation', 'stay', 'lodging')
      `);

      console.log(`\n   💡 bookings 테이블의 숙박 예약: ${lodgingBookings.rows[0].count}건`);
      console.log(`      (listings 테이블과 조인하여 카테고리 확인)`);
    }

    console.log('\n📋 lodging_bookings 테이블 (숙박 전용):');
    const lodgingCount = await conn.execute('SELECT COUNT(*) as count FROM lodging_bookings');
    console.log(`   레코드 수: ${lodgingCount.rows[0].count}건`);

    console.log('\n💡 분석:');
    if (lodgingCount.rows[0].count === 0 && bookingsCount.rows[0].count > 0) {
      console.log('   → bookings 테이블을 범용 예약 시스템으로 사용 중');
      console.log('   → lodging_bookings는 아직 미사용 (향후 전용 시스템으로 전환 가능성)');
    } else if (lodgingCount.rows[0].count > 0 && bookingsCount.rows[0].count > 0) {
      console.log('   → 두 테이블 모두 사용 중 (이중 관리 가능성)');
      console.log('   ⚠️  데이터 정합성 확인 필요');
    } else if (lodgingCount.rows[0].count > 0) {
      console.log('   → lodging_bookings를 전용 예약 시스템으로 사용 중');
    }

  } catch (error) {
    console.log(`❌ 조회 실패: ${error.message}`);
  }

  // 6. 데이터 무결성 - 외래키 참조
  console.log('\n\n🔍 6. 데이터 무결성 점검\n');

  try {
    // lodging_bookings의 고아 레코드 확인
    const lodgingCount = await conn.execute('SELECT COUNT(*) as count FROM lodging_bookings');

    if (lodgingCount.rows[0].count > 0) {
      console.log('lodging_bookings 참조 무결성:');

      // listing_id 참조
      const orphanListings = await conn.execute(`
        SELECT COUNT(*) as count
        FROM lodging_bookings lb
        LEFT JOIN listings l ON lb.listing_id = l.id
        WHERE l.id IS NULL AND lb.listing_id IS NOT NULL
      `);

      if (orphanListings.rows[0].count > 0) {
        console.log(`   ⚠️  존재하지 않는 listing_id 참조: ${orphanListings.rows[0].count}건`);
      } else {
        console.log(`   ✅ listing_id 참조 무결성 정상`);
      }

      // room_type_id 참조
      const orphanRoomTypes = await conn.execute(`
        SELECT COUNT(*) as count
        FROM lodging_bookings lb
        LEFT JOIN room_types rt ON lb.room_type_id = rt.id
        WHERE rt.id IS NULL AND lb.room_type_id IS NOT NULL
      `);

      if (orphanRoomTypes.rows[0].count > 0) {
        console.log(`   ⚠️  존재하지 않는 room_type_id 참조: ${orphanRoomTypes.rows[0].count}건`);
      } else {
        console.log(`   ✅ room_type_id 참조 무결성 정상`);
      }

    } else {
      console.log('✅ lodging_bookings에 데이터 없음 - 참조 무결성 문제 없음');
    }

    // bookings의 숙박 관련 참조 무결성
    const bookingsLodging = await conn.execute(`
      SELECT COUNT(*) as count
      FROM bookings b
      INNER JOIN listings l ON b.listing_id = l.id
      WHERE l.category IN ('숙박', 'accommodation', 'stay', 'lodging')
    `);

    if (bookingsLodging.rows[0].count > 0) {
      console.log(`\nbookings 테이블의 숙박 예약 (${bookingsLodging.rows[0].count}건):`);

      const orphanListings = await conn.execute(`
        SELECT COUNT(*) as count
        FROM bookings b
        INNER JOIN listings l ON b.listing_id = l.id
        LEFT JOIN listings check_l ON b.listing_id = check_l.id
        WHERE l.category IN ('숙박', 'accommodation', 'stay', 'lodging')
          AND check_l.id IS NULL
      `);

      if (orphanListings.rows[0].count > 0) {
        console.log(`   ⚠️  존재하지 않는 listing_id 참조: ${orphanListings.rows[0].count}건`);
      } else {
        console.log(`   ✅ listing_id 참조 무결성 정상`);
      }
    }

  } catch (error) {
    console.log(`❌ 조회 실패: ${error.message}`);
  }

  // 7. listing_accommodation 테이블 확인
  console.log('\n\n🔍 7. listing_accommodation 테이블 (상세 정보)\n');
  try {
    const desc = await conn.execute('DESCRIBE listing_accommodation');
    console.log('✅ 테이블 존재 확인');

    console.log('\n📋 컬럼 목록:');
    desc.rows.forEach(row => {
      console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''}`);
    });

    const count = await conn.execute('SELECT COUNT(*) as count FROM listing_accommodation');
    console.log(`\n📊 총 레코드 수: ${count.rows[0].count}`);

    if (count.rows[0].count > 0) {
      const sample = await conn.execute('SELECT * FROM listing_accommodation LIMIT 1');
      console.log('\n📄 샘플 데이터:');
      console.log(JSON.stringify(sample.rows[0], null, 2));

      // listings와의 연결 확인
      const linked = await conn.execute(`
        SELECT COUNT(*) as count
        FROM listing_accommodation la
        INNER JOIN listings l ON la.listing_id = l.id
      `);

      console.log(`\n💡 listings 테이블과 연결된 레코드: ${linked.rows[0].count}/${count.rows[0].count}건`);

      if (linked.rows[0].count < count.rows[0].count) {
        console.log(`⚠️  연결되지 않은 레코드: ${count.rows[0].count - linked.rows[0].count}건`);
      }
    } else {
      console.log('🔍 데이터 없음 - 숙박 상세 정보 미설정');
    }

  } catch (error) {
    console.log(`❌ 테이블 조회 실패: ${error.message}`);
  }

  console.log('\n========================================');
  console.log('숙박 테이블 점검 완료');
  console.log('========================================\n');
}

checkLodgingTables().catch(console.error);
