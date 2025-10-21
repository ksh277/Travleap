import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

// 리뷰 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listing_id');

    const conn = connect(config);

    let query = `
      SELECT
        r.*,
        u.name as user_name,
        u.email as user_email
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
    `;

    const params: any[] = [];

    if (listingId) {
      query += ' WHERE r.listing_id = ?';
      params.push(parseInt(listingId));
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await conn.execute(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// 리뷰 작성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      listing_id,
      user_id,
      rating,
      title,
      content,
      review_type = 'listing'
    } = body;

    // 필수 필드 검증
    if (!listing_id || !user_id || !rating || !content) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다' },
        { status: 400 }
      );
    }

    // 평점 범위 검증
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: '평점은 1-5 사이여야 합니다' },
        { status: 400 }
      );
    }

    const conn = connect(config);

    // 리뷰 생성
    const result = await conn.execute(
      `INSERT INTO reviews
        (listing_id, user_id, rating, title, comment_md, review_type, is_verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())`,
      [listing_id, user_id, rating, title || '', content, review_type]
    );

    // 생성된 리뷰 조회
    const insertId = result.insertId;
    const reviewResult = await conn.execute(
      'SELECT * FROM reviews WHERE id = ?',
      [insertId]
    );

    // 상품의 평균 평점과 리뷰 개수 업데이트
    const statsResult = await conn.execute(
      `SELECT
        COUNT(*) as review_count,
        COALESCE(AVG(rating), 0) as avg_rating
       FROM reviews
       WHERE listing_id = ?`,
      [listing_id]
    );

    const stats = statsResult.rows[0];
    await conn.execute(
      `UPDATE listings
       SET rating_avg = ?, rating_count = ?
       WHERE id = ?`,
      [stats.avg_rating, stats.review_count, listing_id]
    );

    return NextResponse.json({
      success: true,
      data: reviewResult.rows[0],
      message: '리뷰가 성공적으로 등록되었습니다'
    });

  } catch (error) {
    console.error('Failed to create review:', error);
    return NextResponse.json(
      { success: false, error: '리뷰 생성에 실패했습니다' },
      { status: 500 }
    );
  }
}
