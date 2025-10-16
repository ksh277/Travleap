/**
 * PMS 자동 동기화 스케줄러
 *
 * 매 1시간마다 실행되며, pms_sync_enabled가 활성화된 벤더들의
 * 동기화 주기를 확인하고 자동으로 동기화를 실행합니다.
 */

import cron from 'node-cron';
import { connect } from '@planetscale/database';

// PlanetScale 연결
function getConnection() {
  return connect({
    host: process.env.DATABASE_HOST,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
  });
}

/**
 * 동기화가 필요한 벤더 찾기
 */
async function getVendorsNeedingSync(): Promise<any[]> {
  const conn = getConnection();

  try {
    const result = await conn.execute(`
      SELECT id, company_name, pms_provider, pms_last_sync, pms_sync_interval
      FROM rentcar_vendors
      WHERE pms_sync_enabled = TRUE
        AND pms_provider IS NOT NULL
        AND pms_api_key IS NOT NULL
        AND (
          pms_last_sync IS NULL
          OR TIMESTAMPDIFF(SECOND, pms_last_sync, NOW()) >= pms_sync_interval
        )
    `);

    return result.rows as any[];
  } catch (error) {
    console.error('❌ [PMS Scheduler] 벤더 조회 실패:', error);
    return [];
  }
}

/**
 * PMS 동기화 실행 (API 호출)
 */
async function syncVendor(vendorId: number, companyName: string) {
  try {
    console.log(`🔄 [PMS Scheduler] 동기화 시작 - ${companyName} (ID: ${vendorId})`);

    // 서버 API 호출
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3004';
    const response = await fetch(`${apiUrl}/api/pms/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vendorId }),
    });

    const result = await response.json();

    if (result.success && result.data) {
      const { vehiclesAdded, vehiclesUpdated, vehiclesDeleted, errors } = result.data;

      if (errors && errors.length > 0) {
        console.log(`⚠️  [PMS Scheduler] ${companyName} - 부분 성공: +${vehiclesAdded} ~${vehiclesUpdated} -${vehiclesDeleted}`);
        console.log(`   오류: ${errors.join(', ')}`);
      } else {
        console.log(`✅ [PMS Scheduler] ${companyName} - 성공: +${vehiclesAdded} ~${vehiclesUpdated} -${vehiclesDeleted}`);
      }
    } else {
      console.error(`❌ [PMS Scheduler] ${companyName} - 실패:`, result.error);
    }
  } catch (error: any) {
    console.error(`❌ [PMS Scheduler] ${companyName} - 동기화 오류:`, error.message);
  }
}

/**
 * 스케줄러 태스크 실행
 */
async function runSchedulerTask() {
  console.log('\n⏰ [PMS Scheduler] 자동 동기화 태스크 실행...');

  const vendors = await getVendorsNeedingSync();

  if (vendors.length === 0) {
    console.log('   ℹ️  동기화가 필요한 벤더가 없습니다.');
    return;
  }

  console.log(`   📊 ${vendors.length}개 벤더 동기화 시작\n`);

  // 순차적으로 동기화 실행 (API 과부하 방지)
  for (const vendor of vendors) {
    await syncVendor(vendor.id, vendor.company_name);

    // 각 벤더 사이 1초 대기 (API rate limit 방지)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ [PMS Scheduler] 자동 동기화 태스크 완료\n`);
}

/**
 * PMS 자동 동기화 스케줄러 시작
 */
export function startPMSScheduler() {
  console.log('🚀 [PMS Scheduler] 자동 동기화 스케줄러 시작');
  console.log('   실행 주기: 매 1시간 (정각)');
  console.log('   예시: 01:00, 02:00, 03:00...\n');

  // 매시 정각 실행 (0 * * * *)
  // 또는 매 10분마다: */10 * * * *
  const schedule = '0 * * * *'; // 매시 정각

  cron.schedule(schedule, async () => {
    try {
      await runSchedulerTask();
    } catch (error) {
      console.error('❌ [PMS Scheduler] 태스크 실행 오류:', error);
    }
  });

  console.log('✅ [PMS Scheduler] 스케줄러 활성화 완료\n');

  // 서버 시작 후 1분 뒤 첫 실행 (테스트용)
  setTimeout(async () => {
    console.log('🔍 [PMS Scheduler] 초기 동기화 확인 중...');
    try {
      await runSchedulerTask();
    } catch (error) {
      console.error('❌ [PMS Scheduler] 초기 태스크 실행 오류:', error);
    }
  }, 60000); // 1분
}

/**
 * 즉시 수동 실행 (테스트용)
 */
export async function runPMSSchedulerNow() {
  await runSchedulerTask();
}
