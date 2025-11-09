/**
 * 사용자 리뷰 조회 API
 * GET /api/user/reviews
 */

const { connect } = require('@planetscale/database');
const { verifyJWTFromRequest } = require('../../utils/auth-middleware.cjs');
const { Pool } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // JWT 토큰에서 userId 추출
    const user = verifyJWTFromRequest(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다. 로그인 후 다시 시도해주세요.'
      });
    }

    const userId = user.userId;

    const connection = connect({ url: process.env.DATABASE_URL });

    // PlanetScale에서 사용자의 리뷰 조회
    const result = await connection.execute(`
      SELECT r.*, l.title as listing_title, l.category, l.images as listing_images
      FROM reviews r
      LEFT JOIN listings l ON r.listing_id = l.id
      WHERE r.user_id = ?
        AND (r.is_hidden IS NULL OR r.is_hidden = FALSE)
      ORDER BY r.created_at DESC
    `, [parseInt(userId)]);

    const reviews = result.rows || [];

    // PlanetScale에서 블로그 댓글도 조회
    const blogCommentsResult = await connection.execute(`
      SELECT bc.*, b.title as blog_title
      FROM blog_comments bc
      LEFT JOIN blog_posts b ON bc.blog_id = b.id
      WHERE bc.user_id = ?
      ORDER BY bc.created_at DESC
    `, [parseInt(userId)]);

    const blogComments = blogCommentsResult.rows || [];

    // Neon PostgreSQL에서 user 정보 가져오기 (이름 표시용)
    let userName = '사용자';
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    try {
      const userResult = await poolNeon.query(
        'SELECT id, name, username, email FROM users WHERE id = $1',
        [parseInt(userId)]
      );

      if (userResult.rows && userResult.rows.length > 0) {
        const userData = userResult.rows[0];
        userName = userData.name || userData.username || userData.email?.split('@')[0] || '사용자';

        reviews.forEach(review => {
          review.user_name = userName;
          review.user_email = userData.email;
        });
      }
    } catch (error) {
      console.error('Failed to fetch user info from Neon:', error);
    } finally {
      await poolNeon.end();
    }

    // 이미지 파싱
    const reviewsFormatted = reviews.map(review => {
      let listingImage = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop';
      if (review.listing_images) {
        try {
          const images = JSON.parse(review.listing_images);
          if (images && images.length > 0) {
            listingImage = images[0];
          }
        } catch (e) {
          console.error('Failed to parse listing images:', e);
        }
      }

      let reviewImages = [];
      if (review.review_images) {
        try {
          reviewImages = JSON.parse(review.review_images);
        } catch (e) {
          console.error('Failed to parse review images:', e);
        }
      }

      return {
        id: review.id,
        type: 'review',
        listing_id: review.listing_id,
        listing_title: review.listing_title || '상품명 없음',
        listing_image: listingImage,
        category: review.category || '투어',
        rating: review.rating || 5,
        title: review.title || '',
        comment: review.comment_md || review.content || '',
        images: reviewImages,
        created_at: review.created_at,
        date: review.created_at ? new Date(review.created_at).toLocaleDateString('ko-KR') : '',
        helpful_count: review.helpful_count || 0,
        is_verified: review.is_verified || false,
        user_name: review.user_name || '사용자'
      };
    });

    // 블로그 댓글 포맷팅
    const blogCommentsFormatted = blogComments.map(comment => ({
      id: comment.id,
      type: 'blog_comment',
      blog_id: comment.blog_id,
      blog_title: comment.blog_title || '블로그 글',
      listing_title: comment.blog_title || '블로그 댓글',
      listing_image: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=300&h=200&fit=crop',
      category: '블로그',
      rating: 0,
      title: '',
      comment: comment.content || '',
      images: [],
      created_at: comment.created_at,
      date: comment.created_at ? new Date(comment.created_at).toLocaleDateString('ko-KR') : '',
      helpful_count: comment.likes || 0,
      is_verified: false,
      user_name: userName
    }));

    // 리뷰와 블로그 댓글 합치고 날짜순 정렬
    const allReviews = [...reviewsFormatted, ...blogCommentsFormatted].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return res.status(200).json({
      success: true,
      data: allReviews
    });

  } catch (error) {
    console.error('❌ [User Reviews] API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '리뷰 조회에 실패했습니다.'
    });
  }
};
