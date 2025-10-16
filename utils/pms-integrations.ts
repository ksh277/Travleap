/**
 * PMS (Property Management System) 통합 서비스
 *
 * 지원 시스템:
 * - eZee Absolute
 * - Cloudbeds
 * - Oracle Opera (준비 중)
 * - Mews Systems (준비 중)
 */

import axios, { AxiosInstance } from 'axios';
import { db } from './database.js';

// ============================================
// 타입 정의
// ============================================

export interface PMSConfig {
  provider: string;
  api_key: string;
  api_secret?: string;
  property_id: string;
  base_url?: string;
}

export interface PMSRoom {
  room_code: string;
  room_name: string;
  room_type: string;
  base_price: number;
  max_occupancy: number;
  bed_type?: string;
  room_size_sqm?: number;
  amenities?: string[];
  images?: string[];
  is_available: boolean;
}

export interface PMSProperty {
  property_id: string;
  property_name: string;
  type: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  checkin_time?: string;
  checkout_time?: string;
  rooms: PMSRoom[];
}

export interface PMSVehicle {
  vehicle_code: string;
  brand: string;
  model: string;
  year: number;
  display_name: string;
  vehicle_class: string;
  fuel_type: string;
  transmission: string;
  seating_capacity: number;
  daily_rate: number;
  images?: string[];
  features?: string[];
}

export interface PMSSyncResult {
  success: boolean;
  provider: string;
  properties_synced?: number;
  rooms_synced?: number;
  vehicles_synced?: number;
  errors?: string[];
  message?: string;
}

// ============================================
// 1. eZee Absolute Integration
// ============================================

class EzeeIntegration {
  private apiKey: string;
  private hotelCode: string;
  private baseUrl: string;
  private client: AxiosInstance;

  constructor(config: PMSConfig) {
    this.apiKey = config.api_key;
    this.hotelCode = config.property_id;
    this.baseUrl = config.base_url || 'https://live.ipms247.com/pmsinterface';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * eZee API 요청
   */
  private async request(endpoint: string, data: any): Promise<any> {
    try {
      const response = await this.client.post(endpoint, {
        ...data,
        HotelCode: this.hotelCode,
        AuthCode: this.apiKey
      });

      if (response.data.Success === false) {
        throw new Error(response.data.ErrorMessage || 'eZee API 오류');
      }

      return response.data;
    } catch (error: any) {
      console.error('eZee API 요청 실패:', error.message);
      throw error;
    }
  }

  /**
   * 객실 타입 목록 조회
   */
  async fetchRoomTypes(): Promise<PMSRoom[]> {
    const data = await this.request('/list_room_type', {
      RequestType: 'RoomType'
    });

    const rooms: PMSRoom[] = [];

    if (data.RoomTypes && Array.isArray(data.RoomTypes)) {
      for (const rt of data.RoomTypes) {
        rooms.push({
          room_code: rt.RoomTypeCode || rt.RoomID,
          room_name: rt.RoomTypeName || rt.RoomName,
          room_type: this.mapRoomType(rt.RoomCategory),
          base_price: parseFloat(rt.BaseRate || rt.Price || 50000),
          max_occupancy: parseInt(rt.MaxOccupancy || rt.Adults || 2),
          bed_type: rt.BedType || '더블',
          room_size_sqm: parseFloat(rt.RoomSize || 25),
          amenities: rt.Amenities ? rt.Amenities.split(',').map((a: string) => a.trim()) : [],
          images: rt.Images || [],
          is_available: rt.IsActive !== false
        });
      }
    }

    return rooms;
  }

  /**
   * 속성(호텔) 정보 조회
   */
  async fetchPropertyInfo(): Promise<PMSProperty> {
    const data = await this.request('/hotel_info', {
      RequestType: 'HotelInfo'
    });

    const rooms = await this.fetchRoomTypes();

    return {
      property_id: this.hotelCode,
      property_name: data.HotelName || '호텔',
      type: 'hotel',
      address: data.Address || '',
      city: data.City || '신안군',
      phone: data.Phone || '',
      email: data.Email || '',
      checkin_time: data.CheckInTime || '15:00',
      checkout_time: data.CheckOutTime || '11:00',
      rooms: rooms
    };
  }

  /**
   * 객실 타입 매핑
   */
  private mapRoomType(category?: string): string {
    if (!category) return 'standard';

    const lower = category.toLowerCase();
    if (lower.includes('suite')) return 'suite';
    if (lower.includes('deluxe')) return 'deluxe';
    if (lower.includes('family')) return 'family';
    if (lower.includes('dorm')) return 'dormitory';
    return 'standard';
  }
}

// ============================================
// 2. Cloudbeds Integration
// ============================================

class CloudbedsIntegration {
  private apiKey: string;
  private propertyId: string;
  private baseUrl: string;
  private client: AxiosInstance;

