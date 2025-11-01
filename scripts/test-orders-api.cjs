require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

async function testOrdersAPI() {
  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    console.log('\n🔍 로컬 orders.js 로직 테스트\n');
    console.log('='.repeat(80) + '\n');

    // payments 테이블에서 payment_id=60 조회
    const result = await connection.execute(`
      SELECT
        p.id,
        p.user_id,
        p.amount,
        p.payment_status,
        p.payment_key,
        p.gateway_transaction_id as order_number,
        p.notes,
        p.created_at,
        p.approved_at,
        p.refund_amount,
        p.refunded_at,
        b.id as booking_id,
        b.booking_number,
        b.status as booking_status,
        b.start_date,
        b.end_date,
        b.guests,
        b.adults,
        b.children,
        b.infants,
        b.listing_id,
        b.delivery_status,
        b.shipping_name,
        b.shipping_phone,
        b.shipping_address,
        b.shipping_address_detail,
        b.shipping_zipcode,
        b.tracking_number,
        b.courier_company,
        l.title as product_title,
        l.category,
        l.images
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE p.id = 60
    `);

    if (!result.rows || result.rows.length === 0) {
      console.error('❌ payment_id=60를 찾을 수 없습니다.');
      return;
    }

    const order = result.rows[0];
    console.log('📦 1. payments 테이블 조회 결과:\n');
    console.log(`   ID: ${order.id}`);
    console.log(`   User ID: ${order.user_id}`);
    console.log(`   Booking ID: ${order.booking_id}`);
    console.log(`   Notes: ${order.notes ? '있음' : '없음'}`);

    // users 테이블 조회
    const userIds = [order.user_id];
    const usersResult = await poolNeon.query(
      `SELECT id, name, email, phone, address, detail_address, postal_code FROM users WHERE id = $1`,
      userIds
    );

    let userMap = new Map();
    usersResult.rows.forEach(user => {
      userMap.set(user.id, user);
    });

    const user = userMap.get(order.user_id);
    console.log('\n👤 2. users 테이블 조회 결과:\n');
    if (user) {
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone}`);
    } else {
      console.log(`   ❌ user_id=${order.user_id}를 찾을 수 없습니다.`);
    }

    // notes 파싱
    let billingName = '';
    let billingEmail = '';
    let billingPhone = '';

    console.log('\n📝 3. notes 파싱:\n');

    if (order.notes) {
      try {
        const notesData = JSON.parse(order.notes);

        console.log(`   notes 파싱 성공`);

        if (notesData.billingInfo) {
          billingName = notesData.billingInfo.name || '';
          billingEmail = notesData.billingInfo.email || '';
          billingPhone = notesData.billingInfo.phone || '';

          console.log(`   billingInfo 발견:`);
          console.log(`     - name: ${billingName}`);
          console.log(`     - email: ${billingEmail}`);
          console.log(`     - phone: ${billingPhone}`);
        } else {
          console.log(`   ❌ billingInfo 없음`);
        }

        if (!billingName && notesData.shippingInfo) {
          billingName = notesData.shippingInfo.name || '';
          billingEmail = notesData.shippingInfo.email || '';
          billingPhone = notesData.shippingInfo.phone || '';

          console.log(`   shippingInfo로 fallback:`);
          console.log(`     - name: ${billingName}`);
          console.log(`     - email: ${billingEmail}`);
          console.log(`     - phone: ${billingPhone}`);
        }
      } catch (e) {
        console.log(`   ❌ notes 파싱 실패: ${e.message}`);
      }
    } else {
      console.log(`   ❌ notes가 없음`);
    }

    // 우선순위 적용
    console.log('\n🎯 4. 우선순위 적용:\n');

    const finalUserName = billingName || user?.name || order.shipping_name || '';
    const finalUserEmail = billingEmail || user?.email || '';
    const finalUserPhone = billingPhone || user?.phone || order.shipping_phone || '';

    console.log(`   finalUserName: "${finalUserName}"`);
    console.log(`     - billingName: "${billingName}"`);
    console.log(`     - user?.name: "${user?.name || ''}"`);
    console.log(`     - order.shipping_name: "${order.shipping_name || ''}"`);

    console.log(`\n   finalUserEmail: "${finalUserEmail}"`);
    console.log(`     - billingEmail: "${billingEmail}"`);
    console.log(`     - user?.email: "${user?.email || ''}"`);

    console.log(`\n   finalUserPhone: "${finalUserPhone}"`);
    console.log(`     - billingPhone: "${billingPhone}"`);
    console.log(`     - user?.phone: "${user?.phone || ''}"`);
    console.log(`     - order.shipping_phone: "${order.shipping_phone || ''}"`);

    console.log('\n' + '='.repeat(80));

    console.log('\n✅ 최종 결과:\n');
    console.log(`   user_name: "${finalUserName}"`);
    console.log(`   user_email: "${finalUserEmail}"`);
    console.log(`   user_phone: "${finalUserPhone}"`);

    if (!finalUserName || !finalUserEmail || !finalUserPhone) {
      console.log('\n❌❌❌ 문제: 빈 값이 있습니다!');
    } else {
      console.log('\n✅✅✅ 모든 값이 정상적으로 추출되었습니다!');
    }

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    console.error(error.stack);
  } finally {
    await poolNeon.end();
  }
}

testOrdersAPI();
