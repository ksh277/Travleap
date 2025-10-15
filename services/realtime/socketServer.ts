/**
 * Socket.IO 실시간 서버
 *
 * 기능:
 * - 재고 변경 실시간 브로드캐스트
 * - 예약 상태 변경 알림
 * - Redis Pub/Sub로 멀티 인스턴스 지원
 *
 * 채널:
 * - inventory:{category}:{itemId} (예: inventory:rentcar:veh_123)
 * - booking:{bookingId}
 *
 * 보안:
 * - 토큰 검증 (JWT)
 * - 벤더 채널 접근 제어
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { createRedisFallback, isRedisAvailable } from '../../utils/redis-fallback';

const REDIS_URL = process.env.REDIS_URL || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REALTIME_ENABLED = process.env.REALTIME_ENABLED !== 'false';

interface InventoryUpdatePayload {
  category: 'rentcar' | 'lodging' | 'booking';
  itemId: string | number;
  action: 'hold' | 'confirm' | 'cancel' | 'expired';
  availableCount?: number;
  booking?: {
    id: number;
    number: string;
    user: string;
  };
  timestamp: string;
}

interface BookingUpdatePayload {
  bookingId: number;
  status: string;
  message: string;
  timestamp: string;
}

class RealtimeServer {
  private io: SocketIOServer | null = null;
  private redisPub: Redis | any;
  private redisSub: Redis | any;
  private metrics = {
    connections: 0,
    broadcasts: 0,
    errors: 0
  };

  constructor() {
    if (!REALTIME_ENABLED) {
      console.log(`⚠️ [Realtime] Disabled (REALTIME_ENABLED=false)`);
      this.redisPub = null as any;
      this.redisSub = null as any;
      return;
    }

    if (isRedisAvailable()) {
      this.redisPub = new Redis(REDIS_URL);
      this.redisSub = new Redis(REDIS_URL);

      this.redisPub.on('connect', () => console.log('✅ [Realtime] Redis Pub connected'));
      this.redisSub.on('connect', () => console.log('✅ [Realtime] Redis Sub connected'));
    } else {
      console.warn('⚠️ [Realtime] No REDIS_URL configured, using in-memory fallback');
      this.redisPub = createRedisFallback();
      this.redisSub = createRedisFallback();
    }
  }

  /**
   * Socket.IO 서버 초기화
   */
  initialize(httpServer: HttpServer): void {
    if (!REALTIME_ENABLED) return;

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      },
      path: '/socket.io/'
    });

    // 인증 미들웨어
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        console.warn(`⚠️ [Realtime] Connection without token: ${socket.id}`);
        // 익명 연결 허용 (공개 채널만 구독 가능)
        socket.data.isAuthenticated = false;
        socket.data.userId = null;
        socket.data.userRole = 'guest';
        return next();
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        socket.data.isAuthenticated = true;
        socket.data.userId = decoded.id || decoded.userId;
        socket.data.userRole = decoded.role || 'user';
        console.log(`✅ [Realtime] Authenticated: User ${socket.data.userId} (${socket.data.userRole})`);
        next();
      } catch (error) {
        console.error(`❌ [Realtime] Invalid token:`, error);
        next(new Error('Invalid token'));
      }
    });

    // 연결 핸들러
    this.io.on('connection', (socket) => {
      this.metrics.connections++;
      console.log(`🔌 [Realtime] Client connected: ${socket.id} (Total: ${this.metrics.connections})`);

      // 채널 구독
      socket.on('subscribe', (channel: string) => {
        if (this.canAccessChannel(socket, channel)) {
          socket.join(channel);
          console.log(`📡 [Realtime] ${socket.id} subscribed to ${channel}`);
        } else {
          console.warn(`🚫 [Realtime] ${socket.id} access denied to ${channel}`);
          socket.emit('error', { message: 'Access denied to channel' });
        }
      });

      // 구독 해제
      socket.on('unsubscribe', (channel: string) => {
        socket.leave(channel);
        console.log(`📡 [Realtime] ${socket.id} unsubscribed from ${channel}`);
      });

      // 연결 해제
      socket.on('disconnect', () => {
        this.metrics.connections--;
        console.log(`🔌 [Realtime] Client disconnected: ${socket.id} (Total: ${this.metrics.connections})`);
      });
    });

    // Redis Pub/Sub 설정 (멀티 인스턴스 브로드캐스트)
    this.setupRedisPubSub();

    console.log(`✅ [Realtime] Socket.IO server initialized`);
  }

  /**
   * 채널 접근 권한 검증
   */
  private canAccessChannel(socket: any, channel: string): boolean {
    // 공개 채널 (inventory:*)
    if (channel.startsWith('inventory:')) {
      return true;
    }

    // 예약 채널 (booking:{bookingId})
    if (channel.startsWith('booking:')) {
      if (!socket.data.isAuthenticated) return false;
      // TODO: 예약 소유자 또는 벤더 검증
      return true;
    }

    // 벤더 채널 (vendor:{vendorId})
    if (channel.startsWith('vendor:')) {
      return socket.data.userRole === 'vendor' || socket.data.userRole === 'admin';
    }

    return false;
  }

  /**
   * Redis Pub/Sub 설정 (멀티 인스턴스 동기화)
   */
  private setupRedisPubSub(): void {
    this.redisSub.subscribe('realtime:broadcast', (err) => {
      if (err) {
        console.error(`❌ [Realtime] Redis subscribe error:`, err);
      } else {
        console.log(`📡 [Realtime] Subscribed to realtime:broadcast`);
      }
    });

    this.redisSub.on('message', (channel, message) => {
      try {
        const { room, event, data } = JSON.parse(message);
        this.io?.to(room).emit(event, data);
        console.log(`📨 [Realtime] Broadcast to ${room}: ${event}`);
      } catch (error) {
        console.error(`❌ [Realtime] Redis message parse error:`, error);
      }
    });
  }

  /**
   * 재고 업데이트 브로드캐스트
   */
  broadcastInventoryUpdate(payload: InventoryUpdatePayload): void {
    if (!REALTIME_ENABLED || !this.io) return;

    const channel = `inventory:${payload.category}:${payload.itemId}`;
    const message = {
      room: channel,
      event: 'inventory:update',
      data: { ...payload, timestamp: new Date().toISOString() }
    };

    // 로컬 브로드캐스트
    this.io.to(channel).emit('inventory:update', message.data);

    // Redis Pub (다른 인스턴스로 전파)
    this.redisPub.publish('realtime:broadcast', JSON.stringify(message));

    this.metrics.broadcasts++;
    console.log(`📣 [Realtime] Inventory update: ${channel}`);
  }

  /**
   * 예약 상태 업데이트 브로드캐스트
   */
  broadcastBookingUpdate(payload: BookingUpdatePayload): void {
    if (!REALTIME_ENABLED || !this.io) return;

    const channel = `booking:${payload.bookingId}`;
    const message = {
      room: channel,
      event: 'booking:update',
      data: { ...payload, timestamp: new Date().toISOString() }
    };

    this.io.to(channel).emit('booking:update', message.data);
    this.redisPub.publish('realtime:broadcast', JSON.stringify(message));

    this.metrics.broadcasts++;
    console.log(`📣 [Realtime] Booking update: ${channel}`);
  }

  /**
   * 메트릭 조회
   */
  getMetrics() {
    return {
      enabled: REALTIME_ENABLED,
      connections: this.metrics.connections,
      broadcasts: this.metrics.broadcasts,
      errors: this.metrics.errors
    };
  }

  /**
   * 서버 종료
   */
  async shutdown(): Promise<void> {
    console.log(`👋 [Realtime] Shutting down...`);
    if (this.io) {
      await new Promise<void>((resolve) => {
        this.io!.close(() => {
          console.log(`✅ [Realtime] Socket.IO closed`);
          resolve();
        });
      });
    }
    await this.redisPub?.quit();
    await this.redisSub?.quit();
    console.log(`✅ [Realtime] Redis connections closed`);
  }
}

// 싱글톤 인스턴스
export const realtimeServer = new RealtimeServer();

// 헬퍼 함수들
export function broadcastInventoryUpdate(payload: InventoryUpdatePayload): void {
  realtimeServer.broadcastInventoryUpdate(payload);
}

export function broadcastBookingUpdate(payload: BookingUpdatePayload): void {
  realtimeServer.broadcastBookingUpdate(payload);
}

export function getRealtimeMetrics() {
  return realtimeServer.getMetrics();
}
