const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // JWT 토큰 검증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // user_id로 vendor_id 조회
    let vendorId;
    if (decoded.role === 'admin') {
      vendorId = req.query.vendorId || req.body?.vendorId;
    } else {
      const vendorResult = await connection.execute(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '등록된 벤더 정보가 없습니다.' });
      }

      vendorId = vendorResult.rows[0].id;
    }

    console.log('🚗 [Vehicles API] 요청:', { method: req.method, vendorId, user: decoded.email });

    if (req.method === 'GET') {
      // 업체의 차량 목록 조회 (단순화: 필수 필드만)
      const result = await connection.execute(
        `SELECT
          id,
          vendor_id,
          display_name,
          daily_rate_krw,
          hourly_rate_krw,
          thumbnail_url,
          images,
          is_active,
          created_at,
          updated_at
        FROM rentcar_vehicles
        WHERE vendor_id = ?
        ORDER BY created_at DESC`,
        [vendorId]
      );

      console.log('✅ [Vehicles API] 차량 조회 완료:', result.rows?.length, '대');

      const vehicles = (result.rows || []).map(vehicle => ({
        ...vehicle,
        is_available: vehicle.is_active === 1,
        images: vehicle.images ? (typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images) : []
      }));

      return res.status(200).json({
        success: true,
        data: vehicles
      });
    }

    if (req.method === 'POST') {
      // 새 차량 등록 (단순화: 필수 필드만)
      const {
        display_name,
        daily_rate_krw,
        hourly_rate_krw,
        is_available,
        image_urls
      } = req.body;

      // 필수 필드 검증
      if (!display_name || !daily_rate_krw) {
        return res.status(400).json({
          success: false,
          message: '필수 항목을 입력해주세요. (차량명, 일일 요금)'
        });
      }

      // 이미지 배열을 JSON 문자열로 변환
      const imagesJson = JSON.stringify(image_urls || []);

      // 시간당 요금 자동 계산 (입력하지 않은 경우 일일 요금 / 24)
      const calculatedHourlyRate = hourly_rate_krw || Math.ceil(daily_rate_krw / 24);

      console.log('📝 [Vehicles API] 차량 등록 시도:', {
        display_name,
        daily_rate_krw,
        hourly_rate_krw: calculatedHourlyRate
      });

      const result = await connection.execute(
        `INSERT INTO rentcar_vehicles (
          vendor_id,
          display_name,
          daily_rate_krw,
          hourly_rate_krw,
          thumbnail_url,
          images,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          vendorId,
          display_name,
          daily_rate_krw,
          calculatedHourlyRate,
          image_urls && image_urls.length > 0 ? image_urls[0] : null,
          imagesJson,
          is_available !== undefined ? (is_available ? 1 : 0) : 1
        ]
      );

      console.log('✅ [Vehicles API] 차량 등록 완료:', result.insertId);

      return res.status(201).json({
        success: true,
        message: '차량이 등록되었습니다.',
        data: {
          id: result.insertId,
          display_name,
          daily_rate_krw,
          hourly_rate_krw: calculatedHourlyRate
        }
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });

  } catch (error) {
    console.error('❌ [Vehicles API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
