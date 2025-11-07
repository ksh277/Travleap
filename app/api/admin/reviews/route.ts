import { NextResponse } from 'next/server';
import { connect } from '@planetscale/database';
import { Pool } from '@neondatabase/serverless';

export async function GET() {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // PlanetScale에서 리뷰와 listing 정보 조회
    const result = await connection.execute(`
      SELECT
        r.*,
        l.title as listing_title,
        l.category as listing_category
      FROM reviews r
      LEFT JOIN listings l ON r.listing_id = l.id
      ORDER BY r.created_at DESC
    `);

    // Neon PostgreSQL에서 사용자 정보 조회
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    try {
      // 모든 리뷰의 user_id 수집
      const userIds = [...new Set((result.rows || []).map((review: any) => review.user_id).filter(Boolean))];

      let userMap = new Map();
      if (userIds.length > 0) {
        // IN 쿼리로 사용자 정보 한번에 조회
        const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
        const usersResult = await poolNeon.query(
          `SELECT id, name, email FROM users WHERE id IN (${placeholders})`,
          userIds
        );

        usersResult.rows.forEach((user: any) => {
          userMap.set(user.id, user);
        });
      }

      // 리뷰 데이터와 사용자 정보 병합
      const reviewsWithUserInfo = (result.rows || []).map((review: any) => {
        const user = userMap.get(review.user_id);
        return {
          ...review,
          user_name: user?.name || null,
          user_email: user?.email || null
        };
      });

      return NextResponse.json({
        success: true,
        data: reviewsWithUserInfo
      });
    } finally {
      await poolNeon.end();
    }
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reviews'
      },
      { status: 500 }
    );
  }
}
