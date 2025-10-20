/**
 * PMS 동기화 API 엔드포인트
 * POST /api/pms/sync - PMS에서 차량 정보 동기화
 *
 * 이 API는 서버 사이드에서 실행되므로:
 * 1. CORS 문제 없음
 * 2. API 키가 브라우저에 노출되지 않음
 * 3. PlanetScale DB에 직접 접근 가능
 */

// @ts-ignore
import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// PlanetScale 연결
function getConnection() {
  return connect({
    host: process.env.DATABASE_HOST,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
  });
}

// OPTIONS 요청 처리
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST 요청 처리
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendorId } = body;

    if (!vendorId) {
      return NextResponse.json(
        { success: false, error: 'vendorId가 필요합니다.' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`🔄 PMS 동기화 시작 - Vendor ID: ${vendorId}`);

    const result = await syncPMSVehicles(vendorId);

    return NextResponse.json(
      { success: result.success, data: result },
      { status: result.success ? 200 : 500, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ PMS 동기화 API 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// ============================================================================
// PMS 동기화 로직 (서버 사이드)
// ============================================================================







/**
 * 메인 동기화 함수
 */
async function syncPMSVehicles(vendorId) {
  const result = {
    success: false,
    vehiclesAdded: 0,
    vehiclesUpdated: 0,
    vehiclesDeleted: 0,
    errors: [],
  };

  const syncStartTime = new Date();
  const conn = getConnection();

  try {
    // 1. 벤더의 PMS 설정 가져오기
    const vendorResult = await conn.execute(
      `SELECT pms_provider, pms_api_key, pms_api_secret, pms_endpoint, pms_sync_enabled
       FROM rentcar_vendors
       WHERE id = ? AND pms_sync_enabled = TRUE`,
      [vendorId]
    );

    if (!vendorResult.rows || vendorResult.rows.length === 0) {
      throw new Error('PMS 동기화가 비활성화되어 있거나 설정이 없습니다.');
    }

    const vendor = vendorResult.rows[0];
    const config = {
      provider: vendor.pms_provider,
      apiKey: vendor.pms_api_key,
      apiSecret: vendor.pms_api_secret,
      endpoint: vendor.pms_endpoint,
    };

    console.log(`✅ PMS 설정 확인: ${config.provider}`);

    // 2. PMS에서 차량 목록 가져오기
    let pmsVehicles = [];

    switch (config.provider) {
      case 'turo' = await fetchTuroVehicles(config);
        break;
      case 'getaround' = await fetchGetaroundVehicles(config);
        break;
      case 'rentcars' = await fetchRentCarsVehicles(config);
        break;
      case 'custom' = await fetchCustomPMSVehicles(config);
        break;
      default:
        throw new Error(`지원하지 않는 PMS: ${config.provider}`);
    }

    console.log(`✅ PMS에서 ${pmsVehicles.length}개 차량 조회 완료`);

    // 3. 기존 매핑 정보 가져오기
    const existingMappingsResult = await conn.execute(
      `SELECT pms_vehicle_id, local_vehicle_id
       FROM pms_vehicle_mapping
       WHERE vendor_id = ? AND pms_provider = ?`,
      [vendorId, config.provider]
    );

    const mappingMap = new Map(
      (existingMappingsResult.rows[]).map((m) => [m.pms_vehicle_id, m.local_vehicle_id])
    );

    // 4. 차량별로 동기화
    for (const pmsVehicle of pmsVehicles) {
      try {
        const localVehicleId = mappingMap.get(pmsVehicle.pms_id);

        if (localVehicleId) {
          // 업데이트
          await updateLocalVehicle(conn, vendorId, localVehicleId, pmsVehicle);
          result.vehiclesUpdated++;
        } else {
          // 신규 추가
          const newId = await createLocalVehicle(conn, vendorId, pmsVehicle);

          // 매핑 정보 저장
          await conn.execute(
            `INSERT INTO pms_vehicle_mapping (vendor_id, pms_vehicle_id, local_vehicle_id, pms_provider, last_synced_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [vendorId, pmsVehicle.pms_id, newId, config.provider]
          );

          result.vehiclesAdded++;
        }

        // 매핑 정보에서 제거 (남은 건 삭제 대상)
        mappingMap.delete(pmsVehicle.pms_id);
      } catch (error: any) {
        console.error(`차량 동기화 실패 (PMS ID: ${pmsVehicle.pms_id}):`, error);
        result.errors.push(`${pmsVehicle.display_name}: ${error.message}`);
      }
    }

    // 5. PMS에서 삭제된 차량 처리
    for (const [pmsVehicleId, localVehicleId] of mappingMap.entries()) {
      try {
        await conn.execute(`DELETE FROM rentcar_vehicles WHERE id = ? AND vendor_id = ?`, [
          localVehicleId,
          vendorId,
        ]);
        await conn.execute(`DELETE FROM pms_vehicle_mapping WHERE local_vehicle_id = ?`, [
          localVehicleId,
        ]);
        result.vehiclesDeleted++;
      } catch (error: any) {
        result.errors.push(`차량 삭제 실패 (ID: ${localVehicleId}): ${error.message}`);
      }
    }

    // 6. 마지막 동기화 시간 업데이트
    await conn.execute(`UPDATE rentcar_vendors SET pms_last_sync = NOW() WHERE id = ?`, [
      vendorId,
    ]);

    result.success = true;

    // 7. 동기화 로그 저장
    await conn.execute(
      `INSERT INTO pms_sync_logs
       (vendor_id, sync_status, vehicles_added, vehicles_updated, vehicles_deleted,
        error_message, sync_started_at, sync_completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        vendorId,
        result.errors.length > 0 ? 'partial' : 'success',
        result.vehiclesAdded,
        result.vehiclesUpdated,
        result.vehiclesDeleted,
        result.errors.length > 0 ? result.errors.join('\n') : null,
        syncStartTime,
      ]
    );

    console.log(
      `✅ PMS 동기화 완료: +${result.vehiclesAdded} ~${result.vehiclesUpdated} -${result.vehiclesDeleted}`
    );
  } catch (error: any) {
    console.error('❌ PMS 동기화 실패:', error);
    result.errors.push(error.message);

    // 실패 로그 저장
    await conn.execute(
      `INSERT INTO pms_sync_logs
       (vendor_id, sync_status, error_message, sync_started_at, sync_completed_at)
       VALUES (?, 'failed', ?, ?, NOW())`,
      [vendorId, error.message, syncStartTime]
    );
  }

  return result;
}

/**
 * Turo API 호출
 */
async function fetchTuroVehicles(config: PMSConfig) {
  const response = await fetch('https://api.turo.com/api/v3/vehicles', {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Turo API Error: ${response.status}`);
  }

  const data = await response.json();

  return (data.vehicles || []).map((v: any) => ({
    pms_id: v.id,
    display_name: `${v.make} ${v.model} ${v.year}`,
    vehicle_class: mapTuroClass(v.type),
    seating_capacity: v.seats || 5,
    transmission_type: v.transmission === 'automatic' ? '자동' : '수동',
    fuel_type: mapFuelType(v.fuel_type),
    daily_rate_krw: Math.round((v.price_per_day || 50) * 1300),
    weekly_rate_krw: Math.round((v.price_per_day || 50) * 1300 * 6),
    monthly_rate_krw: Math.round((v.price_per_day || 50) * 1300 * 25),
    mileage_limit_km: Math.round((v.mileage_limit || 125) * 1.6),
    excess_mileage_fee_krw: Math.round((v.overage_fee || 0.5) * 1300 * 1.6),
    images: v.photos?.map((p: any) => p.url) || [],
    is_available: v.is_available,
    insurance_included: true,
    insurance_options: '자차보험, 대인배상, 대물배상',
    available_options: v.features?.join(', ') || 'GPS, 블랙박스',
    pickup_location: v.location?.address || '신안군 렌트카 본점',
    dropoff_location: v.location?.address || '신안군 렌트카 본점',
    min_rental_days: v.minimum_days || 1,
    max_rental_days: v.maximum_days || 30,
    instant_booking: v.instant_book || true,
  }));
}

/**
 * Getaround API 호출
 */
async function fetchGetaroundVehicles(config: PMSConfig) {
  const response = await fetch('https://api.getaround.com/owner/v1/cars', {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Getaround API Error: ${response.status}`);
  }

  const data = await response.json();

  return (data.cars || []).map((v: any) => ({
    pms_id: v.id,
    display_name: `${v.brand} ${v.model} ${v.year}`,
    vehicle_class: mapGetaroundClass(v.category),
    seating_capacity: v.seats || 5,
    transmission_type: v.gearbox === 'manual' ? '수동' : '자동',
    fuel_type: mapFuelType(v.fuel),
    daily_rate_krw: Math.round((v.daily_price || 50) * 1100),
    weekly_rate_krw: Math.round((v.daily_price || 50) * 1100 * 6),
    monthly_rate_krw: Math.round((v.daily_price || 50) * 1100 * 25),
    mileage_limit_km: v.mileage_package?.limit || 200,
    excess_mileage_fee_krw: Math.round((v.mileage_package?.extra_km_price || 0.3) * 1100),
    images: v.pictures || [],
    is_available: v.bookable,
    insurance_included: true,
    insurance_options: '자차보험, 대인배상, 대물배상',
    available_options: v.options?.join(', ') || 'GPS',
    pickup_location: v.parking_address || '신안군 렌트카 본점',
    dropoff_location: v.parking_address || '신안군 렌트카 본점',
    min_rental_days: 1,
    max_rental_days: 30,
    instant_booking: true,
  }));
}

/**
 * RentCars.com API 호출
 */
async function fetchRentCarsVehicles(config: PMSConfig) {
  const response = await fetch('https://api.rentcars.com/partner/v1/fleet', {
    headers: {
      'X-API-Key': config.apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`RentCars API Error: ${response.status}`);
  }

  const data = await response.json();

  return (data.vehicles || []).map((v: any) => ({
    pms_id: v.vehicle_id,
    display_name: v.vehicle_name,
    vehicle_class: v.category || '중형',
    seating_capacity: v.passengers || 5,
    transmission_type: v.transmission === 'manual' ? '수동' : '자동',
    fuel_type: mapFuelType(v.fuel_type),
    daily_rate_krw: Math.round((v.daily_rate || 50) * 1300),
    weekly_rate_krw: Math.round((v.weekly_rate || v.daily_rate * 6 || 300) * 1300),
    monthly_rate_krw: Math.round((v.monthly_rate || v.daily_rate * 25 || 1250) * 1300),
    mileage_limit_km: v.mileage_limit || 200,
    excess_mileage_fee_krw: Math.round((v.excess_mileage_fee || 0.5) * 1300),
    images: v.images || [],
    is_available: v.available !== false,
    insurance_included: v.insurance_included || true,
    insurance_options: v.insurance_options || '자차보험, 대인배상, 대물배상',
    available_options: v.features?.join(', ') || 'GPS',
    pickup_location: v.pickup_location || '신안군 렌트카 본점',
    dropoff_location: v.dropoff_location || '신안군 렌트카 본점',
    min_rental_days: v.min_rental_days || 1,
    max_rental_days: v.max_rental_days || 30,
    instant_booking: v.instant_booking !== false,
  }));
}

/**
 * Custom PMS API 호출
 */
async function fetchCustomPMSVehicles(config: PMSConfig) {
  if (!config.endpoint) {
    throw new Error('Custom PMS endpoint가 필요합니다.');
  }

  const response = await fetch(config.endpoint, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'X-API-Secret': config.apiSecret || '',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Custom PMS API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.vehicles || [];
}

/**
 * 로컬 차량 업데이트
 */
async function updateLocalVehicle(
  conn: any,
  vendorId: number,
  localVehicleId: number,
  pmsVehicle: PMSVehicle
) {
  const imagesJson = JSON.stringify(pmsVehicle.images);

  await conn.execute(
    `UPDATE rentcar_vehicles
     SET display_name = ?, vehicle_class = ?, seating_capacity = ?,
         transmission_type = ?, fuel_type = ?, daily_rate_krw = ?,
         weekly_rate_krw = ?, monthly_rate_krw = ?, mileage_limit_km = ?,
         excess_mileage_fee_krw = ?, is_available = ?, images = ?,
         insurance_included = ?, insurance_options = ?, available_options = ?,
         pickup_location = ?, dropoff_location = ?, min_rental_days = ?,
         max_rental_days = ?, instant_booking = ?, updated_at = NOW()
     WHERE id = ? AND vendor_id = ?`,
    [
      pmsVehicle.display_name,
      pmsVehicle.vehicle_class,
      pmsVehicle.seating_capacity,
      pmsVehicle.transmission_type,
      pmsVehicle.fuel_type,
      pmsVehicle.daily_rate_krw,
      pmsVehicle.weekly_rate_krw || pmsVehicle.daily_rate_krw * 6,
      pmsVehicle.monthly_rate_krw || pmsVehicle.daily_rate_krw * 25,
      pmsVehicle.mileage_limit_km,
      pmsVehicle.excess_mileage_fee_krw,
      pmsVehicle.is_available ? 1 : 0,
      imagesJson,
      pmsVehicle.insurance_included ? 1 : 0,
      pmsVehicle.insurance_options || '자차보험',
      pmsVehicle.available_options || 'GPS',
      pmsVehicle.pickup_location || '신안군 렌트카 본점',
      pmsVehicle.dropoff_location || '신안군 렌트카 본점',
      pmsVehicle.min_rental_days || 1,
      pmsVehicle.max_rental_days || 30,
      pmsVehicle.instant_booking ? 1 : 0,
      localVehicleId,
      vendorId,
    ]
  );
}

/**
 * 로컬 차량 생성
 */
async function createLocalVehicle(conn, vendorId, pmsVehicle) {
  const imagesJson = JSON.stringify(pmsVehicle.images);

  const result = await conn.execute(
    `INSERT INTO rentcar_vehicles (
      vendor_id, display_name, vehicle_class, seating_capacity,
      transmission_type, fuel_type, daily_rate_krw, weekly_rate_krw,
      monthly_rate_krw, mileage_limit_km, excess_mileage_fee_krw,
      is_available, images, insurance_included, insurance_options,
      available_options, pickup_location, dropoff_location, min_rental_days,
      max_rental_days, instant_booking, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      vendorId,
      pmsVehicle.display_name,
      pmsVehicle.vehicle_class,
      pmsVehicle.seating_capacity,
      pmsVehicle.transmission_type,
      pmsVehicle.fuel_type,
      pmsVehicle.daily_rate_krw,
      pmsVehicle.weekly_rate_krw || pmsVehicle.daily_rate_krw * 6,
      pmsVehicle.monthly_rate_krw || pmsVehicle.daily_rate_krw * 25,
      pmsVehicle.mileage_limit_km,
      pmsVehicle.excess_mileage_fee_krw,
      pmsVehicle.is_available ? 1 : 0,
      imagesJson,
      pmsVehicle.insurance_included ? 1 : 0,
      pmsVehicle.insurance_options || '자차보험',
      pmsVehicle.available_options || 'GPS',
      pmsVehicle.pickup_location || '신안군 렌트카 본점',
      pmsVehicle.dropoff_location || '신안군 렌트카 본점',
      pmsVehicle.min_rental_days || 1,
      pmsVehicle.max_rental_days || 30,
      pmsVehicle.instant_booking ? 1 : 0,
    ]
  );

  return result.insertId;
}

// 헬퍼 함수들
function mapTuroClass(turoType: string) {
  const mapping: Record<string, string> = {
    economy: '소형',
    compact: '준중형',
    midsize: '중형',
    standard: '중형',
    fullsize: '대형',
    luxury: '대형',
    suv: 'SUV',
    van: '승합',
  };
  return mapping[turoType?.toLowerCase()] || '중형';
}

function mapGetaroundClass(category: string) {
  const mapping: Record<string, string> = {
    mini: '경형',
    economy: '소형',
    compact: '준중형',
    sedan: '중형',
    suv: 'SUV',
    van: '승합',
    premium: '대형',
  };
  return mapping[category?.toLowerCase()] || '중형';
}

function mapFuelType(fuel: string) {
  const mapping: Record<string, string> = {
    gasoline: '가솔린',
    petrol: '가솔린',
    diesel: '디젤',
    electric: '전기',
    hybrid: '하이브리드',
    lpg: 'LPG',
  };
  return mapping[fuel?.toLowerCase()] || '가솔린';
}
