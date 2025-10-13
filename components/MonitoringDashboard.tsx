/**
 * 운영 모니터링 대시보드
 * 실시간 시스템 상태, 알림, 성능 지표
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { priceCache } from '../utils/price-cache';
import {
  paymentAPICircuit,
  emailAPICircuit,
  smsAPICircuit,
  vendorAPICircuit
} from '../utils/circuit-breaker';
import { api } from '../utils/api';

interface SystemMetrics {
  // 트래픽
  requestsPerMinute: number;
  activeUsers: number;

  // 성능
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;

  // 예약 상태
  holdBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;

  // 결제
  paymentApprovals: number;
  paymentRefunds: number;
  paymentErrors: number;

  // 외부 API
  externalAPISuccess: number;
  externalAPIFailures: number;

  // 캐시
  cacheHitRate: number;

  // 알림
  notificationsSent: number;
  notificationsFailed: number;
}

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    requestsPerMinute: 0,
    activeUsers: 0,
    avgResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    holdBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    paymentApprovals: 0,
    paymentRefunds: 0,
    paymentErrors: 0,
    externalAPISuccess: 0,
    externalAPIFailures: 0,
    cacheHitRate: 0,
    notificationsSent: 0,
    notificationsFailed: 0
  });

  const [alerts, setAlerts] = useState<Array<{
    id: string;
    level: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: Date;
  }>>([]);

  // 실시간 지표 업데이트 (10초마다)
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // 1. 시스템 지표 조회
        const response = await api.get('/api/monitoring/metrics');

        if (response.success && response.data) {
          setMetrics(response.data);
        }

        // 2. 캐시 Hit율
        const cacheStats = priceCache.getStats();
        setMetrics(prev => ({
          ...prev,
          cacheHitRate: cacheStats.hitRate
        }));

        // 3. 서킷 브레이커 상태 체크
        checkCircuitBreakerAlerts();

        // 4. 임계치 경보 체크
        checkThresholdAlerts(response.data);

      } catch (error) {
        console.error('[Monitoring] 지표 조회 실패:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // 10초마다

    return () => clearInterval(interval);
  }, []);

  /**
   * 서킷 브레이커 상태 확인
   */
  const checkCircuitBreakerAlerts = () => {
    const circuits = [
      { name: '결제 API', circuit: paymentAPICircuit },
      { name: '이메일 API', circuit: emailAPICircuit },
      { name: 'SMS API', circuit: smsAPICircuit },
      { name: '벤더 API', circuit: vendorAPICircuit }
    ];

    circuits.forEach(({ name, circuit }) => {
      const state = circuit.getState();

      if (state === 'OPEN') {
        addAlert({
          level: 'critical',
          message: `${name} 서킷 브레이커 OPEN 상태 - 서비스 중단됨`
        });
      } else if (state === 'HALF_OPEN') {
        addAlert({
          level: 'warning',
          message: `${name} 서킷 브레이커 HALF_OPEN 상태 - 복구 시도 중`
        });
      }
    });
  };

  /**
   * 임계치 경보 확인
   */
  const checkThresholdAlerts = (data: any) => {
    if (!data) return;

    // 검색 p95 > 1.5s
    if (data.p95ResponseTime > 1500) {
      addAlert({
        level: 'warning',
        message: `검색 응답시간 p95: ${data.p95ResponseTime}ms (임계치: 1500ms)`
      });
    }

    // 확정 p95 > 2.5s
    if (data.confirmP95 && data.confirmP95 > 2500) {
      addAlert({
        level: 'warning',
        message: `예약 확정 p95: ${data.confirmP95}ms (임계치: 2500ms)`
      });
    }

    // API 오류율 > 5%
    const errorRate = data.externalAPIFailures / (data.externalAPISuccess + data.externalAPIFailures);
    if (errorRate > 0.05) {
      addAlert({
        level: 'critical',
        message: `외부 API 오류율: ${(errorRate * 100).toFixed(1)}% (임계치: 5%)`
      });
    }

    // HOLD 만료율 > 15%
    if (data.holdExpireRate && data.holdExpireRate > 0.15) {
      addAlert({
        level: 'warning',
        message: `HOLD 만료율: ${(data.holdExpireRate * 100).toFixed(1)}% (임계치: 15%)`
      });
    }

    // 캐시 Hit율 < 70%
    const cacheStats = priceCache.getStats();
    if (cacheStats.totalRequests > 100 && cacheStats.hitRate < 70) {
      addAlert({
        level: 'info',
        message: `캐시 Hit율: ${cacheStats.hitRate.toFixed(1)}% (목표: 70%)`
      });
    }
  };

  /**
   * 알림 추가
   */
  const addAlert = (alert: Omit<typeof alerts[number], 'id' | 'timestamp'>) => {
    const newAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };

    setAlerts(prev => [newAlert, ...prev].slice(0, 50)); // 최근 50개만 유지
  };

  /**
   * 알림 삭제
   */
  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  /**
   * 상태 배지 색상
   */
  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'bg-green-100 text-green-800';
    if (value <= thresholds.warning) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">시스템 모니터링 대시보드</h1>

      {/* 경보 섹션 */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border flex items-start justify-between ${
                alert.level === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : alert.level === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">
                    {alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '⚠️' : 'ℹ️'}
                  </span>
                  <span className="font-medium">{alert.message}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {alert.timestamp.toLocaleTimeString('ko-KR')}
                </p>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">요청/분</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.requestsPerMinute}</div>
            <p className="text-sm text-gray-600">활성 사용자: {metrics.activeUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">응답시간 (p95)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold inline-block px-3 py-1 rounded ${getStatusColor(metrics.p95ResponseTime, { good: 1000, warning: 1500 })}`}>
              {metrics.p95ResponseTime}ms
            </div>
            <p className="text-sm text-gray-600">평균: {metrics.avgResponseTime}ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">캐시 Hit율</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold inline-block px-3 py-1 rounded ${getStatusColor(100 - metrics.cacheHitRate, { good: 30, warning: 50 })}`}>
              {metrics.cacheHitRate.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">목표: 70% 이상</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">외부 API 성공률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics.externalAPISuccess + metrics.externalAPIFailures > 0
                ? ((metrics.externalAPISuccess / (metrics.externalAPISuccess + metrics.externalAPIFailures)) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-sm text-gray-600">
              실패: {metrics.externalAPIFailures}건
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 예약 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>예약 상태</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">HOLD (임시)</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.holdBookings}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">CONFIRM (확정)</p>
              <p className="text-2xl font-bold text-green-600">{metrics.confirmedBookings}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">CANCEL (취소)</p>
              <p className="text-2xl font-bold text-gray-600">{metrics.cancelledBookings}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 결제 현황 */}
      <Card>
        <CardHeader>
          <CardTitle>결제 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">승인</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.paymentApprovals}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">환불</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.paymentRefunds}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">오류</p>
              <p className="text-2xl font-bold text-red-600">{metrics.paymentErrors}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 알림 현황 */}
      <Card>
        <CardHeader>
          <CardTitle>알림 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">발송 성공</p>
              <p className="text-2xl font-bold text-green-600">{metrics.notificationsSent}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">발송 실패</p>
              <p className="text-2xl font-bold text-red-600">{metrics.notificationsFailed}</p>
              <p className="text-xs text-gray-500">
                실패율: {metrics.notificationsSent + metrics.notificationsFailed > 0
                  ? ((metrics.notificationsFailed / (metrics.notificationsSent + metrics.notificationsFailed)) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
