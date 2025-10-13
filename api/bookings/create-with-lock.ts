/**
 * Lock Manager 통합 예약 생성 API
 *
 * 프로세스:
 * 1. Lock 획득 (listing_id + date 기반)
 * 2. 재고 확인
 * 3. HOLD 상태로 예약 생성 (10분 TTL)
 * 4. 재고 차감
 * 5. Lock 해제
 */

import { db } from '../../utils/database-cloud';
import { lockManager } from '../../utils/lock-manager';

export interface BookingRequest {
  listing_id: number;
  user_id: number;
  num_adults: number;
  num_children: number;
  start_date: string;
  end_date?: string;
  check_in_time?: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  total_amount: number;
  special_requests?: string;
}

export interface BookingResponse {
  success: boolean;
  message: string;
  code?: string;
  data?: {
    booking_id: number;
    booking_number: string;
    hold_expires_at: string;
    total_amount: number;
    guest_name: string;
    guest_email: string;
  };
}

/**
 * 예약 번호 생성 (Toss orderId용)
 * 형식: BK-YYYYMMDD-XXXXXX
 */
function generateBookingNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BK-${dateStr}-${random}`;
}

/**
 * Lock으로 보호된 예약 생성
 */
export async function createBookingWithLock(
  request: BookingRequest
): Promise<BookingResponse> {
  const { listing_id, start_date, user_id, guest_name } = request;

  // Lock 키: listing + date 조합
  const lockKey = `booking:${listing_id}:${start_date}`;
  const lockOwner = `user_${user_id}`;

  console.log(`🔒 예약 시도: ${lockKey} (${guest_name})`);

  // 1. Lock 획득 (10분 TTL)
  const lockAcquired = await lockManager.acquire(lockKey, 600, lockOwner);

  if (!lockAcquired) {
    console.log(`⏳ Lock 실패: ${lockKey} - 다른 사용자가 예약 진행 중`);
    return {
      success: false,
      message: '다른 사용자가 이 상품을 예약 진행 중입니다. 잠시 후 다시 시도해주세요.',
      code: 'LOCK_FAILED'
    };
  }

  try {
    console.log(`✅ Lock 획득: ${lockKey}`);

    // 2. 재고 확인
    console.log(`📊 재고 확인: Listing ${listing_id}, Date ${start_date}`);

    const listings = await db.query(`
      SELECT id, title, max_capacity, available_spots
      FROM listings
      WHERE id = ?
    `, [listing_id]);

    if (listings.length === 0) {
      return {
        success: false,
        message: '상품을 찾을 수 없습니다.',
        code: 'LISTING_NOT_FOUND'
      };
    }

    const listing = listings[0];

    // 총 인원 확인
    const totalGuests = request.num_adults + request.num_children;
    const maxCapacity = listing.max_capacity || 999;

    if (totalGuests > maxCapacity) {
      return {
        success: false,
        message: `최대 ${maxCapacity}명까지 예약 가능합니다.`,
        code: 'EXCEED_MAX_CAPACITY'
      };
    }

    // 해당 날짜 기존 예약 수 확인
    const existingBookings = await db.query(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE listing_id = ?
        AND start_date = ?
        AND status IN ('pending', 'confirmed', 'completed')
    `, [listing_id, start_date]);

    const bookedCount = existingBookings[0].count;
    const availableSpots = listing.available_spots || 999;

    if (bookedCount >= availableSpots) {
      return {
        success: false,
        message: '선택하신 날짜에 예약 가능한 자리가 없습니다.',
        code: 'NO_AVAILABILITY'
      };
    }

    console.log(`✅ 재고 확인 완료: ${bookedCount}/${availableSpots} 사용 중`);

    // 3. HOLD 상태로 예약 생성
    console.log(`💾 HOLD 예약 생성 중...`);

    const bookingNumber = generateBookingNumber();
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 후

    // customer_info JSON 생성
    const customerInfo = JSON.stringify({
      name: guest_name,
      phone: request.guest_phone,
      email: request.guest_email
    });

    const result = await db.execute(`
      INSERT INTO bookings (
        booking_number,
        listing_id,
        user_id,
        num_adults,
        num_children,
        num_seniors,
        start_date,
        end_date,
        check_in_time,
        customer_info,
        total_amount,
        special_requests,
        status,
        payment_status,
        hold_expires_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, NOW(), NOW())
    `, [
      bookingNumber,
      listing_id,
      user_id,
      request.num_adults,
      request.num_children,
      0, // num_seniors
      start_date,
      request.end_date || start_date,
      request.check_in_time || '14:00',
      customerInfo,
      request.total_amount,
      request.special_requests || null,
      holdExpiresAt
    ]);

    const bookingId = result.insertId;
    console.log(`✅ 예약 ID ${bookingId} 생성됨 (HOLD 상태)`);

    // 4. 예약 로그 기록
    await db.execute(`
      INSERT INTO booking_logs (booking_id, action, details, created_at)
      VALUES (?, 'CREATED', ?, NOW())
    `, [
      bookingId,
      JSON.stringify({
        booking_number: bookingNumber,
        listing_id,
        guest_name,
        start_date,
        total_amount: request.total_amount,
        lock_key: lockKey
      })
    ]);

    console.log(`🎉 예약 생성 완료: ${bookingNumber}`);
    console.log(`   - ID: ${bookingId}`);
    console.log(`   - 상품: ${listing.title}`);
    console.log(`   - 날짜: ${start_date}`);
    console.log(`   - 게스트: ${guest_name}`);
    console.log(`   - 금액: ${request.total_amount.toLocaleString()}원`);
    console.log(`   - 만료: ${holdExpiresAt.toISOString()}`);

    return {
      success: true,
      message: '예약이 생성되었습니다. 10분 이내에 결제를 완료해주세요.',
      data: {
        booking_id: bookingId,
        booking_number: bookingNumber,
        hold_expires_at: holdExpiresAt.toISOString(),
        total_amount: request.total_amount,
        guest_name,
        guest_email: request.guest_email
      }
    };

  } catch (error) {
    console.error(`❌ 예약 생성 실패 (${lockKey}):`, error);

    return {
      success: false,
      message: '예약 생성 중 오류가 발생했습니다.',
      code: 'CREATE_FAILED'
    };

  } finally {
    // 5. Lock 해제 (항상 실행)
    await lockManager.release(lockKey, lockOwner);
    console.log(`🔓 Lock 해제: ${lockKey}`);
  }
}

/**
 * 예약 정보 조회 (결제용)
 */
export async function getBookingForPayment(bookingId: number) {
  try {
    const bookings = await db.query(`
      SELECT
        b.*,
        l.title as listing_title,
        l.category
      FROM bookings b
      JOIN listings l ON b.listing_id = l.id
      WHERE b.id = ?
    `, [bookingId]);

    if (bookings.length === 0) {
      return { success: false, message: '예약을 찾을 수 없습니다.' };
    }

    return { success: true, booking: bookings[0] };

  } catch (error) {
    console.error('❌ 예약 조회 실패:', error);
    return { success: false, message: '예약 조회 실패' };
  }
}
