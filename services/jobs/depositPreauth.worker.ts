/**
 * 보증금 사전승인 워커
 *
 * 기능:
 * - 픽업 30분 전 자동 보증금 사전승인 (PREAUTH)
 * - 실패 시 사용자/벤더 알림
 * - 성공률 모니터링 (95% 목표)
 *
 * 실행 주기: 1분
 * 대상: status='confirmed' AND pickup_at between [now, now+30min]
 */

import * as cron from 'node-cron';
import { db } from '../../utils/database';
import { tossPaymentsServer } from '../../utils/toss-payments-server';

const CRON_SCHEDULE = process.env.DEPOSIT_PREAUTH_CRON || '*/1 * * * *';
const PREAUTH_OFFSET_MIN = parseInt(process.env.DEPOSIT_PREAUTH_OFFSET_MIN || '30');
const DEFAULT_DEPOSIT = 50000; // 기본 보증금 5만원

interface BookingForPreauth {
  id: number;
  booking_number: string;
  listing_id: number;
  user_id: number;
  pickup_at: string;
  customer_info: string; // JSON
  deposit_amount: number;
}

const metrics = {
  totalAttempts: 0,
  totalSuccess: 0,
  totalFailed: 0,
  lastRunAt: null as Date | null,

  record: (success: boolean) => {
    metrics.totalAttempts++;
    if (success) metrics.totalSuccess++;
    else metrics.totalFailed++;
    metrics.lastRunAt = new Date();
  },

  getSuccessRate: () => {
    return metrics.totalAttempts > 0 ? metrics.totalSuccess / metrics.totalAttempts : 0;
  }
};

/**
 * 사전승인 대상 예약 조회
 */
async function findBookingsForPreauth(): Promise<BookingForPreauth[]> {
  const offsetMs = PREAUTH_OFFSET_MIN * 60 * 1000;
  const now = new Date();
  const targetTime = new Date(now.getTime() + offsetMs);

  try {
    const bookings = await db.query(`
      SELECT
        b.id,
        b.booking_number,
        b.listing_id,
        b.user_id,
        b.start_date as pickup_at,
        b.customer_info,
        COALESCE(v.deposit_amount, ?) as deposit_amount
      FROM bookings b
      LEFT JOIN vendor_settings v ON b.listing_id = v.listing_id
      WHERE b.status = 'confirmed'
        AND b.payment_status = 'paid'
        AND b.deposit_auth_id IS NULL
        AND b.start_date BETWEEN NOW() AND ?
      LIMIT 50
    `, [DEFAULT_DEPOSIT, targetTime.toISOString()]);

    console.log(`🔍 [Deposit Preauth] Found ${bookings.length} bookings`);
    return bookings as BookingForPreauth[];

  } catch (error) {
    console.error(`❌ [Deposit Preauth] Query error:`, error);
    return [];
  }
}

/**
 * 보증금 사전승인 실행
 */
async function preauthDeposit(booking: BookingForPreauth): Promise<boolean> {
  const { id, booking_number, deposit_amount } = booking;

  console.log(`🔐 [Preauth] ${booking_number} - ${deposit_amount.toLocaleString()}원`);

  try {
    const customerInfo = JSON.parse(booking.customer_info);

    // Toss Payments 사전승인 API 호출
    const result = await tossPaymentsServer.preauthDeposit({
      bookingId: id,
      bookingNumber: booking_number,
      depositAmount: deposit_amount,
      customerKey: `customer-${booking.user_id}`,
      // 실제 운영에서는 카드 정보를 별도 저장/관리해야 함
      cardNumber: '1234567812345678', // TODO: 실제 카드 정보 조회
      cardExpiry: '2512',
      cardPassword: '00',
      customerBirth: '900101'
    });

    if (result.success && result.data?.depositAuthId) {
      // DB 업데이트
      await db.execute(`
        UPDATE bookings
        SET
          deposit_auth_id = ?,
          deposit_preauth_at = NOW(),
          updated_at = NOW()
        WHERE id = ?
      `, [result.data.depositAuthId, id]);

      console.log(`✅ [Preauth] Success: ${booking_number} (Auth ID: ${result.data.depositAuthId})`);

      // 로그 기록
      await db.execute(`
        INSERT INTO booking_logs (booking_id, action, details, created_at)
        VALUES (?, 'DEPOSIT_PREAUTH', ?, NOW())
      `, [id, JSON.stringify({ depositAmount: deposit_amount, authId: result.data.depositAuthId })]);

      metrics.record(true);
      return true;
    }

    // 실패 처리
    console.error(`❌ [Preauth] Failed: ${booking_number}`, result.error);
    await notifyPreauthFailure(booking, result.error?.message || 'Unknown error');

    metrics.record(false);
    return false;

  } catch (error) {
    console.error(`❌ [Preauth] Error for ${booking_number}:`, error);
    await notifyPreauthFailure(booking, error instanceof Error ? error.message : 'System error');

    metrics.record(false);
    return false;
  }
}

