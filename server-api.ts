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

// ===== Timezone Configuration =====
// IMPORTANT: 모든 시간 데이터는 Asia/Seoul (KST, UTC+9) 기준으로 처리
// DOCS: docs/TIMEZONE_CURRENCY_RULES.md 참고
process.env.TZ = process.env.TZ || 'Asia/Seoul';

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { authenticate, requireRole, optionalAuth } from './middleware/authenticate.js';
import { requireFeature, requirePaymentByCategory } from './utils/feature-flags-db.js';

const PORT = parseInt(process.env.PORT || '3004', 10);
const HOST = process.env.HOST || '0.0.0.0';
const PRODUCTION_ORIGIN = process.env.PRODUCTION_ORIGIN || 'https://yourdomain.com';

// Express 앱 생성
const app = express();
const httpServer = createServer(app);

// 미들웨어
// 1. Security headers (helmet)
// IMPORTANT: Production에서는 HTTPS 필수
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false, // CSP는 production에서만
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1년
    includeSubDomains: true,
    preload: true
  } : false
}));

// 2. CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [PRODUCTION_ORIGIN] // .env의 PRODUCTION_ORIGIN 사용
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3004'],
  credentials: true
}));

// 3. Body parsers
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
let paymentRefundAPI: any;
let updateShippingAPI: any; // ✅ 배송 정보 업데이트 API
let rentcarGenerateVoucherAPI: any; // ✅ 렌트카 바우처 생성
let rentcarVerifyVoucherAPI: any; // ✅ 렌트카 바우처 검증
let rentcarCheckInAPI: any; // ✅ 렌트카 차량 인수
let rentcarCheckOutAPI: any; // ✅ 렌트카 차량 반납
let rentcarSearchAPI: any; // ✅ 렌트카 검색 (가용성 + 가격 계산)
let rentcarCreateRentalAPI: any; // ✅ 렌트카 예약 생성
let rentcarConfirmPaymentAPI: any; // ✅ 렌트카 결제 확인
let rentcarCancelRentalAPI: any; // ✅ 렌트카 예약 취소
let rentcarVehicleBlocksAPI: any; // ✅ 렌트카 차량 차단 관리
let rentcarVoucherVerifyPostAPI: any; // ✅ 렌트카 바우처 인증 (POST)
let rentcarBookingsTodayAPI: any; // ✅ 렌트카 오늘 예약 조회
let rentcarDepositPreauthAPI: any; // ✅ 렌트카 보증금 사전승인
let rentcarDepositSettleAPI: any; // ✅ 렌트카 보증금 정산
let rentcarAdditionalPaymentAPI: any; // ✅ 렌트카 추가 결제
let rentcarGetUserRentalsAPI: any; // ✅ 렌트카 사용자 예약 목록 조회
let rentcarVendorRefundsAPI: any; // ✅ 렌트카 벤더 환불/정산 관리
let rentcarVehicleAvailabilityAPI: any; // ✅ 렌트카 차량 비활성화/활성화
let lodgingGenerateVoucherAPI: any; // ✅ 숙박 바우처 생성
let lodgingVerifyVoucherAPI: any; // ✅ 숙박 바우처 검증
let lodgingCheckInAPI: any; // ✅ 숙박 체크인
let lodgingCheckOutAPI: any; // ✅ 숙박 체크아웃
let startPMSScheduler: any;
let startLodgingExpiryWorker: any;
let getLodgingExpiryMetrics: any;
let startLodgingPMSScheduler: any;

// ===== 서버 시작 =====

