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
 * 사용자 카드 정보 조회 (토큰화된 정보)
 *
 * IMPORTANT: 카드 정보는 반드시 결제 시 Toss Payments의 빌링키로 저장되어야 함
 * PCI-DSS 준수를 위해 평문 카드 정보는 절대 저장하지 않음
 */
async function retrieveCustomerCardInfo(userId: number): Promise<any | null> {
  try {
    // user_payment_methods 테이블에서 빌링키 조회
    const paymentMethods = await db.query(`
      SELECT billing_key, card_type, card_last4
      FROM user_payment_methods
      WHERE user_id = ? AND is_default = 1 AND is_active = 1
      LIMIT 1
    `, [userId]);

    if (paymentMethods.length === 0) {
      console.error(`❌ No payment method found for user ${userId}`);
      return null;
    }

    // 빌링키 반환 (Toss Payments가 토큰으로 처리)
    return {
      billingKey: paymentMethods[0].billing_key,
      // cardNumber, cardExpiry, cardPassword는 빌링키로 대체됨
    };

  } catch (error) {
    console.error(`❌ Failed to retrieve card info for user ${userId}:`, error);
    return null;
  }
}

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
    // JSON 파싱 안전성 검사
    if (!booking.customer_info) {
      throw new Error('Customer info is missing');
    }

    let customerInfo;
    try {
      customerInfo = JSON.parse(booking.customer_info);
    } catch (parseError) {
      throw new Error(`Invalid JSON in customer_info: ${parseError.message}`);
    }

    // CRITICAL: 실제 카드 정보 조회
    // 카드 정보는 결제 시 토큰화되어 저장되어야 함
    const cardInfo = await retrieveCustomerCardInfo(booking.user_id);

    if (!cardInfo) {
      throw new Error('CRITICAL: No card information found for user. Card must be tokenized during payment.');
    }

    // Toss Payments 사전승인 API 호출
    const result = await tossPaymentsServer.preauthDeposit({
      bookingId: id,
      bookingNumber: booking_number,
      depositAmount: deposit_amount,
      customerKey: `customer-${booking.user_id}`,
      ...cardInfo // Use tokenized card data
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
