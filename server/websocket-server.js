/**
 * WebSocket Server for Real-time Rentcar Updates
 * 실시간 렌트카 재고/예약 업데이트 서버
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { connect } from '@planetscale/database';

// PlanetScale DB 연결
const db = connect({
  host: process.env.VITE_PLANETSCALE_HOST || 'aws.connect.psdb.cloud',
  username: process.env.VITE_PLANETSCALE_USERNAME,
  password: process.env.VITE_PLANETSCALE_PASSWORD
});

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.VITE_APP_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// 구독 관리
const subscriptions = {
  vehicles: new Map(), // vehicleId -> Set<socketId>
  vendors: new Map(),  // vendorId -> Set<socketId>
  users: new Map()     // userId -> socketId
};

// 소켓 정보 저장
const socketInfo = new Map(); // socketId -> { userId, vendorId }

io.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);

  // 연결 확인 메시지
  socket.emit('connected', {
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  // 인증
  socket.on('authenticate', ({ userId, vendorId }) => {
    socketInfo.set(socket.id, { userId, vendorId });

    if (userId) {
      subscriptions.users.set(userId, socket.id);
    }

    socket.emit('authenticated', {
      userId,
      vendorId,
      timestamp: new Date().toISOString()
    });

    console.log(`[WebSocket] Authenticated: user=${userId}, vendor=${vendorId}`);
  });

  // 차량 구독
  socket.on('subscribe:vehicle', (vehicleId) => {
    if (!subscriptions.vehicles.has(vehicleId)) {
      subscriptions.vehicles.set(vehicleId, new Set());
    }
    subscriptions.vehicles.get(vehicleId).add(socket.id);

    socket.emit('subscribed', {
      type: 'vehicle',
      vehicleId,
      timestamp: new Date().toISOString()
    });

    console.log(`[WebSocket] ${socket.id} subscribed to vehicle ${vehicleId}`);
  });

  // 차량 구독 해제
  socket.on('unsubscribe:vehicle', (vehicleId) => {
    if (subscriptions.vehicles.has(vehicleId)) {
      subscriptions.vehicles.get(vehicleId).delete(socket.id);
      if (subscriptions.vehicles.get(vehicleId).size === 0) {
        subscriptions.vehicles.delete(vehicleId);
      }
    }

    socket.emit('unsubscribed', {
      type: 'vehicle',
      vehicleId,
      timestamp: new Date().toISOString()
    });

    console.log(`[WebSocket] ${socket.id} unsubscribed from vehicle ${vehicleId}`);
  });

  // 업체 구독
  socket.on('subscribe:vendor', (vendorId) => {
    if (!subscriptions.vendors.has(vendorId)) {
      subscriptions.vendors.set(vendorId, new Set());
    }
    subscriptions.vendors.get(vendorId).add(socket.id);

    socket.emit('subscribed', {
      type: 'vendor',
      vendorId,
      timestamp: new Date().toISOString()
    });

    console.log(`[WebSocket] ${socket.id} subscribed to vendor ${vendorId}`);
  });

  // 업체 구독 해제
  socket.on('unsubscribe:vendor', (vendorId) => {
    if (subscriptions.vendors.has(vendorId)) {
      subscriptions.vendors.get(vendorId).delete(socket.id);
      if (subscriptions.vendors.get(vendorId).size === 0) {
        subscriptions.vendors.delete(vendorId);
      }
    }

    socket.emit('unsubscribed', {
      type: 'vendor',
      vendorId,
      timestamp: new Date().toISOString()
    });

    console.log(`[WebSocket] ${socket.id} unsubscribed from vendor ${vendorId}`);
  });

  // 연결 해제
  socket.on('disconnect', (reason) => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}, reason: ${reason}`);

    // 모든 구독 정리
    const info = socketInfo.get(socket.id);
    if (info?.userId) {
      subscriptions.users.delete(info.userId);
    }

    subscriptions.vehicles.forEach((sockets, vehicleId) => {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        subscriptions.vehicles.delete(vehicleId);
      }
    });

    subscriptions.vendors.forEach((sockets, vendorId) => {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        subscriptions.vendors.delete(vendorId);
      }
    });

    socketInfo.delete(socket.id);
  });
});

// ============================================
// 브로드캐스트 함수들
// ============================================

/**
 * 차량 재고 업데이트 브로드캐스트
 */
export function broadcastAvailabilityUpdate(vehicleId, data) {
  const sockets = subscriptions.vehicles.get(vehicleId);
  if (!sockets || sockets.size === 0) return;

  const update = {
    type: 'availability',
    vehicleId,
    data,
    timestamp: new Date().toISOString()
  };

  sockets.forEach((socketId) => {
    io.to(socketId).emit('inventory:availability', update);
  });

  console.log(`[WebSocket] Broadcasted availability update for vehicle ${vehicleId} to ${sockets.size} clients`);
}

