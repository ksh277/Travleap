/**
 * 렌트카 업체 API 연동 시스템
 *
 * 기능:
 * 1. 업체별 REST API 연동 (차량 목록, 가격, 재고)
 * 2. 다양한 API 포맷 지원 (표준 JSON, 업체별 커스텀)
 * 3. 자동 데이터 매핑 및 DB 저장
 */

import type {
  RentcarVehicleFormData,
  VehicleClass,
  FuelType,
  TransmissionType
} from '../../types/rentcar';

// 지원하는 API 프로바이더
export type RentcarApiProvider =
  | 'standard'      // 표준 JSON 포맷
  | 'custom'        // 커스텀 포맷 (매핑 필요)
  | 'socar'         // 쏘카 API
  | 'greencar'      // 그린카 API
  | 'lotte'         // 롯데렌터카 API
  | 'sk';           // SK렌터카 API

// API 설정
export interface RentcarApiConfig {
  provider: RentcarApiProvider;
  apiUrl: string;           // API 엔드포인트 (예: https://api.업체.com/vehicles)
  apiKey: string;           // API 인증 키
  authType?: 'bearer' | 'apikey' | 'basic';  // 인증 방식
  customHeaders?: Record<string, string>;     // 추가 헤더
}

// API에서 받은 원본 차량 데이터 (업체마다 다를 수 있음)
export interface RawVehicleData {
  [key: string]: any;
}

// 표준 차량 데이터 포맷
export interface StandardVehicleData {
  vehicleCode: string;
  brand: string;
  model: string;
  year: number;
  displayName?: string;
  vehicleClass?: string;
  vehicleType?: string;
  fuelType?: string;
  transmission?: string;
  seatingCapacity?: number;
  doorCount?: number;
  largeBags?: number;
  smallBags?: number;
  dailyRate?: number;
  depositAmount?: number;
  thumbnailUrl?: string;
  images?: string[];
  features?: string[];
  ageRequirement?: number;
  licenseRequirement?: string;
  mileageLimit?: number;
  unlimitedMileage?: boolean;
  smokingAllowed?: boolean;
}

/**
 * 범용 렌트카 API 커넥터
 */
export class RentcarApiConnector {
  private config: RentcarApiConfig;

  constructor(config: RentcarApiConfig) {
    this.config = config;
  }

