/**
 * 실시간 재고 모니터링 대시보드
 * WebSocket을 통해 실시간으로 차량 가용성 및 예약 상태 업데이트
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRentcarWebSocket, useVendorBookings } from '@/hooks/useRentcarWebSocket';
import {
  Wifi,
  WifiOff,
  Activity,
  Car,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

interface InventoryStats {
  totalVehicles: number;
  availableNow: number;
  bookedToday: number;
  recentUpdates: Array<{
    id: string;
    type: 'availability' | 'booking' | 'price';
    vehicleId: number;
    vehicleName: string;
    message: string;
    timestamp: string;
  }>;
}

export function RealTimeInventoryMonitor({ vendorId }: { vendorId: number }) {
  const ws = useRentcarWebSocket({ vendorId, autoConnect: true });
  const { bookingUpdates, isConnected: bookingsConnected } = useVendorBookings(vendorId);
  const [stats, setStats] = useState<InventoryStats>({
    totalVehicles: 0,
    availableNow: 0,
    bookedToday: 0,
    recentUpdates: [],
  });

  // 초기 통계 로드
  useEffect(() => {
    loadInitialStats();
  }, [vendorId]);

  // 실시간 업데이트 처리
  useEffect(() => {
    if (!ws.lastUpdate) return;

    const { type, vehicleId, data, timestamp } = ws.lastUpdate;

    // 통계 업데이트
    setStats((prev) => {
      const newUpdate = {
        id: `${type}-${vehicleId}-${timestamp}`,
        type,
        vehicleId: vehicleId || 0,
        vehicleName: `Vehicle #${vehicleId}`,
        message: formatUpdateMessage(type, data),
        timestamp,
      };

      return {
        ...prev,
        recentUpdates: [newUpdate, ...prev.recentUpdates].slice(0, 10),
        // 가용성 변경시 카운트 업데이트
        ...(type === 'availability' && {
          availableNow: data.isAvailable
            ? prev.availableNow + 1
            : Math.max(0, prev.availableNow - 1),
        }),
        // 예약시 카운트 업데이트
        ...(type === 'booking' && {
          bookedToday: prev.bookedToday + 1,
          availableNow: Math.max(0, prev.availableNow - 1),
        }),
      };
    });
  }, [ws.lastUpdate]);

  // 예약 업데이트 처리
  useEffect(() => {
    if (bookingUpdates.length > 0) {
      const latestBooking = bookingUpdates[0];
      console.log('New booking update:', latestBooking);
    }
  }, [bookingUpdates]);

  const loadInitialStats = async () => {
    // TODO: API 호출
    // const response = await fetch(`/api/rentcar/vendors/${vendorId}/inventory-stats`);
    // const data = await response.json();

    // Mock data
    setStats({
      totalVehicles: 45,
      availableNow: 32,
      bookedToday: 8,
      recentUpdates: [],
    });
  };

  const formatUpdateMessage = (type: string, data: any): string => {
    switch (type) {
      case 'availability':
        return data.isAvailable
          ? `가용 상태로 변경됨`
          : `예약 불가 - ${data.reason || '알 수 없음'}`;
      case 'booking':
        return `새 예약 (#${data.bookingId}) - ${data.status}`;
      case 'price':
        return `가격 변경: ₩${data.oldPrice.toLocaleString()} → ₩${data.newPrice.toLocaleString()}`;
      default:
        return '업데이트됨';
    }
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'availability':
        return <Car className="h-4 w-4" />;
      case 'booking':
        return <Calendar className="h-4 w-4" />;
      case 'price':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getUpdateColor = (type: string) => {
    switch (type) {
      case 'availability':
        return 'text-blue-600 bg-blue-50';
      case 'booking':
        return 'text-green-600 bg-green-50';
      case 'price':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* 연결 상태 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {ws.isConnected ? (
                <>
                  <div className="relative">
                    <Wifi className="h-6 w-6 text-green-600" />
                    <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <div className="font-semibold text-green-600">실시간 연결됨</div>
                    <div className="text-xs text-gray-600">
                      WebSocket을 통해 실시간 업데이트를 수신하고 있습니다
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <WifiOff className="h-6 w-6 text-red-600" />
                  <div>
                    <div className="font-semibold text-red-600">연결 끊김</div>
                    <div className="text-xs text-gray-600">
                      재연결을 시도하고 있습니다...
                    </div>
                  </div>
                </>
              )}
            </div>

            <Badge variant={ws.isConnected ? 'default' : 'destructive'}>
              <Activity className="h-3 w-3 mr-1" />
              {ws.isConnected ? 'LIVE' : 'OFFLINE'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 실시간 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              총 차량
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.totalVehicles}</div>
              <Car className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              현재 가용
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {stats.availableNow}
                </div>
                <div className="text-xs text-gray-500">
                  {Math.round((stats.availableNow / stats.totalVehicles) * 100)}% 가용
                </div>
              </div>
              <Activity className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              오늘 예약
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-blue-600">
                {stats.bookedToday}
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 실시간 업데이트 피드 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              실시간 업데이트
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {stats.recentUpdates.length}개
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentUpdates.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>아직 업데이트가 없습니다</p>
              <p className="text-xs mt-1">
                차량 가용성, 예약, 가격 변경이 실시간으로 표시됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentUpdates.map((update) => (
                <div
                  key={update.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                >
                  <div className={`p-2 rounded-lg ${getUpdateColor(update.type)}`}>
                    {getUpdateIcon(update.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {update.vehicleName}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(update.timestamp).toLocaleTimeString('ko-KR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{update.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 최근 예약 (from WebSocket) */}
      {bookingUpdates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              최근 예약 ({bookingUpdates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bookingUpdates.slice(0, 5).map((booking, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 border rounded text-sm"
                >
                  <div>
                    <div className="font-medium">예약 #{booking.bookingId}</div>
                    <div className="text-xs text-gray-600">
                      차량 ID: {booking.vehicleId}
                    </div>
                  </div>
                  <Badge>{booking.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
