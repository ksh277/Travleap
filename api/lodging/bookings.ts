/**
 * 숙박 예약(Lodging Bookings) API
 *
 * Lock Manager를 사용한 안전한 예약 처리
 */

import { db } from '../../utils/database-cloud';
import { lockManager } from '../../utils/lock-manager';

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
 * 예약 생성 (Lock으로 보호됨)
 *
 * 프로세스:
 * 1. Lock 획득 (10분 TTL)
 * 2. 재고 확인
 * 3. HOLD 상태로 예약 생성
 * 4. 재고 차감
 * 5. Lock 해제
 */
export async function createBooking(booking: LodgingBooking) {
  // Lock 키 생성: room_id + 체크인 날짜 조합
  const lockKey = `booking:${booking.room_id}:${booking.checkin_date}`;
  const lockOwner = `user_${booking.user_id || 'guest'}`;

  console.log(`🔒 예약 시도: ${lockKey} (${booking.guest_name})`);

  // 1. Lock 획득 시도 (10분 TTL)
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
    console.log(`✅ Lock 획득 성공: ${lockKey}`);

    // 2. 재고 확인
    console.log(`📊 재고 확인 중: Room ${booking.room_id}, ${booking.checkin_date} ~ ${booking.checkout_date}`);

    const availability = await db.query(`
      SELECT date, available_rooms, sold_rooms, blocked_rooms
      FROM availability_daily
      WHERE room_id = ? AND date >= ? AND date < ?
      ORDER BY date
    `, [booking.room_id, booking.checkin_date, booking.checkout_date]);

    if (availability.length === 0) {
      console.log(`❌ 재고 데이터 없음: Room ${booking.room_id}`);
      return {
        success: false,
        message: '해당 날짜에 재고 정보가 없습니다.',
        code: 'NO_AVAILABILITY_DATA'
      };
    }

    // 모든 날짜에 재고가 있는지 확인
    const unavailableDates: string[] = [];
    for (const day of availability) {
      const availableCount = day.available_rooms - day.sold_rooms - day.blocked_rooms;
      if (availableCount <= 0) {
        unavailableDates.push(day.date);
      }
    }

    if (unavailableDates.length > 0) {
      console.log(`❌ 재고 부족: ${unavailableDates.join(', ')}`);
      return {
        success: false,
        message: `선택하신 기간 중 예약 가능한 객실이 없습니다. (${unavailableDates.length}일 품절)`,
        code: 'NO_AVAILABILITY',
        unavailableDates
      };
    }

    console.log(`✅ 재고 확인 완료: ${availability.length}일 모두 예약 가능`);

    // 3. HOLD 상태로 예약 생성
    console.log(`💾 HOLD 예약 생성 중...`);

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
    console.log(`✅ 예약 ID ${bookingId} 생성됨 (HOLD 상태)`);

    // 4. 재고 차감
    console.log(`📉 재고 차감 중... (${availability.length}일)`);

    for (const day of availability) {
      await db.execute(`
        UPDATE availability_daily
        SET sold_rooms = sold_rooms + 1, updated_at = NOW()
        WHERE room_id = ? AND date = ?
      `, [booking.room_id, day.date]);
    }

    console.log(`✅ 재고 차감 완료`);

    // 5. Lock 해제는 finally 블록에서 수행
    console.log(`🎉 예약 생성 완료: ID ${bookingId}`);
    console.log(`   - 객실: ${booking.room_id}`);
    console.log(`   - 기간: ${booking.checkin_date} ~ ${booking.checkout_date} (${booking.nights}박)`);
    console.log(`   - 게스트: ${booking.guest_name}`);
    console.log(`   - 금액: ${booking.total_price.toLocaleString()}원`);
    console.log(`   - 만료: 10분 후 (결제 필요)`);

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
    // 6. Lock 해제 (항상 실행)
    await lockManager.release(lockKey, lockOwner);
    console.log(`🔓 Lock 해제: ${lockKey}`);
  }
}

export async function updateBookingStatus(
  bookingId: number,
  status: string,
  userId?: number
) {
  try {
    await db.execute(`
      UPDATE lodging_bookings
      SET status = ?, updated_at = NOW()
      WHERE id = ?
    `, [status, bookingId]);

    console.log(`✅ 예약 상태 업데이트: ID ${bookingId} -> ${status}`);
    return { success: true, message: '예약 상태가 업데이트되었습니다.' };

  } catch (error) {
    console.error('❌ 예약 상태 업데이트 실패:', error);
    return { success: false, message: '예약 상태 업데이트 실패' };
  }
}

export async function cancelBooking(bookingId: number, reason?: string) {
  try {
    // 예약 정보 조회
    const bookings = await db.query(`
      SELECT * FROM lodging_bookings WHERE id = ?
    `, [bookingId]);

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
