/**
 * 통합 재고 관리 API - 6개 카테고리 공통
 * PUT /api/vendor/stock - 상품 재고 수정
 *
 * 지원 카테고리:
 * - Lodging (숙박)
 * - Tour (투어)
 * - Food (음식)
 * - Attractions (관광지)
 * - Events (행사)
 * - Experience (체험)
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  }

  try {
    // JWT 토큰 검증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    const { listing_id, stock } = req.body;

    if (!listing_id || stock === undefined || stock === null) {
      return res.status(400).json({
        success: false,
        message: 'listing_id와 stock은 필수 항목입니다.'
      });
    }

    if (typeof stock !== 'number' || stock < 0) {
      return res.status(400).json({
        success: false,
        message: '재고는 0 이상의 숫자여야 합니다.'
      });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // user_id로 partner_id 조회
    const partnerResult = await connection.execute(
      `SELECT id FROM partners WHERE user_id = ? LIMIT 1`,
      [decoded.userId]
    );

    if (!partnerResult.rows || partnerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '벤더 정보를 찾을 수 없습니다.'
      });
    }

    const partnerId = partnerResult.rows[0].id;

    // 해당 listing이 벤더의 것인지 확인
    const listingCheck = await connection.execute(
      `SELECT id, title, category FROM listings WHERE id = ? AND partner_id = ? LIMIT 1`,
      [listing_id, partnerId]
    );

    if (!listingCheck.rows || listingCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: '해당 상품에 대한 권한이 없습니다.'
      });
    }

    const listing = listingCheck.rows[0];

    // 재고 업데이트
    await connection.execute(
      `UPDATE listings SET stock = ?, updated_at = NOW() WHERE id = ?`,
      [stock, listing_id]
    );

    console.log(`✅ [Vendor Stock] Listing ${listing_id} (${listing.category}/${listing.title}) stock updated to ${stock} by partner ${partnerId}`);

    return res.status(200).json({
      success: true,
      message: '재고가 성공적으로 업데이트되었습니다.',
      data: {
        listing_id,
        stock,
        title: listing.title,
        category: listing.category
      }
    });

  } catch (error) {
    console.error('❌ [Vendor Stock API] Update stock error:', error);
    return res.status(500).json({
      success: false,
      message: '재고 업데이트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};
