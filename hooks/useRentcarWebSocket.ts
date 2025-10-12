/**
 * WebSocket Hook for Real-time Rentcar Updates
 * 클라이언트에서 실시간 렌트카 업데이트를 받기 위한 훅
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface InventoryUpdate {
  type: 'availability' | 'price' | 'booking' | 'notification';
  vehicleId?: number;
  vendorId?: number;
  data: any;
  timestamp: string;
}

interface UseRentcarWebSocketOptions {
  userId?: number;
  vendorId?: number;
  autoConnect?: boolean;
}

interface UseRentcarWebSocketReturn {
  isConnected: boolean;
  lastUpdate: InventoryUpdate | null;
  subscribeToVehicle: (vehicleId: number) => void;
  unsubscribeFromVehicle: (vehicleId: number) => void;
  subscribeToVendor: (vendorId: number) => void;
  unsubscribeFromVendor: (vendorId: number) => void;
  disconnect: () => void;
  connect: () => void;
}

export function useRentcarWebSocket(
  options: UseRentcarWebSocketOptions = {}
): UseRentcarWebSocketReturn {
  const { userId, vendorId, autoConnect = true } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<InventoryUpdate | null>(null);

  // WebSocket 연결
  const connect = () => {
    if (socketRef.current?.connected) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    const socket = socketRef.current;

    // 연결 성공
    socket.on('connected', (data) => {
      console.log('[WebSocket] Connected:', data);
      setIsConnected(true);

      // 인증
      if (userId || vendorId) {
        socket.emit('authenticate', { userId, vendorId });
      }
    });

    // 인증 완료
    socket.on('authenticated', (data) => {
      console.log('[WebSocket] Authenticated:', data);
    });

    // 구독 확인
    socket.on('subscribed', (data) => {
      console.log('[WebSocket] Subscribed:', data);
    });

    socket.on('unsubscribed', (data) => {
      console.log('[WebSocket] Unsubscribed:', data);
    });

    // 재고 가용성 업데이트
    socket.on('inventory:availability', (update: InventoryUpdate) => {
      console.log('[WebSocket] Availability update:', update);
      setLastUpdate(update);

      // 커스텀 이벤트 발생 (다른 컴포넌트에서 감지 가능)
      window.dispatchEvent(
        new CustomEvent('rentcar:availability', { detail: update })
      );
    });

    // 가격 업데이트
    socket.on('inventory:price', (update: InventoryUpdate) => {
      console.log('[WebSocket] Price update:', update);
      setLastUpdate(update);

      window.dispatchEvent(
        new CustomEvent('rentcar:price', { detail: update })
      );
    });

    // 예약 업데이트
    socket.on('booking:update', (update: InventoryUpdate) => {
      console.log('[WebSocket] Booking update:', update);
      setLastUpdate(update);

      window.dispatchEvent(
        new CustomEvent('rentcar:booking', { detail: update })
      );
    });

    // 알림
    socket.on('notification', (update: InventoryUpdate) => {
      console.log('[WebSocket] Notification:', update);
      setLastUpdate(update);

      // 토스트 알림 표시 (선택적)
      if (typeof window !== 'undefined' && window.toast) {
        const { title, message, type } = update.data;
        (window as any).toast[type]?.(title || message);
      }

      window.dispatchEvent(
        new CustomEvent('rentcar:notification', { detail: update })
      );
    });

    // 연결 해제
    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setIsConnected(false);
    });

    // 재연결 시도
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[WebSocket] Reconnection attempt:', attemptNumber);
    });

    // 재연결 성공
    socket.on('reconnect', (attemptNumber) => {
      console.log('[WebSocket] Reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    // 재연결 실패
    socket.on('reconnect_failed', () => {
      console.error('[WebSocket] Reconnection failed');
      setIsConnected(false);
    });

    // 에러
    socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });
  };

  // WebSocket 연결 해제
  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  // 차량 구독
  const subscribeToVehicle = (vehicleId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:vehicle', vehicleId);
    }
  };

  // 차량 구독 해제
  const unsubscribeFromVehicle = (vehicleId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:vehicle', vehicleId);
    }
  };

  // 업체 구독
  const subscribeToVendor = (vendorId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:vendor', vendorId);
    }
  };

  // 업체 구독 해제
  const unsubscribeFromVendor = (vendorId: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:vendor', vendorId);
    }
  };

  // 초기 연결 및 정리
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, userId, vendorId]);

  return {
    isConnected,
    lastUpdate,
    subscribeToVehicle,
    unsubscribeFromVehicle,
    subscribeToVendor,
    unsubscribeFromVendor,
    disconnect,
    connect,
  };
}

/**
 * 특정 차량의 실시간 업데이트를 구독하는 훅
 */
export function useVehicleAvailability(vehicleId: number | null) {
  const [availability, setAvailability] = useState<any>(null);
  const ws = useRentcarWebSocket();

  useEffect(() => {
    if (!vehicleId) return;

    // 구독
    ws.subscribeToVehicle(vehicleId);

    // 가용성 업데이트 리스너
    const handleAvailability = (event: CustomEvent) => {
      const update = event.detail as InventoryUpdate;
      if (update.vehicleId === vehicleId) {
        setAvailability(update.data);
      }
    };

    window.addEventListener('rentcar:availability' as any, handleAvailability);

    return () => {
      ws.unsubscribeFromVehicle(vehicleId);
      window.removeEventListener('rentcar:availability' as any, handleAvailability);
    };
  }, [vehicleId, ws]);

  return { availability, isConnected: ws.isConnected };
}

/**
 * 업체의 모든 예약 업데이트를 구독하는 훅 (관리자용)
 */
export function useVendorBookings(vendorId: number | null) {
  const [bookingUpdates, setBookingUpdates] = useState<any[]>([]);
  const ws = useRentcarWebSocket({ vendorId: vendorId || undefined });

  useEffect(() => {
    if (!vendorId) return;

    // 구독
    ws.subscribeToVendor(vendorId);

    // 예약 업데이트 리스너
    const handleBookingUpdate = (event: CustomEvent) => {
      const update = event.detail as InventoryUpdate;
      if (update.vendorId === vendorId) {
        setBookingUpdates((prev) => [update.data, ...prev].slice(0, 50)); // 최근 50개만 유지
      }
    };

    window.addEventListener('rentcar:booking' as any, handleBookingUpdate);

    return () => {
      ws.unsubscribeFromVendor(vendorId);
      window.removeEventListener('rentcar:booking' as any, handleBookingUpdate);
    };
  }, [vendorId, ws]);

  return { bookingUpdates, isConnected: ws.isConnected };
}