async function startServer() {
  console.log('\n🚀 [Server] Starting Booking System API Server...\n');

  // Log timezone and currency configuration
  console.log('🌏 [Config] Timezone:', process.env.TZ || 'Asia/Seoul (default)');
  console.log('💰 [Config] Currency:', process.env.DEFAULT_CURRENCY || 'KRW (default)');
  console.log('🌐 [Config] Locale:', process.env.CURRENCY_LOCALE || 'ko-KR (default)');
  console.log('🔒 [Config] CORS Origin:', process.env.NODE_ENV === 'production' ? PRODUCTION_ORIGIN : 'localhost (dev)');
  console.log('');

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
    updateShippingModule, // ✅ 배송 정보 업데이트
    rentcarGenerateVoucherModule, // ✅ 렌트카 바우처 생성
    rentcarVerifyVoucherModule, // ✅ 렌트카 바우처 검증
    rentcarCheckInModule, // ✅ 렌트카 차량 인수
    rentcarCheckOutModule, // ✅ 렌트카 차량 반납
    rentcarSearchModule, // ✅ 렌트카 검색 (가용성 + 가격)
    rentcarCreateRentalModule, // ✅ 렌트카 예약 생성
    rentcarConfirmPaymentModule, // ✅ 렌트카 결제 확인
    rentcarCancelRentalModule, // ✅ 렌트카 예약 취소
    rentcarVehicleBlocksModule, // ✅ 렌트카 차량 차단 관리
    rentcarVoucherVerifyPostModule, // ✅ 렌트카 바우처 인증 (POST)
    rentcarBookingsTodayModule, // ✅ 렌트카 오늘 예약 조회
    rentcarDepositPreauthModule, // ✅ 렌트카 보증금 사전승인
    rentcarDepositSettleModule, // ✅ 렌트카 보증금 정산
    rentcarAdditionalPaymentModule, // ✅ 렌트카 추가 결제
    rentcarGetUserRentalsModule, // ✅ 렌트카 사용자 예약 목록 조회
    rentcarVendorRefundsModule, // ✅ 렌트카 벤더 환불/정산 관리
    rentcarVehicleAvailabilityModule, // ✅ 렌트카 차량 비활성화/활성화
    lodgingGenerateVoucherModule, // ✅ 숙박 바우처 생성
    lodgingVerifyVoucherModule, // ✅ 숙박 바우처 검증
    lodgingCheckInModule, // ✅ 숙박 체크인
    lodgingCheckOutModule, // ✅ 숙박 체크아웃
    paymentConfirmModule,
    paymentRefundModule,
    // lodgingModule, // 파일 없음 - 주석 처리
    bannerModule,
    activityModule,
    // newsletterModule, // 파일 없음 - 주석 처리
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
    import('./api/bookings/update-shipping.js'), // ✅ 배송 정보 업데이트 API
    import('./api/rentcar/generate-voucher.js'), // ✅ 렌트카 바우처 생성
    import('./api/rentcar/verify-voucher.js'), // ✅ 렌트카 바우처 검증
    import('./api/rentcar/check-in.js'), // ✅ 렌트카 차량 인수
    import('./api/rentcar/check-out.js'), // ✅ 렌트카 차량 반납
    import('./api/rentcar/search.js'), // ✅ 렌트카 검색 (가용성 + 가격)
    import('./api/rentcar/create-rental.js'), // ✅ 렌트카 예약 생성
    import('./api/rentcar/confirm-payment.js'), // ✅ 렌트카 결제 확인
    import('./api/rentcar/cancel-rental.js'), // ✅ 렌트카 예약 취소
    import('./api/rentcar/vehicle-blocks.js'), // ✅ 렌트카 차량 차단 관리
    import('./api/rentcar/voucher-verify.js'), // ✅ 렌트카 바우처 인증 (POST)
    import('./api/rentcar/bookings-today.js'), // ✅ 렌트카 오늘 예약 조회
    import('./api/rentcar/deposit-preauth.js'), // ✅ 렌트카 보증금 사전승인
    import('./api/rentcar/deposit-settle.js'), // ✅ 렌트카 보증금 정산
    import('./api/rentcar/additional-payment.js'), // ✅ 렌트카 추가 결제
    import('./api/rentcar/get-user-rentals.js'), // ✅ 렌트카 사용자 예약 목록 조회
    import('./api/rentcar/vendor-refunds.js'), // ✅ 렌트카 벤더 환불/정산 관리
    import('./api/rentcar/vehicle-availability.js'), // ✅ 렌트카 차량 비활성화/활성화
    import('./api/lodging/generate-voucher.js'), // ✅ 숙박 바우처 생성
    import('./api/lodging/verify-voucher.js'), // ✅ 숙박 바우처 검증
    import('./api/lodging/check-in.js'), // ✅ 숙박 체크인
    import('./api/lodging/check-out.js'), // ✅ 숙박 체크아웃
    import('./api/payments/confirm'),
    import('./api/payments/refund.js'),
    // import('./api/lodging'), // 파일 없음 - 주석 처리
    import('./api/shared/banners-module.js'),
    import('./api/shared/activities-module.js'),
    // import('./api/newsletter'), // 파일 없음 - 주석 처리
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
  updateShippingAPI = updateShippingModule.default; // ✅ 배송 정보 업데이트
  rentcarGenerateVoucherAPI = rentcarGenerateVoucherModule.default; // ✅ 렌트카 바우처 생성
  rentcarVerifyVoucherAPI = rentcarVerifyVoucherModule.default; // ✅ 렌트카 바우처 검증
  rentcarCheckInAPI = rentcarCheckInModule.default; // ✅ 렌트카 차량 인수
  rentcarCheckOutAPI = rentcarCheckOutModule.default; // ✅ 렌트카 차량 반납
  rentcarSearchAPI = rentcarSearchModule.default; // ✅ 렌트카 검색 (가용성 + 가격)
  rentcarCreateRentalAPI = rentcarCreateRentalModule.default; // ✅ 렌트카 예약 생성
  rentcarConfirmPaymentAPI = rentcarConfirmPaymentModule.default; // ✅ 렌트카 결제 확인
  rentcarCancelRentalAPI = rentcarCancelRentalModule.default; // ✅ 렌트카 예약 취소
  rentcarVehicleBlocksAPI = rentcarVehicleBlocksModule.default; // ✅ 렌트카 차량 차단 관리
  rentcarVoucherVerifyPostAPI = rentcarVoucherVerifyPostModule.default; // ✅ 렌트카 바우처 인증 (POST)
  rentcarBookingsTodayAPI = rentcarBookingsTodayModule.default; // ✅ 렌트카 오늘 예약 조회
  rentcarDepositPreauthAPI = rentcarDepositPreauthModule.default; // ✅ 렌트카 보증금 사전승인
  rentcarDepositSettleAPI = rentcarDepositSettleModule.default; // ✅ 렌트카 보증금 정산
  rentcarAdditionalPaymentAPI = rentcarAdditionalPaymentModule.default; // ✅ 렌트카 추가 결제
  rentcarGetUserRentalsAPI = rentcarGetUserRentalsModule.default; // ✅ 렌트카 사용자 예약 목록 조회
  rentcarVendorRefundsAPI = rentcarVendorRefundsModule.default; // ✅ 렌트카 벤더 환불/정산 관리
  rentcarVehicleAvailabilityAPI = rentcarVehicleAvailabilityModule.default; // ✅ 렌트카 차량 비활성화/활성화
  lodgingGenerateVoucherAPI = lodgingGenerateVoucherModule.default; // ✅ 숙박 바우처 생성
  lodgingVerifyVoucherAPI = lodgingVerifyVoucherModule.default; // ✅ 숙박 바우처 검증
  lodgingCheckInAPI = lodgingCheckInModule.default; // ✅ 숙박 체크인
  lodgingCheckOutAPI = lodgingCheckOutModule.default; // ✅ 숙박 체크아웃
  paymentConfirmAPI = paymentConfirmModule;
  paymentRefundAPI = paymentRefundModule;
  // lodgingAPI = lodgingModule; // 파일 없음 - 주석 처리
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG] bannerModule:', bannerModule);
    console.log('[DEBUG] activityModule:', activityModule);
  }
  bannerAPI = bannerModule;
  activityAPI = activityModule;
  // newsletterAPI = newsletterModule; // 파일 없음 - 주석 처리
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
  httpServer.listen(PORT, HOST, async () => {
    console.log('\n🎉 ===== Booking System Server Ready =====');
    console.log(`✅ API Server: http://${HOST}:${PORT}`);
    console.log(`✅ Socket.IO: http://${HOST}:${PORT}/socket.io`);
    console.log(`✅ Health Check: http://${HOST}:${PORT}/health`);
    console.log('✅ Background Workers: Active');

    // 렌트카 크론잡 시작
    try {
      const { startCronJobs } = await import('./api/rentcar/cron/index.js');
      startCronJobs();
    } catch (error) {
      console.error('❌ Failed to start rentcar cron jobs:', error);
    }

    // 결제 크론잡 시작
    try {
      const { startPaymentCronJobs } = await import('./api/payments/cron/index.js');
      startPaymentCronJobs();
    } catch (error) {
      console.error('❌ Failed to start payment cron jobs:', error);
    }

    console.log('=========================================\n');
  });

  // ========== 관리자 보험 관리 API ==========

  // ✅ 보험 목록 조회 (관리자)
  app.get('/api/admin/insurance', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { connect } = await import('@planetscale/database');
      const connection = connect({ url: process.env.DATABASE_URL! });

      const result = await connection.execute(`
        SELECT * FROM insurances
        ORDER BY category, created_at DESC
      `);

      const insurances = (result.rows || []).map((row: any) => ({
        ...row,
        coverage_details: row.coverage_details ? JSON.parse(row.coverage_details) : { items: [], exclusions: [] }
      }));

      return res.status(200).json({
        success: true,
        data: insurances
      });
    } catch (error: any) {
      console.error('❌ [Admin Insurance List] 오류:', error);
      return res.status(500).json({
        success: false,
        error: '보험 목록 조회 실패',
        message: error.message
      });
    }
  });

  // ✅ 보험 생성 (관리자)
  app.post('/api/admin/insurance', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { connect } = await import('@planetscale/database');
      const connection = connect({ url: process.env.DATABASE_URL! });

      const {
        name,
        category,
        price,
        pricing_unit,
        coverage_amount,
        vendor_id,
        vehicle_id,
        description,
        coverage_details,
        is_active
      } = req.body;

      // 필수 필드 검증
      if (!name || !category || price === undefined) {
        return res.status(400).json({
          success: false,
          error: 'name, category, price는 필수입니다.'
        });
      }

      const result = await connection.execute(`
        INSERT INTO insurances (
          name, category, price, pricing_unit, coverage_amount,
          vendor_id, vehicle_id, description, coverage_details, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name,
        category,
        price,
        pricing_unit || 'fixed',
        coverage_amount || 0,
        vendor_id || null,
        vehicle_id || null,
        description || '',
        JSON.stringify(coverage_details || { items: [], exclusions: [] }),
        is_active !== undefined ? is_active : 1
      ]);

      console.log(`✅ [Admin] 보험 생성 성공: ${name} (ID: ${result.insertId})`);

      return res.status(201).json({
        success: true,
        message: '보험이 생성되었습니다.',
        data: { id: result.insertId }
      });
    } catch (error: any) {
      console.error('❌ [Admin Insurance Create] 오류:', error);
      return res.status(500).json({
        success: false,
        error: '보험 생성 실패',
        message: error.message
      });
    }
  });

  // ✅ 보험 수정 (관리자)
  app.put('/api/admin/insurance/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { connect } = await import('@planetscale/database');
      const connection = connect({ url: process.env.DATABASE_URL! });

      const { id } = req.params;
      const {
        name,
        category,
        price,
        pricing_unit,
        coverage_amount,
        vendor_id,
        vehicle_id,
        description,
        coverage_details,
        is_active
      } = req.body;

      await connection.execute(`
        UPDATE insurances
        SET
          name = ?,
          category = ?,
          price = ?,
          pricing_unit = ?,
          coverage_amount = ?,
          vendor_id = ?,
          vehicle_id = ?,
          description = ?,
          coverage_details = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name,
        category,
        price,
        pricing_unit || 'fixed',
        coverage_amount || 0,
        vendor_id || null,
        vehicle_id || null,
        description || '',
        JSON.stringify(coverage_details || { items: [], exclusions: [] }),
        is_active !== undefined ? is_active : 1,
        id
      ]);

      console.log(`✅ [Admin] 보험 수정 성공: ID ${id}`);

      return res.status(200).json({
        success: true,
        message: '보험이 수정되었습니다.'
      });
    } catch (error: any) {
      console.error('❌ [Admin Insurance Update] 오류:', error);
      return res.status(500).json({
        success: false,
        error: '보험 수정 실패',
        message: error.message
      });
    }
  });

  // ✅ 보험 삭제 (관리자)
  app.delete('/api/admin/insurance/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { connect } = await import('@planetscale/database');
      const connection = connect({ url: process.env.DATABASE_URL! });

      const { id } = req.params;

      await connection.execute(`
        DELETE FROM insurances WHERE id = ?
      `, [id]);

      console.log(`✅ [Admin] 보험 삭제 성공: ID ${id}`);

      return res.status(200).json({
        success: true,
        message: '보험이 삭제되었습니다.'
      });
    } catch (error: any) {
      console.error('❌ [Admin Insurance Delete] 오류:', error);
      return res.status(500).json({
        success: false,
        error: '보험 삭제 실패',
        message: error.message
      });
    }
  });

  // 임시: 카테고리 변환 엔드포인트 (DB의 영어 카테고리를 한글로 변환)
  app.post('/api/admin/convert-categories', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      console.log('🔄 [카테고리 변환] 시작...');

      await db.execute(`UPDATE listings SET category = '팝업' WHERE category = 'popup'`);
      await db.execute(`UPDATE listings SET category = '여행' WHERE category = 'tour'`);
      await db.execute(`UPDATE listings SET category = '숙박' WHERE category = 'stay'`);
      await db.execute(`UPDATE listings SET category = '음식' WHERE category = 'food'`);
      await db.execute(`UPDATE listings SET category = '관광지' WHERE category = 'tourist'`);
      await db.execute(`UPDATE listings SET category = '체험' WHERE category = 'experience'`);
      await db.execute(`UPDATE listings SET category = '행사' WHERE category = 'event'`);
      await db.execute(`UPDATE listings SET category = '렌트카' WHERE category = 'rentcar'`);

      console.log('✅ [카테고리 변환] 완료');

      res.json({ success: true, message: '카테고리가 한글로 변환되었습니다.' });
    } catch (error) {
      console.error('❌ [카테고리 변환] 에러:', error);
      res.status(500).json({ success: false, message: '카테고리 변환 실패' });
    }
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

  // ========== 설정 API ==========

  // ✅ Google Maps API 키 조회 (클라이언트용)
  app.get('/api/config/google-maps-key', (_req, res) => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        success: false,
        message: 'Google Maps API key not configured'
      });
    }

    return res.status(200).json({
      success: true,
      key: apiKey
    });
  });

  // ========== 리뷰 API ==========

  // ✅ 최신 리뷰 조회 (공개 API)
  app.get('/api/reviews/recent', async (req, res) => {
    try {
      const { connect } = await import('@planetscale/database');
      const connection = connect({ url: process.env.DATABASE_URL! });

      const limit = parseInt(req.query.limit as string) || 4;

      const result = await connection.execute(`
        SELECT
          r.id,
          r.listing_id,
          r.user_id,
          r.rating,
          r.title,
          r.comment_md,
          r.review_images,
          r.created_at,
          r.updated_at,
          r.helpful_count,
          r.is_verified
        FROM reviews r
        WHERE r.is_hidden = 0
        ORDER BY r.created_at DESC
        LIMIT ?
      `, [limit]);

      const reviews = (result.rows || []).map((row: any) => ({
        ...row,
        images: row.review_images ? JSON.parse(row.review_images) : [],
        review_images: undefined // 클라이언트에는 images로만 전달
      }));

      return res.status(200).json({
        success: true,
        data: reviews,
        count: reviews.length
      });
    } catch (error: any) {
      console.error('❌ [Recent Reviews API] 오류:', error);
      return res.status(500).json({
        success: false,
        error: '최신 리뷰 조회 실패',
        message: error.message
      });
    }
  });

  // 로그인 API 핸들러 함수
  const handleLogin = async (req: any, res: any) => {
    try {
      const bcrypt = await import('bcryptjs');
      const { JWTUtils } = await import('./utils/jwt.js');
      const { neon } = await import('@neondatabase/serverless');

      const { email, password } = req.body;

      console.log('🔑 로그인 요청:', email);

      // 1. 필수 필드 검증
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: '이메일과 비밀번호를 입력해주세요.'
        });
      }

      // 2. Neon DB(PostgreSQL)에서 사용자 조회
      if (!process.env.POSTGRES_DATABASE_URL) {
        console.error('❌ POSTGRES_DATABASE_URL이 설정되지 않았습니다.');
        return res.status(500).json({
          success: false,
          error: '서버 설정 오류입니다.'
        });
      }

      const sql = neon(process.env.POSTGRES_DATABASE_URL);
      const result = await sql`
        SELECT id, email, username, name, phone, role, password_hash
        FROM users
        WHERE email = ${email}
        LIMIT 1
      `;

      if (!result || result.length === 0) {
        console.log('❌ 사용자를 찾을 수 없음:', email);
        return res.status(401).json({
          success: false,
          error: '이메일 또는 비밀번호가 올바르지 않습니다.'
        });
      }

      const user: any = result[0];
      console.log('✅ 사용자 찾음:', user.email, 'role:', user.role);

      // 2-1. Vendor인 경우 PlanetScale에서 벤더 타입 확인 (숙박/렌트카 구분)
      let vendorType: string | null = null;
      if (user.role === 'vendor') {
        try {
          const { connect } = await import('@planetscale/database');
          const psConnection = connect({ url: process.env.DATABASE_URL! });

          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [LOGIN DEBUG] 벤더 타입 조회 시작... user.id:', user.id, '(타입:', typeof user.id, ')');
          }

          // STEP 1: partners 테이블 조회 (숙박 벤더)
          // 타입 불일치 문제 해결: user.id를 문자열로도 조회
          const partnerResult = await psConnection.execute(
            `SELECT id, partner_type, services, category, user_id
             FROM partners
             WHERE user_id = ? OR user_id = ?
             LIMIT 1`,
            [user.id, user.id.toString()]
          );

          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [LOGIN DEBUG] partners 조회 결과:', partnerResult.rows?.length || 0, '개');
          }

          if (partnerResult.rows && partnerResult.rows.length > 0) {
            const partner: any = partnerResult.rows[0];
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ [LOGIN DEBUG] partners 테이블에서 발견:', {
                id: partner.id,
                user_id: partner.user_id,
                partner_type: partner.partner_type,
                services: partner.services,
                category: partner.category
              });
            }

            // 1순위: partner_type 필드 사용
            if (partner.partner_type === 'lodging') {
              vendorType = 'stay';
            } else if (partner.partner_type === 'rental') {
              vendorType = 'rental';
            }
            // 2순위: services 필드 사용 (파트너 신청 양식)
            else if (partner.services === 'accommodation') {
              vendorType = 'stay';
            } else if (partner.services === 'rentcar') {
              vendorType = 'rental';
            }
            // 3순위: category 필드 사용 (하위 호환성)
            else if (partner.category === 'stay' || partner.category === 'accommodation') {
              vendorType = 'stay';
            } else if (partner.category === 'rental' || partner.category === 'rentcar') {
              vendorType = 'rental';
            }

            console.log('✅ 벤더 타입 확인 (partners):', vendorType);
          } else {
            console.log('⚠️ partners 테이블에서 찾을 수 없음, rentcar_vendors 확인 중...');

            // STEP 2: rentcar_vendors 테이블 조회 (렌트카 벤더 - 하위 호환성)
            const rentcarResult = await psConnection.execute(
              `SELECT id, user_id
               FROM rentcar_vendors
               WHERE user_id = ? OR user_id = ?
               LIMIT 1`,
              [user.id, user.id.toString()]
            );

            if (process.env.NODE_ENV === 'development') {
              console.log('🔍 [LOGIN DEBUG] rentcar_vendors 조회 결과:', rentcarResult.rows?.length || 0, '개');
            }

            if (rentcarResult.rows && rentcarResult.rows.length > 0) {
              vendorType = 'rental';
              console.log('✅ 벤더 타입 확인 (rentcar_vendors):', vendorType);
            } else {
              console.log('⚠️ rentcar_vendors에서도 찾을 수 없음');
            }
          }

          if (vendorType) {
            console.log('🎉 최종 벤더 타입:', vendorType);
          } else {
            console.log('❌ 벤더 정보를 어느 테이블에서도 찾을 수 없습니다');
          }

        } catch (partnerError) {
          console.error('⚠️ 벤더 타입 조회 오류:', partnerError);
          // 벤더 타입 조회 실패 시에도 로그인은 허용
        }
      }

      // 3. 비밀번호 검증
      if (!user.password_hash || !user.password_hash.startsWith('$2')) {
        console.error('❌ SECURITY: Invalid password hash format for user:', email);
        return res.status(500).json({
          success: false,
          error: '비밀번호 형식 오류입니다. 관리자에게 문의하세요.'
        });
      }

      const isPasswordValid = await bcrypt.default.compare(password, user.password_hash);
      console.log('🔐 비밀번호 검증:', isPasswordValid);

      if (!isPasswordValid) {
        console.log('❌ 비밀번호 불일치');
        return res.status(401).json({
          success: false,
          error: '이메일 또는 비밀번호가 올바르지 않습니다.'
        });
      }

      // 4. JWT 토큰 생성 (vendorType 포함)
      const tokenPayload: any = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };

      // Vendor인 경우 vendorType 추가
      if (vendorType) {
        tokenPayload.vendorType = vendorType;
      }

      const token = JWTUtils.generateToken(tokenPayload);

      // 5. 비밀번호 해시 제거 후 반환
      const userResponse: any = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      };

      // Vendor인 경우 vendorType 추가
      if (vendorType) {
        userResponse.vendorType = vendorType;
      }

      console.log('✅ 로그인 성공:', user.email, 'role:', user.role, vendorType ? `vendorType: ${vendorType}` : '');

      res.json({
        success: true,
        data: { user: userResponse, token },
        message: '로그인 성공'
      });
    } catch (error) {
      console.error('❌ 로그인 오류:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '로그인 처리 중 오류가 발생했습니다.'
      });
    }
  };

  // 로그인 API - 두 경로 모두 지원 (Vercel 호환)
  app.post('/api/login', handleLogin);
  app.post('/api/auth/login', handleLogin);

  // SSO 토큰 생성 API (PINTO 연동)
  app.post('/api/sso/generate', authenticate, async (req, res) => {
    try {
      const { SignJWT } = await import('jose');
      const { target, redirect_path } = req.body;
      const user = (req as any).user;

      // 허용된 타겟 사이트들
      const ALLOWED_TARGETS: Record<string, string[]> = {
        'pinto': ['https://makepinto.com', 'https://pinto-now.vercel.app', 'http://localhost:3000'],
        'travleap': ['https://travleap.com', 'https://travelap.vercel.app', 'http://localhost:5173']
      };

      if (!target || !ALLOWED_TARGETS[target]) {
        return res.status(400).json({ success: false, error: '유효하지 않은 타겟 사이트입니다.' });
      }

      const secret = process.env.SSO_SECRET || process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ success: false, error: 'SSO 설정 오류' });
      }

      const now = Math.floor(Date.now() / 1000);
      const username = user.name || user.email?.split('@')[0] || user.email;

      const ssoToken = await new SignJWT({
        user_id: user.userId,
        email: user.email,
        username: username,
        name: user.name,
        role: user.role,
        source: 'travleap',
        target: target,
        redirect_path: redirect_path || '/'
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now)
        .setExpirationTime(now + 300) // 5분
        .sign(new TextEncoder().encode(secret));

      const targetBaseUrl = ALLOWED_TARGETS[target][0];
      const callbackUrl = `${targetBaseUrl}/sso/callback?token=${ssoToken}`;

      console.log(`✅ [SSO Generate] ${user.email} → ${target}`);

      return res.json({
        success: true,
        data: { token: ssoToken, callback_url: callbackUrl, expires_in: 300 }
      });
    } catch (error) {
      console.error('❌ [SSO Generate] Error:', error);
      return res.status(500).json({ success: false, error: '토큰 생성 중 오류가 발생했습니다.' });
    }
  });

  // 회원가입 API
  app.post('/api/register', async (req, res) => {
    try {
      const bcrypt = await import('bcryptjs');
      const { JWTUtils } = await import('./utils/jwt.js');
      const { connect } = await import('@planetscale/database');

      const { email, password, name, phone } = req.body;

      console.log('📝 회원가입 요청:', email);

      // 1. 필수 필드 검증
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: '이메일, 비밀번호, 이름은 필수입니다.'
        });
      }

      // 2. 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: '올바른 이메일 형식이 아닙니다.'
        });
      }

      // 3. 비밀번호 길이 검증
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: '비밀번호는 최소 6자 이상이어야 합니다.'
        });
      }

      // 4. 이메일 중복 체크
      const conn = connect({ url: process.env.DATABASE_URL! });
      const existingResult = await conn.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingResult.rows && existingResult.rows.length > 0) {
        console.log('❌ 이미 존재하는 이메일:', email);
        return res.status(400).json({
          success: false,
          error: '이미 가입된 이메일입니다.'
        });
      }

      // 5. 비밀번호 해싱
      const salt = await bcrypt.default.genSalt(10);
      const hashedPassword = await bcrypt.default.hash(password, salt);
      console.log('🔐 비밀번호 해싱 완료');

      // 6. 사용자 생성
      await conn.execute(
        `INSERT INTO users (email, password_hash, name, phone, role, created_at)
         VALUES (?, ?, ?, ?, 'user', NOW())`,
        [email, hashedPassword, name, phone || '']
      );

      // 7. 생성된 사용자 조회
      const newUserResult = await conn.execute(
        'SELECT id, email, name, role FROM users WHERE email = ?',
        [email]
      );

      const newUser: any = newUserResult.rows[0];
      console.log('✅ 사용자 생성 완료 - ID:', newUser.id);

      // 8. JWT 토큰 생성
      const token = JWTUtils.generateToken({
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      });

      console.log('✅ 회원가입 완료:', email);

      res.status(201).json({
        success: true,
        data: { user: newUser, token },
        message: '회원가입이 완료되었습니다.'
      });
    } catch (error) {
      console.error('❌ 회원가입 오류:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '회원가입 처리 중 오류가 발생했습니다.'
      });
    }
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

  // ✅ 배송 정보 업데이트 (송장번호, 배송 상태 변경)
  app.patch('/api/bookings/:id/shipping', async (req, res) => {
    await updateShippingAPI(req as any, res as any);
  });

  // ✅ 렌트카 바우처 생성 (결제 완료 후)
  app.post('/api/rentcar/bookings/:id/generate-voucher', async (req, res) => {
    await rentcarGenerateVoucherAPI(req as any, res as any);
  });

  // ✅ 렌트카 바우처 검증 (벤더 확인용)
  app.get('/api/rentcar/verify/:voucherCode', async (req, res) => {
    await rentcarVerifyVoucherAPI(req as any, res as any);
  });

  // ✅ 렌트카 차량 인수 체크인 (ID 기반)
  app.post('/api/rentcar/bookings/:id/check-in', async (req, res) => {
    await rentcarCheckInAPI(req as any, res as any);
  });

  // ✅ 렌트카 차량 인수 체크인 (벤더용 - booking_number 기반)
  app.post('/api/rentcar/check-in', async (req, res) => {
    await rentcarCheckInAPI(req as any, res as any);
  });

  // ✅ 렌트카 차량 반납 체크아웃 (ID 기반)
  app.post('/api/rentcar/bookings/:id/check-out', async (req, res) => {
    await rentcarCheckOutAPI(req as any, res as any);
  });

  // ✅ 렌트카 차량 반납 체크아웃 (벤더용 - booking_number 기반)
  app.post('/api/rentcar/check-out', async (req, res) => {
    await rentcarCheckOutAPI(req as any, res as any);
  });

  // ========== 렌트카 MVP 시스템 API ==========

  // ✅ 렌트카 보험 목록 조회 (공개 API, 인증 불필요)
  app.get('/api/rentcar/insurances', async (req, res) => {
    try {
      const { vendor_id, vehicle_id } = req.query;
      const { connect } = await import('@planetscale/database');
      const connection = connect({ url: process.env.DATABASE_URL! });

      // 렌트카 카테고리의 활성 보험만 조회
      let query = `
        SELECT
          id, name, category, price, pricing_unit, coverage_amount,
          vendor_id, vehicle_id,
          description, coverage_details,
          created_at, updated_at
        FROM insurances
        WHERE category = 'rentcar'
          AND is_active = 1
      `;

      const params: any[] = [];

      // vendor_id 필터링: null(공용) 또는 특정 벤더
      if (vendor_id) {
        query += ` AND (vendor_id IS NULL OR vendor_id = ?)`;
        params.push(parseInt(vendor_id as string));
      } else {
        // vendor_id가 없으면 공용 보험만
        query += ` AND vendor_id IS NULL`;
      }

      // vehicle_id 필터링: null(전체 차량) 또는 특정 차량
      if (vehicle_id) {
        query += ` AND (vehicle_id IS NULL OR vehicle_id = ?)`;
        params.push(parseInt(vehicle_id as string));
      } else {
        // vehicle_id가 없으면 벤더 전체 차량용 보험만
        query += ` AND vehicle_id IS NULL`;
      }

      query += ` ORDER BY price ASC`;

      const result = await connection.execute(query, params);

      const insurances = (result.rows || []).map((row: any) => ({
        ...row,
        coverage_details: row.coverage_details ? JSON.parse(row.coverage_details) : { items: [], exclusions: [] },
        is_active: true, // 이미 필터링했으므로 항상 true
        vendor_id: row.vendor_id || null,
        vehicle_id: row.vehicle_id || null
      }));

      return res.status(200).json({
        success: true,
        data: insurances,
        count: insurances.length
      });

    } catch (error: any) {
      console.error('❌ [Rentcar Insurances API] 오류:', error);
      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: error.message
      });
    }
  });

  // ✅ 렌트카 검색 (가용성 + 가격 계산)
  app.get('/api/rentals/search', async (req, res) => {
    await rentcarSearchAPI(req as any, res as any);
  });

  // ✅ 렌트카 예약 생성 (운전자 검증 + 중복 방지)
  app.post('/api/rentals', async (req, res) => {
    await rentcarCreateRentalAPI(req as any, res as any);
  });

  // ✅ 렌트카 결제 확인 (Toss Payments)
  app.post('/api/rentals/:booking_number/confirm', async (req, res) => {
    await rentcarConfirmPaymentAPI(req as any, res as any);
  });

  // ✅ 렌트카 예약 취소 (정책 기반 환불)
  app.post('/api/rentals/:booking_number/cancel', async (req, res) => {
    await rentcarCancelRentalAPI(req as any, res as any);
  });

  // ✅ 렌트카 차량 차단 생성
  app.post('/api/rentcar/vehicles/:vehicle_id/blocks', async (req, res) => {
    await rentcarVehicleBlocksAPI(req as any, res as any);
  });

  // ✅ 렌트카 차량 차단 목록 조회
  app.get('/api/rentcar/vehicles/:vehicle_id/blocks', async (req, res) => {
    await rentcarVehicleBlocksAPI(req as any, res as any);
  });

  // ✅ 렌트카 차량 차단 해제
  app.patch('/api/rentcar/vehicles/:vehicle_id/blocks/:block_id', async (req, res) => {
    await rentcarVehicleBlocksAPI(req as any, res as any);
  });

  // 렌트카 바우처 인증 (벤더용 - POST)
  app.post('/api/rentcar/voucher/verify', async (req, res) => {
    await rentcarVoucherVerifyPostAPI(req as any, res as any);
  });

  // ✅ 렌트카 오늘 예약 조회 (벤더용)
  app.get('/api/rentcar/bookings/today', async (req, res) => {
    await rentcarBookingsTodayAPI(req as any, res as any);
  });

  // ✅ 렌트카 보증금 사전승인 (체크인 시)
  app.post('/api/rentcar/deposit/preauth', async (req, res) => {
    await rentcarDepositPreauthAPI(req as any, res as any);
  });

  // ✅ 렌트카 보증금 정산 (체크아웃 시)
  app.post('/api/rentcar/deposit/settle', async (req, res) => {
    await rentcarDepositSettleAPI(req as any, res as any);
  });

  // ✅ 렌트카 추가 결제 (보증금 부족 또는 현장 결제)
  app.post('/api/rentcar/additional-payment', async (req, res) => {
    await rentcarAdditionalPaymentAPI(req as any, res as any);
  });

  // ✅ 렌트카 사용자 예약 목록 조회 (체크인/체크아웃 정보 포함)
  app.get('/api/rentcar/user/rentals', async (req, res) => {
    await rentcarGetUserRentalsAPI(req as any, res as any);
  });

  // ✅ 렌트카 벤더 환불/정산 관리 (취소 환불, 보증금 정산, 추가 결제 내역)
  app.get('/api/rentcar/vendor/refunds', async (req, res) => {
    await rentcarVendorRefundsAPI(req as any, res as any);
  });

  // ✅ 렌트카 차량 비활성화/활성화
  app.patch('/api/rentcar/vehicles/:id/availability', async (req, res) => {
    await rentcarVehicleAvailabilityAPI(req as any, res as any);
  });

  // ========== 숙박 검증 시스템 API ==========

  // ✅ 숙박 바우처 생성 (결제 완료 후)
  app.post('/api/lodging/bookings/:id/generate-voucher', async (req, res) => {
    await lodgingGenerateVoucherAPI(req as any, res as any);
  });

  // ✅ 숙박 바우처 검증 (프론트 데스크 확인용)
  app.get('/api/lodging/verify/:voucherCode', async (req, res) => {
    await lodgingVerifyVoucherAPI(req as any, res as any);
  });

  // ✅ 숙박 체크인 (게스트 도착)
  app.post('/api/lodging/bookings/:id/check-in', async (req, res) => {
    await lodgingCheckInAPI(req as any, res as any);
  });

  // ✅ 숙박 체크아웃 (게스트 퇴실)
  app.post('/api/lodging/bookings/:id/check-out', async (req, res) => {
    await lodgingCheckOutAPI(req as any, res as any);
  });

  // Toss Payments 웹훅
  app.post('/api/payments/webhook', async (req, res) => {
    await webhookAPI(req as any, res as any);
  });

  // 결제 승인 (✅ 기능 플래그 적용: payment_enabled)
  app.post('/api/payments/confirm', requireFeature('payment_enabled'), async (req, res) => {
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

  // 결제 환불 처리 (✅ 기능 플래그 적용: refund_enabled)
  app.post('/api/payments/refund', requireFeature('refund_enabled'), async (req, res) => {
    try {
      const { paymentKey, cancelReason, cancelAmount, skipPolicy } = req.body;

      if (!paymentKey || !cancelReason) {
        return res.status(400).json({
          success: false,
          message: 'paymentKey와 cancelReason은 필수입니다.'
        });
      }

      const result = await paymentRefundAPI.refundPayment({
        paymentKey,
        cancelReason,
        cancelAmount,
        skipPolicy
      });

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('❌ [API] Refund error:', error);
      res.status(500).json({
        success: false,
        message: '환불 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      });
    }
  });

  // 환불 정책 조회
  app.get('/api/payments/refund-policy/:paymentKey', async (req, res) => {
    try {
      const { paymentKey } = req.params;

      if (!paymentKey) {
        return res.status(400).json({
          success: false,
          message: 'paymentKey가 필요합니다.'
        });
      }

      const result = await paymentRefundAPI.getRefundPolicy(paymentKey);

      res.status(200).json(result);
    } catch (error) {
      console.error('❌ [API] Get refund policy error:', error);
      res.status(500).json({
        success: false,
        message: '환불 정책 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
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

  // ===== 숙박 & 렌트카 목록 API =====

  // 숙박 호텔 목록 (partner 기준 그룹핑)
  app.get('/api/accommodations', async (req, res) => {
    try {
      const { connect } = await import('@planetscale/database');
      const connection = connect({ url: process.env.DATABASE_URL! });

      // forPartners=true면 파트너 전용 포함, 아니면 일반 숙소만 표시
      const forPartners = req.query.forPartners === 'true';
      const partnerOnlyFilter = forPartners
        ? '' // 가맹점 페이지: 모든 숙소 표시
        : 'AND (l.is_partner_only = 0 OR l.is_partner_only IS NULL)'; // 카테고리 페이지: 파트너 전용 제외

      const hotels = await connection.execute(`
        SELECT
          p.id as partner_id,
          p.business_name,
          p.contact_name,
          p.phone,
          p.email,
          p.tier,
          p.is_verified,
          p.is_featured,
          COUNT(l.id) as room_count,
          MIN(l.price_from) as min_price,
          MAX(l.price_from) as max_price,
          MIN(l.images) as sample_images,
          GROUP_CONCAT(DISTINCT l.location SEPARATOR ', ') as locations,
          (
            SELECT AVG(r.rating)
            FROM reviews r
            INNER JOIN listings l2 ON r.listing_id = l2.id
            WHERE l2.partner_id = p.id AND r.is_hidden = 0
          ) as avg_rating,
          (
            SELECT COUNT(*)
            FROM reviews r
            INNER JOIN listings l2 ON r.listing_id = l2.id
            WHERE l2.partner_id = p.id AND r.is_hidden = 0
          ) as total_reviews
        FROM partners p
        LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = 1857 AND l.is_published = 1 AND l.is_active = 1 ${partnerOnlyFilter}
        WHERE p.is_active = 1
        GROUP BY p.id, p.business_name, p.contact_name, p.phone, p.email, p.tier, p.is_verified, p.is_featured
        HAVING room_count > 0
        ORDER BY p.is_verified DESC, p.is_featured DESC, avg_rating DESC
      `);

      const parsedHotels = hotels.rows.map((hotel: any) => {
        let images = [];
        try {
          if (hotel.sample_images) {
            const parsed = JSON.parse(hotel.sample_images);
            images = Array.isArray(parsed) ? parsed : [];
          }
        } catch (e) {
          // JSON 파싱 실패시 빈 배열
        }

        return {
          partner_id: hotel.partner_id,
          business_name: hotel.business_name,
          contact_name: hotel.contact_name,
          phone: hotel.phone,
          email: hotel.email,
          tier: hotel.tier,
          is_verified: hotel.is_verified,
          is_featured: hotel.is_featured,
          room_count: hotel.room_count,
          min_price: hotel.min_price,
          max_price: hotel.max_price,
          images: images,
          locations: hotel.locations,
          avg_rating: hotel.avg_rating ? parseFloat(hotel.avg_rating).toFixed(1) : '0.0',
          total_reviews: hotel.total_reviews || 0,
        };
      });

      res.json({
        success: true,
        data: parsedHotels,
        total: parsedHotels.length,
      });
    } catch (error: any) {
      console.error('❌ Error fetching accommodations:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 렌트카 업체 목록 (vendor 기준 그룹핑)
  app.get('/api/rentcars', async (_req, res) => {
    try {
      const { connect } = await import('@planetscale/database');
      const connection = connect({ url: process.env.DATABASE_URL! });

      const vendors = await connection.execute(`
        SELECT
          v.id as vendor_id,
          v.vendor_code,
          v.business_name,
          v.brand_name,
          v.average_rating,
          v.is_verified,
          COUNT(rv.id) as vehicle_count,
          MIN(rv.daily_rate_krw) as min_price,
          MAX(rv.daily_rate_krw) as max_price,
          MIN(rv.images) as sample_images
        FROM rentcar_vendors v
        LEFT JOIN rentcar_vehicles rv ON v.id = rv.vendor_id AND rv.is_active = 1
        WHERE v.status = 'active'
        GROUP BY v.id, v.vendor_code, v.business_name, v.brand_name, v.average_rating, v.is_verified
        ORDER BY v.is_verified DESC, v.business_name ASC
      `);

      const parsedVendors = vendors.rows.map((vendor: any) => {
        let images = [];
        try {
          if (vendor.sample_images) {
            const parsed = JSON.parse(vendor.sample_images);
            images = Array.isArray(parsed) ? parsed : [];
          }
        } catch (e) {
          // JSON 파싱 실패시 빈 배열
        }

        return {
          vendor_id: vendor.vendor_id,
          vendor_code: vendor.vendor_code,
          vendor_name: vendor.business_name || vendor.brand_name || vendor.vendor_code,
          business_name: vendor.business_name,
          brand_name: vendor.brand_name,
          average_rating: vendor.average_rating ? parseFloat(vendor.average_rating).toFixed(1) : '0.0',
          is_verified: vendor.is_verified,
          vehicle_count: vendor.vehicle_count,
          min_price: vendor.min_price,
          max_price: vendor.max_price,
          images: images
        };
      });

      res.json({
        success: true,
        data: parsedVendors,
        total: parsedVendors.length,
      });
    } catch (error: any) {
      console.error('❌ Error fetching rentcar vendors:', error);
      res.status(500).json({ success: false, error: error.message });
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
      const forPartners = req.query.forPartners === 'true'; // 가맹점 페이지용

      const offset = (page - 1) * limit;

      // 데이터베이스 동적 import
      const { db } = await import('./utils/database.js');

      // forPartners=true면 파트너 전용 포함, 아니면 일반 상품만 (카테고리 페이지용)
      const partnerFilter = forPartners
        ? '' // 가맹점 페이지: 모든 리스팅 표시
        : 'AND (l.is_partner_only = 0 OR l.is_partner_only IS NULL)'; // 카테고리 페이지: 파트너 전용 제외

      // 기본 쿼리
      let sql = `
        SELECT l.*, c.slug as category_slug, c.name_ko as category_name
        FROM listings l
        LEFT JOIN categories c ON l.category_id = c.id
        WHERE l.is_published = 1 AND l.is_active = 1
        ${partnerFilter}
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

      // 디버깅: 카테고리 값 확인
      console.log('🔍 [상품 상세] ID:', id, '| category:', listings[0].category, '| title:', listings[0].title);

      res.json({
        success: true,
        data: listings[0]
      });
    } catch (error) {
      console.error('❌ [API] Get listing error:', error);
      res.status(500).json({ success: false, message: '상품 조회 실패' });
    }
  });

  // 상품 생성 (관리자용)
  app.post('/api/admin/listings', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const listingData = req.body;

      console.log('📦 상품 생성 요청:', listingData.title);

      // 카테고리는 한글 그대로 저장 ('팝업', '여행', '숙박' 등)

      // INSERT 쿼리 (팝업 상품 필드 포함)
      const result = await db.execute(`
        INSERT INTO listings
        (title, category, category_id, price_from, price_to, child_price, infant_price,
         location, address, meeting_point, images, short_description, description_md,
         highlights, included, excluded, max_capacity, is_featured, is_active, is_published,
         has_options, min_purchase, max_purchase, stock_enabled, stock, shipping_fee, is_refundable,
         created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        listingData.title,
        listingData.category,  // 한글 카테고리 저장 ('팝업', '여행', '숙박' 등)
        listingData.category_id,
        listingData.price || 0,
        listingData.price || 0,
        listingData.childPrice || null,
        listingData.infantPrice || null,
        listingData.location || '신안군',
        listingData.detailedAddress || '',
        listingData.meetingPoint || '',
        JSON.stringify(listingData.images || []),
        listingData.description || '',
        listingData.longDescription || listingData.description || '',
        JSON.stringify(listingData.highlights || []),
        JSON.stringify(listingData.included || []),
        JSON.stringify(listingData.excluded || []),
        listingData.maxCapacity || 20,
        listingData.featured ? 1 : 0,
        listingData.is_active !== false ? 1 : 0,
        1,
        // 팝업 상품 전용 필드
        listingData.hasOptions ? 1 : 0,
        listingData.minPurchase || 1,
        listingData.maxPurchase || null,
        listingData.stockEnabled ? 1 : 0,
        listingData.stock || 0,
        listingData.shippingFee || null,
        listingData.is_refundable !== undefined ? (listingData.is_refundable ? 1 : 0) : 1 // 기본값: 환불 가능
      ]);

      console.log('✅ 상품 생성 완료:', result.insertId);

      res.json({
        success: true,
        data: {
          id: result.insertId,
          ...listingData
        },
        message: '상품이 생성되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Create listing error:', error);
      res.status(500).json({
        success: false,
        message: '상품 생성 실패: ' + (error instanceof Error ? error.message : String(error))
      });
    }
  });

  // 상품 수정 (관리자용)
  app.put('/api/admin/listings/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const listingId = parseInt(req.params.id);
      const listingData = req.body;

      console.log('📝 상품 수정 요청:', listingId, listingData.title);

      // 카테고리는 한글 그대로 저장 ('팝업', '여행', '숙박' 등)

      await db.execute(`
        UPDATE listings SET
          title = ?, category = ?, category_id = ?, price_from = ?, price_to = ?,
          child_price = ?, infant_price = ?,
          location = ?, address = ?, meeting_point = ?,
          images = ?, short_description = ?, description_md = ?,
          highlights = ?, included = ?, excluded = ?,
          max_capacity = ?, is_featured = ?, is_active = ?,
          has_options = ?, min_purchase = ?, max_purchase = ?,
          stock_enabled = ?, stock = ?, shipping_fee = ?, is_refundable = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        listingData.title,
        listingData.category,  // 한글 카테고리 저장
        listingData.category_id,
        listingData.price || 0,
        listingData.price || 0,
        listingData.childPrice || null,
        listingData.infantPrice || null,
        listingData.location || '신안군',
        listingData.detailedAddress || '',
        listingData.meetingPoint || '',
        JSON.stringify(listingData.images || []),
        listingData.description || '',
        listingData.longDescription || listingData.description || '',
        JSON.stringify(listingData.highlights || []),
        JSON.stringify(listingData.included || []),
        JSON.stringify(listingData.excluded || []),
        listingData.maxCapacity || 20,
        listingData.featured ? 1 : 0,
        listingData.is_active !== false ? 1 : 0,
        // 팝업 상품 전용 필드
        listingData.hasOptions ? 1 : 0,
        listingData.minPurchase || 1,
        listingData.maxPurchase || null,
        listingData.stockEnabled ? 1 : 0,
        listingData.stock || 0,
        listingData.shippingFee || null,
        listingData.is_refundable !== undefined ? (listingData.is_refundable ? 1 : 0) : 1, // 기본값: 환불 가능
        listingId
      ]);

      console.log('✅ 상품 UPDATE 완료:', listingId);

      // ⭐ 중요: 업데이트된 데이터를 DB에서 다시 조회해서 반환
      const updatedListing = await db.query(`
        SELECT
          l.*,
          c.name_ko as category_name,
          c.slug as category_slug,
          p.business_name as partner_name
        FROM listings l
        LEFT JOIN categories c ON l.category_id = c.id
        LEFT JOIN partners p ON l.partner_id = p.id
        WHERE l.id = ?
      `, [listingId]);

      console.log('✅ 업데이트된 상품 데이터 조회 완료');

      res.json({
        success: true,
        data: updatedListing[0] || null,
        message: '상품이 수정되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update listing error:', error);
      res.status(500).json({
        success: false,
        message: '상품 수정 실패: ' + (error instanceof Error ? error.message : String(error))
      });
    }
  });

  // ===== 리뷰 API =====

  // 최근 리뷰 조회
  // 특정 상품의 리뷰 조회
  app.get('/api/reviews', async (req, res) => {
    try {
      const listingId = req.query.listing_id as string;
      const { db } = await import('./utils/database.js');

      let query = `
        SELECT r.*, u.name as user_name, u.email as user_email
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
      `;

      const params: any[] = [];

      if (listingId) {
        query += ' WHERE r.listing_id = ?';
        params.push(parseInt(listingId));
      }

      query += ' ORDER BY r.created_at DESC';

      const reviews = await db.query(query, params);

      res.json({
        success: true,
        data: reviews || []
      });
    } catch (error) {
      console.error('❌ [API] Get reviews error:', error);
      res.status(500).json({ success: false, message: '리뷰 조회 실패', data: [] });
    }
  });

  // 리뷰 작성
  app.post('/api/reviews', async (req, res) => {
    try {
      const { listing_id, user_id, rating, title, content, review_type = 'listing' } = req.body;
      const { db } = await import('./utils/database.js');

      // 필수 필드 검증
      if (!listing_id || !user_id || !rating || !content) {
        return res.status(400).json({
          success: false,
          error: '필수 정보가 누락되었습니다'
        });
      }

      // 평점 범위 검증
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: '평점은 1-5 사이여야 합니다'
        });
      }

      // 리뷰 생성
      const result = await db.insert('reviews', {
        listing_id,
        user_id,
        rating,
        title: title || '',
        comment_md: content,
        review_type,
        is_verified: true,
        created_at: new Date()
      });

      // 상품의 평균 평점과 리뷰 개수 업데이트
      const stats = await db.query(`
        SELECT
          COUNT(*) as review_count,
          COALESCE(AVG(rating), 0) as avg_rating
        FROM reviews
        WHERE listing_id = ?
      `, [listing_id]);

      if (stats && stats.length > 0) {
        await db.update('listings', listing_id, {
          rating_avg: stats[0].avg_rating,
          rating_count: stats[0].review_count
        });
      }

      res.json({
        success: true,
        data: result,
        message: '리뷰가 성공적으로 등록되었습니다'
      });
    } catch (error) {
      console.error('❌ [API] Create review error:', error);
      res.status(500).json({
        success: false,
        error: '리뷰 생성에 실패했습니다'
      });
    }
  });

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

  // 특정 상품에 리뷰 작성 (사용자)
  app.post('/api/reviews/:listingId', async (req, res) => {
    try {
      const listingId = parseInt(req.params.listingId);
      const { user_id, rating, title, content, images } = req.body;
      const { db } = await import('./utils/database.js');

      // 필수 필드 검증
      if (!user_id || !rating || !content) {
        return res.status(400).json({
          success: false,
          error: '필수 정보가 누락되었습니다'
        });
      }

      // 평점 범위 검증
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: '평점은 1-5 사이여야 합니다'
        });
      }

      // 리뷰 생성
      const result = await db.execute(`
        INSERT INTO reviews (listing_id, user_id, rating, title, comment_md, images, is_verified, created_at)
        VALUES (?, ?, ?, ?, ?, ?, true, NOW())
      `, [listingId, user_id, rating, title || '', content, JSON.stringify(images || [])]);

      // 상품의 평균 평점과 리뷰 개수 업데이트
      const stats = await db.query(`
        SELECT
          COUNT(*) as review_count,
          COALESCE(AVG(rating), 0) as avg_rating
        FROM reviews
        WHERE listing_id = ?
      `, [listingId]);

      if (stats && stats.length > 0) {
        await db.execute(`
          UPDATE listings
          SET rating_avg = ?, rating_count = ?
          WHERE id = ?
        `, [stats[0].avg_rating, stats[0].review_count, listingId]);
      }

      // 생성된 리뷰 조회
      const newReview = await db.query(`
        SELECT r.*, u.name as user_name
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `, [result.insertId]);

      res.json({
        success: true,
        data: newReview[0],
        message: '리뷰가 성공적으로 등록되었습니다'
      });
    } catch (error) {
      console.error('❌ [API] Create review error:', error);
      res.status(500).json({
        success: false,
        error: '리뷰 생성에 실패했습니다'
      });
    }
  });

  // 사용자 리뷰 삭제 (본인만 가능)
  app.delete('/api/reviews/edit/:reviewId', async (req, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      const userId = parseInt(req.query.user_id as string);
      const { db } = await import('./utils/database.js');

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: '사용자 ID가 필요합니다'
        });
      }

      // 리뷰 소유권 확인
      const review = await db.query(`
        SELECT user_id, listing_id FROM reviews WHERE id = ?
      `, [reviewId]);

      if (!review || review.length === 0) {
        return res.status(404).json({
          success: false,
          error: '리뷰를 찾을 수 없습니다'
        });
      }

      if (review[0].user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: '본인의 리뷰만 삭제할 수 있습니다'
        });
      }

      const listingId = review[0].listing_id;

      // 리뷰 삭제
      await db.execute(`DELETE FROM reviews WHERE id = ?`, [reviewId]);

      // 상품 평점 업데이트
      const stats = await db.query(`
        SELECT
          COUNT(*) as review_count,
          COALESCE(AVG(rating), 0) as avg_rating
        FROM reviews
        WHERE listing_id = ?
      `, [listingId]);

      if (stats && stats.length > 0) {
        await db.execute(`
          UPDATE listings
          SET rating_avg = ?, rating_count = ?
          WHERE id = ?
        `, [stats[0].avg_rating, stats[0].review_count, listingId]);
      }

      res.json({
        success: true,
        message: '리뷰가 삭제되었습니다'
      });
    } catch (error) {
      console.error('❌ [API] Delete review error:', error);
      res.status(500).json({
        success: false,
        error: '리뷰 삭제에 실패했습니다'
      });
    }
  });

  // 리뷰 도움됨 표시
  app.post('/api/reviews/helpful/:reviewId', async (req, res) => {
    try {
      const reviewId = parseInt(req.params.reviewId);
      const { user_id } = req.body;
      const { db } = await import('./utils/database.js');

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: '사용자 ID가 필요합니다'
        });
      }

      // 리뷰가 존재하는지 확인
      const review = await db.query(`SELECT id FROM reviews WHERE id = ?`, [reviewId]);
      if (!review || review.length === 0) {
        return res.status(404).json({
          success: false,
          error: '리뷰를 찾을 수 없습니다'
        });
      }

      // helpful_count 증가
      await db.execute(`
        UPDATE reviews
        SET helpful_count = helpful_count + 1
        WHERE id = ?
      `, [reviewId]);

      // 업데이트된 카운트 조회
      const updated = await db.query(`
        SELECT helpful_count FROM reviews WHERE id = ?
      `, [reviewId]);

      res.json({
        success: true,
        data: { helpful_count: updated[0].helpful_count },
        message: '도움됨으로 표시되었습니다'
      });
    } catch (error) {
      console.error('❌ [API] Mark review helpful error:', error);
      res.status(500).json({
        success: false,
        error: '도움됨 처리에 실패했습니다'
      });
    }
  });

  // ===== 사용자 관리 API =====

  // 사용자 목록 조회 (Admin Dashboard용) - 인증 필수
  app.get('/api/users', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      // Neon DB 사용 (users 테이블은 Neon에 있음)
      const { Pool } = await import('@neondatabase/serverless');
      const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

      if (!connectionString) {
        throw new Error('POSTGRES_DATABASE_URL not configured');
      }

      const pool = new Pool({ connectionString });
      const result = await pool.query(`
        SELECT id, email, name, role, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
      `);

      await pool.end();

      res.json({
        success: true,
        data: result.rows || []
      });
    } catch (error) {
      console.error('❌ [API] Get users error:', error);
      res.status(500).json({ success: false, message: '사용자 목록 조회 실패', data: [] });
    }
  });

  // Admin 사용자 목록 조회 (Vercel style API 파일 사용)
  app.get('/api/admin/users', async (req, res) => {
    try {
      const adminUsersAPI = await import('./api/admin/users.js');
      await adminUsersAPI.default(req as any, res as any);
    } catch (error) {
      console.error('❌ [API] Admin users error:', error);
      res.status(500).json({ success: false, message: '사용자 목록 조회 실패', data: [] });
    }
  });

  // Admin 예약 환불 처리 (관리자 전용)
  app.post('/api/admin/refund-booking', async (req, res) => {
    try {
      const adminRefundAPI = await import('./api/admin/refund-booking.js');
      await adminRefundAPI.default(req as any, res as any);
    } catch (error) {
      console.error('❌ [API] Admin refund error:', error);
      res.status(500).json({ success: false, message: '환불 처리 중 오류가 발생했습니다' });
    }
  });

  // 현재 사용자 프로필 조회 - 인증 필수
  app.get('/api/user/profile', authenticate, async (req, res) => {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다' });
      }

      // Neon PostgreSQL DB 사용 (users 테이블)
      if (!process.env.POSTGRES_DATABASE_URL) {
        console.error('❌ POSTGRES_DATABASE_URL이 설정되지 않았습니다.');
        return res.status(500).json({ success: false, message: '서버 설정 오류입니다.' });
      }

      const sql = neon(process.env.POSTGRES_DATABASE_URL);
      const users = await sql`
        SELECT id, email, username, name, phone, postal_code, address, detail_address, role, created_at, updated_at
        FROM users
        WHERE id = ${userId}
      `;

      if (!users || users.length === 0) {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
      }

      const user = users[0];

      console.log('✅ [Profile] 사용자 프로필 조회 성공:', user.email);

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone || '',
          postalCode: user.postal_code || '',
          address: user.address || '',
          detailAddress: user.detail_address || '',
          role: user.role,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });
    } catch (error) {
      console.error('❌ [API] Get user profile error:', error);
      res.status(500).json({ success: false, message: '프로필 조회 실패' });
    }
  });

  // 사용자 주소 업데이트 - 인증 필수
  app.put('/api/user/address', authenticate, async (req, res) => {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const userId = (req as any).user?.userId;
      const email = (req as any).user?.email;
      const { postalCode, address, detailAddress } = req.body;

      if (!userId || !email) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다' });
      }

      if (!postalCode || !address) {
        return res.status(400).json({ success: false, message: '우편번호와 주소는 필수입니다' });
      }

      // Neon PostgreSQL DB 사용 (users 테이블)
      if (!process.env.POSTGRES_DATABASE_URL) {
        console.error('❌ POSTGRES_DATABASE_URL이 설정되지 않았습니다.');
        return res.status(500).json({ success: false, message: '서버 설정 오류입니다.' });
      }

      const sql = neon(process.env.POSTGRES_DATABASE_URL);
      // ID 대신 email로 조회 (DB 마이그레이션 시 ID 변경되어도 email은 동일)
      await sql`
        UPDATE users
        SET postal_code = ${postalCode},
            address = ${address},
            detail_address = ${detailAddress || ''},
            updated_at = CURRENT_TIMESTAMP
        WHERE email = ${email}
      `;

      console.log('✅ [Address] 주소 업데이트 성공: email=', email);

      res.json({
        success: true,
        message: '주소가 성공적으로 업데이트되었습니다'
      });
    } catch (error) {
      console.error('❌ [API] Update user address error:', error);
      res.status(500).json({ success: false, message: '주소 업데이트 실패' });
    }
  });

  // 사용자 결제 내역 조회 - 인증 필수
  app.get('/api/user/payments', authenticate, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다' });
      }

      // ✅ Neon PostgreSQL에서 사용자 정보 조회
      const { Pool } = await import('@neondatabase/serverless');
      const poolNeon = new Pool({
        connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
      });

      let userInfo = null;
      try {
        const userResult = await poolNeon.query(
          `SELECT id, name, email, phone FROM users WHERE id = $1 LIMIT 1`,
          [userId]
        );
        if (userResult.rows && userResult.rows.length > 0) {
          userInfo = userResult.rows[0];
        }
      } catch (userError) {
        console.warn('⚠️ [API] Failed to fetch user info from Neon:', userError);
      } finally {
        await poolNeon.end();
      }

      const payments = await db.query(`
        SELECT
          p.id,
          p.booking_id,
          p.order_id,
          p.order_id_str,
          p.payment_key,
          p.amount,
          p.payment_method,
          p.payment_status,
          p.approved_at,
          p.receipt_url,
          p.card_company,
          p.card_number,
          p.notes,
          p.created_at,
          b.booking_number,
          b.listing_id,
          l.title as listing_title,
          l.category,
          l.images
        FROM payments p
        LEFT JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN listings l ON b.listing_id = l.id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
        LIMIT 100
      `, [userId]);

      // ✅ 각 결제 내역에 사용자 정보 추가
      const paymentsWithUserInfo = payments.map(payment => ({
        ...payment,
        user_name: userInfo?.name || '정보없음',
        user_email: userInfo?.email || null,
        user_phone: userInfo?.phone || null
      }));

      res.json({
        success: true,
        data: paymentsWithUserInfo
      });
    } catch (error) {
      console.error('❌ [API] Get user payments error:', error);
      res.status(500).json({ success: false, message: '결제 내역 조회 실패' });
    }
  });

  // 사용자 포인트 내역 조회 - 인증 필수
  app.get('/api/user/points', authenticate, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다' });
      }

      // 현재 총 포인트 조회
      const users = await db.query(`
        SELECT total_points FROM users WHERE id = ?
      `, [userId]);

      if (!users || users.length === 0) {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다' });
      }

      const totalPoints = users[0].total_points || 0;

      // 포인트 내역 조회 (최근 50개)
      const pointHistory = await db.query(`
        SELECT
          id,
          user_id,
          points,
          point_type,
          reason,
          related_order_id,
          balance_after,
          expires_at,
          created_at
        FROM user_points
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `, [userId]);

      res.json({
        success: true,
        data: {
          totalPoints,
          history: pointHistory
        }
      });
    } catch (error) {
      console.error('❌ [API] Get user points error:', error);
      res.status(500).json({ success: false, message: '포인트 내역 조회 실패' });
    }
  });

  // ===== 관리자 결제 관리 API =====

  // 전체 결제 내역 조회 (관리자) - 필터링, 페이지네이션 지원
  app.get('/api/admin/payments', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      // 쿼리 파라미터
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const status = req.query.status as string; // paid, pending, failed, refunded
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const searchQuery = req.query.search as string;

      // WHERE 조건 구성
      let whereConditions = [];
      let params: any[] = [];

      if (status) {
        whereConditions.push('p.payment_status = ?');
        params.push(status);
      }

      if (startDate) {
        whereConditions.push('DATE(p.created_at) >= ?');
        params.push(startDate);
      }

      if (endDate) {
        whereConditions.push('DATE(p.created_at) <= ?');
        params.push(endDate);
      }

      if (searchQuery) {
        whereConditions.push('(p.order_id_str LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
        const searchPattern = `%${searchQuery}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // 전체 카운트
      const countQuery = `
        SELECT COUNT(*) as total
        FROM payments p
        LEFT JOIN users u ON p.user_id = u.id
        ${whereClause}
      `;

      const countResult = await db.query(countQuery, params);
      const total = countResult[0]?.total || 0;

      // 결제 내역 조회
      const paymentsQuery = `
        SELECT
          p.id,
          p.user_id,
          p.booking_id,
          p.order_id,
          p.order_id_str,
          p.payment_key,
          p.amount,
          p.payment_method,
          p.payment_status,
          p.approved_at,
          p.receipt_url,
          p.card_company,
          p.card_number,
          p.notes,
          p.created_at,
          p.updated_at,
          u.name as user_name,
          u.email as user_email,
          b.booking_number,
          b.listing_id,
          l.title as listing_title,
          l.category,
          l.partner_id
        FROM payments p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN listings l ON b.listing_id = l.id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const payments = await db.query(paymentsQuery, params);

      res.json({
        success: true,
        data: {
          payments,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      console.error('❌ [API] Admin get payments error:', error);
      res.status(500).json({ success: false, message: '결제 내역 조회 실패' });
    }
  });

  // 날짜별 매출 통계 (관리자)
  app.get('/api/admin/payments/stats', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const groupBy = req.query.groupBy as string || 'day'; // day, month, year

      let dateFormat = '%Y-%m-%d';
      if (groupBy === 'month') {
        dateFormat = '%Y-%m';
      } else if (groupBy === 'year') {
        dateFormat = '%Y';
      }

      let whereConditions = ["p.payment_status IN ('paid', 'completed')"];
      let params: any[] = [];

      if (startDate) {
        whereConditions.push('DATE(p.created_at) >= ?');
        params.push(startDate);
      }

      if (endDate) {
        whereConditions.push('DATE(p.created_at) <= ?');
        params.push(endDate);
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      // 날짜별 매출 통계
      const statsQuery = `
        SELECT
          DATE_FORMAT(p.created_at, '${dateFormat}') as date,
          COUNT(*) as total_count,
          SUM(p.amount) as total_amount,
          AVG(p.amount) as avg_amount,
          COUNT(DISTINCT p.user_id) as unique_users
        FROM payments p
        ${whereClause}
        GROUP BY DATE_FORMAT(p.created_at, '${dateFormat}')
        ORDER BY date DESC
        LIMIT 100
      `;

      const stats = await db.query(statsQuery, params);

      // 전체 요약
      const summaryQuery = `
        SELECT
          COUNT(*) as total_transactions,
          SUM(p.amount) as total_revenue,
          AVG(p.amount) as avg_transaction,
          COUNT(DISTINCT p.user_id) as total_customers
        FROM payments p
        ${whereClause}
      `;

      const summary = await db.query(summaryQuery, params);

      // 결제 수단별 통계
      const methodStatsQuery = `
        SELECT
          p.payment_method,
          COUNT(*) as count,
          SUM(p.amount) as total_amount
        FROM payments p
        ${whereClause}
        GROUP BY p.payment_method
      `;

      const methodStats = await db.query(methodStatsQuery, params);

      res.json({
        success: true,
        data: {
          summary: summary[0] || {},
          dailyStats: stats,
          methodStats
        }
      });
    } catch (error) {
      console.error('❌ [API] Admin payment stats error:', error);
      res.status(500).json({ success: false, message: '매출 통계 조회 실패' });
    }
  });

  // ===== 기능 플래그 관리 API (관리자 전용) =====

  // 모든 기능 플래그 조회 (관리자)
  app.get('/api/admin/feature-flags', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { getAllFlags } = await import('./utils/feature-flags-db.js');
      const flags = await getAllFlags();
      res.json({ success: true, flags });
    } catch (error) {
      console.error('❌ [API] Get feature flags error:', error);
      res.status(500).json({ success: false, message: '기능 플래그 조회 실패' });
    }
  });

  // 기능 플래그 활성화/비활성화 (관리자)
  app.patch('/api/admin/feature-flags/:flagName', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { flagName } = req.params;
      const { isEnabled, disabledMessage } = req.body;
      const { enableFlag, disableFlag, clearFlagCache } = await import('./utils/feature-flags-db.js');

      if (isEnabled) {
        await enableFlag(flagName);
        res.json({ success: true, message: `"${flagName}" 플래그가 활성화되었습니다.` });
      } else {
        await disableFlag(flagName, disabledMessage);
        res.json({ success: true, message: `"${flagName}" 플래그가 비활성화되었습니다.` });
      }

      // 캐시 무효화
      clearFlagCache(flagName);
    } catch (error) {
      console.error('❌ [API] Update feature flag error:', error);
      res.status(500).json({ success: false, message: '기능 플래그 업데이트 실패' });
    }
  });

  // 새 기능 플래그 생성 (관리자)
  app.post('/api/admin/feature-flags', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const { flagName, isEnabled, category, description, disabledMessage } = req.body;

      if (!flagName) {
        return res.status(400).json({ success: false, message: 'flagName은 필수입니다.' });
      }

      // 중복 확인
      const existing = await db.query('SELECT id FROM feature_flags WHERE flag_name = ?', [flagName]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: '이미 존재하는 플래그 이름입니다.' });
      }

      await db.execute(
        `INSERT INTO feature_flags (flag_name, is_enabled, category, description, disabled_message, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          flagName,
          isEnabled !== false, // 기본값: true
          category || null,
          description || '',
          disabledMessage || null
        ]
      );

      res.json({ success: true, message: '기능 플래그가 생성되었습니다.' });
    } catch (error) {
      console.error('❌ [API] Create feature flag error:', error);
      res.status(500).json({ success: false, message: '기능 플래그 생성 실패' });
    }
  });

  // 기능 플래그 캐시 초기화 (관리자)
  app.post('/api/admin/feature-flags/clear-cache', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { clearFlagCache } = await import('./utils/feature-flags-db.js');
      const { flagName } = req.body;

      clearFlagCache(flagName); // flagName이 없으면 전체 캐시 초기화

      res.json({
        success: true,
        message: flagName ? `"${flagName}" 캐시가 초기화되었습니다.` : '전체 캐시가 초기화되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Clear feature flag cache error:', error);
      res.status(500).json({ success: false, message: '캐시 초기화 실패' });
    }
  });

  // 파트너별 정산 내역 (관리자)
  app.get('/api/admin/payments/partners', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      let whereConditions = ["p.payment_status IN ('paid', 'completed')"];
      let params: any[] = [];

      if (startDate) {
        whereConditions.push('DATE(p.created_at) >= ?');
        params.push(startDate);
      }

      if (endDate) {
        whereConditions.push('DATE(p.created_at) <= ?');
        params.push(endDate);
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      // 파트너별 매출 집계
      const partnerStatsQuery = `
        SELECT
          l.partner_id,
          par.company_name,
          par.email as partner_email,
          par.phone as partner_phone,
          COUNT(DISTINCT p.id) as total_orders,
          SUM(p.amount) as total_revenue,
          AVG(p.amount) as avg_order_value,
          cr.commission_rate,
          SUM(p.amount * COALESCE(cr.commission_rate, 0.15) / 100) as commission_amount,
          SUM(p.amount * (1 - COALESCE(cr.commission_rate, 0.15) / 100)) as partner_payout
        FROM payments p
        LEFT JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN listings l ON b.listing_id = l.id
        LEFT JOIN partners par ON l.partner_id = par.id
        LEFT JOIN commission_rates cr ON l.partner_id = cr.partner_id AND cr.is_active = 1
        ${whereClause}
        AND l.partner_id IS NOT NULL
        GROUP BY l.partner_id, par.company_name, par.email, par.phone, cr.commission_rate
        ORDER BY total_revenue DESC
      `;

      const partnerStats = await db.query(partnerStatsQuery, params);

      // 전체 요약
      const totalRevenue = partnerStats.reduce((sum: number, p: any) => sum + (parseFloat(p.total_revenue) || 0), 0);
      const totalCommission = partnerStats.reduce((sum: number, p: any) => sum + (parseFloat(p.commission_amount) || 0), 0);
      const totalPayout = partnerStats.reduce((sum: number, p: any) => sum + (parseFloat(p.partner_payout) || 0), 0);

      res.json({
        success: true,
        data: {
          partners: partnerStats,
          summary: {
            total_partners: partnerStats.length,
            total_revenue: totalRevenue,
            total_commission: totalCommission,
            total_partner_payout: totalPayout
          }
        }
      });
    } catch (error) {
      console.error('❌ [API] Admin partner settlements error:', error);
      res.status(500).json({ success: false, message: '파트너 정산 내역 조회 실패' });
    }
  });

  // 환불 처리 (관리자)
  app.post('/api/admin/payments/:id/refund', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const { tossPayments } = await import('./utils/toss-payments.js');

      const paymentId = parseInt(req.params.id);
      const { refundAmount, refundReason } = req.body;

      if (!paymentId || !refundAmount) {
        return res.status(400).json({
          success: false,
          message: '결제 ID와 환불 금액이 필요합니다.'
        });
      }

      // 결제 정보 조회
      const payments = await db.query(
        'SELECT * FROM payments WHERE id = ?',
        [paymentId]
      );

      if (!payments || payments.length === 0) {
        return res.status(404).json({
          success: false,
          message: '결제 내역을 찾을 수 없습니다.'
        });
      }

      const payment = payments[0];

      // 이미 환불된 경우 체크
      if (payment.payment_status === 'refunded') {
        return res.status(400).json({
          success: false,
          message: '이미 환불된 결제입니다.'
        });
      }

      // Toss Payments 환불 API 호출
      try {
        const refundResult = await tossPayments.refundPayment({
          paymentKey: payment.payment_key,
          refundAmount,
          refundReason: refundReason || '관리자 환불 처리'
        });

        console.log('✅ [환불] Toss Payments 환불 완료:', refundResult);

        // DB 업데이트
        await db.execute(
          `UPDATE payments
           SET payment_status = 'refunded',
               refund_amount = ?,
               notes = JSON_SET(COALESCE(notes, '{}'), '$.refund_reason', ?, '$.refunded_at', NOW()),
               updated_at = NOW()
           WHERE id = ?`,
          [refundAmount, refundReason || '관리자 환불', paymentId]
        );

        // 예약이 있으면 예약 상태도 변경
        if (payment.booking_id) {
          await db.execute(
            `UPDATE bookings
             SET status = 'cancelled',
                 payment_status = 'refunded',
                 updated_at = NOW()
             WHERE id = ?`,
            [payment.booking_id]
          );
        }

        res.json({
          success: true,
          message: '환불이 완료되었습니다.',
          data: {
            paymentId,
            refundAmount,
            refundedAt: new Date().toISOString()
          }
        });

      } catch (tossError: any) {
        console.error('❌ [환불] Toss Payments 환불 실패:', tossError);

        // Toss API 에러는 사용자에게 전달
        return res.status(400).json({
          success: false,
          message: tossError.message || '환불 처리 중 오류가 발생했습니다.',
          error: tossError
        });
      }

    } catch (error) {
      console.error('❌ [API] Admin refund payment error:', error);
      res.status(500).json({ success: false, message: '환불 처리 실패' });
    }
  });

  // ===== 블로그 관리 API =====

  // 블로그 목록 조회 (Admin Dashboard용) - 인증 필수
  app.get('/api/blogs', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const blogs = await db.query(`
        SELECT id, title, slug, author, author_id, excerpt, content_md,
               featured_image, category, tags, is_published,
               views, likes, comments_count, published_at,
               created_at, updated_at
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

  // 블로그 작성 (인증된 사용자)
  app.post('/api/blogs', authenticate, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const userId = (req as any).user.userId;
      const userName = (req as any).user.name || '익명';

      const { title, excerpt, content_md, category, tags, featured_image, is_published = 0 } = req.body;

      // 유효성 검사
      if (!title || !content_md) {
        return res.status(400).json({
          success: false,
          error: '제목과 내용은 필수입니다.'
        });
      }

      // slug 생성 (제목을 URL-safe하게 변환)
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100);

      // published_at 설정
      const publishedAt = is_published ? new Date() : null;

      // 블로그 포스트 삽입
      const result = await db.query(
        `INSERT INTO blog_posts
         (title, slug, author, author_id, excerpt, content_md,
          featured_image, category, tags, is_published, published_at,
          views, likes, comments_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
        [
          title,
          slug,
          userName,
          userId,
          excerpt || title.substring(0, 100),
          content_md,
          featured_image || null,
          category || 'general',
          tags || '[]',
          is_published ? 1 : 0,
          publishedAt
        ]
      );

      const insertId = (result as any).insertId;

      // 생성된 블로그 조회
      const newBlog = await db.query(
        'SELECT * FROM blog_posts WHERE id = ?',
        [insertId]
      );

      console.log(`✅ 블로그 생성 완료: ID ${insertId}, 작성자: ${userName}`);

      res.json({
        success: true,
        blog: newBlog[0],
        message: '블로그가 작성되었습니다.'
      });

    } catch (error: any) {
      console.error('❌ [API] Create blog error:', error);
      res.status(500).json({
        success: false,
        error: error.message || '블로그 작성 실패'
      });
    }
  });

  // 블로그 수정 (작성자 또는 관리자만)
  app.put('/api/blogs/:id', authenticate, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const blogId = parseInt(req.params.id);
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;

      // 기존 블로그 확인
      const existingBlog = await db.query('SELECT * FROM blog_posts WHERE id = ?', [blogId]);

      if (!existingBlog || existingBlog.length === 0) {
        return res.status(404).json({
          success: false,
          error: '블로그를 찾을 수 없습니다.'
        });
      }

      // 권한 확인 (작성자 본인 또는 관리자만 수정 가능)
      if (existingBlog[0].author_id !== userId && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '수정 권한이 없습니다.'
        });
      }

      const { title, excerpt, content_md, category, tags, featured_image, is_published } = req.body;

      // 수정할 필드만 업데이트
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title);

        // 제목이 변경되면 slug도 업데이트
        const newSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9가-힣\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 100);
        updateFields.push('slug = ?');
        updateValues.push(newSlug);
      }

      if (excerpt !== undefined) {
        updateFields.push('excerpt = ?');
        updateValues.push(excerpt);
      }

      if (content_md !== undefined) {
        updateFields.push('content_md = ?');
        updateValues.push(content_md);
      }

      if (category !== undefined) {
        updateFields.push('category = ?');
        updateValues.push(category);
      }

      if (tags !== undefined) {
        updateFields.push('tags = ?');
        updateValues.push(tags);
      }

      if (featured_image !== undefined) {
        updateFields.push('featured_image = ?');
        updateValues.push(featured_image);
      }

      if (is_published !== undefined) {
        updateFields.push('is_published = ?');
        updateValues.push(is_published ? 1 : 0);

        // 게시 상태가 변경되면 published_at도 업데이트
        if (is_published && !existingBlog[0].published_at) {
          updateFields.push('published_at = ?');
          updateValues.push(new Date());
        }
      }

      updateFields.push('updated_at = ?');
      updateValues.push(new Date());

      // 업데이트 쿼리 실행
      updateValues.push(blogId);
      await db.query(
        `UPDATE blog_posts SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // 수정된 블로그 조회
      const updatedBlog = await db.query('SELECT * FROM blog_posts WHERE id = ?', [blogId]);

      console.log(`✅ 블로그 수정 완료: ID ${blogId}`);

      res.json({
        success: true,
        blog: updatedBlog[0],
        message: '블로그가 수정되었습니다.'
      });

    } catch (error: any) {
      console.error('❌ [API] Update blog error:', error);
      res.status(500).json({
        success: false,
        error: error.message || '블로그 수정 실패'
      });
    }
  });

  // 블로그 삭제 (작성자 또는 관리자만)
  app.delete('/api/blogs/:id', authenticate, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const blogId = parseInt(req.params.id);
      const userId = (req as any).user.userId;
      const userRole = (req as any).user.role;

      // 기존 블로그 확인
      const existingBlog = await db.query('SELECT * FROM blog_posts WHERE id = ?', [blogId]);

      if (!existingBlog || existingBlog.length === 0) {
        return res.status(404).json({
          success: false,
          error: '블로그를 찾을 수 없습니다.'
        });
      }

      // 권한 확인 (작성자 본인 또는 관리자만 삭제 가능)
      if (existingBlog[0].author_id !== userId && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: '삭제 권한이 없습니다.'
        });
      }

      // 블로그 삭제 (실제 삭제)
      await db.query('DELETE FROM blog_posts WHERE id = ?', [blogId]);

      // 관련 데이터도 삭제
      await db.query('DELETE FROM blog_likes WHERE post_id = ?', [blogId]);
      await db.query('DELETE FROM blog_comments WHERE post_id = ?', [blogId]);
      await db.query('DELETE FROM blog_bookmarks WHERE post_id = ?', [blogId]);
      await db.query('DELETE FROM blog_views WHERE post_id = ?', [blogId]);

      console.log(`✅ 블로그 삭제 완료: ID ${blogId}`);

      res.json({
        success: true,
        message: '블로그가 삭제되었습니다.'
      });

    } catch (error: any) {
      console.error('❌ [API] Delete blog error:', error);
      res.status(500).json({
        success: false,
        error: error.message || '블로그 삭제 실패'
      });
    }
  });

  // ===== 블로그 상호작용 API =====

  // 공개 블로그 목록 조회 (일반 사용자용)
  app.get('/api/blogs/published', async (req, res) => {
    try {
      const { connect } = await import('@planetscale/database');
      const conn = connect({ url: process.env.DATABASE_URL! });
      const { category, tag, limit = 50, offset = 0 } = req.query;

      let sql = `
        SELECT
          bp.id, bp.title, bp.slug, bp.author_id, bp.excerpt,
          bp.featured_image, bp.category, bp.tags,
          bp.views, bp.likes, bp.comments_count,
          bp.published_at, bp.created_at,
          u.name as author_name
        FROM blog_posts bp
        LEFT JOIN users u ON bp.author_id = u.id
        WHERE bp.is_published = 1
      `;
      const params: any[] = [];

      if (category && category !== 'all') {
        sql += ' AND bp.category = ?';
        params.push(category);
      }

      if (tag) {
        sql += ' AND JSON_CONTAINS(bp.tags, ?)';
        params.push(JSON.stringify(tag));
      }

      sql += ' ORDER BY bp.published_at DESC, bp.created_at DESC';
      sql += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await conn.execute(sql, params);
      const blogs = result.rows || [];

      res.json({
        success: true,
        blogs,
        total: blogs.length
      });
    } catch (error) {
      console.error('❌ [API] Get published blogs error:', error);
      res.status(500).json({ success: false, message: '블로그 목록 조회 실패', blogs: [] });
    }
  });

  // 블로그 상세 조회 (조회수 증가)
  app.get('/api/blogs/:id', optionalAuth, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const postId = parseInt(req.params.id);
      const userId = req.user?.userId; // 로그인한 경우에만

      // 블로그 포스트 조회
      const posts = await db.query(`
        SELECT id, title, slug, author_id, excerpt, content_md,
               featured_image, image_url, category, tags,
               views, likes, comments_count,
               is_published, published_at, created_at, updated_at
        FROM blog_posts
        WHERE id = ? AND is_published = 1
      `, [postId]);

      if (!posts || posts.length === 0) {
        return res.status(404).json({
          success: false,
          message: '포스트를 찾을 수 없습니다.'
        });
      }

      const post = posts[0];

      // 조회수 증가
      await db.query('UPDATE blog_posts SET views = views + 1 WHERE id = ?', [postId]);
      post.views = (post.views || 0) + 1;

      // 사용자가 로그인한 경우, 좋아요/북마크 상태 확인
      let liked = false;
      let bookmarked = false;

      if (userId) {
        const likeCheck = await db.query(
          'SELECT id FROM blog_likes WHERE post_id = ? AND user_id = ?',
          [postId, userId]
        );
        liked = likeCheck && likeCheck.length > 0;

        const bookmarkCheck = await db.query(
          'SELECT id FROM blog_bookmarks WHERE post_id = ? AND user_id = ?',
          [postId, userId]
        );
        bookmarked = bookmarkCheck && bookmarkCheck.length > 0;
      }

      // 작성자 이름 조회
      if (post.author_id) {
        const authorResult = await db.query('SELECT name FROM users WHERE id = ?', [post.author_id]);
        if (authorResult && authorResult.length > 0) {
          post.author_name = authorResult[0].name;
        }
      }

      res.json({
        success: true,
        post,
        liked,
        bookmarked
      });
    } catch (error) {
      console.error('❌ [API] Get blog post error:', error);
      res.status(500).json({ success: false, message: '포스트 조회 실패' });
    }
  });

  // 블로그 좋아요 토글
  app.post('/api/blogs/:id/like', authenticate, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const postId = parseInt(req.params.id);
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }

      // 이미 좋아요 했는지 확인
      const existing = await db.query(
        'SELECT id FROM blog_likes WHERE post_id = ? AND user_id = ?',
        [postId, userId]
      );

      if (existing && existing.length > 0) {
        // 좋아요 취소
        await db.query('DELETE FROM blog_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);

        // blog_posts의 likes 카운트 감소
        await db.query('UPDATE blog_posts SET likes = GREATEST(likes - 1, 0) WHERE id = ?', [postId]);

        const updated = await db.query('SELECT likes FROM blog_posts WHERE id = ?', [postId]);

        res.json({
          success: true,
          liked: false,
          likes: updated[0]?.likes || 0,
          message: '좋아요 취소'
        });
      } else {
        // 좋아요 추가
        await db.query(
          'INSERT INTO blog_likes (post_id, user_id) VALUES (?, ?)',
          [postId, userId]
        );

        // blog_posts의 likes 카운트 증가
        await db.query('UPDATE blog_posts SET likes = likes + 1 WHERE id = ?', [postId]);

        const updated = await db.query('SELECT likes FROM blog_posts WHERE id = ?', [postId]);

        res.json({
          success: true,
          liked: true,
          likes: updated[0]?.likes || 0,
          message: '좋아요 추가'
        });
      }
    } catch (error) {
      console.error('❌ [API] Blog like error:', error);
      res.status(500).json({ success: false, message: '좋아요 처리 실패' });
    }
  });

  // 관리자 전체 댓글 조회
  app.get('/api/admin/comments', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const comments = await db.query(`
        SELECT
          c.id, c.content, c.likes, c.is_deleted, c.created_at, c.updated_at,
          c.post_id, c.user_id, c.parent_comment_id,
          u.name as user_name,
          bp.title as post_title
        FROM blog_comments c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN blog_posts bp ON c.post_id = bp.id
        ORDER BY c.created_at DESC
      `);

      res.json({
        success: true,
        comments: comments || []
      });
    } catch (error) {
      console.error('❌ [API] Get all comments error:', error);
      res.status(500).json({ success: false, message: '댓글 목록 조회 실패', comments: [] });
    }
  });

  // 블로그 댓글 조회
  app.get('/api/blogs/:id/comments', optionalAuth, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const postId = parseInt(req.params.id);
      const userId = req.user?.userId; // 로그인한 경우에만

      const comments = await db.query(`
        SELECT c.*, u.name as user_name, u.profile_image
        FROM blog_comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ? AND c.is_deleted = 0
        ORDER BY c.created_at DESC
      `, [postId]);

      // 로그인한 사용자가 있다면, 각 댓글에 대한 좋아요 상태 확인
      if (userId && comments && comments.length > 0) {
        const commentIds = comments.map((c: any) => c.id);
        const likesCheck = await db.query(
          `SELECT comment_id FROM blog_comment_likes WHERE comment_id IN (?) AND user_id = ?`,
          [commentIds, userId]
        );

        const likedCommentIds = new Set((likesCheck || []).map((l: any) => l.comment_id));

        // 각 댓글에 liked 속성 추가
        comments.forEach((comment: any) => {
          comment.liked = likedCommentIds.has(comment.id);
        });
      }

      res.json({
        success: true,
        comments: comments || []
      });
    } catch (error) {
      console.error('❌ [API] Get comments error:', error);
      res.status(500).json({ success: false, message: '댓글 조회 실패', comments: [] });
    }
  });

  // 블로그 댓글 작성
  app.post('/api/blogs/:id/comments', authenticate, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const postId = parseInt(req.params.id);
      const userId = req.user?.userId;
      const { content, parent_comment_id } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
      }

      // 사용자 이름 조회
      const user = await db.query('SELECT name FROM users WHERE id = ?', [userId]);
      const authorName = user[0]?.name || '익명';

      // 댓글 추가
      const result = await db.query(`
        INSERT INTO blog_comments (post_id, user_id, parent_comment_id, content, author_name)
        VALUES (?, ?, ?, ?, ?)
      `, [postId, userId, parent_comment_id || null, content, authorName]);

      // blog_posts의 comments_count 증가
      await db.query('UPDATE blog_posts SET comments_count = comments_count + 1 WHERE id = ?', [postId]);

      res.json({
        success: true,
        message: '댓글이 작성되었습니다.',
        comment: {
          // @ts-expect-error - PlanetScale result type issue
          id: result.insertId,
          post_id: postId,
          user_id: userId,
          author_name: authorName,
          content,
          parent_comment_id: parent_comment_id || null,
          created_at: new Date()
        }
      });
    } catch (error) {
      console.error('❌ [API] Create comment error:', error);
      res.status(500).json({ success: false, message: '댓글 작성 실패' });
    }
  });

  // 블로그 댓글 수정
  app.put('/api/blogs/comments/:commentId', authenticate, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const commentId = parseInt(req.params.commentId);
      const userId = req.user?.userId;
      const { content } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
      }

      // 댓글 소유자 확인
      const comment = await db.query('SELECT user_id, is_deleted FROM blog_comments WHERE id = ?', [commentId]);

      if (!comment || comment.length === 0) {
        return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
      }

      if (comment[0].is_deleted === 1) {
        return res.status(400).json({ success: false, message: '삭제된 댓글은 수정할 수 없습니다.' });
      }

      if (comment[0].user_id !== userId) {
        return res.status(403).json({ success: false, message: '수정 권한이 없습니다.' });
      }

      // 댓글 수정
      await db.query('UPDATE blog_comments SET content = ?, updated_at = NOW() WHERE id = ?', [content, commentId]);

      res.json({
        success: true,
        message: '댓글이 수정되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update comment error:', error);
      res.status(500).json({ success: false, message: '댓글 수정 실패' });
    }
  });

  // 블로그 댓글 삭제 (소프트 삭제)
  app.delete('/api/blogs/comments/:commentId', authenticate, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const commentId = parseInt(req.params.commentId);
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }

      // 댓글 소유자 확인 및 is_deleted 상태 확인
      const comment = await db.query('SELECT user_id, post_id, is_deleted FROM blog_comments WHERE id = ?', [commentId]);

      if (!comment || comment.length === 0) {
        return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
      }

      // 이미 삭제된 댓글인지 확인
      if (comment[0].is_deleted === 1) {
        return res.status(400).json({ success: false, message: '이미 삭제된 댓글입니다.' });
      }

      if (comment[0].user_id !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
      }

      // 소프트 삭제
      await db.query('UPDATE blog_comments SET is_deleted = 1 WHERE id = ?', [commentId]);

      // blog_posts의 comments_count 감소 (삭제되지 않은 댓글만 카운트하므로)
      await db.query('UPDATE blog_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = ?', [comment[0].post_id]);

      res.json({
        success: true,
        message: '댓글이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete comment error:', error);
      res.status(500).json({ success: false, message: '댓글 삭제 실패' });
    }
  });

  // 댓글 좋아요 토글
  app.post('/api/blogs/comments/:commentId/like', authenticate, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const commentId = parseInt(req.params.commentId);
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }

      // 댓글 존재 확인
      const comment = await db.query('SELECT id, likes FROM blog_comments WHERE id = ? AND is_deleted = 0', [commentId]);

      if (!comment || comment.length === 0) {
        return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
      }

      // 이미 좋아요를 눌렀는지 확인
      const existing = await db.query(
        'SELECT id FROM blog_comment_likes WHERE comment_id = ? AND user_id = ?',
        [commentId, userId]
      );

      let liked = false;
      let likes = comment[0].likes || 0;

      if (existing && existing.length > 0) {
        // 좋아요 취소
        await db.query('DELETE FROM blog_comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, userId]);
        likes = Math.max(0, likes - 1);
        await db.query('UPDATE blog_comments SET likes = ? WHERE id = ?', [likes, commentId]);
        liked = false;
      } else {
        // 좋아요 추가
        await db.query('INSERT INTO blog_comment_likes (comment_id, user_id) VALUES (?, ?)', [commentId, userId]);
        likes = likes + 1;
        await db.query('UPDATE blog_comments SET likes = ? WHERE id = ?', [likes, commentId]);
        liked = true;
      }

      res.json({
        success: true,
        liked,
        likes,
        message: liked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Comment like error:', error);
      res.status(500).json({ success: false, message: '좋아요 처리 실패' });
    }
  });

  // 블로그 북마크 토글
  app.post('/api/blogs/:id/bookmark', authenticate, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const postId = parseInt(req.params.id);
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }

      // 이미 북마크 했는지 확인
      const existing = await db.query(
        'SELECT id FROM blog_bookmarks WHERE post_id = ? AND user_id = ?',
        [postId, userId]
      );

      if (existing && existing.length > 0) {
        // 북마크 취소
        await db.query('DELETE FROM blog_bookmarks WHERE post_id = ? AND user_id = ?', [postId, userId]);

        res.json({
          success: true,
          bookmarked: false,
          message: '북마크 취소'
        });
      } else {
        // 북마크 추가
        await db.query(
          'INSERT INTO blog_bookmarks (post_id, user_id) VALUES (?, ?)',
          [postId, userId]
        );

        res.json({
          success: true,
          bookmarked: true,
          message: '북마크 추가'
        });
      }
    } catch (error) {
      console.error('❌ [API] Blog bookmark error:', error);
      res.status(500).json({ success: false, message: '북마크 처리 실패' });
    }
  });

  // 사용자의 북마크 목록 조회
  app.get('/api/blogs/bookmarks/my', authenticate, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }

      const bookmarks = await db.query(`
        SELECT bp.*, bb.created_at as bookmarked_at
        FROM blog_bookmarks bb
        JOIN blog_posts bp ON bb.post_id = bp.id
        WHERE bb.user_id = ?
        ORDER BY bb.created_at DESC
      `, [userId]);

      res.json({
        success: true,
        bookmarks: bookmarks || []
      });
    } catch (error) {
      console.error('❌ [API] Get bookmarks error:', error);
      res.status(500).json({ success: false, message: '북마크 조회 실패', bookmarks: [] });
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

  // ===== 상품 옵션 관리 API =====

  // 상품 옵션 목록 조회
  app.get('/api/listings/:listingId/options', async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const listingId = parseInt(req.params.listingId);

      const options = await db.query(`
        SELECT * FROM product_options
        WHERE listing_id = ? AND is_available = 1
        ORDER BY id ASC
      `, [listingId]);

      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      console.error('❌ [API] Get product options error:', error);
      res.status(500).json({ success: false, message: '옵션 조회 실패' });
    }
  });

  // 상품 옵션 추가 (관리자용)
  app.post('/api/admin/listings/:listingId/options', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const listingId = parseInt(req.params.listingId);
      const { optionName, optionValue, priceAdjustment, stock } = req.body;

      if (!optionName || !optionValue) {
        return res.status(400).json({ success: false, message: '옵션명과 옵션값은 필수입니다.' });
      }

      const result = await db.execute(`
        INSERT INTO product_options (listing_id, option_name, option_value, price_adjustment, stock, is_available, created_at)
        VALUES (?, ?, ?, ?, ?, 1, NOW())
      `, [listingId, optionName, optionValue, priceAdjustment || 0, stock || 0]);

      console.log(`✅ [옵션] 추가 완료: ${optionName} - ${optionValue}`);

      res.json({
        success: true,
        data: {
          id: result.insertId,
          listing_id: listingId,
          option_name: optionName,
          option_value: optionValue,
          price_adjustment: priceAdjustment || 0,
          stock: stock || 0
        },
        message: '옵션이 추가되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Add product option error:', error);
      res.status(500).json({ success: false, message: '옵션 추가 실패' });
    }
  });

  // 상품 옵션 수정 (관리자용)
  app.put('/api/admin/product-options/:optionId', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const optionId = parseInt(req.params.optionId);
      const { optionName, optionValue, priceAdjustment, stock, isAvailable } = req.body;

      await db.execute(`
        UPDATE product_options SET
          option_name = ?, option_value = ?, price_adjustment = ?, stock = ?, is_available = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [optionName, optionValue, priceAdjustment || 0, stock || 0, isAvailable ? 1 : 0, optionId]);

      console.log(`✅ [옵션] 수정 완료: ID ${optionId}`);

      res.json({ success: true, message: '옵션이 수정되었습니다.' });
    } catch (error) {
      console.error('❌ [API] Update product option error:', error);
      res.status(500).json({ success: false, message: '옵션 수정 실패' });
    }
  });

  // 상품 옵션 삭제 (관리자용)
  app.delete('/api/admin/product-options/:optionId', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const optionId = parseInt(req.params.optionId);

      await db.execute('DELETE FROM product_options WHERE id = ?', [optionId]);

      console.log(`✅ [옵션] 삭제 완료: ID ${optionId}`);

      res.json({ success: true, message: '옵션이 삭제되었습니다.' });
    } catch (error) {
      console.error('❌ [API] Delete product option error:', error);
      res.status(500).json({ success: false, message: '옵션 삭제 실패' });
    }
  });

  // ===== 주문 관리 API =====

  // 배송비 계산 API
  app.post('/api/calculate-shipping', async (req, res) => {
    try {
      const { calculateShipping } = await import('./utils/shipping-calculator.js');
      const { db } = await import('./utils/database.js');
      const { items, shippingAddress } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: '상품 정보가 필요합니다.'
        });
      }

      // 전체 상품 금액 계산
      let totalProductAmount = 0;
      let hasCustomShippingFee = false;
      let customShippingFee = 0;

      for (const item of items) {
        totalProductAmount += (item.price || 0) * (item.quantity || 1);

        // 상품별 배송비 확인
        const listing = await db.query(
          `SELECT shipping_fee FROM listings WHERE id = ?`,
          [item.id]
        );

        if (listing && listing.length > 0 && listing[0].shipping_fee !== null) {
          hasCustomShippingFee = true;
          customShippingFee = Math.max(customShippingFee, listing[0].shipping_fee);
        }
      }

      // 배송비 계산
      const shippingCalc = await calculateShipping(
        totalProductAmount,
        shippingAddress,
        hasCustomShippingFee ? customShippingFee : null
      );

      res.json({
        success: true,
        data: shippingCalc
      });

    } catch (error) {
      console.error('❌ [API] Calculate shipping error:', error);
      res.status(500).json({
        success: false,
        error: '배송비 계산 중 오류가 발생했습니다.'
      });
    }
  });

  // ✅ 주문 생성 (Cart Checkout) - 인증 필요 + 기능 플래그 적용
  app.post('/api/orders', requirePaymentByCategory(), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const orderData = req.body;

      // Validation
      if (!orderData.userId || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: '필수 정보가 누락되었습니다. (userId, items)'
        });
      }

      const orderNumber = `ORDER_${Date.now()}`;
      const bookingIds: number[] = [];
      const pointsUsed = orderData.pointsUsed || 0;

      // ===== 💰 서버-사이드 금액 재계산 (단일 진실 원본) =====
      let serverCalculatedSubtotal = 0;
      let serverCalculatedShippingFee = 0;
      const serverCalculatedItems: any[] = [];

      // 1차: 모든 상품의 가격을 DB에서 조회하여 재계산
      for (const item of orderData.items) {
        // DB에서 실제 가격 조회
        const listings = await db.query(
          'SELECT id, price, shipping_fee FROM listings WHERE id = ?',
          [item.listingId]
        );

        if (!listings || listings.length === 0) {
          return res.status(400).json({
            success: false,
            error: `상품을 찾을 수 없습니다. (상품 ID: ${item.listingId})`
          });
        }

        const listing = listings[0];
        let itemPrice = listing.price;

        // 옵션이 있는 경우 옵션 가격 사용
        if (item.selectedOption && item.selectedOption.id) {
          const options = await db.query(
            'SELECT id, price, is_available FROM product_options WHERE id = ?',
            [item.selectedOption.id]
          );

          if (!options || options.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'OPTION_NOT_FOUND',
              message: `선택한 옵션이 더 이상 존재하지 않습니다. (상품: ${listing.title})`,
              itemId: item.listingId,
              optionId: item.selectedOption.id
            });
          }

          if (!options[0].is_available) {
            return res.status(400).json({
              success: false,
              error: 'OPTION_UNAVAILABLE',
              message: `선택한 옵션이 판매 중지되었습니다. (상품: ${listing.title})`,
              itemId: item.listingId,
              optionId: item.selectedOption.id
            });
          }

          itemPrice = options[0].price;
        }

        const itemSubtotal = itemPrice * item.quantity;
        const itemShippingFee = listing.shipping_fee || 0;

        serverCalculatedSubtotal += itemSubtotal;
        serverCalculatedShippingFee += itemShippingFee;

        serverCalculatedItems.push({
          ...item,
          priceFromDB: itemPrice,
          subtotalFromDB: itemSubtotal,
          shippingFeeFromDB: itemShippingFee
        });
      }

      // 🎟️ 쿠폰 할인 적용 (서버 사이드 재검증)
      let couponDiscount = 0;
      const couponCode = orderData.couponCode || null;

      if (couponCode) {
        console.log(`🎟️ [쿠폰 검증] 쿠폰 코드: ${couponCode}`);

        try {
          // 1. DB에서 쿠폰 조회
          const coupons = await db.query(`
            SELECT * FROM coupons
            WHERE code = ? AND is_active = TRUE
            LIMIT 1
          `, [couponCode.toUpperCase()]);

          if (coupons.length === 0) {
            console.error('❌ [쿠폰 검증 실패] 유효하지 않은 쿠폰');
            return res.status(400).json({
              success: false,
              error: 'INVALID_COUPON',
              message: '유효하지 않은 쿠폰 코드입니다'
            });
          }

          const coupon = coupons[0];

          // 2. 만료 확인
          if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            console.error('❌ [쿠폰 검증 실패] 쿠폰 만료');
            return res.status(400).json({
              success: false,
              error: 'COUPON_EXPIRED',
              message: '만료된 쿠폰입니다'
            });
          }

          // 3. 사용 한도 확인
          if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            console.error('❌ [쿠폰 검증 실패] 사용 한도 초과');
            return res.status(400).json({
              success: false,
              error: 'COUPON_LIMIT_EXCEEDED',
              message: '쿠폰 사용 한도가 초과되었습니다'
            });
          }

          // 4. 최소 주문 금액 확인
          if (serverCalculatedSubtotal < coupon.min_amount) {
            console.error('❌ [쿠폰 검증 실패] 최소 금액 미달:', {
              주문금액: serverCalculatedSubtotal,
              최소금액: coupon.min_amount
            });
            return res.status(400).json({
              success: false,
              error: 'MIN_AMOUNT_NOT_MET',
              message: `최소 주문 금액 ${coupon.min_amount.toLocaleString()}원 이상이어야 사용 가능합니다`
            });
          }

          // 5. 할인 금액 재계산
          if (coupon.discount_type === 'percentage') {
            couponDiscount = Math.floor(serverCalculatedSubtotal * coupon.discount_value / 100);
            // 최대 할인 금액 제한
            if (coupon.max_discount && couponDiscount > coupon.max_discount) {
              couponDiscount = coupon.max_discount;
            }
          } else {
            // fixed
            couponDiscount = coupon.discount_value;
          }

          console.log('✅ [쿠폰 검증 성공]', {
            쿠폰코드: couponCode,
            할인타입: coupon.discount_type,
            할인금액: couponDiscount
          });

        } catch (error) {
          console.error('❌ [쿠폰 검증 오류]', error);
          return res.status(500).json({
            success: false,
            error: 'COUPON_VALIDATION_ERROR',
            message: '쿠폰 검증 중 오류가 발생했습니다'
          });
        }
      } else {
        couponDiscount = 0;
      }

      // 최종 서버 계산 금액: 상품 합계 + 배송비 - 쿠폰 할인 - 포인트 사용
      const serverCalculatedTotal = serverCalculatedSubtotal + serverCalculatedShippingFee - couponDiscount - pointsUsed;

      console.log('💰 [서버 금액 재계산]', {
        상품합계: serverCalculatedSubtotal,
        배송비: serverCalculatedShippingFee,
        쿠폰할인: couponDiscount,
        포인트사용: pointsUsed,
        최종금액: serverCalculatedTotal
      });

      // ===== 금액 검증: 클라이언트 금액 vs 서버 계산 금액 =====
      const clientTotal = orderData.total || 0;
      if (Math.abs(clientTotal - serverCalculatedTotal) > 1) { // 1원 오차 허용 (부동소수점)
        console.error('❌ [금액 불일치]', {
          클라이언트: clientTotal,
          서버계산: serverCalculatedTotal,
          차이: clientTotal - serverCalculatedTotal
        });

        return res.status(400).json({
          success: false,
          error: 'AMOUNT_MISMATCH',
          message: `결제 금액이 일치하지 않습니다. (서버 계산: ${serverCalculatedTotal.toLocaleString()}원, 클라이언트: ${clientTotal.toLocaleString()}원)`,
          serverCalculated: {
            subtotal: serverCalculatedSubtotal,
            shippingFee: serverCalculatedShippingFee,
            couponDiscount,
            pointsUsed,
            total: serverCalculatedTotal
          }
        });
      }

      console.log('✅ [금액 검증 통과] 클라이언트 금액과 서버 계산 금액 일치:', serverCalculatedTotal);

      // 포인트 사용 처리
      if (pointsUsed > 0) {
        const { usePoints } = await import('./utils/points-system.js');
        const pointsResult = await usePoints(
          orderData.userId,
          pointsUsed,
          `주문 결제 (주문번호: ${orderNumber})`,
          orderNumber
        );

        if (!pointsResult.success) {
          return res.status(400).json({
            success: false,
            error: pointsResult.message || '포인트 사용에 실패했습니다.'
          });
        }

        console.log(`✅ [Orders] Points deducted: ${pointsUsed}P for user ${orderData.userId}`);
      }

      // 2. 각 상품별로 bookings 테이블에 예약 생성 (배송 정보 포함)
      for (const item of serverCalculatedItems) {
        const bookingNumber = `BK${Date.now()}${Math.floor(Math.random() * 1000)}`;

        const bookingInsertData: any = {
          booking_number: bookingNumber,
          listing_id: item.listingId,
          user_id: orderData.userId,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          num_adults: item.quantity,
          num_children: 0,
          num_seniors: 0,
          total_amount: item.subtotal,
          // points_used는 payments 테이블에만 저장 (중복 방지)
          payment_method: orderData.paymentMethod || 'card',
          payment_status: 'pending',
          status: 'pending',
          customer_info: JSON.stringify({
            name: orderData.shippingInfo?.name || '',
            phone: orderData.shippingInfo?.phone || '',
            email: ''
          }),
          special_requests: orderData.shippingInfo?.memo || ''
        };

        // 배송 정보 추가
        if (orderData.shippingInfo) {
          bookingInsertData.shipping_name = orderData.shippingInfo.name;
          bookingInsertData.shipping_phone = orderData.shippingInfo.phone;
          bookingInsertData.shipping_zipcode = orderData.shippingInfo.zipcode;
          bookingInsertData.shipping_address = orderData.shippingInfo.address;
          bookingInsertData.shipping_address_detail = orderData.shippingInfo.addressDetail;
          bookingInsertData.shipping_memo = orderData.shippingInfo.memo || null;
          bookingInsertData.delivery_status = 'PENDING';

          // 🚚 배송비 스냅샷 저장 (정책 변경 대응)
          // 주문 시점의 배송비를 저장하여 나중에 배송 정책이 변경되어도 정확한 금액 유지
          bookingInsertData.shipping_fee_snapshot = item.shippingFee || 0;
          console.log(`📦 [배송비 스냅샷] 저장: ${item.shippingFee}원`);
        }

        // 팝업 상품 옵션 정보 저장 및 재고 확인/차감
        if (item.selectedOption) {
          bookingInsertData.selected_options = JSON.stringify(item.selectedOption);

          // 옵션 재고 확인 및 차감
          const option = await db.query(
            `SELECT stock, is_available FROM product_options WHERE id = ? FOR UPDATE`,
            [item.selectedOption.id]
          );

          if (!option || option.length === 0) {
            throw new Error(`옵션을 찾을 수 없습니다. (옵션 ID: ${item.selectedOption.id})`);
          }

          if (!option[0].is_available) {
            throw new Error(`선택한 옵션이 판매 중지되었습니다.`);
          }

          if (option[0].stock !== null && option[0].stock < item.quantity) {
            throw new Error(`재고가 부족합니다. (현재 재고: ${option[0].stock}개, 주문 수량: ${item.quantity}개)`);
          }

          // 재고 차감
          if (option[0].stock !== null) {
            await db.execute(
              `UPDATE product_options SET stock = stock - ? WHERE id = ?`,
              [item.quantity, item.selectedOption.id]
            );
            console.log(`✅ [Orders] 옵션 재고 차감: 옵션ID ${item.selectedOption.id}, 수량 ${item.quantity}`);
          }
        } else {
          // 옵션이 없는 경우, 상품 레벨 재고 확인 및 차감
          const listing = await db.query(
            `SELECT stock_enabled, stock FROM listings WHERE id = ? FOR UPDATE`,
            [item.listingId]
          );

          if (listing && listing.length > 0 && listing[0].stock_enabled) {
            if (listing[0].stock !== null && listing[0].stock < item.quantity) {
              throw new Error(`재고가 부족합니다. (현재 재고: ${listing[0].stock}개, 주문 수량: ${item.quantity}개)`);
            }

            // 재고 차감
            if (listing[0].stock !== null) {
              await db.execute(
                `UPDATE listings SET stock = stock - ? WHERE id = ?`,
                [item.quantity, item.listingId]
              );
              console.log(`✅ [Orders] 상품 재고 차감: 상품ID ${item.listingId}, 수량 ${item.quantity}`);
            }
          }
        }

        const bookingResult = await db.execute(
          `INSERT INTO bookings SET ?`,
          [bookingInsertData]
        );
        if (bookingResult.insertId) {
          bookingIds.push(bookingResult.insertId);
        }
      }

      // 2. payments 테이블에 전체 주문 정보 저장 (✅ 서버 계산 금액 사용)
      const paymentInsertData = {
        user_id: orderData.userId,
        booking_id: bookingIds[0] || null,
        amount: serverCalculatedTotal, // ✅ 서버에서 계산한 금액 사용 (단일 진실 원본)
        points_used: pointsUsed, // ✅ 전체 주문의 포인트 사용량
        payment_method: orderData.paymentMethod || 'card',
        payment_status: 'pending',
        gateway_transaction_id: orderNumber,
        coupon_code: orderData.couponCode || null,
        discount_amount: couponDiscount,
        fee_amount: serverCalculatedShippingFee,
        refund_amount: 0,
        notes: JSON.stringify({
          items: orderData.items,
          subtotal: serverCalculatedSubtotal, // ✅ 서버 계산 값
          shippingFee: serverCalculatedShippingFee, // ✅ 서버 계산 값
          orderType: 'cart',
          bookingIds: bookingIds,
          shippingInfo: orderData.shippingInfo,
          pointsUsed: pointsUsed, // notes에도 백업 저장
          serverCalculated: true // 서버 재계산 완료 플래그
        })
      };

      await db.execute(
        `INSERT INTO payments SET ?`,
        [paymentInsertData]
      );

      console.log(`✅ [Orders] Created cart order: ${orderNumber} (${bookingIds.length} items)`);

      return res.status(200).json({
        success: true,
        data: {
          orderNumber,
          bookingIds,
          total: serverCalculatedTotal, // ✅ 서버 계산 금액 반환
          subtotal: serverCalculatedSubtotal,
          shippingFee: serverCalculatedShippingFee,
          couponDiscount,
          pointsUsed,
          items: orderData.items,
          shippingInfo: orderData.shippingInfo
        },
        message: '주문이 성공적으로 생성되었습니다.'
      });

    } catch (error) {
      console.error('❌ [API] Create order error:', error);
      return res.status(500).json({
        success: false,
        error: '주문 생성에 실패했습니다.'
      });
    }
  });

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

  // ===== 관리자 통계 API =====

  // 관리자 대시보드 통계 조회
  app.get('/api/admin/stats', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const { getNeonPool } = await import('./utils/neon-database.js');

      // 1. 파트너 통계 (PlanetScale)
      const totalPartnersResult = await db.query('SELECT COUNT(*) as count FROM partners');
      const totalPartners = totalPartnersResult?.[0]?.count || 0;

      const pendingPartnersResult = await db.query(
        "SELECT COUNT(*) as count FROM partners WHERE status = 'pending'"
      );
      const pendingPartners = pendingPartnersResult?.[0]?.count || 0;

      // 2. 상품 통계 (PlanetScale)
      const totalProductsResult = await db.query('SELECT COUNT(*) as count FROM listings');
      const totalProducts = totalProductsResult?.[0]?.count || 0;

      const activeProductsResult = await db.query(
        "SELECT COUNT(*) as count FROM listings WHERE status = 'active'"
      );
      const activeProducts = activeProductsResult?.[0]?.count || 0;

      // 3. 사용자 통계 (Neon PostgreSQL)
      let totalUsers = 0;
      let newSignups = 0;
      try {
        const neonPool = getNeonPool();
        const usersResult = await neonPool.query('SELECT COUNT(*) as count FROM users');
        totalUsers = parseInt(usersResult.rows[0]?.count || '0');

        const today = new Date().toISOString().split('T')[0];
        const signupsResult = await neonPool.query(
          `SELECT COUNT(*) as count FROM users WHERE created_at::date = $1`,
          [today]
        );
        newSignups = parseInt(signupsResult.rows[0]?.count || '0');
      } catch (err) {
        console.error('❌ Neon DB query failed:', err);
      }

      // 4. 주문 통계 (PlanetScale payments 테이블)
      const totalOrdersResult = await db.query('SELECT COUNT(*) as count FROM payments');
      const totalOrders = totalOrdersResult?.[0]?.count || 0;

      const today = new Date().toISOString().split('T')[0];
      const todayOrdersResult = await db.query(
        `SELECT COUNT(*) as count FROM payments WHERE DATE(created_at) = ?`,
        [today]
      );
      const todayOrders = todayOrdersResult?.[0]?.count || 0;

      // 5. 매출 통계
      const revenueResult = await db.query(
        'SELECT SUM(amount) as total FROM payments WHERE status = "completed"'
      );
      const revenue = revenueResult?.[0]?.total || 0;

      // 6. 리뷰 통계
      const totalReviewsResult = await db.query('SELECT COUNT(*) as count FROM reviews');
      const totalReviews = totalReviewsResult?.[0]?.count || 0;

      const avgRatingResult = await db.query('SELECT AVG(rating) as avg FROM reviews');
      const avgRating = parseFloat(avgRatingResult?.[0]?.avg || '0').toFixed(1);

      res.json({
        success: true,
        data: {
          totalPartners,
          pendingPartners,
          totalProducts,
          activeProducts,
          totalUsers,
          newSignups,
          totalOrders,
          todayOrders,
          revenue,
          totalReviews,
          avgRating: parseFloat(avgRating),
          commission: Math.floor(revenue * 0.07), // 7% 수수료
          refunds: 0,
          inquiries: 0
        }
      });
    } catch (error) {
      console.error('❌ [API] Get admin stats error:', error);
      res.status(500).json({
        success: false,
        message: '통계 조회 실패',
        data: {
          totalPartners: 0,
          pendingPartners: 0,
          totalProducts: 0,
          activeProducts: 0,
          totalUsers: 0,
          newSignups: 0,
          totalOrders: 0,
          todayOrders: 0,
          revenue: 0,
          totalReviews: 0,
          avgRating: 0,
          commission: 0,
          refunds: 0,
          inquiries: 0
        }
      });
    }
  });

  // ===== 파트너 신청/관리 API =====

  // 파트너 신청 제출 (로그인 필수 - 회원만 신청 가능)
  app.post('/api/partners/apply', authenticate, async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const applicationData = req.body;
      const userId = (req as any).user.userId; // 로그인한 사용자 ID

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
      const requiredFields = ['business_name', 'contact_name', 'email', 'phone'];
      for (const field of requiredFields) {
        if (!applicationData[field]) {
          return res.status(400).json({
            success: false,
            error: 'MISSING_FIELD',
            message: `필수 항목이 누락되었습니다: ${field}`
          });
        }
      }

      // 중복 신청 체크 (사용자 ID 기준 - 한 사용자당 하나의 파트너 신청만 가능)
      const existing = await db.query(
        `SELECT id FROM partners WHERE user_id = ? LIMIT 1`,
        [userId]
      );

      if (existing && existing.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'DUPLICATE_APPLICATION',
          message: '이미 파트너 신청을 하셨습니다. 승인 결과를 기다려주세요.'
        });
      }

      // 파트너 신청 저장 (status: pending, partner_type: general)
      // AdminPage와 동일한 필드 구조 사용
      const imagesJson = applicationData.images && applicationData.images.length > 0
        ? JSON.stringify(applicationData.images)
        : null;

      await db.execute(`
        INSERT INTO partners (
          business_name, contact_name, email, phone,
          business_address, location, services,
          base_price, base_price_text, detailed_address,
          description, images, business_hours,
          duration, min_age, max_capacity, language,
          lat, lng,
          status, tier, partner_type, is_verified, is_featured, user_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'bronze', 'general', 0, 0, ?, NOW(), NOW())
      `, [
        applicationData.business_name,
        applicationData.contact_name,
        applicationData.email,
        applicationData.phone,
        applicationData.business_address || null,
        applicationData.location || null,
        applicationData.services || null,
        applicationData.base_price || null,
        applicationData.base_price_text || null,
        applicationData.detailed_address || null,
        applicationData.description || null,
        imagesJson,
        applicationData.business_hours || null,
        applicationData.duration || null,
        applicationData.min_age || null,
        applicationData.max_capacity || null,
        applicationData.language || null,
        applicationData.lat || null,
        applicationData.lng || null,
        userId // 로그인한 사용자 ID
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
               business_address, location, description, services, website, instagram,
               status, tier, is_verified, is_featured, partner_type, created_at, updated_at
        FROM partners
        WHERE (partner_type = 'general' OR partner_type IS NULL)
      `;

      const params: any[] = [];

      if (status) {
        sql += ` AND status = ?`;
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

      // 파트너 존재 확인
      const partnerCheck = await db.query(
        `SELECT id, status, business_name FROM partners WHERE id = ?`,
        [id]
      );

      if (!partnerCheck || partnerCheck.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: '파트너를 찾을 수 없습니다.'
        });
      }

      const partner = partnerCheck[0];

      // 승인 처리
      if (status === 'approved') {
        await db.execute(`
          UPDATE partners
          SET status = 'approved',
              is_verified = 1,
              approved_at = NOW(),
              updated_at = NOW()
          WHERE id = ?
        `, [id]);

        console.log(`✅ [API] 파트너 승인 완료: ${partner.business_name} (ID: ${id})`);

        return res.json({
          success: true,
          message: `${partner.business_name} 파트너가 승인되었습니다.`,
          data: { id, status: 'approved' }
        });
      }

      // 거절 처리
      if (status === 'rejected') {
        await db.execute(`
          UPDATE partners
          SET status = 'rejected',
              rejection_reason = ?,
              rejected_at = NOW(),
              updated_at = NOW()
          WHERE id = ?
        `, [reason || '관리자에 의해 거절됨', id]);

        console.log(`❌ [API] 파트너 거절 완료: ${partner.business_name} (ID: ${id})`);

        return res.json({
          success: true,
          message: `${partner.business_name} 파트너가 거절되었습니다.`,
          data: { id, status: 'rejected', reason }
        });
      }

      // TODO: 이메일 알림 발송 (승인/거절 통지)

    } catch (error) {
      console.error('❌ [API] Update partner status error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: '파트너 상태 업데이트 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
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

  // ===== DB 관리 API (일시적) =====

  // 주간요금/월간요금 컬럼 추가
  app.get('/api/add-weekly-monthly-columns', async (_req, res) => {
    try {
      const mysql = await import('mysql2/promise');
      const mysqlUrl = new URL(process.env.DATABASE_URL!);
      const connection = await mysql.createConnection({
        host: mysqlUrl.hostname,
        user: mysqlUrl.username,
        password: mysqlUrl.password,
        database: mysqlUrl.pathname.replace('/', ''),
        ssl: { rejectUnauthorized: true }
      });

      const addedColumns: string[] = [];

      // weekly_rate_krw 컬럼 확인
      const [weeklyColumns]: any = await connection.execute(`
        SHOW COLUMNS FROM rentcar_vehicles LIKE 'weekly_rate_krw'
      `);

      if (weeklyColumns.length === 0) {
        await connection.execute(`
          ALTER TABLE rentcar_vehicles
          ADD COLUMN weekly_rate_krw INT DEFAULT NULL COMMENT '주간 요금 (원, NULL이면 일일요금*6 계산)'
        `);
        addedColumns.push('weekly_rate_krw');
      }

      // monthly_rate_krw 컬럼 확인
      const [monthlyColumns]: any = await connection.execute(`
        SHOW COLUMNS FROM rentcar_vehicles LIKE 'monthly_rate_krw'
      `);

      if (monthlyColumns.length === 0) {
        await connection.execute(`
          ALTER TABLE rentcar_vehicles
          ADD COLUMN monthly_rate_krw INT DEFAULT NULL COMMENT '월간 요금 (원, NULL이면 일일요금*25 계산)'
        `);
        addedColumns.push('monthly_rate_krw');
      }

      await connection.end();

      if (addedColumns.length > 0) {
        res.json({
          success: true,
          message: `${addedColumns.join(', ')} 컬럼이 성공적으로 추가되었습니다.`,
          added_columns: addedColumns
        });
      } else {
        res.json({
          success: true,
          message: 'weekly_rate_krw, monthly_rate_krw 컬럼이 이미 존재합니다.',
          already_exists: true
        });
      }
    } catch (error: any) {
      console.error('❌ [Add Columns] 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.toString()
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
      // Return empty array on error (banners are optional)
      res.json({ success: true, data: [] });
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
      // Return empty array on error (activities are optional)
      res.json({ success: true, data: [] });
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
      // @ts-expect-error - Vendor API module type definition
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
      // @ts-expect-error - Vendor API module type definition
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
      // @ts-expect-error - Vendor API module type definition
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

      sql += ' ORDER BY is_featured DESC, created_at DESC';

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
  app.get('/api/vendor/info', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      const vendors = await db.query(`
        SELECT * FROM rentcar_vendors WHERE user_id = ? LIMIT 1
      `, [userId]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendor = vendors[0];

      // JSON 필드 파싱
      let images = [];
      try {
        if (vendor.images) {
          images = typeof vendor.images === 'string' ? JSON.parse(vendor.images) : vendor.images;
        }
      } catch (e) {
        console.error('Failed to parse vendor images:', e);
      }

      let cancellation_rules = null;
      try {
        if (vendor.cancellation_rules) {
          cancellation_rules = typeof vendor.cancellation_rules === 'string'
            ? JSON.parse(vendor.cancellation_rules)
            : vendor.cancellation_rules;
        }
      } catch (e) {
        console.error('Failed to parse cancellation_rules:', e);
      }

      res.json({
        success: true,
        data: {
          ...vendor,
          images: Array.isArray(images) ? images : [],
          cancellation_rules: cancellation_rules || {
            '3_days_before': 100,
            '1_2_days_before': 50,
            'same_day': 0
          }
        }
      });
    } catch (error) {
      console.error('❌ [API] Get vendor info error:', error);
      res.status(500).json({ success: false, message: '업체 정보 조회 실패' });
    }
  });

  // Vendor 정보 수정 (자기 업체 정보)
  app.put('/api/vendor/info', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;
      const {
        name,
        contact_person,
        contact_email,
        contact_phone,
        address,
        address_detail,
        latitude,
        longitude,
        description,
        logo_url,
        images,
        cancellation_policy,
        rental_guide,
        cancellation_rules,
        check_in_time,
        check_out_time,
        // 로그인 계정 정보 (users 테이블)
        email,
        password
      } = req.body;

      // 업데이트할 필드와 값 동적 생성
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (name !== undefined) {
        updateFields.push('business_name = ?');
        updateValues.push(name);
      }
      if (contact_person !== undefined) {
        updateFields.push('contact_name = ?');
        updateValues.push(contact_person);
      }
      if (contact_email !== undefined) {
        updateFields.push('contact_email = ?');
        updateValues.push(contact_email);
      }
      if (contact_phone !== undefined) {
        updateFields.push('contact_phone = ?');
        updateValues.push(contact_phone);
      }
      if (address !== undefined) {
        updateFields.push('address = ?');
        updateValues.push(address);
      }
      if (address_detail !== undefined) {
        updateFields.push('address_detail = ?');
        updateValues.push(address_detail);
      }
      if (latitude !== undefined) {
        updateFields.push('latitude = ?');
        updateValues.push(latitude);
      }
      if (longitude !== undefined) {
        updateFields.push('longitude = ?');
        updateValues.push(longitude);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      if (logo_url !== undefined) {
        updateFields.push('logo_url = ?');
        updateValues.push(logo_url);
      }
      if (images !== undefined) {
        updateFields.push('images = ?');
        updateValues.push(JSON.stringify(images));
      }
      if (cancellation_policy !== undefined) {
        updateFields.push('cancellation_policy = ?');
        updateValues.push(cancellation_policy);
      }
      if (rental_guide !== undefined) {
        updateFields.push('rental_guide = ?');
        updateValues.push(rental_guide);
      }
      if (cancellation_rules !== undefined) {
        updateFields.push('cancellation_rules = ?');
        updateValues.push(JSON.stringify(cancellation_rules));
      }
      if (check_in_time !== undefined) {
        updateFields.push('check_in_time = ?');
        updateValues.push(check_in_time);
      }
      if (check_out_time !== undefined) {
        updateFields.push('check_out_time = ?');
        updateValues.push(check_out_time);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ success: false, message: '수정할 정보가 없습니다.' });
      }

      // vendorId 추가
      updateValues.push(vendorId);

      // 업체 정보 업데이트
      await db.execute(`
        UPDATE rentcar_vendors
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);

      console.log('✅ [API] Vendor info updated:', { vendorId, fields: updateFields });

      // users 테이블 업데이트 (이메일 또는 비밀번호 변경 시) - Neon DB 사용
      if ((email !== undefined && email) || (password !== undefined && password)) {
        try {
          const { neon } = await import('@neondatabase/serverless');
          const sql = neon(process.env.POSTGRES_DATABASE_URL!);

          // 현재 사용자 정보 조회
          const userResult = await sql`
            SELECT id, email FROM users WHERE id = ${userId}
          `;

          if (userResult && userResult.length > 0) {
            const currentUser = userResult[0];

            // 이메일 변경 시 중복 체크
            if (email && email !== currentUser.email) {
              const emailCheck = await sql`
                SELECT id FROM users WHERE email = ${email} AND id != ${userId}
              `;

              if (emailCheck && emailCheck.length > 0) {
                return res.status(400).json({
                  success: false,
                  message: '이미 사용 중인 이메일입니다.'
                });
              }
            }

            // 비밀번호 해시화
            let hashedPassword: string | null = null;
            if (password) {
              const bcrypt = await import('bcryptjs');
              hashedPassword = await bcrypt.hash(password, 10);
            }

            // Neon DB 업데이트
            if (email && email !== currentUser.email && hashedPassword) {
              // 이메일 + 비밀번호 변경
              await sql`
                UPDATE users
                SET email = ${email}, password_hash = ${hashedPassword}, updated_at = NOW()
                WHERE id = ${userId}
              `;
              console.log('✅ [API] User email + password updated (Neon)');
            } else if (email && email !== currentUser.email) {
              // 이메일만 변경
              await sql`
                UPDATE users
                SET email = ${email}, updated_at = NOW()
                WHERE id = ${userId}
              `;
              console.log('✅ [API] User email updated (Neon)');
            } else if (hashedPassword) {
              // 비밀번호만 변경
              await sql`
                UPDATE users
                SET password_hash = ${hashedPassword}, updated_at = NOW()
                WHERE id = ${userId}
              `;
              console.log('✅ [API] User password updated (Neon)');
            }
          }
        } catch (neonError) {
          console.error('❌ [API] Neon DB update error:', neonError);
          // Neon 오류가 발생해도 업체 정보는 업데이트되었으므로 경고만 표시
          console.warn('⚠️  업체 정보는 업데이트되었으나 계정 정보 업데이트 실패');
        }
      }

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
  app.get('/api/vendor/vehicles', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // 먼저 vendor_id 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

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

      // stock 값을 명시적으로 숫자로 변환
      const formattedVehicles = (vehicles || []).map(v => ({
        ...v,
        stock: Number(v.stock) || 0
      }));

      res.json({
        success: true,
        data: formattedVehicles
      });
    } catch (error) {
      console.error('❌ [API] Get vendor vehicles error:', error);
      res.status(500).json({ success: false, message: '차량 목록 조회 실패', data: [] });
    }
  });

  // Vendor 차량 등록
  app.post('/api/vendor/vehicles', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      const {
        display_name,
        daily_rate_krw,
        hourly_rate_krw,
        is_available,
        image_urls
      } = req.body;

      // 필수 필드 검증
      if (!display_name || !daily_rate_krw) {
        return res.status(400).json({
          success: false,
          message: '필수 항목을 입력해주세요. (차량명, 일일 요금)'
        });
      }

      // 시간당 요금 자동 계산 (입력하지 않은 경우 일일 요금 / 24)
      const calculatedHourlyRate = hourly_rate_krw || Math.ceil(daily_rate_krw / 24);

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
          vendor_id, display_name, daily_rate_krw, hourly_rate_krw,
          thumbnail_url, images, stock, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendorId,
        display_name,
        daily_rate_krw,
        calculatedHourlyRate,
        image_urls && image_urls.length > 0 ? image_urls[0] : null,
        imagesJson,
        10, // 초기 재고 10대
        is_available !== undefined ? (is_available ? 1 : 0) : 1
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
        `렌트카 - 일일 ₩${daily_rate_krw?.toLocaleString()} / 시간당 ₩${calculatedHourlyRate?.toLocaleString()}`,
        `### 차량 정보\n- 차량명: ${display_name}\n\n### 요금 정보\n- 일일: ₩${daily_rate_krw?.toLocaleString()}\n- 시간당: ₩${calculatedHourlyRate?.toLocaleString()}`,
        daily_rate_krw,
        daily_rate_krw,
        '신안군, 전라남도',
        '1일~',
        4,
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
  app.put('/api/vendor/vehicles/:id', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');
      const vehicleId = parseInt(req.params.id);

      // Vendor ID 조회 및 권한 확인
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '업체 정보를 찾을 수 없습니다.' });
      }

      const vendorId = vendors[0].id;

      const {
        display_name,
        daily_rate_krw,
        hourly_rate_krw,
        is_available,
        image_urls
      } = req.body;

      // 필수 필드 검증
      if (!display_name || !daily_rate_krw) {
        return res.status(400).json({
          success: false,
          message: '필수 항목을 입력해주세요. (차량명, 일일 요금)'
        });
      }

      // 시간당 요금 자동 계산 (입력하지 않은 경우 일일 요금 / 24)
      const calculatedHourlyRate = hourly_rate_krw || Math.ceil(daily_rate_krw / 24);

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
        SET display_name = ?, daily_rate_krw = ?, hourly_rate_krw = ?,
            thumbnail_url = ?, images = ?, is_active = ?,
            updated_at = NOW()
        WHERE id = ? AND vendor_id = ?
      `, [
        display_name,
        daily_rate_krw,
        calculatedHourlyRate,
        image_urls && image_urls.length > 0 ? image_urls[0] : null,
        imagesJson,
        is_available !== undefined ? (is_available ? 1 : 0) : 1,
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
        `렌트카 - 일일 ₩${daily_rate_krw?.toLocaleString()} / 시간당 ₩${calculatedHourlyRate?.toLocaleString()}`,
        `### 차량 정보\n- 차량명: ${display_name}\n\n### 요금 정보\n- 일일: ₩${daily_rate_krw?.toLocaleString()}\n- 시간당: ₩${calculatedHourlyRate?.toLocaleString()}`,
        daily_rate_krw,
        daily_rate_krw,
        4,
        imagesJson,
        is_available !== undefined ? (is_available ? 1 : 0) : 1,
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
  app.delete('/api/vendor/vehicles/:id', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');
      const vehicleId = parseInt(req.params.id);

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

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
  app.patch('/api/vendor/vehicles/:id/availability', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');
      const vehicleId = parseInt(req.params.id);
      const { is_available } = req.body;

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

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
  app.get('/api/vendor/bookings', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

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
  app.get('/api/vendor/revenue', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

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
  app.get('/api/vendor/lodging/info', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // 숙박 벤더는 partners 테이블 조회 (partner_type='lodging')
      // 타입 불일치 대응: number와 string 둘 다 매칭
      const vendors = await db.query(`
        SELECT id, business_name as name, email as contact_email, phone as contact_phone,
               is_verified, partner_type, status
        FROM partners
        WHERE (user_id = ? OR user_id = ?) AND (partner_type = 'lodging' OR services = 'accommodation')
        LIMIT 1
      `, [userId, userId.toString()]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '숙박 업체 정보를 찾을 수 없습니다.' });
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
  app.get('/api/vendor/lodgings', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회 (partners 테이블에서)
      // 타입 불일치 대응: number와 string 둘 다 매칭
      const vendors = await db.query(`
        SELECT id FROM partners
        WHERE (user_id = ? OR user_id = ?) AND (partner_type = 'lodging' OR services = 'accommodation')
        LIMIT 1
      `, [userId, userId.toString()]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '숙박 업체 정보를 찾을 수 없습니다.' });
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
  app.post('/api/vendor/lodgings', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회 (partners 테이블)
      // 타입 불일치 대응: number와 string 둘 다 매칭
      const vendors = await db.query(`
        SELECT id FROM partners
        WHERE (user_id = ? OR user_id = ?) AND (partner_type = 'lodging' OR services = 'accommodation')
        LIMIT 1
      `, [userId, userId.toString()]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '숙박 업체 정보를 찾을 수 없습니다.' });
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
  app.put('/api/vendor/lodgings/:id', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');
      const lodgingId = parseInt(req.params.id);

      // Vendor ID 조회 (partners 테이블)
      // 타입 불일치 대응: number와 string 둘 다 매칭
      const vendors = await db.query(`
        SELECT id FROM partners
        WHERE (user_id = ? OR user_id = ?) AND (partner_type = 'lodging' OR services = 'accommodation')
        LIMIT 1
      `, [userId, userId.toString()]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '숙박 업체 정보를 찾을 수 없습니다.' });
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
  app.delete('/api/vendor/lodgings/:id', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');
      const lodgingId = parseInt(req.params.id);

      // Vendor ID 조회 (partners 테이블)
      // 타입 불일치 대응: number와 string 둘 다 매칭
      const vendors = await db.query(`
        SELECT id FROM partners
        WHERE (user_id = ? OR user_id = ?) AND (partner_type = 'lodging' OR services = 'accommodation')
        LIMIT 1
      `, [userId, userId.toString()]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '숙박 업체 정보를 찾을 수 없습니다.' });
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
  app.get('/api/vendor/lodging/bookings', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회 (partners 테이블)
      // 타입 불일치 대응: number와 string 둘 다 매칭
      const vendors = await db.query(`
        SELECT id FROM partners
        WHERE (user_id = ? OR user_id = ?) AND (partner_type = 'lodging' OR services = 'accommodation')
        LIMIT 1
      `, [userId, userId.toString()]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '숙박 업체 정보를 찾을 수 없습니다.' });
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
  app.get('/api/vendor/lodgings/check', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;
      const name = req.query.name as string;

      if (!userId || !name) {
        return res.status(400).json({ success: false, message: '필수 파라미터가 누락되었습니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회 (partners 테이블)
      // 타입 불일치 대응: number와 string 둘 다 매칭
      const vendors = await db.query(`
        SELECT id FROM partners
        WHERE (user_id = ? OR user_id = ?) AND (partner_type = 'lodging' OR services = 'accommodation')
        LIMIT 1
      `, [userId, userId.toString()]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({ success: false, message: '숙박 업체 정보를 찾을 수 없습니다.' });
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
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

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

  // Admin - 렌트카 업체 생성
  app.post('/api/admin/rentcar/vendors', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorData = req.body;

      // 기존 컬럼만 사용 (API 필드는 나중에 추가)
      const result = await db.execute(`
        INSERT INTO rentcar_vendors (
          vendor_code, business_name, brand_name, business_number,
          contact_name, contact_email, contact_phone,
          description, status, is_verified, commission_rate,
          total_vehicles, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendorData.vendor_code,
        vendorData.business_name,
        vendorData.brand_name || '',
        vendorData.business_number || '',
        vendorData.contact_name,
        vendorData.contact_email,
        vendorData.contact_phone,
        vendorData.description || '',
        vendorData.status || 'active',
        vendorData.is_verified ? 1 : 0,
        vendorData.commission_rate || 10.00,
        0
      ]);

      res.json({
        success: true,
        data: { id: result.insertId, ...vendorData },
        message: '렌트카 업체가 생성되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Create rentcar vendor error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '업체 생성 실패'
      });
    }
  });

  // Admin - 렌트카 업체에 차량 추가
  app.post('/api/admin/rentcar/vendors/:vendorId/vehicles', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorId = parseInt(req.params.vendorId);
      const vehicleData = req.body;

      // 필수 필드 검증
      if (!vehicleData.display_name || !vehicleData.daily_rate_krw) {
        return res.status(400).json({
          success: false,
          message: '필수 항목을 입력해주세요. (차량명, 일일 요금)'
        });
      }

      // 시간당 요금 자동 계산 (입력하지 않은 경우 일일 요금 / 24)
      const calculatedHourlyRate = vehicleData.hourly_rate_krw || Math.ceil(vehicleData.daily_rate_krw / 24);

      const result = await db.execute(`
        INSERT INTO rentcar_vehicles (
          vendor_id, display_name, daily_rate_krw, hourly_rate_krw,
          thumbnail_url, images, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendorId,
        vehicleData.display_name,
        vehicleData.daily_rate_krw,
        calculatedHourlyRate,
        vehicleData.thumbnail_url || null,
        JSON.stringify(vehicleData.images || []),
        vehicleData.is_active !== undefined ? (vehicleData.is_active ? 1 : 0) : 1
      ]);

      // 업체의 total_vehicles 업데이트
      await db.execute(`
        UPDATE rentcar_vendors
        SET total_vehicles = total_vehicles + 1
        WHERE id = ?
      `, [vendorId]);

      res.json({
        success: true,
        data: { id: result.insertId, ...vehicleData },
        message: '차량이 추가되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Create rentcar vehicle error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '차량 추가 실패'
      });
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
          rr.id,
          rr.booking_number,
          rr.vehicle_id,
          rv.display_name as vehicle_name,
          v.business_name as vendor_name,
          rr.customer_name,
          rr.customer_phone,
          rr.driver_name,
          rr.driver_license_number,
          rr.driver_birth_date,
          rr.pickup_at as pickup_date,
          rr.return_at as dropoff_date,
          rr.pickup_location,
          rr.return_location,
          rr.total_price_krw as total_amount,
          rr.status,
          rr.payment_key,
          rr.order_id,
          rr.has_voucher,
          rr.voucher_verified_at,
          rr.picked_up_at,
          rr.returned_at,
          rr.created_at,
          rd.id as deposit_id,
          rd.status as deposit_status,
          rd.deposit_amount_krw,
          rd.refund_amount_krw
        FROM rentcar_rentals rr
        INNER JOIN rentcar_vehicles rv ON rr.vehicle_id = rv.id
        INNER JOIN rentcar_vendors v ON rv.vendor_id = v.id
        LEFT JOIN rentcar_rental_deposits rd ON rr.id = rd.rental_id
        ORDER BY rr.created_at DESC
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

  // Admin - 렌트카 업체 API 동기화 (업체 API에서 차량 데이터 가져오기)
  app.post('/api/admin/rentcar/sync/:vendorId', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorId = parseInt(req.params.vendorId);

      // 1. 업체 정보 조회 (API 설정 포함)
      const vendors = await db.query(`
        SELECT * FROM rentcar_vendors WHERE id = ?
      `, [vendorId]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({
          success: false,
          message: '업체를 찾을 수 없습니다.'
        });
      }

      const vendor = vendors[0];

      // 2. API 설정 확인
      if (!vendor.api_enabled || !vendor.api_url || !vendor.api_key) {
        return res.status(400).json({
          success: false,
          message: 'API 연동 정보가 설정되지 않았습니다. 업체 설정에서 API URL, API Key를 입력해주세요.'
        });
      }

      // 3. API 커넥터로 차량 데이터 가져오기
      const { syncVehiclesFromApi } = await import('./utils/rentcar/api-connector.js');

      const result = await syncVehiclesFromApi({
        provider: 'standard', // 기본 표준 포맷
        apiUrl: vendor.api_url,
        apiKey: vendor.api_key,
        authType: vendor.api_auth_type || 'bearer'
      });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || 'API 연동 실패'
        });
      }

      // 4. 가져온 차량을 DB에 저장
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const vehicleData of result.vehicles) {
        try {
          // 중복 확인 (display_name으로)
          const existing = await db.query(`
            SELECT id FROM rentcar_vehicles
            WHERE vendor_id = ? AND display_name = ?
          `, [vendorId, vehicleData.display_name]);

          // 시간당 요금 자동 계산 (입력하지 않은 경우 일일 요금 / 24)
          const calculatedHourlyRate = vehicleData.hourly_rate_krw || Math.ceil(vehicleData.daily_rate_krw / 24);

          if (existing && existing.length > 0) {
            // 업데이트
            await db.execute(`
              UPDATE rentcar_vehicles SET
                display_name = ?,
                daily_rate_krw = ?,
                hourly_rate_krw = ?,
                thumbnail_url = ?,
                images = ?,
                is_active = ?,
                updated_at = NOW()
              WHERE vendor_id = ? AND display_name = ?
            `, [
              vehicleData.display_name,
              vehicleData.daily_rate_krw,
              calculatedHourlyRate,
              vehicleData.thumbnail_url || null,
              JSON.stringify(vehicleData.images || []),
              vehicleData.is_active !== undefined ? (vehicleData.is_active ? 1 : 0) : 1,
              vendorId,
              vehicleData.display_name
            ]);
          } else {
            // 새로 추가
            await db.execute(`
              INSERT INTO rentcar_vehicles (
                vendor_id, display_name, daily_rate_krw, hourly_rate_krw,
                thumbnail_url, images, is_active, created_at, updated_at
              ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
              )
            `, [
              vendorId,
              vehicleData.display_name,
              vehicleData.daily_rate_krw,
              calculatedHourlyRate,
              vehicleData.thumbnail_url || null,
              JSON.stringify(vehicleData.images || []),
              vehicleData.is_active !== undefined ? (vehicleData.is_active ? 1 : 0) : 1
            ]);
          }

          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`${vehicleData.display_name}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
      }

      // 5. 업체의 total_vehicles 업데이트
      const totalVehicles = await db.query(`
        SELECT COUNT(*) as count FROM rentcar_vehicles WHERE vendor_id = ?
      `, [vendorId]);

      await db.execute(`
        UPDATE rentcar_vendors SET
          total_vehicles = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [totalVehicles[0]?.count || 0, vendorId]);

      res.json({
        success: true,
        message: `API 동기화 완료: 성공 ${successCount}개, 실패 ${errorCount}개`,
        data: {
          total: result.vehicles.length,
          success: successCount,
          failed: errorCount,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error) {
      console.error('❌ [API] Rentcar sync error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'API 동기화 실패'
      });
    }
  });

  // ===== Admin Lodging Management APIs =====

  // Admin - 모든 숙박 업체 조회
  app.get('/api/admin/lodging/vendors', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const vendors = await db.query(`
        SELECT
          p.id,
          p.business_name as name,
          p.contact_name,
          p.email,
          p.phone,
          p.is_verified,
          p.tier,
          COUNT(DISTINCT l.id) as room_count,
          p.created_at
        FROM partners p
        LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = 1857 AND l.is_active = 1
        WHERE p.is_active = 1
        GROUP BY p.id, p.business_name, p.contact_name, p.email, p.phone, p.is_verified, p.tier, p.created_at
        ORDER BY p.created_at DESC
      `);

      res.json({
        success: true,
        data: vendors || []
      });
    } catch (error) {
      console.error('❌ [API] Get admin lodging vendors error:', error);
      res.status(500).json({ success: false, message: '업체 목록 조회 실패', data: [] });
    }
  });

  // Admin - 숙박 업체 생성
  app.post('/api/admin/lodging/vendors', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorData = req.body;

      const result = await db.execute(`
        INSERT INTO partners (
          business_name, contact_name, phone, email,
          is_active, is_verified, is_featured, tier, partner_type,
          user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendorData.business_name,
        vendorData.contact_name,
        vendorData.phone || '',
        vendorData.email || '',
        1, // is_active
        vendorData.is_verified ? 1 : 0,
        vendorData.is_featured ? 1 : 0,
        vendorData.tier || 'bronze',
        'lodging', // partner_type
        1 // default user_id (admin)
      ]);

      res.json({
        success: true,
        id: result.insertId,
        message: '숙박 업체가 생성되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Create admin lodging vendor error:', error);
      res.status(500).json({ success: false, message: '업체 생성 실패' });
    }
  });

  // Admin - 숙박 업체에 객실 추가
  app.post('/api/admin/lodging/vendors/:vendorId/rooms', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorId = parseInt(req.params.vendorId);
      const roomData = req.body;

      const result = await db.execute(`
        INSERT INTO listings (
          partner_id, category_id, listing_name, description,
          location, address, price_from,
          images, is_published, is_active,
          rating_avg, rating_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendorId,
        1857, // category_id for lodging
        roomData.room_name || roomData.listing_name,
        roomData.description || '',
        roomData.location || '',
        roomData.address || '',
        roomData.price_from || roomData.base_price_krw || 0,
        roomData.images ? JSON.stringify(roomData.images) : '[]',
        1, // is_published
        1, // is_active
        roomData.rating_avg || 0,
        roomData.rating_count || 0
      ]);

      res.json({
        success: true,
        id: result.insertId,
        message: '객실이 추가되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Add lodging room error:', error);
      res.status(500).json({ success: false, message: '객실 추가 실패' });
    }
  });

  // Admin - 숙박 객실 삭제
  app.delete('/api/admin/lodging/rooms/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const roomId = parseInt(req.params.id);

      await db.execute(`
        DELETE FROM listings WHERE id = ? AND category_id = 1857
      `, [roomId]);

      res.json({
        success: true,
        message: '객실이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete lodging room error:', error);
      res.status(500).json({ success: false, message: '객실 삭제 실패' });
    }
  });

  // Admin - 숙박 업체 삭제 (객실도 함께 삭제)
  app.delete('/api/admin/lodging/vendors/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorId = parseInt(req.params.id);

      // 1. 업체 객실 삭제
      await db.execute(`
        DELETE FROM listings WHERE partner_id = ? AND category_id = 1857
      `, [vendorId]);

      // 2. 업체 삭제
      await db.execute(`
        DELETE FROM partners WHERE id = ?
      `, [vendorId]);

      res.json({
        success: true,
        message: '업체가 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete lodging vendor error:', error);
      res.status(500).json({ success: false, message: '업체 삭제 실패' });
    }
  });

  // Admin - CSV 일괄 업로드 (객실 여러 개 한번에)
  app.post('/api/admin/lodging/vendors/:vendorId/bulk-upload', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorId = parseInt(req.params.vendorId);
      const { rooms } = req.body; // Array of room objects

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const roomData of rooms) {
        try {
          await db.execute(`
            INSERT INTO listings (
              partner_id, category_id, listing_name, description,
              location, address, price_from,
              images, is_published, is_active,
              rating_avg, rating_count,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `, [
            vendorId,
            1857,
            roomData.room_name || roomData.listing_name,
            roomData.description || '',
            roomData.location || '',
            roomData.address || '',
            roomData.price_from || roomData.base_price_krw || 0,
            roomData.images ? JSON.stringify(roomData.images) : '[]',
            1,
            1,
            roomData.rating_avg || 0,
            roomData.rating_count || 0
          ]);

          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`${roomData.room_name}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
      }

      res.json({
        success: true,
        message: `CSV 업로드 완료: 성공 ${successCount}개, 실패 ${errorCount}개`,
        successCount,
        errorCount,
        errors
      });
    } catch (error) {
      console.error('❌ [API] Bulk upload lodging rooms error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'CSV 업로드 실패'
      });
    }
  });

  // ===== Admin Accommodation Management APIs (별칭) =====
  // 프론트엔드 AccommodationManagement 컴포넌트와 호환성을 위한 별칭 API

  // Admin - 숙박 업체 조회 (별칭)
  app.get('/api/admin/accommodation-vendors', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const vendors = await db.query(`
        SELECT
          p.id as partner_id,
          p.id,
          p.business_name,
          p.contact_name as contact_name,
          p.phone as contact_phone,
          p.email as contact_email,
          p.is_verified,
          p.tier,
          p.status,
          p.logo_url,
          p.pms_provider,
          p.pms_api_key,
          p.pms_property_id,
          COUNT(DISTINCT l.id) as room_count,
          MIN(l.price_from) as min_price,
          AVG(r.rating) as avg_rating,
          COUNT(DISTINCT r.id) as total_reviews,
          p.created_at
        FROM partners p
        LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = 1857 AND l.is_active = 1
        LEFT JOIN reviews r ON l.id = r.listing_id
        WHERE p.is_active = 1 AND p.partner_type = 'lodging'
        GROUP BY p.id, p.business_name, p.contact_name, p.phone, p.email, p.is_verified, p.tier, p.status, p.logo_url, p.pms_provider, p.pms_api_key, p.pms_property_id, p.created_at
        ORDER BY p.created_at DESC
      `);

      res.json({
        success: true,
        data: vendors || []
      });
    } catch (error) {
      console.error('❌ [API] Get accommodation vendors error:', error);
      res.status(500).json({ success: false, message: '업체 목록 조회 실패', data: [] });
    }
  });

  // Admin - 숙박 업체 생성 (별칭)
  app.post('/api/admin/accommodation-vendors', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorData = req.body;

      const result = await db.execute(`
        INSERT INTO partners (
          business_name, contact_name, phone, email,
          is_active, is_verified, is_featured, tier, partner_type,
          logo_url, pms_provider, pms_api_key, pms_property_id, status,
          user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        vendorData.business_name,
        vendorData.contact_name,
        vendorData.phone || '',
        vendorData.email || '',
        1, // is_active
        vendorData.is_verified ? 1 : 0,
        vendorData.is_featured ? 1 : 0,
        vendorData.tier || 'basic',
        'lodging', // partner_type
        vendorData.logo_url || '',
        vendorData.pms_provider || '',
        vendorData.pms_api_key || '',
        vendorData.pms_property_id || '',
        vendorData.status || 'active',
        1 // default user_id (admin)
      ]);

      res.json({
        success: true,
        id: result.insertId,
        message: '숙박 업체가 생성되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Create accommodation vendor error:', error);
      res.status(500).json({ success: false, message: '업체 생성 실패' });
    }
  });

  // Admin - 숙박 업체 수정 (별칭)
  app.put('/api/admin/accommodation-vendors/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorId = parseInt(req.params.id);
      const vendorData = req.body;

      await db.execute(`
        UPDATE partners SET
          business_name = ?,
          contact_name = ?,
          phone = ?,
          email = ?,
          tier = ?,
          logo_url = ?,
          pms_provider = ?,
          pms_api_key = ?,
          pms_property_id = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        vendorData.business_name,
        vendorData.contact_name,
        vendorData.phone || '',
        vendorData.email || '',
        vendorData.tier || 'basic',
        vendorData.logo_url || '',
        vendorData.pms_provider || '',
        vendorData.pms_api_key || '',
        vendorData.pms_property_id || '',
        vendorId
      ]);

      res.json({
        success: true,
        message: '업체가 수정되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update accommodation vendor error:', error);
      res.status(500).json({ success: false, message: '업체 수정 실패' });
    }
  });

  // Admin - 숙박 업체 삭제 (별칭)
  app.delete('/api/admin/accommodation-vendors/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorId = parseInt(req.params.id);

      // 1. 업체 객실 삭제
      await db.execute(`
        DELETE FROM listings WHERE partner_id = ? AND category_id = 1857
      `, [vendorId]);

      // 2. 업체 삭제
      await db.execute(`
        DELETE FROM partners WHERE id = ?
      `, [vendorId]);

      res.json({
        success: true,
        message: '업체가 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete accommodation vendor error:', error);
      res.status(500).json({ success: false, message: '업체 삭제 실패' });
    }
  });

  // Admin - 숙박 업체 상태 변경
  app.put('/api/admin/accommodation-vendors/:id/status', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorId = parseInt(req.params.id);
      const { status } = req.body;

      await db.execute(`
        UPDATE partners SET
          status = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [status, vendorId]);

      res.json({
        success: true,
        message: '업체 상태가 변경되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update vendor status error:', error);
      res.status(500).json({ success: false, error: '상태 변경 실패' });
    }
  });

  // Admin - 숙박 객실 조회
  app.get('/api/admin/accommodation-rooms', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorId = req.query.vendor_id;

      let query = `
        SELECT
          l.id,
          l.listing_name as room_name,
          l.listing_name as title,
          l.description,
          l.location,
          l.address,
          l.price_from,
          l.price_from as base_price_per_night,
          l.images,
          l.is_active as is_available,
          l.is_active,
          l.created_at
        FROM listings l
        WHERE l.category_id = 1857
      `;

      const params: any[] = [];

      if (vendorId) {
        query += ` AND l.partner_id = ?`;
        params.push(vendorId);
      }

      query += ` ORDER BY l.created_at DESC`;

      const rooms = await db.query(query, params);

      res.json({
        success: true,
        data: rooms || []
      });
    } catch (error) {
      console.error('❌ [API] Get accommodation rooms error:', error);
      res.status(500).json({ success: false, message: '객실 목록 조회 실패', data: [] });
    }
  });

  // Admin - 객실 수정
  app.put('/api/admin/rooms/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const roomId = parseInt(req.params.id);
      const roomData = req.body;

      await db.execute(`
        UPDATE listings SET
          listing_name = ?,
          description = ?,
          location = ?,
          address = ?,
          price_from = ?,
          images = ?,
          updated_at = NOW()
        WHERE id = ? AND category_id = 1857
      `, [
        roomData.listing_name,
        roomData.description || '',
        roomData.location || '',
        roomData.address || '',
        roomData.price_from || 0,
        Array.isArray(roomData.images) ? JSON.stringify(roomData.images) : roomData.images,
        roomId
      ]);

      res.json({
        success: true,
        message: '객실이 수정되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update room error:', error);
      res.status(500).json({ success: false, message: '객실 수정 실패' });
    }
  });

  // Admin - 객실 삭제
  app.delete('/api/admin/rooms/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const roomId = parseInt(req.params.id);

      await db.execute(`
        DELETE FROM listings WHERE id = ? AND category_id = 1857
      `, [roomId]);

      res.json({
        success: true,
        message: '객실이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete room error:', error);
      res.status(500).json({ success: false, message: '객실 삭제 실패' });
    }
  });

  // Admin - 객실 활성화/비활성화
  app.put('/api/admin/rooms/:roomId/toggle-active', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const roomId = parseInt(req.params.roomId);
      const { is_active } = req.body;

      await db.execute(`
        UPDATE listings SET
          is_active = ?,
          updated_at = NOW()
        WHERE id = ? AND category_id = 1857
      `, [is_active ? 1 : 0, roomId]);

      res.json({
        success: true,
        message: is_active ? '객실이 활성화되었습니다.' : '객실이 비활성화되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Toggle room active error:', error);
      res.status(500).json({ success: false, error: '상태 변경 실패' });
    }
  });

  // Admin - 숙박 예약 조회
  app.get('/api/admin/accommodation-bookings', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const bookings = await db.query(`
        SELECT
          lb.id,
          lb.user_id,
          u.name as customer_name,
          lb.listing_id,
          l.listing_name as room_name,
          p.business_name as vendor_name,
          lb.check_in_date,
          lb.check_out_date,
          lb.total_price,
          lb.status,
          lb.created_at
        FROM lodging_bookings lb
        LEFT JOIN users u ON lb.user_id = u.id
        LEFT JOIN listings l ON lb.listing_id = l.id
        LEFT JOIN partners p ON l.partner_id = p.id
        WHERE l.category_id = 1857
        ORDER BY lb.created_at DESC
      `);

      res.json({
        success: true,
        data: bookings || []
      });
    } catch (error) {
      console.error('❌ [API] Get accommodation bookings error:', error);
      res.status(500).json({ success: false, message: '예약 목록 조회 실패', data: [] });
    }
  });

  // Admin - 숙박 예약 상태 변경
  app.put('/api/admin/accommodation-bookings/:id/status', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const bookingId = parseInt(req.params.id);
      const { status } = req.body;

      await db.execute(`
        UPDATE lodging_bookings SET
          status = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [status, bookingId]);

      res.json({
        success: true,
        message: '예약 상태가 변경되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update booking status error:', error);
      res.status(500).json({ success: false, error: '상태 변경 실패' });
    }
  });

  // Admin - PMS 동기화 (간단 구현)
  app.post('/api/admin/accommodation/sync/:vendorId', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const vendorId = parseInt(req.params.vendorId);

      // PMS 설정 조회
      const vendor = await db.query(`
        SELECT pms_provider, pms_api_key, pms_property_id
        FROM partners
        WHERE id = ?
      `, [vendorId]);

      if (!vendor || vendor.length === 0) {
        return res.status(404).json({
          success: false,
          message: '업체를 찾을 수 없습니다.'
        });
      }

      const pmsData = vendor[0];

      if (!pmsData.pms_provider || !pmsData.pms_api_key) {
        return res.status(400).json({
          success: false,
          message: 'PMS 연동 정보가 설정되지 않았습니다.'
        });
      }

      // 실제 PMS API 호출은 여기에 구현
      // 현재는 기본 응답만 반환
      res.json({
        success: true,
        message: 'PMS 동기화가 완료되었습니다.',
        data: {
          syncedRooms: 0,
          errors: []
        }
      });
    } catch (error) {
      console.error('❌ [API] PMS sync error:', error);
      res.status(500).json({
        success: false,
        message: 'PMS 동기화 실패'
      });
    }
  });

  // Admin - 벤더 CSV 업로드
  app.post('/api/admin/accommodation-vendors/csv-upload', authenticate, requireRole('admin'), async (req, res) => {
    try {
      // CSV 업로드 로직 (multer 필요)
      res.json({
        success: true,
        count: 0,
        message: 'CSV 업로드 기능은 추후 구현 예정입니다.'
      });
    } catch (error) {
      console.error('❌ [API] Vendor CSV upload error:', error);
      res.status(500).json({ success: false, error: 'CSV 업로드 실패' });
    }
  });

  // Admin - 객실 CSV 업로드
  app.post('/api/admin/accommodation-rooms/csv-upload', authenticate, requireRole('admin'), async (req, res) => {
    try {
      // CSV 업로드 로직 (multer 필요)
      res.json({
        success: true,
        count: 0,
        message: 'CSV 업로드 기능은 추후 구현 예정입니다.'
      });
    } catch (error) {
      console.error('❌ [API] Room CSV upload error:', error);
      res.status(500).json({ success: false, error: 'CSV 업로드 실패' });
    }
  });

  // ===== Admin Review Management APIs =====

  // Admin - 모든 리뷰 조회
  app.get('/api/admin/reviews', authenticate, requireRole('admin'), async (_req, res) => {
    try {
      const { db } = await import('./utils/database.js');

      const reviews = await db.query(`
        SELECT
          r.*,
          l.listing_name,
          u.name as user_name
        FROM reviews r
        LEFT JOIN listings l ON r.listing_id = l.id
        LEFT JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
      `);

      res.json({
        success: true,
        data: reviews || []
      });
    } catch (error) {
      console.error('❌ [API] Get admin reviews error:', error);
      res.status(500).json({ success: false, message: '리뷰 목록 조회 실패', data: [] });
    }
  });

  // Admin - 리뷰 생성
  app.post('/api/admin/reviews', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const { listing_id, user_id, rating, title, comment_md, visit_date } = req.body;

      const result = await db.execute(`
        INSERT INTO reviews (
          listing_id, user_id, rating, title, comment_md, visit_date,
          is_verified, is_published, is_visible,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        listing_id,
        user_id || 1, // Default user if not provided
        rating,
        title || '',
        comment_md || '',
        visit_date || null,
        true, // Admin-created reviews are verified
        true, // Published by default
        true  // Visible by default
      ]);

      // Update listing rating
      await updateListingRating(db, listing_id);

      res.json({
        success: true,
        data: { id: result.insertId },
        message: '리뷰가 생성되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Create review error:', error);
      res.status(500).json({ success: false, message: '리뷰 생성 실패' });
    }
  });

  // Admin - 리뷰 수정
  app.put('/api/admin/reviews/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const reviewId = parseInt(req.params.id);
      const { rating, title, comment_md, visit_date, is_published, is_visible } = req.body;

      // Get listing_id before update
      const review = await db.query(`SELECT listing_id FROM reviews WHERE id = ?`, [reviewId]);

      await db.execute(`
        UPDATE reviews SET
          rating = ?,
          title = ?,
          comment_md = ?,
          visit_date = ?,
          is_published = ?,
          is_visible = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        rating,
        title || '',
        comment_md || '',
        visit_date || null,
        is_published !== undefined ? is_published : true,
        is_visible !== undefined ? is_visible : true,
        reviewId
      ]);

      // Update listing rating
      if (review && review[0]) {
        await updateListingRating(db, review[0].listing_id);
      }

      res.json({
        success: true,
        message: '리뷰가 수정되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update review error:', error);
      res.status(500).json({ success: false, message: '리뷰 수정 실패' });
    }
  });

  // Admin - 리뷰 삭제
  app.delete('/api/admin/reviews/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const reviewId = parseInt(req.params.id);

      // Get listing_id before deletion
      const review = await db.query(`SELECT listing_id FROM reviews WHERE id = ?`, [reviewId]);

      await db.execute(`DELETE FROM reviews WHERE id = ?`, [reviewId]);

      // Update listing rating
      if (review && review[0]) {
        await updateListingRating(db, review[0].listing_id);
      }

      res.json({
        success: true,
        message: '리뷰가 삭제되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Delete review error:', error);
      res.status(500).json({ success: false, message: '리뷰 삭제 실패' });
    }
  });

  // Admin - 리뷰 상태 변경 (승인/거부/대기)
  app.patch('/api/admin/reviews/:id/status', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const reviewId = parseInt(req.params.id);
      const { status } = req.body; // 'published', 'pending', 'rejected'

      const isPublished = status === 'published';
      const isVisible = status !== 'rejected';

      await db.execute(`
        UPDATE reviews SET
          is_published = ?,
          is_visible = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [isPublished, isVisible, reviewId]);

      // Get listing_id and update rating
      const review = await db.query(`SELECT listing_id FROM reviews WHERE id = ?`, [reviewId]);
      if (review && review[0]) {
        await updateListingRating(db, review[0].listing_id);
      }

      res.json({
        success: true,
        message: '리뷰 상태가 변경되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update review status error:', error);
      res.status(500).json({ success: false, message: '리뷰 상태 변경 실패' });
    }
  });

  // Helper function to update listing rating based on reviews
  async function updateListingRating(db: any, listingId: number) {
    try {
      const stats = await db.query(`
        SELECT
          AVG(rating) as avg_rating,
          COUNT(*) as total_reviews
        FROM reviews
        WHERE listing_id = ?
          AND is_published = true
          AND is_visible = true
      `, [listingId]);

      if (stats && stats[0]) {
        await db.execute(`
          UPDATE listings SET
            rating_avg = ?,
            rating_count = ?,
            updated_at = NOW()
          WHERE id = ?
        `, [
          stats[0].avg_rating || 0,
          stats[0].total_reviews || 0,
          listingId
        ]);
      }
    } catch (error) {
      console.error('❌ [Helper] Update listing rating error:', error);
    }
  }

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

  // 사용자 프로필 업데이트 (이름, 전화번호, 주소 모두 포함)
  app.put('/api/user/profile', authenticate, async (req, res) => {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const userId = (req as any).user?.userId;
      const email = (req as any).user?.email;

      if (!userId || !email) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다' });
      }

      // Neon PostgreSQL DB 사용 (users 테이블)
      if (!process.env.POSTGRES_DATABASE_URL) {
        console.error('❌ POSTGRES_DATABASE_URL이 설정되지 않았습니다.');
        return res.status(500).json({ success: false, message: '서버 설정 오류입니다.' });
      }

      const sql = neon(process.env.POSTGRES_DATABASE_URL);

      const {
        name,
        phone,
        postalCode,
        address,
        detailAddress,
        birth_date,
        bio,
        avatar
      } = req.body;

      // users 테이블 업데이트 (Neon PostgreSQL)
      // ID 대신 email로 조회 (DB 마이그레이션 시 ID 변경되어도 email은 동일)
      await sql`
        UPDATE users
        SET name = ${name || ''},
            phone = ${phone || ''},
            postal_code = ${postalCode || ''},
            address = ${address || ''},
            detail_address = ${detailAddress || ''},
            birth_date = ${birth_date || null},
            bio = ${bio || null},
            avatar = ${avatar || null},
            updated_at = CURRENT_TIMESTAMP
        WHERE email = ${email}
      `;

      console.log('✅ [Profile] 프로필 업데이트 성공: email=', email);

      res.json({
        success: true,
        message: '프로필이 업데이트되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Update user profile error:', error);
      res.status(500).json({
        success: false,
        message: '프로필 업데이트 실패',
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      });
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
  app.get('/api/vendor/pricing/policies', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

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
  app.post('/api/vendor/pricing/policies', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

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
  app.patch('/api/vendor/pricing/policies/:id/toggle', authenticate, requireRole('vendor'), async (req, res) => {
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
  app.delete('/api/vendor/pricing/policies/:id', authenticate, requireRole('vendor'), async (req, res) => {
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
  app.get('/api/vendor/insurance', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

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
  app.post('/api/vendor/insurance', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

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
  app.patch('/api/vendor/insurance/:id/toggle', authenticate, requireRole('vendor'), async (req, res) => {
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
  app.delete('/api/vendor/insurance/:id', authenticate, requireRole('vendor'), async (req, res) => {
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
  app.get('/api/vendor/options', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

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
  app.post('/api/vendor/options', authenticate, requireRole('vendor'), async (req, res) => {
    try {
      const userId = req.user!.userId;

      const { db } = await import('./utils/database.js');

      // Vendor ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

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
  app.patch('/api/vendor/options/:id/toggle', authenticate, requireRole('vendor'), async (req, res) => {
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
  app.delete('/api/vendor/options/:id', authenticate, requireRole('vendor'), async (req, res) => {
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
      `, [userId]);

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
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

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
      `, [userId]);

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

  // Remove item from cart (query params version - used by useCartStore)
  app.delete('/api/cart', async (req, res) => {
    try {
      const userId = req.query.userId || req.headers['x-user-id'];
      const itemId = req.query.itemId;

      if (!userId) {
        return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
      }

      if (!itemId) {
        return res.status(400).json({ success: false, message: '상품 ID가 필요합니다.' });
      }

      const { db } = await import('./utils/database.js');

      // Delete all cart items for this user and listing
      await db.execute(`
        DELETE FROM cart_items WHERE user_id = ? AND listing_id = ?
      `, [parseInt(userId as string), parseInt(itemId as string)]);

      res.json({
        success: true,
        message: '장바구니에서 제거되었습니다.'
      });
    } catch (error) {
      console.error('❌ [API] Remove from cart error:', error);
      res.status(500).json({ success: false, message: '장바구니 제거 실패' });
    }
  });

  // Remove item from cart (path param version - legacy)
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
      `, [userId]);

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
      // @ts-expect-error - Rentcar API module type definition
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

  // Get all vehicles (with optional filters)
  app.get('/api/rentcar/vehicles', async (req, res) => {
    try {
      const vehiclesAPI = await import('./api/rentcar/vehicles.js');
      await vehiclesAPI.default(req as any, res as any);
    } catch (error) {
      console.error('❌ [API] Get vehicles error:', error);
      res.status(500).json({
        success: false,
        message: '차량 목록 조회 중 오류가 발생했습니다'
      });
    }
  });

  // Get vehicle by ID
  app.get('/api/rentcar/vehicles/:id', async (req, res) => {
    try {
      // @ts-expect-error - Rentcar API module type definition
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

  // Create vehicle
  app.post('/api/rentcar/vehicles', async (req, res) => {
    try {
      const { rentcarApi } = await import('./utils/rentcar-api');
      const { vendor_id, ...vehicleData } = req.body;

      if (!vendor_id) {
        return res.status(400).json({
          success: false,
          error: 'vendor_id is required'
        });
      }

      const result = await rentcarApi.vehicles.create(vendor_id, vehicleData);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Create vehicle error:', error);
      res.status(500).json({
        success: false,
        error: '차량 등록 중 오류가 발생했습니다'
      });
    }
  });

  // Update vehicle
  app.put('/api/rentcar/vehicles/:id', async (req, res) => {
    try {
      const { rentcarApi } = await import('./utils/rentcar-api');
      const vehicleId = parseInt(req.params.id);
      const result = await rentcarApi.vehicles.update(vehicleId, req.body);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Update vehicle error:', error);
      res.status(500).json({
        success: false,
        error: '차량 수정 중 오류가 발생했습니다'
      });
    }
  });

  // Delete vehicle
  app.delete('/api/rentcar/vehicles/:id', async (req, res) => {
    try {
      const { rentcarApi } = await import('./utils/rentcar-api');
      const vehicleId = parseInt(req.params.id);
      const result = await rentcarApi.vehicles.delete(vehicleId);
      res.json(result);
    } catch (error) {
      console.error('❌ [API] Delete vehicle error:', error);
      res.status(500).json({
        success: false,
        error: '차량 삭제 중 오류가 발생했습니다'
      });
    }
  });

  // Get individual vehicle detail (with vendor info)
  app.get('/api/rentcar/vehicle/:id', async (req, res) => {
    try {
      const { connect } = await import('@planetscale/database');
      const connection = connect({ url: process.env.DATABASE_URL! });

      const vehicleId = parseInt(req.params.id);

      const result = await connection.execute(
        `SELECT
          v.id,
          v.vendor_id,
          v.display_name,
          v.daily_rate_krw,
          v.hourly_rate_krw,
          v.thumbnail_url,
          v.images,
          v.is_active,
          v.created_at,
          v.updated_at,
          vendor.business_name as vendor_name,
          vendor.contact_phone as vendor_phone,
          vendor.address as vendor_address,
          vendor.brand_name,
          vendor.cancellation_policy
        FROM rentcar_vehicles v
        LEFT JOIN rentcar_vendors vendor ON v.vendor_id = vendor.id
        WHERE v.id = ?`,
        [vehicleId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '차량을 찾을 수 없습니다'
        });
      }

      const vehicle = result.rows[0];

      // JSON 파싱
      const vehicleData = {
        ...vehicle,
        images: vehicle.images ? (typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images) : [],
        is_active: vehicle.is_active === 1
      };

      res.json({
        success: true,
        data: vehicleData
      });
    } catch (error) {
      console.error('❌ [API] Get vehicle detail error:', error);
      res.status(500).json({
        success: false,
        error: '서버 오류가 발생했습니다'
      });
    }
  });

  // Get vehicle filter options
  app.get('/api/rentcar/vehicles/filters', async (req, res) => {
    try {
      // @ts-expect-error - Rentcar API module type definition
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
      const bookingsAPI = await import('./api/rentcar/bookings.js');
      await bookingsAPI.default(req as any, res as any);
    } catch (error) {
      console.error('❌ [API] Check availability error:', error);
      res.status(500).json({
        success: false,
        message: '재고 확인 중 오류가 발생했습니다'
      });
    }
  });

  // Create booking
  app.post('/api/rentcar/bookings', async (req, res) => {
    try {
      const bookingsAPI = await import('./api/rentcar/bookings.js');
      await bookingsAPI.default(req as any, res as any);
    } catch (error) {
      console.error('❌ [API] Create booking error:', error);
      res.status(500).json({
        success: false,
        message: '예약 생성 중 오류가 발생했습니다'
      });
    }
  });

  // Cancel booking
  app.delete('/api/rentcar/bookings/:id', async (req, res) => {
    try {
      const bookingsAPI = await import('./api/rentcar/bookings.js');
      await bookingsAPI.default(req as any, res as any);
    } catch (error) {
      console.error('❌ [API] Cancel booking error:', error);
      res.status(500).json({
        success: false,
        message: '예약 취소 중 오류가 발생했습니다'
      });
    }
  });

  // Get bookings
  app.get('/api/rentcar/bookings', async (req, res) => {
    try {
      const bookingsAPI = await import('./api/rentcar/bookings.js');
      await bookingsAPI.default(req as any, res as any);
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
      // @ts-expect-error - Rentcar API module type definition
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
      // @ts-expect-error - Rentcar API module type definition
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
      // @ts-expect-error - Rentcar API module type definition
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
      // @ts-expect-error - Rentcar API module type definition
      const { getVendorVehicles } = await import('./api/rentcar/vendor-vehicles.js');
      const vendorId = req.query.vendor_id ? parseInt(req.query.vendor_id as string) : undefined;
      const userId = req.query.userId ? parseInt(req.query.userId as string) : req.user?.userId;
      const result = await getVendorVehicles(vendorId, userId);
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
      // @ts-expect-error - Rentcar API module type definition
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

  // Update vehicle stock
  app.put('/api/vendor/rentcar/vehicles/stock', authenticate, async (req, res) => {
    try {
      const { vehicle_id, stock } = req.body;
      const userId = req.user?.userId;

      if (!vehicle_id || stock === undefined || stock === null) {
        return res.status(400).json({
          success: false,
          message: 'vehicle_id와 stock은 필수 항목입니다.'
        });
      }

      if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({
          success: false,
          message: '재고는 0 이상의 숫자여야 합니다.'
        });
      }

      const db = await import('./utils/database.js');

      // user_id로 렌트카 벤더 ID 조회
      const vendors = await db.query(`SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1`, [userId]);

      if (!vendors || vendors.length === 0) {
        return res.status(404).json({
          success: false,
          message: '렌트카 벤더 정보를 찾을 수 없습니다.'
        });
      }

      const vendorId = vendors[0].id;

      // 해당 차량이 벤더의 것인지 확인
      const vehicleCheck = await db.query(
        `SELECT id FROM rentcar_vehicles WHERE id = ? AND vendor_id = ? LIMIT 1`,
        [vehicle_id, vendorId]
      );

      if (!vehicleCheck || vehicleCheck.length === 0) {
        return res.status(403).json({
          success: false,
          message: '해당 차량에 대한 권한이 없습니다.'
        });
      }

      // 재고 업데이트
      await db.query(
        `UPDATE rentcar_vehicles SET stock = ?, updated_at = NOW() WHERE id = ?`,
        [stock, vehicle_id]
      );

      console.log(`✅ [Rentcar Vendor] Vehicle ${vehicle_id} stock updated to ${stock} by vendor ${vendorId}`);

      return res.status(200).json({
        success: true,
        message: '재고가 성공적으로 업데이트되었습니다.',
        data: {
          vehicle_id,
          stock
        }
      });
    } catch (error) {
      console.error('❌ [API] Update vehicle stock error:', error);
      res.status(500).json({
        success: false,
        message: '재고 업데이트 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update vehicle
  app.put('/api/vendor/rentcar/vehicles/:id', authenticate, async (req, res) => {
    try {
      // @ts-expect-error - Rentcar API module type definition
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
      // @ts-expect-error - Rentcar API module type definition
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
      // @ts-expect-error - Rentcar API module type definition
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
      // @ts-expect-error - Rentcar API module type definition
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
      // @ts-expect-error - Rentcar API module type definition
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

  // ===== Admin Coupon Management API =====
  app.get('/api/admin/coupons', async (req, res) => {
    try {
      const adminCouponsAPI = await import('./api/admin/coupons.js');
      await adminCouponsAPI.default(req, res);
    } catch (error) {
      console.error('[API] Admin coupons GET error:', error);
      res.status(500).json({ success: false, message: '쿠폰 목록 조회 중 오류가 발생했습니다' });
    }
  });

  app.post('/api/admin/coupons', async (req, res) => {
    try {
      const adminCouponsAPI = await import('./api/admin/coupons.js');
      await adminCouponsAPI.default(req, res);
    } catch (error) {
      console.error('[API] Admin coupons POST error:', error);
      res.status(500).json({ success: false, message: '쿠폰 생성 중 오류가 발생했습니다' });
    }
  });

  app.put('/api/admin/coupons', async (req, res) => {
    try {
      const adminCouponsAPI = await import('./api/admin/coupons.js');
      await adminCouponsAPI.default(req, res);
    } catch (error) {
      console.error('[API] Admin coupons PUT error:', error);
      res.status(500).json({ success: false, message: '쿠폰 수정 중 오류가 발생했습니다' });
    }
  });

  app.delete('/api/admin/coupons', async (req, res) => {
    try {
      const adminCouponsAPI = await import('./api/admin/coupons.js');
      await adminCouponsAPI.default(req, res);
    } catch (error) {
      console.error('[API] Admin coupons DELETE error:', error);
      res.status(500).json({ success: false, message: '쿠폰 삭제 중 오류가 발생했습니다' });
    }
  });

  // ===== User Coupon API =====
  // GET /api/coupons - 사용자 쿠폰 목록 조회
  app.get('/api/coupons', async (req, res) => {
    try {
      const couponsAPI = await import('./api/coupons.js');
      await couponsAPI.default(req, res);
    } catch (error) {
      console.error('[API] Coupons GET error:', error);
      res.status(500).json({ success: false, message: '쿠폰 목록 조회 중 오류가 발생했습니다' });
    }
  });

  // POST /api/coupons/validate - 쿠폰 유효성 검증
  app.post('/api/coupons/validate', async (req, res) => {
    try {
      const validateAPI = await import('./api/coupons/validate.js');
      await validateAPI.default(req, res);
    } catch (error) {
      console.error('[API] Coupons validate error:', error);
      res.status(500).json({ success: false, message: '쿠폰 검증 중 오류가 발생했습니다' });
    }
  });

  // POST /api/coupons/use - 쿠폰 사용 처리
  app.post('/api/coupons/use', async (req, res) => {
    try {
      const useAPI = await import('./api/coupons/use.js');
      await useAPI.default(req, res);
    } catch (error) {
      console.error('[API] Coupons use error:', error);
      res.status(500).json({ success: false, message: '쿠폰 사용 처리 중 오류가 발생했습니다' });
    }
  });

  // POST /api/coupons/register - 쿠폰 등록
  app.post('/api/coupons/register', async (req, res) => {
    try {
      const registerAPI = await import('./api/coupons/register.js');
      await registerAPI.default(req, res);
    } catch (error) {
      console.error('[API] Coupons register error:', error);
      res.status(500).json({ success: false, message: '쿠폰 등록 중 오류가 발생했습니다' });
    }
  });

  // GET /api/coupons/public - 공개 쿠폰 목록
  app.get('/api/coupons/public', async (req, res) => {
    try {
      const publicAPI = await import('./api/coupons/public.js');
      await publicAPI.default(req, res);
    } catch (error) {
      console.error('[API] Coupons public error:', error);
      res.status(500).json({ success: false, message: '공개 쿠폰 조회 중 오류가 발생했습니다' });
    }
  });

  // ===== 쿠폰북 캠페인 API =====
  // GET/POST/PUT/DELETE /api/admin/coupon-book-campaigns - 쿠폰북 캠페인 관리
  app.all('/api/admin/coupon-book-campaigns', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const campaignsAPI = await import('./api/admin/coupon-book-campaigns.js');
      await campaignsAPI.default(req, res);
    } catch (error) {
      console.error('[API] Coupon book campaigns error:', error);
      res.status(500).json({ success: false, message: '쿠폰북 캠페인 처리 중 오류가 발생했습니다' });
    }
  });

  // POST /api/coupon-book/claim - QR 스캔 후 쿠폰 발급
  app.post('/api/coupon-book/claim', async (req, res) => {
    try {
      const claimAPI = await import('./api/coupon-book/claim.js');
      await claimAPI.default(req, res);
    } catch (error) {
      console.error('[API] Coupon book claim error:', error);
      res.status(500).json({ success: false, message: '쿠폰 발급 중 오류가 발생했습니다' });
    }
  });

  // GET /api/coupon-book/campaign/:id - 캠페인 정보 조회 (공개)
  app.get('/api/coupon-book/campaign/:id', async (req, res) => {
    try {
      const campaignAPI = await import('./api/coupon-book/campaign/[id].js');
      await campaignAPI.default(req, res);
    } catch (error) {
      console.error('[API] Coupon book campaign info error:', error);
      res.status(500).json({ success: false, message: '캠페인 정보 조회 중 오류가 발생했습니다' });
    }
  });

  // ===== 추가 쿠폰 관련 API =====

  // GET /api/my/coupons - 사용자 쿠폰 목록 (마이페이지용)
  app.get('/api/my/coupons', authenticate, async (req, res) => {
    try {
      const myCouponsAPI = await import('./api/my/coupons.js');
      await myCouponsAPI.default(req, res);
    } catch (error) {
      console.error('[API] My coupons error:', error);
      res.status(500).json({ success: false, message: '쿠폰 조회 중 오류가 발생했습니다' });
    }
  });

  // GET /api/admin/coupon-stats - 쿠폰 통계 (관리자)
  app.get('/api/admin/coupon-stats', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const couponStatsAPI = await import('./api/admin/coupon-stats.js');
      await couponStatsAPI.default(req, res);
    } catch (error) {
      console.error('[API] Coupon stats error:', error);
      res.status(500).json({ success: false, message: '쿠폰 통계 조회 중 오류가 발생했습니다' });
    }
  });

  // GET /api/admin/coupon-settlements - 쿠폰 정산 (관리자)
  app.get('/api/admin/coupon-settlements', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const settlementsAPI = await import('./api/admin/coupon-settlements.js');
      await settlementsAPI.default(req, res);
    } catch (error) {
      console.error('[API] Coupon settlements error:', error);
      res.status(500).json({ success: false, message: '쿠폰 정산 조회 중 오류가 발생했습니다' });
    }
  });

  // GET /api/admin/coupon-export - 쿠폰 내보내기 (관리자)
  app.get('/api/admin/coupon-export', authenticate, requireRole('admin'), async (req, res) => {
    try {
      const exportAPI = await import('./api/admin/coupon-export.js');
      await exportAPI.default(req, res);
    } catch (error) {
      console.error('[API] Coupon export error:', error);
      res.status(500).json({ success: false, message: '쿠폰 내보내기 중 오류가 발생했습니다' });
    }
  });

  // GET /api/partner/coupon-history - 파트너 쿠폰 사용 내역
  app.get('/api/partner/coupon-history', authenticate, async (req, res) => {
    try {
      const historyAPI = await import('./api/partner/coupon-history.js');
      await historyAPI.default(req, res);
    } catch (error) {
      console.error('[API] Partner coupon history error:', error);
      res.status(500).json({ success: false, message: '쿠폰 사용 내역 조회 중 오류가 발생했습니다' });
    }
  });

  // 404 핸들러
  app.use((req, res) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`
    });
  });

  // ===== Database Cloud API (PMS 연동용) =====
  app.post('/api/db', async (req, res) => {
    try {
      const { db } = await import('./utils/database.js');
      const { action, table, where, data, sql, params } = req.body;

      switch (action) {
        case 'query': {
          // Raw SQL query
          const result = await db.query(sql, params || []);
          return res.json({
            success: true,
            data: result,
            // @ts-expect-error - PlanetScale result type issue
            insertId: result?.insertId || 0,
            // @ts-expect-error - PlanetScale result type issue
            affectedRows: result?.affectedRows || 0
          });
        }

        case 'select': {
          // SELECT with WHERE
          let query = `SELECT * FROM ${table}`;
          const values: any[] = [];

          if (where && Object.keys(where).length > 0) {
            const conditions = Object.keys(where).map(key => {
              values.push(where[key]);
              return `${key} = ?`;
            });
            query += ` WHERE ${conditions.join(' AND ')}`;
          }

          const result = await db.query(query, values);
          return res.json({
            success: true,
            data: result || []
          });
        }

        case 'insert': {
          // INSERT
          const keys = Object.keys(data);
          const values = Object.values(data);
          const placeholders = keys.map(() => '?').join(', ');

          const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
          const result = await db.execute(query, values);

          return res.json({
            success: true,
            id: result.insertId,
            insertId: result.insertId
          });
        }

        case 'update': {
          // UPDATE
          const keys = Object.keys(data);
          const values = Object.values(data);
          const setClause = keys.map(key => `${key} = ?`).join(', ');

          const whereKeys = Object.keys(where || {});
          const whereValues = Object.values(where || {});
          const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');

          const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
          const result = await db.execute(query, [...values, ...whereValues]);

          return res.json({
            success: true,
            affectedRows: result.affectedRows || 0
          });
        }

        case 'delete': {
          // DELETE
          const whereKeys = Object.keys(where || {});
          const whereValues = Object.values(where || {});
          const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');

          const query = `DELETE FROM ${table} WHERE ${whereClause}`;
          const result = await db.execute(query, whereValues);

          return res.json({
            success: true,
            affectedRows: result.affectedRows || 0
          });
        }

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action'
          });
      }
    } catch (error) {
      console.error('❌ [API] Database cloud error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Database operation failed'
      });
    }
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
