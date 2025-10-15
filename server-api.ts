/**
 * Booking System API Server
 *
 * 통합 기능:
 * - Express API 서버
 * - Socket.IO 실시간 서버
 * - HOLD 만료 워커
 * - 보증금 사전승인 워커
 * - 결제 웹훅
 * - 예약 생성 API
 */

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';

const PORT = parseInt(process.env.PORT || '3004', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Express 앱 생성
const app = express();
const httpServer = createServer(app);

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Module variables - will be loaded dynamically after dotenv
let realtimeServer: any;
let startExpiryWorker: any;
let getExpiryMetrics: any;
let startDepositPreauthWorker: any;
let getDepositPreauthMetrics: any;
let idempotencyMiddleware: any;
let webhookAPI: any;
let createBookingAPI: any;
let returnInspectAPI: any;
let paymentConfirmAPI: any;
let lodgingAPI: any;
let bannerAPI: any;
let activityAPI: any;
let newsletterAPI: any;

// ===== 서버 시작 =====

async function startServer() {
  console.log('\n🚀 [Server] Starting Booking System API Server...\n');

  // Dynamically import all modules AFTER dotenv has loaded
  console.log('📦 [Server] Loading modules...');

  const [
    realtimeModule,
    expiryWorkerModule,
    preauthWorkerModule,
    idempotencyModule,
    webhookModule,
    createBookingModule,
    returnInspectModule,
    paymentConfirmModule,
    lodgingModule,
    bannerModule,
    activityModule,
    newsletterModule,
    databaseModule
  ] = await Promise.all([
    import('./services/realtime/socketServer'),
    import('./services/jobs/bookingExpiry.worker'),
    import('./services/jobs/depositPreauth.worker'),
    import('./middleware/idempotency'),
    import('./api/payments/webhook.js'),
    import('./api/bookings/create-with-lock.js'),
    import('./api/bookings/return-inspect.js'),
    import('./api/payments/confirm'),
    import('./api/lodging'),
    import('./api/banners'),
    import('./api/activities'),
    import('./api/newsletter'),
    import('./utils/database.js')
  ]);

  // Assign to module variables
  realtimeServer = realtimeModule.realtimeServer;
  startExpiryWorker = expiryWorkerModule.startExpiryWorker;
  getExpiryMetrics = expiryWorkerModule.getExpiryMetrics;
  startDepositPreauthWorker = preauthWorkerModule.startDepositPreauthWorker;
  getDepositPreauthMetrics = preauthWorkerModule.getDepositPreauthMetrics;
  idempotencyMiddleware = idempotencyModule.idempotencyMiddleware;
  webhookAPI = webhookModule.default;
  createBookingAPI = createBookingModule.default;
  returnInspectAPI = returnInspectModule.default;
  paymentConfirmAPI = paymentConfirmModule;
  lodgingAPI = lodgingModule;
  bannerAPI = bannerModule;
  activityAPI = activityModule;
  newsletterAPI = newsletterModule;

  const { db } = databaseModule;

  console.log('✅ [Server] Modules loaded\n');

  // Database 초기화 (dotenv 이후)
  console.log('💾 [Server] Initializing database...');
  await db.initializeIfEmpty().catch((err: Error) => {
    console.warn('⚠️  [Server] Database initialization failed:', err.message);
  });
  console.log('✅ [Server] Database initialized\n');

  // Setup all routes NOW that modules are loaded
  setupRoutes();

  // Socket.IO 실시간 서버 초기화
  console.log('📡 [Server] Initializing Socket.IO realtime server...');
  realtimeServer.initialize(httpServer);
  console.log('✅ [Server] Realtime server initialized\n');

  // 워커 시작
  console.log('⚙️  [Server] Starting background workers...');

  try {
    // HOLD 만료 워커
    startExpiryWorker();
    console.log('   ✅ Booking expiry worker started');

    // 보증금 사전승인 워커
    startDepositPreauthWorker();
    console.log('   ✅ Deposit preauth worker started');
  } catch (error) {
    console.error('   ❌ Failed to start workers:', error);
  }

  console.log('');

  // HTTP 서버 시작
  httpServer.listen(PORT, HOST, () => {
    console.log('\n🎉 ===== Booking System Server Ready =====');
    console.log(`✅ API Server: http://${HOST}:${PORT}`);
    console.log(`✅ Socket.IO: http://${HOST}:${PORT}/socket.io`);
    console.log(`✅ Health Check: http://${HOST}:${PORT}/health`);
    console.log('✅ Background Workers: Active');
    console.log('=========================================\n');
  });

  // 통계 출력 (60초마다)
  setInterval(() => {
    const expiryStats = getExpiryMetrics();
    const preauthStats = getDepositPreauthMetrics();
    const realtimeStats = realtimeServer.getMetrics();

    console.log('\n📊 [Server Stats]');
    console.log('   Realtime Connections:', realtimeStats.connections);
    console.log('   Broadcasts:', realtimeStats.broadcasts);
    console.log('   Expiry Worker:', {
      totalExpired: expiryStats.totalExpired,
      totalCleaned: expiryStats.totalCleaned,
      successRate: (expiryStats.successRate * 100).toFixed(1) + '%'
    });
    console.log('   Preauth Worker:', {
      totalAttempts: preauthStats.totalAttempts,
      successRate: (preauthStats.successRate * 100).toFixed(1) + '%'
    });
  }, 60000);
}

// Setup all routes - called after modules are loaded
function setupRoutes() {
  // 요청 로깅
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // 헬스 체크
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      workers: {
        expiry: getExpiryMetrics(),
        preauth: getDepositPreauthMetrics()
      },
      realtime: realtimeServer.getMetrics()
    });
  });

  // 예약 생성 (Lock 사용)
  app.post('/api/bookings/create', idempotencyMiddleware, async (req, res) => {
    try {
      const result = await createBookingAPI.createBookingWithLock(req.body);

      if (result.success) {
        res.status(201).json(result);
      } else {
        const statusCode = result.code === 'LOCK_FAILED' ? 409 : 400;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Booking creation error:', error);
      res.status(500).json({
        success: false,
        message: '예약 생성 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      });
    }
  });

  // 반납 검수
  app.post('/api/bookings/return-inspect', idempotencyMiddleware, async (req, res) => {
    try {
      const result = await returnInspectAPI.handleReturnInspection(req.body);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Return inspection error:', error);
      res.status(500).json({
        success: false,
        message: '반납 검수 중 오류가 발생했습니다.'
      });
    }
  });

  // Toss Payments 웹훅
  app.post('/api/payments/webhook', async (req, res) => {
    await webhookAPI.handleTossWebhook(req as any, res as any);
  });

  // 결제 승인
  app.post('/api/payments/confirm', async (req, res) => {
    try {
      const result = await paymentConfirmAPI.confirmPayment(req.body);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Payment confirm error:', error);
      res.status(500).json({
        success: false,
        message: '결제 승인 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      });
    }
  });

  // 결제 실패 처리
  app.post('/api/payments/fail', async (req, res) => {
    try {
      const { orderId, reason } = req.body;
      const result = await paymentConfirmAPI.handlePaymentFailure(orderId, reason);

      res.status(200).json(result);
    } catch (error) {
      console.error('❌ [API] Payment fail handler error:', error);
      res.status(500).json({
        success: false,
        message: '결제 실패 처리 중 오류가 발생했습니다.'
      });
    }
  });

  // 숙박 관련 API
  // 숙박업체 목록
  app.get('/api/lodging', async (req, res) => {
    try {
      const filters = {
        vendor_id: req.query.vendor_id ? parseInt(req.query.vendor_id as string) : undefined,
        type: req.query.type as string,
        city: req.query.city as string,
        is_active: req.query.is_active === 'true',
        is_verified: req.query.is_verified === 'true',
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const result = await lodgingAPI.getLodgings(filters);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get lodgings error:', error);
      res.status(500).json({ success: false, message: '숙박업체 조회 실패' });
    }
  });

  // 숙박업체 상세
  app.get('/api/lodging/:id', async (req, res) => {
    try {
      const result = await lodgingAPI.getLodgingById(parseInt(req.params.id));

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Get lodging error:', error);
      res.status(500).json({ success: false, message: '숙박업체 조회 실패' });
    }
  });

  // 숙박업체 생성
  app.post('/api/lodging', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const result = await lodgingAPI.createLodging(req.body, parseInt(userId as string));

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Create lodging error:', error);
      res.status(500).json({ success: false, message: '숙박업체 생성 실패' });
    }
  });

  // 객실 목록
  app.get('/api/lodging/:lodgingId/rooms', async (req, res) => {
    try {
      const result = await lodgingAPI.getRooms(parseInt(req.params.lodgingId));
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get rooms error:', error);
      res.status(500).json({ success: false, message: '객실 목록 조회 실패' });
    }
  });

  // 객실 생성
  app.post('/api/lodging/rooms', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const result = await lodgingAPI.createRoom(req.body, parseInt(userId as string));

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Create room error:', error);
      res.status(500).json({ success: false, message: '객실 생성 실패' });
    }
  });

  // 숙박 예약 생성
  app.post('/api/lodging/bookings', idempotencyMiddleware, async (req, res) => {
    try {
      const result = await lodgingAPI.createBooking(req.body);

      if (result.success) {
        res.status(201).json(result);
      } else {
        const statusCode = result.code === 'LOCK_FAILED' ? 409 : 400;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Create lodging booking error:', error);
      res.status(500).json({
        success: false,
        message: '예약 생성 중 오류가 발생했습니다.'
      });
    }
  });

  // 숙박 예약 목록
  app.get('/api/lodging/bookings', async (req, res) => {
    try {
      const filters = {
        lodging_id: req.query.lodging_id ? parseInt(req.query.lodging_id as string) : undefined,
        vendor_id: req.query.vendor_id ? parseInt(req.query.vendor_id as string) : undefined,
        user_id: req.query.user_id ? parseInt(req.query.user_id as string) : undefined,
        status: req.query.status as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const result = await lodgingAPI.getBookings(filters);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get lodging bookings error:', error);
      res.status(500).json({ success: false, message: '예약 목록 조회 실패' });
    }
  });

  // ===== 배너 관리 API =====

  // 활성 배너 목록 (공개용)
  app.get('/api/banners', async (_req, res) => {
    try {
      const result = await bannerAPI.getActiveBanners();
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get banners error:', error);
      res.status(500).json({ success: false, message: '배너 목록 조회 실패' });
    }
  });

  // 전체 배너 목록 (관리자용)
  app.get('/api/admin/banners', async (_req, res) => {
    try {
      const result = await bannerAPI.getAllBanners();
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get all banners error:', error);
      res.status(500).json({ success: false, message: '배너 목록 조회 실패' });
    }
  });

  // 배너 단일 조회
  app.get('/api/admin/banners/:id', async (req, res) => {
    try {
      const result = await bannerAPI.getBannerById(parseInt(req.params.id));
      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Get banner error:', error);
      res.status(500).json({ success: false, message: '배너 조회 실패' });
    }
  });

  // 배너 생성
  app.post('/api/admin/banners', async (req, res) => {
    try {
      const result = await bannerAPI.createBanner(req.body);
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Create banner error:', error);
      res.status(500).json({ success: false, message: '배너 생성 실패' });
    }
  });

  // 배너 수정
  app.put('/api/admin/banners/:id', async (req, res) => {
    try {
      const result = await bannerAPI.updateBanner(parseInt(req.params.id), req.body);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Update banner error:', error);
      res.status(500).json({ success: false, message: '배너 수정 실패' });
    }
  });

  // 배너 삭제
  app.delete('/api/admin/banners/:id', async (req, res) => {
    try {
      const result = await bannerAPI.deleteBanner(parseInt(req.params.id));
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Delete banner error:', error);
      res.status(500).json({ success: false, message: '배너 삭제 실패' });
    }
  });

  // 배너 순서 변경
  app.post('/api/admin/banners/reorder', async (req, res) => {
    try {
      const result = await bannerAPI.reorderBanners(req.body.banners);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Reorder banners error:', error);
      res.status(500).json({ success: false, message: '배너 순서 변경 실패' });
    }
  });

  // ===== 액티비티 관리 API =====

  // 활성 액티비티 목록 (공개용)
  app.get('/api/activities', async (_req, res) => {
    try {
      const result = await activityAPI.getActiveActivities();
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get activities error:', error);
      res.status(500).json({ success: false, message: '액티비티 목록 조회 실패' });
    }
  });

  // 전체 액티비티 목록 (관리자용)
  app.get('/api/admin/activities', async (_req, res) => {
    try {
      const result = await activityAPI.getAllActivities();
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get all activities error:', error);
      res.status(500).json({ success: false, message: '액티비티 목록 조회 실패' });
    }
  });

  // 액티비티 단일 조회
  app.get('/api/admin/activities/:id', async (req, res) => {
    try {
      const result = await activityAPI.getActivityById(parseInt(req.params.id));
      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Get activity error:', error);
      res.status(500).json({ success: false, message: '액티비티 조회 실패' });
    }
  });

  // 액티비티 생성
  app.post('/api/admin/activities', async (req, res) => {
    try {
      const result = await activityAPI.createActivity(req.body);
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Create activity error:', error);
      res.status(500).json({ success: false, message: '액티비티 생성 실패' });
    }
  });

  // 액티비티 수정
  app.put('/api/admin/activities/:id', async (req, res) => {
    try {
      const result = await activityAPI.updateActivity(parseInt(req.params.id), req.body);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Update activity error:', error);
      res.status(500).json({ success: false, message: '액티비티 수정 실패' });
    }
  });

  // 액티비티 삭제
  app.delete('/api/admin/activities/:id', async (req, res) => {
    try {
      const result = await activityAPI.deleteActivity(parseInt(req.params.id));
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Delete activity error:', error);
      res.status(500).json({ success: false, message: '액티비티 삭제 실패' });
    }
  });

  // 액티비티 순서 변경
  app.post('/api/admin/activities/reorder', async (req, res) => {
    try {
      const result = await activityAPI.reorderActivities(req.body.activities);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Reorder activities error:', error);
      res.status(500).json({ success: false, message: '액티비티 순서 변경 실패' });
    }
  });

  // ===== 뉴스레터 API =====

  // 이메일 구독 (공개 API)
  app.post('/api/newsletter/subscribe', async (req, res) => {
    try {
      const { email } = req.body;
      const result = await newsletterAPI.subscribeEmail(email);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Newsletter subscribe error:', error);
      res.status(500).json({ success: false, error: '구독 처리 중 오류가 발생했습니다.' });
    }
  });

  // 이메일 구독 취소 (공개 API)
  app.post('/api/newsletter/unsubscribe', async (req, res) => {
    try {
      const { email } = req.body;
      const result = await newsletterAPI.unsubscribeEmail(email);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Newsletter unsubscribe error:', error);
      res.status(500).json({ success: false, error: '구독 취소 중 오류가 발생했습니다.' });
    }
  });

  // 전체 구독자 목록 (관리자용)
  app.get('/api/admin/newsletter/subscribers', async (_req, res) => {
    try {
      const result = await newsletterAPI.getAllSubscribers();
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get subscribers error:', error);
      res.status(500).json({ success: false, error: '구독자 목록 조회 실패' });
    }
  });

  // 활성 구독자 목록 (관리자용)
  app.get('/api/admin/newsletter/subscribers/active', async (_req, res) => {
    try {
      const result = await newsletterAPI.getActiveSubscribers();
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get active subscribers error:', error);
      res.status(500).json({ success: false, error: '활성 구독자 목록 조회 실패' });
    }
  });

  // 구독자 삭제 (관리자용)
  app.delete('/api/admin/newsletter/subscribers/:id', async (req, res) => {
    try {
      const result = await newsletterAPI.deleteSubscriber(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Delete subscriber error:', error);
      res.status(500).json({ success: false, error: '구독자 삭제 실패' });
    }
  });

  // 캠페인 목록 (관리자용)
  app.get('/api/admin/newsletter/campaigns', async (_req, res) => {
    try {
      const result = await newsletterAPI.getAllCampaigns();
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get campaigns error:', error);
      res.status(500).json({ success: false, error: '캠페인 목록 조회 실패' });
    }
  });

  // 캠페인 생성 (관리자용)
  app.post('/api/admin/newsletter/campaigns', async (req, res) => {
    try {
      const result = await newsletterAPI.createCampaign(req.body);
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Create campaign error:', error);
      res.status(500).json({ success: false, error: '캠페인 생성 실패' });
    }
  });

  // 캠페인 발송 (관리자용)
  app.post('/api/admin/newsletter/campaigns/:id/send', async (req, res) => {
    try {
      const result = await newsletterAPI.sendCampaign(parseInt(req.params.id));
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Send campaign error:', error);
      res.status(500).json({ success: false, error: '캠페인 발송 실패' });
    }
  });

  // 캠페인 삭제 (관리자용)
  app.delete('/api/admin/newsletter/campaigns/:id', async (req, res) => {
    try {
      const result = await newsletterAPI.deleteCampaign(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Delete campaign error:', error);
      res.status(500).json({ success: false, error: '캠페인 삭제 실패' });
    }
  });

  // 404 핸들러
  app.use((req, res) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`
    });
  });

  // 에러 핸들러
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('❌ [API] Unhandled error:', err);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal server error'
    });
  });
}

// ===== Graceful Shutdown =====

const shutdown = async () => {
  console.log('\n👋 [Server] Shutting down gracefully...');

  // 워커 정리 (cron이 자동으로 정리됨)
  console.log('   - Stopping workers...');

  // 실시간 서버 종료
  if (realtimeServer) {
    console.log('   - Closing realtime server...');
    await realtimeServer.shutdown();
  }

  // HTTP 서버 종료
  console.log('   - Closing HTTP server...');
  httpServer.close(() => {
    console.log('✅ [Server] Shutdown complete');
    process.exit(0);
  });

  // 강제 종료 타임아웃 (10초)
  setTimeout(() => {
    console.error('⚠️  [Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// 예외 처리
process.on('uncaughtException', (error) => {
  console.error('❌ [Server] Uncaught Exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

// 서버 시작
startServer().catch((error) => {
  console.error('❌ [Server] Failed to start:', error);
  process.exit(1);
});
