/**
 * 숙박 벤더 정보 API
 * GET /api/vendor/lodging/info - 숙박 업체 정보 조회
 * PUT /api/vendor/lodging/info - 숙박 업체 정보 수정
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // JWT 토큰 검증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [Lodging Vendor Info] 인증 토큰 없음');
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      console.error('❌ [Lodging Vendor Info] 토큰 검증 실패:', error.message);
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    // 벤더 또는 관리자 권한 확인
    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      console.error('❌ [Lodging Vendor Info] 권한 없음:', decoded.role);
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // user_id로 숙박 벤더 정보 조회 (partners 테이블)
    let vendorId;
    let userId = decoded.userId;

    // URL 쿼리에서 userId 가져오기 (대시보드에서 전달)
    if (req.query.userId) {
      userId = parseInt(req.query.userId);
    }

    console.log('🔍 [Lodging Vendor Info] 조회 시작:', { userId, role: decoded.role, email: decoded.email });

    const vendorResult = await connection.execute(
      `SELECT id, business_name, contact_name, email, phone, tier, is_active, status
       FROM partners
       WHERE user_id = ? AND partner_type = 'lodging'
       LIMIT 1`,
      [userId]
    );

    if (!vendorResult.rows || vendorResult.rows.length === 0) {
      console.error('❌ [Lodging Vendor Info] 등록된 숙박 업체 없음:', { userId });
      return res.status(404).json({
        success: false,
        message: '등록된 숙박 업체 정보가 없습니다. 관리자에게 문의하세요.'
      });
    }

    vendorId = vendorResult.rows[0].id;
    console.log('✅ [Lodging Vendor Info] 벤더 발견:', { vendorId, businessName: vendorResult.rows[0].business_name });

    if (req.method === 'GET') {
      // 숙박 업체 정보 조회
      const result = await connection.execute(
        `SELECT
          id,
          user_id,
          business_name,
          business_number,
          contact_name,
          email as contact_email,
          phone as contact_phone,
          description,
          logo as logo_url,
          pms_provider,
          pms_api_key,
          pms_property_id,
          pms_sync_enabled,
          pms_sync_interval,
          last_sync_at,
          check_in_time,
          check_out_time,
          policies,
          status,
          is_active,
          tier,
          created_at,
          updated_at
        FROM partners
        WHERE id = ?
        LIMIT 1`,
        [vendorId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendor = result.rows[0];

      // policies JSON 파싱
      let parsedPolicies = null;
      if (vendor.policies) {
        try {
          parsedPolicies = typeof vendor.policies === 'string'
            ? JSON.parse(vendor.policies)
            : vendor.policies;
        } catch (e) {
          console.warn('⚠️ [Lodging Vendor Info] policies 파싱 실패:', vendor.policies);
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          id: vendor.id,
          name: vendor.business_name,
          contact_email: vendor.contact_email,
          contact_phone: vendor.contact_phone,
          contact_name: vendor.contact_name,
          business_number: vendor.business_number,
          description: vendor.description,
          logo_url: vendor.logo_url,
          tier: vendor.tier || 'standard',
          is_verified: vendor.is_active === 1,
          is_active: vendor.is_active === 1,
          status: vendor.status,
          pms_provider: vendor.pms_provider,
          pms_api_key: vendor.pms_api_key,
          pms_property_id: vendor.pms_property_id,
          pms_sync_enabled: vendor.pms_sync_enabled === 1,
          pms_sync_interval: vendor.pms_sync_interval,
          last_sync_at: vendor.last_sync_at,
          check_in_time: vendor.check_in_time || '15:00',
          check_out_time: vendor.check_out_time || '11:00',
          policies: parsedPolicies,
          created_at: vendor.created_at,
          updated_at: vendor.updated_at
        }
      });
    }

    if (req.method === 'PUT') {
      // 숙박 업체 정보 수정
      const {
        business_name,
        contact_name,
        contact_email,
        contact_phone,
        description,
        logo_url,
        check_in_time,
        check_out_time,
        policies
      } = req.body;

      // policies 객체를 JSON 문자열로 변환
      const policiesJson = policies ? JSON.stringify(policies) : null;

      await connection.execute(
        `UPDATE partners
        SET
          business_name = ?,
          contact_name = ?,
          email = ?,
          phone = ?,
          description = ?,
          logo = ?,
          check_in_time = ?,
          check_out_time = ?,
          policies = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          business_name,
          contact_name,
          contact_email,
          contact_phone,
          description || null,
          logo_url || null,
          check_in_time || '15:00',
          check_out_time || '11:00',
          policiesJson,
          vendorId
        ]
      );

      console.log('✅ [Lodging Vendor Info] 업체 정보 수정 완료:', { vendorId });

      return res.status(200).json({
        success: true,
        message: '업체 정보가 수정되었습니다.'
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });

  } catch (error) {
    console.error('❌ [Lodging Vendor Info] 서버 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
