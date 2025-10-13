/**
 * 숙박(Lodging) 통합 API
 *
 * Vercel Serverless Function 개수 제한을 해결하기 위해
 * 5개의 lodging API를 하나로 통합
 *
 * - lodgings (숙박업체 관리)
 * - rooms (객실 관리)
 * - rate-plans (요금제 관리)
 * - availability (재고 관리)
 * - bookings (예약 관리)
 */

import { db } from '../utils/database-cloud';
import { lockManager } from '../utils/lock-manager';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface Lodging {
  id?: number;
  vendor_id: number;
  listing_id?: number;
  name: string;
  type: 'hotel' | 'motel' | 'pension' | 'guesthouse' | 'camping' | 'resort' | 'hostel';
  description?: string;
  address: string;
  city: string;
  district?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  phone?: string;
  email?: string;
  website?: string;
  star_rating?: number;
  checkin_time?: string;
  checkout_time?: string;
  thumbnail_url?: string;
  images?: string[];
  amenities?: Record<string, boolean>;
  is_active?: boolean;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Room {
  id?: number;
  lodging_id: number;
  name: string;
  type: 'single' | 'double' | 'twin' | 'suite' | 'family' | 'dormitory' | 'camping_site';
  description?: string;
  capacity: number;
  max_capacity: number;
  bed_type?: string;
  bed_count?: number;
  size_sqm?: number;
  floor?: number;
  thumbnail_url?: string;
  images?: string[];
  amenities?: Record<string, boolean>;
  total_rooms: number;
  is_active?: boolean;
  display_order?: number;
}

export interface RatePlan {
  id?: number;
  room_id: number;
  name: string;
  description?: string;
  currency?: string;
  base_price_per_night: number;
  weekend_markup_pct?: number;
  peak_season_markup_pct?: number;
  long_stay_discount_pct?: number;
  extra_person_fee?: number;
  breakfast_included?: boolean;
  breakfast_price?: number;
  tax_rules?: Record<string, number>;
  min_stay_nights?: number;
  max_stay_nights?: number;
  cancel_policy_code?: string;
  is_active?: boolean;
  valid_from?: string;
  valid_until?: string;
}

export interface LodgingBooking {
  id?: number;
  room_id: number;
  lodging_id: number;
  user_id?: number;
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  guest_count: number;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  room_price: number;
  extra_person_fee?: number;
  breakfast_fee?: number;
  tax_amount?: number;
  service_charge?: number;
  total_price: number;
  status?: 'HOLD' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'NO_SHOW';
  payment_status?: 'pending' | 'authorized' | 'captured' | 'refunded';
  payment_method?: string;
  payment_key?: string;
  special_requests?: string;
}

// ============================================================
// 1. LODGINGS (숙박업체 관리)
// ============================================================

export async function getLodgings(filters: {
  vendor_id?: number;
  type?: string;
  city?: string;
  is_active?: boolean;
  is_verified?: boolean;
  limit?: number;
  offset?: number;
}) {
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

    return { success: true, lodgings };
  } catch (error) {
    console.error('❌ 숙박업체 목록 조회 실패:', error);
    return { success: false, message: '숙박업체 목록 조회 실패' };
  }
}

export async function getLodgingById(lodgingId: number) {
  try {
    const lodgings = await db.query(`SELECT * FROM lodgings WHERE id = ?`, [lodgingId]);
    if (lodgings.length === 0) {
      return { success: false, message: '숙박업체를 찾을 수 없습니다.' };
    }
    return { success: true, lodging: lodgings[0] };
  } catch (error) {
    console.error('❌ 숙박업체 조회 실패:', error);
    return { success: false, message: '숙박업체 조회 실패' };
  }
}

