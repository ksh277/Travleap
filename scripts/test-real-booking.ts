#!/usr/bin/env tsx
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function testRealBooking() {
  console.log('🧪 실제 예약 테스트...\n');

  const connection = connect({
    url: process.env.DATABASE_URL
  });

  // 테스트 예약 생성 (실제 테이블 구조에 맞춤)
  const bookingNumber = `BK${Date.now()}`;
  const testBooking = {
    booking_number: bookingNumber,
    listing_id: 317, // 신안 해안 트레킹
    user_id: 1,
    start_date: '2025-11-01',
    end_date: '2025-11-01',
    num_adults: 2,
    num_children: 1,
    num_seniors: 0,
    price_adult: 50000,
    price_child: 35000,
    price_senior: 0,
    subtotal: 135000,
    discount_amount: 0,
    tax_amount: 0,
    total_amount: 135000,
    payment_method: 'card',
    payment_status: 'pending',
    status: 'pending',
    customer_info: JSON.stringify({
      name: '테스트 사용자',
      email: 'test@example.com',
      phone: '010-1234-5678'
    }),
    special_requests: '예약 플로우 테스트입니다'
  };

  try {
    const result = await connection.execute(
      `INSERT INTO bookings (
        booking_number, listing_id, user_id, start_date, end_date,
        num_adults, num_children, num_seniors,
        price_adult, price_child, price_senior,
        subtotal, discount_amount, tax_amount, total_amount,
        payment_method, payment_status, status,
        customer_info, special_requests,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        testBooking.booking_number,
        testBooking.listing_id,
        testBooking.user_id,
        testBooking.start_date,
        testBooking.end_date,
        testBooking.num_adults,
        testBooking.num_children,
        testBooking.num_seniors,
        testBooking.price_adult,
        testBooking.price_child,
        testBooking.price_senior,
        testBooking.subtotal,
        testBooking.discount_amount,
        testBooking.tax_amount,
        testBooking.total_amount,
        testBooking.payment_method,
        testBooking.payment_status,
        testBooking.status,
        testBooking.customer_info,
        testBooking.special_requests
      ]
    );

    console.log('✅ 테스트 예약 생성 성공!');
    console.log(`   예약 번호: ${testBooking.booking_number}`);
    console.log(`   예약 ID: ${result.insertId}`);
    console.log(`   상품: 신안 해안 트레킹 (ID: 317)`);
    console.log(`   인원: 성인 ${testBooking.num_adults}명, 어린이 ${testBooking.num_children}명`);
    console.log(`   총 금액: ${testBooking.total_amount.toLocaleString()}원`);
    console.log(`   상태: ${testBooking.status}`);

    // 생성된 예약 조회
    console.log('\n📋 예약 내역 조회:');
    const booking = await connection.execute(
      `SELECT
        b.*,
        l.title as listing_title,
        l.category,
        l.price_from
       FROM bookings b
       LEFT JOIN listings l ON b.listing_id = l.id
       WHERE b.id = ?`,
      [result.insertId]
    );

    if (booking.rows.length > 0) {
      const b = booking.rows[0];
      const customerInfo = JSON.parse(b.customer_info);

      console.log('   ✅ 예약 정보:');
      console.log(`      예약 번호: ${b.booking_number}`);
      console.log(`      상품: [${b.category}] ${b.listing_title}`);
      console.log(`      예약자: ${customerInfo.name}`);
      console.log(`      연락처: ${customerInfo.phone}`);
      console.log(`      이메일: ${customerInfo.email}`);
      console.log(`      예약일: ${b.start_date}`);
      console.log(`      인원: 성인 ${b.num_adults}명, 어린이 ${b.num_children}명`);
      console.log(`      금액: ${b.total_amount.toLocaleString()}원`);
      console.log(`      결제 상태: ${b.payment_status}`);
      console.log(`      예약 상태: ${b.status}`);
      console.log(`      특별 요청: ${b.special_requests}`);
    }

    console.log('\n✅ 예약 플로우 테스트 완료!');
    console.log('\n📝 다음 단계:');
    console.log('   1. 브라우저에서 상품 상세 페이지 접속');
    console.log('   2. "예약하기" 버튼 클릭');
    console.log('   3. 예약 정보 입력 (이름, 이메일, 전화번호)');
    console.log('   4. "예약 확정" 클릭');
    console.log('   5. 주문 내역 페이지에서 예약 확인');
    console.log('   6. 결제 진행');

  } catch (error: any) {
    console.error('❌ 예약 생성 실패:', error.message);
    process.exit(1);
  }
}

testRealBooking();
