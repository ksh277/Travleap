/**
 * 관리자 - 렌트카 차량 관리 API
 * GET /api/admin/rentcar/vehicles - 차량 목록 조회
 * POST /api/admin/rentcar/vehicles - 새 차량 등록
 * PUT /api/admin/rentcar/vehicles - 차량 정보 수정
 * DELETE /api/admin/rentcar/vehicles - 차량 삭제
 */

const { connect } = require('@planetscale/database');

function generateVehicleCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `VH-${timestamp}-${random}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // GET: 차량 목록 조회
  if (req.method === 'GET') {
    try {
      const { vehicle_id, vendor_id, vehicle_class, fuel_type, is_active } = req.query;

      let query = `
        SELECT
          v.*,
          vd.business_name as vendor_name,
          vd.tier as vendor_tier,
          COUNT(DISTINCT b.id) as total_bookings
        FROM rentcar_vehicles v
        LEFT JOIN rentcar_vendors vd ON v.vendor_id = vd.id
        LEFT JOIN rentcar_bookings b ON v.id = b.vehicle_id AND b.status IN ('confirmed', 'completed')
        WHERE 1=1
      `;

      const params = [];

      if (vehicle_id) {
        query += ` AND v.id = ?`;
        params.push(vehicle_id);
      }

      if (vendor_id) {
        query += ` AND v.vendor_id = ?`;
        params.push(vendor_id);
      }

      if (vehicle_class) {
        query += ` AND v.vehicle_class = ?`;
        params.push(vehicle_class);
      }

      if (fuel_type) {
        query += ` AND v.fuel_type = ?`;
        params.push(fuel_type);
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

      // JSON 필드 파싱
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
      console.error('❌ [Rentcar Vehicles GET] Error:', error);
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
        vendor_id,
        brand,
        model,
        trim,
        year,
        display_name,
        vehicle_class,
        vehicle_type,
        fuel_type,
        transmission,
        drive_type,
        engine_cc,
        horsepower,
        fuel_efficiency_kmpl,
        seating_capacity,
        door_count,
        large_bags,
        small_bags,
        thumbnail_url,
        images,
        standard_features,
        optional_features,
        age_requirement,
        mileage_limit_per_day,
        unlimited_mileage,
        deposit_amount_krw,
        smoking_allowed,
        fuel_policy
      } = req.body;

      // 필수 필드 검증
      if (!vendor_id || !brand || !model || !year || !vehicle_class || !fuel_type || !seating_capacity) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        });
      }

      const vehicle_code = generateVehicleCode();

      const result = await connection.execute(`
        INSERT INTO rentcar_vehicles (
          vendor_id,
          vehicle_code,
          brand,
          model,
          trim,
          year,
          display_name,
          vehicle_class,
          vehicle_type,
          fuel_type,
          transmission,
          drive_type,
          engine_cc,
          horsepower,
          fuel_efficiency_kmpl,
          seating_capacity,
          door_count,
          large_bags,
          small_bags,
          thumbnail_url,
          images,
          standard_features,
          optional_features,
          age_requirement,
          mileage_limit_per_day,
          unlimited_mileage,
          deposit_amount_krw,
          smoking_allowed,
          fuel_policy,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendor_id,
        vehicle_code,
        brand,
        model,
        trim || null,
        year,
        display_name || `${brand} ${model}`,
        vehicle_class,
        vehicle_type || null,
        fuel_type,
        transmission || 'automatic',
        drive_type || null,
        engine_cc || null,
        horsepower || null,
        fuel_efficiency_kmpl || null,
        seating_capacity,
        door_count || 4,
        large_bags || 2,
        small_bags || 1,
        thumbnail_url || null,
        JSON.stringify(images || []),
        JSON.stringify(standard_features || []),
        JSON.stringify(optional_features || []),
        age_requirement || 21,
        mileage_limit_per_day || null,
        unlimited_mileage ? 1 : 0,
        deposit_amount_krw || 0,
        smoking_allowed ? 1 : 0,
        fuel_policy || 'full_to_full'
      ]);

      console.log(`✅ [Rentcar Vehicle] 생성 완료: ${display_name || `${brand} ${model}`} (${vehicle_code})`);

      return res.status(201).json({
        success: true,
        vehicle_id: result.insertId,
        vehicle_code
      });

    } catch (error) {
      console.error('❌ [Rentcar Vehicles POST] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 차량 정보 수정
  if (req.method === 'PUT') {
    try {
      const {
        vehicle_id,
        brand,
        model,
        trim,
        year,
        display_name,
        vehicle_class,
        vehicle_type,
        fuel_type,
        transmission,
        drive_type,
        engine_cc,
        horsepower,
        fuel_efficiency_kmpl,
        seating_capacity,
        door_count,
        large_bags,
        small_bags,
        thumbnail_url,
        images,
        standard_features,
        optional_features,
        age_requirement,
        mileage_limit_per_day,
        unlimited_mileage,
        deposit_amount_krw,
        smoking_allowed,
        fuel_policy,
        is_active,
        is_featured,
        display_order
      } = req.body;

      if (!vehicle_id) {
        return res.status(400).json({
          success: false,
          error: 'vehicle_id가 필요합니다.'
        });
      }

      // 업데이트할 필드만 동적으로 구성
      const updates = [];
      const values = [];

      if (brand !== undefined) { updates.push('brand = ?'); values.push(brand); }
      if (model !== undefined) { updates.push('model = ?'); values.push(model); }
      if (trim !== undefined) { updates.push('trim = ?'); values.push(trim); }
      if (year !== undefined) { updates.push('year = ?'); values.push(year); }
      if (display_name !== undefined) { updates.push('display_name = ?'); values.push(display_name); }
      if (vehicle_class !== undefined) { updates.push('vehicle_class = ?'); values.push(vehicle_class); }
      if (vehicle_type !== undefined) { updates.push('vehicle_type = ?'); values.push(vehicle_type); }
      if (fuel_type !== undefined) { updates.push('fuel_type = ?'); values.push(fuel_type); }
      if (transmission !== undefined) { updates.push('transmission = ?'); values.push(transmission); }
      if (drive_type !== undefined) { updates.push('drive_type = ?'); values.push(drive_type); }
      if (engine_cc !== undefined) { updates.push('engine_cc = ?'); values.push(engine_cc); }
      if (horsepower !== undefined) { updates.push('horsepower = ?'); values.push(horsepower); }
      if (fuel_efficiency_kmpl !== undefined) { updates.push('fuel_efficiency_kmpl = ?'); values.push(fuel_efficiency_kmpl); }
      if (seating_capacity !== undefined) { updates.push('seating_capacity = ?'); values.push(seating_capacity); }
      if (door_count !== undefined) { updates.push('door_count = ?'); values.push(door_count); }
      if (large_bags !== undefined) { updates.push('large_bags = ?'); values.push(large_bags); }
      if (small_bags !== undefined) { updates.push('small_bags = ?'); values.push(small_bags); }
      if (thumbnail_url !== undefined) { updates.push('thumbnail_url = ?'); values.push(thumbnail_url); }
      if (images !== undefined) { updates.push('images = ?'); values.push(JSON.stringify(images)); }
      if (standard_features !== undefined) { updates.push('standard_features = ?'); values.push(JSON.stringify(standard_features)); }
      if (optional_features !== undefined) { updates.push('optional_features = ?'); values.push(JSON.stringify(optional_features)); }
      if (age_requirement !== undefined) { updates.push('age_requirement = ?'); values.push(age_requirement); }
      if (mileage_limit_per_day !== undefined) { updates.push('mileage_limit_per_day = ?'); values.push(mileage_limit_per_day); }
      if (unlimited_mileage !== undefined) { updates.push('unlimited_mileage = ?'); values.push(unlimited_mileage ? 1 : 0); }
      if (deposit_amount_krw !== undefined) { updates.push('deposit_amount_krw = ?'); values.push(deposit_amount_krw); }
      if (smoking_allowed !== undefined) { updates.push('smoking_allowed = ?'); values.push(smoking_allowed ? 1 : 0); }
      if (fuel_policy !== undefined) { updates.push('fuel_policy = ?'); values.push(fuel_policy); }
      if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
      if (is_featured !== undefined) { updates.push('is_featured = ?'); values.push(is_featured ? 1 : 0); }
      if (display_order !== undefined) { updates.push('display_order = ?'); values.push(display_order); }

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

      console.log(`✅ [Rentcar Vehicle] 수정 완료: vehicle_id=${vehicle_id}`);

      return res.status(200).json({
        success: true,
        message: '차량 정보가 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Rentcar Vehicles PUT] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // DELETE: 차량 삭제
  if (req.method === 'DELETE') {
    try {
      const { vehicle_id } = req.query;

      if (!vehicle_id) {
        return res.status(400).json({
          success: false,
          error: 'vehicle_id가 필요합니다.'
        });
      }

      // 예약이 있는지 확인
      const bookingCheck = await connection.execute(`
        SELECT COUNT(*) as booking_count
        FROM rentcar_bookings
        WHERE vehicle_id = ? AND status IN ('confirmed', 'in_progress')
      `, [vehicle_id]);

      if (bookingCheck.rows && bookingCheck.rows[0].booking_count > 0) {
        return res.status(400).json({
          success: false,
          error: '예약이 있는 차량은 삭제할 수 없습니다. 비활성화를 사용하세요.'
        });
      }

      // 삭제
      await connection.execute(`DELETE FROM rentcar_vehicles WHERE id = ?`, [vehicle_id]);

      console.log(`✅ [Rentcar Vehicle] 삭제 완료: vehicle_id=${vehicle_id}`);

      return res.status(200).json({
        success: true,
        message: '차량이 삭제되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Rentcar Vehicles DELETE] Error:', error);
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