export async function createLodging(lodging: Lodging, userId: number) {
  try {
    const vendor = await db.query(`SELECT id FROM rentcar_vendors WHERE id = ? AND user_id = ?`, [lodging.vendor_id, userId]);
    if (vendor.length === 0) {
      return { success: false, message: '권한이 없습니다.' };
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
      lodging.vendor_id, lodging.listing_id || null, lodging.name, lodging.type,
      lodging.description || null, lodging.address, lodging.city,
      lodging.district || null, lodging.postal_code || null,
      lodging.latitude || null, lodging.longitude || null,
      lodging.timezone || 'Asia/Seoul',
      lodging.phone || null, lodging.email || null, lodging.website || null,
      lodging.star_rating || 0, lodging.checkin_time || '15:00:00',
      lodging.checkout_time || '11:00:00',
      lodging.thumbnail_url || null,
      lodging.images ? JSON.stringify(lodging.images) : null,
      lodging.amenities ? JSON.stringify(lodging.amenities) : null,
      lodging.is_active !== false, lodging.is_verified !== false
    ]);

    console.log(`✅ 숙박업체 생성 완료: ${lodging.name} (ID: ${result.insertId})`);
    return { success: true, lodgingId: result.insertId, message: '숙박업체가 생성되었습니다.' };
  } catch (error) {
    console.error('❌ 숙박업체 생성 실패:', error);
    return { success: false, message: '숙박업체 생성 실패' };
  }
}

// ============================================================
// 2. ROOMS (객실 관리)
// ============================================================

export async function getRooms(lodgingId: number) {
  try {
    const rooms = await db.query(`
      SELECT * FROM rooms WHERE lodging_id = ? ORDER BY display_order, id
    `, [lodgingId]);
    return { success: true, rooms };
  } catch (error) {
    console.error('❌ 객실 목록 조회 실패:', error);
    return { success: false, message: '객실 목록 조회 실패' };
  }
}

export async function createRoom(room: Room, userId: number) {
  try {
    const lodging = await db.query(`
      SELECT l.vendor_id, v.user_id
      FROM lodgings l
      JOIN rentcar_vendors v ON l.vendor_id = v.id
      WHERE l.id = ?
    `, [room.lodging_id]);

    if (lodging.length === 0 || lodging[0].user_id !== userId) {
      return { success: false, message: '권한이 없습니다.' };
    }

    const result = await db.execute(`
      INSERT INTO rooms (
        lodging_id, name, type, description,
        capacity, max_capacity, bed_type, bed_count,
        size_sqm, floor, thumbnail_url, images, amenities,
        total_rooms, is_active, display_order,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      room.lodging_id, room.name, room.type, room.description || null,
      room.capacity, room.max_capacity,
      room.bed_type || 'double', room.bed_count || 1,
      room.size_sqm || null, room.floor || null,
      room.thumbnail_url || null,
      room.images ? JSON.stringify(room.images) : null,
      room.amenities ? JSON.stringify(room.amenities) : null,
      room.total_rooms, room.is_active !== false,
      room.display_order || 0
    ]);

    console.log(`✅ 객실 생성 완료: ${room.name} (ID: ${result.insertId})`);
    return { success: true, roomId: result.insertId, message: '객실이 생성되었습니다.' };
  } catch (error) {
    console.error('❌ 객실 생성 실패:', error);
    return { success: false, message: '객실 생성 실패' };
  }
}

// ============================================================
// 3. RATE PLANS (요금제 관리)
// ============================================================

export async function getRatePlans(roomId: number) {
  try {
    const plans = await db.query(`
      SELECT * FROM rate_plans WHERE room_id = ? AND is_active = 1
      ORDER BY base_price_per_night
    `, [roomId]);
    return { success: true, ratePlans: plans };
  } catch (error) {
    console.error('❌ 요금제 목록 조회 실패:', error);
    return { success: false, message: '요금제 목록 조회 실패' };
  }
}

export async function createRatePlan(plan: RatePlan, userId: number) {
  try {
    const room = await db.query(`
      SELECT r.id, l.vendor_id, v.user_id
      FROM rooms r
      JOIN lodgings l ON r.lodging_id = l.id
      JOIN rentcar_vendors v ON l.vendor_id = v.id
      WHERE r.id = ?
    `, [plan.room_id]);

    if (room.length === 0 || room[0].user_id !== userId) {
      return { success: false, message: '권한이 없습니다.' };
    }

    const result = await db.execute(`
      INSERT INTO rate_plans (
        room_id, name, description, currency, base_price_per_night,
        weekend_markup_pct, peak_season_markup_pct, long_stay_discount_pct,
        extra_person_fee, breakfast_included, breakfast_price,
        tax_rules, min_stay_nights, max_stay_nights, cancel_policy_code,
        is_active, valid_from, valid_until,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      plan.room_id, plan.name, plan.description || null,
      plan.currency || 'KRW', plan.base_price_per_night,
      plan.weekend_markup_pct || 0, plan.peak_season_markup_pct || 0,
      plan.long_stay_discount_pct || 0, plan.extra_person_fee || 0,
      plan.breakfast_included || false, plan.breakfast_price || 0,
      plan.tax_rules ? JSON.stringify(plan.tax_rules) : null,
      plan.min_stay_nights || 1, plan.max_stay_nights || 365,
      plan.cancel_policy_code || 'moderate',
      plan.is_active !== false, plan.valid_from || null, plan.valid_until || null
    ]);

    console.log(`✅ 요금제 생성 완료: ${plan.name} (ID: ${result.insertId})`);
    return { success: true, ratePlanId: result.insertId, message: '요금제가 생성되었습니다.' };
  } catch (error) {
    console.error('❌ 요금제 생성 실패:', error);
    return { success: false, message: '요금제 생성 실패' };
  }
}

