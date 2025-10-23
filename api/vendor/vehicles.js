const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 벤더 인증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.'
      });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '벤더 권한이 필요합니다.'
      });
    }

    // DB 연결
    const connection = connect({ url: process.env.DATABASE_URL });

    // 벤더 ID 조회
    let vendorId;
    if (decoded.role === 'admin') {
      vendorId = req.query.vendorId || req.body?.vendorId;
    } else {
      const vendorResult = await connection.execute(
        'SELECT id, business_name, status FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '등록된 벤더 정보가 없습니다.'
        });
      }

      const vendor = vendorResult.rows[0];
      if (vendor.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: '비활성화된 벤더 계정입니다.'
        });
      }

      vendorId = vendor.id;
    }

    console.log('🚗 [Vehicles API] 요청:', { method: req.method, vendorId, user: decoded.email });

    // GET: 차량 목록 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT
          id,
          vendor_id,
          vehicle_code,
          brand,
          model,
          year,
          display_name,
          vehicle_class,
          vehicle_type,
          fuel_type,
          transmission as transmission_type,
          seating_capacity,
          door_count,
          large_bags,
          small_bags,
          thumbnail_url,
          images,
          features,
          age_requirement,
          license_requirement,
          mileage_limit_per_day as mileage_limit_km,
          unlimited_mileage,
          deposit_amount_krw,
          smoking_allowed,
          daily_rate_krw,
          hourly_rate_krw,
          daily_rate_krw * 6 as weekly_rate_krw,
          daily_rate_krw * 25 as monthly_rate_krw,
          excess_mileage_fee_krw,
          fuel_efficiency,
          self_insurance_krw,
          insurance_options,
          available_options,
          is_active as is_available,
          is_featured,
          total_bookings,
          average_rating,
          created_at,
          updated_at
        FROM rentcar_vehicles
        WHERE vendor_id = ?
        ORDER BY created_at DESC`,
        [vendorId]
      );

      const vehicles = (result.rows || []).map(vehicle => ({
        ...vehicle,
        is_available: vehicle.is_available === 1,
        unlimited_mileage: vehicle.unlimited_mileage === 1,
        smoking_allowed: vehicle.smoking_allowed === 1,
        is_featured: vehicle.is_featured === 1,
        images: vehicle.images ? (typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images) : [],
        features: vehicle.features ? (Array.isArray(vehicle.features) ? vehicle.features : JSON.parse(vehicle.features)) : [],
        insurance_included: true,
        insurance_options: '자차보험, 대인배상, 대물배상',
        available_options: 'GPS, 블랙박스, 하이패스',
        pickup_location: '업체 본점',
        dropoff_location: '업체 본점',
        min_rental_days: 1,
        max_rental_days: 30,
        instant_booking: true
      }));

      return res.status(200).json({
        success: true,
        data: vehicles
      });
    }

    // POST: 새 차량 등록
    if (req.method === 'POST') {
      const {
        display_name,
        vehicle_class,
        seating_capacity,
        transmission_type,
        fuel_type,
        daily_rate_krw,
        hourly_rate_krw,
        mileage_limit_km,
        is_available,
        image_urls
      } = req.body;

      if (!display_name || !daily_rate_krw) {
        return res.status(400).json({
          success: false,
          message: '필수 항목을 입력해주세요.'
        });
      }

      // 한글 → 영문 매핑
      const classMap = {
        '소형': 'compact',
        '중형': 'midsize',
        '대형': 'fullsize',
        '럭셔리': 'luxury',
        'SUV': 'suv',
        '밴': 'van'
      };
      const fuelMap = {
        '가솔린': 'gasoline',
        '디젤': 'diesel',
        '하이브리드': 'hybrid',
        '전기': 'electric'
      };
      const transMap = {
        '자동': 'automatic',
        '수동': 'manual'
      };

      const mappedClass = classMap[vehicle_class] || vehicle_class || 'midsize';
      const mappedFuel = fuelMap[fuel_type] || fuel_type || 'gasoline';
      const mappedTrans = transMap[transmission_type] || transmission_type || 'automatic';

      const vehicle_code = `VEH_${vendorId}_${Date.now()}`;
      const imagesJson = JSON.stringify(image_urls || []);
      const calculatedHourlyRate = hourly_rate_krw || Math.round(((daily_rate_krw / 24) * 1.2) / 1000) * 1000;

      const result = await connection.execute(
        `INSERT INTO rentcar_vehicles (
          vendor_id,
          vehicle_code,
          brand,
          model,
          year,
          display_name,
          vehicle_class,
          vehicle_type,
          fuel_type,
          transmission,
          seating_capacity,
          door_count,
          large_bags,
          small_bags,
          thumbnail_url,
          images,
          features,
          age_requirement,
          license_requirement,
          mileage_limit_per_day,
          unlimited_mileage,
          deposit_amount_krw,
          smoking_allowed,
          daily_rate_krw,
          hourly_rate_krw,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          vendorId,
          vehicle_code,
          display_name.split(' ')[0] || '기타',
          display_name.split(' ')[1] || display_name,
          new Date().getFullYear(),
          display_name,
          mappedClass,
          '세단',
          mappedFuel,
          mappedTrans,
          seating_capacity || 5,
          4,
          2,
          2,
          image_urls && image_urls.length > 0 ? image_urls[0] : null,
          imagesJson,
          JSON.stringify(['GPS', '블랙박스']),
          21,
          '1년 이상',
          mileage_limit_km || 200,
          0,
          500000,
          0,
          daily_rate_krw,
          calculatedHourlyRate,
          is_available ? 1 : 0
        ]
      );

      return res.status(201).json({
        success: true,
        message: '차량이 등록되었습니다.',
        data: { insertId: result.insertId }
      });
    }

    // PUT: 차량 수정
    if (req.method === 'PUT') {
      const { id, is_available, ...updateData } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '차량 ID가 필요합니다.'
        });
      }

      // 소유권 확인
      const ownerCheck = await connection.execute(
        'SELECT vendor_id FROM rentcar_vehicles WHERE id = ?',
        [id]
      );

      if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '차량을 찾을 수 없습니다.'
        });
      }

      if (ownerCheck.rows[0].vendor_id !== vendorId) {
        return res.status(403).json({
          success: false,
          message: '권한이 없습니다.'
        });
      }

      // 매핑
      const mappedClass = updateData.vehicle_class ? (classMap[updateData.vehicle_class] || updateData.vehicle_class) : null;
      const mappedFuel = updateData.fuel_type ? (fuelMap[updateData.fuel_type] || updateData.fuel_type) : null;
      const mappedTrans = updateData.transmission_type ? (transMap[updateData.transmission_type] || updateData.transmission_type) : null;

      // UPDATE 쿼리 생성
      const updates = [];
      const values = [];

      if (updateData.display_name) {
        updates.push('display_name = ?');
        values.push(updateData.display_name);
      }
      if (mappedClass) {
        updates.push('vehicle_class = ?');
        values.push(mappedClass);
      }
      if (mappedFuel) {
        updates.push('fuel_type = ?');
        values.push(mappedFuel);
      }
      if (mappedTrans) {
        updates.push('transmission = ?');
        values.push(mappedTrans);
      }
      if (updateData.seating_capacity) {
        updates.push('seating_capacity = ?');
        values.push(updateData.seating_capacity);
      }
      if (updateData.daily_rate_krw) {
        updates.push('daily_rate_krw = ?');
        values.push(updateData.daily_rate_krw);
      }
      if (updateData.hourly_rate_krw) {
        updates.push('hourly_rate_krw = ?');
        values.push(updateData.hourly_rate_krw);
      }
      if (typeof is_available !== 'undefined') {
        updates.push('is_active = ?');
        values.push(is_available ? 1 : 0);
      }
      if (updateData.image_urls) {
        updates.push('images = ?');
        values.push(JSON.stringify(updateData.image_urls));
        if (updateData.image_urls.length > 0) {
          updates.push('thumbnail_url = ?');
          values.push(updateData.image_urls[0]);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: '수정할 데이터가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      await connection.execute(
        `UPDATE rentcar_vehicles SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return res.status(200).json({
        success: true,
        message: '차량이 수정되었습니다.'
      });
    }

    // DELETE: 차량 삭제
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '차량 ID가 필요합니다.'
        });
      }

      // 소유권 확인
      const ownerCheck = await connection.execute(
        'SELECT vendor_id FROM rentcar_vehicles WHERE id = ?',
        [id]
      );

      if (!ownerCheck.rows || ownerCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '차량을 찾을 수 없습니다.'
        });
      }

      if (ownerCheck.rows[0].vendor_id !== vendorId) {
        return res.status(403).json({
          success: false,
          message: '권한이 없습니다.'
        });
      }

      await connection.execute(
        'DELETE FROM rentcar_vehicles WHERE id = ?',
        [id]
      );

      return res.status(200).json({
        success: true,
        message: '차량이 삭제되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
    });

  } catch (error) {
    console.error('❌ [Vehicles API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
