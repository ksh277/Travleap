/**
 * Admin 페이지 - PMS 연동 숙박 상품 추가
 *
 * 기능:
 * 1. PMS API URL/인증 정보 입력
 * 2. PMS에서 호텔 정보, 객실 타입, 재고, 요금 가져오기
 * 3. 자동으로 입력 폼 생성
 * 4. 관리자가 확인/수정 후 DB 저장
 */

import { PMSConnectorFactory } from './connector';
import { PMSService } from './service';
import type { PMSVendor, RoomType, RoomInventory, RatePlan } from './types';

// Admin에서 PMS 연동 설정
export interface PMSConnectionConfig {
  vendor: PMSVendor;
  hotelId: string;
  apiKey: string;
  baseURL?: string;
}

// PMS에서 가져온 호텔 전체 정보
export interface HotelDataFromPMS {
  hotelId: string;
  hotelName: string;
  location: string;
  description: string;
  images: string[];
  roomTypes: Array<{
    roomTypeId: string;
    roomTypeName: string;
    description: string;
    maxOccupancy: number;
    bedType: string;
    amenities: string[];
    images: string[];
    // 최근 30일 평균 가격
    averagePrice: number;
    currency: string;
    // 현재 재고
    currentInventory: number;
    totalRooms: number;
  }>;
}

// Admin 폼에 표시할 데이터 (자동 생성될 입력 필드)
export interface AdminProductFormData {
  // 호텔 기본 정보
  hotelId: string;
  hotelName: string;
  category: '숙박';
  location: string;
  description: string;
  images: string[];

  // 객실별 정보 (동적으로 생성됨)
  rooms: Array<{
    roomTypeId: string;
    roomName: string;
    price: number;
    currency: string;
    maxOccupancy: number;
    bedType: string;
    amenities: string[];
    images: string[];
    availableQuantity: number; // 실시간 재고
    totalQuantity: number;
  }>;

  // PMS 연동 정보 (백엔드에서만 사용)
  pmsVendor: PMSVendor;
  pmsHotelId: string;
}

/**
 * PMS에서 호텔 데이터 가져오기
 */
export async function fetchHotelDataFromPMS(
  config: PMSConnectionConfig
): Promise<{ success: boolean; data?: HotelDataFromPMS; error?: string }> {
  try {
    // 1. PMS 커넥터 생성 (임시로 API 키 설정)
    process.env[`PMS_${config.hotelId}_API_KEY`] = config.apiKey;

    const connector = PMSConnectorFactory.getConnector(
      config.vendor,
      config.hotelId
    );

    // 2. 객실 타입 조회
    console.log('[1/3] PMS에서 객실 타입 조회 중...');
    const roomTypes = await connector.getRoomTypes(config.hotelId);

    if (!roomTypes || roomTypes.length === 0) {
      return {
        success: false,
        error: 'PMS에서 객실 정보를 찾을 수 없습니다.',
      };
    }

    // 3. 최근 30일 재고/요금 조회
    console.log('[2/3] PMS에서 재고 및 요금 조회 중...');
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30);

    const startDate = today.toISOString().split('T')[0];
    const endDate = futureDate.toISOString().split('T')[0];

    const pmsService = new PMSService();

    const roomTypesWithData = await Promise.all(
      roomTypes.map(async (roomType) => {
        try {
          // 재고 조회
          const inventories = await pmsService.getInventory(
            config.vendor,
            config.hotelId,
            roomType.id,
            startDate,
            endDate
          );

          // 요금 조회
          const rates = await pmsService.getRates(
            config.vendor,
            config.hotelId,
            roomType.id,
            startDate,
            endDate
          );

          // 평균 가격 계산
          const averagePrice =
            rates.length > 0
              ? rates.reduce((sum, r) => sum + r.price, 0) / rates.length
              : 0;

          // 현재 재고 (오늘 날짜)
          const todayInventory = inventories.find(
            (inv) => inv.date === startDate
          );

          return {
            roomTypeId: roomType.id,
            roomTypeName: roomType.name,
            description: roomType.description,
            maxOccupancy: roomType.maxOccupancy,
            bedType: roomType.bedType,
            amenities: roomType.amenities,
            images: roomType.images,
            averagePrice: Math.round(averagePrice),
            currency: rates[0]?.currency || 'KRW',
            currentInventory: todayInventory?.available || 0,
            totalRooms: todayInventory?.total || 0,
          };
        } catch (error) {
          console.error(
            `객실 타입 ${roomType.id} 데이터 조회 실패:`,
            error
          );
          // 에러가 발생해도 기본 정보는 반환
          return {
            roomTypeId: roomType.id,
            roomTypeName: roomType.name,
            description: roomType.description,
            maxOccupancy: roomType.maxOccupancy,
            bedType: roomType.bedType,
            amenities: roomType.amenities,
            images: roomType.images,
            averagePrice: 0,
            currency: 'KRW',
            currentInventory: 0,
            totalRooms: 0,
          };
        }
      })
    );

    // 4. 호텔 기본 정보 (첫 번째 객실 타입에서 추출 또는 별도 API 호출)
    console.log('[3/3] 호텔 정보 구성 중...');
    const hotelData: HotelDataFromPMS = {
      hotelId: config.hotelId,
      hotelName: `호텔 ${config.hotelId}`, // 실제로는 PMS에서 가져와야 함
      location: '위치 정보', // 실제로는 PMS에서 가져와야 함
      description: '호텔 설명', // 실제로는 PMS에서 가져와야 함
      images: roomTypes[0]?.images || [],
      roomTypes: roomTypesWithData,
    };

    return {
      success: true,
      data: hotelData,
    };
  } catch (error) {
    console.error('fetchHotelDataFromPMS 에러:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PMS 연동 실패',
    };
  }
}