// ============================================================
// 4. AVAILABILITY (재고 관리)
// ============================================================

export async function getAvailability(roomId: number, startDate: string, endDate: string) {
  try {
    const availability = await db.query(`
      SELECT * FROM availability_daily
      WHERE room_id = ? AND date >= ? AND date <= ?
      ORDER BY date
    `, [roomId, startDate, endDate]);
    return { success: true, availability };
  } catch (error) {
    console.error('❌ 재고 조회 실패:', error);
    return { success: false, message: '재고 조회 실패' };
  }
}

export async function updateAvailability(
  roomId: number,
  date: string,
  availableRooms: number,
  pricePerNight?: number
) {
  try {
    await db.execute(`
      INSERT INTO availability_daily (
        room_id, date, available_rooms, sold_rooms, blocked_rooms, price_per_night, created_at, updated_at
      ) VALUES (?, ?, ?, 0, 0, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        available_rooms = ?, price_per_night = ?, updated_at = NOW()
    `, [roomId, date, availableRooms, pricePerNight || null, availableRooms, pricePerNight || null]);

    console.log(`✅ 재고 업데이트 완료: Room ${roomId}, ${date}`);
    return { success: true, message: '재고가 업데이트되었습니다.' };
  } catch (error) {
    console.error('❌ 재고 업데이트 실패:', error);
    return { success: false, message: '재고 업데이트 실패' };
  }
}

// ============================================================
// 5. BOOKINGS (예약 관리 - Lock Manager 사용)
// ============================================================

