/**
 * DB 테이블 스키마 확인 스크립트
 * accommodation_rooms와 bookings 테이블 구조 확인
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n='.repeat(60));
  console.log('DB 테이블 스키마 확인');
  console.log('='.repeat(60));

  try {
    // 1. accommodation_rooms 테이블 확인
    console.log('\n[1] accommodation_rooms 테이블 스키마:');
    console.log('-'.repeat(60));

    const roomsSchema = await connection.execute(
      'DESCRIBE accommodation_rooms'
    );

    if (roomsSchema.rows && roomsSchema.rows.length > 0) {
      console.log('✓ 테이블 존재');
      console.log('\n필드 목록:');
      roomsSchema.rows.forEach(row => {
        console.log(`  - ${row.Field} (${row.Type}) ${row.Null === 'NO' ? 'NOT NULL' : ''}`);
      });
    } else {
      console.log('✗ 테이블이 존재하지 않습니다!');
    }

    // 2. bookings 테이블 확인
    console.log('\n\n[2] bookings 테이블 스키마:');
    console.log('-'.repeat(60));

    const bookingsSchema = await connection.execute(
      'DESCRIBE bookings'
    );

    if (bookingsSchema.rows && bookingsSchema.rows.length > 0) {
      console.log('✓ 테이블 존재');
      console.log('\n필드 목록:');
      bookingsSchema.rows.forEach(row => {
        console.log(`  - ${row.Field} (${row.Type}) ${row.Null === 'NO' ? 'NOT NULL' : ''}`);
      });
    } else {
      console.log('✗ 테이블이 존재하지 않습니다!');
    }

    // 3. accommodation_vendors 테이블 확인
    console.log('\n\n[3] accommodation_vendors 테이블 스키마:');
    console.log('-'.repeat(60));

    const vendorsSchema = await connection.execute(
      'DESCRIBE accommodation_vendors'
    );

    if (vendorsSchema.rows && vendorsSchema.rows.length > 0) {
      console.log('✓ 테이블 존재');
      console.log('\n필드 목록:');
      vendorsSchema.rows.forEach(row => {
        console.log(`  - ${row.Field} (${row.Type}) ${row.Null === 'NO' ? 'NOT NULL' : ''}`);
      });
    } else {
      console.log('✗ 테이블이 존재하지 않습니다!');
    }

    // 4. API에서 사용하는 필드와 실제 DB 필드 비교
    console.log('\n\n[4] API vs DB 필드 매칭 검증:');
    console.log('-'.repeat(60));

    // accommodation_rooms API 필드
    const roomsApiFields = [
      'vendor_id', 'room_code', 'room_name', 'room_type', 'floor', 'room_number',
      'capacity', 'bed_type', 'bed_count', 'size_sqm', 'base_price_per_night', 'weekend_surcharge',
      'view_type', 'has_balcony', 'breakfast_included', 'wifi_available', 'tv_available',
      'minibar_available', 'air_conditioning', 'heating', 'bathroom_type',
      'description', 'amenities', 'images', 'is_available', 'max_occupancy',
      'min_nights', 'max_nights'
    ];

    const dbRoomFields = roomsSchema.rows.map(row => row.Field);
    const missingRoomFields = roomsApiFields.filter(f => !dbRoomFields.includes(f));
    const extraDbFields = dbRoomFields.filter(f => !roomsApiFields.includes(f) && !['id', 'created_at', 'updated_at'].includes(f));

    console.log('\naccommodation_rooms 필드 검증:');
    if (missingRoomFields.length > 0) {
      console.log(`  ✗ API에서 사용하지만 DB에 없는 필드: ${missingRoomFields.join(', ')}`);
    } else {
      console.log('  ✓ 모든 API 필드가 DB에 존재');
    }

    if (extraDbFields.length > 0) {
      console.log(`  ⚠ DB에만 있는 필드 (API에서 미사용): ${extraDbFields.join(', ')}`);
    }

    // bookings API 필드
    const bookingsApiFields = [
      'user_id', 'room_id', 'accommodation_vendor_id', 'listing_type',
      'customer_name', 'customer_email', 'customer_phone',
      'check_in_date', 'check_out_date', 'guests',
      'special_requests', 'total_price', 'payment_method', 'payment_status', 'status'
    ];

    const dbBookingFields = bookingsSchema.rows.map(row => row.Field);
    const missingBookingFields = bookingsApiFields.filter(f => !dbBookingFields.includes(f));
    const extraBookingFields = dbBookingFields.filter(f => !bookingsApiFields.includes(f) && !['id', 'created_at', 'updated_at'].includes(f));

    console.log('\nbookings 필드 검증:');
    if (missingBookingFields.length > 0) {
      console.log(`  ✗ API에서 사용하지만 DB에 없는 필드: ${missingBookingFields.join(', ')}`);
    } else {
      console.log('  ✓ 모든 API 필드가 DB에 존재');
    }

    if (extraBookingFields.length > 0) {
      console.log(`  ⚠ DB에만 있는 필드 (API에서 미사용): ${extraBookingFields.join(', ')}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('스키마 확인 완료');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n✗ 오류 발생:', error.message);
    console.error(error);
  }
}

checkSchema();
