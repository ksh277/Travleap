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
        business_type,
        description,
        logo_url,
        cover_image_url,
        address,
        phone,
        coupon_discount_type,
        coupon_discount_value,
        coupon_max_discount,
        coupon_min_order,
        latitude,
        longitude
      FROM partners
      WHERE is_coupon_partner = 1
        AND status = 'approved'
      ORDER BY business_name ASC
    `);

    const partners = (result.rows || []).map(p => ({
      id: p.id,
      name: p.business_name,
      type: p.business_type,
      description: p.description,
      logo: p.logo_url,
      coverImage: p.cover_image_url,
      address: p.address,
      phone: p.phone,
      discount: {
        type: p.coupon_discount_type || 'percent',
        value: parseFloat(p.coupon_discount_value) || 0,
        maxDiscount: p.coupon_max_discount,
        minOrder: p.coupon_min_order
      },
      location: {
        lat: p.latitude,
        lng: p.longitude
      }
    }));

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
