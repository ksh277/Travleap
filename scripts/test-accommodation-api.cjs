const mysql = require('mysql2/promise');
require('dotenv').config();

async function testAccommodationAPI() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: { rejectUnauthorized: true }
    });

    console.log('\n' + '='.repeat(80));
    console.log('🏨 숙박 API 데이터 구조 테스트');
    console.log('='.repeat(80));

    // 호텔별 그룹핑 (API가 반환할 데이터와 동일한 쿼리)
    const [hotels] = await connection.execute(`
      SELECT
        p.id as partner_id,
        p.business_name,
        p.contact_name,
        p.phone,
        p.email,
        p.tier,
        p.is_verified,
        COUNT(l.id) as room_count,
        MIN(l.price_from) as min_price,
        MAX(l.price_from) as max_price,
        MIN(l.images) as sample_images,
        GROUP_CONCAT(DISTINCT l.location SEPARATOR ', ') as locations,
        AVG(l.rating_avg) as avg_rating,
        SUM(l.rating_count) as total_reviews
      FROM listings l
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE l.category_id = 1857
        AND l.is_published = 1
        AND l.is_active = 1
      GROUP BY p.id, p.business_name, p.contact_name, p.phone, p.email, p.tier, p.is_verified
      ORDER BY p.business_name
    `);

    console.log('\n📊 호텔 목록 API 결과:');
    console.log('-'.repeat(80));
    console.log(`총 ${hotels.length}개 호텔`);

    hotels.forEach((hotel, idx) => {
      console.log(`\n${idx + 1}. ${hotel.business_name} (Partner ID: ${hotel.partner_id})`);
      console.log(`   - 객실 수: ${hotel.room_count}개`);
      console.log(`   - 가격 범위: ₩${hotel.min_price?.toLocaleString()} ~ ₩${hotel.max_price?.toLocaleString()}`);
      console.log(`   - 위치: ${hotel.locations || 'N/A'}`);
      console.log(`   - 평점: ${hotel.avg_rating ? parseFloat(hotel.avg_rating).toFixed(1) : 'N/A'} (${hotel.total_reviews || 0}개 리뷰)`);
      console.log(`   - 인증 여부: ${hotel.is_verified ? '✅' : '❌'}`);
      console.log(`   - 티어: ${hotel.tier || 'N/A'}`);

      // 이미지 파싱 테스트
      if (hotel.sample_images) {
        try {
          const images = JSON.parse(hotel.sample_images);
          console.log(`   - 샘플 이미지: ${Array.isArray(images) ? images.length + '개' : '형식 오류'}`);
        } catch (e) {
          console.log(`   - 샘플 이미지: JSON 파싱 오류`);
        }
      }
    });

    // 특정 호텔의 객실 목록 조회 테스트 (첫 번째 호텔)
    if (hotels.length > 0) {
      const testHotel = hotels[0];
      console.log('\n\n📋 호텔 상세 (객실 목록) API 테스트:');
      console.log('-'.repeat(80));
      console.log(`테스트 대상: ${testHotel.business_name} (Partner ID: ${testHotel.partner_id})`);

      const [rooms] = await connection.execute(`
        SELECT
          l.id,
          l.title,
          l.short_description,
          l.description_md,
          l.images,
          l.price_from,
          l.price_to,
          l.location,
          l.amenities,
          l.highlights,
          l.available_spots,
          l.rating_avg,
          l.rating_count,
          l.is_featured,
          c.slug as category_slug,
          c.name_ko as category_name
        FROM listings l
        LEFT JOIN categories c ON l.category_id = c.id
        WHERE l.partner_id = ?
          AND l.category_id = 1857
          AND l.is_published = 1
          AND l.is_active = 1
        ORDER BY l.price_from ASC
      `, [testHotel.partner_id]);

      console.log(`\n총 ${rooms.length}개 객실:`);
      rooms.forEach((room, idx) => {
        console.log(`\n  ${idx + 1}. ${room.title} (ID: ${room.id})`);
        console.log(`     - 가격: ₩${room.price_from?.toLocaleString()}/박`);
        console.log(`     - 재고: ${room.available_spots}개`);
        console.log(`     - 평점: ${room.rating_avg || 'N/A'}`);

        // JSON 필드 파싱 테스트
        try {
          const images = JSON.parse(room.images || '[]');
          console.log(`     - 이미지: ${Array.isArray(images) ? images.length + '개' : '형식 오류'}`);
        } catch (e) {
          console.log(`     - 이미지: JSON 파싱 오류`);
        }

        try {
          const amenities = JSON.parse(room.amenities || '[]');
          console.log(`     - 편의시설: ${Array.isArray(amenities) ? amenities.length + '개' : '형식 오류'}`);
        } catch (e) {
          console.log(`     - 편의시설: JSON 파싱 오류`);
        }
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ API 데이터 구조 테스트 완료');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  } finally {
    if (connection) await connection.end();
  }
}

testAccommodationAPI();
