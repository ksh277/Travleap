const { connect } = require('@planetscale/database');
require('dotenv').config();

async function analyzeRentcarDataStructure() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n' + '='.repeat(80));
  console.log('렌트카 데이터 구조 분석');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. listings 테이블에서 렌트카 카테고리 확인
    console.log('1️⃣ listings 테이블에서 렌트카 데이터 확인\n');

    const listings = await connection.execute(`
      SELECT id, title, category, vendor_id
      FROM listings
      WHERE category = 'rentcar'
      LIMIT 3
    `);

    if (listings.rows && listings.rows.length > 0) {
      console.log(`   ✅ 렌트카 리스팅 ${listings.rows.length}건 발견:`);
      listings.rows.forEach((listing, idx) => {
        console.log(`      ${idx + 1}. ID: ${listing.id}, 제목: ${listing.title}, 벤더: ${listing.vendor_id}`);
      });

      // 2. 해당 리스팅에 대한 예약 조회
      console.log('\n2️⃣ 렌트카 리스팅에 대한 예약 조회\n');

      const listingIds = listings.rows.map(l => l.id);

      const bookings = await connection.execute(`
        SELECT id, booking_number, listing_id, user_id, status, payment_status,
               total_amount, customer_info, selected_options, check_in_info, check_out_info
        FROM bookings
        WHERE listing_id IN (${listingIds.join(',')})
        ORDER BY created_at DESC
        LIMIT 3
      `);

      if (bookings.rows && bookings.rows.length > 0) {
        console.log(`   ✅ 렌트카 예약 ${bookings.rows.length}건 발견:\n`);
        bookings.rows.forEach((booking, idx) => {
          console.log(`   ${idx + 1}. 예약번호: ${booking.booking_number}`);
          console.log(`      상태: ${booking.status} / 결제: ${booking.payment_status}`);
          console.log(`      금액: ${booking.total_amount?.toLocaleString()}원`);

          if (booking.customer_info) {
            try {
              const custInfo = typeof booking.customer_info === 'string'
                ? JSON.parse(booking.customer_info)
                : booking.customer_info;
              console.log(`      고객 정보:`, custInfo);
            } catch (e) {
              console.log(`      고객 정보 (파싱 실패):`, booking.customer_info);
            }
          }

          if (booking.selected_options) {
            try {
              const options = typeof booking.selected_options === 'string'
                ? JSON.parse(booking.selected_options)
                : booking.selected_options;
              console.log(`      선택 옵션:`, options);
            } catch (e) {
              console.log(`      선택 옵션 (파싱 실패)`);
            }
          }

          if (booking.check_in_info) {
            console.log(`      ✅ 체크인 정보 있음`);
          }

          if (booking.check_out_info) {
            console.log(`      ✅ 체크아웃 정보 있음`);
          }

          console.log('');
        });
      } else {
        console.log('   ⚠️  렌트카 예약 없음 (리스팅은 있지만 예약이 없음)\n');
      }

    } else {
      console.log('   ⚠️  렌트카 리스팅 없음\n');
    }

    // 3. rentcar_listings 전용 테이블 확인
    console.log('3️⃣ rentcar_listings 전용 테이블 확인\n');

    try {
      const rentcarListings = await connection.execute('DESCRIBE rentcar_listings');

      if (rentcarListings.rows.length > 0) {
        console.log('   ✅ rentcar_listings 테이블 존재');
        console.log('   컬럼:');
        rentcarListings.rows.forEach(row => {
          console.log(`      - ${row.Field} (${row.Type})`);
        });

        // 샘플 데이터 조회
        const rentcarSample = await connection.execute(`
          SELECT id, listing_id, vehicle_code, model, brand, seats
          FROM rentcar_listings
          LIMIT 3
        `);

        if (rentcarSample.rows && rentcarSample.rows.length > 0) {
          console.log('\n   샘플 데이터:');
          rentcarSample.rows.forEach((vehicle, idx) => {
            console.log(`      ${idx + 1}. ${vehicle.brand} ${vehicle.model} (${vehicle.seats}인승) - 차량번호: ${vehicle.vehicle_code}`);
          });
        }
      }
    } catch (error) {
      console.log('   ⚠️  rentcar_listings 테이블 없음 (별도 테이블 사용하지 않을 수 있음)');
    }

    // 4. payments 테이블에서 렌트카 결제 확인
    console.log('\n4️⃣ payments 테이블에서 렌트카 결제 데이터 확인\n');

    if (listings.rows && listings.rows.length > 0) {
      const listingIds = listings.rows.map(l => l.id);

      const payments = await connection.execute(`
        SELECT p.id, p.payment_key, p.amount, p.payment_status, p.notes
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        WHERE b.listing_id IN (${listingIds.join(',')})
        LIMIT 3
      `);

      if (payments.rows && payments.rows.length > 0) {
        console.log(`   ✅ 렌트카 결제 ${payments.rows.length}건 발견:`);
        payments.rows.forEach((payment, idx) => {
          console.log(`      ${idx + 1}. 금액: ${payment.amount?.toLocaleString()}원, 상태: ${payment.payment_status}`);

          if (payment.notes) {
            try {
              const notes = typeof payment.notes === 'string'
                ? JSON.parse(payment.notes)
                : payment.notes;
              if (notes.insuranceFee || notes.insurance) {
                console.log(`         보험료: ${notes.insuranceFee || 0}원`);
              }
              if (notes.extras) {
                console.log(`         옵션: ${JSON.stringify(notes.extras)}`);
              }
            } catch (e) {
              // notes 파싱 실패
            }
          }
        });
      } else {
        console.log('   ⚠️  렌트카 결제 데이터 없음');
      }
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

analyzeRentcarDataStructure()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
