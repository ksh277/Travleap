/**
 * 숙박 HOLD 만료 워커
 *
 * 기능:
 * - 결제 미완료 숙박 HOLD 예약 자동 만료
 * - 객실 재고 복구 (lodging_inventory_locks)
 * - 메트릭 수집
 *
 * 실행 주기: 1분 (EXPIRY_SWEEP_CRON)
 * 만료 기준: hold_expires_at < now() AND status='HOLD'
 */

import * as cron from 'node-cron';
import { connect } from '@planetscale/database';

const EXPIRY_SWEEP_CRON = process.env.LODGING_EXPIRY_SWEEP_CRON || '*/1 * * * *'; // 1분마다
const DRY_RUN = process.env.DRY_RUN === 'true';

// PlanetScale 연결
function getConnection() {
  return connect({
    host: process.env.DATABASE_HOST,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
  });
}

interface ExpiredLodgingBooking {
  id: number;
  booking_number: string;
  room_id: number;
  checkin_date: string;
  checkout_date: string;
  hold_expires_at: string;
  total_amount: number;
  rooms_booked: number;
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
 * 만료된 숙박 HOLD 예약 조회
 */
async function findExpiredLodgingBookings(): Promise<ExpiredLodgingBooking[]> {
  const conn = getConnection();

  try {
    const result = await conn.execute(`
      SELECT
        id, booking_number, room_type_id as room_id,
        check_in_date as checkin_date, check_out_date as checkout_date, expiry_date as hold_expires_at,
        total_amount, 1 as rooms_booked
      FROM lodging_bookings
      WHERE booking_status = 'pending'
        AND payment_status = 'pending'
        AND expiry_date IS NOT NULL
        AND expiry_date < NOW()
      ORDER BY expiry_date ASC
      LIMIT 100
    `);

    console.log(`🔍 [Lodging Expiry] Found ${result.rows.length} expired bookings`);
    return result.rows as ExpiredLodgingBooking[];

  } catch (error) {
    console.error(`❌ [Lodging Expiry] Query failed:`, error);
    return [];
  }
}

/**
 * 숙박 HOLD 예약 만료 처리
 */
async function expireLodgingBooking(booking: ExpiredLodgingBooking): Promise<boolean> {
  const conn = getConnection();
  const { id, booking_number, room_id, checkin_date, checkout_date, rooms_booked } = booking;

  console.log(`⏰ [Lodging Expiry] Processing: ${booking_number} (ID: ${id})`);

  if (DRY_RUN) {
    console.log(`🔧 [DRY RUN] Would expire lodging booking ${booking_number}`);
    return true;
  }

  try {
    // 1. 예약 상태 변경: pending → cancelled (hold expired)
    await conn.execute(`
      UPDATE lodging_bookings
      SET
        booking_status = 'cancelled',
        cancellation_reason = 'Hold expired - payment not completed',
        updated_at = NOW()
      WHERE id = ?
        AND booking_status = 'pending'
    `, [id]);

    console.log(`✅ [Lodging Expiry] Booking expired: ${booking_number}`);

    // 2. 재고 락 해제 (lodging_inventory_locks)
    await conn.execute(`
      UPDATE lodging_inventory_locks
      SET
        status = 'EXPIRED',
        updated_at = NOW()
      WHERE booking_id = ?
        AND status = 'ACTIVE'
    `, [id]);

    console.log(`🔓 [Lodging Expiry] Inventory locks released for ${booking_number}`);

    // 3. 객실 재고 복구 (availability_daily에서 sold_rooms 감소)
    // 체크인부터 체크아웃 전날까지 모든 날짜에 대해 처리
    const checkinDate = new Date(checkin_date);
    const checkoutDate = new Date(checkout_date);
    const dates: string[] = [];

    for (let d = new Date(checkinDate); d < checkoutDate; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    for (const date of dates) {
      await conn.execute(`
        UPDATE availability_daily
        SET
          sold_rooms = GREATEST(0, sold_rooms - ?),
          updated_at = NOW()
        WHERE room_id = ?
          AND date = ?
      `, [rooms_booked, room_id, date]);
    }

    console.log(`📦 [Lodging Expiry] Inventory restored for ${dates.length} nights`);

    // 4. 로그 기록 (선택적 - booking_logs 테이블 있는 경우)
    try {
      await conn.execute(`
        INSERT INTO booking_logs (booking_id, action, details, created_at)
        VALUES (?, 'LODGING_EXPIRED', ?, NOW())
      `, [
        id,
        JSON.stringify({
          reason: 'Payment not completed within hold period',
          hold_expires_at: booking.hold_expires_at,
          expired_at: new Date().toISOString(),
          nights_restored: dates.length,
          rooms_restored: rooms_booked
        })
      ]);
    } catch (logError) {
      // booking_logs 테이블 없으면 무시
      console.log(`⚠️  [Lodging Expiry] Log table not available (skipped)`);
    }

    console.log(`📝 [Lodging Expiry] Completed for ${booking_number}`);

    return true;

  } catch (error) {
    console.error(`❌ [Lodging Expiry] Failed to expire ${booking_number}:`, error);
    return false;
  }
}

/**
 * 워커 메인 로직
 */
async function runLodgingExpiryWorker(): Promise<void> {
  const startTime = Date.now();

  console.log(`\n🚀 [Lodging Expiry] Starting sweep at ${new Date().toISOString()}`);

  try {
    // 1. 만료된 예약 조회
    const expiredBookings = await findExpiredLodgingBookings();

    if (expiredBookings.length === 0) {
      console.log(`✅ [Lodging Expiry] No expired bookings found`);
      return;
    }

    // 2. 각 예약 처리
    let cleaned = 0;
    let failed = 0;

    for (const booking of expiredBookings) {
      const success = await expireLodgingBooking(booking);
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

    console.log(`\n✅ [Lodging Expiry] Completed in ${duration}ms`);
    console.log(`   - Total: ${expiredBookings.length}`);
    console.log(`   - Cleaned: ${cleaned}`);
    console.log(`   - Failed: ${failed}`);

    // 4. 알림 트리거 (실패율 > 5%)
    const failureRate = failed / expiredBookings.length;
    if (failureRate > 0.05 && expiredBookings.length >= 10) {
      console.error(`🚨 [Lodging Expiry] HIGH FAILURE RATE: ${(failureRate * 100).toFixed(1)}%`);
      // TODO: Slack 알림 발송
    }

  } catch (error) {
    console.error(`❌ [Lodging Expiry] Fatal error:`, error);
    // TODO: 에러 알림
  }
}

/**
 * Cron 스케줄러 시작
 */
export function startLodgingExpiryWorker(): void {
  console.log(`📅 [Lodging Expiry Worker] Scheduling with cron: ${EXPIRY_SWEEP_CRON}`);

  if (DRY_RUN) {
    console.log(`🔧 [DRY RUN MODE] No actual changes will be made`);
  }

  // Cron 작업 등록
  cron.schedule(EXPIRY_SWEEP_CRON, () => {
    runLodgingExpiryWorker().catch(error => {
      console.error(`❌ [Lodging Expiry] Unhandled error:`, error);
    });
  });

  console.log(`✅ [Lodging Expiry Worker] Started successfully`);

  // 즉시 1회 실행 (테스트용)
  if (process.env.RUN_IMMEDIATELY === 'true') {
    console.log(`🚀 [Lodging Expiry] Running immediately (RUN_IMMEDIATELY=true)`);
    runLodgingExpiryWorker();
  }
}

/**
 * 수동 실행 (테스트용)
 */
export async function runLodgingExpiryWorkerOnce(): Promise<void> {
  await runLodgingExpiryWorker();
}

/**
 * 메트릭 조회
 */
export function getLodgingExpiryMetrics() {
  return metrics.getStats();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
