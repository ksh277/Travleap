/**
 * PMS 폴링 동기화
 * 웹훅을 지원하지 않는 PMS를 위한 주기적 재고/요금 동기화
 */

import { PMSService } from './service';
import type { PMSVendor, PMSConfig } from '../../types/database';
import { db } from '../database';

// 폴링 작업 상태
interface PollingSyncStatus {
  hotelId: string;
  vendor: PMSVendor;
  isRunning: boolean;
  lastSyncAt?: string;
  nextSyncAt?: string;
  errorCount: number;
  lastError?: string;
}

// 폴링 매니저 (싱글톤)
class PollingManager {
  private static instance: PollingManager;
  private syncJobs: Map<string, NodeJS.Timeout> = new Map();
  private syncStatus: Map<string, PollingSyncStatus> = new Map();

  private constructor() {}

  static getInstance(): PollingManager {
    if (!PollingManager.instance) {
      PollingManager.instance = new PollingManager();
    }
    return PollingManager.instance;
  }

  /**
   * 폴링 시작 (특정 호텔)
   */
  startPolling(config: PMSConfig): void {
    const key = `${config.vendor}:${config.hotel_id}`;

    // 이미 실행 중이면 무시
    if (this.syncJobs.has(key)) {
      console.log(`폴링이 이미 실행 중입니다: ${key}`);
      return;
    }

    const intervalMs = (config.polling_interval_seconds || 300) * 1000; // 기본 5분

    console.log(`폴링 시작: ${key} (간격: ${intervalMs / 1000}초)`);

    // 초기 상태 설정
    this.syncStatus.set(key, {
      hotelId: config.hotel_id,
      vendor: config.vendor,
      isRunning: true,
      errorCount: 0,
    });

    // 즉시 한 번 실행
    this.performSync(config);

    // 주기적 실행
    const timer = setInterval(() => {
      this.performSync(config);
    }, intervalMs);

    this.syncJobs.set(key, timer);
  }

  /**
   * 폴링 중지 (특정 호텔)
   */
  stopPolling(vendor: PMSVendor, hotelId: string): void {
    const key = `${vendor}:${hotelId}`;
    const timer = this.syncJobs.get(key);

    if (timer) {
      clearInterval(timer);
      this.syncJobs.delete(key);

      const status = this.syncStatus.get(key);
      if (status) {
        status.isRunning = false;
        this.syncStatus.set(key, status);
      }

      console.log(`폴링 중지: ${key}`);
    }
  }

  /**
   * 모든 폴링 중지
   */
  stopAllPolling(): void {
    for (const [key, timer] of this.syncJobs.entries()) {
      clearInterval(timer);
      console.log(`폴링 중지: ${key}`);
    }
    this.syncJobs.clear();
  }

  /**
   * 폴링 상태 조회
   */
  getStatus(vendor: PMSVendor, hotelId: string): PollingSyncStatus | undefined {
    const key = `${vendor}:${hotelId}`;
    return this.syncStatus.get(key);
  }

  /**
   * 모든 폴링 상태 조회
   */
  getAllStatuses(): PollingSyncStatus[] {
    return Array.from(this.syncStatus.values());
  }

  /**
   * 동기화 수행
   */
  private async performSync(config: PMSConfig): Promise<void> {
    const key = `${config.vendor}:${config.hotel_id}`;
    const status = this.syncStatus.get(key);

    if (!status) return;

    try {
      console.log(`[폴링] 동기화 시작: ${key}`);

      // 1. DB에서 해당 호텔의 객실 타입 목록 조회
      const roomTypes = await db.findAll('room_types', {
        pms_vendor: config.vendor,
        pms_hotel_id: config.hotel_id,
        is_active: true,
      });

      if (!roomTypes || roomTypes.length === 0) {
        console.log(`[폴링] 객실 타입이 없습니다: ${key}`);
        return;
      }

      // 2. 향후 30일 동기화
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 30);

      const startDate = today.toISOString().split('T')[0];
      const endDate = futureDate.toISOString().split('T')[0];

      const pmsService = new PMSService();

      // 3. 각 객실 타입별 재고/요금 동기화
      for (const roomType of roomTypes) {
        if (!roomType.pms_room_type_id) continue;

        try {
          // 재고 조회 및 캐시 갱신
          await pmsService.getInventory(
            config.vendor,
            config.hotel_id,
            roomType.pms_room_type_id,
            startDate,
            endDate
          );

          // 요금 조회 및 캐시 갱신
          await pmsService.getRates(
            config.vendor,
            config.hotel_id,
            roomType.pms_room_type_id,
            startDate,
            endDate
          );

          console.log(`[폴링] 객실 타입 동기화 완료: ${roomType.room_type_name}`);
        } catch (error) {
          console.error(`[폴링] 객실 타입 동기화 실패: ${roomType.room_type_name}`, error);
        }
      }

      // 4. 동기화 성공
      const now = new Date();
      const nextSync = new Date(now.getTime() + (config.polling_interval_seconds || 300) * 1000);

      status.lastSyncAt = now.toISOString();
      status.nextSyncAt = nextSync.toISOString();
      status.errorCount = 0;
      status.lastError = undefined;
      this.syncStatus.set(key, status);

      // DB에 마지막 동기화 시간 저장
      await db.update('pms_configs', { id: config.id }, {
        last_sync_at: now.toISOString(),
      });

      console.log(`[폴링] 동기화 완료: ${key}`);
    } catch (error) {
      console.error(`[폴링] 동기화 실패: ${key}`, error);

      // 에러 카운트 증가
      status.errorCount += 1;
      status.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.syncStatus.set(key, status);

      // 연속 5회 실패 시 폴링 중지
      if (status.errorCount >= 5) {
        console.error(`[폴링] 연속 실패 5회, 폴링 중지: ${key}`);
        this.stopPolling(config.vendor, config.hotel_id);

        // 관리자에게 알림 발송
        // TODO: 이메일 또는 슬랙 알림
      }
    }
  }
}