/**
 * PMS 데이터를 Admin 폼 데이터로 변환
 */
export function convertPMSDataToFormData(
  pmsData: HotelDataFromPMS,
  vendor: PMSVendor
): AdminProductFormData {
  return {
    hotelId: pmsData.hotelId,
    hotelName: pmsData.hotelName,
    category: '숙박',
    location: pmsData.location,
    description: pmsData.description,
    images: pmsData.images,
    rooms: pmsData.roomTypes.map((rt) => ({
      roomTypeId: rt.roomTypeId,
      roomName: rt.roomTypeName,
      price: rt.averagePrice,
      currency: rt.currency,
      maxOccupancy: rt.maxOccupancy,
      bedType: rt.bedType,
      amenities: rt.amenities,
      images: rt.images,
      availableQuantity: rt.currentInventory,
      totalQuantity: rt.totalRooms,
    })),
    pmsVendor: vendor,
    pmsHotelId: pmsData.hotelId,
  };
}

/**
 * Admin 폼 데이터를 DB에 저장
 */
export async function saveProductToDB(
  formData: AdminProductFormData
): Promise<{ success: boolean; productId?: string; error?: string }> {
  try {
    // import { db } from '../database';
    const { db } = await import('../database');

    console.log('DB에 상품 저장 중...', formData);

    // === 1. Listing (숙소) 정보 저장 ===
    const categoryResult = await db.findOne('categories', { slug: 'accommodation' });
    const categoryId = categoryResult?.id || 2; // accommodation 카테고리 ID

    const listingData = {
      category_id: categoryId,
      title: formData.hotelName,
      location: formData.location,
      description_md: formData.description,
      short_description: formData.description.substring(0, 200),
      images: JSON.stringify(formData.images),
      currency: formData.rooms[0]?.currency || 'KRW',
      price_from: Math.min(...formData.rooms.map((r) => r.price)),
      price_to: Math.max(...formData.rooms.map((r) => r.price)),
      min_capacity: 1,
      max_capacity: Math.max(...formData.rooms.map((r) => r.maxOccupancy)),
      rating_avg: 0,
      rating_count: 0,
      view_count: 0,
      booking_count: 0,
      is_published: false, // 관리자가 검토 후 활성화
      is_active: true,
      featured_score: 0,
      partner_boost: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const listing = await db.insert('listings', listingData);
    const listingId = listing.id;

    // === 2. PMS 설정 저장 ===
    const pmsConfigData = {
      listing_id: listingId,
      vendor: formData.pmsVendor,
      hotel_id: formData.pmsHotelId,
      api_key_encrypted: '', // TODO: 암호화 필요
      webhook_enabled: false,
      polling_enabled: true,
      polling_interval_seconds: 300, // 5분
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.insert('pms_configs', pmsConfigData);

    // === 3. 객실 타입별 저장 ===
    for (const room of formData.rooms) {
      // 3-1. room_types 테이블에 객실 타입 저장
      const roomTypeData = {
        listing_id: listingId,
        pms_vendor: formData.pmsVendor,
        pms_hotel_id: formData.pmsHotelId,
        pms_room_type_id: room.roomTypeId,
        room_type_name: room.roomName,
        description: `${room.bedType} 침대, 최대 ${room.maxOccupancy}명`,
        max_occupancy: room.maxOccupancy,
        bed_type: room.bedType,
        amenities: JSON.stringify(room.amenities),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const roomType = await db.insert('room_types', roomTypeData);
      const roomTypeId = roomType.id;

      // 3-2. room_media 테이블에 이미지 저장
      for (let i = 0; i < room.images.length; i++) {
        const mediaData = {
          room_type_id: roomTypeId,
          media_type: 'image',
          media_url: room.images[i],
          display_order: i,
          is_primary: i === 0,
          created_at: new Date().toISOString(),
        };

        await db.insert('room_media', mediaData);
      }

      // 3-3. rate_plans 테이블에 요금 플랜 저장
      const ratePlanData = {
        room_type_id: roomTypeId,
        pms_rate_plan_id: `rate_${room.roomTypeId}`,
        rate_plan_name: 'Standard Rate',
        base_price: room.price,
        currency: room.currency,
        is_refundable: true,
        breakfast_included: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.insert('rate_plans', ratePlanData);

      // 3-4. room_inventory 테이블에 향후 30일 재고 저장
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const inventoryData = {
          room_type_id: roomTypeId,
          date: dateStr,
          available: room.availableQuantity,
          total: room.totalQuantity,
          updated_at: new Date().toISOString(),
        };

        await db.insert('room_inventory', inventoryData);
      }
    }

    console.log(`✅ DB 저장 완료: Listing ID = ${listingId}`);

    return {
      success: true,
      productId: String(listingId),
    };
  } catch (error) {
    console.error('saveProductToDB 에러:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'DB 저장 실패',
    };
  }
}

/**
 * 사용 예시:
 *
 * // 1. Admin에서 PMS 연동 설정 입력
 * const config: PMSConnectionConfig = {
 *   vendor: 'cloudbeds',
 *   hotelId: 'hotel_123',
 *   apiKey: 'your_api_key_here',
 * };
 *
 * // 2. PMS에서 데이터 가져오기
 * const result = await fetchHotelDataFromPMS(config);
 *
 * if (result.success && result.data) {
 *   // 3. 폼 데이터로 변환
 *   const formData = convertPMSDataToFormData(result.data, config.vendor);
 *
 *   // 4. React 폼에 자동으로 채우기
 *   // setFormData(formData);
 *
 *   // 5. 관리자가 확인/수정 후 저장
 *   // const saveResult = await saveProductToDB(formData);
 * }
 */
