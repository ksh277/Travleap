/**
 * 벤더 - 렌트카 차량 관리 API
 * GET /api/vendor/rentcar/vehicles - 내 차량 목록 조회
 * POST /api/vendor/rentcar/vehicles - 새 차량 등록
 * PUT /api/vendor/rentcar/vehicles - 차량 정보 수정
 */

const { connect } = require('@planetscale/database');

function generateVehicleCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `VH-${timestamp}-${random}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // 벤더 인증
  const { vendor_id } = req.query;

  if (!vendor_id) {
    return res.status(401).json({
      success: false,
      error: '벤더 인증이 필요합니다.'
    });
  }

  // GET: 내 차량 목록 조회
  if (req.method === 'GET') {
    try {
      const { vehicle_id, is_active } = req.query;

      let query = `
        SELECT
          v.*,
          COUNT(DISTINCT b.id) as total_bookings
        FROM rentcar_vehicles v
        LEFT JOIN rentcar_bookings b ON v.id = b.vehicle_id AND b.status IN ('confirmed', 'completed')
        WHERE v.vendor_id = ?
      `;

      const params = [vendor_id];

      if (vehicle_id) {
        query += ` AND v.id = ?`;
        params.push(vehicle_id);
      }

      if (is_active !== undefined) {
        query += ` AND v.is_active = ?`;
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += `
        GROUP BY v.id
        ORDER BY v.display_order DESC, v.created_at DESC
      `;

      const result = await connection.execute(query, params);

      const vehicles = (result.rows || []).map(vehicle => ({
        ...vehicle,
        images: vehicle.images ? JSON.parse(vehicle.images) : [],
        standard_features: vehicle.standard_features ? JSON.parse(vehicle.standard_features) : [],
        optional_features: vehicle.optional_features ? JSON.parse(vehicle.optional_features) : []
      }));

      return res.status(200).json({
        success: true,
        vehicles
      });

    } catch (error) {
      console.error('❌ [Vendor Rentcar Vehicles GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST: 새 차량 등록
  if (req.method === 'POST') {
    try {
      const {
        brand, model, trim, year, display_name, vehicle_class, vehicle_type, fuel_type,
        transmission, drive_type, engine_cc, horsepower, fuel_efficiency_kmpl,
        seating_capacity, door_count, large_bags, small_bags, thumbnail_url, images,
        standard_features, optional_features, age_requirement, mileage_limit_per_day,
        unlimited_mileage, deposit_amount_krw, smoking_allowed, fuel_policy
      } = req.body;

      if (!brand || !model || !year || !vehicle_class || !fuel_type || !seating_capacity) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        });
      }

      const vehicle_code = generateVehicleCode();

      const result = await connection.execute(`
        INSERT INTO rentcar_vehicles (
          vendor_id, vehicle_code, brand, model, trim, year, display_name, vehicle_class,
          vehicle_type, fuel_type, transmission, drive_type, engine_cc, horsepower,
          fuel_efficiency_kmpl, seating_capacity, door_count, large_bags, small_bags,
          thumbnail_url, images, standard_features, optional_features, age_requirement,
          mileage_limit_per_day, unlimited_mileage, deposit_amount_krw, smoking_allowed,
          fuel_policy, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendor_id, vehicle_code, brand, model, trim || null, year, display_name || `${brand} ${model}`,
        vehicle_class, vehicle_type || null, fuel_type, transmission || 'automatic', drive_type || null,
        engine_cc || null, horsepower || null, fuel_efficiency_kmpl || null, seating_capacity,
        door_count || 4, large_bags || 2, small_bags || 1, thumbnail_url || null,
        JSON.stringify(images || []), JSON.stringify(standard_features || []),
        JSON.stringify(optional_features || []), age_requirement || 21, mileage_limit_per_day || null,
        unlimited_mileage ? 1 : 0, deposit_amount_krw || 0, smoking_allowed ? 1 : 0, fuel_policy || 'full_to_full'
      ]);

      console.log(`✅ [Vendor Rentcar Vehicle] 생성 완료: ${display_name || `${brand} ${model}`} by vendor ${vendor_id}`);

      return res.status(201).json({
        success: true,
        vehicle_id: result.insertId,
        vehicle_code
      });

    } catch (error) {
      console.error('❌ [Vendor Rentcar Vehicles POST] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 차량 정보 수정
  if (req.method === 'PUT') {
    try {
      const { vehicle_id, ...fields } = req.body;

      if (!vehicle_id) {
        return res.status(400).json({
          success: false,
          error: 'vehicle_id가 필요합니다.'
        });
      }

      // 차량이 벤더 소유인지 확인
      const vehicleCheck = await connection.execute(`
        SELECT id FROM rentcar_vehicles WHERE id = ? AND vendor_id = ?
      `, [vehicle_id, vendor_id]);

      if (!vehicleCheck.rows || vehicleCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 차량만 수정할 수 있습니다.'
        });
      }

      const updates = [];
      const values = [];

      Object.keys(fields).forEach(key => {
        if (fields[key] !== undefined) {
          if (['images', 'standard_features', 'optional_features'].includes(key)) {
            updates.push(`${key} = ?`);
            values.push(JSON.stringify(fields[key]));
          } else if (['unlimited_mileage', 'smoking_allowed', 'is_active', 'is_featured'].includes(key)) {
            updates.push(`${key} = ?`);
            values.push(fields[key] ? 1 : 0);
          } else {
            updates.push(`${key} = ?`);
            values.push(fields[key]);
          }
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(vehicle_id);

      const query = `UPDATE rentcar_vehicles SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(query, values);

      console.log(`✅ [Vendor Rentcar Vehicle] 수정 완료: vehicle_id=${vehicle_id} by vendor ${vendor_id}`);

      return res.status(200).json({
        success: true,
        message: '차량 정보가 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Rentcar Vehicles PUT] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};
