/**
 * 재고 락 시스템
 * 동시성 제어 및 재고 원자적 차감/복구
 */

import { api } from './api';

interface InventoryLock {
  lock_id: string;
  vehicle_id: number;
  location_id: number;
  start_date: string;
  end_date: string;
  quantity: number;
  holder_type: 'booking' | 'maintenance' | 'reservation';
  holder_id: number;
  expires_at: string;
  created_at: string;
}

/**
 * 재고 락 획득 (원자적 차감)
 */
export async function acquireInventoryLock(params: {
  vehicleId: number;
  locationId: number;
  startDate: Date;
  endDate: Date;
  quantity: number;
  holderType: 'booking' | 'maintenance' | 'reservation';
  holderId: number;
  ttlMinutes?: number; // 락 만료 시간 (기본 15분)
}): Promise<{ success: boolean; lockId?: string; error?: string }> {
  try {
    const ttl = params.ttlMinutes || 15;
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    // 1. 재고 가용성 확인
    const availability = await checkAvailability({
      vehicleId: params.vehicleId,
      locationId: params.locationId,
      startDate: params.startDate,
      endDate: params.endDate,
      quantity: params.quantity
    });

    if (!availability.available) {
      return {
        success: false,
        error: `재고 부족: ${availability.availableCount}대만 가능합니다`
      };
    }

    // 2. 락 생성 (DB 트랜잭션)
    const response = await api.post('/api/inventory-locks', {
      vehicle_id: params.vehicleId,
      location_id: params.locationId,
      start_date: params.startDate.toISOString(),
      end_date: params.endDate.toISOString(),
      quantity: params.quantity,
      holder_type: params.holderType,
      holder_id: params.holderId,
      expires_at: expiresAt.toISOString()
    });

    if (response.success && response.data) {
      console.log(`[Inventory Lock] 획득 성공: ${response.data.lock_id}`);
      return {
        success: true,
        lockId: response.data.lock_id
      };
    } else {
      return {
        success: false,
        error: response.error || '락 획득 실패'
      };
    }
  } catch (error: any) {
    console.error('[Inventory Lock] 획득 실패:', error);
    return {
      success: false,
      error: error.message || '락 획득 중 오류 발생'
    };
  }
}

/**
 * 재고 락 해제
 */
export async function releaseInventoryLock(lockId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await api.delete(`/api/inventory-locks/${lockId}`);

    if (response.success) {
      console.log(`[Inventory Lock] 해제 성공: ${lockId}`);
      return { success: true };
    } else {
      return {
        success: false,
        error: response.error || '락 해제 실패'
      };
    }
  } catch (error: any) {
    console.error('[Inventory Lock] 해제 실패:', error);
    return {
      success: false,
      error: error.message || '락 해제 중 오류 발생'
    };
  }
}

/**
 * 재고 가용성 확인
 */
export async function checkAvailability(params: {
  vehicleId: number;
  locationId: number;
  startDate: Date;
  endDate: Date;
  quantity: number;
}): Promise<{ available: boolean; availableCount: number; lockedCount: number }> {
  try {
    const response = await api.get('/api/inventory-availability', {
      params: {
        vehicle_id: params.vehicleId,
        location_id: params.locationId,
        start_date: params.startDate.toISOString(),
        end_date: params.endDate.toISOString()
      }
    });

    if (response.success && response.data) {
      const { total_count, locked_count } = response.data;
      const availableCount = total_count - locked_count;

      return {
        available: availableCount >= params.quantity,
        availableCount,
        lockedCount: locked_count
      };
    } else {
      return { available: false, availableCount: 0, lockedCount: 0 };
    }
  } catch (error) {
    console.error('[Inventory] 가용성 확인 실패:', error);
    return { available: false, availableCount: 0, lockedCount: 0 };
  }
}

/**
 * 만료된 락 자동 복구 (백그라운드 워커)
 */
