const { connect } = require('@planetscale/database');
const { decrypt, decryptPhone, decryptEmail } = require('../../../utils/encryption');

/**
 * 관리자용 사고 신고 관리 API
 * GET: 전체 사고 목록 조회
 * PATCH: 사고 신고 상태 변경 및 처리
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      const { status, vendor_id, severity, date_from, date_to } = req.query;

      let sql = `
        SELECT
          ar.*,
          b.booking_number,
          b.customer_name as encrypted_customer_name,
          b.customer_phone as encrypted_customer_phone,
          b.customer_email as encrypted_customer_email,
          v.display_name as vehicle_name,
          v.license_plate,
          ve.business_name as vendor_name,
          ve.phone as vendor_phone,
          ve.email as vendor_email
        FROM accident_reports ar
        INNER JOIN rentcar_bookings b ON ar.booking_id = b.id
        INNER JOIN rentcar_vehicles v ON ar.vehicle_id = v.id
        INNER JOIN rentcar_vendors ve ON ar.vendor_id = ve.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        sql += ` AND ar.status = ?`;
        params.push(status);
      }

      if (vendor_id) {
        sql += ` AND ar.vendor_id = ?`;
        params.push(vendor_id);
      }

      if (severity) {
        sql += ` AND ar.severity = ?`;
        params.push(severity);
      }

      if (date_from) {
        sql += ` AND ar.accident_datetime >= ?`;
        params.push(date_from);
      }

      if (date_to) {
        sql += ` AND ar.accident_datetime <= ?`;
        params.push(date_to);
      }

      sql += ` ORDER BY ar.created_at DESC`;

      const result = await connection.execute(sql, params);

      const reports = (result.rows || []).map(row => ({
        ...row,
        // 고객 정보 복호화
        customer_name: decrypt(row.encrypted_customer_name),
        customer_phone: decryptPhone(row.encrypted_customer_phone),
        customer_email: decryptEmail(row.encrypted_customer_email),
        // JSON 필드 파싱
        photos: row.photos ? JSON.parse(row.photos) : [],
        videos: row.videos ? JSON.parse(row.videos) : [],
        vehicle: {
          name: row.vehicle_name,
          license_plate: row.license_plate
        },
        vendor: {
          name: row.vendor_name,
          phone: row.vendor_phone,
          email: row.vendor_email
        }
      }));

      return res.status(200).json({
        success: true,
        data: reports,
        count: reports.length
      });
    }

    if (req.method === 'PATCH') {
      // URL에서 report ID 추출
      const urlParts = req.url.split('/');
      const reportId = urlParts[urlParts.length - 1].split('?')[0];

      if (!reportId || reportId === 'accidents') {
        return res.status(400).json({
          success: false,
          error: 'Report ID is required'
        });
      }

      const {
        status,
        handled_by,
        resolution_notes,
        insurance_claim_filed,
        insurance_company,
        insurance_claim_number,
        estimated_damage_krw
      } = req.body;

      const updates = [];
      const values = [];

      if (status !== undefined) {
        updates.push('status = ?');
        values.push(status);
      }

      if (handled_by !== undefined) {
        updates.push('handled_by = ?');
        values.push(handled_by);
      }

      if (resolution_notes !== undefined) {
        updates.push('resolution_notes = ?');
        values.push(resolution_notes);
      }

      if (insurance_claim_filed !== undefined) {
        updates.push('insurance_claim_filed = ?');
        values.push(insurance_claim_filed);

        if (insurance_claim_filed) {
          updates.push('insurance_notified_at = NOW()');
        }
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

      console.log('🔧 [관리자 사고 처리]', { reportId, status });

      return res.status(200).json({
        success: true,
        message: '사고 신고가 업데이트되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ [관리자 사고 관리 API 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '사고 관리 중 오류가 발생했습니다.'
    });
  }
};
