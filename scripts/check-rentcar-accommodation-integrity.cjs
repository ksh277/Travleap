/**
 * 렌트카 및 숙박 데이터베이스 스키마 및 데이터 무결성 점검
 * - 테이블 존재 여부
 * - 스키마 구조 (필수 컬럼, 데이터 타입)
 * - 외래키 제약조건
 * - 데이터 무결성 (NULL, 고아 레코드)
 * - 샘플 데이터 확인
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkIntegrity() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('렌트카 및 숙박 데이터베이스 무결성 점검');
  console.log('========================================\n');

  // ============================================
  // 1. 렌트카 관련 테이블 점검
  // ============================================
  console.log('\n📦 1. 렌트카 관련 테이블 점검');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1-1. rentcar_bookings 테이블
  console.log('🔍 1-1. rentcar_bookings 테이블');
  try {
    const bookingsDesc = await conn.execute('DESCRIBE rentcar_bookings');
    console.log('✅ 테이블 존재 확인');

    const columns = bookingsDesc.rows.map(r => r.Field);
    console.log('\n📋 컬럼 목록:');
    bookingsDesc.rows.forEach(row => {
      console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    // 필수 컬럼 확인
    const requiredColumns = ['id', 'user_id', 'booking_number', 'vehicle_id', 'vendor_id', 'pickup_date', 'return_date', 'total_amount', 'status'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    if (missingColumns.length > 0) {
      console.log(`⚠️  필수 컬럼 누락: ${missingColumns.join(', ')}`);
    } else {
      console.log('✅ 필수 컬럼 모두 존재');
    }

    // 데이터 샘플 확인
    const bookingsCount = await conn.execute('SELECT COUNT(*) as count FROM rentcar_bookings');
    console.log(`\n📊 총 레코드 수: ${bookingsCount.rows[0].count}`);

    if (bookingsCount.rows[0].count > 0) {
      const sampleBooking = await conn.execute('SELECT * FROM rentcar_bookings LIMIT 1');
      console.log('\n📄 샘플 데이터:');
      console.log(JSON.stringify(sampleBooking.rows[0], null, 2));

      // NULL 값 확인
      const nullCheck = await conn.execute(`
        SELECT
          SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as null_user_id,
          SUM(CASE WHEN vehicle_id IS NULL THEN 1 ELSE 0 END) as null_vehicle_id,
          SUM(CASE WHEN vendor_id IS NULL THEN 1 ELSE 0 END) as null_vendor_id,
          SUM(CASE WHEN booking_number IS NULL THEN 1 ELSE 0 END) as null_booking_number,
          SUM(CASE WHEN total_amount IS NULL THEN 1 ELSE 0 END) as null_total_amount,
          SUM(CASE WHEN status IS NULL THEN 1 ELSE 0 END) as null_status
        FROM rentcar_bookings
      `);

      const nulls = nullCheck.rows[0];
      let hasNullIssue = false;
      Object.keys(nulls).forEach(key => {
        if (nulls[key] > 0) {
          console.log(`⚠️  ${key}에 NULL 값이 ${nulls[key]}개 존재`);
          hasNullIssue = true;
        }
      });
      if (!hasNullIssue) {
        console.log('✅ 필수 필드에 NULL 값 없음');
      }

      // 고아 레코드 확인 - vehicle_id
      if (columns.includes('vehicle_id')) {
        const orphanVehicles = await conn.execute(`
          SELECT COUNT(*) as count
          FROM rentcar_bookings rb
          LEFT JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
          WHERE rv.id IS NULL AND rb.vehicle_id IS NOT NULL
        `);
        if (orphanVehicles.rows[0].count > 0) {
          console.log(`⚠️  존재하지 않는 vehicle_id를 참조하는 예약: ${orphanVehicles.rows[0].count}건`);
        } else {
          console.log('✅ vehicle_id 참조 무결성 정상');
        }
      }

      // 고아 레코드 확인 - vendor_id
      if (columns.includes('vendor_id')) {
        const orphanVendors = await conn.execute(`
          SELECT COUNT(*) as count
          FROM rentcar_bookings rb
          LEFT JOIN rentcar_vendors rv ON rb.vendor_id = rv.id
          WHERE rv.id IS NULL AND rb.vendor_id IS NOT NULL
        `);
        if (orphanVendors.rows[0].count > 0) {
          console.log(`⚠️  존재하지 않는 vendor_id를 참조하는 예약: ${orphanVendors.rows[0].count}건`);
        } else {
          console.log('✅ vendor_id 참조 무결성 정상');
        }
      }

      // 중복 booking_number 확인
      if (columns.includes('booking_number')) {
        const duplicates = await conn.execute(`
          SELECT booking_number, COUNT(*) as count
          FROM rentcar_bookings
          WHERE booking_number IS NOT NULL
          GROUP BY booking_number
          HAVING COUNT(*) > 1
        `);
        if (duplicates.rows.length > 0) {
          console.log(`⚠️  중복된 booking_number: ${duplicates.rows.length}건`);
          duplicates.rows.slice(0, 3).forEach(row => {
            console.log(`     - ${row.booking_number}: ${row.count}번 중복`);
          });
        } else {
          console.log('✅ booking_number 중복 없음');
        }
      }
    } else {
      console.log('🔍 데이터 없음 - 샘플 데이터 부족');
    }

  } catch (error) {
    console.log(`❌ 테이블 조회 실패: ${error.message}`);
  }

  // 1-2. rentcar_vehicles 테이블
  console.log('\n\n🔍 1-2. rentcar_vehicles 테이블');
  try {
    const vehiclesDesc = await conn.execute('DESCRIBE rentcar_vehicles');
    console.log('✅ 테이블 존재 확인');

    const columns = vehiclesDesc.rows.map(r => r.Field);
    console.log('\n📋 컬럼 목록:');
    vehiclesDesc.rows.forEach(row => {
      console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    const requiredColumns = ['id', 'vendor_id', 'name', 'type', 'price_per_day'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    if (missingColumns.length > 0) {
      console.log(`⚠️  필수 컬럼 누락: ${missingColumns.join(', ')}`);
    } else {
      console.log('✅ 필수 컬럼 모두 존재');
    }

    const vehiclesCount = await conn.execute('SELECT COUNT(*) as count FROM rentcar_vehicles');
    console.log(`\n📊 총 레코드 수: ${vehiclesCount.rows[0].count}`);

    if (vehiclesCount.rows[0].count > 0) {
      const sampleVehicle = await conn.execute('SELECT * FROM rentcar_vehicles LIMIT 1');
      console.log('\n📄 샘플 데이터:');
      console.log(JSON.stringify(sampleVehicle.rows[0], null, 2));

      // 고아 레코드 확인 - vendor_id
      if (columns.includes('vendor_id')) {
        const orphanVendors = await conn.execute(`
          SELECT COUNT(*) as count
          FROM rentcar_vehicles v
          LEFT JOIN rentcar_vendors rv ON v.vendor_id = rv.id
          WHERE rv.id IS NULL AND v.vendor_id IS NOT NULL
        `);
        if (orphanVendors.rows[0].count > 0) {
          console.log(`⚠️  존재하지 않는 vendor_id를 참조하는 차량: ${orphanVendors.rows[0].count}건`);
        } else {
          console.log('✅ vendor_id 참조 무결성 정상');
        }
      }
    } else {
      console.log('🔍 데이터 없음 - 샘플 데이터 부족');
    }

  } catch (error) {
    console.log(`❌ 테이블 조회 실패: ${error.message}`);
  }

  // 1-3. rentcar_insurance 테이블
  console.log('\n\n🔍 1-3. rentcar_insurance 테이블');
  try {
    const insuranceDesc = await conn.execute('DESCRIBE rentcar_insurance');
    console.log('✅ 테이블 존재 확인');

    console.log('\n📋 컬럼 목록:');
    insuranceDesc.rows.forEach(row => {
      console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    const insuranceCount = await conn.execute('SELECT COUNT(*) as count FROM rentcar_insurance');
    console.log(`\n📊 총 레코드 수: ${insuranceCount.rows[0].count}`);

    if (insuranceCount.rows[0].count > 0) {
      const sampleInsurance = await conn.execute('SELECT * FROM rentcar_insurance LIMIT 1');
      console.log('\n📄 샘플 데이터:');
      console.log(JSON.stringify(sampleInsurance.rows[0], null, 2));
    } else {
      console.log('🔍 데이터 없음 - 보험 옵션 데이터 부족');
    }

  } catch (error) {
    console.log(`❌ 테이블 조회 실패: ${error.message}`);
  }

  // 1-4. rentcar_extras 테이블
  console.log('\n\n🔍 1-4. rentcar_extras 테이블');
  try {
    const extrasDesc = await conn.execute('DESCRIBE rentcar_extras');
    console.log('✅ 테이블 존재 확인');

    console.log('\n📋 컬럼 목록:');
    extrasDesc.rows.forEach(row => {
      console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    const extrasCount = await conn.execute('SELECT COUNT(*) as count FROM rentcar_extras');
    console.log(`\n📊 총 레코드 수: ${extrasCount.rows[0].count}`);

    if (extrasCount.rows[0].count > 0) {
      const sampleExtras = await conn.execute('SELECT * FROM rentcar_extras LIMIT 1');
      console.log('\n📄 샘플 데이터:');
      console.log(JSON.stringify(sampleExtras.rows[0], null, 2));
    } else {
      console.log('🔍 데이터 없음 - 추가 옵션 데이터 부족');
    }

  } catch (error) {
    console.log(`❌ 테이블 조회 실패: ${error.message}`);
  }

  // 1-5. rentcar_vendors 테이블
  console.log('\n\n🔍 1-5. rentcar_vendors 테이블');
  try {
    const vendorsDesc = await conn.execute('DESCRIBE rentcar_vendors');
    console.log('✅ 테이블 존재 확인');

    console.log('\n📋 컬럼 목록:');
    vendorsDesc.rows.forEach(row => {
      console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    const vendorsCount = await conn.execute('SELECT COUNT(*) as count FROM rentcar_vendors');
    console.log(`\n📊 총 레코드 수: ${vendorsCount.rows[0].count}`);

    if (vendorsCount.rows[0].count > 0) {
      const sampleVendor = await conn.execute('SELECT * FROM rentcar_vendors LIMIT 1');
      console.log('\n📄 샘플 데이터:');
      console.log(JSON.stringify(sampleVendor.rows[0], null, 2));
    } else {
      console.log('⚠️  데이터 없음 - 렌트카 업체 데이터 필수');
    }

  } catch (error) {
    console.log(`❌ 테이블 조회 실패: ${error.message}`);
  }

  // ============================================
  // 2. 숙박 관련 테이블 점검
  // ============================================
  console.log('\n\n\n🏨 2. 숙박 관련 테이블 점검');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 2-1. accommodation_bookings 테이블
  console.log('🔍 2-1. accommodation_bookings 테이블');
  try {
    const bookingsDesc = await conn.execute('DESCRIBE accommodation_bookings');
    console.log('✅ 테이블 존재 확인');

    const columns = bookingsDesc.rows.map(r => r.Field);
    console.log('\n📋 컬럼 목록:');
    bookingsDesc.rows.forEach(row => {
      console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    const requiredColumns = ['id', 'user_id', 'booking_number', 'partner_id', 'room_id', 'check_in', 'check_out', 'total_amount', 'status'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    if (missingColumns.length > 0) {
      console.log(`⚠️  필수 컬럼 누락: ${missingColumns.join(', ')}`);
    } else {
      console.log('✅ 필수 컬럼 모두 존재');
    }

    const bookingsCount = await conn.execute('SELECT COUNT(*) as count FROM accommodation_bookings');
    console.log(`\n📊 총 레코드 수: ${bookingsCount.rows[0].count}`);

    if (bookingsCount.rows[0].count > 0) {
      const sampleBooking = await conn.execute('SELECT * FROM accommodation_bookings LIMIT 1');
      console.log('\n📄 샘플 데이터:');
      console.log(JSON.stringify(sampleBooking.rows[0], null, 2));

      // NULL 값 확인
      const nullCheck = await conn.execute(`
        SELECT
          SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as null_user_id,
          SUM(CASE WHEN partner_id IS NULL THEN 1 ELSE 0 END) as null_partner_id,
          SUM(CASE WHEN room_id IS NULL THEN 1 ELSE 0 END) as null_room_id,
          SUM(CASE WHEN booking_number IS NULL THEN 1 ELSE 0 END) as null_booking_number,
          SUM(CASE WHEN total_amount IS NULL THEN 1 ELSE 0 END) as null_total_amount,
          SUM(CASE WHEN status IS NULL THEN 1 ELSE 0 END) as null_status
        FROM accommodation_bookings
      `);

      const nulls = nullCheck.rows[0];
      let hasNullIssue = false;
      Object.keys(nulls).forEach(key => {
        if (nulls[key] > 0) {
          console.log(`⚠️  ${key}에 NULL 값이 ${nulls[key]}개 존재`);
          hasNullIssue = true;
        }
      });
      if (!hasNullIssue) {
        console.log('✅ 필수 필드에 NULL 값 없음');
      }

      // 고아 레코드 확인 - partner_id
      if (columns.includes('partner_id')) {
        const orphanPartners = await conn.execute(`
          SELECT COUNT(*) as count
          FROM accommodation_bookings ab
          LEFT JOIN accommodation_partners ap ON ab.partner_id = ap.id
          WHERE ap.id IS NULL AND ab.partner_id IS NOT NULL
        `);
        if (orphanPartners.rows[0].count > 0) {
          console.log(`⚠️  존재하지 않는 partner_id를 참조하는 예약: ${orphanPartners.rows[0].count}건`);
        } else {
          console.log('✅ partner_id 참조 무결성 정상');
        }
      }

      // 고아 레코드 확인 - room_id
      if (columns.includes('room_id')) {
        const orphanRooms = await conn.execute(`
          SELECT COUNT(*) as count
          FROM accommodation_bookings ab
          LEFT JOIN accommodation_rooms ar ON ab.room_id = ar.id
          WHERE ar.id IS NULL AND ab.room_id IS NOT NULL
        `);
        if (orphanRooms.rows[0].count > 0) {
          console.log(`⚠️  존재하지 않는 room_id를 참조하는 예약: ${orphanRooms.rows[0].count}건`);
        } else {
          console.log('✅ room_id 참조 무결성 정상');
        }
      }

      // 중복 booking_number 확인
      if (columns.includes('booking_number')) {
        const duplicates = await conn.execute(`
          SELECT booking_number, COUNT(*) as count
          FROM accommodation_bookings
          WHERE booking_number IS NOT NULL
          GROUP BY booking_number
          HAVING COUNT(*) > 1
        `);
        if (duplicates.rows.length > 0) {
          console.log(`⚠️  중복된 booking_number: ${duplicates.rows.length}건`);
          duplicates.rows.slice(0, 3).forEach(row => {
            console.log(`     - ${row.booking_number}: ${row.count}번 중복`);
          });
        } else {
          console.log('✅ booking_number 중복 없음');
        }
      }

    } else {
      console.log('🔍 데이터 없음 - 샘플 데이터 부족');
    }

  } catch (error) {
    console.log(`❌ 테이블 조회 실패: ${error.message}`);
  }

  // 2-2. lodging_partners 또는 accommodation_partners 테이블
  console.log('\n\n🔍 2-2. lodging_partners / accommodation_partners 테이블');

  // accommodation_partners 먼저 시도
  let partnersTable = 'accommodation_partners';
  try {
    const partnersDesc = await conn.execute(`DESCRIBE ${partnersTable}`);
    console.log(`✅ ${partnersTable} 테이블 존재 확인`);

    console.log('\n📋 컬럼 목록:');
    partnersDesc.rows.forEach(row => {
      console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    const partnersCount = await conn.execute(`SELECT COUNT(*) as count FROM ${partnersTable}`);
    console.log(`\n📊 총 레코드 수: ${partnersCount.rows[0].count}`);

    if (partnersCount.rows[0].count > 0) {
      const samplePartner = await conn.execute(`SELECT * FROM ${partnersTable} LIMIT 1`);
      console.log('\n📄 샘플 데이터:');
      console.log(JSON.stringify(samplePartner.rows[0], null, 2));
    } else {
      console.log('⚠️  데이터 없음 - 숙박 파트너 데이터 필수');
    }

  } catch (error) {
    // accommodation_partners가 없으면 lodging_partners 시도
    try {
      partnersTable = 'lodging_partners';
      const partnersDesc = await conn.execute(`DESCRIBE ${partnersTable}`);
      console.log(`✅ ${partnersTable} 테이블 존재 확인`);

      console.log('\n📋 컬럼 목록:');
      partnersDesc.rows.forEach(row => {
        console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''} ${row.Key ? `[${row.Key}]` : ''}`);
      });

      const partnersCount = await conn.execute(`SELECT COUNT(*) as count FROM ${partnersTable}`);
      console.log(`\n📊 총 레코드 수: ${partnersCount.rows[0].count}`);

      if (partnersCount.rows[0].count > 0) {
        const samplePartner = await conn.execute(`SELECT * FROM ${partnersTable} LIMIT 1`);
        console.log('\n📄 샘플 데이터:');
        console.log(JSON.stringify(samplePartner.rows[0], null, 2));
      } else {
        console.log('⚠️  데이터 없음 - 숙박 파트너 데이터 필수');
      }

    } catch (error2) {
      console.log(`❌ accommodation_partners, lodging_partners 테이블 모두 없음`);
    }
  }

  // 2-3. rooms 또는 accommodation_rooms 테이블
  console.log('\n\n🔍 2-3. rooms / accommodation_rooms 테이블');

  let roomsTable = 'accommodation_rooms';
  try {
    const roomsDesc = await conn.execute(`DESCRIBE ${roomsTable}`);
    console.log(`✅ ${roomsTable} 테이블 존재 확인`);

    const columns = roomsDesc.rows.map(r => r.Field);
    console.log('\n📋 컬럼 목록:');
    roomsDesc.rows.forEach(row => {
      console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    const roomsCount = await conn.execute(`SELECT COUNT(*) as count FROM ${roomsTable}`);
    console.log(`\n📊 총 레코드 수: ${roomsCount.rows[0].count}`);

    if (roomsCount.rows[0].count > 0) {
      const sampleRoom = await conn.execute(`SELECT * FROM ${roomsTable} LIMIT 1`);
      console.log('\n📄 샘플 데이터:');
      console.log(JSON.stringify(sampleRoom.rows[0], null, 2));

      // 고아 레코드 확인 - partner_id
      if (columns.includes('partner_id')) {
        const orphanPartners = await conn.execute(`
          SELECT COUNT(*) as count
          FROM ${roomsTable} r
          LEFT JOIN ${partnersTable} p ON r.partner_id = p.id
          WHERE p.id IS NULL AND r.partner_id IS NOT NULL
        `);
        if (orphanPartners.rows[0].count > 0) {
          console.log(`⚠️  존재하지 않는 partner_id를 참조하는 객실: ${orphanPartners.rows[0].count}건`);
        } else {
          console.log('✅ partner_id 참조 무결성 정상');
        }
      }
    } else {
      console.log('🔍 데이터 없음 - 객실 데이터 부족');
    }

  } catch (error) {
    // accommodation_rooms가 없으면 rooms 시도
    try {
      roomsTable = 'rooms';
      const roomsDesc = await conn.execute(`DESCRIBE ${roomsTable}`);
      console.log(`✅ ${roomsTable} 테이블 존재 확인`);

      console.log('\n📋 컬럼 목록:');
      roomsDesc.rows.forEach(row => {
        console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''} ${row.Key ? `[${row.Key}]` : ''}`);
      });

      const roomsCount = await conn.execute(`SELECT COUNT(*) as count FROM ${roomsTable}`);
      console.log(`\n📊 총 레코드 수: ${roomsCount.rows[0].count}`);

      if (roomsCount.rows[0].count > 0) {
        const sampleRoom = await conn.execute(`SELECT * FROM ${roomsTable} LIMIT 1`);
        console.log('\n📄 샘플 데이터:');
        console.log(JSON.stringify(sampleRoom.rows[0], null, 2));
      } else {
        console.log('🔍 데이터 없음 - 객실 데이터 부족');
      }

    } catch (error2) {
      console.log(`❌ accommodation_rooms, rooms 테이블 모두 없음`);
    }
  }

  // 2-4. listings 테이블에서 숙박 관련 데이터 확인
  console.log('\n\n🔍 2-4. listings 테이블 (숙박 카테고리)');
  try {
    const listingsDesc = await conn.execute('DESCRIBE listings');
    console.log('✅ 테이블 존재 확인');

    // 숙박 관련 카테고리 확인
    const categories = await conn.execute(`
      SELECT category, COUNT(*) as count
      FROM listings
      WHERE category IN ('숙박', 'accommodation', 'stay', 'lodging')
         OR category LIKE '%숙박%'
         OR category LIKE '%accommodation%'
      GROUP BY category
    `);

    if (categories.rows.length > 0) {
      console.log('\n📊 숙박 관련 카테고리:');
      categories.rows.forEach(row => {
        console.log(`   - ${row.category}: ${row.count}건`);
      });

      // 샘플 데이터
      const sampleListing = await conn.execute(`
        SELECT * FROM listings
        WHERE category IN ('숙박', 'accommodation', 'stay', 'lodging')
           OR category LIKE '%숙박%'
        LIMIT 1
      `);

      if (sampleListing.rows.length > 0) {
        console.log('\n📄 샘플 데이터:');
        console.log(JSON.stringify(sampleListing.rows[0], null, 2));
      }

      // NULL 체크
      const nullCheck = await conn.execute(`
        SELECT
          SUM(CASE WHEN title IS NULL OR title = '' THEN 1 ELSE 0 END) as null_title,
          SUM(CASE WHEN price IS NULL THEN 1 ELSE 0 END) as null_price,
          SUM(CASE WHEN location IS NULL OR location = '' THEN 1 ELSE 0 END) as null_location
        FROM listings
        WHERE category IN ('숙박', 'accommodation', 'stay', 'lodging')
      `);

      const nulls = nullCheck.rows[0];
      if (nulls.null_title > 0) console.log(`⚠️  제목이 없는 숙박 리스팅: ${nulls.null_title}건`);
      if (nulls.null_price > 0) console.log(`⚠️  가격이 없는 숙박 리스팅: ${nulls.null_price}건`);
      if (nulls.null_location > 0) console.log(`⚠️  위치가 없는 숙박 리스팅: ${nulls.null_location}건`);

      if (nulls.null_title === 0 && nulls.null_price === 0 && nulls.null_location === 0) {
        console.log('✅ 필수 필드에 NULL 값 없음');
      }

    } else {
      console.log('⚠️  숙박 관련 카테고리 데이터 없음');
    }

  } catch (error) {
    console.log(`❌ listings 테이블 조회 실패: ${error.message}`);
  }

  // ============================================
  // 3. 전체 요약
  // ============================================
  console.log('\n\n\n📊 3. 전체 요약');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 모든 예약 관련 테이블 통계
    const tables = [
      'rentcar_bookings',
      'rentcar_vehicles',
      'rentcar_vendors',
      'rentcar_insurance',
      'rentcar_extras',
      'accommodation_bookings',
      'accommodation_partners',
      'accommodation_rooms'
    ];

    console.log('📈 테이블별 레코드 수:\n');
    for (const table of tables) {
      try {
        const count = await conn.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ${table.padEnd(30)} : ${count.rows[0].count.toString().padStart(6)} 건`);
      } catch (e) {
        console.log(`   ${table.padEnd(30)} : 테이블 없음`);
      }
    }

  } catch (error) {
    console.log(`❌ 통계 조회 실패: ${error.message}`);
  }

  console.log('\n========================================');
  console.log('점검 완료');
  console.log('========================================\n');
}

checkIntegrity().catch(console.error);
