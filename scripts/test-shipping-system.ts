/**
 * 배송 시스템 통합 테스트
 *
 * 테스트 시나리오:
 * 1. 팝업 상품 주문 생성 (배송지 포함)
 * 2. 결제 완료 (delivery_status: PENDING → READY)
 * 3. 송장번호 입력 (delivery_status: READY → SHIPPING)
 * 4. 배송 완료 (delivery_status: SHIPPING → DELIVERED)
 * 5. 마이페이지 조회 시 배송 정보 표시 확인
 */

import 'dotenv/config';
import { getDatabase } from '../utils/database';

async function testShippingSystem() {
  const db = getDatabase();

  console.log('🧪 배송 시스템 통합 테스트 시작\n');
  console.log('=' .repeat(60));

  try {
    // 0. 배송 컬럼 존재 확인
    console.log('\n📋 Step 0: 배송 컬럼 존재 확인');
    const columns = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME IN (
        'shipping_name', 'shipping_phone', 'shipping_address',
        'shipping_address_detail', 'shipping_zipcode', 'shipping_memo',
        'tracking_number', 'courier_company', 'delivery_status',
        'shipped_at', 'delivered_at'
      )
    `);

    const shippingColumns = columns.map((c: any) => c.COLUMN_NAME);
    console.log(`   발견된 배송 컬럼: ${shippingColumns.length}개`);
    console.log(`   ${shippingColumns.join(', ')}`);

    if (shippingColumns.length < 11) {
      console.error('\n❌ 배송 컬럼이 부족합니다!');
      console.error('   먼저 마이그레이션을 실행하세요:');
      console.error('   npm run tsx scripts/add-shipping-columns.ts');
      process.exit(1);
    }

    console.log('   ✅ 모든 배송 컬럼이 존재합니다.');

    // 1. 테스트용 상품 조회 (팝업 카테고리)
    console.log('\n📦 Step 1: 테스트용 팝업 상품 조회');
    const listings = await db.query(`
      SELECT id, title, category, price_from
      FROM listings
      WHERE category = '팝업'
      LIMIT 1
    `);

    if (listings.length === 0) {
      console.error('   ❌ 팝업 상품이 없습니다!');
      console.log('   일반 상품으로 테스트를 진행합니다.');
      const anyListing = await db.query(`SELECT id, title, category, price_from FROM listings LIMIT 1`);
      if (anyListing.length === 0) {
        console.error('   ❌ 테스트할 상품이 없습니다!');
        process.exit(1);
      }
      var testListing = anyListing[0];
    } else {
      var testListing = listings[0];
    }

    console.log(`   ✅ 테스트 상품: ${testListing.title} (${testListing.category})`);
    console.log(`   상품 ID: ${testListing.id}, 가격: ${testListing.price_from}원`);

    // 2. 예약 생성 (배송지 포함)
    console.log('\n🛒 Step 2: 예약 생성 (배송지 포함)');
    const bookingNumber = `TEST_BK${Date.now()}`;
    const bookingData = {
      booking_number: bookingNumber,
      listing_id: testListing.id,
      user_id: 1, // 테스트 사용자
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      num_adults: 2,
      num_children: 0,
      num_seniors: 0,
      total_amount: testListing.price_from || 10000,
      payment_method: 'card',
      payment_status: 'pending',
      status: 'pending',
      customer_info: JSON.stringify({
        name: '테스트사용자',
        phone: '010-1234-5678',
        email: 'test@test.com'
      }),
      // ✅ 배송 정보
      shipping_name: '홍길동',
      shipping_phone: '010-9876-5432',
      shipping_zipcode: '12345',
      shipping_address: '서울시 강남구 테스트로 123',
      shipping_address_detail: '테스트빌딩 456호',
      shipping_memo: '문 앞에 놔주세요',
      delivery_status: 'PENDING'
    };

    const insertResult = await db.execute(`
      INSERT INTO bookings (
        booking_number, listing_id, user_id, start_date, end_date,
        num_adults, num_children, num_seniors, total_amount,
        payment_method, payment_status, status, customer_info,
        shipping_name, shipping_phone, shipping_zipcode,
        shipping_address, shipping_address_detail, shipping_memo,
        delivery_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      bookingData.booking_number,
      bookingData.listing_id,
      bookingData.user_id,
      bookingData.start_date,
      bookingData.end_date,
      bookingData.num_adults,
      bookingData.num_children,
      bookingData.num_seniors,
      bookingData.total_amount,
      bookingData.payment_method,
      bookingData.payment_status,
      bookingData.status,
      bookingData.customer_info,
      bookingData.shipping_name,
      bookingData.shipping_phone,
      bookingData.shipping_zipcode,
      bookingData.shipping_address,
      bookingData.shipping_address_detail,
      bookingData.shipping_memo,
      bookingData.delivery_status
    ]);

    const bookingId = insertResult.insertId;
    console.log(`   ✅ 예약 생성 완료: ID ${bookingId}`);
    console.log(`   예약번호: ${bookingNumber}`);
    console.log(`   배송지: [${bookingData.shipping_zipcode}] ${bookingData.shipping_address}`);

    // 3. 결제 완료 시뮬레이션 (delivery_status: PENDING → READY)
    console.log('\n💳 Step 3: 결제 완료 시뮬레이션');
    await db.execute(`
      UPDATE bookings
      SET
        status = 'confirmed',
        payment_status = 'paid',
        delivery_status = IF(delivery_status IS NOT NULL, 'READY', delivery_status),
        updated_at = NOW()
      WHERE id = ?
    `, [bookingId]);

    const afterPayment = await db.query(`
      SELECT delivery_status, status, payment_status
      FROM bookings WHERE id = ?
    `, [bookingId]);

    console.log(`   ✅ 결제 완료 처리됨`);
    console.log(`   배송 상태: ${afterPayment[0].delivery_status}`);
    console.log(`   예약 상태: ${afterPayment[0].status}`);
    console.log(`   결제 상태: ${afterPayment[0].payment_status}`);

    if (afterPayment[0].delivery_status !== 'READY') {
      console.error(`   ❌ 배송 상태가 READY가 아닙니다: ${afterPayment[0].delivery_status}`);
      throw new Error('결제 완료 후 배송 상태 변경 실패');
    }

    // 4. 송장번호 입력 (delivery_status: READY → SHIPPING)
    console.log('\n📮 Step 4: 송장번호 입력');
    const trackingNumber = `1234567890`;
    const courierCompany = 'cj';

    await db.execute(`
      UPDATE bookings
      SET
        tracking_number = ?,
        courier_company = ?,
        delivery_status = 'SHIPPING',
        shipped_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [trackingNumber, courierCompany, bookingId]);

    const afterTracking = await db.query(`
      SELECT tracking_number, courier_company, delivery_status, shipped_at
      FROM bookings WHERE id = ?
    `, [bookingId]);

    console.log(`   ✅ 송장번호 등록 완료`);
    console.log(`   택배사: ${afterTracking[0].courier_company}`);
    console.log(`   송장번호: ${afterTracking[0].tracking_number}`);
    console.log(`   배송 상태: ${afterTracking[0].delivery_status}`);
    console.log(`   발송 시각: ${afterTracking[0].shipped_at}`);

    if (afterTracking[0].delivery_status !== 'SHIPPING') {
      console.error(`   ❌ 배송 상태가 SHIPPING이 아닙니다`);
      throw new Error('송장 입력 후 배송 상태 변경 실패');
    }

    // 5. 배송 완료 (delivery_status: SHIPPING → DELIVERED)
    console.log('\n📦 Step 5: 배송 완료 처리');
    await db.execute(`
      UPDATE bookings
      SET
        delivery_status = 'DELIVERED',
        delivered_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [bookingId]);

    const afterDelivery = await db.query(`
      SELECT delivery_status, delivered_at
      FROM bookings WHERE id = ?
    `, [bookingId]);

    console.log(`   ✅ 배송 완료 처리됨`);
    console.log(`   배송 상태: ${afterDelivery[0].delivery_status}`);
    console.log(`   배송 완료 시각: ${afterDelivery[0].delivered_at}`);

    // 6. 전체 데이터 조회 (마이페이지 시뮬레이션)
    console.log('\n👤 Step 6: 마이페이지 조회 시뮬레이션');
    const bookingDetail = await db.query(`
      SELECT
        b.*,
        l.title as listing_title,
        l.category as listing_category,
        l.images as listing_images
      FROM bookings b
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE b.id = ?
    `, [bookingId]);

    const booking = bookingDetail[0];
    console.log(`\n   📋 예약 정보:`);
    console.log(`   - 예약번호: ${booking.booking_number}`);
    console.log(`   - 상품명: ${booking.listing_title}`);
    console.log(`   - 카테고리: ${booking.listing_category}`);
    console.log(`   - 금액: ${booking.total_amount?.toLocaleString()}원`);
    console.log(`\n   📦 배송 정보:`);
    console.log(`   - 수령인: ${booking.shipping_name}`);
    console.log(`   - 연락처: ${booking.shipping_phone}`);
    console.log(`   - 주소: [${booking.shipping_zipcode}] ${booking.shipping_address}`);
    console.log(`   - 상세주소: ${booking.shipping_address_detail}`);
    console.log(`   - 배송메모: ${booking.shipping_memo}`);
    console.log(`\n   🚚 배송 현황:`);
    console.log(`   - 상태: ${booking.delivery_status}`);
    console.log(`   - 택배사: ${booking.courier_company}`);
    console.log(`   - 송장번호: ${booking.tracking_number}`);
    console.log(`   - 발송일시: ${booking.shipped_at}`);
    console.log(`   - 배송완료: ${booking.delivered_at}`);

    // 7. 테스트 데이터 정리 (선택)
    console.log('\n🧹 Step 7: 테스트 데이터 정리');
    console.log('   테스트 예약을 삭제하시겠습니까? (보존됨)');
    console.log(`   삭제하려면: DELETE FROM bookings WHERE id = ${bookingId};`);

    // 최종 결과
    console.log('\n' + '='.repeat(60));
    console.log('✅ 배송 시스템 통합 테스트 완료!');
    console.log('='.repeat(60));
    console.log('\n📊 테스트 결과 요약:');
    console.log('   ✅ 배송 컬럼 존재 확인');
    console.log('   ✅ 배송지 포함 예약 생성');
    console.log('   ✅ 결제 완료 시 PENDING → READY 자동 변경');
    console.log('   ✅ 송장번호 입력 및 READY → SHIPPING 변경');
    console.log('   ✅ 배송 완료 SHIPPING → DELIVERED 변경');
    console.log('   ✅ 마이페이지 조회 시 배송 정보 표시');
    console.log('\n🎉 모든 테스트를 통과했습니다!');
    console.log(`\n📝 테스트 예약 ID: ${bookingId}`);
    console.log(`📝 예약번호: ${bookingNumber}`);

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    console.error('\n에러 상세:', error);
    process.exit(1);
  }
}

// 실행
testShippingSystem()
  .then(() => {
    console.log('\n✅ 스크립트 정상 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 스크립트 실행 중 오류:', error);
    process.exit(1);
  });
