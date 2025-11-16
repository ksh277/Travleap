/**
 * HOLD 만료 워커
 *
 * 기능:
 * - 결제 미완료 HOLD 예약 자동 만료
 * - 재고 복구 (available_spots++)
 * - Redis 락 정리
 * - 메트릭 수집
 *
 * 실행 주기: 1분 (EXPIRY_SWEEP_CRON)
 * 만료 기준: hold_expires_at < now() AND status='pending'
 */

import * as cron from 'node-cron';
import { db } from '../../utils/database';
import { inventoryLock } from '../locks/inventoryLock';

const EXPIRY_SWEEP_CRON = process.env.EXPIRY_SWEEP_CRON || '*/1 * * * *'; // 1분마다
const DRY_RUN = process.env.DRY_RUN === 'true';

interface ExpiredBooking {
  id: number;
  booking_number: string;
  listing_id: number;
  start_date: string;
  end_date: string;
  hold_expires_at: string;
  total_amount: number;
}

// 메트릭
const metrics = {
  totalExpired: 0,
  totalCleaned: 0,
  totalFailed: 0,
  lastRunAt: null as Date | null,
  lastDuration: 0,

  record: (expired: number, cleaned: number, failed: number, duration: number) => {
    metrics.totalExpired += expired;
    metrics.totalCleaned += cleaned;
    metrics.totalFailed += failed;
    metrics.lastRunAt = new Date();
    metrics.lastDuration = duration;
  },

  getStats: () => ({
    totalExpired: metrics.totalExpired,
    totalCleaned: metrics.totalCleaned,
    totalFailed: metrics.totalFailed,
    successRate: metrics.totalCleaned / (metrics.totalExpired || 1),
    lastRunAt: metrics.lastRunAt,
    lastDuration: metrics.lastDuration
  })
};

/**
 * 만료된 HOLD 예약 조회
 */
async function findExpiredBookings(): Promise<ExpiredBooking[]> {
  try {
    const bookings = await db.query(`
      SELECT
        id, booking_number, listing_id, start_date, end_date,
        hold_expires_at, total_amount
      FROM bookings
      WHERE status = 'pending'
        AND payment_status = 'pending'
        AND hold_expires_at IS NOT NULL
        AND hold_expires_at < NOW()
      ORDER BY hold_expires_at ASC
      LIMIT 100
    `, []);

    console.log(`🔍 [Expiry Worker] Found ${bookings.length} expired bookings`);
    return bookings as ExpiredBooking[];

  } catch (error) {
    console.error(`❌ [Expiry Worker] Query failed:`, error);
    return [];
  }
}

/**
 * HOLD 예약 만료 처리
 */
async function expireBooking(booking: ExpiredBooking): Promise<boolean> {
  const { id, booking_number, listing_id, start_date } = booking;

  console.log(`⏰ [Expiry] Processing: ${booking_number} (ID: ${id})`);

  if (DRY_RUN) {
    console.log(`🔧 [DRY RUN] Would expire booking ${booking_number}`);
    return true;
  }

  try {
    // 1. 예약 상태 변경: pending → expired
    await db.execute(`
      UPDATE bookings
      SET
        status = 'expired',
        updated_at = NOW()
      WHERE id = ?
        AND status = 'pending'
    `, [id]);

    console.log(`✅ [Expiry] Booking expired: ${booking_number}`);

    // 2. 재고 복구 (stock_enabled인 경우만)
    try {
      const listingStockCheck = await db.query(
        `SELECT stock, stock_enabled FROM listings WHERE id = ?`,
        [listing_id]
      );

      if (listingStockCheck && listingStockCheck[0] && listingStockCheck[0].stock_enabled) {
        // 예약에서 사용한 수량 확인
        const bookingQty = await db.query(
          `SELECT num_adults, num_children FROM bookings WHERE id = ?`,
          [id]
        );

        if (bookingQty && bookingQty[0]) {
          const restoreQty = (bookingQty[0].num_adults || 0) + (bookingQty[0].num_children || 0);

          // 재고 복구
          await db.execute(
            `UPDATE listings SET stock = stock + ? WHERE id = ?`,
            [restoreQty, listing_id]
          );
          console.log(`✅ [Stock] Listing stock restored: ${listing_id} (+${restoreQty})`);
        }
      }
    } catch (stockError) {
      console.warn(`⚠️  [Stock] Failed to restore stock for listing ${listing_id}:`, stockError);
      // 재고 복구 실패는 치명적이지 않으므로 계속 진행
    }

    // 3. 락 키 정리 (혹시 남아있는 경우)
    const lockKey = inventoryLock.lockKeyBooking(
      listing_id.toString(),
      start_date,
      booking.end_date
    );

    const isLocked = await inventoryLock.isLocked(lockKey);
    if (isLocked) {
      console.log(`🔓 [Expiry] Releasing stale lock: ${lockKey}`);
      await inventoryLock.forceRelease(lockKey);
    }

    // 4. 로그 기록
    await db.execute(`
      INSERT INTO booking_logs (booking_id, action, details, created_at)
      VALUES (?, 'EXPIRED', ?, NOW())
    `, [
      id,
      JSON.stringify({
        reason: 'Payment not completed within hold period',
        hold_expires_at: booking.hold_expires_at,
        expired_at: new Date().toISOString()
      })
    ]);

    console.log(`📝 [Expiry] Log recorded for ${booking_number}`);

    return true;

  } catch (error) {
    console.error(`❌ [Expiry] Failed to expire ${booking_number}:`, error);
    return false;
  }
}