  /**
   * 업체 API에서 차량 목록 가져오기
   */
  async fetchVehicles(): Promise<RawVehicleData[]> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.config.customHeaders
      };

      // 인증 헤더 추가
      switch (this.config.authType || 'bearer') {
        case 'bearer':
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
          break;
        case 'apikey':
          headers['X-API-Key'] = this.config.apiKey;
          break;
        case 'basic':
          headers['Authorization'] = `Basic ${btoa(this.config.apiKey)}`;
          break;
      }

      console.log(`[API Connector] Fetching vehicles from ${this.config.apiUrl}`);

      const response = await fetch(this.config.apiUrl, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // API 응답 구조 처리
      // 대부분의 API는 { data: [...] } 또는 직접 배열 반환
      const vehicles = Array.isArray(data) ? data : (data.data || data.vehicles || []);

      console.log(`[API Connector] Fetched ${vehicles.length} vehicles`);

      return vehicles;
    } catch (error) {
      console.error('[API Connector] Error fetching vehicles:', error);
      throw new Error(
        error instanceof Error
          ? `차량 데이터 가져오기 실패: ${error.message}`
          : '차량 데이터 가져오기 실패'
      );
    }
  }

  /**
   * 원본 데이터를 표준 포맷으로 변환
   */
  normalizeVehicleData(raw: RawVehicleData): StandardVehicleData {
    switch (this.config.provider) {
      case 'standard':
        return this.normalizeStandardFormat(raw);
      case 'custom':
        return this.normalizeCustomFormat(raw);
      default:
        return this.normalizeStandardFormat(raw);
    }
  }

  /**
   * 표준 JSON 포맷 변환
   */
  private normalizeStandardFormat(raw: RawVehicleData): StandardVehicleData {
    return {
      vehicleCode: raw.vehicle_code || raw.vehicleCode || raw.id || `AUTO-${Date.now()}`,
      brand: raw.brand || raw.manufacturer || '',
      model: raw.model || raw.modelName || '',
      year: raw.year || raw.modelYear || new Date().getFullYear(),
      displayName: raw.display_name || raw.displayName || raw.name,
      vehicleClass: raw.vehicle_class || raw.vehicleClass || raw.class,
      vehicleType: raw.vehicle_type || raw.vehicleType || raw.type,
      fuelType: raw.fuel_type || raw.fuelType || raw.fuel,
      transmission: raw.transmission || raw.gearbox,
      seatingCapacity: raw.seating_capacity || raw.seatingCapacity || raw.seats,
      doorCount: raw.door_count || raw.doorCount || raw.doors,
      largeBags: raw.large_bags || raw.largeBags || raw.luggage,
      smallBags: raw.small_bags || raw.smallBags,
      dailyRate: raw.daily_rate || raw.dailyRate || raw.price || raw.pricePerDay,
      depositAmount: raw.deposit_amount || raw.depositAmount || raw.deposit,
      thumbnailUrl: raw.thumbnail_url || raw.thumbnailUrl || raw.thumbnail || raw.image,
      images: raw.images || (raw.image ? [raw.image] : []),
      features: raw.features || raw.amenities || [],
      ageRequirement: raw.age_requirement || raw.ageRequirement || raw.minAge,
      licenseRequirement: raw.license_requirement || raw.licenseRequirement,
      mileageLimit: raw.mileage_limit || raw.mileageLimit || raw.dailyMileage,
      unlimitedMileage: raw.unlimited_mileage || raw.unlimitedMileage || false,
      smokingAllowed: raw.smoking_allowed || raw.smokingAllowed || false
    };
  }

  /**
   * 커스텀 포맷 변환 (업체별 커스터마이징)
   */
  private normalizeCustomFormat(raw: RawVehicleData): StandardVehicleData {
    // 여기서 업체별 특수 포맷을 처리
    // 예: 쏘카는 "차량명"을 사용, 롯데는 "car_name" 사용 등
    return this.normalizeStandardFormat(raw);
  }

  /**
   * 표준 데이터를 RentcarVehicleFormData로 변환
   */
  convertToFormData(standard: StandardVehicleData): RentcarVehicleFormData {
    return {
      vehicle_code: standard.vehicleCode,
      brand: standard.brand,
      model: standard.model,
      year: standard.year,
      display_name: standard.displayName || `${standard.brand} ${standard.model}`,
      vehicle_class: (standard.vehicleClass as VehicleClass) || 'compact',
      vehicle_type: standard.vehicleType || '',
      fuel_type: (standard.fuelType as FuelType) || 'gasoline',
      transmission: (standard.transmission as TransmissionType) || 'automatic',
      seating_capacity: standard.seatingCapacity || 5,
      door_count: standard.doorCount || 4,
      large_bags: standard.largeBags || 2,
      small_bags: standard.smallBags || 2,
      daily_rate_krw: standard.dailyRate || 50000,
      deposit_amount_krw: standard.depositAmount || 100000,
      thumbnail_url: standard.thumbnailUrl || '',
      images: standard.images || [],
      features: standard.features || [],
      age_requirement: standard.ageRequirement || 21,
      license_requirement: standard.licenseRequirement || '1년 이상',
      mileage_limit_per_day: standard.mileageLimit || 200,
      unlimited_mileage: standard.unlimitedMileage || false,
      smoking_allowed: standard.smokingAllowed || false
    };
  }
}

/**
 * API 연동 헬퍼 함수
 */
export async function syncVehiclesFromApi(
  config: RentcarApiConfig
): Promise<{ success: boolean; vehicles: RentcarVehicleFormData[]; error?: string }> {
  try {
    const connector = new RentcarApiConnector(config);

    // 1. API에서 차량 목록 가져오기
    const rawVehicles = await connector.fetchVehicles();

    if (!rawVehicles || rawVehicles.length === 0) {
      return {
        success: false,
        vehicles: [],
        error: 'API에서 차량 데이터를 찾을 수 없습니다.'
      };
    }

    // 2. 표준 포맷으로 변환
    const vehicles = rawVehicles.map(raw => {
      const normalized = connector.normalizeVehicleData(raw);
      return connector.convertToFormData(normalized);
    });

    console.log(`✅ API 연동 성공: ${vehicles.length}개 차량 변환 완료`);

    return {
      success: true,
      vehicles
    };
  } catch (error) {
    console.error('❌ API 연동 실패:', error);
    return {
      success: false,
      vehicles: [],
      error: error instanceof Error ? error.message : 'API 연동 중 오류 발생'
    };
  }
}
