const { connect } = require('@planetscale/database');
require('dotenv').config();

async function verifyAllFixes() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n' + '='.repeat(80));
  console.log('전체 수정사항 검증');
  console.log('='.repeat(80) + '\n');

  let allPassed = true;

  // 1. cart_items 테이블 스키마 확인
  console.log('1️⃣ 장바구니 테이블 스키마 검증...');
  try {
    const cartSchema = await connection.execute('DESCRIBE cart_items');
    const hasSelectedInsurance = cartSchema.rows.some(row => row.Field === 'selected_insurance');
    const hasInsuranceFee = cartSchema.rows.some(row => row.Field === 'insurance_fee');

    if (hasSelectedInsurance && hasInsuranceFee) {
      console.log('   ✅ cart_items 테이블에 보험 컬럼 존재');
    } else {
      console.log('   ❌ cart_items 테이블에 보험 컬럼 누락');
      if (!hasSelectedInsurance) console.log('      - selected_insurance 컬럼 없음');
      if (!hasInsuranceFee) console.log('      - insurance_fee 컬럼 없음');
      allPassed = false;
    }
  } catch (error) {
    console.log('   ❌ 테이블 조회 실패:', error.message);
    allPassed = false;
  }

  // 2. bookings 테이블 스키마 확인
  console.log('\n2️⃣ bookings 테이블 스키마 검증...');
  try {
    const bookingsSchema = await connection.execute('DESCRIBE bookings');
    const hasCheckedInAt = bookingsSchema.rows.some(row => row.Field === 'checked_in_at');
    const hasCheckInInfo = bookingsSchema.rows.some(row => row.Field === 'check_in_info');

    if (!hasCheckedInAt && hasCheckInInfo) {
      console.log('   ✅ bookings 테이블 스키마 정상 (check_in_info 사용)');
    } else {
      if (hasCheckedInAt) {
        console.log('   ⚠️ checked_in_at 컬럼이 존재함 (사용하지 않는 컬럼)');
      }
      if (!hasCheckInInfo) {
        console.log('   ❌ check_in_info 컬럼이 없음');
        allPassed = false;
      }
    }
  } catch (error) {
    console.log('   ❌ 테이블 조회 실패:', error.message);
    allPassed = false;
  }

  // 3. API 파일 존재 여부 확인
  console.log('\n3️⃣ API 파일 존재 여부 확인...');
  const fs = require('fs');
  const path = require('path');

  const criticalFiles = [
    'api/cart.js',
    'api/orders.js',
    'api/payments/refund.js',
    'api/admin/refund-booking.js',
    'components/PaymentPage.tsx',
    'components/admin/tabs/AdminOrders.tsx'
  ];

  let filesExist = true;
  for (const file of criticalFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - 파일 없음`);
      filesExist = false;
      allPassed = false;
    }
  }

  // 4. 데이터 샘플 조회 (장바구니)
  console.log('\n4️⃣ 장바구니 데이터 샘플 조회...');
  try {
    const cartSample = await connection.execute(`
      SELECT id, user_id, listing_id, quantity, selected_insurance, insurance_fee
      FROM cart_items
      LIMIT 1
    `);

    if (cartSample.rows && cartSample.rows.length > 0) {
      console.log('   ✅ 장바구니 데이터 조회 성공');
      console.log(`      샘플: cart_id=${cartSample.rows[0].id}, insurance_fee=${cartSample.rows[0].insurance_fee || 0}원`);
    } else {
      console.log('   ⚠️ 장바구니 데이터 없음 (정상 - 빈 장바구니)');
    }
  } catch (error) {
    console.log('   ❌ 데이터 조회 실패:', error.message);
    allPassed = false;
  }

  // 5. payments 테이블 샘플 조회
  console.log('\n5️⃣ 결제 데이터 샘플 조회...');
  try {
    const paymentSample = await connection.execute(`
      SELECT id, amount, payment_status, notes
      FROM payments
      WHERE payment_status IN ('paid', 'completed')
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (paymentSample.rows && paymentSample.rows.length > 0) {
      console.log('   ✅ 결제 데이터 조회 성공');
      const payment = paymentSample.rows[0];

      // notes에 보험 정보 있는지 확인
      if (payment.notes) {
        try {
          const notes = JSON.parse(payment.notes);
          if (notes.insuranceFee || notes.insurance) {
            console.log(`      보험 정보 포함: insuranceFee=${notes.insuranceFee || 0}원`);
          } else {
            console.log('      보험 정보 없음 (보험 미선택 주문)');
          }
        } catch (e) {
          console.log('      notes 파싱 실패');
        }
      }
    } else {
      console.log('   ⚠️ 결제 데이터 없음');
    }
  } catch (error) {
    console.log('   ❌ 데이터 조회 실패:', error.message);
  }

  // 최종 결과
  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log('🎉 모든 검증 통과! 시스템이 정상적으로 작동합니다.');
  } else {
    console.log('⚠️ 일부 검증 실패. 위 내용을 확인해주세요.');
  }
  console.log('='.repeat(80) + '\n');

  return allPassed;
}

verifyAllFixes().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(error => {
  console.error('\n❌ 검증 중 오류 발생:', error);
  process.exit(1);
});
