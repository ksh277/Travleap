/**
 * 감사 로깅 시스템
 * 모든 중요 작업의 변경 이력을 추적
 */

import { api } from './api';

interface AuditLogEntry {
  entity_type: 'vendor' | 'vehicle' | 'location' | 'booking' | 'pricing' | 'user';
  entity_id: number;
  action: 'create' | 'update' | 'delete' | 'activate' | 'deactivate' | 'approve' | 'reject';
  user_id: number;
  user_email?: string;
  changes?: {
    field: string;
    old_value: any;
    new_value: any;
  }[];
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * 감사 로그 기록
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    // IP 주소 가져오기 (클라이언트 측)
    const ip_address = entry.ip_address || await getClientIP();
    const user_agent = entry.user_agent || navigator.userAgent;

    const logData = {
      ...entry,
      ip_address,
      user_agent,
      timestamp: new Date().toISOString()
    };

    // DB에 저장
    await api.post('/api/audit-logs', logData);

    // 콘솔에도 기록 (개발 환경)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Audit Log]', logData);
    }
  } catch (error) {
    console.error('감사 로그 기록 실패:', error);
    // 로그 실패는 치명적이지 않으므로 에러를 던지지 않음
  }
}

/**
 * 클라이언트 IP 주소 가져오기
 */
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}

/**
 * 변경 사항 비교 (old vs new)
 */
export function compareChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>
): AuditLogEntry['changes'] {
  const changes: NonNullable<AuditLogEntry['changes']> = [];

  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    const oldValue = oldData[key];
    const newValue = newData[key];

    // 값이 다른 경우만 기록
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        old_value: oldValue,
        new_value: newValue
      });
    }
  }

  return changes;
}

/**
 * 업체 변경 로그
 */
export async function logVendorChange(params: {
  action: AuditLogEntry['action'];
  vendorId: number;
  userId: number;
  userEmail?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
}) {
  const changes = params.oldData && params.newData
    ? compareChanges(params.oldData, params.newData)
    : undefined;

  await logAudit({
    entity_type: 'vendor',
    entity_id: params.vendorId,
    action: params.action,
    user_id: params.userId,
    user_email: params.userEmail,
    changes,
    metadata: params.metadata
  });
}

/**
 * 차량 변경 로그
 */
export async function logVehicleChange(params: {
  action: AuditLogEntry['action'];
  vehicleId: number;
  userId: number;
  userEmail?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
}) {
  const changes = params.oldData && params.newData
    ? compareChanges(params.oldData, params.newData)
    : undefined;

  await logAudit({
    entity_type: 'vehicle',
    entity_id: params.vehicleId,
    action: params.action,
    user_id: params.userId,
    user_email: params.userEmail,
    changes,
    metadata: params.metadata
  });
}

/**
 * 예약 변경 로그
 */
export async function logBookingChange(params: {
  action: AuditLogEntry['action'];
  bookingId: number;
  userId: number;
  userEmail?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
}) {
  const changes = params.oldData && params.newData
    ? compareChanges(params.oldData, params.newData)
    : undefined;

  await logAudit({
    entity_type: 'booking',
    entity_id: params.bookingId,
    action: params.action,
    user_id: params.userId,
    user_email: params.userEmail,
    changes,
    metadata: params.metadata
  });
}

/**
 * 가격 변경 로그
 */
export async function logPricingChange(params: {
  action: AuditLogEntry['action'];
  pricingId: number;
  userId: number;
  userEmail?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  metadata?: Record<string, any>;
}) {
  const changes = params.oldData && params.newData
    ? compareChanges(params.oldData, params.newData)
    : undefined;

  await logAudit({
    entity_type: 'pricing',
    entity_id: params.pricingId,
    action: params.action,
    user_id: params.userId,
    user_email: params.userEmail,
    changes,
    metadata: params.metadata
  });
}

/**
 * 감사 로그 조회
 */
export async function getAuditLogs(filters: {
  entity_type?: AuditLogEntry['entity_type'];
  entity_id?: number;
  action?: AuditLogEntry['action'];
  user_id?: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  try {
    const queryParams = new URLSearchParams();

    if (filters.entity_type) queryParams.append('entity_type', filters.entity_type);
    if (filters.entity_id) queryParams.append('entity_id', filters.entity_id.toString());
    if (filters.action) queryParams.append('action', filters.action);
    if (filters.user_id) queryParams.append('user_id', filters.user_id.toString());
    if (filters.start_date) queryParams.append('start_date', filters.start_date);
    if (filters.end_date) queryParams.append('end_date', filters.end_date);
    if (filters.limit) queryParams.append('limit', filters.limit.toString());
    if (filters.offset) queryParams.append('offset', filters.offset.toString());

    const response = await api.get(`/api/audit-logs?${queryParams.toString()}`);
    return response.data || [];
  } catch (error) {
    console.error('감사 로그 조회 실패:', error);
    return [];
  }
}

/**
 * 감사 로그 통계
 */
export async function getAuditStats(params: {
  entity_type?: AuditLogEntry['entity_type'];
  start_date?: string;
  end_date?: string;
}): Promise<{
  total_actions: number;
  by_action: Record<string, number>;
  by_user: Record<string, number>;
  by_date: Record<string, number>;
}> {
  try {
    const queryParams = new URLSearchParams();

    if (params.entity_type) queryParams.append('entity_type', params.entity_type);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);

    const response = await api.get(`/api/audit-logs/stats?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    console.error('감사 로그 통계 조회 실패:', error);
    return {
      total_actions: 0,
      by_action: {},
      by_user: {},
      by_date: {}
    };
  }
}

export default {
  logAudit,
  compareChanges,
  logVendorChange,
  logVehicleChange,
  logBookingChange,
  logPricingChange,
  getAuditLogs,
  getAuditStats
};
