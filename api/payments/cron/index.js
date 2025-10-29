/**
 * Payments Cron Jobs 통합 관리
 *
 * node-cron을 사용하여 결제 관련 백그라운드 작업 스케줄링
 *
 * 사용법:
 * - server-api.ts에서 이 파일을 import하고 startPaymentCronJobs() 호출
 */

const cron = require('node-cron');
const { expirePendingOrders } = require('./expire-pending-orders');

let isRunning = false;

/**
 * 결제 관련 모든 크론잡 시작
 */
function startPaymentCronJobs() {
  if (isRunning) {
    console.log('⚠️  [Payment Cron] Jobs are already running.');
    return;
  }

  console.log('🚀 [Payment Cron] Starting all payment cron jobs...');

  // 1. 결제 대기 주문 만료 처리 - 매 5분마다 실행
  cron.schedule('*/5 * * * *', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⏰ [Payment Cron] Expire Pending Orders Job Triggered');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      await expirePendingOrders();
    } catch (error) {
      console.error('❌ [Payment Cron] Expire pending orders job failed:', error);
    }
  });

  isRunning = true;
  console.log('✅ [Payment Cron] All payment cron jobs started successfully!');
  console.log('📋 [Payment Cron] Scheduled jobs:');
  console.log('   - Expire pending orders: Every 5 minutes (*/5 * * * *)');
}

/**
 * 결제 관련 모든 크론잡 중지
 */
function stopPaymentCronJobs() {
  if (!isRunning) {
    console.log('⚠️  [Payment Cron] No jobs are running.');
    return;
  }

  console.log('🛑 [Payment Cron] Stopping all payment cron jobs...');
  // node-cron은 자동으로 관리됨
  isRunning = false;
  console.log('✅ [Payment Cron] All payment cron jobs stopped.');
}

module.exports = {
  startPaymentCronJobs,
  stopPaymentCronJobs
};