export async function getBookings(filters: {
  lodging_id?: number;
  vendor_id?: number;
  user_id?: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const conditions: string[] = ['1=1'];
    const values: any[] = [];

    if (filters.lodging_id) {
      conditions.push('lb.lodging_id = ?');
      values.push(filters.lodging_id);
    }
    if (filters.vendor_id) {
      conditions.push('l.vendor_id = ?');
      values.push(filters.vendor_id);
    }
    if (filters.user_id) {
      conditions.push('lb.user_id = ?');
      values.push(filters.user_id);
    }
    if (filters.status) {
      conditions.push('lb.status = ?');
      values.push(filters.status);
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    values.push(limit, offset);

    const bookings = await db.query(`
      SELECT lb.*, l.name as lodging_name, r.name as room_name
      FROM lodging_bookings lb
      JOIN lodgings l ON lb.lodging_id = l.id
      JOIN rooms r ON lb.room_id = r.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY lb.created_at DESC
      LIMIT ? OFFSET ?
    `, values);

    return { success: true, bookings };
  } catch (error) {
    console.error('❌ 예약 목록 조회 실패:', error);
    return { success: false, message: '예약 목록 조회 실패' };
  }
}

/**
 * 예약 생성 (Lock Manager로 보호)
 */
export async function createBooking(booking: LodgingBooking) {
  const lockKey = `booking:${booking.room_id}:${booking.checkin_date}`;
  const lockOwner = `user_${booking.user_id || 'guest'}`;

  console.log(`🔒 예약 시도: ${lockKey} (${booking.guest_name})`);

  const lockAcquired = await lockManager.acquire(lockKey, 600, lockOwner);

  if (!lockAcquired) {
    console.log(`⏳ 예약 대기 중: ${lockKey}`);
    return {
      success: false,
      message: '다른 사용자가 이 객실을 예약 진행 중입니다. 잠시 후 다시 시도해주세요.',
      code: 'LOCK_FAILED'
    };
  }

  try {
    // 재고 확인
    const availability = await db.query(`
      SELECT date, available_rooms, sold_rooms, blocked_rooms
      FROM availability_daily
      WHERE room_id = ? AND date >= ? AND date < ?
      ORDER BY date
    `, [booking.room_id, booking.checkin_date, booking.checkout_date]);

    if (availability.length === 0) {
      return { success: false, message: '해당 날짜에 재고 정보가 없습니다.', code: 'NO_AVAILABILITY_DATA' };
    }

    const unavailableDates: string[] = [];
    for (const day of availability) {
      const availableCount = day.available_rooms - day.sold_rooms - day.blocked_rooms;
      if (availableCount <= 0) {
        unavailableDates.push(day.date);
      }
    }

    if (unavailableDates.length > 0) {
      return {
        success: false,
        message: `선택하신 기간 중 예약 가능한 객실이 없습니다. (${unavailableDates.length}일 품절)`,
        code: 'NO_AVAILABILITY',
        unavailableDates
      };
    }

    // HOLD 상태로 예약 생성
    const result = await db.execute(`
      INSERT INTO lodging_bookings (
        room_id, lodging_id, user_id,
        guest_name, guest_phone, guest_email, guest_count,
        checkin_date, checkout_date, nights,
        room_price, extra_person_fee, breakfast_fee,
        tax_amount, service_charge, total_price,
        status, payment_status, payment_method, payment_key,
        special_requests, hold_expires_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW(), NOW())
    `, [
      booking.room_id, booking.lodging_id, booking.user_id || null,
      booking.guest_name, booking.guest_phone, booking.guest_email || null,
      booking.guest_count, booking.checkin_date, booking.checkout_date,
      booking.nights, booking.room_price, booking.extra_person_fee || 0,
      booking.breakfast_fee || 0, booking.tax_amount || 0,
      booking.service_charge || 0, booking.total_price,
      'HOLD', 'pending',
      booking.payment_method || null, booking.payment_key || null,
      booking.special_requests || null
    ]);

    const bookingId = result.insertId;

    // 재고 차감
    for (const day of availability) {
      await db.execute(`
        UPDATE availability_daily
        SET sold_rooms = sold_rooms + 1, updated_at = NOW()
        WHERE room_id = ? AND date = ?
      `, [booking.room_id, day.date]);
    }

    console.log(`🎉 예약 생성 완료: ID ${bookingId}`);

    return {
      success: true,
      bookingId,
      message: '예약이 생성되었습니다. 10분 이내에 결제를 완료해주세요.',
      holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    };

  } catch (error) {
    console.error(`❌ 예약 생성 실패 (${lockKey}):`, error);
    return {
      success: false,
      message: '예약 생성 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  } finally {
    await lockManager.release(lockKey, lockOwner);
    console.log(`🔓 Lock 해제: ${lockKey}`);
  }
}

export async function cancelBooking(bookingId: number, reason?: string) {
  try {
    const bookings = await db.query(`SELECT * FROM lodging_bookings WHERE id = ?`, [bookingId]);
    if (bookings.length === 0) {
      return { success: false, message: '예약을 찾을 수 없습니다.' };
    }

    const booking = bookings[0];

    // 재고 복구
    await db.execute(`
      UPDATE availability_daily
      SET sold_rooms = sold_rooms - 1, updated_at = NOW()
      WHERE room_id = ? AND date >= ? AND date < ?
    `, [booking.room_id, booking.checkin_date, booking.checkout_date]);

    // 예약 취소
    await db.execute(`
      UPDATE lodging_bookings
      SET status = 'CANCELLED', cancelled_at = NOW(), cancel_reason = ?, updated_at = NOW()
      WHERE id = ?
    `, [reason || null, bookingId]);

    console.log(`✅ 예약 취소 완료: ID ${bookingId}`);
    return { success: true, message: '예약이 취소되었습니다.' };
  } catch (error) {
    console.error('❌ 예약 취소 실패:', error);
    return { success: false, message: '예약 취소 실패' };
  }
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  // Lodgings
  getLodgings,
  getLodgingById,
  createLodging,

  // Rooms
  getRooms,
  createRoom,

  // Rate Plans
  getRatePlans,
  createRatePlan,

  // Availability
  getAvailability,
  updateAvailability,

  // Bookings
  getBookings,
  createBooking,
  cancelBooking
};
