/**
 * 숙박업체(Lodgings) 관리 API
 *
 * 호텔, 펜션, 모텔 등 숙박업체 CRUD
 */

import { db } from '../../utils/database-cloud';

export interface Lodging {
  id?: number;
  vendor_id: number;
  listing_id?: number;

  // 기본 정보
  name: string;
  type: 'hotel' | 'motel' | 'pension' | 'guesthouse' | 'camping' | 'resort' | 'hostel';
  description?: string;

  // 위치
  address: string;
  city: string;
  district?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;

  // 연락처
  phone?: string;
  email?: string;
  website?: string;

  // 운영 정보
  star_rating?: number;
  checkin_time?: string;
  checkout_time?: string;

  // 이미지
  thumbnail_url?: string;
  images?: string[];

  // 편의시설
  amenities?: Record<string, boolean>;

  // 상태
  is_active?: boolean;
  is_verified?: boolean;

  created_at?: string;
  updated_at?: string;
}

export interface LodgingResponse {
  success: boolean;
  lodging?: Lodging;
  lodgings?: Lodging[];
  message?: string;
  error?: string;
}

/**
 * 숙박업체 목록 조회 (필터링)
 */
export async function getLodgings(filters: {
  vendor_id?: number;
  type?: string;
  city?: string;
  is_active?: boolean;
  is_verified?: boolean;
  limit?: number;
  offset?: number;
}): Promise<LodgingResponse> {
  try {
    const conditions: string[] = ['1=1'];
    const values: any[] = [];

    if (filters.vendor_id) {
      conditions.push('vendor_id = ?');
      values.push(filters.vendor_id);
    }

    if (filters.type) {
      conditions.push('type = ?');
      values.push(filters.type);
    }

    if (filters.city) {
      conditions.push('city = ?');
      values.push(filters.city);
    }

    if (filters.is_active !== undefined) {
      conditions.push('is_active = ?');
      values.push(filters.is_active);
    }

    if (filters.is_verified !== undefined) {
      conditions.push('is_verified = ?');
      values.push(filters.is_verified);
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    values.push(limit, offset);

    const lodgings = await db.query(`
      SELECT * FROM lodgings
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, values);

    return {
      success: true,
      lodgings: lodgings
    };

  } catch (error) {
    console.error('❌ 숙박업체 목록 조회 실패:', error);
    return {
      success: false,
      message: '숙박업체 목록 조회 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
}

/**
 * 숙박업체 단건 조회
 */
export async function getLodgingById(lodgingId: number): Promise<LodgingResponse> {
  try {
    const lodgings = await db.query(`
      SELECT * FROM lodgings WHERE id = ?
    `, [lodgingId]);

    if (lodgings.length === 0) {
      return {
        success: false,
        message: '숙박업체를 찾을 수 없습니다.'
      };
    }

    return {
      success: true,
      lodging: lodgings[0]
    };

  } catch (error) {
    console.error('❌ 숙박업체 조회 실패:', error);
    return {
      success: false,
      message: '숙박업체 조회 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
}

/**
 * 숙박업체 생성
 */
export async function createLodging(lodging: Lodging, userId: number): Promise<LodgingResponse> {
  try {
    console.log('🏨 숙박업체 생성:', lodging.name);

    // 권한 확인: vendor_id와 userId가 매칭되는지 확인
    const vendor = await db.query(`
      SELECT id FROM rentcar_vendors WHERE id = ? AND user_id = ?
    `, [lodging.vendor_id, userId]);

    if (vendor.length === 0) {
      return {
        success: false,
        message: '권한이 없습니다.'
      };
    }

    const result = await db.execute(`
      INSERT INTO lodgings (
        vendor_id, listing_id, name, type, description,
        address, city, district, postal_code,
        latitude, longitude, timezone,
        phone, email, website,
        star_rating, checkin_time, checkout_time,
        thumbnail_url, images, amenities,
        is_active, is_verified,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      lodging.vendor_id,
      lodging.listing_id || null,
      lodging.name,
      lodging.type,
      lodging.description || null,
      lodging.address,
      lodging.city,
      lodging.district || null,
      lodging.postal_code || null,
      lodging.latitude || null,
      lodging.longitude || null,
      lodging.timezone || 'Asia/Seoul',
      lodging.phone || null,
      lodging.email || null,
      lodging.website || null,
      lodging.star_rating || 0,
      lodging.checkin_time || '15:00:00',
      lodging.checkout_time || '11:00:00',
      lodging.thumbnail_url || null,
      lodging.images ? JSON.stringify(lodging.images) : null,
      lodging.amenities ? JSON.stringify(lodging.amenities) : null,
      lodging.is_active !== undefined ? lodging.is_active : true,
      lodging.is_verified !== undefined ? lodging.is_verified : false
    ]);

    const lodgingId = result.insertId;

    console.log(`✅ 숙박업체 생성 완료: ${lodging.name} (ID: ${lodgingId})`);

    // 생성된 숙박업체 조회
    const created = await getLodgingById(lodgingId);

    return {
      success: true,
      lodging: created.lodging,
      message: '숙박업체가 생성되었습니다.'
    };

  } catch (error) {
    console.error('❌ 숙박업체 생성 실패:', error);
    return {
      success: false,
      message: '숙박업체 생성 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
}

/**
 * 숙박업체 수정
 */
export async function updateLodging(
  lodgingId: number,
  userId: number,
  updateData: Partial<Lodging>
): Promise<LodgingResponse> {
  try {
    // 권한 확인: 해당 숙박업체의 vendor가 userId와 매칭되는지
    const lodging = await db.query(`
      SELECT l.vendor_id, v.user_id
      FROM lodgings l
      JOIN rentcar_vendors v ON l.vendor_id = v.id
      WHERE l.id = ?
    `, [lodgingId]);

    if (lodging.length === 0) {
      return {
        success: false,
        message: '숙박업체를 찾을 수 없습니다.'
      };
    }

    // 관리자 또는 업체 소유자만 수정 가능
    const user = await db.query(`SELECT role FROM users WHERE id = ?`, [userId]);
    const isAdmin = user.length > 0 && user[0].role === 'admin';
    const isOwner = lodging[0].user_id === userId;

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        message: '권한이 없습니다.'
      };
    }

    // 업데이트할 필드 동적 생성
    const fields: string[] = [];
    const values: any[] = [];

    if (updateData.name) {
      fields.push('name = ?');
      values.push(updateData.name);
    }
    if (updateData.type) {
      fields.push('type = ?');
      values.push(updateData.type);
    }
    if (updateData.description !== undefined) {
      fields.push('description = ?');
      values.push(updateData.description);
    }
    if (updateData.address) {
      fields.push('address = ?');
      values.push(updateData.address);
    }
    if (updateData.city) {
      fields.push('city = ?');
      values.push(updateData.city);
    }
    if (updateData.district !== undefined) {
      fields.push('district = ?');
      values.push(updateData.district);
    }
    if (updateData.postal_code !== undefined) {
      fields.push('postal_code = ?');
      values.push(updateData.postal_code);
    }
    if (updateData.latitude !== undefined) {
      fields.push('latitude = ?');
      values.push(updateData.latitude);
    }
    if (updateData.longitude !== undefined) {
      fields.push('longitude = ?');
      values.push(updateData.longitude);
    }
    if (updateData.phone !== undefined) {
      fields.push('phone = ?');
      values.push(updateData.phone);
    }
    if (updateData.email !== undefined) {
      fields.push('email = ?');
      values.push(updateData.email);
    }
    if (updateData.website !== undefined) {
      fields.push('website = ?');
      values.push(updateData.website);
    }
    if (updateData.star_rating !== undefined) {
      fields.push('star_rating = ?');
      values.push(updateData.star_rating);
    }
    if (updateData.checkin_time) {
      fields.push('checkin_time = ?');
      values.push(updateData.checkin_time);
    }
    if (updateData.checkout_time) {
      fields.push('checkout_time = ?');
      values.push(updateData.checkout_time);
    }
    if (updateData.thumbnail_url !== undefined) {
      fields.push('thumbnail_url = ?');
      values.push(updateData.thumbnail_url);
    }
    if (updateData.images !== undefined) {
      fields.push('images = ?');
      values.push(JSON.stringify(updateData.images));
    }
    if (updateData.amenities !== undefined) {
      fields.push('amenities = ?');
      values.push(JSON.stringify(updateData.amenities));
    }
    if (updateData.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updateData.is_active);
    }
    if (updateData.is_verified !== undefined) {
      fields.push('is_verified = ?');
      values.push(updateData.is_verified);
    }

    fields.push('updated_at = NOW()');

    if (fields.length === 1) {
      return {
        success: false,
        message: '업데이트할 정보가 없습니다.'
      };
    }

    values.push(lodgingId);

    await db.execute(`
      UPDATE lodgings SET ${fields.join(', ')} WHERE id = ?
    `, values);

    console.log(`✅ 숙박업체 수정 완료: ID ${lodgingId}`);

    // 수정된 숙박업체 조회
    const updated = await getLodgingById(lodgingId);

    return {
      success: true,
      lodging: updated.lodging,
      message: '숙박업체가 수정되었습니다.'
    };

  } catch (error) {
    console.error('❌ 숙박업체 수정 실패:', error);
    return {
      success: false,
      message: '숙박업체 수정 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
}

/**
 * 숙박업체 삭제
 */
export async function deleteLodging(lodgingId: number, userId: number): Promise<LodgingResponse> {
  try {
    // 권한 확인
    const lodging = await db.query(`
      SELECT l.vendor_id, v.user_id
      FROM lodgings l
      JOIN rentcar_vendors v ON l.vendor_id = v.id
      WHERE l.id = ?
    `, [lodgingId]);

    if (lodging.length === 0) {
      return {
        success: false,
        message: '숙박업체를 찾을 수 없습니다.'
      };
    }

    const user = await db.query(`SELECT role FROM users WHERE id = ?`, [userId]);
    const isAdmin = user.length > 0 && user[0].role === 'admin';
    const isOwner = lodging[0].user_id === userId;

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        message: '권한이 없습니다.'
      };
    }

    // CASCADE 설정으로 자동으로 연관 데이터(rooms, rate_plans 등) 삭제됨
    await db.execute(`DELETE FROM lodgings WHERE id = ?`, [lodgingId]);

    console.log(`✅ 숙박업체 삭제 완료: ID ${lodgingId}`);

    return {
      success: true,
      message: '숙박업체가 삭제되었습니다.'
    };

  } catch (error) {
    console.error('❌ 숙박업체 삭제 실패:', error);
    return {
      success: false,
      message: '숙박업체 삭제 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
}

/**
 * 업체별 숙박시설 통계
 */
export async function getLodgingStats(vendorId: number): Promise<{
  success: boolean;
  stats?: {
    total_lodgings: number;
    active_lodgings: number;
    total_rooms: number;
    total_bookings: number;
    pending_bookings: number;
  };
  message?: string;
}> {
  try {
    const stats = await db.query(`
      SELECT
        COUNT(DISTINCT l.id) as total_lodgings,
        COUNT(DISTINCT CASE WHEN l.is_active = 1 THEN l.id END) as active_lodgings,
        COUNT(DISTINCT r.id) as total_rooms,
        COUNT(DISTINCT lb.id) as total_bookings,
        COUNT(DISTINCT CASE WHEN lb.status = 'HOLD' THEN lb.id END) as pending_bookings
      FROM lodgings l
      LEFT JOIN rooms r ON l.id = r.lodging_id
      LEFT JOIN lodging_bookings lb ON l.id = lb.lodging_id
      WHERE l.vendor_id = ?
    `, [vendorId]);

    return {
      success: true,
      stats: stats[0]
    };

  } catch (error) {
    console.error('❌ 숙박업체 통계 조회 실패:', error);
    return {
      success: false,
      message: '통계 조회 중 오류가 발생했습니다.'
    };
  }
}
