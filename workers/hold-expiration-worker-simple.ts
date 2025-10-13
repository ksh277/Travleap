/**
 * HOLD 만료 처리 Worker (간단 버전)
 *
 * 10분간 결제되지 않은 HOLD 상태 예약을 자동으로 취소
 *
 * 주요 기능:
 * - 1분마다 만료된 HOLD 예약 검색
 * - 상태를 'cancelled'로 변경
 * - 로그 기록 (감사 추적)
 */

import { db } from '../utils/database-cloud';

export class SimpleHoldWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkIntervalMs: number;

  constructor(checkIntervalMs: number = 60000) {
    this.checkIntervalMs = checkIntervalMs;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  HOLD Worker가 이미 실행 중입니다.');
      return;
    }

    console.log('🚀 HOLD 만료 Worker 시작');
    console.log(`   - 체크 간격: ${this.checkIntervalMs / 1000}초`);

    this.isRunning = true;
    this.processExpiredHolds();

    this.intervalId = setInterval(() => {
      this.processExpiredHolds();
    }, this.checkIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('⏹️  HOLD Worker 중지');
    }
  }

  get running(): boolean {
    return this.isRunning;
  }

  private async processExpiredHolds() {
    try {
      const startTime = Date.now();
      console.log('\n🔍 만료된 HOLD 예약 검색... (' + new Date().toLocaleString('ko-KR') + ')');

      // 1. 만료된 HOLD 예약 조회
      const expiredBookings = await db.query(`
        SELECT
          id, listing_id, user_id, booking_number,
          start_date, end_date, total_amount,
          hold_expires_at, created_at
        FROM bookings
        WHERE status = 'pending'
          AND payment_status = 'pending'
          AND hold_expires_at IS NOT NULL
          AND hold_expires_at < NOW()
        ORDER BY hold_expires_at ASC
        LIMIT 100
      `);

      if (expiredBookings.length === 0) {
        console.log('✅ 만료된 HOLD 예약 없음');
        return;
      }

      console.log(`📋 만료된 HOLD 예약 ${expiredBookings.length}개 발견`);

      let successCount = 0;
      let failCount = 0;

      // 2. 각 예약 처리
      for (const booking of expiredBookings) {
        try {
          await this.cancelExpiredBooking(booking);
          successCount++;
        } catch (error) {
          console.error(`❌ 예약 ID ${booking.id} 처리 실패:`, error);
          failCount++;
        }
      }

      const elapsedTime = Date.now() - startTime;

      console.log('\n📊 처리 완료:');
      console.log(`   - 성공: ${successCount}개`);
      console.log(`   - 실패: ${failCount}개`);
      console.log(`   - 소요 시간: ${elapsedTime}ms`);

    } catch (error) {
      console.error('❌ HOLD 만료 처리 중 오류:', error);
    }
  }

  private async cancelExpiredBooking(booking: any) {
    const { id, booking_number, listing_id, total_amount, hold_expires_at } = booking;

    console.log(`\n🔄 예약 ${booking_number} (ID: ${id}) 처리 중...`);

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. 예약 상태 변경
      await connection.execute(`
        UPDATE bookings
        SET
          status = 'cancelled',
          payment_status = 'failed',
          cancelled_at = NOW(),
          cancellation_reason = 'HOLD 시간 만료 (10분 경과)',
          updated_at = NOW()
        WHERE id = ?
      `, [id]);

      console.log(`   ✅ 예약 취소 완료`);

      // 2. 로그 기록
      await connection.execute(`
        INSERT INTO booking_logs
        (booking_id, action, details, created_at)
        VALUES (?, 'HOLD_EXPIRED', ?, NOW())
      `, [
        id,
        JSON.stringify({
          reason: 'HOLD_EXPIRED',
          hold_expires_at,
          cancelled_at: new Date().toISOString(),
          amount: total_amount,
          booking_number,
          listing_id
        })
      ]);

      await connection.commit();
      console.log(`   ✅ 로그 기록 완료`);

    } catch (error) {
      await connection.rollback();
      console.error(`   ❌ 처리 실패 (롤백됨):`, error);
      throw error;

    } finally {
      connection.release();
    }
  }

  async getStats() {
    try {
      const [holdBookings] = await db.query(`
        SELECT COUNT(*) as count FROM bookings
        WHERE status = 'pending' AND payment_status = 'pending' AND hold_expires_at IS NOT NULL
      `);

      const [soonExpiring] = await db.query(`
        SELECT COUNT(*) as count FROM bookings
        WHERE status = 'pending'
          AND payment_status = 'pending'
          AND hold_expires_at IS NOT NULL
          AND hold_expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 5 MINUTE)
      `);

      const [alreadyExpired] = await db.query(`
        SELECT COUNT(*) as count FROM bookings
        WHERE status = 'pending'
          AND payment_status = 'pending'
          AND hold_expires_at IS NOT NULL
          AND hold_expires_at < NOW()
      `);

      const [expiredToday] = await db.query(`
        SELECT COUNT(*) as count FROM bookings
        WHERE status = 'cancelled'
          AND cancellation_reason = 'HOLD 시간 만료 (10분 경과)'
          AND DATE(cancelled_at) = CURDATE()
      `);

      return {
        currentHolds: holdBookings[0]?.count || 0,
        soonExpiring: soonExpiring[0]?.count || 0,
        alreadyExpired: alreadyExpired[0]?.count || 0,
        expiredToday: expiredToday[0]?.count || 0,
        isRunning: this.isRunning,
        checkIntervalSeconds: this.checkIntervalMs / 1000
      };

    } catch (error) {
      console.error('❌ 통계 조회 실패:', error);
      return null;
    }
  }

  async runOnce() {
    console.log('🔧 수동 실행 모드');
    await this.processExpiredHolds();
  }
}

export const simpleHoldWorker = new SimpleHoldWorker();

// 개발 환경에서 전역으로 노출
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).holdWorker = simpleHoldWorker;
  console.log('🔧 개발 도구: holdWorker - HOLD 만료 Worker');
  console.log('   - holdWorker.start() - Worker 시작');
  console.log('   - holdWorker.stop() - Worker 중지');
  console.log('   - holdWorker.getStats() - 통계 조회');
  console.log('   - holdWorker.runOnce() - 즉시 1회 실행');
}

export default simpleHoldWorker;
