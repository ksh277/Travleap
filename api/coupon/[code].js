/**
 * 쿠폰 상세 조회 API
 * GET /api/coupon/:code
 *
 * 쿠폰 코드로 상세 정보 조회
 * - 쿠폰 정보
 * - 사용 가능한 가맹점 목록
 * - 이미 사용한 가맹점 내역
 */

const { connect } = require('@planetscale/database');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'GET 요청만 허용됩니다'
    });
  }

  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_CODE',
      message: '쿠폰 코드가 필요합니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 쿠폰 정보 조회
    const couponResult = await connection.execute(`
      SELECT
        cm.*,
        (SELECT COUNT(*) FROM integrated_coupon_usage WHERE coupon_id = cm.id) as actual_used_count
      FROM coupon_master cm
      WHERE cm.code = ?
    `, [code.toUpperCase()]);

    if (!couponResult.rows || couponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: '쿠폰을 찾을 수 없습니다'
      });
    }

    const coupon = couponResult.rows[0];

    // 2. 유효성 검사
    const now = new Date();
    const expiresAt = new Date(coupon.expires_at);
    const isExpired = now > expiresAt;
    const isBlocked = coupon.status === 'BLOCKED';
    const isFullyUsed = coupon.status === 'FULLY_USED';

    // 3. 사용 가능한 가맹점 목록 조회
    let merchantQuery = `
      SELECT
        p.id,
        p.business_name,
        p.services as category,
        p.location,
        p.business_address,
        p.lat,
        p.lng,
        p.images,
        p.business_hours,
        COALESCE(mcr.discount_type, p.coupon_discount_type, 'PERCENT') as discount_type,
        COALESCE(mcr.discount_value, p.coupon_discount_value, 10) as discount_value,
        COALESCE(mcr.max_discount, p.coupon_max_discount, 10000) as max_discount,
        COALESCE(mcr.min_order, p.coupon_min_order, 0) as min_order,
        (SELECT COUNT(*) FROM integrated_coupon_usage icu
         WHERE icu.coupon_id = ? AND icu.merchant_id = p.id) as already_used
      FROM partners p
      LEFT JOIN merchant_coupon_rules mcr ON p.id = mcr.merchant_id AND mcr.is_active = 1
      WHERE p.is_coupon_partner = 1 AND p.status = 'approved' AND p.is_active = 1
    `;
    const merchantParams = [coupon.id];

    // 지역 필터 (선택)
    if (coupon.region_name) {
      merchantQuery += ` AND (p.location LIKE ? OR p.business_address LIKE ?)`;
      merchantParams.push(`%${coupon.region_name}%`, `%${coupon.region_name}%`);
    }

    merchantQuery += ` ORDER BY p.business_name`;

    const merchantResult = await connection.execute(merchantQuery, merchantParams);

    // 4. 이미 사용한 가맹점 내역 조회
    const usageResult = await connection.execute(`
      SELECT
        icu.*,
        p.business_name,
        p.services as category,
        p.location
      FROM integrated_coupon_usage icu
      JOIN partners p ON icu.merchant_id = p.id
      WHERE icu.coupon_id = ?
      ORDER BY icu.used_at DESC
    `, [coupon.id]);

    // 5. 응답 데이터 구성
    const merchants = (merchantResult.rows || []).map(m => ({
      id: m.id,
      business_name: m.business_name,
      category: m.category,
      location: m.location,
      address: m.business_address,
      lat: m.lat,
      lng: m.lng,
      images: m.images ? (typeof m.images === 'string' ? JSON.parse(m.images) : m.images) : [],
      business_hours: m.business_hours,
      discount: {
        type: m.discount_type,
        value: parseFloat(m.discount_value),
        max_discount: m.max_discount,
        min_order: m.min_order
      },
      already_used: m.already_used > 0,
      can_use: m.already_used === 0 && !isExpired && !isBlocked && !isFullyUsed
    }));

    const usageHistory = (usageResult.rows || []).map(u => ({
      id: u.id,
      merchant_id: u.merchant_id,
      merchant_name: u.business_name,
      category: u.category,
      location: u.location,
      discount_type: u.discount_type,
      discount_value: parseFloat(u.discount_value),
      order_amount: parseFloat(u.order_amount),
      discount_amount: parseFloat(u.discount_amount),
      final_amount: parseFloat(u.final_amount),
      used_at: u.used_at,
      review_submitted: u.review_submitted === 1
    }));

    const availableMerchants = merchants.filter(m => m.can_use);
    const usedMerchants = merchants.filter(m => m.already_used);

    return res.status(200).json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        qr_url: coupon.qr_url,
        region_name: coupon.region_name,
        status: isExpired ? 'EXPIRED' : coupon.status,
        is_valid: !isExpired && !isBlocked && !isFullyUsed,
        is_expired: isExpired,
        expires_at: coupon.expires_at,
        created_at: coupon.created_at,
        total_merchants: coupon.total_merchants,
        used_merchants: parseInt(coupon.actual_used_count) || 0,
        remaining_merchants: Math.max(0, (coupon.total_merchants || 0) - (parseInt(coupon.actual_used_count) || 0))
      },
      merchants: {
        available: availableMerchants,
        used: usedMerchants,
        all: merchants
      },
      usage_history: usageHistory
    });

  } catch (error) {
    console.error('❌ [Coupon Detail] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '쿠폰 조회 중 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(handler);