  constructor(config: PMSConfig) {
    this.apiKey = config.api_key;
    this.propertyId = config.property_id;
    this.baseUrl = config.base_url || 'https://api.cloudbeds.com/api/v1.1';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Cloudbeds API 요청
   */
  private async request(endpoint: string, params?: any): Promise<any> {
    try {
      const response = await this.client.get(endpoint, { params });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Cloudbeds API 오류');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Cloudbeds API 요청 실패:', error.message);
      throw error;
    }
  }

  /**
   * 객실 타입 목록 조회
   */
  async fetchRoomTypes(): Promise<PMSRoom[]> {
    const data = await this.request(`/getRoomTypes`, {
      propertyID: this.propertyId
    });

    const rooms: PMSRoom[] = [];

    if (data && Array.isArray(data)) {
      for (const rt of data) {
        rooms.push({
          room_code: rt.roomTypeID || rt.roomCode,
          room_name: rt.roomTypeName || rt.name,
          room_type: this.mapRoomType(rt.roomTypeCategory),
          base_price: parseFloat(rt.defaultDailyRate || rt.baseRate || 50000),
          max_occupancy: parseInt(rt.maxGuests || rt.maxOccupancy || 2),
          bed_type: rt.bedConfiguration || '더블',
          room_size_sqm: parseFloat(rt.roomSize || 25),
          amenities: rt.amenities || [],
          images: rt.roomImages || [],
          is_available: rt.roomStatus === 'active'
        });
      }
    }

    return rooms;
  }

  /**
   * 속성(호텔) 정보 조회
   */
  async fetchPropertyInfo(): Promise<PMSProperty> {
    const data = await this.request(`/getHotelDetails`, {
      propertyID: this.propertyId
    });

    const rooms = await this.fetchRoomTypes();

    return {
      property_id: this.propertyId,
      property_name: data.propertyName || data.hotelName || '호텔',
      type: 'hotel',
      address: data.propertyAddress || '',
      city: data.propertyCity || '신안군',
      phone: data.propertyPhone || '',
      email: data.propertyEmail || '',
      checkin_time: data.checkInTime || '15:00',
      checkout_time: data.checkOutTime || '11:00',
      rooms: rooms
    };
  }

  /**
   * 객실 타입 매핑
   */
  private mapRoomType(category?: string): string {
    if (!category) return 'standard';

    const lower = category.toLowerCase();
    if (lower.includes('suite')) return 'suite';
    if (lower.includes('deluxe')) return 'deluxe';
    if (lower.includes('family')) return 'family';
    if (lower.includes('dorm')) return 'dormitory';
    return 'standard';
  }
}

// ============================================
// 3. Oracle Opera Integration (준비 중)
// ============================================

class OperaIntegration {
  constructor(config: PMSConfig) {
    // TODO: Oracle OHIP (Opera Hospitality Integration Platform) 연동
    throw new Error('Oracle Opera 연동은 준비 중입니다. 현재는 eZee 또는 Cloudbeds를 이용해주세요.');
  }

  async fetchPropertyInfo(): Promise<PMSProperty> {
    throw new Error('Not implemented');
  }
}

// ============================================
// 4. PMS 통합 관리자
// ============================================

export class PMSIntegrationManager {
  private config: PMSConfig;
  private integration: EzeeIntegration | CloudbedsIntegration | OperaIntegration;

  constructor(config: PMSConfig) {
    this.config = config;

    switch (config.provider.toLowerCase()) {
      case 'ezee':
        this.integration = new EzeeIntegration(config);
        break;
      case 'cloudbeds':
        this.integration = new CloudbedsIntegration(config);
        break;
      case 'opera':
        this.integration = new OperaIntegration(config);
        break;
      default:
        throw new Error(`지원하지 않는 PMS 제공자입니다: ${config.provider}`);
    }
  }

