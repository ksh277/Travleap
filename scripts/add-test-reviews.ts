import { connect } from '@planetscale/database';
import { config } from 'dotenv';

config();

const conn = connect({ url: process.env.DATABASE_URL });

async function addTestReviews() {
  console.log('📝 Adding test reviews to PlanetScale...\n');

  const reviews = [
    {
      listing_id: 219,
      user_id: 1,
      rating: 5,
      title: '정말 아름다운 곳이에요!',
      comment_md: '홍도 33경이 정말 멋있었습니다. 가이드분도 친절하시고 설명도 재미있게 해주셔서 좋았어요.'
    },
    {
      listing_id: 98,
      user_id: 1,
      rating: 5,
      title: '신안의 아름다운 섬들',
      comment_md: '1004개의 섬 투어 정말 추천합니다. 사진 찍기 좋고 자연 경관이 뛰어나요.'
    },
    {
      listing_id: 221,
      user_id: 1,
      rating: 4,
      title: '맛있는 젓갈',
      comment_md: '신안 전통 젓갈이 정말 맛있어요. 선물하기 좋습니다.'
    }
  ];

  for (const review of reviews) {
    try {
      const result = await conn.execute(`
        INSERT INTO reviews (listing_id, user_id, rating, title, comment_md, review_type, is_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'listing', TRUE, NOW(), NOW())
      `, [review.listing_id, review.user_id, review.rating, review.title, review.comment_md]);

      console.log(`✅ Added review for listing ${review.listing_id}: "${review.title}"`);

      // Update listing ratings
      await conn.execute(`
        UPDATE listings
        SET
          rating_avg = (SELECT AVG(rating) FROM reviews WHERE listing_id = ?),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = ?)
        WHERE id = ?
      `, [review.listing_id, review.listing_id, review.listing_id]);

    } catch (error: any) {
      console.error(`❌ Error adding review for listing ${review.listing_id}:`, error.message);
    }
  }

  // Verify
  const count = await conn.execute('SELECT COUNT(*) as count FROM reviews');
  console.log(`\n📊 Total reviews in database: ${count.rows[0].count}`);

  const byListing = await conn.execute(`
    SELECT l.id, l.title, COUNT(r.id) as review_count, AVG(r.rating) as avg_rating
    FROM listings l
    LEFT JOIN reviews r ON l.id = r.listing_id
    WHERE l.id IN (98, 219, 221)
    GROUP BY l.id, l.title
  `);

  console.log('\n📋 Listings with reviews:');
  byListing.rows.forEach((row: any) => {
    console.log(`  - ${row.title}: ${row.review_count} reviews, ${parseFloat(row.avg_rating || 0).toFixed(1)}/5.0`);
  });

  console.log('\n✨ Done!');
}

addTestReviews();
