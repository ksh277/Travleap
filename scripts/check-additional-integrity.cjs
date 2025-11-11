/**
 * 추가 무결성 점검
 * - 외래키 제약조건 확인
 * - 데이터 타입 문제
 * - 숙박 관련 테이블 대체 확인
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkAdditional() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('추가 무결성 점검');
  console.log('========================================\n');

  // 1. 모든 테이블 목록 확인
  console.log('📋 1. 전체 테이블 목록 확인\n');
  const allTables = await conn.execute('SHOW TABLES');
  const tableNames = allTables.rows.map(r => Object.values(r)[0]);

  // 숙박 관련 가능성 있는 테이블 필터링
  const accommodationRelated = tableNames.filter(name =>
    name.toLowerCase().includes('accommodation') ||
    name.toLowerCase().includes('lodging') ||
    name.toLowerCase().includes('room') ||
    name.toLowerCase().includes('hotel') ||
    name.toLowerCase().includes('stay')
  );

  console.log('🏨 숙박 관련 테이블:');
  if (accommodationRelated.length > 0) {
    accommodationRelated.forEach(table => {
      console.log(`   - ${table}`);
    });
  } else {
    console.log('   ⚠️  숙박 관련 테이블 없음');
  }

  // 렌트카 관련 테이블 필터링
  const rentcarRelated = tableNames.filter(name =>
    name.toLowerCase().includes('rentcar') ||
    name.toLowerCase().includes('vehicle') ||
    name.toLowerCase().includes('vendor')
  );

  console.log('\n🚗 렌트카 관련 테이블:');
  if (rentcarRelated.length > 0) {
    rentcarRelated.forEach(table => {
      console.log(`   - ${table}`);
    });
  }

  // 2. rentcar_bookings의 실제 total_amount 관련 컬럼 확인
  console.log('\n\n📊 2. rentcar_bookings의 금액 관련 컬럼 확인\n');
  try {
    const columns = await conn.execute('DESCRIBE rentcar_bookings');
    const amountColumns = columns.rows.filter(r =>
      r.Field.toLowerCase().includes('amount') ||
      r.Field.toLowerCase().includes('price') ||
      r.Field.toLowerCase().includes('total') ||
      r.Field.toLowerCase().includes('fee') ||
      r.Field.toLowerCase().includes('krw')
    );

    console.log('💰 금액 관련 컬럼:');
    amountColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '[NOT NULL]' : '[NULL 허용]'}`);
    });

    // total_krw와 total_amount 차이
    console.log('\n💡 분석:');
    const hasTotalKrw = amountColumns.some(c => c.Field === 'total_krw');
    const hasTotalAmount = amountColumns.some(c => c.Field === 'total_amount');

    if (hasTotalKrw && !hasTotalAmount) {
      console.log('   ✅ total_krw 컬럼 사용 중 (total_amount는 없음)');
    } else if (hasTotalAmount && !hasTotalKrw) {
      console.log('   ✅ total_amount 컬럼 사용 중 (total_krw는 없음)');
    } else if (hasTotalKrw && hasTotalAmount) {
      console.log('   ⚠️  total_krw와 total_amount 둘 다 존재 (중복 가능성)');
    } else {
      console.log('   ⚠️  total 관련 컬럼 없음');
    }

  } catch (error) {
    console.log(`   ❌ 조회 실패: ${error.message}`);
  }

  // 3. rentcar_bookings의 날짜 관련 컬럼 확인
  console.log('\n\n📅 3. rentcar_bookings의 날짜 관련 컬럼 확인\n');
  try {
    const columns = await conn.execute('DESCRIBE rentcar_bookings');
    const dateColumns = columns.rows.filter(r =>
      r.Field.toLowerCase().includes('date') ||
      r.Field.toLowerCase().includes('time') ||
      r.Field.toLowerCase().includes('at')
    );

    console.log('📆 날짜/시간 관련 컬럼:');
    dateColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '[NOT NULL]' : '[NULL 허용]'}`);
    });

    // return_date 확인
    console.log('\n💡 분석:');
    const hasReturnDate = dateColumns.some(c => c.Field === 'return_date');
    const hasDropoffDate = dateColumns.some(c => c.Field === 'dropoff_date');

    if (hasDropoffDate && !hasReturnDate) {
      console.log('   ✅ dropoff_date 컬럼 사용 중 (return_date는 없음, 동일 의미)');
    } else if (hasReturnDate && !hasDropoffDate) {
      console.log('   ✅ return_date 컬럼 사용 중');
    } else if (hasReturnDate && hasDropoffDate) {
      console.log('   ⚠️  return_date와 dropoff_date 둘 다 존재 (중복 가능성)');
    } else {
      console.log('   ⚠️  반납일 관련 컬럼 없음');
    }

  } catch (error) {
    console.log(`   ❌ 조회 실패: ${error.message}`);
  }

  // 4. listings 테이블의 숙박 관련 가격 컬럼 확인
  console.log('\n\n💵 4. listings 테이블의 가격 컬럼 확인\n');
  try {
    const columns = await conn.execute('DESCRIBE listings');
    const priceColumns = columns.rows.filter(r =>
      r.Field.toLowerCase().includes('price') ||
      r.Field.toLowerCase().includes('amount') ||
      r.Field.toLowerCase().includes('rate')
    );

    console.log('💰 가격 관련 컬럼:');
    priceColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '[NOT NULL]' : '[NULL 허용]'}`);
    });

    console.log('\n💡 분석:');
    const hasPrice = priceColumns.some(c => c.Field === 'price');
    const hasPriceFrom = priceColumns.some(c => c.Field === 'price_from');

    if (hasPriceFrom && !hasPrice) {
      console.log('   ✅ price_from/price_to 컬럼 사용 중 (가격 범위 표현)');
    } else if (hasPrice && !hasPriceFrom) {
      console.log('   ✅ price 컬럼 사용 중');
    } else if (hasPrice && hasPriceFrom) {
      console.log('   ⚠️  price와 price_from 둘 다 존재');
    } else {
      console.log('   ⚠️  가격 컬럼 없음');
    }

  } catch (error) {
    console.log(`   ❌ 조회 실패: ${error.message}`);
  }

  // 5. 외래키 제약조건 확인 (PlanetScale은 외래키를 지원하지 않지만 인덱스로 확인)
  console.log('\n\n🔗 5. 인덱스 및 참조 관계 확인\n');

  // rentcar_bookings의 인덱스
  console.log('📌 rentcar_bookings 인덱스:');
  try {
    const indexes = await conn.execute('SHOW INDEX FROM rentcar_bookings');
    const keyIndexes = indexes.rows.filter(r =>
      r.Column_name.includes('id') && r.Column_name !== 'id'
    );

    keyIndexes.forEach(idx => {
      console.log(`   - ${idx.Column_name}: ${idx.Key_name} ${idx.Non_unique === 0 ? '[UNIQUE]' : ''}`);
    });

    if (keyIndexes.length === 0) {
      console.log('   🔍 외래키 인덱스 없음 (참조 무결성 제약 없음)');
    }

  } catch (error) {
    console.log(`   ❌ 조회 실패: ${error.message}`);
  }

  // 6. 데이터 정합성 - rentcar_bookings
  console.log('\n\n🔍 6. rentcar_bookings 데이터 정합성 확인\n');
  try {
    // 날짜 정합성 (pickup_date < dropoff_date)
    const dateCheck = await conn.execute(`
      SELECT COUNT(*) as invalid_count
      FROM rentcar_bookings
      WHERE pickup_date >= dropoff_date
    `);

    if (dateCheck.rows[0].invalid_count > 0) {
      console.log(`⚠️  픽업일이 반납일보다 늦거나 같은 예약: ${dateCheck.rows[0].invalid_count}건`);
    } else {
      console.log('✅ 날짜 정합성 정상 (pickup_date < dropoff_date)');
    }

    // 금액 정합성 (total_krw > 0)
    const amountCheck = await conn.execute(`
      SELECT COUNT(*) as invalid_count
      FROM rentcar_bookings
      WHERE total_krw <= 0 AND status NOT IN ('cancelled', 'refunded')
    `);

    if (amountCheck.rows[0].invalid_count > 0) {
      console.log(`⚠️  0원 이하의 예약 (취소/환불 제외): ${amountCheck.rows[0].invalid_count}건`);
    } else {
      console.log('✅ 금액 정합성 정상 (total_krw > 0)');
    }

    // 렌탈 기간 정합성
    const daysCheck = await conn.execute(`
      SELECT COUNT(*) as invalid_count
      FROM rentcar_bookings
      WHERE rental_days <= 0
    `);

    if (daysCheck.rows[0].invalid_count > 0) {
      console.log(`⚠️  렌탈 기간이 0일 이하인 예약: ${daysCheck.rows[0].invalid_count}건`);
    } else {
      console.log('✅ 렌탈 기간 정합성 정상 (rental_days > 0)');
    }

  } catch (error) {
    console.log(`❌ 조회 실패: ${error.message}`);
  }

  // 7. listings의 숙박 데이터 정합성
  console.log('\n\n🏨 7. listings 테이블 숙박 데이터 정합성 확인\n');
  try {
    const accommodationCount = await conn.execute(`
      SELECT COUNT(*) as count
      FROM listings
      WHERE category IN ('숙박', 'accommodation', 'stay', 'lodging')
    `);

    console.log(`📊 총 숙박 리스팅: ${accommodationCount.rows[0].count}건`);

    // 필수 필드 확인
    const nullCheck = await conn.execute(`
      SELECT
        SUM(CASE WHEN title IS NULL OR title = '' THEN 1 ELSE 0 END) as null_title,
        SUM(CASE WHEN price_from IS NULL THEN 1 ELSE 0 END) as null_price_from,
        SUM(CASE WHEN location IS NULL OR location = '' THEN 1 ELSE 0 END) as null_location,
        SUM(CASE WHEN amenities IS NULL THEN 1 ELSE 0 END) as null_amenities,
        SUM(CASE WHEN max_occupancy IS NULL OR max_occupancy = 0 THEN 1 ELSE 0 END) as null_max_occupancy
      FROM listings
      WHERE category IN ('숙박', 'accommodation', 'stay', 'lodging')
    `);

    const nulls = nullCheck.rows[0];
    console.log('\n필수 필드 NULL 체크:');

    if (nulls.null_title > 0) {
      console.log(`   ⚠️  제목 없음: ${nulls.null_title}건`);
    } else {
      console.log(`   ✅ 제목: 모두 존재`);
    }

    if (nulls.null_price_from > 0) {
      console.log(`   ⚠️  가격 없음: ${nulls.null_price_from}건`);
    } else {
      console.log(`   ✅ 가격: 모두 존재`);
    }

    if (nulls.null_location > 0) {
      console.log(`   ⚠️  위치 없음: ${nulls.null_location}건`);
    } else {
      console.log(`   ✅ 위치: 모두 존재`);
    }

    if (nulls.null_amenities > 0) {
      console.log(`   🔍 편의시설 정보 없음: ${nulls.null_amenities}건 (필수 아님)`);
    } else {
      console.log(`   ✅ 편의시설: 모두 존재`);
    }

    if (nulls.null_max_occupancy > 0) {
      console.log(`   ⚠️  최대 수용 인원 없음: ${nulls.null_max_occupancy}건`);
    } else {
      console.log(`   ✅ 최대 수용 인원: 모두 존재`);
    }

    // 가격 범위 확인
    const priceCheck = await conn.execute(`
      SELECT
        MIN(price_from) as min_price,
        MAX(price_from) as max_price,
        AVG(price_from) as avg_price
      FROM listings
      WHERE category IN ('숙박', 'accommodation', 'stay', 'lodging')
        AND price_from > 0
    `);

    if (priceCheck.rows.length > 0) {
      const prices = priceCheck.rows[0];
      console.log(`\n💰 가격 분포:`);
      console.log(`   - 최저가: ${prices.min_price?.toLocaleString()}원`);
      console.log(`   - 최고가: ${prices.max_price?.toLocaleString()}원`);
      console.log(`   - 평균가: ${Math.round(prices.avg_price)?.toLocaleString()}원`);
    }

  } catch (error) {
    console.log(`❌ 조회 실패: ${error.message}`);
  }

  // 8. 예약 테이블 대안 확인
  console.log('\n\n📦 8. 예약 관련 대체 테이블 확인\n');

  // bookings 테이블 확인
  const bookingTables = tableNames.filter(name =>
    name.toLowerCase().includes('booking') ||
    name.toLowerCase().includes('reservation') ||
    name.toLowerCase().includes('order')
  );

  console.log('예약 관련 테이블:');
  for (const table of bookingTables) {
    try {
      const count = await conn.execute(`SELECT COUNT(*) as count FROM ${table}`);
      const desc = await conn.execute(`DESCRIBE ${table}`);
      const columns = desc.rows.map(r => r.Field);

      console.log(`\n   📋 ${table} (${count.rows[0].count}건)`);

      // 중요 컬럼만 표시
      const importantCols = columns.filter(col =>
        col.toLowerCase().includes('id') ||
        col.toLowerCase().includes('user') ||
        col.toLowerCase().includes('type') ||
        col.toLowerCase().includes('category') ||
        col.toLowerCase().includes('status') ||
        col.toLowerCase().includes('amount') ||
        col.toLowerCase().includes('total')
      );

      if (importantCols.length > 0) {
        console.log(`      주요 컬럼: ${importantCols.slice(0, 8).join(', ')}`);
      }

      // 카테고리 또는 타입이 있으면 분포 확인
      if (columns.includes('category')) {
        const categoryDist = await conn.execute(`
          SELECT category, COUNT(*) as count
          FROM ${table}
          WHERE category IS NOT NULL
          GROUP BY category
          LIMIT 5
        `);

        if (categoryDist.rows.length > 0) {
          console.log(`      카테고리:`);
          categoryDist.rows.forEach(row => {
            console.log(`         - ${row.category}: ${row.count}건`);
          });
        }
      }

      if (columns.includes('booking_type') || columns.includes('type')) {
        const typeCol = columns.includes('booking_type') ? 'booking_type' : 'type';
        const typeDist = await conn.execute(`
          SELECT ${typeCol}, COUNT(*) as count
          FROM ${table}
          WHERE ${typeCol} IS NOT NULL
          GROUP BY ${typeCol}
          LIMIT 5
        `);

        if (typeDist.rows.length > 0) {
          console.log(`      타입 분포:`);
          typeDist.rows.forEach(row => {
            console.log(`         - ${row[typeCol]}: ${row.count}건`);
          });
        }
      }

    } catch (error) {
      console.log(`   ❌ ${table} 조회 실패: ${error.message}`);
    }
  }

  console.log('\n========================================');
  console.log('추가 점검 완료');
  console.log('========================================\n');
}

checkAdditional().catch(console.error);