export async function cleanupExpiredLocks(): Promise<{
  cleaned: number;
  errors: number;
}> {
  try {
    const response = await api.post('/api/inventory-locks/cleanup');

    if (response.success && response.data) {
      console.log(`[Inventory Lock] 만료 락 정리: ${response.data.cleaned}개 정리됨`);
      return {
        cleaned: response.data.cleaned || 0,
        errors: response.data.errors || 0
      };
    } else {
      return { cleaned: 0, errors: 0 };
    }
  } catch (error) {
    console.error('[Inventory Lock] 정리 실패:', error);
    return { cleaned: 0, errors: 1 };
  }
}

/**
 * 락 연장 (예약 확정 시)
 */
export async function extendLock(lockId: string, additionalMinutes: number): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await api.put(`/api/inventory-locks/${lockId}/extend`, {
      additional_minutes: additionalMinutes
    });

    if (response.success) {
      console.log(`[Inventory Lock] 연장 성공: ${lockId}, +${additionalMinutes}분`);
      return { success: true };
    } else {
      return {
        success: false,
        error: response.error || '락 연장 실패'
      };
    }
  } catch (error: any) {
    console.error('[Inventory Lock] 연장 실패:', error);
    return {
      success: false,
      error: error.message || '락 연장 중 오류 발생'
    };
  }
}

/**
 * 락 → 예약 확정 (최종 커밋)
 */
export async function commitLock(params: {
  lockId: string;
  bookingId: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. 락 정보 조회
    const lockResponse = await api.get(`/api/inventory-locks/${params.lockId}`);

    if (!lockResponse.success || !lockResponse.data) {
      return { success: false, error: '락을 찾을 수 없습니다' };
    }

    const lock: InventoryLock = lockResponse.data;

    // 2. holder_type을 'booking'으로 변경 + expires_at을 NULL (영구 락)
    const updateResponse = await api.put(`/api/inventory-locks/${params.lockId}`, {
      holder_type: 'booking',
      holder_id: params.bookingId,
      expires_at: null // 영구 락 (예약 취소 전까지)
    });

    if (updateResponse.success) {
      console.log(`[Inventory Lock] 커밋 성공: ${params.lockId} → booking ${params.bookingId}`);
      return { success: true };
    } else {
      return {
        success: false,
        error: updateResponse.error || '락 커밋 실패'
      };
    }
  } catch (error: any) {
    console.error('[Inventory Lock] 커밋 실패:', error);
    return {
      success: false,
      error: error.message || '락 커밋 중 오류 발생'
    };
  }
}

/**
 * 예약 취소 시 재고 복구
 */
export async function restoreInventory(params: {
  bookingId: number;
}): Promise<{ success: boolean; restoredCount: number; error?: string }> {
  try {
    // 해당 예약의 모든 락 해제
    const response = await api.delete(`/api/inventory-locks/by-booking/${params.bookingId}`);

    if (response.success && response.data) {
      console.log(`[Inventory] 재고 복구: booking ${params.bookingId}, ${response.data.count}개 복구됨`);
      return {
        success: true,
        restoredCount: response.data.count || 0
      };
    } else {
      return {
        success: false,
        restoredCount: 0,
        error: response.error || '재고 복구 실패'
      };
    }
  } catch (error: any) {
    console.error('[Inventory] 복구 실패:', error);
    return {
      success: false,
      restoredCount: 0,
      error: error.message || '재고 복구 중 오류 발생'
    };
  }
}

/**
 * 자동 정리 워커 시작 (5분마다)
 */
export function startCleanupWorker(): NodeJS.Timeout {
  console.log('[Inventory Lock] 자동 정리 워커 시작 (5분 간격)');

  return setInterval(async () => {
    const result = await cleanupExpiredLocks();
    if (result.cleaned > 0) {
      console.log(`[Inventory Lock] ${result.cleaned}개 만료 락 정리됨`);
    }
  }, 5 * 60 * 1000); // 5분마다
}

// Temporarily disabled due to API method dependencies
// export default {
//   acquireInventoryLock,
//   releaseInventoryLock,
//   checkAvailability,
//   cleanupExpiredLocks,
//   extendLock,
//   commitLock,
//   restoreInventory,
//   startCleanupWorker
};
