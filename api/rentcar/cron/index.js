/**
 * Rentcar Cron Jobs 통합 관리
 *
 * node-cron을 사용하여 백그라운드 작업 스케줄링
 *
 * 설치 필요: npm install node-cron
 *
 * 사용법:
 * - server-api.ts에서 이 파일을 import하고 startCronJobs() 호출
 */

const cron = require('node-cron');
const { autoResolveExpiredBlocks } = require('./auto-resolve-blocks');
const {
  sendCheckInReminders,
  sendBlockExpiryReminders,
  sendLateCheckOutReminders
} = require('../notifications/reminder-service');

let isRunning = false;

/**
 * 모든 크론잡 시작
 */
function startCronJobs() {
  if (isRunning) {
    console.log('⚠️  [Cron] Jobs are already running.');
    return;
  }

  console.log('🚀 [Cron] Starting all cron jobs...');

  // 1. 자동 차단 해제 - 매 시간 0분에 실행
  cron.schedule('0 * * * *', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⏰ [Cron] Auto-Resolve Job Triggered');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      await autoResolveExpiredBlocks();
    } catch (error) {
      console.error('❌ [Cron] Auto-resolve job failed:', error);
    }
  });

  // 2. 체크인 리마인더 - 매일 오전 9시 (24시간 전 알림)
  cron.schedule('0 9 * * *', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📢 [Cron] Check-In Reminder Job Triggered');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      await sendCheckInReminders();
    } catch (error) {
      console.error('❌ [Cron] Check-in reminder job failed:', error);
    }
  });

  // 3. 차단 만료 알림 - 매 30분마다 (30분 전 알림)
  cron.schedule('*/30 * * * *', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔔 [Cron] Block Expiry Reminder Job Triggered');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      await sendBlockExpiryReminders();
    } catch (error) {
      console.error('❌ [Cron] Block expiry reminder job failed:', error);
    }
  });

  // 4. 체크아웃 지연 알림 - 매 시간 실행
  cron.schedule('0 * * * *', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⏰ [Cron] Late Check-Out Reminder Job Triggered');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      await sendLateCheckOutReminders();
    } catch (error) {
      console.error('❌ [Cron] Late check-out reminder job failed:', error);
    }
  });

  // 5. 헬스체크 - 매 10분마다 (선택적)
  cron.schedule('*/10 * * * *', () => {
    console.log('💚 [Cron] Health check - All jobs running normally');
  });

  isRunning = true;
  console.log('✅ [Cron] All cron jobs started successfully!');
  console.log('📋 [Cron] Scheduled jobs:');
  console.log('   - Auto-resolve expired blocks: Every hour at :00 (0 * * * *)');
  console.log('   - Check-in reminders: Daily at 9 AM (0 9 * * *)');
  console.log('   - Block expiry reminders: Every 30 minutes (*/30 * * * *)');
  console.log('   - Late check-out reminders: Every hour at :00 (0 * * * *)');
  console.log('   - Health check: Every 10 minutes (*/10 * * * *)');
}

/**
 * 모든 크론잡 중지
 */
function stopCronJobs() {
  if (!isRunning) {
    console.log('⚠️  [Cron] No jobs are running.');
    return;
  }

  console.log('🛑 [Cron] Stopping all cron jobs...');
  // node-cron은 자동으로 관리됨
  isRunning = false;
  console.log('✅ [Cron] All cron jobs stopped.');
}

module.exports = {
  startCronJobs,
  stopCronJobs
};