/**
 * 폴링 매니저 인스턴스 가져오기
 */
export function getPollingManager(): PollingManager {
  return PollingManager.getInstance();
}

/**
 * 활성화된 모든 PMS 설정에 대해 폴링 시작
 */
export async function startAllPollingJobs(): Promise<void> {
  try {
    // DB에서 폴링이 활성화된 PMS 설정 조회
    const configs = await db.findAll('pms_configs', {
      is_active: true,
      polling_enabled: true,
    });

    if (!configs || configs.length === 0) {
      console.log('폴링할 PMS 설정이 없습니다.');
      return;
    }

    const manager = getPollingManager();

    for (const config of configs) {
      manager.startPolling(config);
    }

    console.log(`${configs.length}개 호텔에 대한 폴링 시작됨`);
  } catch (error) {
    console.error('폴링 작업 시작 실패:', error);
  }
}

/**
 * 모든 폴링 작업 중지
 */
export function stopAllPollingJobs(): void {
  const manager = getPollingManager();
  manager.stopAllPolling();
  console.log('모든 폴링 작업 중지됨');
}

/**
 * 특정 호텔의 폴링 시작
 */
export async function startPollingForHotel(
  vendor: PMSVendor,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await db.findOne('pms_configs', {
      vendor,
      hotel_id: hotelId,
      is_active: true,
    });

    if (!config) {
      return {
        success: false,
        error: 'PMS 설정을 찾을 수 없습니다.',
      };
    }

    const manager = getPollingManager();
    manager.startPolling(config);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 특정 호텔의 폴링 중지
 */
export function stopPollingForHotel(
  vendor: PMSVendor,
  hotelId: string
): { success: boolean } {
  const manager = getPollingManager();
  manager.stopPolling(vendor, hotelId);
  return { success: true };
}

/**
 * 폴링 상태 조회
 */
export function getPollingStatus(
  vendor: PMSVendor,
  hotelId: string
): PollingSyncStatus | undefined {
  const manager = getPollingManager();
  return manager.getStatus(vendor, hotelId);
}

/**
 * 모든 폴링 상태 조회
 */
export function getAllPollingStatuses(): PollingSyncStatus[] {
  const manager = getPollingManager();
  return manager.getAllStatuses();
}

/**
 * 수동 동기화 트리거 (즉시 실행)
 */
export async function triggerManualSync(
  vendor: PMSVendor,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await db.findOne('pms_configs', {
      vendor,
      hotel_id: hotelId,
      is_active: true,
    });

    if (!config) {
      return {
        success: false,
        error: 'PMS 설정을 찾을 수 없습니다.',
      };
    }

    // 폴링 매니저의 performSync 메서드 호출
    const manager = getPollingManager() as any;
    await manager.performSync(config);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 사용 예시:
 *
 * // 서버 시작 시 모든 폴링 작업 시작
 * await startAllPollingJobs();
 *
 * // 특정 호텔 폴링 시작
 * await startPollingForHotel('cloudbeds', 'hotel_123');
 *
 * // 폴링 상태 조회
 * const status = getPollingStatus('cloudbeds', 'hotel_123');
 * console.log(status);
 *
 * // 수동 동기화 트리거
 * await triggerManualSync('cloudbeds', 'hotel_123');
 *
 * // 서버 종료 시 모든 폴링 작업 중지
 * stopAllPollingJobs();
 */