/**
 * 가격 업데이트 브로드캐스트
 */
export function broadcastPriceUpdate(vehicleId, data) {
  const sockets = subscriptions.vehicles.get(vehicleId);
  if (!sockets || sockets.size === 0) return;

  const update = {
    type: 'price',
    vehicleId,
    data,
    timestamp: new Date().toISOString()
  };

  sockets.forEach((socketId) => {
    io.to(socketId).emit('inventory:price', update);
  });

  console.log(`[WebSocket] Broadcasted price update for vehicle ${vehicleId} to ${sockets.size} clients`);
}

/**
 * 예약 업데이트 브로드캐스트 (업체에게)
 */
export function broadcastBookingUpdate(vendorId, data) {
  const sockets = subscriptions.vendors.get(vendorId);
  if (!sockets || sockets.size === 0) return;

  const update = {
    type: 'booking',
    vendorId,
    data,
    timestamp: new Date().toISOString()
  };

  sockets.forEach((socketId) => {
    io.to(socketId).emit('booking:update', update);
  });

  console.log(`[WebSocket] Broadcasted booking update for vendor ${vendorId} to ${sockets.size} clients`);
}

/**
 * 특정 사용자에게 알림 전송
 */
export function sendNotificationToUser(userId, data) {
  const socketId = subscriptions.users.get(userId);
  if (!socketId) return;

  const update = {
    type: 'notification',
    data,
    timestamp: new Date().toISOString()
  };

  io.to(socketId).emit('notification', update);
  console.log(`[WebSocket] Sent notification to user ${userId}`);
}

// ============================================
// DB 변경 감지 (폴링 방식)
// ============================================

let lastCheckTime = new Date();

// 재고 변경 감지 (5초마다)
setInterval(async () => {
  try {
    const result = await db.execute(`
      SELECT vehicle_id, location_id, available_count, maintenance_count
      FROM rentcar_availability
      WHERE updated_at > ?
    `, [lastCheckTime]);

    if (result.rows.length > 0) {
      result.rows.forEach((row) => {
        broadcastAvailabilityUpdate(row.vehicle_id, {
          locationId: row.location_id,
          available: row.available_count,
          maintenance: row.maintenance_count
        });
      });
    }

    lastCheckTime = new Date();
  } catch (error) {
    console.error('[WebSocket] Error checking availability:', error);
  }
}, 5000);

// 새 예약 감지 (5초마다)
let lastBookingCheck = new Date();

setInterval(async () => {
  try {
    const result = await db.execute(`
      SELECT
        b.id, b.vendor_id, b.vehicle_id, b.user_id,
        b.booking_status, b.total_amount,
        u.name as user_name, u.email as user_email,
        v.display_name as vehicle_name
      FROM rentcar_bookings b
      JOIN users u ON b.user_id = u.id
      JOIN rentcar_vehicles v ON b.vehicle_id = v.id
      WHERE b.created_at > ?
    `, [lastBookingCheck]);

    if (result.rows.length > 0) {
      result.rows.forEach((booking) => {
        // 업체에게 알림
        broadcastBookingUpdate(booking.vendor_id, {
          bookingId: booking.id,
          vehicleId: booking.vehicle_id,
          vehicleName: booking.vehicle_name,
          userName: booking.user_name,
          userEmail: booking.user_email,
          status: booking.booking_status,
          amount: booking.total_amount,
          message: `새로운 예약이 접수되었습니다: ${booking.vehicle_name}`
        });

        // 사용자에게 확인 알림
        sendNotificationToUser(booking.user_id, {
          type: 'success',
          title: '예약 완료',
          message: `${booking.vehicle_name} 예약이 완료되었습니다.`
        });
      });
    }

    lastBookingCheck = new Date();
  } catch (error) {
    console.error('[WebSocket] Error checking bookings:', error);
  }
}, 5000);

// 서버 시작
const PORT = process.env.WS_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 WebSocket Server Started');
  console.log('='.repeat(60));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🔗 CORS: ${process.env.VITE_APP_URL || 'http://localhost:5173'}`);
  console.log(`📊 DB: ${process.env.VITE_PLANETSCALE_HOST}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('Ready to accept connections...');
});

// 종료 처리
process.on('SIGTERM', () => {
  console.log('\n[WebSocket] Server shutting down...');
  httpServer.close(() => {
    console.log('[WebSocket] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[WebSocket] Server shutting down...');
  httpServer.close(() => {
    console.log('[WebSocket] Server closed');
    process.exit(0);
  });
});
