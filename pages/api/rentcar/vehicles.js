/**
 * 사용자용 - 렌트카 차량 검색/목록 API
 * GET /api/rentcar/vehicles - 차량 목록 (검색, 필터링)
 * GET /api/rentcar/vehicles?id=123 - 특정 차량 상세 조회
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  if (req.method === 'GET') {
    try {
      const {
        id,
        vehicle_class,
        fuel_type,
        transmission,
        seating_capacity,
        min_price,
        max_price,
        brand,
        pickup_location,
        dropoff_location,
        pickup_date,
        dropoff_date,
        sort_by = 'popular', // popular, price_low, price_high, newest
        limit = 20,
        offset = 0
      } = req.query;

      // 특정 차량 상세 조회
      if (id) {
        const query = `
          SELECT
            v.*,
            vd.business_name as vendor_name,
            vd.logo_url as vendor_logo,
            vd.average_rating as vendor_rating,
            COUNT(DISTINCT b.id) as total_bookings
          FROM rentcar_vehicles v
          LEFT JOIN rentcar_vendors vd ON v.vendor_id = vd.id
          LEFT JOIN rentcar_bookings b ON v.id = b.vehicle_id
            AND b.status IN ('confirmed', 'in_progress', 'completed')
          WHERE v.id = ? AND v.is_active = 1
          GROUP BY v.id
        `;

        const result = await connection.execute(query, [id]);

        if (!result.rows || result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '차량을 찾을 수 없습니다.'
          });
        }

        const vehicle = result.rows[0];

        // JSON 필드 파싱
        const formattedVehicle = {
          ...vehicle,
          images: vehicle.images ? JSON.parse(vehicle.images) : [],
          standard_features: vehicle.standard_features ? JSON.parse(vehicle.standard_features) : [],
          optional_features: vehicle.optional_features ? JSON.parse(vehicle.optional_features) : []
        };

        return res.status(200).json({
          success: true,
          vehicle: formattedVehicle
        });
      }

      // 목록 조회
      let query = `
        SELECT
          v.id,
          v.vehicle_code,
          v.brand,
          v.model,
          v.year,
          v.display_name,
          v.vehicle_class,
          v.fuel_type,
          v.transmission,
          v.seating_capacity,
          v.door_count,
          v.large_bags,
          v.small_bags,
          v.thumbnail_url,
          v.fuel_efficiency_kmpl,
          v.unlimited_mileage,
          v.deposit_amount_krw,
          vd.business_name as vendor_name,
          vd.average_rating as vendor_rating,
          COUNT(DISTINCT b.id) as total_bookings
        FROM rentcar_vehicles v
        LEFT JOIN rentcar_vendors vd ON v.vendor_id = vd.id
        LEFT JOIN rentcar_bookings b ON v.id = b.vehicle_id
          AND b.status IN ('confirmed', 'completed')
        WHERE v.is_active = 1
      `;

      const params = [];

      // 필터링
      if (vehicle_class) {
        query += ` AND v.vehicle_class = ?`;
        params.push(vehicle_class);
      }

      if (fuel_type) {
        query += ` AND v.fuel_type = ?`;
        params.push(fuel_type);
      }

      if (transmission) {
        query += ` AND v.transmission = ?`;
        params.push(transmission);
      }

      if (seating_capacity) {
        query += ` AND v.seating_capacity >= ?`;
        params.push(parseInt(seating_capacity));
      }

      if (brand) {
        query += ` AND v.brand = ?`;
        params.push(brand);
      }

      // 가격 필터 (일일 요금 기준 - rate_plans 테이블이 있다면 JOIN 필요)
      // 현재는 간단하게 deposit_amount로 대체
      if (min_price) {
        query += ` AND v.deposit_amount_krw >= ?`;
        params.push(parseInt(min_price));
      }

      if (max_price) {
        query += ` AND v.deposit_amount_krw <= ?`;
        params.push(parseInt(max_price));
      }

      // 날짜별 가용성 체크 (예약이 겹치는 차량 제외)
      if (pickup_date && dropoff_date) {
        query += `
          AND v.id NOT IN (
            SELECT vehicle_id
            FROM rentcar_bookings
            WHERE status IN ('confirmed', 'in_progress')
              AND (
                (pickup_date < ? AND dropoff_date > ?)
                OR (pickup_date >= ? AND pickup_date < ?)
              )
          )
        `;
        params.push(dropoff_date, pickup_date, pickup_date, dropoff_date);
      }

      query += ` GROUP BY v.id`;

      // 정렬
      switch (sort_by) {
        case 'price_low':
          query += ` ORDER BY v.deposit_amount_krw ASC`;
          break;
        case 'price_high':
          query += ` ORDER BY v.deposit_amount_krw DESC`;
          break;
        case 'newest':
          query += ` ORDER BY v.created_at DESC`;
          break;
        case 'popular':
        default:
          query += ` ORDER BY total_bookings DESC, vd.average_rating DESC`;
          break;
      }

      query += ` LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await connection.execute(query, params);

      // 가용성 체크 함수
      const checkAvailability = async (vehicleId) => {
        // 날짜가 제공되지 않으면 항상 available
        if (!pickup_date || !dropoff_date) {
          return true;
        }

        // 해당 차량에 겹치는 예약이 있는지 확인
        const availabilityQuery = `
          SELECT COUNT(*) as conflicting_bookings
          FROM rentcar_bookings
          WHERE vehicle_id = ?
            AND status IN ('confirmed', 'in_progress')
            AND (
              (pickup_date < ? AND dropoff_date > ?)
              OR (pickup_date >= ? AND pickup_date < ?)
            )
        `;

        const availResult = await connection.execute(availabilityQuery, [
          vehicleId,
          dropoff_date,
          pickup_date,
          pickup_date,
          dropoff_date
        ]);

        return (availResult.rows[0]?.conflicting_bookings || 0) === 0;
      };

      // JSON 필드 파싱 및 가용성 체크
      const vehiclesWithAvailability = await Promise.all(
        (result.rows || []).map(async (vehicle) => ({
          ...vehicle,
          is_available: await checkAvailability(vehicle.id)
        }))
      );

      const vehicles = vehiclesWithAvailability;

      // 전체 개수 조회
      let countQuery = `
        SELECT COUNT(DISTINCT v.id) as total
        FROM rentcar_vehicles v
        LEFT JOIN rentcar_vendors vd ON v.vendor_id = vd.id
        WHERE v.is_active = 1
      `;

      const countParams = [];

      if (vehicle_class) {
        countQuery += ` AND v.vehicle_class = ?`;
        countParams.push(vehicle_class);
      }

      if (fuel_type) {
        countQuery += ` AND v.fuel_type = ?`;
        countParams.push(fuel_type);
      }

      if (transmission) {
        countQuery += ` AND v.transmission = ?`;
        countParams.push(transmission);
      }

      if (seating_capacity) {
        countQuery += ` AND v.seating_capacity >= ?`;
        countParams.push(parseInt(seating_capacity));
      }

      if (brand) {
        countQuery += ` AND v.brand = ?`;
        countParams.push(brand);
      }

      if (min_price) {
        countQuery += ` AND v.deposit_amount_krw >= ?`;
        countParams.push(parseInt(min_price));
      }

      if (max_price) {
        countQuery += ` AND v.deposit_amount_krw <= ?`;
        countParams.push(parseInt(max_price));
      }

      // 날짜별 가용성 체크 (예약이 겹치는 차량 제외)
      if (pickup_date && dropoff_date) {
        countQuery += `
          AND v.id NOT IN (
            SELECT vehicle_id
            FROM rentcar_bookings
            WHERE status IN ('confirmed', 'in_progress')
              AND (
                (pickup_date < ? AND dropoff_date > ?)
                OR (pickup_date >= ? AND pickup_date < ?)
              )
          )
        `;
        countParams.push(dropoff_date, pickup_date, pickup_date, dropoff_date);
      }

      const countResult = await connection.execute(countQuery, countParams);
      const total = countResult.rows[0]?.total || 0;

      return res.status(200).json({
        success: true,
        vehicles,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: parseInt(offset) + vehicles.length < total
        }
      });

    } catch (error) {
      console.error('❌ [Rentcar Vehicles API] Error:', error);
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
