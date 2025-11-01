require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

const paymentId = process.argv[2];

if (!paymentId) {
  console.error('❌ payment_id를 입력하세요: node scripts/debug-payment.cjs 60');
  process.exit(1);
}

async function main() {
  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

  try {
    console.log(`\n🔍 Payment ID ${paymentId} 전체 분석\n`);
    console.log('='.repeat(80) + '\n');

    // 1. payments 테이블 조회
    const paymentResult = await connection.execute(`
      SELECT * FROM payments WHERE id = ?
    `, [paymentId]);

    if (!paymentResult.rows || paymentResult.rows.length === 0) {
      console.error(`❌ payment_id=${paymentId}를 찾을 수 없습니다.`);
      process.exit(1);
    }

    const payment = paymentResult.rows[0];
    console.log('📦 1. PAYMENTS 테이블 데이터:\n');
    console.log(`   ID: ${payment.id}`);
    console.log(`   User ID: ${payment.user_id}`);
    console.log(`   Booking ID: ${payment.booking_id}`);
    console.log(`   Order ID: ${payment.order_id}`);
    console.log(`   Amount: ${payment.amount}원`);
    console.log(`   Payment Status: ${payment.payment_status}`);
    console.log(`   Gateway Transaction ID: ${payment.gateway_transaction_id}`);
    console.log(`   Created: ${payment.created_at}`);
    console.log(`   Notes: ${payment.notes ? '있음' : '없음'}`);

    if (payment.notes) {
      console.log('\n   📝 Notes 내용:');
      try {
        const notes = JSON.parse(payment.notes);
        console.log(JSON.stringify(notes, null, 2).split('\n').map(line => '      ' + line).join('\n'));

        console.log('\n   🔍 billingInfo 확인:');
        if (notes.billingInfo) {
          console.log(`      ✅ billingInfo 존재:`);
          console.log(`         - name: ${notes.billingInfo.name || '없음'}`);
          console.log(`         - email: ${notes.billingInfo.email || '없음'}`);
          console.log(`         - phone: ${notes.billingInfo.phone || '없음'}`);
        } else {
          console.log(`      ❌ billingInfo 없음!`);
        }

        console.log('\n   🔍 shippingInfo 확인:');
        if (notes.shippingInfo) {
          console.log(`      ✅ shippingInfo 존재:`);
          console.log(`         - name: ${notes.shippingInfo.name || '없음'}`);
          console.log(`         - phone: ${notes.shippingInfo.phone || '없음'}`);
          console.log(`         - address: ${notes.shippingInfo.address || '없음'}`);
          console.log(`         - addressDetail: ${notes.shippingInfo.addressDetail || '없음'}`);
          console.log(`         - zipcode: ${notes.shippingInfo.zipcode || '없음'}`);
        } else {
          console.log(`      ❌ shippingInfo 없음!`);
        }
      } catch (e) {
        console.log(`      ❌ JSON 파싱 실패: ${e.message}`);
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // 2. users 테이블 조회 (Neon PostgreSQL)
    console.log('👤 2. USERS 테이블 데이터 (Neon PostgreSQL):\n');

    const userResult = await poolNeon.query(`
      SELECT id, name, email, phone, address, detail_address, postal_code
      FROM users WHERE id = $1
    `, [payment.user_id]);

    if (userResult.rows && userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`   ✅ User ID ${payment.user_id} 발견:`);
      console.log(`      - Name: ${user.name || '없음'}`);
      console.log(`      - Email: ${user.email || '없음'}`);
      console.log(`      - Phone: ${user.phone || '없음'}`);
      console.log(`      - Address: ${user.address || '없음'}`);
      console.log(`      - Detail Address: ${user.detail_address || '없음'}`);
      console.log(`      - Postal Code: ${user.postal_code || '없음'}`);
    } else {
      console.log(`   ❌ User ID ${payment.user_id}를 찾을 수 없습니다!`);
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // 3. bookings 테이블 조회 (있을 경우)
    if (payment.booking_id) {
      console.log('📋 3. BOOKINGS 테이블 데이터:\n');

      const bookingResult = await connection.execute(`
        SELECT * FROM bookings WHERE id = ?
      `, [payment.booking_id]);

      if (bookingResult.rows && bookingResult.rows.length > 0) {
        const booking = bookingResult.rows[0];
        console.log(`   ✅ Booking ID ${payment.booking_id} 발견:`);
        console.log(`      - Shipping Name: ${booking.shipping_name || '없음'}`);
        console.log(`      - Shipping Phone: ${booking.shipping_phone || '없음'}`);
        console.log(`      - Shipping Address: ${booking.shipping_address || '없음'}`);
        console.log(`      - Shipping Address Detail: ${booking.shipping_address_detail || '없음'}`);
        console.log(`      - Shipping Zipcode: ${booking.shipping_zipcode || '없음'}`);
      } else {
        console.log(`   ❌ Booking ID ${payment.booking_id}를 찾을 수 없습니다!`);
      }
    } else {
      console.log('📋 3. BOOKINGS 테이블:\n');
      console.log('   ⚠️  booking_id가 null입니다 (장바구니 주문)');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // 4. 최종 분석
    console.log('🎯 4. 최종 분석:\n');

    let finalName = '';
    let finalEmail = '';
    let finalPhone = '';
    let finalAddress = '';
    let source = '';

    if (payment.notes) {
      try {
        const notes = JSON.parse(payment.notes);
        if (notes.billingInfo) {
          finalName = notes.billingInfo.name || '';
          finalEmail = notes.billingInfo.email || '';
          finalPhone = notes.billingInfo.phone || '';
          source = 'notes.billingInfo';
        }
      } catch (e) {}
    }

    if (!finalName || !finalEmail || !finalPhone) {
      if (userResult.rows && userResult.rows.length > 0) {
        const user = userResult.rows[0];
        finalName = finalName || user.name || '';
        finalEmail = finalEmail || user.email || '';
        finalPhone = finalPhone || user.phone || '';
        finalAddress = user.address || '';
        source = source ? `${source} + users` : 'users';
      }
    }

    console.log(`   📊 orders.js가 반환해야 할 값:`);
    console.log(`      - user_name: "${finalName}" (출처: ${source || '없음'})`);
    console.log(`      - user_email: "${finalEmail}" (출처: ${source || '없음'})`);
    console.log(`      - user_phone: "${finalPhone}" (출처: ${source || '없음'})`);

    if (!finalName && !finalEmail && !finalPhone) {
      console.log(`\n   ❌❌❌ 문제: 어떤 소스에서도 사용자 정보를 가져올 수 없습니다!`);
      console.log(`      1. notes에 billingInfo 없음`);
      console.log(`      2. users 테이블에 데이터 없음 또는 조회 실패`);
    }

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    console.error(error.stack);
  } finally {
    await poolNeon.end();
  }
}

main();
