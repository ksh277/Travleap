/**
 * 파트너(가맹점) 정보 조회/수정 API
 * GET /api/partner/info?userId=123
 * PUT /api/partner/info
 */

const { connect } = require('@planetscale/database');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      // userId로 파트너 정보 조회
      const userId = req.query.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId가 필요합니다'
        });
      }

      const result = await connection.execute(`
        SELECT
          id,
          user_id,
          business_name,
          partner_type,
          contact_name,
          phone,
          email,
          partner_email,
          business_address,
          services,
          status,
          is_coupon_partner,
          coupon_discount_type,
          coupon_discount_value,
          coupon_max_discount,
          coupon_min_order,
          total_coupon_usage,
          total_discount_given,
          created_at
        FROM partners
        WHERE user_id = ? AND status = 'approved'
        LIMIT 1
      `, [userId]);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '파트너 정보를 찾을 수 없습니다'
        });
      }

      const partner = result.rows[0];

      return res.status(200).json({
        success: true,
        data: {
          id: partner.id,
          user_id: partner.user_id,
          business_name: partner.business_name,
          partner_type: partner.partner_type,
          contact_name: partner.contact_name,
          contact_phone: partner.phone,
          contact_email: partner.email || partner.partner_email,
          address: partner.business_address,
          services: partner.services,
          status: partner.status,
          is_verified: partner.status === 'approved',
          is_coupon_partner: !!partner.is_coupon_partner,
          coupon_settings: {
            discount_type: partner.coupon_discount_type,
            discount_value: partner.coupon_discount_value,
            max_discount: partner.coupon_max_discount,
            min_order: partner.coupon_min_order
          },
          stats: {
            total_coupon_usage: partner.total_coupon_usage || 0,
            total_discount_given: partner.total_discount_given || 0
          },
          created_at: partner.created_at
        }
      });

    } else if (req.method === 'PUT') {
      // 파트너 정보 수정
      const userId = req.body.userId || req.headers['x-user-id'];
      const { business_name, contact_name, contact_email, contact_phone, address } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId가 필요합니다'
        });
      }

      await connection.execute(`
        UPDATE partners
        SET
          business_name = COALESCE(?, business_name),
          contact_name = COALESCE(?, contact_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          business_address = COALESCE(?, business_address)
        WHERE user_id = ?
      `, [business_name, contact_name, contact_email, contact_phone, address, userId]);

      return res.status(200).json({
        success: true,
        message: '파트너 정보가 수정되었습니다'
      });

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('❌ [Partner Info] Error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(handler);
