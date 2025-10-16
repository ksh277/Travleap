/**
 * HOLD 만료 처리 Worker
 *
 * 10분간 결제되지 않은 HOLD 상태 예약을 자동으로 취소하고 재고 복구
 *
 * 주요 기능:
 * - 1분마다 만료된 HOLD 예약 검색
 * - 상태를 'CANCELLED'로 변경
 * - 차감했던 재고(sold_rooms) 복구
 * - 로그 기록 (감사 추적)
 */

import { db } from '../utils/database.js';

export class HoldExpirationWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private checkIntervalMs: number;

  /**
   * @param checkIntervalMs - 체크 간격 (밀리초), 기본값 60초
   */
  constructor(checkIntervalMs: number = 60000) {
    this.checkIntervalMs = checkIntervalMs;
  }

  /**
   * Worker 시작
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  HOLD 만료 Worker가 이미 실행 중입니다.');
      return;
    }

    console.log('🚀 HOLD 만료 Worker 시작');
    console.log(`   - 체크 간격: ${this.checkIntervalMs / 1000}초`);
    console.log(`   - 만료 기준: hold_expires_at < NOW()`);

    this.isRunning = true;

    // 즉시 한 번 실행
    this.processExpiredHolds();

    // 정기적으로 실행
    this.intervalId = setInterval(() => {
      this.processExpiredHolds();
    }, this.checkIntervalMs);
  }

  /**
   * Worker 중지
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('⏹️  HOLD 만료 Worker 중지');
    }
  }

  /**
   * Worker 실행 중 여부
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * 만료된 HOLD 예약 처리
   */
  private async processExpiredHolds() {
    try {
      const startTime = Date.now();
      console.log('\n🔍 만료된 HOLD 예약 검색 중... (' + new Date().toLocaleString('ko-KR') + ')');

      // 1. 만료된 HOLD 예약 조회
      const expiredBookings = await db.query(`
        SELECT
          id, room_id, lodging_id, guest_name,
          checkin_date, checkout_date, total_price,
          hold_expires_at, created_at
        FROM lodging_bookings
        WHERE status = 'HOLD'
          AND payment_status = 'pending'
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

      // 2. 각 예약을 순차적으로 처리
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

  /**
   * 개별 예약 취소 및 재고 복구
   */
  private async cancelExpiredBooking(booking: any) {
    const { id, room_id, checkin_date, checkout_date, guest_name, total_price, hold_expires_at } = booking;

    console.log(`\n🔄 예약 ID ${id} 처리 중...`);
    console.log(`   - 게스트: ${guest_name}`);
    console.log(`   - 객실: ${room_id}`);
    console.log(`   - 기간: ${checkin_date} ~ ${checkout_date}`);
    console.log(`   - 만료: ${hold_expires_at}`);

    // 트랜잭션 시작 (재고 복구와 예약 취소를 원자적으로 처리)
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. 재고 복구 (sold_rooms 감소)
      const restoreResult = await connection.execute(`
        UPDATE availability_daily
        SET sold_rooms = GREATEST(sold_rooms - 1, 0), updated_at = NOW()
        WHERE room_id = ? AND date >= ? AND date < ?
      `, [room_id, checkin_date, checkout_date]);

      console.log(`   ✅ 재고 복구: ${restoreResult.affectedRows}일`);

      // 2. 예약 상태 변경
      await connection.execute(`
        UPDATE lodging_bookings
        SET
          status = 'CANCELLED',
          payment_status = 'expired',
          cancelled_at = NOW(),
          cancel_reason = 'HOLD 시간 만료 (10분 경과)',
          updated_at = NOW()
        WHERE id = ?
      `, [id]);

      console.log(`   ✅ 예약 취소 완료`);

      // 3. 로그 기록 (감사 추적)
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
          amount: total_price,
          guest_name,
          room_id,
          dates: `${checkin_date} ~ ${checkout_date}`
        })
      ]);

      await connection.commit();
      console.log(`   ✅ 예약 ID ${id} 만료 처리 완료`);

    } catch (error) {
      await connection.rollback();
      console.error(`   ❌ 예약 ID ${id} 처리 실패 (롤백됨):`, error);
      throw error;

    } finally {
      connection.release();
    }
  }

  /**
   * 통계 조회
   */
  async getStats() {
    try {
      // 현재 HOLD 상태 예약 수
      const holdBookings = await db.query(`
        SELECT COUNT(*) as count FROM lodging_bookings
        WHERE status = 'HOLD' AND payment_status = 'pending'
      `);

      // 곧 만료될 예약 (5분 이내)
      const soonExpiring = await db.query(`
        SELECT COUNT(*) as count FROM lodging_bookings
        WHERE status = 'HOLD'
          AND payment_status = 'pending'
          AND hold_expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 5 MINUTE)
      `);

      // 이미 만료됐지만 아직 처리 안 된 예약
      const alreadyExpired = await db.query(`
        SELECT COUNT(*) as count FROM lodging_bookings
        WHERE status = 'HOLD'
          AND payment_status = 'pending'
          AND hold_expires_at < NOW()
      `);

      // 오늘 만료 처리된 예약 수
      const expiredToday = await db.query(`
        SELECT COUNT(*) as count FROM lodging_bookings
        WHERE status = 'CANCELLED'
          AND cancel_reason = 'HOLD 시간 만료 (10분 경과)'
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

  /**
   * 수동 실행 (테스트용)
   */
  async runOnce() {
    console.log('🔧 수동 실행 모드');
    await this.processExpiredHolds();
  }
}

// 싱글톤 인스턴스
export const holdExpirationWorker = new HoldExpirationWorker();

// 개발 환경에서 전역으로 노출
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).holdWorker = holdExpirationWorker;
  console.log('🔧 개발 도구: holdWorker - HOLD 만료 Worker');
  console.log('   - holdWorker.start() - Worker 시작');
  console.log('   - holdWorker.stop() - Worker 중지');
  console.log('   - holdWorker.getStats() - 통계 조회');
  console.log('   - holdWorker.runOnce() - 즉시 1회 실행');
}

// 서버 시작 시 자동 실행 (Node.js 환경)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  holdExpirationWorker.start();
  console.log('✅ HOLD 만료 Worker 자동 시작 (Production)');
}

export default holdExpirationWorker;
