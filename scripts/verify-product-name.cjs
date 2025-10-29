/**
 * 상품명 표시 검증 스크립트
 * payments 테이블의 notes 필드와 listing_title을 확인
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

const USER_ID = 11;

async function verifyProductName() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('🔍 [상품명 표시 검증] 시작...\n');

  try {
    // 1. payments 테이블 조회
    console.log('📊 [1단계] payments 테이블 - notes 및 listing 정보 확인\n');

    const result = await connection.execute(`
      SELECT
        p.id,
        p.order_id_str,
        p.payment_status,
        p.amount,
        p.notes,
        b.booking_number,
        b.listing_id,
        l.title as listing_title,
        l.category
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT 5
    `, [USER_ID]);

    if (!result.rows || result.rows.length === 0) {
      console.log('❌ 결제 내역이 없습니다.');
      return;
    }

    for (const payment of result.rows) {
      console.log('─'.repeat(100));
      console.log(`📦 Payment ID: ${payment.id}`);
      console.log(`   Order ID: ${payment.order_id_str}`);
      console.log(`   Status: ${payment.payment_status}`);
      console.log(`   Amount: ${payment.amount}원`);
      console.log(`   Listing ID: ${payment.listing_id || 'NULL'}`);
      console.log(`   Listing Title: ${payment.listing_title || 'NULL'}`);
      console.log(`   Category: ${payment.category || 'NULL'}`);

      // notes 파싱
      if (payment.notes) {
        try {
          const notes = typeof payment.notes === 'string'
            ? JSON.parse(payment.notes)
            : payment.notes;

          console.log('\n   📝 Notes 내용:');
          console.log(`      subtotal: ${notes.subtotal || 'N/A'}`);
          console.log(`      deliveryFee: ${notes.deliveryFee || 'N/A'}`);
          console.log(`      total: ${notes.total || 'N/A'}`);

          if (notes.items && Array.isArray(notes.items)) {
            console.log(`\n      🛒 Items (${notes.items.length}개):`);
            notes.items.forEach((item, idx) => {
              console.log(`         [${idx + 1}] title: "${item.title || 'N/A'}"`);
              console.log(`             name: "${item.name || 'N/A'}"`);
              console.log(`             productTitle: "${item.productTitle || 'N/A'}"`);
              console.log(`             listingId: ${item.listingId || 'N/A'}`);
              console.log(`             quantity: ${item.quantity || 'N/A'}`);
              console.log(`             price: ${item.price || 'N/A'}`);
            });
          } else {
            console.log('      ⚠️  items 배열 없음');
          }

          // 상품명 결정 로직 시뮬레이션
          console.log('\n   🎯 상품명 결정 로직:');
          let displayTitle = payment.listing_title || '';

          if (notes.items && Array.isArray(notes.items) && notes.items.length > 0) {
            const firstItem = notes.items[0];
            const firstItemTitle = firstItem?.title || firstItem?.name || firstItem?.productTitle || '';

            if (notes.items.length > 1) {
              displayTitle = firstItemTitle
                ? `${firstItemTitle} 외 ${notes.items.length - 1}개`
                : (payment.listing_title || '주문');
            } else {
              displayTitle = firstItemTitle || payment.listing_title || '주문';
            }
          } else if (!displayTitle) {
            displayTitle = '주문';
          }

          console.log(`      ✅ 최종 표시: "${displayTitle}"`);

        } catch (e) {
          console.log('   ❌ notes 파싱 실패:', e.message);
        }
      } else {
        console.log('   ⚠️  notes 필드 없음');
      }

      console.log('');
    }

    console.log('─'.repeat(100));
    console.log('\n✅ [검증 완료]\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

verifyProductName();
