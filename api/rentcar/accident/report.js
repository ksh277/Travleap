const { connect } = require('@planetscale/database');

/**
 * 렌트카 사고 신고 접수 API
 * POST: 사고 신고 생성 + 자동 알림 발송
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      booking_id,
      vehicle_id,
      vendor_id,
      user_id,
      accident_datetime,
      location_address,
      location_lat,
      location_lng,
      accident_type,
      severity,
      description,
      other_party_name,
      other_party_phone,
      other_party_vehicle,
      police_report_filed,
      police_report_number,
      photos,
      videos
    } = req.body;

    // 필수 필드 검증
    if (!booking_id || !vehicle_id || !vendor_id || !user_id || !accident_datetime || !accident_type) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      });
    }

    // 예약 정보 확인
    const bookingCheck = await connection.execute(
      `SELECT id, booking_number, status FROM rentcar_bookings
       WHERE id = ? AND vehicle_id = ? AND vendor_id = ? AND user_id = ?`,
      [booking_id, vehicle_id, vendor_id, user_id]
    );

    if (!bookingCheck.rows || bookingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '예약 정보를 찾을 수 없습니다.'
      });
    }

    // 신고번호 생성 (ACC-YYYYMMDD-XXXX)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reportNumber = `ACC-${dateStr}-${randomStr}`;

    // 사고 신고 저장
    const result = await connection.execute(
      `INSERT INTO accident_reports (
        booking_id, vehicle_id, vendor_id, user_id,
        report_number, accident_datetime,
        location_address, location_lat, location_lng,
        accident_type, severity, description,
        other_party_name, other_party_phone, other_party_vehicle,
        police_report_filed, police_report_number,
        photos, videos,
        status,
        vendor_notified_at, admin_notified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reported', NOW(), NOW())`,
      [
        booking_id, vehicle_id, vendor_id, user_id,
        reportNumber, accident_datetime,
        location_address || null, location_lat || null, location_lng || null,
        accident_type, severity || 'minor', description || null,
        other_party_name || null, other_party_phone || null, other_party_vehicle || null,
        police_report_filed || false, police_report_number || null,
        photos ? JSON.stringify(photos) : null,
        videos ? JSON.stringify(videos) : null
      ]
    );

    console.log('🚨 [사고 신고 접수]', {
      reportNumber,
      booking_id,
      accident_type,
      severity: severity || 'minor'
    });

    // TODO: 알림 발송 (업체, 관리자, 사용자)
    // - 업체 담당자 SMS/이메일
    // - 관리자 시스템 알림
    // - 사용자 SMS (신고번호 전송)

    return res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        report_number: reportNumber,
        status: 'reported',
        message: '사고 신고가 접수되었습니다.'
      }
    });

  } catch (error) {
    console.error('❌ [사고 신고 API 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '사고 신고 처리 중 오류가 발생했습니다.'
    });
  }
};
