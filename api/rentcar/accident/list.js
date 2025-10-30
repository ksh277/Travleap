const { connect } = require('@planetscale/database');

/**
 * 사고 신고 목록 조회 API
 * GET: 사용자/업체별 사고 내역
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { user_id, vendor_id, booking_id, status } = req.query;

    let sql = `
      SELECT
        ar.id,
        ar.report_number,
        ar.accident_datetime,
        ar.accident_type,
        ar.severity,
        ar.status,
        ar.location_address,
        ar.created_at,
        b.booking_number,
        v.display_name as vehicle_name,
        v.license_plate,
        v.thumbnail_url as vehicle_image,
        ve.business_name as vendor_name
      FROM accident_reports ar
      INNER JOIN rentcar_bookings b ON ar.booking_id = b.id
      INNER JOIN rentcar_vehicles v ON ar.vehicle_id = v.id
      INNER JOIN rentcar_vendors ve ON ar.vendor_id = ve.id
      WHERE 1=1
    `;
    const params = [];

    // 필터링
    if (user_id) {
      sql += ` AND ar.user_id = ?`;
      params.push(user_id);
    }

    if (vendor_id) {
      sql += ` AND ar.vendor_id = ?`;
      params.push(vendor_id);
    }

    if (booking_id) {
      sql += ` AND ar.booking_id = ?`;
      params.push(booking_id);
    }

    if (status) {
      sql += ` AND ar.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY ar.created_at DESC`;

    const result = await connection.execute(sql, params);

    const reports = (result.rows || []).map(row => ({
      id: row.id,
      report_number: row.report_number,
      accident_datetime: row.accident_datetime,
      accident_type: row.accident_type,
      severity: row.severity,
      status: row.status,
      location_address: row.location_address,
      created_at: row.created_at,
      booking: {
        booking_number: row.booking_number
      },
      vehicle: {
        name: row.vehicle_name,
        license_plate: row.license_plate,
        image: row.vehicle_image
      },
      vendor: {
        name: row.vendor_name
      }
    }));

    return res.status(200).json({
      success: true,
      data: reports,
      count: reports.length
    });

  } catch (error) {
    console.error('❌ [사고 신고 목록 API 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '사고 신고 목록 조회 중 오류가 발생했습니다.'
    });
  }
};
