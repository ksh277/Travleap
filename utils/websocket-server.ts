/**
 * WebSocket Server for Real-time Inventory Updates
 * - Vehicle availability changes
 * - Booking status updates
 * - Price changes
 * - System notifications
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { rentcarLogger } from './logger';

export interface InventoryUpdate {
  type: 'availability' | 'price' | 'booking' | 'notification';
  vehicleId?: number;
  vendorId?: number;
  data: any;
  timestamp: string;
}

export class RentcarWebSocketServer {
  private io: SocketIOServer | null = null;
  private connectedClients: Map<string, Socket> = new Map();
  private vehicleSubscriptions: Map<number, Set<string>> = new Map();
  private vendorSubscriptions: Map<number, Set<string>> = new Map();

  constructor() {
    rentcarLogger.info('WebSocket server initialized');
  }

  /**
   * HTTP 서버에 WebSocket 연결
   */
  attach(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    rentcarLogger.info('WebSocket server attached to HTTP server');
  }

  /**
   * 클라이언트 연결 처리
   */
  private handleConnection(socket: Socket) {
    const clientId = socket.id;
    this.connectedClients.set(clientId, socket);

    rentcarLogger.info(`Client connected: ${clientId}`);

    // 인증 처리
    socket.on('authenticate', (data: { userId?: number; vendorId?: number }) => {
      socket.data.userId = data.userId;
      socket.data.vendorId = data.vendorId;
      rentcarLogger.info(`Client authenticated: ${clientId}`, data);
      socket.emit('authenticated', { success: true });
    });

    // 차량 구독
    socket.on('subscribe:vehicle', (vehicleId: number) => {
      this.subscribeToVehicle(clientId, vehicleId);
      socket.emit('subscribed', { type: 'vehicle', id: vehicleId });
      rentcarLogger.info(`Client ${clientId} subscribed to vehicle ${vehicleId}`);
    });

    // 차량 구독 해제
    socket.on('unsubscribe:vehicle', (vehicleId: number) => {
      this.unsubscribeFromVehicle(clientId, vehicleId);
      socket.emit('unsubscribed', { type: 'vehicle', id: vehicleId });
    });

    // 업체 구독 (관리자용)
    socket.on('subscribe:vendor', (vendorId: number) => {
      this.subscribeToVendor(clientId, vendorId);
      socket.emit('subscribed', { type: 'vendor', id: vendorId });
      rentcarLogger.info(`Client ${clientId} subscribed to vendor ${vendorId}`);
    });

    // 업체 구독 해제
    socket.on('unsubscribe:vendor', (vendorId: number) => {
      this.unsubscribeFromVendor(clientId, vendorId);
      socket.emit('unsubscribed', { type: 'vendor', id: vendorId });
    });

    // 연결 해제
    socket.on('disconnect', () => {
      this.handleDisconnection(clientId);
    });

    // 에러 처리
    socket.on('error', (error) => {
      rentcarLogger.error(`WebSocket error for client ${clientId}`, error);
    });

    // 초기 연결 확인
    socket.emit('connected', {
      clientId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 클라이언트 연결 해제 처리
   */
  private handleDisconnection(clientId: string) {
    rentcarLogger.info(`Client disconnected: ${clientId}`);

    // 모든 구독 해제
    this.vehicleSubscriptions.forEach((subscribers, vehicleId) => {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.vehicleSubscriptions.delete(vehicleId);
      }
    });

    this.vendorSubscriptions.forEach((subscribers, vendorId) => {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.vendorSubscriptions.delete(vendorId);
      }
    });

    this.connectedClients.delete(clientId);
  }

  /**
   * 차량 구독
   */
  private subscribeToVehicle(clientId: string, vehicleId: number) {
    if (!this.vehicleSubscriptions.has(vehicleId)) {
      this.vehicleSubscriptions.set(vehicleId, new Set());
    }
    this.vehicleSubscriptions.get(vehicleId)!.add(clientId);
  }

  /**
   * 차량 구독 해제
   */
  private unsubscribeFromVehicle(clientId: string, vehicleId: number) {
    const subscribers = this.vehicleSubscriptions.get(vehicleId);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.vehicleSubscriptions.delete(vehicleId);
      }
    }
  }

  /**
   * 업체 구독
   */
  private subscribeToVendor(clientId: string, vendorId: number) {
    if (!this.vendorSubscriptions.has(vendorId)) {
      this.vendorSubscriptions.set(vendorId, new Set());
    }
    this.vendorSubscriptions.get(vendorId)!.add(clientId);
  }

  /**
   * 업체 구독 해제
   */
  private unsubscribeFromVendor(clientId: string, vendorId: number) {
    const subscribers = this.vendorSubscriptions.get(vendorId);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.vendorSubscriptions.delete(vendorId);
      }
    }
  }

  /**
   * 차량 가용성 업데이트 브로드캐스트
   */
  broadcastVehicleAvailability(vehicleId: number, availability: {
    isAvailable: boolean;
    dates: { pickup: string; dropoff: string };
    reason?: string;
  }) {
    const update: InventoryUpdate = {
      type: 'availability',
      vehicleId,
      data: availability,
      timestamp: new Date().toISOString(),
    };

    this.broadcastToVehicleSubscribers(vehicleId, 'inventory:availability', update);
    rentcarLogger.info(`Broadcasted availability update for vehicle ${vehicleId}`, availability);
  }

  /**
   * 가격 변경 브로드캐스트
   */
  broadcastPriceChange(vehicleId: number, priceData: {
    oldPrice: number;
    newPrice: number;
    effectiveDate: string;
  }) {
    const update: InventoryUpdate = {
      type: 'price',
      vehicleId,
      data: priceData,
      timestamp: new Date().toISOString(),
    };

    this.broadcastToVehicleSubscribers(vehicleId, 'inventory:price', update);
    rentcarLogger.info(`Broadcasted price change for vehicle ${vehicleId}`, priceData);
  }

  /**
   * 예약 상태 업데이트 브로드캐스트
   */
  broadcastBookingUpdate(bookingId: number, vendorId: number, bookingData: {
    status: string;
    vehicleId: number;
    customerId?: number;
  }) {
    const update: InventoryUpdate = {
      type: 'booking',
      vehicleId: bookingData.vehicleId,
      vendorId,
      data: { bookingId, ...bookingData },
      timestamp: new Date().toISOString(),
    };

    // 업체 구독자들에게 전송
    this.broadcastToVendorSubscribers(vendorId, 'booking:update', update);

    // 해당 차량 구독자들에게도 전송 (재고 변경)
    this.broadcastToVehicleSubscribers(bookingData.vehicleId, 'booking:update', update);

    rentcarLogger.info(`Broadcasted booking update #${bookingId}`, bookingData);
  }

  /**
   * 시스템 알림 브로드캐스트
   */
  broadcastNotification(notification: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    targetVendorId?: number;
    targetUserId?: number;
  }) {
    const update: InventoryUpdate = {
      type: 'notification',
      vendorId: notification.targetVendorId,
      data: notification,
      timestamp: new Date().toISOString(),
    };

    if (notification.targetVendorId) {
      // 특정 업체에만 전송
      this.broadcastToVendorSubscribers(notification.targetVendorId, 'notification', update);
    } else if (notification.targetUserId) {
      // 특정 사용자에게만 전송
      const targetClient = Array.from(this.connectedClients.values()).find(
        (socket) => socket.data.userId === notification.targetUserId
      );
      if (targetClient) {
        targetClient.emit('notification', update);
      }
    } else {
      // 모든 클라이언트에게 전송
      this.io?.emit('notification', update);
    }

    rentcarLogger.info('Broadcasted notification', notification);
  }

  /**
   * 차량 구독자들에게 메시지 전송
   */
  private broadcastToVehicleSubscribers(vehicleId: number, event: string, data: any) {
    const subscribers = this.vehicleSubscriptions.get(vehicleId);
    if (!subscribers || subscribers.size === 0) return;

    subscribers.forEach((clientId) => {
      const socket = this.connectedClients.get(clientId);
      if (socket) {
        socket.emit(event, data);
      }
    });
  }

  /**
   * 업체 구독자들에게 메시지 전송
   */
  private broadcastToVendorSubscribers(vendorId: number, event: string, data: any) {
    const subscribers = this.vendorSubscriptions.get(vendorId);
    if (!subscribers || subscribers.size === 0) return;

    subscribers.forEach((clientId) => {
      const socket = this.connectedClients.get(clientId);
      if (socket) {
        socket.emit(event, data);
      }
    });
  }

  /**
   * 연결 통계
   */
  getStats() {
    return {
      connectedClients: this.connectedClients.size,
      vehicleSubscriptions: this.vehicleSubscriptions.size,
      vendorSubscriptions: this.vendorSubscriptions.size,
      totalSubscribers: Array.from(this.vehicleSubscriptions.values()).reduce(
        (sum, set) => sum + set.size,
        0
      ) + Array.from(this.vendorSubscriptions.values()).reduce(
        (sum, set) => sum + set.size,
        0
      ),
    };
  }

  /**
   * 서버 종료
   */
  close() {
    this.io?.close();
    this.connectedClients.clear();
    this.vehicleSubscriptions.clear();
    this.vendorSubscriptions.clear();
    rentcarLogger.info('WebSocket server closed');
  }
}

// 싱글톤 인스턴스
export const wsServer = new RentcarWebSocketServer();
