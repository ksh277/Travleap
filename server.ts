/**
 * Custom Next.js Server with WebSocket Support + Booking System Workers
 *
 * 통합 기능:
 * - Next.js 앱 서버
 * - WebSocket (기존)
 * - Socket.IO 실시간 서버
 * - HOLD 만료 워커
 * - 보증금 사전승인 워커
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { wsServer } from './utils/websocket-server';

// 예약 시스템 통합
import { realtimeServer } from './services/realtime/socketServer';
import { startExpiryWorker, getExpiryMetrics } from './services/jobs/bookingExpiry.worker';
import { startDepositPreauthWorker, getDepositPreauthMetrics } from './services/jobs/depositPreauth.worker';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // ===== WebSocket 서버 연결 (기존) =====
  wsServer.attach(server);

  // ===== Socket.IO 실시간 서버 연결 (신규) =====
  console.log('🚀 [Server] Initializing Socket.IO realtime server...');
  realtimeServer.initialize(server);

  // ===== 예약 시스템 워커 시작 =====
  console.log('🚀 [Server] Starting booking system workers...');

  try {
    // HOLD 만료 워커
    startExpiryWorker();
    console.log('✅ [Server] Booking expiry worker started');

    // 보증금 사전승인 워커
    startDepositPreauthWorker();
    console.log('✅ [Server] Deposit preauth worker started');
  } catch (error) {
    console.error('❌ [Server] Failed to start workers:', error);
  }

  // ===== 서버 통계 출력 (30초마다) =====
  setInterval(() => {
    const wsStats = wsServer.getStats();
    const realtimeStats = realtimeServer.getMetrics();
    const expiryStats = getExpiryMetrics();
    const preauthStats = getDepositPreauthMetrics();

    console.log('\n📊 [Server Stats]');
    console.log('   WebSocket:', wsStats);
    console.log('   Realtime:', realtimeStats);
    console.log('   Expiry Worker:', expiryStats);
    console.log('   Preauth Worker:', preauthStats);
  }, 30000);

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log('\n🎉 ===== Server Ready =====');
      console.log(`✅ Next.js: http://${hostname}:${port}`);
      console.log(`✅ WebSocket: ws://${hostname}:${port}`);
      console.log(`✅ Socket.IO: http://${hostname}:${port}/socket.io`);
      console.log(`✅ Booking Workers: Active`);
      console.log('===========================\n');
    });

  // ===== Graceful shutdown =====
  const shutdown = async () => {
    console.log('\n👋 [Server] Shutting down gracefully...');

    // 워커 정리 (cron은 자동으로 정리됨)
    console.log('   - Stopping workers...');

    // 실시간 서버 종료
    console.log('   - Closing realtime server...');
    await realtimeServer.shutdown();

    // WebSocket 종료
    console.log('   - Closing WebSocket...');
    wsServer.close();

    // HTTP 서버 종료
    console.log('   - Closing HTTP server...');
    server.close(() => {
      console.log('✅ [Server] Shutdown complete');
      process.exit(0);
    });

    // 강제 종료 타임아웃 (10초)
    setTimeout(() => {
      console.error('⚠️ [Server] Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
