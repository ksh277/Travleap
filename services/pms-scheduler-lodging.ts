/**
 * 숙박 PMS 자동 동기화 스케줄러
 *
 * 매 1시간마다 실행되며, PMS 연동이 활성화된 숙박 업체들의
 * 객실 재고 및 가격 정보를 자동으로 동기화합니다.
 *
 * 지원 PMS 시스템:
 * - eZee Absolute
 * - Cloudbeds
 * - Oracle Opera
 * - Mews Systems
 * - RMS Cloud
 * - Booking.com / Agoda / Expedia APIs
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
 * 동기화가 필요한 숙박 업체 찾기
 */
async function getLodgingVendorsNeedingSync(): Promise<any[]> {
  const conn = getConnection();

  try {
    const result = await conn.execute(`
      SELECT
        rv.id as vendor_id,
        rv.business_name,
        pms.id as pms_id,
        pms.pms_provider,
        pms.api_endpoint,
        pms.sync_enabled,
        pms.sync_interval_hours,
        pms.last_sync_at
      FROM rentcar_vendors rv
      INNER JOIN pms_api_credentials pms ON rv.id = pms.vendor_id
      WHERE pms.sync_enabled = TRUE
        AND pms.api_key IS NOT NULL
        AND (
          pms.last_sync_at IS NULL
          OR TIMESTAMPDIFF(HOUR, pms.last_sync_at, NOW()) >= pms.sync_interval_hours
        )
    `);

    return result.rows as any[];
  } catch (error) {
    console.error('❌ [Lodging PMS Scheduler] 업체 조회 실패:', error);
    return [];
  }
}

/**
 * 숙박 PMS 동기화 실행
 *
 * Note: 실제 PMS API 통합은 utils/pms-integrations.ts에서 처리
 * 여기서는 동기화 스케줄링과 상태 업데이트만 담당
 */
async function syncLodgingVendor(vendor: any) {
  const conn = getConnection();

  try {
    console.log(`🔄 [Lodging PMS] 동기화 시작 - ${vendor.business_name} (Provider: ${vendor.pms_provider})`);

    const syncStartTime = new Date();

    // 동기화 작업 로그 생성
    const insertResult = await conn.execute(`
      INSERT INTO pms_sync_jobs (
        pms_credential_id,
        status,
        started_at
      ) VALUES (?, 'RUNNING', NOW())
    `, [vendor.pms_id]);

    const jobId = insertResult.insertId;

    // TODO: 실제 PMS API 호출
    // 현재는 utils/pms-integrations.ts의 함수들을 사용해야 함
    // - syncEZeeRooms()
    // - syncCloudbedsRooms()
    // - syncOperaRooms()
    // 등등...

    // 임시: API 호출 시뮬레이션
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3004';

    try {
      // /api/lodging/pms-sync 엔드포인트 호출 (생성 필요)
      const response = await fetch(`${apiUrl}/api/lodging/pms-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendorId: vendor.vendor_id,
          pmsCredentialId: vendor.pms_id
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // 성공 시 로그 업데이트
        await conn.execute(`
          UPDATE pms_sync_jobs
          SET
            status = 'SUCCESS',
            completed_at = NOW(),
            rooms_synced = ?,
            rates_synced = ?,
            availability_synced = ?,
            sync_details = ?
          WHERE id = ?
        `, [
          result.data?.roomsSynced || 0,
          result.data?.ratesSynced || 0,
          result.data?.availabilitySynced || 0,
          JSON.stringify(result.data || {}),
          jobId
        ]);

        // PMS 크레덴셜 last_sync 업데이트
        await conn.execute(`
          UPDATE pms_api_credentials
          SET last_sync_at = NOW()
          WHERE id = ?
        `, [vendor.pms_id]);

        console.log(`✅ [Lodging PMS] ${vendor.business_name} - 성공`);
        console.log(`   - Rooms: ${result.data?.roomsSynced || 0}`);
        console.log(`   - Rates: ${result.data?.ratesSynced || 0}`);
        console.log(`   - Availability: ${result.data?.availabilitySynced || 0}`);

      } else {
        throw new Error(result.error || 'Unknown error');
      }

    } catch (apiError: any) {
      // 실패 시 로그 업데이트
      await conn.execute(`
        UPDATE pms_sync_jobs
        SET
          status = 'FAILED',
          completed_at = NOW(),
          error_message = ?
        WHERE id = ?
      `, [apiError.message, jobId]);

      console.error(`❌ [Lodging PMS] ${vendor.business_name} - 실패: ${apiError.message}`);
    }

  } catch (error: any) {
    console.error(`❌ [Lodging PMS] ${vendor.business_name} - 동기화 오류:`, error.message);
  }
}

/**
 * 스케줄러 태스크 실행
 */
async function runLodgingPMSSchedulerTask() {
  console.log('\n⏰ [Lodging PMS Scheduler] 자동 동기화 태스크 실행...');

  const vendors = await getLodgingVendorsNeedingSync();

  if (vendors.length === 0) {
    console.log('   ℹ️  동기화가 필요한 숙박 업체가 없습니다.');
    return;
  }

  console.log(`   📊 ${vendors.length}개 숙박 업체 동기화 시작\n`);

  // 순차적으로 동기화 실행 (API 과부하 방지)
  for (const vendor of vendors) {
    await syncLodgingVendor(vendor);

    // 각 업체 사이 1초 대기 (API rate limit 방지)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ [Lodging PMS Scheduler] 자동 동기화 태스크 완료\n`);
}

/**
 * 숙박 PMS 자동 동기화 스케줄러 시작
 */
export function startLodgingPMSScheduler() {
  console.log('🚀 [Lodging PMS Scheduler] 자동 동기화 스케줄러 시작');
  console.log('   실행 주기: 매 1시간 (정각)');
  console.log('   지원 PMS: eZee, Cloudbeds, Opera, Mews, RMS Cloud\n');

  // 매시 정각 실행 (0 * * * *)
  const schedule = '0 * * * *'; // 매시 정각

  cron.schedule(schedule, async () => {
    try {
      await runLodgingPMSSchedulerTask();
    } catch (error) {
      console.error('❌ [Lodging PMS Scheduler] 태스크 실행 오류:', error);
    }
  });

  console.log('✅ [Lodging PMS Scheduler] 스케줄러 활성화 완료\n');

  // 서버 시작 후 2분 뒤 첫 실행 (테스트용, 렌트카보다 1분 늦게)
  setTimeout(async () => {
    console.log('🔍 [Lodging PMS Scheduler] 초기 동기화 확인 중...');
    try {
      await runLodgingPMSSchedulerTask();
    } catch (error) {
      console.error('❌ [Lodging PMS Scheduler] 초기 태스크 실행 오류:', error);
    }
  }, 120000); // 2분
}

/**
 * 즉시 수동 실행 (테스트용)
 */
export async function runLodgingPMSSchedulerNow() {
  await runLodgingPMSSchedulerTask();
}