/**
 * 워커 메인 로직
 */
async function runExpiryWorker(): Promise<void> {
  const startTime = Date.now();

  console.log(`\n🚀 [Expiry Worker] Starting sweep at ${new Date().toISOString()}`);

  try {
    // 1. 만료된 예약 조회
    const expiredBookings = await findExpiredBookings();

    if (expiredBookings.length === 0) {
      console.log(`✅ [Expiry Worker] No expired bookings found`);
      return;
    }

    // 2. 각 예약 처리
    let cleaned = 0;
    let failed = 0;

    for (const booking of expiredBookings) {
      const success = await expireBooking(booking);
      if (success) {
        cleaned++;
      } else {
        failed++;
      }

      // Rate limiting (100ms 간격)
      await sleep(100);
    }

    // 3. 메트릭 기록
    const duration = Date.now() - startTime;
    metrics.record(expiredBookings.length, cleaned, failed, duration);

    console.log(`\n✅ [Expiry Worker] Completed in ${duration}ms`);
    console.log(`   - Total: ${expiredBookings.length}`);
    console.log(`   - Cleaned: ${cleaned}`);
    console.log(`   - Failed: ${failed}`);

    // 4. 알림 트리거 (실패율 > 5%)
    const failureRate = failed / expiredBookings.length;
    if (failureRate > 0.05 && expiredBookings.length >= 10) {
      console.error(`🚨 [Expiry Worker] HIGH FAILURE RATE: ${(failureRate * 100).toFixed(1)}%`);
      // TODO: Slack 알림 발송
    }

  } catch (error) {
    console.error(`❌ [Expiry Worker] Fatal error:`, error);
    // TODO: 에러 알림
  }
}

/**
 * Cron 스케줄러 시작
 */
export function startExpiryWorker(): void {
  console.log(`📅 [Expiry Worker] Scheduling with cron: ${EXPIRY_SWEEP_CRON}`);

  if (DRY_RUN) {
    console.log(`🔧 [DRY RUN MODE] No actual changes will be made`);
  }

  // Cron 작업 등록
  cron.schedule(EXPIRY_SWEEP_CRON, () => {
    runExpiryWorker().catch(error => {
      console.error(`❌ [Expiry Worker] Unhandled error:`, error);
    });
  });

  console.log(`✅ [Expiry Worker] Started successfully`);

  // 즉시 1회 실행 (테스트용)
  if (process.env.RUN_IMMEDIATELY === 'true') {
    console.log(`🚀 [Expiry Worker] Running immediately (RUN_IMMEDIATELY=true)`);
    runExpiryWorker();
  }
}

/**
 * 수동 실행 (테스트용)
 */
export async function runExpiryWorkerOnce(): Promise<void> {
  await runExpiryWorker();
}

/**
 * 메트릭 조회
 */
export function getExpiryMetrics() {
  return metrics.getStats();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 개발 환경에서 워커 자동 시작
// ESM에서는 require.main 대신 import.meta.url 사용
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;

if (process.env.NODE_ENV !== 'test' && isMainModule) {
  startExpiryWorker();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n👋 [Expiry Worker] Shutting down...`);
    process.exit(0);
  });
}
