const { connect } = require('@planetscale/database');

/**
 * 사고 신고 상세 조회/수정 API
 * GET: 신고 상세 정보 조회
 * PATCH: 신고 정보 수정 (추가 증거, 상대방 정보 등)
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // URL에서 reportId 추출
  const urlParts = req.url.split('/');
  const reportId = urlParts[urlParts.length - 1].split('?')[0];

  if (!reportId || reportId === 'accident') {
    return res.status(400).json({
      success: false,
      error: 'Report ID is required'
    });
  }

  try {
    if (req.method === 'GET') {
      const { user_id } = req.query;

      let sql = `
        SELECT
          ar.*,
          b.booking_number,
          v.display_name as vehicle_name,
          v.license_plate,
          ve.business_name as vendor_name,
          ve.phone as vendor_phone
        FROM accident_reports ar
        INNER JOIN rentcar_bookings b ON ar.booking_id = b.id
        INNER JOIN rentcar_vehicles v ON ar.vehicle_id = v.id
        INNER JOIN rentcar_vendors ve ON ar.vendor_id = ve.id
        WHERE ar.id = ?
      `;
      const params = [reportId];

      // 사용자 권한 확인 (본인의 신고만 조회)
      if (user_id) {
        sql += ` AND ar.user_id = ?`;
        params.push(user_id);
      }

      const result = await connection.execute(sql, params);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '사고 신고를 찾을 수 없습니다.'
        });
      }

      const report = result.rows[0];

      // JSON 필드 파싱
      const formattedReport = {
        ...report,
        photos: report.photos ? JSON.parse(report.photos) : [],
        videos: report.videos ? JSON.parse(report.videos) : [],
        vehicle: {
          name: report.vehicle_name,
          license_plate: report.license_plate
        },
        vendor: {
          name: report.vendor_name,
          phone: report.vendor_phone
        }
      };

      return res.status(200).json({
        success: true,
        data: formattedReport
      });
    }

    if (req.method === 'PATCH') {
      const {
        description,
        other_party_name,
        other_party_phone,
        other_party_vehicle,
        police_report_filed,
        police_report_number,
        photos,
        videos,
        insurance_company,
        insurance_claim_number,
        estimated_damage_krw
      } = req.body;

      const updates = [];
      const values = [];

      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }

      if (other_party_name !== undefined) {
        updates.push('other_party_name = ?');
        values.push(other_party_name);
      }

      if (other_party_phone !== undefined) {
        updates.push('other_party_phone = ?');
        values.push(other_party_phone);
      }

      if (other_party_vehicle !== undefined) {
        updates.push('other_party_vehicle = ?');
        values.push(other_party_vehicle);
      }

      if (police_report_filed !== undefined) {
        updates.push('police_report_filed = ?');
        values.push(police_report_filed);
      }

      if (police_report_number !== undefined) {
        updates.push('police_report_number = ?');
        values.push(police_report_number);
      }

      if (photos !== undefined) {
        updates.push('photos = ?');
        values.push(JSON.stringify(photos));
      }

      if (videos !== undefined) {
        updates.push('videos = ?');
        values.push(JSON.stringify(videos));
      }

      if (insurance_company !== undefined) {
        updates.push('insurance_company = ?');
        values.push(insurance_company);
      }

      if (insurance_claim_number !== undefined) {
        updates.push('insurance_claim_number = ?');
        values.push(insurance_claim_number);
      }

      if (estimated_damage_krw !== undefined) {
        updates.push('estimated_damage_krw = ?');
        values.push(estimated_damage_krw);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '업데이트할 정보가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(reportId);

      const updateQuery = `UPDATE accident_reports SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(updateQuery, values);

      console.log('✏️ [사고 신고 수정]', { reportId, fields: updates.length - 1 });

      return res.status(200).json({
        success: true,
        message: '사고 신고가 업데이트되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ [사고 신고 상세 API 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '사고 신고 조회 중 오류가 발생했습니다.'
    });
  }
};
