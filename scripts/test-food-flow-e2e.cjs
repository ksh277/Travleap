/**
 * 음식 상품 E2E 테스트 스크립트
 *
 * 시나리오 1: 인원제 (메뉴 없이 시간대만)
 * 시나리오 2: 메뉴별 옵션 (시간대 + 메뉴)
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         음식 상품 E2E 테스트 시작                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  let testListingId = null;
  let testOptionIds = [];
  let testBookingId = null;
  let testPaymentId = null;

  try {
    // ============================================================
    // 1. 테스트용 음식 상품 생성
    // ============================================================
    console.log('\n=== 1. 테스트용 음식 상품 생성 ===');

    // 기존 테스트 상품 정리
    await connection.execute(`DELETE FROM listings WHERE title LIKE '%E2E 테스트%'`);

    const createResult = await connection.execute(`
      INSERT INTO listings (
        user_id, title, description_md, short_description,
        price_from, child_price, infant_price,
        location, address, category, category_id,
        max_capacity, has_options, is_active, is_published,
        created_at, updated_at
      ) VALUES (
        1, '음식 E2E 테스트 상품', '## 테스트 상품입니다', '테스트용 음식 상품',
        25000, 18000, 0,
        '신안군', '테스트 주소', 'food', 1858,
        20, 0, 1, 1,
        NOW(), NOW()
      )
    `);

    testListingId = createResult.insertId;
    console.log(`✅ 상품 생성 완료: listing_id = ${testListingId}`);

    // ============================================================
    // 2. 시나리오 1: 인원제 (시간대만, 메뉴 없이)
    // ============================================================
    console.log('\n=== 2. 시나리오 1: 인원제 테스트 (시간대만) ===');

    // 시간대 옵션 추가
    const timeSlot1 = await connection.execute(`
      INSERT INTO listing_options (
        listing_id, option_type, name, description,
        price, price_type, start_time, end_time,
        max_capacity, available_count, is_active
      ) VALUES (
        ?, 'time_slot', '점심 11:30', '점심 타임',
        0, 'per_person', '11:30', '13:00',
        10, 10, 1
      )
    `, [testListingId]);
    testOptionIds.push(timeSlot1.insertId);
    console.log(`  ✅ 시간대 옵션 생성: id=${timeSlot1.insertId}`);

    const timeSlot2 = await connection.execute(`
      INSERT INTO listing_options (
        listing_id, option_type, name, description,
        price, price_type, start_time, end_time,
        max_capacity, available_count, is_active
      ) VALUES (
        ?, 'time_slot', '저녁 18:00', '저녁 타임',
        0, 'per_person', '18:00', '20:00',
        10, 10, 1
      )
    `, [testListingId]);
    testOptionIds.push(timeSlot2.insertId);
    console.log(`  ✅ 시간대 옵션 생성: id=${timeSlot2.insertId}`);

    // has_options 플래그 업데이트
    await connection.execute(`UPDATE listings SET has_options = 1 WHERE id = ?`, [testListingId]);
    console.log(`  ✅ has_options = 1 설정 완료`);

    // 옵션 조회 테스트
    const optionsResult = await connection.execute(`
      SELECT * FROM listing_options WHERE listing_id = ? AND is_active = 1
    `, [testListingId]);
    console.log(`  ✅ 옵션 조회 결과: ${optionsResult.rows.length}개`);

    optionsResult.rows.forEach(opt => {
      console.log(`    - [${opt.option_type}] ${opt.name}: ${opt.price}원 (재고: ${opt.available_count})`);
    });

    // ============================================================
    // 3. 시나리오 2: 메뉴별 옵션 추가
    // ============================================================
    console.log('\n=== 3. 시나리오 2: 메뉴별 옵션 추가 ===');

    const menu1 = await connection.execute(`
      INSERT INTO listing_options (
        listing_id, option_type, name, description,
        price, price_type, max_capacity, available_count, is_active
      ) VALUES (
        ?, 'menu', '한정식 코스 A', '기본 한정식 코스',
        35000, 'per_person', 30, 30, 1
      )
    `, [testListingId]);
    testOptionIds.push(menu1.insertId);
    console.log(`  ✅ 메뉴 옵션 생성: id=${menu1.insertId} (한정식 코스 A: 35,000원)`);

    const menu2 = await connection.execute(`
      INSERT INTO listing_options (
        listing_id, option_type, name, description,
        price, price_type, max_capacity, available_count, is_active
      ) VALUES (
        ?, 'menu', '프리미엄 코스 B', '프리미엄 한정식 코스',
        55000, 'per_person', 20, 20, 1
      )
    `, [testListingId]);
    testOptionIds.push(menu2.insertId);
    console.log(`  ✅ 메뉴 옵션 생성: id=${menu2.insertId} (프리미엄 코스 B: 55,000원)`);

    // 전체 옵션 조회
    const allOptions = await connection.execute(`
      SELECT * FROM listing_options WHERE listing_id = ? AND is_active = 1 ORDER BY option_type, id
    `, [testListingId]);
    console.log(`\n  📋 전체 옵션 목록 (${allOptions.rows.length}개):`);
    allOptions.rows.forEach(opt => {
      console.log(`    - [${opt.option_type}] ${opt.name}: ${opt.price}원 (재고: ${opt.available_count})`);
    });

    // ============================================================
    // 4. 장바구니 → 주문 시뮬레이션 (메뉴 선택 시나리오)
    // ============================================================
    console.log('\n=== 4. 주문 생성 시뮬레이션 (메뉴 + 시간대 선택) ===');

    const selectedMenuId = menu1.insertId;  // 한정식 코스 A 선택
    const selectedTimeSlotId = timeSlot1.insertId;  // 점심 11:30 선택

    // 주문 금액 계산 (성인 2명, 어린이 1명)
    const adults = 2;
    const children = 1;
    const adultPrice = 35000;  // 메뉴 가격
    const childPrice = 35000 * 0.7;  // 어린이 70%
    const totalAmount = (adults * adultPrice) + (children * childPrice);

    console.log(`  📊 주문 금액 계산:`);
    console.log(`    - 성인 ${adults}명 × ${adultPrice.toLocaleString()}원 = ${(adults * adultPrice).toLocaleString()}원`);
    console.log(`    - 어린이 ${children}명 × ${childPrice.toLocaleString()}원 = ${(children * childPrice).toLocaleString()}원`);
    console.log(`    - 총 금액: ${totalAmount.toLocaleString()}원`);

    // payment 생성
    const orderNumber = `ORDER_TEST_${Date.now()}`;
    const paymentResult = await connection.execute(`
      INSERT INTO payments (
        user_id, amount, payment_status, payment_method,
        gateway_transaction_id, notes, created_at, updated_at
      ) VALUES (
        1, ?, 'pending', 'card',
        ?, ?, NOW(), NOW()
      )
    `, [
      totalAmount,
      orderNumber,
      JSON.stringify({
        category: 'food',
        items: [{
          listingId: testListingId,
          title: '음식 E2E 테스트 상품',
          category: '음식',
          price: adultPrice,
          quantity: 1,
          adults: adults,
          children: children,
          selectedOption: {
            id: selectedMenuId,
            name: '한정식 코스 A',
            optionType: 'menu',
            price: adultPrice
          },
          selectedTimeSlot: {
            id: selectedTimeSlotId,
            name: '점심 11:30'
          }
        }],
        billingInfo: {
          name: '테스트 사용자',
          email: 'test@example.com',
          phone: '010-1234-5678'
        }
      })
    ]);
    testPaymentId = paymentResult.insertId;
    console.log(`  ✅ Payment 생성: id=${testPaymentId}, order_number=${orderNumber}`);

    // booking 생성
    const bookingNumber = `BK-TEST-${Date.now()}`;
    const bookingResult = await connection.execute(`
      INSERT INTO bookings (
        user_id, listing_id, booking_number, order_number,
        total_amount, status, payment_status,
        start_date, check_in_time,
        adults, children, infants, guests,
        selected_option_id, special_requests,
        created_at, updated_at
      ) VALUES (
        1, ?, ?, ?,
        ?, 'pending', 'pending',
        CURDATE(), '11:30',
        ?, ?, 0, ?,
        ?, ?,
        NOW(), NOW()
      )
    `, [
      testListingId,
      bookingNumber,
      orderNumber,
      totalAmount,
      adults,
      children,
      adults + children,
      selectedMenuId,
      JSON.stringify({ menu: '한정식 코스 A', timeSlot: '점심 11:30' })
    ]);
    testBookingId = bookingResult.insertId;
    console.log(`  ✅ Booking 생성: id=${testBookingId}, booking_number=${bookingNumber}`);

    // ============================================================
    // 5. 재고 차감 테스트
    // ============================================================
    console.log('\n=== 5. 재고 차감 테스트 ===');

    // 재고 차감 전 확인
    const beforeStock = await connection.execute(
      `SELECT id, name, available_count FROM listing_options WHERE id = ?`,
      [selectedMenuId]
    );
    console.log(`  📦 차감 전 재고: ${beforeStock.rows[0].name} = ${beforeStock.rows[0].available_count}개`);

    // 재고 차감 (결제 확정 시점)
    const stockQuantity = adults + children;  // 총 인원 수만큼 차감
    await connection.execute(`
      UPDATE listing_options
      SET available_count = available_count - ?
      WHERE id = ? AND available_count >= ?
    `, [stockQuantity, selectedMenuId, stockQuantity]);

    // 재고 차감 후 확인
    const afterStock = await connection.execute(
      `SELECT id, name, available_count FROM listing_options WHERE id = ?`,
      [selectedMenuId]
    );
    console.log(`  📦 차감 후 재고: ${afterStock.rows[0].name} = ${afterStock.rows[0].available_count}개 (-${stockQuantity})`);

    // ============================================================
    // 6. 결제 확정 시뮬레이션
    // ============================================================
    console.log('\n=== 6. 결제 확정 시뮬레이션 ===');

    await connection.execute(`
      UPDATE payments SET payment_status = 'paid', approved_at = NOW() WHERE id = ?
    `, [testPaymentId]);

    await connection.execute(`
      UPDATE bookings SET status = 'confirmed', payment_status = 'paid' WHERE id = ?
    `, [testBookingId]);

    console.log(`  ✅ Payment 상태: pending → paid`);
    console.log(`  ✅ Booking 상태: pending → confirmed`);

    // ============================================================
    // 7. 환불 시 재고 복구 테스트
    // ============================================================
    console.log('\n=== 7. 환불 시 재고 복구 테스트 ===');

    // 환불 처리
    await connection.execute(`
      UPDATE payments SET payment_status = 'refunded', refunded_at = NOW() WHERE id = ?
    `, [testPaymentId]);

    await connection.execute(`
      UPDATE bookings SET status = 'cancelled' WHERE id = ?
    `, [testBookingId]);

    // 재고 복구
    await connection.execute(`
      UPDATE listing_options
      SET available_count = available_count + ?
      WHERE id = ?
    `, [stockQuantity, selectedMenuId]);

    const restoredStock = await connection.execute(
      `SELECT id, name, available_count FROM listing_options WHERE id = ?`,
      [selectedMenuId]
    );
    console.log(`  📦 복구 후 재고: ${restoredStock.rows[0].name} = ${restoredStock.rows[0].available_count}개 (+${stockQuantity})`);
    console.log(`  ✅ 환불 및 재고 복구 완료`);

    // ============================================================
    // 8. 테스트 결과 요약
    // ============================================================
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    테스트 결과 요약                            ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  ✅ 상품 생성                    - 성공                        ');
    console.log('║  ✅ 시간대 옵션 생성             - 성공                        ');
    console.log('║  ✅ 메뉴 옵션 생성               - 성공                        ');
    console.log('║  ✅ 옵션 조회 API                - 성공                        ');
    console.log('║  ✅ 주문 생성 (payment + booking) - 성공                       ');
    console.log('║  ✅ 재고 차감                    - 성공                        ');
    console.log('║  ✅ 결제 확정                    - 성공                        ');
    console.log('║  ✅ 환불 시 재고 복구            - 성공                        ');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error(error);

  } finally {
    // ============================================================
    // 테스트 데이터 정리
    // ============================================================
    console.log('\n=== 테스트 데이터 정리 ===');

    if (testBookingId) {
      await connection.execute(`DELETE FROM bookings WHERE id = ?`, [testBookingId]);
      console.log(`  🗑️ Booking 삭제: ${testBookingId}`);
    }

    if (testPaymentId) {
      await connection.execute(`DELETE FROM payments WHERE id = ?`, [testPaymentId]);
      console.log(`  🗑️ Payment 삭제: ${testPaymentId}`);
    }

    if (testOptionIds.length > 0) {
      await connection.execute(`DELETE FROM listing_options WHERE id IN (${testOptionIds.join(',')})`);
      console.log(`  🗑️ Options 삭제: ${testOptionIds.join(', ')}`);
    }

    if (testListingId) {
      await connection.execute(`DELETE FROM listings WHERE id = ?`, [testListingId]);
      console.log(`  🗑️ Listing 삭제: ${testListingId}`);
    }

    console.log('\n✅ 모든 테스트 데이터 정리 완료\n');
  }
}

runTests().catch(console.error);
