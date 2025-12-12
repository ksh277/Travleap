const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withSecureCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  // MD 관리자 이상 권한 확인 (auth-middleware에서 처리됨)

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET - 파트너 목록 조회 (가맹점 페이지용 - lodging 타입 제외)
    if (req.method === 'GET') {
      const result = await connection.execute(`
        SELECT
          p.id, p.user_id, p.business_name, p.contact_name, p.email, p.phone, p.mobile_phone,
          p.business_address, p.location, p.services, p.base_price, p.base_price_text,
          p.detailed_address, p.description, p.business_hours,
          p.duration, p.min_age, p.max_capacity, p.language,
          p.tier, p.partner_type, p.is_verified, p.is_featured,
          p.is_active, p.status, p.lat, p.lng, p.images, p.created_at, p.updated_at,
          p.is_coupon_partner, p.coupon_discount_type, p.coupon_discount_value,
          p.coupon_max_discount, p.coupon_text
        FROM partners p
        WHERE (p.partner_type != 'lodging' OR p.partner_type IS NULL)
        ORDER BY p.created_at DESC
      `);

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    }

    // POST - 파트너 생성
    if (req.method === 'POST') {
      const partnerData = req.body;

      // 이미지 배열을 JSON 문자열로 변환
      const imagesJson = Array.isArray(partnerData.images)
        ? JSON.stringify(partnerData.images)
        : '[]';

      const result = await connection.execute(
        `INSERT INTO partners (
          user_id, business_name, contact_name, email, phone, mobile_phone,
          business_address, location, services, base_price, base_price_text,
          detailed_address, description, images, business_hours,
          duration, min_age, max_capacity, language,
          lat, lng,
          status, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 1, NOW(), NOW())`,
        [
          1, // user_id (관리자가 생성하므로 1)
          partnerData.business_name,
          partnerData.contact_name,
          partnerData.email,
          partnerData.phone || null,
          partnerData.mobile_phone || null,
          partnerData.business_address,
          partnerData.location,
          partnerData.services,
          partnerData.base_price || 0,
          partnerData.base_price_text || null,
          partnerData.detailed_address || '',
          partnerData.description || '',
          imagesJson,
          partnerData.business_hours || '',
          partnerData.duration || null,
          partnerData.min_age || null,
          partnerData.max_capacity || null,
          partnerData.language || null,
          partnerData.lat || null,  // 위도 (카카오 API의 y 값)
          partnerData.lng || null   // 경도 (카카오 API의 x 값)
        ]
      );

      return res.status(201).json({
        success: true,
        data: { id: result.insertId },
        message: '파트너가 성공적으로 생성되었습니다.'
      });
    }

    // PUT - 파트너 수정
    if (req.method === 'PUT') {
      const partnerData = req.body;
      const { id } = partnerData;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_ID',
          message: '파트너 ID가 필요합니다'
        });
      }

      // 이미지 배열을 JSON 문자열로 변환
      const imagesJson = Array.isArray(partnerData.images)
        ? JSON.stringify(partnerData.images)
        : partnerData.images || '[]';

      await connection.execute(
        `UPDATE partners SET
          business_name = ?,
          contact_name = ?,
          email = ?,
          phone = ?,
          mobile_phone = ?,
          business_address = ?,
          location = ?,
          services = ?,
          base_price = ?,
          base_price_text = ?,
          detailed_address = ?,
          description = ?,
          images = ?,
          business_hours = ?,
          duration = ?,
          min_age = ?,
          max_capacity = ?,
          language = ?,
          lat = ?,
          lng = ?,
          status = ?,
          is_active = ?,
          is_coupon_partner = ?,
          coupon_discount_type = ?,
          coupon_discount_value = ?,
          coupon_max_discount = ?,
          coupon_text = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          partnerData.business_name,
          partnerData.contact_name,
          partnerData.email,
          partnerData.phone || null,
          partnerData.mobile_phone || null,
          partnerData.business_address,
          partnerData.location,
          partnerData.services,
          partnerData.base_price || 0,
          partnerData.base_price_text || null,
          partnerData.detailed_address || '',
          partnerData.description || '',
          imagesJson,
          partnerData.business_hours || '',
          partnerData.duration || null,
          partnerData.min_age || null,
          partnerData.max_capacity || null,
          partnerData.language || null,
          partnerData.lat || null,
          partnerData.lng || null,
          partnerData.status || 'approved',
          partnerData.is_active !== undefined ? partnerData.is_active : 1,
          partnerData.is_coupon_partner || false,
          partnerData.coupon_discount_type || null,
          partnerData.coupon_discount_value || null,
          partnerData.coupon_max_discount || null,
          partnerData.coupon_text || null,
          id
        ]
      );

      console.log(`✅ [Admin] 파트너 수정: ${id}`);

      return res.status(200).json({
        success: true,
        message: '파트너가 성공적으로 수정되었습니다.'
      });
    }

    // PATCH - 쿠폰 ON/OFF 토글 (간단한 업데이트용)
    if (req.method === 'PATCH') {
      const { id, is_coupon_partner, coupon_discount_type, coupon_discount_value, coupon_max_discount, coupon_text } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_ID',
          message: '파트너 ID가 필요합니다'
        });
      }

      // 쿠폰 ON 상태로 변경 시 할인 설정이 필요
      if (is_coupon_partner && (!coupon_discount_type || !coupon_discount_value)) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_COUPON_SETTINGS',
          message: '쿠폰 ON 설정 시 할인 타입과 값이 필요합니다'
        });
      }

      await connection.execute(
        `UPDATE partners SET
          is_coupon_partner = ?,
          coupon_discount_type = ?,
          coupon_discount_value = ?,
          coupon_max_discount = ?,
          coupon_text = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          is_coupon_partner ? 1 : 0,
          coupon_discount_type || null,
          coupon_discount_value || null,
          coupon_max_discount || null,
          coupon_text || null,
          id
        ]
      );

      console.log(`✅ [Admin] 파트너 쿠폰 설정 변경: ${id}, is_coupon_partner=${is_coupon_partner}`);

      return res.status(200).json({
        success: true,
        message: is_coupon_partner ? '쿠폰 참여가 활성화되었습니다' : '쿠폰 참여가 비활성화되었습니다'
      });
    }

    // DELETE - 파트너 삭제
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_ID',
          message: '파트너 ID가 필요합니다'
        });
      }

      await connection.execute('DELETE FROM partners WHERE id = ?', [id]);

      console.log(`✅ [Admin] 파트너 삭제: ${id}`);

      return res.status(200).json({
        success: true,
        message: '파트너가 삭제되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in partners API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = withSecureCors(withAuth(handler, { requireAuth: true, requireMDAdmin: true }));