/**
 * 사전승인 실패 알림
 */
async function notifyPreauthFailure(booking: BookingForPreauth, reason: string): Promise<void> {
  try {
    const customerInfo = JSON.parse(booking.customer_info);

    // TODO: 실제 알림 발송 (이메일, SMS, 푸시)
    console.log(`📧 [Notify] 사전승인 실패 알림 발송: ${customerInfo.email || customerInfo.name}`);
    console.log(`   사유: ${reason}`);

    // 로그 기록
    await db.execute(`
      INSERT INTO booking_logs (booking_id, action, details, created_at)
      VALUES (?, 'DEPOSIT_PREAUTH_FAILED', ?, NOW())
    `, [booking.id, JSON.stringify({ reason, timestamp: new Date().toISOString() })]);

  } catch (error) {
    console.error(`❌ [Notify] Failed to send notification:`, error);
  }
}

/**
 * 워커 메인 로직
 */
async function runPreauthWorker(): Promise<void> {
  console.log(`\n🚀 [Deposit Preauth Worker] Starting at ${new Date().toISOString()}`);

  try {
    const bookings = await findBookingsForPreauth();

    if (bookings.length === 0) {
      console.log(`✅ [Deposit Preauth Worker] No bookings to process`);
      return;
    }

    for (const booking of bookings) {
      await preauthDeposit(booking);
      await sleep(200); // Rate limiting
    }

    const successRate = metrics.getSuccessRate();
    console.log(`\n✅ [Deposit Preauth Worker] Completed`);
    console.log(`   - Attempts: ${metrics.totalAttempts}`);
    console.log(`   - Success: ${metrics.totalSuccess}`);
    console.log(`   - Failed: ${metrics.totalFailed}`);
    console.log(`   - Success Rate: ${(successRate * 100).toFixed(1)}%`);

    // 성공률 < 95% → 경보
    if (successRate < 0.95 && metrics.totalAttempts >= 10) {
      console.error(`🚨 [Deposit Preauth Worker] LOW SUCCESS RATE: ${(successRate * 100).toFixed(1)}%`);
      // TODO: Slack 알림
    }

  } catch (error) {
    console.error(`❌ [Deposit Preauth Worker] Fatal error:`, error);
  }
}

/**
 * 워커 시작
 */
export function startDepositPreauthWorker(): void {
  console.log(`📅 [Deposit Preauth Worker] Scheduling: ${CRON_SCHEDULE}`);
  console.log(`   - Preauth Offset: ${PREAUTH_OFFSET_MIN} minutes`);

  cron.schedule(CRON_SCHEDULE, () => {
    runPreauthWorker().catch(error => {
      console.error(`❌ [Deposit Preauth Worker] Error:`, error);
    });
  });

  console.log(`✅ [Deposit Preauth Worker] Started`);

  if (process.env.RUN_IMMEDIATELY === 'true') {
    runPreauthWorker();
  }
}

export function getDepositPreauthMetrics() {
  return {
    totalAttempts: metrics.totalAttempts,
    totalSuccess: metrics.totalSuccess,
    totalFailed: metrics.totalFailed,
    successRate: metrics.getSuccessRate(),
    lastRunAt: metrics.lastRunAt
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ESM에서는 require.main 대신 import.meta.url 사용
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;

if (isMainModule) {
  startDepositPreauthWorker();
  process.on('SIGINT', () => {
    console.log(`\n👋 [Deposit Preauth Worker] Shutting down...`);
    process.exit(0);
  });
}
