/**
 * 디버깅용 API - listings 테이블 is_published 수정
 * GET /api/debug/fix-listings
 *
 * 문제: is_published=0인 상품들이 카테고리 페이지에 표시되지 않음
 * 해결: is_active=1인 모든 상품의 is_published를 1로 업데이트
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔧 [Fix Listings] Starting is_published update...');

    // 1. 업데이트 전 상태 확인
    const beforePublishedResult = await connection.execute(
      'SELECT COUNT(*) as count FROM listings WHERE is_published = 1'
    );
    const beforePublished = beforePublishedResult.rows?.[0]?.count || 0;

    const beforeUnpublishedResult = await connection.execute(
      'SELECT COUNT(*) as count FROM listings WHERE is_published = 0 AND is_active = 1'
    );
    const beforeUnpublished = beforeUnpublishedResult.rows?.[0]?.count || 0;

    console.log(`   Before: published=${beforePublished}, unpublished_active=${beforeUnpublished}`);

    // 2. is_published 업데이트
    const updateResult = await connection.execute(`
      UPDATE listings
      SET is_published = 1
      WHERE is_active = 1
    `);

    console.log(`   Updated ${updateResult.rowsAffected || 0} records`);

    // 3. 업데이트 후 상태 확인
    const afterPublishedResult = await connection.execute(
      'SELECT COUNT(*) as count FROM listings WHERE is_published = 1'
    );
    const afterPublished = afterPublishedResult.rows?.[0]?.count || 0;

    const afterBothResult = await connection.execute(
      'SELECT COUNT(*) as count FROM listings WHERE is_published = 1 AND is_active = 1'
    );
    const afterBoth = afterBothResult.rows?.[0]?.count || 0;

    // 4. 카테고리별 확인
    const categoryResult = await connection.execute(`
      SELECT
        l.category,
        COUNT(*) as count
      FROM listings l
      WHERE l.is_published = 1 AND l.is_active = 1
      GROUP BY l.category
      ORDER BY l.category
    `);

    console.log('✅ [Fix Listings] Update completed');

    return res.status(200).json({
      success: true,
      message: 'is_published updated successfully',
      before: {
        published: beforePublished,
        unpublished_active: beforeUnpublished
      },
      after: {
        published: afterPublished,
        published_and_active: afterBoth
      },
      updated: updateResult.rowsAffected || 0,
      byCategory: categoryResult.rows || []
    });

  } catch (error) {
    console.error('❌ [Fix Listings] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
