#!/usr/bin/env tsx
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function testBookingFlow() {
  console.log('🧪 예약 플로우 테스트 시작...\n');

  const connection = connect({
    url: process.env.DATABASE_URL
  });

  // 1. 최근 추가한 상품 확인
  console.log('1️⃣ 최근 추가한 상품 확인:');
  const products = await connection.execute(`
    SELECT id, title, category, category_id, price_from
    FROM listings
    WHERE id >= 317
    ORDER BY id
  `);

  console.log(`   총 ${products.rows.length}개 상품 발견:`);
  products.rows.forEach((p: any) => {
    console.log(`   - [${p.category}] ${p.title} (ID: ${p.id}) - ${p.price_from.toLocaleString()}원`);
  });

  // 2. bookings 테이블 구조 확인
  console.log('\n2️⃣ Bookings 테이블 확인:');
  try {
    const bookingsCheck = await connection.execute('SHOW TABLES LIKE "bookings"');
    if (bookingsCheck.rows.length > 0) {
      console.log('   ✅ bookings 테이블 존재');

      // 테이블 구조 확인
      const structure = await connection.execute('DESCRIBE bookings');
      console.log('   📋 테이블 구조:');
      structure.rows.forEach((col: any) => {
        console.log(`      - ${col.Field} (${col.Type})`);
      });
    } else {
      console.log('   ❌ bookings 테이블 없음');
    }
  } catch (error: any) {
    console.log('   ❌ 테이블 확인 실패:', error.message);
  }

  // 3. 테스트 예약 데이터 생성
  console.log('\n3️⃣ 테스트 예약 생성:');
  const testBooking = {
    user_id: 1,
    listing_id: 317, // 신안 해안 트레킹
    booking_date: new Date().toISOString().split('T')[0],
    start_date: '2025-11-01',
    end_date: '2025-11-01',
    adults: 2,
    children: 1,
    infants: 0,
    total_price: 135000, // 50000*2 + 35000*1
    status: 'pending',
    customer_name: '테스트 사용자',
    customer_email: 'test@example.com',
    customer_phone: '010-1234-5678',
    special_requests: '예약 플로우 테스트입니다'
  };

  try {
    const result = await connection.execute(
      `INSERT INTO bookings (
        user_id, listing_id, booking_date, start_date, end_date,
        adults, children, infants, total_price, status,
        customer_name, customer_email, customer_phone, special_requests,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        testBooking.user_id,
        testBooking.listing_id,
        testBooking.booking_date,
        testBooking.start_date,
        testBooking.end_date,
        testBooking.adults,
        testBooking.children,
        testBooking.infants,
        testBooking.total_price,
        testBooking.status,
        testBooking.customer_name,
        testBooking.customer_email,
        testBooking.customer_phone,
        testBooking.special_requests
      ]
    );

    console.log(`   ✅ 테스트 예약 생성 성공! (ID: ${result.insertId})`);
    console.log(`   예약자: ${testBooking.customer_name}`);
    console.log(`   상품: 신안 해안 트레킹`);
    console.log(`   인원: 성인 ${testBooking.adults}명, 어린이 ${testBooking.children}명`);
    console.log(`   총 금액: ${testBooking.total_price.toLocaleString()}원`);

    // 4. 생성된 예약 조회
    console.log('\n4️⃣ 생성된 예약 조회:');
    const booking = await connection.execute(
      `SELECT b.*, l.title as listing_title, l.category
       FROM bookings b
       LEFT JOIN listings l ON b.listing_id = l.id
       WHERE b.id = ?`,
      [result.insertId]
    );

    if (booking.rows.length > 0) {
      const b = booking.rows[0];
      console.log('   ✅ 예약 조회 성공:');
      console.log(`      예약 ID: ${b.id}`);
      console.log(`      상품: [${b.category}] ${b.listing_title}`);
      console.log(`      예약자: ${b.customer_name} (${b.customer_email})`);
      console.log(`      상태: ${b.status}`);
      console.log(`      날짜: ${b.start_date}`);
    }

  } catch (error: any) {
    console.error('   ❌ 예약 생성 실패:', error.message);
  }

  console.log('\n✅ 예약 플로우 테스트 완료!');
}

testBookingFlow();
