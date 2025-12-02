/**
 * Lock Manager 통합 예약 생성 API
 *
 * 프로세스:
 * 1. Lock 획득 (listing_id + date 기반)
 * 2. 재고 확인 (옵션 재고 포함)
 * 3. HOLD 상태로 예약 생성 (10분 TTL)
 * 4. 재고 차감 (옵션 재고 포함)
 * 5. Lock 해제
 */

const { db } = require('../../utils/database.cjs');
const { lockManager } = require('../../utils/lock-manager');

/**
 * 예약 번호 생성 (Toss orderId용)
 * 형식: BK-YYYYMMDD-XXXXXX
 */
function generateBookingNumber() {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BK-${dateStr}-${random}`;
}

/**
 * Lock으로 보호된 예약 생성
 */
async function createBookingWithLock(bookingData) {
  const lockKey = `booking:${bookingData.listing_id}:${bookingData.start_date}`;
  const lockTTL = 10000; // 10초

  try {
    // 1. Lock 획득
    const lockAcquired = await lockManager.acquireLock(lockKey, lockTTL);
    if (!lockAcquired) {
      return {
        success: false,
        message: '다른 사용자가 예약 중입니다. 잠시 후 다시 시도해주세요.',
        code: 'LOCK_FAILED'
      };
    }

    console.log(`✅ [Lock] Acquired: ${lockKey}`);

    // 2. 재고 확인 (옵션 재고 포함) - ✅ FOR UPDATE로 락 획득
    if (bookingData.selected_option) {
      // 옵션 재고 확인 (listing_options 테이블 사용)
      const optionStock = await db.query(
        `SELECT available_count, is_active FROM listing_options WHERE id = ? FOR UPDATE`,
        [bookingData.selected_option.id]
      );

      if (!optionStock || optionStock.length === 0) {
        await lockManager.releaseLock(lockKey);
        return {
          success: false,
          message: '선택한 옵션을 찾을 수 없습니다.',
          code: 'OPTION_NOT_FOUND'
        };
      }

      if (optionStock[0].is_active === 0) {
        await lockManager.releaseLock(lockKey);
        return {
          success: false,
          message: '선택한 옵션이 판매 중지되었습니다.',
          code: 'OPTION_UNAVAILABLE'
        };
      }

      if (optionStock[0].available_count !== null && optionStock[0].available_count < bookingData.num_adults) {
        await lockManager.releaseLock(lockKey);
        return {
          success: false,
          message: `재고가 부족합니다. (현재 재고: ${optionStock[0].available_count}개)`,
          code: 'INSUFFICIENT_STOCK'
        };
      }
    }

    // 3. HOLD 상태로 예약 생성 (5분 TTL)
    const bookingNumber = generateBookingNumber();
    const holdExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5분 후

    const bookingInsert = {
      booking_number: bookingNumber,
      listing_id: bookingData.listing_id,
      user_id: bookingData.user_id,
      start_date: bookingData.start_date,
      end_date: bookingData.end_date,
      num_adults: bookingData.num_adults,
      num_children: bookingData.num_children || 0,
      num_seniors: 0,
      total_amount: bookingData.total_amount,
      payment_status: 'pending',
      status: 'pending',
      customer_info: JSON.stringify({
        name: bookingData.guest_name,
        phone: bookingData.guest_phone,
        email: bookingData.guest_email
      }),
      special_requests: bookingData.special_requests || '',
      hold_expires_at: holdExpiresAt.toISOString().slice(0, 19).replace('T', ' ')
    };

    // ✅ 옵션 정보 저장
    if (bookingData.selected_option) {
      bookingInsert.selected_options = JSON.stringify(bookingData.selected_option);
    }

    const result = await db.execute('INSERT INTO bookings SET ?', [bookingInsert]);
    const bookingId = result.insertId;

    // 4. 재고 차감 (옵션 재고 포함) - ✅ listing_options 테이블 사용
    if (bookingData.selected_option) {
      await db.execute(
        `UPDATE listing_options SET available_count = available_count - ? WHERE id = ? AND available_count IS NOT NULL`,
        [bookingData.num_adults, bookingData.selected_option.id]
      );
      console.log(`✅ [Stock] Option stock decreased: ${bookingData.selected_option.id} (-${bookingData.num_adults})`);
    }

    // 4.5. Listing 재고 차감 (stock_enabled인 경우만)
    const listingStockCheck = await db.query(
      `SELECT stock, stock_enabled FROM listings WHERE id = ?`,
      [bookingData.listing_id]
    );

    if (listingStockCheck && listingStockCheck[0] && listingStockCheck[0].stock_enabled) {
      const currentStock = listingStockCheck[0].stock;
      const requestedQty = bookingData.num_adults + (bookingData.num_children || 0);

      if (currentStock !== null && currentStock < requestedQty) {
        // 이미 예약이 생성되었으므로, 롤백 필요
        await db.execute('DELETE FROM bookings WHERE id = ?', [bookingId]);

        // 옵션 재고도 롤백 - ✅ listing_options 테이블 사용
        if (bookingData.selected_option) {
          await db.execute(
            `UPDATE listing_options SET available_count = available_count + ? WHERE id = ?`,
            [bookingData.num_adults, bookingData.selected_option.id]
          );
        }

        await lockManager.releaseLock(lockKey);
        return {
          success: false,
          message: `재고가 부족합니다. (현재 재고: ${currentStock}개)`,
          code: 'INSUFFICIENT_STOCK'
        };
      }

      // 재고 차감
      await db.execute(
        `UPDATE listings SET stock = stock - ? WHERE id = ?`,
        [requestedQty, bookingData.listing_id]
      );
      console.log(`✅ [Stock] Listing stock decreased: ${bookingData.listing_id} (-${requestedQty})`);
    }

    // 5. Lock 해제
    await lockManager.releaseLock(lockKey);
    console.log(`✅ [Lock] Released: ${lockKey}`);

    return {
      success: true,
      data: {
        booking_id: bookingId,
        booking_number: bookingNumber,
        total_amount: bookingData.total_amount,
        hold_expires_at: holdExpiresAt.toISOString(),
        guest_name: bookingData.guest_name,
        guest_email: bookingData.guest_email
      },
      message: '예약이 생성되었습니다. 10분 이내에 결제를 완료해주세요.'
    };

  } catch (error) {
    // 에러 발생 시 Lock 해제
    await lockManager.releaseLock(lockKey);
    console.error('❌ [Booking] Creation error:', error);

    return {
      success: false,
      message: error.message || '예약 생성 중 오류가 발생했습니다.',
      code: 'BOOKING_CREATION_FAILED'
    };
  }
}

module.exports = {
  default: {
    createBookingWithLock
  },
  createBookingWithLock
};
