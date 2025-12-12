/**
 * 쿠폰북 - 쿠폰 참여 가맹점 목록 API (공개)
 * GET /api/coupon-book/partners
 *
 * is_coupon_partner=1인 모든 파트너 목록 반환
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // is_coupon_partner=1인 파트너 목록 조회
    const result = await connection.execute(`
      SELECT
        id,
        business_name,
        services,
        description,
        logo,
        images,
        business_address,
        phone,
        coupon_text,
        lat,
        lng
      FROM partners
      WHERE is_coupon_partner = 1
        AND status = 'approved'
      ORDER BY business_name ASC
    `);

    const partners = (result.rows || []).map(p => {
      // images가 JSON 문자열인 경우 파싱하여 첫 번째 이미지를 커버 이미지로 사용
      let coverImage = null;
      if (p.images) {
        try {
          const imagesArr = JSON.parse(p.images);
          if (Array.isArray(imagesArr) && imagesArr.length > 0) {
            coverImage = imagesArr[0];
          }
        } catch (e) {
          // JSON 파싱 실패 시 그대로 사용
          coverImage = p.images;
        }
      }

      return {
        id: p.id,
        name: p.business_name,
        type: p.services || '가맹점',
        description: p.description,
        logo: p.logo,
        coverImage: coverImage,
        address: p.business_address,
        phone: p.phone,
        couponText: p.coupon_text || '할인 쿠폰',
        location: {
          lat: p.lat,
          lng: p.lng
        }
      };
    });

    return res.status(200).json({
      success: true,
      data: partners,
      count: partners.length
    });

  } catch (error) {
    console.error('[CouponBook Partners] Error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  }
};
