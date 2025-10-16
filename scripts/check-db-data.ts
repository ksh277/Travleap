// DB 데이터 확인 스크립트
import 'dotenv/config';
import { db } from '../utils/database';

async function checkDatabaseData() {
  console.log('🔍 데이터베이스 데이터 확인 시작...\n');

  try {
    // 1. 카테고리
    console.log('📂 [카테고리]');
    const categories = await db.query('SELECT id, slug, name_ko, name_en FROM categories ORDER BY sort_order');
    console.log(`   총 ${categories.length}개`);
    categories.forEach((cat: any) => {
      console.log(`   - ${cat.name_ko} (${cat.slug})`);
    });

    // 2. 상품 (listings)
    console.log('\n📦 [상품 (Listings)]');
    const listings = await db.query(`
      SELECT l.id, l.title, l.category, c.name_ko as category_name, l.price_from, l.is_published
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      ORDER BY l.created_at DESC
      LIMIT 20
    `);
    console.log(`   총 ${listings.length}개 (최근 20개)`);
    listings.forEach((listing: any) => {
      const status = listing.is_published ? '✅' : '❌';
      console.log(`   ${status} [${listing.category_name || listing.category}] ${listing.title} - ${listing.price_from?.toLocaleString()}원`);
    });

    // 3. 사용자
    console.log('\n👥 [사용자]');
    const users = await db.query('SELECT id, email, name, role FROM users ORDER BY created_at DESC LIMIT 10');
    console.log(`   총 ${users.length}개 (최근 10개)`);
    users.forEach((user: any) => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
    });

    // 4. 파트너
    console.log('\n🤝 [파트너]');
    const partners = await db.query('SELECT id, business_name, status, tier FROM partners ORDER BY created_at DESC LIMIT 10');
    console.log(`   총 ${partners.length}개`);
    partners.forEach((partner: any) => {
      console.log(`   - ${partner.business_name} - ${partner.status} (${partner.tier})`);
    });

    // 5. 예약
    console.log('\n📅 [예약 (Bookings)]');
    const bookings = await db.query(`
      SELECT b.id, b.booking_number, l.title as listing_title, b.total_amount, b.status, b.payment_status
      FROM bookings b
      LEFT JOIN listings l ON b.listing_id = l.id
      ORDER BY b.created_at DESC
      LIMIT 10
    `);
    console.log(`   총 ${bookings.length}개 (최근 10개)`);
    bookings.forEach((booking: any) => {
      console.log(`   - ${booking.booking_number}: ${booking.listing_title} - ${booking.total_amount?.toLocaleString()}원 [${booking.status}/${booking.payment_status}]`);
    });

    // 6. 리뷰
    console.log('\n⭐ [리뷰]');
    const reviews = await db.query(`
      SELECT r.id, r.rating, r.title, l.title as listing_title
      FROM reviews r
      LEFT JOIN listings l ON r.listing_id = l.id
      ORDER BY r.created_at DESC
      LIMIT 10
    `);
    console.log(`   총 ${reviews.length}개 (최근 10개)`);
    reviews.forEach((review: any) => {
      console.log(`   - [${review.listing_title}] ${review.title} - ⭐${review.rating}`);
    });

    // 7. 배너
    console.log('\n🎨 [배너]');
    const banners = await db.query('SELECT id, title, is_active FROM home_banners ORDER BY display_order');
    console.log(`   총 ${banners.length}개`);
    banners.forEach((banner: any) => {
      const status = banner.is_active ? '✅' : '❌';
      console.log(`   ${status} ${banner.title}`);
    });

    // 8. 액티비티 이미지
    console.log('\n🏞️ [액티비티 이미지]');
    const activities = await db.query('SELECT id, title, size, is_active FROM activity_images ORDER BY display_order');
    console.log(`   총 ${activities.length}개`);
    activities.forEach((activity: any) => {
      const status = activity.is_active ? '✅' : '❌';
      console.log(`   ${status} ${activity.title} (${activity.size})`);
    });

    // 9. 관리자 설정
    console.log('\n⚙️ [관리자 설정]');
    const settings = await db.query('SELECT setting_key, setting_value FROM admin_settings');
    console.log(`   총 ${settings.length}개`);
    settings.forEach((setting: any) => {
      console.log(`   - ${setting.setting_key}: ${setting.setting_value}`);
    });

    // 10. 테이블 목록
    console.log('\n📊 [전체 테이블 목록]');
    const tables = await db.query(`
      SELECT table_name, table_rows
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      ORDER BY table_name
    `);
    console.log(`   총 ${tables.length}개 테이블`);
    tables.forEach((table: any) => {
      console.log(`   - ${table.table_name || table.TABLE_NAME}`);
    });

    console.log('\n✅ 데이터베이스 확인 완료!');
  } catch (error) {
    console.error('❌ 데이터베이스 확인 실패:', error);
    throw error;
  }
}

// 스크립트 실행
checkDatabaseData()
  .then(() => {
    console.log('\n✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });
