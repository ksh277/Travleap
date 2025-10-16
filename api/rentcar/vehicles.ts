// 렌트카 차량 검색 및 조회 API
import { db } from '../../utils/database';

interface VehicleSearchRequest {
  vendor_id?: number;
  pickup_location_id?: number;
  pickup_date?: string;
  dropoff_date?: string;
  vehicle_type?: string; // sedan, suv, van, etc.
  passenger_capacity?: number;
  fuel_type?: string; // gasoline, diesel, electric, hybrid
  transmission?: string; // automatic, manual
  price_min?: number;
  price_max?: number;
  features?: string[]; // navigation, bluetooth, sunroof, etc.
  sort_by?: 'price_asc' | 'price_desc' | 'rating' | 'newest';
  page?: number;
  limit?: number;
}

// 차량 검색
export async function searchVehicles(request: VehicleSearchRequest) {
  try {
    const {
      vendor_id,
      pickup_location_id,
      pickup_date,
      dropoff_date,
      vehicle_type,
      passenger_capacity,
      fuel_type,
      transmission,
      price_min,
      price_max,
      features,
      sort_by = 'price_asc',
      page = 1,
      limit = 20
    } = request;

    let query = `
      SELECT
        v.*,
        vendor.business_name as vendor_name,
        vendor.rating as vendor_rating,
        vendor.address as vendor_address,
        (
          SELECT COUNT(*)
          FROM rentcar_bookings rb
          WHERE rb.vehicle_id = v.id
          AND rb.status = 'completed'
        ) as completed_bookings
    `;

    // 날짜 범위가 제공된 경우 재고 충돌 체크
    if (pickup_date && dropoff_date) {
      query += `,
        (
          SELECT COUNT(*)
          FROM rentcar_bookings rb
          WHERE rb.vehicle_id = v.id
          AND rb.status NOT IN ('cancelled')
          AND (
            (rb.pickup_date <= ? AND rb.dropoff_date >= ?) OR
            (rb.pickup_date <= ? AND rb.dropoff_date >= ?) OR
            (rb.pickup_date >= ? AND rb.dropoff_date <= ?)
          )
        ) as conflict_count
      `;
    }

    query += `
      FROM rentcar_vehicles v
      LEFT JOIN rentcar_vendors vendor ON v.vendor_id = vendor.id
      WHERE v.is_active = TRUE
    `;

    const params: any[] = [];

    // 날짜 범위 파라미터 추가
    if (pickup_date && dropoff_date) {
      params.push(
        pickup_date, pickup_date,
        dropoff_date, dropoff_date,
        pickup_date, dropoff_date
      );
    }

    // 필터 조건들
    if (vendor_id) {
      query += ' AND v.vendor_id = ?';
      params.push(vendor_id);
    }

    if (pickup_location_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM rentcar_locations loc
        WHERE loc.vendor_id = v.vendor_id
        AND loc.id = ?
      )`;
      params.push(pickup_location_id);
    }

    if (vehicle_type) {
      query += ' AND v.vehicle_type = ?';
      params.push(vehicle_type);
    }

    if (passenger_capacity) {
      query += ' AND v.passenger_capacity >= ?';
      params.push(passenger_capacity);
    }

    if (fuel_type) {
      query += ' AND v.fuel_type = ?';
      params.push(fuel_type);
    }

    if (transmission) {
      query += ' AND v.transmission = ?';
      params.push(transmission);
    }

    if (price_min !== undefined) {
      query += ' AND v.daily_rate_krw >= ?';
      params.push(price_min);
    }

    if (price_max !== undefined) {
      query += ' AND v.daily_rate_krw <= ?';
      params.push(price_max);
    }

    // 특징 필터 (JSON 배열 검색)
    if (features && features.length > 0) {
      for (const feature of features) {
        query += ` AND JSON_CONTAINS(v.features, ?)`;
        params.push(JSON.stringify(feature));
      }
    }

    // 정렬
    switch (sort_by) {
      case 'price_asc':
        query += ' ORDER BY v.daily_rate_krw ASC';
        break;
      case 'price_desc':
        query += ' ORDER BY v.daily_rate_krw DESC';
        break;
      case 'rating':
        query += ' ORDER BY vendor.rating DESC';
        break;
      case 'newest':
        query += ' ORDER BY v.created_at DESC';
        break;
      default:
        query += ' ORDER BY v.daily_rate_krw ASC';
    }

    // 페이지네이션
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const vehicles = await db.query(query, params);

    // 날짜 필터가 있는 경우 재고 충돌이 없는 차량만 필터링
    let filteredVehicles = vehicles;
    if (pickup_date && dropoff_date) {
      filteredVehicles = vehicles.filter((v: any) => v.conflict_count === 0);
    }

    // 총 개수 조회 (페이지네이션용)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM rentcar_vehicles v
      LEFT JOIN rentcar_vendors vendor ON v.vendor_id = vendor.id
      WHERE v.is_active = TRUE
    `;

    // 같은 필터 조건 적용
    const countParams: any[] = [];
    if (vendor_id) {
      countQuery += ' AND v.vendor_id = ?';
      countParams.push(vendor_id);
    }
    if (pickup_location_id) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM rentcar_locations loc
        WHERE loc.vendor_id = v.vendor_id
        AND loc.id = ?
      )`;
      countParams.push(pickup_location_id);
    }
    if (vehicle_type) {
      countQuery += ' AND v.vehicle_type = ?';
      countParams.push(vehicle_type);
    }
    if (passenger_capacity) {
      countQuery += ' AND v.passenger_capacity >= ?';
      countParams.push(passenger_capacity);
    }
    if (fuel_type) {
      countQuery += ' AND v.fuel_type = ?';
      countParams.push(fuel_type);
    }
    if (transmission) {
      countQuery += ' AND v.transmission = ?';
      countParams.push(transmission);
    }
    if (price_min !== undefined) {
      countQuery += ' AND v.daily_rate_krw >= ?';
      countParams.push(price_min);
    }
    if (price_max !== undefined) {
      countQuery += ' AND v.daily_rate_krw <= ?';
      countParams.push(price_max);
    }
    if (features && features.length > 0) {
      for (const feature of features) {
        countQuery += ` AND JSON_CONTAINS(v.features, ?)`;
        countParams.push(JSON.stringify(feature));
      }
    }

    const countResult = await db.query(countQuery, countParams);
    const totalCount = countResult[0].total;

    return {
      success: true,
      vehicles: filteredVehicles,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit)
      }
    };

  } catch (error) {
    console.error('❌ [Rentcar] 차량 검색 오류:', error);
    return {
      success: false,
      message: '차량 검색 중 오류가 발생했습니다',
      vehicles: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 0 }
    };
  }
}

// 차량 상세 조회
export async function getVehicleById(vehicleId: number) {
  try {
    // 차량 기본 정보
    const vehicles = await db.query(`
      SELECT
        v.*,
        vendor.business_name as vendor_name,
        vendor.rating as vendor_rating,
        vendor.total_reviews as vendor_total_reviews,
        vendor.address as vendor_address,
        vendor.phone as vendor_phone,
        vendor.email as vendor_email,
        (
          SELECT COUNT(*)
          FROM rentcar_bookings rb
          WHERE rb.vehicle_id = v.id
          AND rb.status = 'completed'
        ) as completed_bookings
      FROM rentcar_vehicles v
      LEFT JOIN rentcar_vendors vendor ON v.vendor_id = vendor.id
      WHERE v.id = ? AND v.is_active = TRUE
    `, [vehicleId]);

    if (vehicles.length === 0) {
      return {
        success: false,
        message: '차량을 찾을 수 없습니다'
      };
    }

    const vehicle = vehicles[0];

    // 사용 가능한 픽업 지점들
    const locations = await db.query(`
      SELECT *
      FROM rentcar_locations
      WHERE vendor_id = ? AND is_active = TRUE
      ORDER BY is_main_location DESC, name ASC
    `, [vehicle.vendor_id]);

    // 사용 가능한 보험 상품들
    const insurances = await db.query(`
      SELECT *
      FROM rentcar_insurance_products
      WHERE vendor_id = ? AND is_active = TRUE
      ORDER BY price_per_day_krw ASC
    `, [vehicle.vendor_id]);

    // 사용 가능한 추가 옵션들
    const options = await db.query(`
      SELECT *
      FROM rentcar_additional_options
      WHERE vendor_id = ? AND is_active = TRUE
      ORDER BY charge_type, price_krw ASC
    `, [vehicle.vendor_id]);

    // 리뷰 조회
    const reviews = await db.query(`
      SELECT
        r.*,
        u.name as user_name
      FROM rentcar_reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.vehicle_id = ?
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [vehicleId]);

    return {
      success: true,
      vehicle: {
        ...vehicle,
        locations,
        insurances,
        options,
        reviews
      }
    };

  } catch (error) {
    console.error('❌ [Rentcar] 차량 상세 조회 오류:', error);
    return {
      success: false,
      message: '차량 상세 정보 조회 중 오류가 발생했습니다'
    };
  }
}