  /**
   * 숙박 데이터 동기화 (lodgings + rooms)
   */
  async syncLodgingData(vendorId: number): Promise<PMSSyncResult> {
    try {
      console.log(`🔄 PMS 동기화 시작 (Provider: ${this.config.provider}, Vendor: ${vendorId})`);

      // 1. PMS에서 속성 정보 가져오기
      const property = await this.integration.fetchPropertyInfo();

      console.log(`📦 PMS 데이터 수신: ${property.property_name}, 객실 ${property.rooms.length}개`);

      // 2. lodgings 테이블에 저장 또는 업데이트
      const existingLodging = await db.query(`
        SELECT id FROM lodgings WHERE vendor_id = ? AND name = ? LIMIT 1
      `, [vendorId, property.property_name]);

      let lodgingId: number;

      if (existingLodging.length > 0) {
        // 기존 숙소 업데이트
        lodgingId = existingLodging[0].id;
        await db.execute(`
          UPDATE lodgings SET
            type = ?, city = ?, address = ?, phone = ?, email = ?,
            checkin_time = ?, checkout_time = ?, updated_at = NOW()
          WHERE id = ?
        `, [
          property.type, property.city, property.address,
          property.phone, property.email,
          property.checkin_time, property.checkout_time,
          lodgingId
        ]);
        console.log(`✅ 기존 숙소 업데이트: ${lodgingId}`);
      } else {
        // 새 숙소 생성
        const result = await db.execute(`
          INSERT INTO lodgings (
            vendor_id, name, type, city, address, phone, email,
            checkin_time, checkout_time, is_active, timezone, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Asia/Seoul', NOW(), NOW())
        `, [
          vendorId, property.property_name, property.type, property.city,
          property.address, property.phone, property.email,
          property.checkin_time, property.checkout_time
        ]);
        lodgingId = result.insertId!;
        console.log(`✅ 새 숙소 생성: ${lodgingId}`);
      }

      // 3. 객실 동기화
      let roomsSynced = 0;
      for (const room of property.rooms) {
        try {
          // 기존 객실 확인 (room_code로)
          const existingRoom = await db.query(`
            SELECT id FROM rooms WHERE lodging_id = ? AND room_code = ? LIMIT 1
          `, [lodgingId, room.room_code]);

          if (existingRoom.length > 0) {
            // 기존 객실 업데이트
            await db.execute(`
              UPDATE rooms SET
                name = ?, room_type = ?, base_price = ?, max_occupancy = ?,
                bed_type = ?, room_size_sqm = ?, amenities = ?, images = ?,
                is_available = ?, updated_at = NOW()
              WHERE id = ?
            `, [
              room.room_name, room.room_type, room.base_price, room.max_occupancy,
              room.bed_type, room.room_size_sqm,
              room.amenities ? room.amenities.join('|') : '',
              room.images ? room.images.join('|') : '',
              room.is_available,
              existingRoom[0].id
            ]);
          } else {
            // 새 객실 생성
            await db.execute(`
              INSERT INTO rooms (
                lodging_id, room_code, name, room_type, base_price, max_occupancy,
                bed_type, room_size_sqm, amenities, images,
                is_available, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
              lodgingId, room.room_code, room.room_name, room.room_type,
              room.base_price, room.max_occupancy, room.bed_type, room.room_size_sqm,
              room.amenities ? room.amenities.join('|') : '',
              room.images ? room.images.join('|') : '',
              room.is_available
            ]);
          }
          roomsSynced++;
        } catch (error) {
          console.error(`⚠️ 객실 동기화 실패: ${room.room_name}`, error);
        }
      }

      console.log(`✅ PMS 동기화 완료: 숙소 1개, 객실 ${roomsSynced}개`);

      return {
        success: true,
        provider: this.config.provider,
        properties_synced: 1,
        rooms_synced: roomsSynced,
        message: `PMS 동기화 완료: ${property.property_name} (객실 ${roomsSynced}개)`
      };

    } catch (error: any) {
      console.error('❌ PMS 동기화 실패:', error);
      return {
        success: false,
        provider: this.config.provider,
        errors: [error.message],
        message: 'PMS 동기화에 실패했습니다.'
      };
    }
  }
}

// ============================================
// Export
// ============================================

export default PMSIntegrationManager;
