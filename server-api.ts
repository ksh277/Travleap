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
import { authenticate, requireRole, optionalAuth } from './middleware/authenticate.js';

const PORT = parseInt(process.env.PORT || '3004', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Express 앱 생성
const app = express();
const httpServer = createServer(app);

// 미들웨어
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com'] // TODO: 실제 프로덕션 도메인으로 변경
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3004'],
  credentials: true
}));
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
let startPMSScheduler: any;
let startLodgingExpiryWorker: any;
let getLodgingExpiryMetrics: any;
let startLodgingPMSScheduler: any;

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
    databaseModule,
    pmsSchedulerModule,
    lodgingExpiryWorkerModule,
    lodgingPMSSchedulerModule
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
    import('./utils/database.js'),
    import('./services/pms-scheduler'),
    import('./services/jobs/lodgingExpiry.worker'),
    import('./services/pms-scheduler-lodging')
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
  startPMSScheduler = pmsSchedulerModule.startPMSScheduler;
  startLodgingExpiryWorker = lodgingExpiryWorkerModule.startLodgingExpiryWorker;
  getLodgingExpiryMetrics = lodgingExpiryWorkerModule.getLodgingExpiryMetrics;
  startLodgingPMSScheduler = lodgingPMSSchedulerModule.startLodgingPMSScheduler;

  const { db } = databaseModule;

  console.log('✅ [Server] Modules loaded\n');

  // Database 초기화 (dotenv 이후)
  console.log('💾 [Server] Initializing database...');
  await db.initializeIfEmpty().catch((err: Error) => {
    console.warn('⚠️  [Server] Database initialization failed:', err.message);
  });

  // Run missing tables migration
  const { runMissingTablesMigration } = await import('./scripts/add-missing-tables-migration.js');
  await runMissingTablesMigration().catch((err: Error) => {
    console.warn('⚠️  [Server] Missing tables migration failed:', err.message);
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

    // PMS 자동 동기화 스케줄러 (렌트카)
    startPMSScheduler();
    console.log('   ✅ PMS auto-sync scheduler started (rentcar)');

    // 숙박 HOLD 만료 워커
    startLodgingExpiryWorker();
    console.log('   ✅ Lodging expiry worker started');

    // 숙박 PMS 자동 동기화 스케줄러
    startLodgingPMSScheduler();
    console.log('   ✅ Lodging PMS auto-sync scheduler started');
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

  // ===== 카테고리 API =====

  // 카테고리 목록 조회
  app.get('/api/categories', async (_req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const categories = await db.query('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC');

      res.json({
        success: true,
        categories: categories || []
      });
    } catch (error) {
      console.error('❌ [API] Get categories error:', error);
      res.status(500).json({ success: false, message: '카테고리 조회 실패', categories: [] });
    }
  });

  // ===== 상품 목록 API =====

  // 상품 목록 조회 (공개용, 카테고리 필터 지원)
  app.get('/api/listings', async (req, res) => {
    try {
      // 필터 파라미터
      const category = req.query.category as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const sortBy = req.query.sortBy as string || 'popular';
      const search = req.query.search as string;
      const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined;
      const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined;
      const rating = req.query.rating ? parseFloat(req.query.rating as string) : undefined;

      const offset = (page - 1) * limit;

      // 데이터베이스 동적 import
      const { db } = await import('./utils/database.js');

      // 기본 쿼리
      let sql = `
        SELECT l.*, c.slug as category_slug, c.name_ko as category_name
        FROM listings l
        LEFT JOIN categories c ON l.category_id = c.id
        WHERE l.is_published = 1 AND l.is_active = 1
      `;
      const params: any[] = [];

      // 카테고리 필터
      if (category && category !== 'all') {
        sql += ' AND c.slug = ?';
        params.push(category);
      }

      // 가격 필터
      if (minPrice !== undefined) {
        sql += ' AND l.price_from >= ?';
        params.push(minPrice);
      }
      if (maxPrice !== undefined) {
        sql += ' AND l.price_from <= ?';
        params.push(maxPrice);
      }

      // 평점 필터
      if (rating !== undefined) {
        sql += ' AND l.rating_avg >= ?';
        params.push(rating);
      }

      // 검색어
      if (search) {
        sql += ' AND (l.title LIKE ? OR l.short_description LIKE ? OR l.location LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // 정렬
      switch (sortBy) {
        case 'price':
          sql += ' ORDER BY l.price_from ASC';
          break;
        case 'rating':
          sql += ' ORDER BY l.rating_avg DESC';
          break;
        case 'newest':
        case 'latest':
          sql += ' ORDER BY l.created_at DESC';
          break;
        case 'popular':
        default:
          sql += ' ORDER BY l.view_count DESC, l.booking_count DESC';
          break;
      }

      // 페이징
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const listings = await db.query(sql, params);

      res.json({
        success: true,
        data: listings || [],
        page,
        limit,
        total: (listings || []).length
      });
    } catch (error) {
      console.error('❌ [API] Get listings error:', error);
      res.status(500).json({ success: false, message: '상품 목록 조회 실패', data: [] });
    }
  });

  // 상품 상세 조회 (공개용)
  app.get('/api/listings/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { db } = await import('./utils/database.js');

      const listings = await db.query(`
        SELECT l.*, c.slug as category_slug, c.name_ko as category_name
        FROM listings l
        LEFT JOIN categories c ON l.category_id = c.id
        WHERE l.id = ? AND l.is_published = 1 AND l.is_active = 1
      `, [id]);

      if (!listings || listings.length === 0) {
        return res.status(404).json({ success: false, message: '상품을 찾을 수 없습니다' });
      }

      res.json({
        success: true,
        data: listings[0]
      });
    } catch (error) {
      console.error('❌ [API] Get listing error:', error);
      res.status(500).json({ success: false, message: '상품 조회 실패' });
    }
  });

  // ===== 리뷰 API =====

  // 최근 리뷰 조회
  app.get('/api/reviews/recent', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 4;
      const { db } = await import('./utils/database.js');

      const reviews = await db.query(`
        SELECT r.*, l.title as listing_title, u.email as user_email
        FROM reviews r
        LEFT JOIN listings l ON r.listing_id = l.id
        LEFT JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
        LIMIT ?
      `, [limit]);

      res.json({
        success: true,
        data: reviews || []
      });
    } catch (error) {
      console.error('❌ [API] Get recent reviews error:', error);
      res.status(500).json({ success: false, message: '리뷰 조회 실패', data: [] });
    }
  });

  // ===== 사용자 관리 API =====

  // 사용자 목록 조회 (Admin Dashboard용) - 인증 필수
  app.get('/api/users', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const users = await db.query(`
        SELECT id, email, name, role, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
      `);

      res.json({
        success: true,
        users: users || []
      });
    } catch (error) {
      console.error('❌ [API] Get users error:', error);
      res.status(500).json({ success: false, message: '사용자 목록 조회 실패', users: [] });
    }
  });

  // ===== 블로그 관리 API =====

  // 블로그 목록 조회 (Admin Dashboard용) - 인증 필수
  app.get('/api/blogs', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const blogs = await db.query(`
        SELECT id, title, slug, author, excerpt, content_md,
               featured_image, category, tags, is_published,
               view_count, created_at, updated_at
        FROM blog_posts
        ORDER BY created_at DESC
      `);

      res.json({
        success: true,
        blogs: blogs || []
      });
    } catch (error) {
      console.error('❌ [API] Get blogs error:', error);
      res.status(500).json({ success: false, message: '블로그 목록 조회 실패', blogs: [] });
    }
  });

  // ===== 문의 관리 API =====

  // 문의 목록 조회 (Admin Dashboard용) - 인증 필수
  app.get('/api/contacts', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const contacts = await db.query(`
        SELECT id, name, email, phone, subject, message,
               status, created_at, updated_at
        FROM contact_inquiries
        ORDER BY created_at DESC
      `);

      res.json({
        success: true,
        contacts: contacts || []
      });
    } catch (error) {
      console.error('❌ [API] Get contacts error:', error);
      res.status(500).json({ success: false, message: '문의 목록 조회 실패', contacts: [] });
    }
  });

  // ===== 주문 관리 API =====

  // 주문 목록 조회 (Admin Dashboard용) - 인증 필수
  app.get('/api/orders', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      // payments 테이블에서 cart 주문만 필터링
      const payments = await db.query(`
        SELECT * FROM payments
        ORDER BY created_at DESC
      `);

      // cart 주문만 필터링
      const orders = (payments || []).filter((p: any) => {
        try {
          let notes = {};
          if (p.notes) {
            notes = typeof p.notes === 'string' ? JSON.parse(p.notes) : p.notes;
          }
          return (notes as any).orderType === 'cart';
        } catch (e) {
          return false;
        }
      });

      res.json({
        success: true,
        orders: orders
      });
    } catch (error) {
      console.error('❌ [API] Get orders error:', error);
      res.status(500).json({ success: false, message: '주문 목록 조회 실패', orders: [] });
    }
  });

  // ===== 파트너 신청/관리 API =====

  // 파트너 신청 제출 (공개 - 누구나 신청 가능)
  app.post('/api/partners/apply', async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const applicationData = req.body;

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(applicationData.email)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_EMAIL',
          message: '올바른 이메일 형식이 아닙니다.'
        });
      }

      // 전화번호 형식 검증 (010-1234-5678 또는 01012345678)
      const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
      if (!phoneRegex.test(applicationData.phone)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PHONE',
          message: '올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)'
        });
      }

      // 필수 필드 검증
      const requiredFields = ['businessName', 'contactName', 'email', 'phone', 'businessNumber'];
      for (const field of requiredFields) {
        if (!applicationData[field]) {
          return res.status(400).json({
            success: false,
            error: 'MISSING_FIELD',
            message: `필수 항목이 누락되었습니다: ${field}`
          });
        }
      }

      // 중복 신청 체크 (이메일 기준)
      const existing = await db.query(
        `SELECT id FROM partners WHERE email = ? LIMIT 1`,
        [applicationData.email]
      );

      if (existing && existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'DUPLICATE_APPLICATION',
          message: '이미 신청된 이메일입니다.'
        });
      }

      // 파트너 신청 저장 (status: pending)
      await db.execute(`
        INSERT INTO partners (
          business_name, contact_name, email, phone, business_number,
          address, location, description, services, website, instagram,
          status, tier, is_verified, is_featured,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'free', 0, 0, NOW(), NOW())
      `, [
        applicationData.businessName,
        applicationData.contactName,
        applicationData.email,
        applicationData.phone,
        applicationData.businessNumber,
        applicationData.address || null,
        applicationData.location || null,
        applicationData.description || null,
        applicationData.services ? JSON.stringify(applicationData.services.split(',').map((s: string) => s.trim())) : null,
        applicationData.website || null,
        applicationData.instagram || null
      ]);

      res.json({
        success: true,
        message: '파트너 신청이 완료되었습니다. 관리자 승인 후 서비스 이용이 가능합니다.'
      });
    } catch (error) {
      console.error('❌ [API] Partner application error:', error);
      res.status(500).json({
        success: false,
        message: '파트너 신청 중 오류가 발생했습니다.'
      });
    }
  });

  // 파트너 신청 목록 조회 (관리자 전용)
  app.get('/api/admin/partners/applications', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const { status } = req.query;

      let sql = `
        SELECT id, business_name, contact_name, email, phone, business_number,
               address, location, description, services, website, instagram,
               status, tier, is_verified, is_featured, created_at, updated_at
        FROM partners
      `;

      const params: any[] = [];

      if (status) {
        sql += ` WHERE status = ?`;
        params.push(status);
      }

      sql += ` ORDER BY created_at DESC`;

      const applications = await db.query(sql, params);

      res.json({
        success: true,
        data: applications || [],
        total: applications?.length || 0
      });
    } catch (error) {
      console.error('❌ [API] Get partner applications error:', error);
      res.status(500).json({
        success: false,
        message: '파트너 신청 목록 조회 실패'
      });
    }
  });

  // 파트너 신청 승인/거절 (관리자 전용)
  app.patch('/api/admin/partners/:id/status', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const { id } = req.params;
      const { status, reason } = req.body; // status: 'approved' | 'rejected'

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATUS',
          message: 'status는 approved 또는 rejected여야 합니다.'
        });
      }

      // 파트너 상태 업데이트
      await db.execute(`
        UPDATE partners
        SET status = ?, updated_at = NOW()
        WHERE id = ?
      `, [status, id]);

      // TODO: 이메일 알림 발송 (승인/거절 통지)

      res.json({
        success: true,
        message: status === 'approved' ? '파트너 신청이 승인되었습니다.' : '파트너 신청이 거절되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update partner status error:', error);
      res.status(500).json({
        success: false,
        message: '파트너 상태 업데이트 실패'
      });
    }
  });

  // 벤더(렌트카업체) 임시 계정 생성 (관리자 전용)
  app.post('/api/admin/vendors/create-account', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const { email, businessName, contactName, phone } = req.body;
      const bcrypt = require('bcrypt');

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_EMAIL',
          message: '올바른 이메일 형식이 아닙니다.'
        });
      }

      // 전화번호 형식 검증
      const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
      if (phone && !phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PHONE',
          message: '올바른 전화번호 형식이 아닙니다.'
        });
      }

      // 중복 계정 체크
      const existing = await db.query(
        `SELECT id FROM users WHERE email = ? LIMIT 1`,
        [email]
      );

      if (existing && existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'DUPLICATE_EMAIL',
          message: '이미 존재하는 이메일입니다.'
        });
      }

      // 임시 비밀번호 생성 (8자리 랜덤)
      const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

      // 비밀번호 해싱 (실제 bcrypt 사용)
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // 벤더 계정 생성 (role: vendor)
      const result = await db.execute(`
        INSERT INTO users (email, password_hash, name, role, phone, created_at, updated_at)
        VALUES (?, ?, ?, 'vendor', ?, NOW(), NOW())
      `, [email, hashedPassword, contactName || businessName, phone || null]);

      const userId = result.insertId;

      // TODO: 이메일 발송 (임시 비밀번호 안내)
      console.log(`🔑 벤더 임시 계정 생성 완료`);
      console.log(`   이메일: ${email}`);
      console.log(`   임시 비밀번호: ${tempPassword}`);
      console.log(`   ⚠️ 이 비밀번호는 로그에만 표시되며, 실제로는 이메일로 발송되어야 합니다.`);

      res.json({
        success: true,
        message: '벤더 계정이 생성되었습니다.',
        data: {
          userId,
          email,
          tempPassword, // ⚠️ Production에서는 이메일로만 발송, API 응답에 포함 X
          name: contactName || businessName
        }
      });
    } catch (error) {
      console.error('❌ [API] Create vendor account error:', error);
      res.status(500).json({
        success: false,
        message: '벤더 계정 생성 실패'
      });
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
  app.get('/api/admin/banners', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const result = await bannerAPI.getAllBanners();
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get all banners error:', error);
      res.status(500).json({ success: false, message: '배너 목록 조회 실패' });
    }
  });

  // 배너 단일 조회
  app.get('/api/admin/banners/:id', authenticate, requireRole('admin'), async (req, res) => {
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
  app.post('/api/admin/banners', authenticate, requireRole('admin'), async (req, res) => {
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
  app.put('/api/admin/banners/:id', authenticate, requireRole('admin'), async (req, res) => {
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
  app.delete('/api/admin/banners/:id', authenticate, requireRole('admin'), async (req, res) => {
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
  app.post('/api/admin/banners/reorder', authenticate, requireRole('admin'), async (req, res) => {
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
  app.get('/api/admin/activities', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const result = await activityAPI.getAllActivities();
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get all activities error:', error);
      res.status(500).json({ success: false, message: '액티비티 목록 조회 실패' });
    }
  });

  // 액티비티 단일 조회
  app.get('/api/admin/activities/:id', authenticate, requireRole('admin'), async (req, res) => {
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
  app.post('/api/admin/activities', authenticate, requireRole('admin'), async (req, res) => {
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
  app.put('/api/admin/activities/:id', authenticate, requireRole('admin'), async (req, res) => {
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
  app.delete('/api/admin/activities/:id', authenticate, requireRole('admin'), async (req, res) => {
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
  app.post('/api/admin/activities/reorder', authenticate, requireRole('admin'), async (req, res) => {
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

  // ===== 업체/파트너 등록 API =====

  // 렌트카 업체 등록
  app.post('/api/rentcar/vendor-register', async (req, res) => {
    try {
      const { registerVendor } = await import('./api/rentcar/vendor-register.js');
      const result = await registerVendor(req.body);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Vendor registration error:', error);
      res.status(500).json({
        success: false,
        message: '업체 등록 신청 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      });
    }
  });

  // 업체 목록 조회 (관리자용)
  app.get('/api/vendors', async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const status = req.query.status as string;

      let sql = `
        SELECT v.*, u.email as account_email, u.name as account_name
        FROM rentcar_vendors v
        LEFT JOIN users u ON v.user_id = u.id
      `;
      const params: any[] = [];

      if (status) {
        sql += ' WHERE v.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY v.created_at DESC';

      const vendors = await db.query(sql, params);

      res.json({
        success: true,
        data: vendors || []
      });
    } catch (error) {
      console.error('❌ [API] Get vendors error:', error);
      res.status(500).json({ success: false, message: '업체 목록 조회 실패', data: [] });
    }
  });

  // 업체 상세 조회
  app.get('/api/vendors/:id', async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const id = parseInt(req.params.id);

      const vendors = await db.query(`
        SELECT v.*, u.email as account_email, u.name as account_name
        FROM rentcar_vendors v
        LEFT JOIN users u ON v.user_id = u.id
        WHERE v.id = ?
      `, [id]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체를 찾을 수 없습니다' });
      }

      res.json({
        success: true,
        data: vendors[0]
      });
    } catch (error) {
      console.error('❌ [API] Get vendor error:', error);
      res.status(500).json({ success: false, message: '업체 조회 실패' });
    }
  });

  // 업체 승인 (관리자용)
  app.post('/api/vendors/:id/approve', async (req, res) => {
    try {
      const { approveVendor } = await import('./api/rentcar/vendor-register.js');
      const id = parseInt(req.params.id);

      const result = await approveVendor(id);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Approve vendor error:', error);
      res.status(500).json({ success: false, message: '업체 승인 중 오류가 발생했습니다.' });
    }
  });

  // 업체 정보 수정
  app.put('/api/vendors/:id', async (req, res) => {
    try {
      const { updateVendorInfo } = await import('./api/rentcar/vendor-register.js');
      const vendorId = parseInt(req.params.id);
      const userId = req.body.userId || req.headers['x-user-id'];

      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const result = await updateVendorInfo(vendorId, parseInt(userId as string), req.body);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Update vendor error:', error);
      res.status(500).json({ success: false, message: '업체 정보 수정 실패' });
    }
  });

  // 파트너 목록 조회 (공개용 - 승인된 파트너만)
  app.get('/api/partners', async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const category = req.query.category as string;

      let sql = `
        SELECT * FROM partners
        WHERE status = 'approved' AND is_active = 1
      `;
      const params: any[] = [];

      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }

      sql += ' ORDER BY sort_order ASC, created_at DESC';

      const partners = await db.query(sql, params);

      res.json({
        success: true,
        data: partners || []
      });
    } catch (error) {
      console.error('❌ [API] Get partners error:', error);
      res.status(500).json({ success: false, message: '파트너 목록 조회 실패', data: [] });
    }
  });

  // 파트너 상세 조회
  app.get('/api/partners/:id', async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const id = parseInt(req.params.id);

      const partners = await db.query(`
        SELECT * FROM partners WHERE id = ?
      `, [id]);

      if (!partners || partners.length === 0) {
        return res.status(404).json({ success: false, message: '파트너를 찾을 수 없습니다' });
      }

      res.json({
        success: true,
        data: partners[0]
      });
    } catch (error) {
      console.error('❌ [API] Get partner error:', error);
      res.status(500).json({ success: false, message: '파트너 조회 실패' });
    }
  });

  // ===== Vendor 차량 관리 API =====

  // Vendor 정보 조회 (자기 업체 정보)
  app.get('/api/vendor/info', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      const vendors = await db.query(`
        SELECT * FROM rentcar_vendors WHERE user_id = ? LIMIT 1
      `, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      res.json({
        success: true,
        data: vendors[0]
      });
    } catch (error) {
      console.error('❌ [API] Get vendor info error:', error);
      res.status(500).json({ success: false, message: '업체 정보 조회 실패' });
    }
  });

  // Vendor 정보 수정 (자기 업체 정보)
  app.put('/api/vendor/info', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;
      const { name, contact_person, contact_email, contact_phone, address } = req.body;

      // 업체 정보 업데이트
      await db.execute(`
        UPDATE rentcar_vendors
        SET name = ?, contact_person = ?, contact_email = ?, contact_phone = ?, address = ?
        WHERE id = ?
      `, [name, contact_person, contact_email, contact_phone, address, vendorId]);

      res.json({
        success: true,
        message: '업체 정보가 수정되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update vendor info error:', error);
      res.status(500).json({ success: false, message: '업체 정보 수정 실패' });
    }
  });

  // Vendor 차량 목록 조회
  app.get('/api/vendor/vehicles', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // 먼저 vendor_id 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      // 차량 목록 조회
      const vehicles = await db.query(`
        SELECT * FROM rentcar_vehicles
        WHERE vendor_id = ?
        ORDER BY created_at DESC
      `, [vendorId]);

      res.json({
        success: true,
        data: vehicles || []
      });
    } catch (error) {
      console.error('❌ [API] Get vendor vehicles error:', error);
      res.status(500).json({ success: false, message: '차량 목록 조회 실패', data: [] });
    }
  });

  // Vendor 차량 등록
  app.post('/api/vendor/vehicles', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      const {
        display_name,
        vehicle_class,
        seating_capacity,
        transmission_type,
        fuel_type,
        daily_rate_krw,
        weekly_rate_krw,
        monthly_rate_krw,
        mileage_limit_km,
        excess_mileage_fee_krw,
        is_available,
        image_urls,
        insurance_included,
        insurance_options,
        available_options,
        pickup_location,
        dropoff_location,
        min_rental_days,
        max_rental_days,
        instant_booking
      } = req.body;

      const imagesJson = JSON.stringify(image_urls && image_urls.length > 0
        ? image_urls
        : [
            'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop'
          ]
      );

      // rentcar_vehicles 테이블에 삽입
      await db.execute(`
        INSERT INTO rentcar_vehicles (
          vendor_id, display_name, vehicle_class, seating_capacity,
          transmission_type, fuel_type, daily_rate_krw, weekly_rate_krw,
          monthly_rate_krw, mileage_limit_km, excess_mileage_fee_krw,
          is_available, images, insurance_included, insurance_options,
          available_options, pickup_location, dropoff_location, min_rental_days,
          max_rental_days, instant_booking, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendorId,
        display_name,
        vehicle_class,
        seating_capacity,
        transmission_type,
        fuel_type,
        daily_rate_krw,
        weekly_rate_krw,
        monthly_rate_krw,
        mileage_limit_km,
        excess_mileage_fee_krw,
        is_available ? 1 : 0,
        imagesJson,
        insurance_included ? 1 : 0,
        insurance_options || '',
        available_options || '',
        pickup_location || '',
        dropoff_location || '',
        min_rental_days || 1,
        max_rental_days || 30,
        instant_booking ? 1 : 0
      ]);

      // listings 테이블에도 삽입
      const categoryResult = await db.query(`SELECT id FROM categories WHERE slug = 'rentcar' LIMIT 1`);
      const categoryId = categoryResult?.[0]?.id || 5;

      await db.execute(`
        INSERT INTO listings (
          partner_id, category_id, title, short_description, description_md,
          price_from, price_to, location, duration, max_capacity,
          is_published, is_active, is_featured, images, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, ?, NOW(), NOW())
      `, [
        vendorId,
        categoryId,
        display_name,
        `${vehicle_class} / ${transmission_type} / ${fuel_type} / ${seating_capacity}인승`,
        `### 차량 정보\n- 차종: ${vehicle_class}\n- 변속기: ${transmission_type}\n- 연료: ${fuel_type}\n- 정원: ${seating_capacity}명\n- 주행거리 제한: ${mileage_limit_km}km/일\n\n### 요금 정보\n- 1일: ₩${daily_rate_krw?.toLocaleString()}\n- 주간: ₩${weekly_rate_krw?.toLocaleString()}\n- 월간: ₩${monthly_rate_krw?.toLocaleString()}\n- 초과 주행료: ₩${excess_mileage_fee_krw}/km\n\n### 보험 정보\n- 보험 포함: ${insurance_included ? '포함' : '별도'}\n- 보험 옵션: ${insurance_options}\n\n### 차량 옵션\n${available_options}`,
        daily_rate_krw,
        monthly_rate_krw,
        '신안군, 전라남도',
        '1일~',
        seating_capacity,
        imagesJson
      ]);

      res.status(201).json({
        success: true,
        message: '차량이 등록되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Create vehicle error:', error);
      res.status(500).json({ success: false, message: '차량 등록 실패' });
    }
  });

  // Vendor 차량 수정
  app.put('/api/vendor/vehicles/:id', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');
      const vehicleId = parseInt(req.params.id);

      // Vendor ID 조회 및 권한 확인
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      const {
        display_name,
        vehicle_class,
        seating_capacity,
        transmission_type,
        fuel_type,
        daily_rate_krw,
        weekly_rate_krw,
        monthly_rate_krw,
        mileage_limit_km,
        excess_mileage_fee_krw,
        is_available,
        image_urls,
        insurance_included,
        insurance_options,
        available_options,
        pickup_location,
        dropoff_location,
        min_rental_days,
        max_rental_days,
        instant_booking
      } = req.body;

      const imagesJson = JSON.stringify(image_urls && image_urls.length > 0
        ? image_urls
        : [
            'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop'
          ]
      );

      // rentcar_vehicles 업데이트
      await db.execute(`
        UPDATE rentcar_vehicles
        SET display_name = ?, vehicle_class = ?, seating_capacity = ?,
            transmission_type = ?, fuel_type = ?, daily_rate_krw = ?,
            weekly_rate_krw = ?, monthly_rate_krw = ?, mileage_limit_km = ?,
            excess_mileage_fee_krw = ?, is_available = ?, images = ?,
            insurance_included = ?, insurance_options = ?, available_options = ?,
            pickup_location = ?, dropoff_location = ?, min_rental_days = ?,
            max_rental_days = ?, instant_booking = ?,
            updated_at = NOW()
        WHERE id = ? AND vendor_id = ?
      `, [
        display_name,
        vehicle_class,
        seating_capacity,
        transmission_type,
        fuel_type,
        daily_rate_krw,
        weekly_rate_krw,
        monthly_rate_krw,
        mileage_limit_km,
        excess_mileage_fee_krw,
        is_available ? 1 : 0,
        imagesJson,
        insurance_included ? 1 : 0,
        insurance_options || '',
        available_options || '',
        pickup_location || '',
        dropoff_location || '',
        min_rental_days || 1,
        max_rental_days || 30,
        instant_booking ? 1 : 0,
        vehicleId,
        vendorId
      ]);

      // listings 테이블도 업데이트
      const categoryResult = await db.query(`SELECT id FROM categories WHERE slug = 'rentcar' LIMIT 1`);
      const categoryId = categoryResult?.[0]?.id || 5;

      await db.execute(`
        UPDATE listings
        SET title = ?,
            short_description = ?,
            description_md = ?,
            price_from = ?,
            price_to = ?,
            max_capacity = ?,
            images = ?,
            is_published = ?,
            updated_at = NOW()
        WHERE partner_id = ? AND category_id = ?
          AND title = (SELECT display_name FROM rentcar_vehicles WHERE id = ?)
      `, [
        display_name,
        `${vehicle_class} / ${transmission_type} / ${fuel_type} / ${seating_capacity}인승`,
        `### 차량 정보\n- 차종: ${vehicle_class}\n- 변속기: ${transmission_type}\n- 연료: ${fuel_type}\n- 정원: ${seating_capacity}명\n- 주행거리 제한: ${mileage_limit_km}km/일\n\n### 요금 정보\n- 1일: ₩${daily_rate_krw?.toLocaleString()}\n- 주간: ₩${weekly_rate_krw?.toLocaleString()}\n- 월간: ₩${monthly_rate_krw?.toLocaleString()}\n- 초과 주행료: ₩${excess_mileage_fee_krw}/km\n\n### 보험 정보\n- 보험 포함: ${insurance_included ? '포함' : '별도'}\n- 보험 옵션: ${insurance_options}\n\n### 차량 옵션\n${available_options}`,
        daily_rate_krw,
        monthly_rate_krw,
        seating_capacity,
        imagesJson,
        is_available ? 1 : 0,
        vendorId,
        categoryId,
        vehicleId
      ]);

      res.json({
        success: true,
        message: '차량이 수정되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update vehicle error:', error);
      res.status(500).json({ success: false, message: '차량 수정 실패' });
    }
  });

  // Vendor 차량 삭제
  app.delete('/api/vendor/vehicles/:id', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');
      const vehicleId = parseInt(req.params.id);

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      // 차량 정보 조회 (listings 삭제를 위해)
      const vehicles = await db.query(`SELECT display_name FROM rentcar_vehicles WHERE id = ? AND vendor_id = ?`, [vehicleId, vendorId]);

      // rentcar_vehicles 삭제
      await db.execute(`
        DELETE FROM rentcar_vehicles WHERE id = ? AND vendor_id = ?
      `, [vehicleId, vendorId]);

      // listings 삭제
      if (vehicles && vehicles.length > 0) {
        const categoryResult = await db.query(`SELECT id FROM categories WHERE slug = 'rentcar' LIMIT 1`);
        const categoryId = categoryResult?.[0]?.id || 5;

        await db.execute(`
          DELETE FROM listings
          WHERE partner_id = ? AND title = ? AND category_id = ?
        `, [vendorId, vehicles[0].display_name, categoryId]);
      }

      res.json({
        success: true,
        message: '차량이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete vehicle error:', error);
      res.status(500).json({ success: false, message: '차량 삭제 실패' });
    }
  });

  // Vendor 차량 예약 가능/불가 토글
  app.patch('/api/vendor/vehicles/:id/availability', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');
      const vehicleId = parseInt(req.params.id);
      const { is_available } = req.body;

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      // rentcar_vehicles 업데이트
      await db.execute(`
        UPDATE rentcar_vehicles
        SET is_available = ?, updated_at = NOW()
        WHERE id = ? AND vendor_id = ?
      `, [is_available ? 1 : 0, vehicleId, vendorId]);

      // listings 테이블도 업데이트
      await db.execute(`
        UPDATE listings l
        INNER JOIN rentcar_vehicles rv ON l.title = rv.display_name
        SET l.is_published = ?
        WHERE rv.id = ? AND l.partner_id = ?
      `, [is_available ? 1 : 0, vehicleId, vendorId]);

      res.json({
        success: true,
        message: is_available ? '차량이 예약 가능으로 변경되었습니다.' : '차량이 예약 불가로 변경되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Toggle vehicle availability error:', error);
      res.status(500).json({ success: false, message: '상태 변경 실패' });
    }
  });

  // Vendor 예약 목록 조회
  app.get('/api/vendor/bookings', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      // 예약 목록 조회
      const bookings = await db.query(`
        SELECT
          b.id,
          b.listing_id as vehicle_id,
          l.title as vehicle_name,
          JSON_UNQUOTE(JSON_EXTRACT(b.customer_info, '$.name')) as customer_name,
          JSON_UNQUOTE(JSON_EXTRACT(b.customer_info, '$.phone')) as customer_phone,
          b.start_date as pickup_date,
          b.end_date as dropoff_date,
          b.total_amount,
          b.status,
          b.created_at
        FROM bookings b
        INNER JOIN listings l ON b.listing_id = l.id
        WHERE l.partner_id = ?
          AND l.category_id = (SELECT id FROM categories WHERE slug = 'rentcar' LIMIT 1)
        ORDER BY b.created_at DESC
        LIMIT 50
      `, [vendorId]);

      res.json({
        success: true,
        data: bookings || []
      });
    } catch (error) {
      console.error('❌ [API] Get vendor bookings error:', error);
      res.status(500).json({ success: false, message: '예약 목록 조회 실패', data: [] });
    }
  });

  // Vendor 매출 통계 조회
  app.get('/api/vendor/revenue', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      // 최근 7일 매출 통계
      const revenue = await db.query(`
        SELECT
          DATE(b.created_at) as date,
          SUM(b.total_amount) as revenue
        FROM bookings b
        INNER JOIN listings l ON b.listing_id = l.id
        WHERE l.partner_id = ?
          AND l.category_id = (SELECT id FROM categories WHERE slug = 'rentcar' LIMIT 1)
          AND b.status IN ('confirmed', 'completed')
          AND b.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(b.created_at)
        ORDER BY date ASC
      `, [vendorId]);

      res.json({
        success: true,
        data: revenue || []
      });
    } catch (error) {
      console.error('❌ [API] Get vendor revenue error:', error);
      res.status(500).json({ success: false, message: '매출 통계 조회 실패', data: [] });
    }
  });

  // ===== Lodging Vendor APIs =====

  // Lodging Vendor 정보 조회 (자기 업체 정보)
  app.get('/api/vendor/lodging/info', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      const vendors = await db.query(`
        SELECT * FROM rentcar_vendors WHERE user_id = ? LIMIT 1
      `, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      res.json({
        success: true,
        data: vendors[0]
      });
    } catch (error) {
      console.error('❌ [API] Get lodging vendor info error:', error);
      res.status(500).json({ success: false, message: '업체 정보 조회 실패' });
    }
  });

  // Lodging 목록 조회 (Vendor 자기 숙소만)
  app.get('/api/vendor/lodgings', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      // 숙소 목록 조회
      const lodgings = await db.query(`
        SELECT
          l.*,
          COUNT(r.id) as room_count
        FROM lodgings l
        LEFT JOIN rooms r ON l.id = r.lodging_id
        WHERE l.vendor_id = ?
        GROUP BY l.id
        ORDER BY l.created_at DESC
      `, [vendorId]);

      res.json({
        success: true,
        data: lodgings || []
      });
    } catch (error) {
      console.error('❌ [API] Get vendor lodgings error:', error);
      res.status(500).json({ success: false, message: '숙소 목록 조회 실패', data: [] });
    }
  });

  // Lodging 생성
  app.post('/api/vendor/lodgings', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      const {
        name,
        type,
        city,
        address,
        description,
        phone,
        email,
        checkin_time,
        checkout_time,
        is_active
      } = req.body;

      await db.execute(`
        INSERT INTO lodgings (
          vendor_id, name, type, city, address, description,
          phone, email, checkin_time, checkout_time, is_active,
          timezone, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Asia/Seoul', NOW(), NOW())
      `, [
        vendorId, name, type, city, address || '', description || '',
        phone || '', email || '', checkin_time || '15:00', checkout_time || '11:00',
        is_active ? 1 : 0
      ]);

      res.status(201).json({
        success: true,
        message: '숙소가 등록되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Create lodging error:', error);
      res.status(500).json({ success: false, message: '숙소 등록 실패' });
    }
  });

  // Lodging 수정
  app.put('/api/vendor/lodgings/:id', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');
      const lodgingId = parseInt(req.params.id);

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      const {
        name,
        type,
        city,
        address,
        description,
        phone,
        email,
        checkin_time,
        checkout_time,
        is_active
      } = req.body;

      await db.execute(`
        UPDATE lodgings SET
          name = ?, type = ?, city = ?, address = ?,
          description = ?, phone = ?, email = ?,
          checkin_time = ?, checkout_time = ?, is_active = ?,
          updated_at = NOW()
        WHERE id = ? AND vendor_id = ?
      `, [
        name, type, city, address || '', description || '',
        phone || '', email || '', checkin_time || '15:00', checkout_time || '11:00',
        is_active ? 1 : 0, lodgingId, vendorId
      ]);

      res.json({
        success: true,
        message: '숙소 정보가 수정되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update lodging error:', error);
      res.status(500).json({ success: false, message: '숙소 수정 실패' });
    }
  });

  // Lodging 삭제
  app.delete('/api/vendor/lodgings/:id', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');
      const lodgingId = parseInt(req.params.id);

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      await db.execute(`
        DELETE FROM lodgings WHERE id = ? AND vendor_id = ?
      `, [lodgingId, vendorId]);

      res.json({
        success: true,
        message: '숙소가 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete lodging error:', error);
      res.status(500).json({ success: false, message: '숙소 삭제 실패' });
    }
  });

  // Lodging 예약 목록 조회 (Vendor 자기 숙소 예약만)
  app.get('/api/vendor/lodging/bookings', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      // 예약 목록 조회
      const bookings = await db.query(`
        SELECT
          lb.*,
          l.name as lodging_name,
          r.name as room_name
        FROM lodging_bookings lb
        JOIN lodgings l ON lb.lodging_id = l.id
        JOIN rooms r ON lb.room_id = r.id
        WHERE l.vendor_id = ?
        ORDER BY lb.created_at DESC
        LIMIT 100
      `, [vendorId]);

      res.json({
        success: true,
        data: bookings || []
      });
    } catch (error) {
      console.error('❌ [API] Get vendor lodging bookings error:', error);
      res.status(500).json({ success: false, message: '예약 목록 조회 실패', data: [] });
    }
  });

  // CSV 업로드용 - Lodging 중복 체크
  app.get('/api/vendor/lodgings/check', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      const name = req.query.name as string;

      if (!userId || !name) {
        return res.status(400).json({ success: false, message: '필수 파라미터가 누락되었습니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      // 기존 숙소 확인
      const existing = await db.query(`
        SELECT id FROM lodgings WHERE vendor_id = ? AND name = ? LIMIT 1
      `, [vendorId, name]);

      res.json({
        success: true,
        exists: existing && existing.length > 0,
        lodgingId: existing && existing.length > 0 ? existing[0].id : null
      });
    } catch (error) {
      console.error('❌ [API] Check lodging error:', error);
      res.status(500).json({ success: false, message: '숙소 확인 실패' });
    }
  });

  // Room 생성 (CSV 업로드용)
  app.post('/api/vendor/rooms', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      const {
        lodging_id,
        name,
        room_type,
        base_price,
        max_occupancy,
        bed_type,
        room_size_sqm,
        amenities,
        images
      } = req.body;

      await db.execute(`
        INSERT INTO rooms (
          lodging_id, name, room_type, base_price, max_occupancy,
          bed_type, room_size_sqm, amenities, images,
          is_available, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, [
        lodging_id,
        name || '객실',
        room_type || 'standard',
        parseFloat(base_price) || 50000,
        parseInt(max_occupancy) || 2,
        bed_type || '더블',
        parseFloat(room_size_sqm) || 20,
        amenities || '',
        images || ''
      ]);

      res.status(201).json({
        success: true,
        message: '객실이 등록되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Create room error:', error);
      res.status(500).json({ success: false, message: '객실 등록 실패' });
    }
  });

  // Vendor PMS 설정 업데이트
  app.put('/api/vendor/pms-settings', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      const { pms_provider, pms_api_key, pms_property_id } = req.body;

      await db.execute(`
        UPDATE rentcar_vendors
        SET pms_provider = ?, pms_api_key = ?, pms_property_id = ?, updated_at = NOW()
        WHERE id = ?
      `, [pms_provider, pms_api_key, pms_property_id, vendorId]);

      res.json({
        success: true,
        message: 'PMS 설정이 저장되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update PMS settings error:', error);
      res.status(500).json({ success: false, message: 'PMS 설정 저장 실패' });
    }
  });

  // ===== Admin Rentcar Management APIs =====

  // Admin - 모든 렌트카 업체 조회
  app.get('/api/admin/rentcar/vendors', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const vendors = await db.query(`
        SELECT
          id,
          business_name as name,
          contact_email,
          contact_phone,
          is_verified,
          total_vehicles as vehicle_count,
          created_at
        FROM rentcar_vendors
        ORDER BY created_at DESC
      `);

      res.json({
        success: true,
        data: vendors || []
      });
    } catch (error) {
      console.error('❌ [API] Get admin rentcar vendors error:', error);
      res.status(500).json({ success: false, message: '업체 목록 조회 실패', data: [] });
    }
  });

  // Admin - 모든 렌트카 차량 조회
  app.get('/api/admin/rentcar/vehicles', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const vehicles = await db.query(`
        SELECT
          rv.*,
          v.business_name as vendor_name
        FROM rentcar_vehicles rv
        INNER JOIN rentcar_vendors v ON rv.vendor_id = v.id
        ORDER BY rv.created_at DESC
      `);

      res.json({
        success: true,
        data: vehicles || []
      });
    } catch (error) {
      console.error('❌ [API] Get admin rentcar vehicles error:', error);
      res.status(500).json({ success: false, message: '차량 목록 조회 실패', data: [] });
    }
  });

  // Admin - 모든 렌트카 예약 조회
  app.get('/api/admin/rentcar/bookings', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const bookings = await db.query(`
        SELECT
          rb.id,
          rb.vehicle_id,
          rv.display_name as vehicle_name,
          v.business_name as vendor_name,
          rb.customer_name,
          rb.customer_phone,
          rb.pickup_date,
          rb.dropoff_date,
          rb.total_amount,
          rb.status,
          rb.created_at
        FROM rentcar_bookings rb
        INNER JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
        INNER JOIN rentcar_vendors v ON rv.vendor_id = v.id
        ORDER BY rb.created_at DESC
        LIMIT 100
      `);

      res.json({
        success: true,
        data: bookings || []
      });
    } catch (error) {
      console.error('❌ [API] Get admin rentcar bookings error:', error);
      res.status(500).json({ success: false, message: '예약 목록 조회 실패', data: [] });
    }
  });

  // Admin - 렌트카 차량 삭제
  app.delete('/api/admin/rentcar/vehicles/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vehicleId = parseInt(req.params.id);

      await db.execute(`
        DELETE FROM rentcar_vehicles WHERE id = ?
      `, [vehicleId]);

      res.json({
        success: true,
        message: '차량이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete admin rentcar vehicle error:', error);
      res.status(500).json({ success: false, message: '차량 삭제 실패' });
    }
  });

  // Admin - 렌트카 업체 삭제 (차량도 함께 삭제)
  app.delete('/api/admin/rentcar/vendors/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorId = parseInt(req.params.id);

      // 1. 업체 차량 삭제
      await db.execute(`
        DELETE FROM rentcar_vehicles WHERE vendor_id = ?
      `, [vendorId]);

      // 2. 업체 삭제
      await db.execute(`
        DELETE FROM rentcar_vendors WHERE id = ?
      `, [vendorId]);

      res.json({
        success: true,
        message: '업체가 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete admin rentcar vendor error:', error);
      res.status(500).json({ success: false, message: '업체 삭제 실패' });
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
  app.get('/api/admin/newsletter/subscribers', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const result = await newsletterAPI.getAllSubscribers();
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get subscribers error:', error);
      res.status(500).json({ success: false, error: '구독자 목록 조회 실패' });
    }
  });

  // 활성 구독자 목록 (관리자용)
  app.get('/api/admin/newsletter/subscribers/active', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const result = await newsletterAPI.getActiveSubscribers();
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get active subscribers error:', error);
      res.status(500).json({ success: false, error: '활성 구독자 목록 조회 실패' });
    }
  });

  // 구독자 삭제 (관리자용)
  app.delete('/api/admin/newsletter/subscribers/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const result = await newsletterAPI.deleteSubscriber(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Delete subscriber error:', error);
      res.status(500).json({ success: false, error: '구독자 삭제 실패' });
    }
  });

  // 캠페인 목록 (관리자용)
  app.get('/api/admin/newsletter/campaigns', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const result = await newsletterAPI.getAllCampaigns();
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get campaigns error:', error);
      res.status(500).json({ success: false, error: '캠페인 목록 조회 실패' });
    }
  });

  // 캠페인 생성 (관리자용)
  app.post('/api/admin/newsletter/campaigns', authenticate, requireRole('admin'), async (req, res) => {
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
  app.post('/api/admin/newsletter/campaigns/:id/send', authenticate, requireRole('admin'), async (req, res) => {
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
  app.delete('/api/admin/newsletter/campaigns/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const result = await newsletterAPI.deleteCampaign(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Delete campaign error:', error);
      res.status(500).json({ success: false, error: '캠페인 삭제 실패' });
    }
  });

  // ===== 사용자 프로필 API =====

  // 사용자 프로필 업데이트
  app.put('/api/user/profile', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      const {
        name,
        phone,
        birth_date,
        bio,
        avatar
      } = req.body;

      // users 테이블 업데이트
      await db.execute(`
        UPDATE users
        SET name = ?, phone = ?, birth_date = ?, bio = ?, avatar = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        name || '',
        phone || '',
        birth_date || null,
        bio || null,
        avatar || null,
        parseInt(userId as string)
      ]);

      res.json({
        success: true,
        message: '프로필이 업데이트되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update user profile error:', error);
      res.status(500).json({ success: false, message: '프로필 업데이트 실패' });
    }
  });

  // ===== 미디어 관리 API =====

  // 미디어 목록 조회 (관리자용)
  app.get('/api/admin/media', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const media = await db.query(`
        SELECT * FROM page_media
        ORDER BY page_name, position_order
      `);

      res.json({
        success: true,
        data: media || []
      });
    } catch (error) {
      console.error('❌ [API] Get media error:', error);
      res.status(500).json({ success: false, message: '미디어 목록 조회 실패', data: [] });
    }
  });

  // 미디어 추가 (관리자용)
  app.post('/api/admin/media', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const {
        page_name,
        section_name,
        media_type,
        media_url,
        alt_text,
        position_order,
        is_active
      } = req.body;

      if (!page_name || !section_name || !media_url) {
        return res.status(400).json({ success: false, message: '필수 항목을 입력해주세요' });
      }

      const { db } = await import('./utils/database.js');

      await db.execute(`
        INSERT INTO page_media (
          page_name, section_name, media_type, media_url,
          alt_text, position_order, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        page_name,
        section_name,
        media_type || 'image',
        media_url,
        alt_text || null,
        position_order || 0,
        is_active ? 1 : 0
      ]);

      res.status(201).json({
        success: true,
        message: '미디어가 추가되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Create media error:', error);
      res.status(500).json({ success: false, message: '미디어 추가 실패' });
    }
  });

  // 미디어 수정 (관리자용)
  app.put('/api/admin/media/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const mediaId = parseInt(req.params.id);
      const {
        page_name,
        section_name,
        media_type,
        media_url,
        alt_text,
        position_order,
        is_active
      } = req.body;

      if (!page_name || !section_name || !media_url) {
        return res.status(400).json({ success: false, message: '필수 항목을 입력해주세요' });
      }

      const { db } = await import('./utils/database.js');

      await db.execute(`
        UPDATE page_media SET
          page_name = ?, section_name = ?, media_type = ?,
          media_url = ?, alt_text = ?, position_order = ?,
          is_active = ?, updated_at = NOW()
        WHERE id = ?
      `, [
        page_name,
        section_name,
        media_type || 'image',
        media_url,
        alt_text || null,
        position_order || 0,
        is_active ? 1 : 0,
        mediaId
      ]);

      res.json({
        success: true,
        message: '미디어가 수정되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update media error:', error);
      res.status(500).json({ success: false, message: '미디어 수정 실패' });
    }
  });

  // 미디어 삭제 (관리자용)
  app.delete('/api/admin/media/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const mediaId = parseInt(req.params.id);
      const { db } = await import('./utils/database.js');

      await db.execute(`
        DELETE FROM page_media WHERE id = ?
      `, [mediaId]);

      res.json({
        success: true,
        message: '미디어가 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete media error:', error);
      res.status(500).json({ success: false, message: '미디어 삭제 실패' });
    }
  });

  // 미디어 활성화 토글 (관리자용) - 인증 필수
  app.patch('/api/admin/media/:id/toggle', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const mediaId = parseInt(req.params.id);
      const { is_active } = req.body;

      const { db } = await import('./utils/database.js');

      await db.execute(`
        UPDATE page_media SET is_active = ?, updated_at = NOW()
        WHERE id = ?
      `, [is_active ? 1 : 0, mediaId]);

      res.json({
        success: true,
        message: is_active ? '활성화되었습니다' : '비활성화되었습니다'
      });
    } catch (error) {
      console.error('❌ [API] Toggle media error:', error);
      res.status(500).json({ success: false, message: '상태 변경 실패' });
    }
  });

  // ===== Vendor 요금/보험/옵션 관리 API =====

  // 요금 정책 목록 조회
  app.get('/api/vendor/pricing/policies', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      const policies = await db.query(`
        SELECT * FROM rentcar_pricing_policies WHERE vendor_id = ? ORDER BY policy_type, id
      `, [vendorId]);

      res.json({
        success: true,
        data: policies || []
      });
    } catch (error) {
      console.error('❌ [API] Get pricing policies error:', error);
      res.status(500).json({ success: false, message: '요금 정책 조회 실패', data: [] });
    }
  });

  // 요금 정책 추가
  app.post('/api/vendor/pricing/policies', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      const {
        policy_type, min_days, max_days, discount_percentage,
        day_of_week, price_multiplier, season_name, start_date, end_date,
        season_multiplier, days_before_pickup, early_bird_discount, is_active
      } = req.body;

      await db.execute(`
        INSERT INTO rentcar_pricing_policies
        (vendor_id, policy_type, min_days, max_days, discount_percentage,
         day_of_week, price_multiplier, season_name, start_date, end_date,
         season_multiplier, days_before_pickup, early_bird_discount, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vendorId, policy_type, min_days || null, max_days || null, discount_percentage || null,
        day_of_week || null, price_multiplier || null, season_name || null, start_date || null, end_date || null,
        season_multiplier || null, days_before_pickup || null, early_bird_discount || null, is_active ? 1 : 0
      ]);

      res.status(201).json({
        success: true,
        message: '요금 정책이 추가되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Create pricing policy error:', error);
      res.status(500).json({ success: false, message: '요금 정책 추가 실패' });
    }
  });

  // 요금 정책 활성화 토글
  app.patch('/api/vendor/pricing/policies/:id/toggle', async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const { is_active } = req.body;

      const { db } = await import('./utils/database.js');

      await db.execute(`
        UPDATE rentcar_pricing_policies SET is_active = ? WHERE id = ?
      `, [is_active ? 1 : 0, policyId]);

      res.json({
        success: true,
        message: '상태가 변경되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Toggle pricing policy error:', error);
      res.status(500).json({ success: false, message: '상태 변경 실패' });
    }
  });

  // 요금 정책 삭제
  app.delete('/api/vendor/pricing/policies/:id', async (req, res) => {
    try {
      const policyId = parseInt(req.params.id);
      const { db } = await import('./utils/database.js');

      await db.execute(`
        DELETE FROM rentcar_pricing_policies WHERE id = ?
      `, [policyId]);

      res.json({
        success: true,
        message: '요금 정책이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete pricing policy error:', error);
      res.status(500).json({ success: false, message: '요금 정책 삭제 실패' });
    }
  });

  // 보험 상품 목록 조회
  app.get('/api/vendor/insurance', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      const insurances = await db.query(`
        SELECT * FROM rentcar_insurance_products WHERE vendor_id = ? ORDER BY display_order
      `, [vendorId]);

      res.json({
        success: true,
        data: insurances || []
      });
    } catch (error) {
      console.error('❌ [API] Get insurance products error:', error);
      res.status(500).json({ success: false, message: '보험 상품 조회 실패', data: [] });
    }
  });

  // 보험 상품 추가
  app.post('/api/vendor/insurance', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      const {
        insurance_name, insurance_type, description, coverage_limit,
        deductible, daily_price, is_included, is_active, display_order
      } = req.body;

      await db.execute(`
        INSERT INTO rentcar_insurance_products
        (vendor_id, insurance_name, insurance_type, description, coverage_limit,
         deductible, daily_price, is_included, is_active, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vendorId, insurance_name, insurance_type, description, coverage_limit,
        deductible, daily_price, is_included ? 1 : 0, is_active ? 1 : 0, display_order || 0
      ]);

      res.status(201).json({
        success: true,
        message: '보험 상품이 추가되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Create insurance product error:', error);
      res.status(500).json({ success: false, message: '보험 상품 추가 실패' });
    }
  });

  // 보험 상품 활성화 토글
  app.patch('/api/vendor/insurance/:id/toggle', async (req, res) => {
    try {
      const insuranceId = parseInt(req.params.id);
      const { is_active } = req.body;

      const { db } = await import('./utils/database.js');

      await db.execute(`
        UPDATE rentcar_insurance_products SET is_active = ? WHERE id = ?
      `, [is_active ? 1 : 0, insuranceId]);

      res.json({
        success: true,
        message: '상태가 변경되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Toggle insurance product error:', error);
      res.status(500).json({ success: false, message: '상태 변경 실패' });
    }
  });

  // 보험 상품 삭제
  app.delete('/api/vendor/insurance/:id', async (req, res) => {
    try {
      const insuranceId = parseInt(req.params.id);
      const { db } = await import('./utils/database.js');

      await db.execute(`
        DELETE FROM rentcar_insurance_products WHERE id = ?
      `, [insuranceId]);

      res.json({
        success: true,
        message: '보험 상품이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete insurance product error:', error);
      res.status(500).json({ success: false, message: '보험 상품 삭제 실패' });
    }
  });

  // 추가 옵션 목록 조회
  app.get('/api/vendor/options', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      const options = await db.query(`
        SELECT * FROM rentcar_additional_options WHERE vendor_id = ? ORDER BY display_order
      `, [vendorId]);

      res.json({
        success: true,
        data: options || []
      });
    } catch (error) {
      console.error('❌ [API] Get additional options error:', error);
      res.status(500).json({ success: false, message: '추가 옵션 조회 실패', data: [] });
    }
  });

  // 추가 옵션 추가
  app.post('/api/vendor/options', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      const {
        option_name, option_type, description, daily_price,
        one_time_price, quantity_available, is_active, display_order
      } = req.body;

      await db.execute(`
        INSERT INTO rentcar_additional_options
        (vendor_id, option_name, option_type, description, daily_price,
         one_time_price, quantity_available, is_active, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vendorId, option_name, option_type, description, daily_price,
        one_time_price, quantity_available, is_active ? 1 : 0, display_order || 0
      ]);

      res.status(201).json({
        success: true,
        message: '추가 옵션이 등록되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Create additional option error:', error);
      res.status(500).json({ success: false, message: '추가 옵션 등록 실패' });
    }
  });

  // 추가 옵션 활성화 토글
  app.patch('/api/vendor/options/:id/toggle', async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      const { is_active } = req.body;

      const { db } = await import('./utils/database.js');

      await db.execute(`
        UPDATE rentcar_additional_options SET is_active = ? WHERE id = ?
      `, [is_active ? 1 : 0, optionId]);

      res.json({
        success: true,
        message: '상태가 변경되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Toggle additional option error:', error);
      res.status(500).json({ success: false, message: '상태 변경 실패' });
    }
  });

  // 추가 옵션 삭제
  app.delete('/api/vendor/options/:id', async (req, res) => {
    try {
      const optionId = parseInt(req.params.id);
      const { db } = await import('./utils/database.js');

      await db.execute(`
        DELETE FROM rentcar_additional_options WHERE id = ?
      `, [optionId]);

      res.json({
        success: true,
        message: '추가 옵션이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete additional option error:', error);
      res.status(500).json({ success: false, message: '추가 옵션 삭제 실패' });
    }
  });

  // ===== Vendor PMS Configuration APIs =====

  // Get PMS configuration
  app.get('/api/vendor/pms-config', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      const vendors = await db.query(`
        SELECT id, pms_provider, pms_api_key, pms_api_secret, pms_endpoint,
               pms_sync_enabled, pms_last_sync, pms_sync_interval
        FROM rentcar_vendors
        WHERE user_id = ?
        LIMIT 1
      `, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      res.json({
        success: true,
        data: vendors[0]
      });
    } catch (error) {
      console.error('❌ [API] Get PMS config error:', error);
      res.status(500).json({ success: false, message: 'PMS 설정 조회 실패' });
    }
  });

  // Update PMS configuration
  app.put('/api/vendor/pms-config', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { provider, apiKey, apiSecret, endpoint, syncEnabled, syncInterval } = req.body;

      if (!provider || !apiKey) {
        return res.status(400).json({ success: false, message: 'PMS 제공사와 API 키는 필수입니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Get vendor ID
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      // Update PMS config
      await db.execute(`
        UPDATE rentcar_vendors
        SET pms_provider = ?,
            pms_api_key = ?,
            pms_api_secret = ?,
            pms_endpoint = ?,
            pms_sync_enabled = ?,
            pms_sync_interval = ?
        WHERE id = ?
      `, [
        provider,
        apiKey,
        apiSecret || null,
        endpoint || null,
        syncEnabled ? 1 : 0,
        syncInterval || 3600,
        vendorId
      ]);

      res.json({
        success: true,
        message: 'PMS 설정이 저장되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update PMS config error:', error);
      res.status(500).json({ success: false, message: 'PMS 설정 저장 실패' });
    }
  });

  // Get PMS sync logs
  app.get('/api/vendor/pms/logs', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Get vendor ID
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [parseInt(userId as string)]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      // Get sync logs
      const logs = await db.query(`
        SELECT id, sync_status, vehicles_added, vehicles_updated, vehicles_deleted,
               error_message, created_at
        FROM pms_sync_logs
        WHERE vendor_id = ?
        ORDER BY created_at DESC
        LIMIT 20
      `, [vendorId]);

      res.json({
        success: true,
        data: logs || []
      });
    } catch (error) {
      console.error('❌ [API] Get PMS logs error:', error);
      res.status(500).json({ success: false, message: 'PMS 로그 조회 실패', data: [] });
    }
  });

  // ===== Shopping Cart APIs =====

  // Get cart items
  app.get('/api/cart', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Get cart items with listing details
      const cartItems = await db.query(`
        SELECT
          ci.id as cart_item_id,
          ci.listing_id,
          ci.selected_date,
          ci.num_adults,
          ci.num_children,
          ci.num_seniors,
          ci.price_snapshot,
          l.title,
          l.images,
          l.category,
          l.location,
          l.price_from
        FROM cart_items ci
        LEFT JOIN listings l ON ci.listing_id = l.id
        WHERE ci.user_id = ?
        ORDER BY ci.created_at DESC
      `, [parseInt(userId as string)]);

      // Format response
      const formattedItems = cartItems.map((item: any) => {
        let imageUrl = '';
        if (item.images) {
          try {
            const parsed = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
            imageUrl = Array.isArray(parsed) ? parsed[0] : '';
          } catch {
            imageUrl = typeof item.images === 'string' ? item.images : '';
          }
        }

        return {
          id: item.listing_id,
          title: item.title || '상품',
          price: item.price_snapshot || item.price_from || 0,
          image: imageUrl,
          category: item.category || '',
          location: item.location || '',
          date: item.selected_date,
          guests: (item.num_adults || 0) + (item.num_children || 0) + (item.num_seniors || 0),
        };
      });

      // Merge duplicates and calculate quantity
      const mergedItems = formattedItems.reduce((acc: any[], item: any) => {
        const existing = acc.find(i => i.id === item.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          acc.push({ ...item, quantity: 1 });
        }
        return acc;
      }, []);

      res.json({
        success: true,
        data: mergedItems
      });
    } catch (error) {
      console.error('❌ [API] Get cart error:', error);
      res.status(500).json({ success: false, message: '장바구니 조회 실패', data: [] });
    }
  });

  // Add item to cart
  app.post('/api/cart/add', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { listingId, date, guests, price } = req.body;

      if (!listingId) {
        return res.status(400).json({ success: false, message: '상품 ID가 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Insert cart item
      await db.execute(`
        INSERT INTO cart_items (user_id, listing_id, selected_date, num_adults, num_children, num_seniors, price_snapshot)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        parseInt(userId),
        listingId,
        date || null,
        guests || 1,
        0,
        0,
        price || 0
      ]);

      res.json({
        success: true,
        message: '장바구니에 추가되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Add to cart error:', error);
      res.status(500).json({ success: false, message: '장바구니 추가 실패' });
    }
  });

  // Update cart item quantity
  app.put('/api/cart/update', async (req, res) => {
    try {
      const userId = req.body.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { listingId, quantity } = req.body;

      if (!listingId || quantity === undefined) {
        return res.status(400).json({ success: false, message: '상품 ID와 수량이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Get current quantity
      const currentItems = await db.query(`
        SELECT COUNT(*) as count FROM cart_items WHERE user_id = ? AND listing_id = ?
      `, [parseInt(userId), listingId]);

      const currentQuantity = currentItems[0]?.count || 0;
      const diff = quantity - currentQuantity;

      if (diff > 0) {
        // Increase quantity: add rows
        const cartItem = await db.query(`
          SELECT * FROM cart_items WHERE user_id = ? AND listing_id = ? LIMIT 1
        `, [parseInt(userId), listingId]);

        if (cartItem.length > 0) {
          const template = cartItem[0];
          for (let i = 0; i < diff; i++) {
            await db.execute(`
              INSERT INTO cart_items (user_id, listing_id, selected_date, num_adults, num_children, num_seniors, price_snapshot)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              parseInt(userId),
              listingId,
              template.selected_date,
              template.num_adults,
              template.num_children,
              template.num_seniors,
              template.price_snapshot
            ]);
          }
        }
      } else if (diff < 0) {
        // Decrease quantity: delete rows
        const deleteCount = Math.abs(diff);
        await db.execute(`
          DELETE FROM cart_items
          WHERE user_id = ? AND listing_id = ?
          LIMIT ${deleteCount}
        `, [parseInt(userId), listingId]);
      }

      res.json({
        success: true,
        message: '수량이 업데이트되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update cart error:', error);
      res.status(500).json({ success: false, message: '수량 업데이트 실패' });
    }
  });

  // Remove item from cart
  app.delete('/api/cart/remove/:listingId', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { listingId } = req.params;

      const { db } = await import('./utils/database.js');

      await db.execute(`
        DELETE FROM cart_items WHERE user_id = ? AND listing_id = ?
      `, [parseInt(userId as string), parseInt(listingId)]);

      res.json({
        success: true,
        message: '장바구니에서 제거되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Remove from cart error:', error);
      res.status(500).json({ success: false, message: '장바구니 제거 실패' });
    }
  });

  // Clear cart
  app.delete('/api/cart/clear', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      await db.execute(`
        DELETE FROM cart_items WHERE user_id = ?
      `, [parseInt(userId as string)]);

      res.json({
        success: true,
        message: '장바구니가 비워졌습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Clear cart error:', error);
      res.status(500).json({ success: false, message: '장바구니 비우기 실패' });
    }
  });

  // ===== Rentcar Price Calculation API =====

  // Calculate rentcar price with all policies
  app.post('/api/rentcar/calculate-price', async (req, res) => {
    try {
      const {
        vehicleId,
        vendorId,
        pickupDate,
        dropoffDate,
        selectedInsuranceIds,
        selectedOptionIds,
        bookingDate
      } = req.body;

      if (!vehicleId || !vendorId || !pickupDate || !dropoffDate) {
        return res.status(400).json({
          success: false,
          message: '필수 파라미터가 누락되었습니다. (vehicleId, vendorId, pickupDate, dropoffDate)'
        });
      }

      const { db } = await import('./utils/database.js');
      const { calculateRentcarPrice } = await import('./utils/rentcar-price-calculator.js');

      const breakdown = await calculateRentcarPrice(db, {
        vehicleId: parseInt(vehicleId),
        vendorId: parseInt(vendorId),
        pickupDate: new Date(pickupDate),
        dropoffDate: new Date(dropoffDate),
        selectedInsuranceIds: selectedInsuranceIds || [],
        selectedOptionIds: selectedOptionIds || [],
        bookingDate: bookingDate ? new Date(bookingDate) : new Date()
      });

      res.json({
        success: true,
        data: breakdown
      });
    } catch (error) {
      console.error('❌ [API] Calculate rentcar price error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '가격 계산 실패'
      });
    }
  });

  // Quick price estimate (vehicle only, no insurance/options)
  app.get('/api/rentcar/quick-price', async (req, res) => {
    try {
      const { vehicleId, vendorId, pickupDate, dropoffDate } = req.query;

      if (!vehicleId || !vendorId || !pickupDate || !dropoffDate) {
        return res.status(400).json({
          success: false,
          message: '필수 파라미터가 누락되었습니다.'
        });
      }

      const { db } = await import('./utils/database.js');
      const { getQuickPriceEstimate } = await import('./utils/rentcar-price-calculator.js');

      const estimate = await getQuickPriceEstimate(
        db,
        parseInt(vehicleId as string),
        parseInt(vendorId as string),
        new Date(pickupDate as string),
        new Date(dropoffDate as string)
      );

      res.json({
        success: true,
        data: estimate
      });
    } catch (error) {
      console.error('❌ [API] Quick price estimate error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '가격 추정 실패'
      });
    }
  });

  // ===== Rentcar Vehicle Search API =====

  // Search vehicles
  app.post('/api/rentcar/vehicles/search', async (req, res) => {
    try {
      const { searchVehicles } = await import('./api/rentcar/vehicles.js');
      const result = await searchVehicles(req.body);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Search vehicles error:', error);
      res.status(500).json({
        success: false,
        message: '차량 검색 중 오류가 발생했습니다',
        vehicles: [],
        pagination: { page: 1, limit: 20, total: 0, total_pages: 0 }
      });
    }
  });

  // Get vehicle by ID
  app.get('/api/rentcar/vehicles/:id', async (req, res) => {
    try {
      const { getVehicleById } = await import('./api/rentcar/vehicles.js');
      const vehicleId = parseInt(req.params.id);
      const result = await getVehicleById(vehicleId);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get vehicle error:', error);
      res.status(500).json({
        success: false,
        message: '차량 정보 조회 중 오류가 발생했습니다'
      });
    }
  });

  // Get vehicle filter options
  app.get('/api/rentcar/vehicles/filters', async (req, res) => {
    try {
      const { getVehicleFilters } = await import('./api/rentcar/vehicles.js');
      const vendorId = req.query.vendor_id ? parseInt(req.query.vendor_id as string) : undefined;
      const result = await getVehicleFilters(vendorId);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get vehicle filters error:', error);
      res.status(500).json({
        success: false,
        message: '필터 옵션 조회 중 오류가 발생했습니다',
        filters: null
      });
    }
  });

  // ===== Rentcar Booking API =====

  // Check availability
  app.post('/api/rentcar/bookings/check-availability', async (req, res) => {
    try {
      const { checkAvailability } = await import('./api/rentcar/bookings.js');
      const result = await checkAvailability(req.body);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Check availability error:', error);
      res.status(500).json({
        success: false,
        message: '재고 확인 중 오류가 발생했습니다'
      });
    }
  });

  // Create booking
  app.post('/api/rentcar/bookings', authenticate, async (req, res) => {
    try {
      const { createBooking } = await import('./api/rentcar/bookings.js');
      const result = await createBooking({
        ...req.body,
        user_id: req.user?.userId
      });
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Create booking error:', error);
      res.status(500).json({
        success: false,
        message: '예약 생성 중 오류가 발생했습니다'
      });
    }
  });

  // Cancel booking
  app.delete('/api/rentcar/bookings/:id', authenticate, async (req, res) => {
    try {
      const { cancelBooking } = await import('./api/rentcar/bookings.js');
      const bookingId = parseInt(req.params.id);
      const result = await cancelBooking(bookingId, req.user?.userId);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Cancel booking error:', error);
      res.status(500).json({
        success: false,
        message: '예약 취소 중 오류가 발생했습니다'
      });
    }
  });

  // Get bookings
  app.get('/api/rentcar/bookings', authenticate, async (req, res) => {
    try {
      const { getBookings } = await import('./api/rentcar/bookings.js');
      const result = await getBookings(req.query);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get bookings error:', error);
      res.status(500).json({
        success: false,
        message: '예약 목록 조회 중 오류가 발생했습니다'
      });
    }
  });

  // ===== Rentcar Payment API =====

  // Confirm payment
  app.post('/api/rentcar/payment/confirm', authenticate, async (req, res) => {
    try {
      const { confirmRentcarPayment } = await import('./api/rentcar/payment.js');
      const result = await confirmRentcarPayment(req.body);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Confirm rentcar payment error:', error);
      res.status(500).json({
        success: false,
        message: '결제 확정 중 오류가 발생했습니다'
      });
    }
  });

  // Refund payment
  app.post('/api/rentcar/payment/refund', authenticate, async (req, res) => {
    try {
      const { refundRentcarPayment } = await import('./api/rentcar/payment.js');
      const { booking_id, reason } = req.body;
      const result = await refundRentcarPayment(booking_id, reason);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Refund rentcar payment error:', error);
      res.status(500).json({
        success: false,
        message: '환불 처리 중 오류가 발생했습니다'
      });
    }
  });

  // Get payment status
  app.get('/api/rentcar/payment/status/:bookingId', authenticate, async (req, res) => {
    try {
      const { getRentcarPaymentStatus } = await import('./api/rentcar/payment.js');
      const bookingId = parseInt(req.params.bookingId);
      const result = await getRentcarPaymentStatus(bookingId);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get rentcar payment status error:', error);
      res.status(500).json({
        success: false,
        message: '결제 상태 조회 중 오류가 발생했습니다'
      });
    }
  });

  // ===== Rentcar Vendor Vehicle Management API =====

  // Get vendor's vehicles
  app.get('/api/vendor/rentcar/vehicles', authenticate, async (req, res) => {
    try {
      const { getVendorVehicles } = await import('./api/rentcar/vendor-vehicles.js');
      const vendorId = parseInt(req.query.vendor_id as string);
      const result = await getVendorVehicles(vendorId);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get vendor vehicles error:', error);
      res.status(500).json({
        success: false,
        message: '차량 목록 조회 중 오류가 발생했습니다',
        vehicles: []
      });
    }
  });

  // Create vehicle
  app.post('/api/vendor/rentcar/vehicles', authenticate, async (req, res) => {
    try {
      const { createVehicle } = await import('./api/rentcar/vendor-vehicles.js');
      const result = await createVehicle(req.body, req.user?.userId || 0);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Create vehicle error:', error);
      res.status(500).json({
        success: false,
        message: '차량 등록 중 오류가 발생했습니다'
      });
    }
  });

  // Update vehicle
  app.put('/api/vendor/rentcar/vehicles/:id', authenticate, async (req, res) => {
    try {
      const { updateVehicle } = await import('./api/rentcar/vendor-vehicles.js');
      const vehicleId = parseInt(req.params.id);
      const result = await updateVehicle({ ...req.body, id: vehicleId }, req.user?.userId || 0);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Update vehicle error:', error);
      res.status(500).json({
        success: false,
        message: '차량 수정 중 오류가 발생했습니다'
      });
    }
  });

  // Delete vehicle
  app.delete('/api/vendor/rentcar/vehicles/:id', authenticate, async (req, res) => {
    try {
      const { deleteVehicle } = await import('./api/rentcar/vendor-vehicles.js');
      const vehicleId = parseInt(req.params.id);
      const result = await deleteVehicle(vehicleId, req.user?.userId || 0);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Delete vehicle error:', error);
      res.status(500).json({
        success: false,
        message: '차량 삭제 중 오류가 발생했습니다'
      });
    }
  });

  // Get vehicle bookings
  app.get('/api/vendor/rentcar/vehicles/:id/bookings', authenticate, async (req, res) => {
    try {
      const { getVehicleBookings } = await import('./api/rentcar/vendor-vehicles.js');
      const vehicleId = parseInt(req.params.id);
      const result = await getVehicleBookings(vehicleId, req.user?.userId || 0);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get vehicle bookings error:', error);
      res.status(500).json({
        success: false,
        message: '예약 내역 조회 중 오류가 발생했습니다',
        bookings: []
      });
    }
  });

  // Get vendor bookings (all vehicles)
  app.get('/api/vendor/rentcar/bookings', authenticate, async (req, res) => {
    try {
      const { getVendorBookings } = await import('./api/rentcar/vendor-vehicles.js');
      const vendorId = parseInt(req.query.vendor_id as string);
      const result = await getVendorBookings(vendorId, req.user?.userId || 0);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get vendor bookings error:', error);
      res.status(500).json({
        success: false,
        message: '예약 내역 조회 중 오류가 발생했습니다',
        bookings: []
      });
    }
  });

  // Get vendor dashboard
  app.get('/api/vendor/rentcar/dashboard', authenticate, async (req, res) => {
    try {
      const { getVendorDashboard } = await import('./api/rentcar/vendor-vehicles.js');
      const vendorId = parseInt(req.query.vendor_id as string);
      const result = await getVendorDashboard(vendorId, req.user?.userId || 0);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Get vendor dashboard error:', error);
      res.status(500).json({
        success: false,
        message: '대시보드 조회 중 오류가 발생했습니다'
      });
    }
  });

  // ===== Admin Commission Settings =====
  // 모든 수수료 정책 조회
  app.get('/api/admin/commission/rates', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const { getAllCommissionRates } = await import('./api/admin/commission-settings.js');
      const result = await getAllCommissionRates();
      res.json(result);
    } catch (error) {
      console.error('[API] Commission rates list error:', error);
      res.status(500).json({ success: false, message: '수수료 정책 조회 중 오류가 발생했습니다' });
    }
  });

  // 특정 벤더/카테고리의 수수료율 조회
  app.get('/api/admin/commission/rate', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { getCommissionRate } = await import('./api/admin/commission-settings.js');
      const { category, vendor_id } = req.query;
      const result = await getCommissionRate({
        category: category as string,
        vendor_id: vendor_id ? parseInt(vendor_id as string) : undefined
      });
      res.json(result);
    } catch (error) {
      console.error('[API] Commission rate query error:', error);
      res.status(500).json({ success: false, message: '수수료율 조회 중 오류가 발생했습니다' });
    }
  });

  // 새 수수료 정책 생성
  app.post('/api/admin/commission/rates', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { createCommissionRate } = await import('./api/admin/commission-settings.js');
      const result = await createCommissionRate(req.body, req.user?.userId || 0);
      res.json(result);
    } catch (error) {
      console.error('[API] Commission rate creation error:', error);
      res.status(500).json({ success: false, message: '수수료 정책 생성 중 오류가 발생했습니다' });
    }
  });

  // 수수료 정책 수정
  app.put('/api/admin/commission/rates/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { updateCommissionRate } = await import('./api/admin/commission-settings.js');
      const rateId = parseInt(req.params.id);
      const result = await updateCommissionRate(rateId, req.body, req.user?.userId || 0);
      res.json(result);
    } catch (error) {
      console.error('[API] Commission rate update error:', error);
      res.status(500).json({ success: false, message: '수수료 정책 수정 중 오류가 발생했습니다' });
    }
  });

  // 수수료 정책 비활성화
  app.delete('/api/admin/commission/rates/:id/deactivate', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { deactivateCommissionRate } = await import('./api/admin/commission-settings.js');
      const rateId = parseInt(req.params.id);
      const result = await deactivateCommissionRate(rateId, req.user?.userId || 0);
      res.json(result);
    } catch (error) {
      console.error('[API] Commission rate deactivation error:', error);
      res.status(500).json({ success: false, message: '수수료 정책 비활성화 중 오류가 발생했습니다' });
    }
  });

  // 수수료 정책 삭제
  app.delete('/api/admin/commission/rates/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { deleteCommissionRate } = await import('./api/admin/commission-settings.js');
      const rateId = parseInt(req.params.id);
      const result = await deleteCommissionRate(rateId);
      res.json(result);
    } catch (error) {
      console.error('[API] Commission rate deletion error:', error);
      res.status(500).json({ success: false, message: '수수료 정책 삭제 중 오류가 발생했습니다' });
    }
  });

  // 수수료 통계 조회
  app.get('/api/admin/commission/statistics', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { getCommissionStatistics } = await import('./api/admin/commission-settings.js');
      const { vendor_id, category, start_date, end_date } = req.query;
      const result = await getCommissionStatistics({
        vendor_id: vendor_id ? parseInt(vendor_id as string) : undefined,
        category: category as string,
        start_date: start_date as string,
        end_date: end_date as string
      });
      res.json(result);
    } catch (error) {
      console.error('[API] Commission statistics error:', error);
      res.status(500).json({ success: false, message: '수수료 통계 조회 중 오류가 발생했습니다' });
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