// 차량 타입별 필터 옵션 조회
export async function getVehicleFilters(vendorId?: number) {
  try {
    let whereClause = 'WHERE v.is_active = TRUE';
    const params: any[] = [];

    if (vendorId) {
      whereClause += ' AND v.vendor_id = ?';
      params.push(vendorId);
    }

    // 차량 타입
    const types = await db.query(`
      SELECT DISTINCT vehicle_type, COUNT(*) as count
      FROM rentcar_vehicles v
      ${whereClause}
      GROUP BY vehicle_type
      ORDER BY count DESC
    `, params);

    // 연료 타입
    const fuelTypes = await db.query(`
      SELECT DISTINCT fuel_type, COUNT(*) as count
      FROM rentcar_vehicles v
      ${whereClause}
      GROUP BY fuel_type
      ORDER BY count DESC
    `, params);

    // 변속기 타입
    const transmissions = await db.query(`
      SELECT DISTINCT transmission, COUNT(*) as count
      FROM rentcar_vehicles v
      ${whereClause}
      GROUP BY transmission
      ORDER BY count DESC
    `, params);

    // 가격 범위
    const priceRange = await db.query(`
      SELECT
        MIN(daily_rate_krw) as min_price,
        MAX(daily_rate_krw) as max_price,
        AVG(daily_rate_krw) as avg_price
      FROM rentcar_vehicles v
      ${whereClause}
    `, params);

    // 승객 수 옵션
    const capacities = await db.query(`
      SELECT DISTINCT passenger_capacity, COUNT(*) as count
      FROM rentcar_vehicles v
      ${whereClause}
      GROUP BY passenger_capacity
      ORDER BY passenger_capacity ASC
    `, params);

    return {
      success: true,
      filters: {
        vehicle_types: types,
        fuel_types: fuelTypes,
        transmissions,
        price_range: priceRange[0] || { min_price: 0, max_price: 0, avg_price: 0 },
        passenger_capacities: capacities
      }
    };

  } catch (error) {
    console.error('❌ [Rentcar] 필터 옵션 조회 오류:', error);
    return {
      success: false,
      message: '필터 옵션 조회 중 오류가 발생했습니다',
      filters: null
    };
  }
}
