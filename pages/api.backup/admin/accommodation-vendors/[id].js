/**
 * 숙박 벤더 개별 관리 API
 * PUT /api/admin/accommodation-vendors/[id] - 벤더 수정
 * DELETE /api/admin/accommodation-vendors/[id] - 벤더 삭제
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // PUT - 벤더 수정
    if (req.method === 'PUT') {
      console.log(`📥 [PUT] 벤더 수정 요청 (id: ${id})`);

      const {
        business_name,
        business_number,
        contact_name,
        email,
        phone,
        description,
        logo_url,
        pms_provider,
        pms_api_key,
        pms_property_id,
        pms_sync_enabled,
        pms_sync_interval,
        check_in_time,
        check_out_time,
        policies,
        status,
        tier
      } = req.body;

      // 벤더 존재 확인
      const vendorCheck = await connection.execute(
        'SELECT id FROM partners WHERE id = ? AND partner_type = "lodging"',
        [id]
      );

      if (!vendorCheck.rows || vendorCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '벤더를 찾을 수 없습니다.'
        });
      }

      // 업데이트할 필드만 포함
      const updates = [];
      const values = [];

      if (business_name !== undefined) { updates.push('business_name = ?'); values.push(business_name); }
      if (business_number !== undefined) { updates.push('business_number = ?'); values.push(business_number); }
      if (contact_name !== undefined) { updates.push('contact_name = ?'); values.push(contact_name); }
      if (email !== undefined) { updates.push('email = ?'); values.push(email); }
      if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
      if (description !== undefined) { updates.push('description = ?'); values.push(description); }
      if (logo_url !== undefined) { updates.push('logo = ?'); values.push(logo_url); }
      if (pms_provider !== undefined) { updates.push('pms_provider = ?'); values.push(pms_provider); }
      if (pms_api_key !== undefined) { updates.push('pms_api_key = ?'); values.push(pms_api_key); }
      if (pms_property_id !== undefined) { updates.push('pms_property_id = ?'); values.push(pms_property_id); }
      if (pms_sync_enabled !== undefined) { updates.push('pms_sync_enabled = ?'); values.push(pms_sync_enabled); }
      if (pms_sync_interval !== undefined) { updates.push('pms_sync_interval = ?'); values.push(pms_sync_interval); }
      if (check_in_time !== undefined) { updates.push('check_in_time = ?'); values.push(check_in_time); }
      if (check_out_time !== undefined) { updates.push('check_out_time = ?'); values.push(check_out_time); }
      if (policies !== undefined) { updates.push('policies = ?'); values.push(policies); }
      if (status !== undefined) { updates.push('status = ?'); values.push(status); }
      if (tier !== undefined) { updates.push('tier = ?'); values.push(tier); }

      updates.push('updated_at = NOW()');
      values.push(id);

      const query = `UPDATE partners SET ${updates.join(', ')} WHERE id = ? AND partner_type = 'lodging'`;

      await connection.execute(query, values);

      console.log('✅ 벤더 수정 완료:', { id, business_name });

      return res.status(200).json({
        success: true,
        message: '벤더가 수정되었습니다.'
      });
    }

    // DELETE - 벤더 삭제
    if (req.method === 'DELETE') {
      console.log(`📥 [DELETE] 벤더 삭제 요청 (id: ${id})`);

      // 벤더 존재 확인
      const vendorCheck = await connection.execute(
        'SELECT id, business_name FROM partners WHERE id = ? AND partner_type = "lodging"',
        [id]
      );

      if (!vendorCheck.rows || vendorCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '벤더를 찾을 수 없습니다.'
        });
      }

      const businessName = vendorCheck.rows[0].business_name;

      // 관련 객실 먼저 삭제 (listings 테이블)
      await connection.execute(
        'DELETE FROM listings WHERE partner_id = ? AND category = "stay"',
        [id]
      );

      // 벤더 삭제
      await connection.execute(
        'DELETE FROM partners WHERE id = ? AND partner_type = "lodging"',
        [id]
      );

      console.log('✅ 벤더 삭제 완료:', { id, businessName });

      return res.status(200).json({
        success: true,
        message: '벤더와 관련 객실이 삭제되었습니다.'
      });
    }

    // GET - 벤더 상세 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT
          id,
          id as partner_id,
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
        WHERE id = ? AND partner_type = 'lodging'`,
        [id]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '벤더를 찾을 수 없습니다.'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.rows[0]
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Accommodation vendor [id] API error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      message: error.message
    });
  }
};
