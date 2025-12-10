/**
 * 활동 로그 기록 유틸리티
 *
 * 로그 타입:
 * - auth: 회원가입, 로그인, 로그아웃, 계정삭제
 * - admin: 관리자 활동 (상품/파트너/사용자 관리)
 * - order: 주문/예약/결제 관련
 * - user: 사용자 활동 (프로필 수정, 쿠폰 사용 등)
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

// 로그 타입 정의
const LOG_TYPES = {
  // 인증 관련
  AUTH_SIGNUP: 'auth.signup',
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_DELETE: 'auth.delete',
  AUTH_PASSWORD_CHANGE: 'auth.password_change',

  // 관리자 활동
  ADMIN_USER_CREATE: 'admin.user.create',
  ADMIN_USER_UPDATE: 'admin.user.update',
  ADMIN_USER_DELETE: 'admin.user.delete',
  ADMIN_USER_ROLE_CHANGE: 'admin.user.role_change',

  ADMIN_PRODUCT_CREATE: 'admin.product.create',
  ADMIN_PRODUCT_UPDATE: 'admin.product.update',
  ADMIN_PRODUCT_DELETE: 'admin.product.delete',

  ADMIN_PARTNER_APPROVE: 'admin.partner.approve',
  ADMIN_PARTNER_REJECT: 'admin.partner.reject',
  ADMIN_PARTNER_UPDATE: 'admin.partner.update',

  ADMIN_COUPON_CREATE: 'admin.coupon.create',
  ADMIN_COUPON_UPDATE: 'admin.coupon.update',
  ADMIN_COUPON_DELETE: 'admin.coupon.delete',

  ADMIN_BANNER_CREATE: 'admin.banner.create',
  ADMIN_BANNER_UPDATE: 'admin.banner.update',
  ADMIN_BANNER_DELETE: 'admin.banner.delete',

  ADMIN_REFUND: 'admin.refund',
  ADMIN_POINTS_ADJUST: 'admin.points.adjust',

  // 주문/결제 관련
  ORDER_CREATE: 'order.create',
  ORDER_PAYMENT: 'order.payment',
  ORDER_CANCEL: 'order.cancel',
  ORDER_REFUND: 'order.refund',

  // 사용자 활동
  USER_PROFILE_UPDATE: 'user.profile.update',
  USER_COUPON_USE: 'user.coupon.use',
  USER_REVIEW_CREATE: 'user.review.create',
  USER_FAVORITE_ADD: 'user.favorite.add',
  USER_FAVORITE_REMOVE: 'user.favorite.remove',
};

/**
 * 활동 로그 기록 (PlanetScale admin_logs 테이블)
 */
async function logActivity(options) {
  const {
    userId,
    action,
    entityType,
    entityId,
    description,
    details = {},
    ipAddress,
    userAgent,
    adminId = null
  } = options;

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    await connection.execute(`
      INSERT INTO admin_logs (
        admin_id, action, entity_type, entity_id,
        description, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      adminId || userId,
      action,
      entityType || null,
      entityId || null,
      description,
      ipAddress || null,
      userAgent || null
    ]);

    console.log(`[ActivityLog] ${action}: ${description}`);
    return true;
  } catch (error) {
    console.error('[ActivityLog] 로그 기록 실패:', error.message);
    return false;
  }
}

/**
 * 인증 로그 기록 (Neon login_history 테이블)
 */
async function logAuth(options) {
  const {
    userId,
    loginType = 'email',
    ipAddress,
    userAgent,
    deviceType = 'desktop',
    status = 'success'
  } = options;

  try {
    const pool = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    await pool.query(`
      INSERT INTO login_history (
        user_id, login_type, ip_address, user_agent,
        device_type, login_status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [userId, loginType, ipAddress, userAgent, deviceType, status]);

    await pool.end();
    console.log(`[AuthLog] ${loginType} - user:${userId} - ${status}`);
    return true;
  } catch (error) {
    console.error('[AuthLog] 로그 기록 실패:', error.message);
    return false;
  }
}

/**
 * 회원가입 로그
 */
async function logSignup(userId, email, provider = 'email', req = null) {
  const ipAddress = req ? getClientIp(req) : null;
  const userAgent = req?.headers?.['user-agent'] || null;

  // login_history에 기록
  await logAuth({
    userId,
    loginType: provider,
    ipAddress,
    userAgent,
    status: 'success'
  });

  // admin_logs에도 기록
  await logActivity({
    userId,
    action: LOG_TYPES.AUTH_SIGNUP,
    entityType: 'user',
    entityId: userId,
    description: `새 회원 가입: ${email} (${provider})`,
    ipAddress,
    userAgent
  });
}

/**
 * 로그인 로그
 */
async function logLogin(userId, email, provider = 'email', success = true, req = null) {
  const ipAddress = req ? getClientIp(req) : null;
  const userAgent = req?.headers?.['user-agent'] || null;
  const deviceType = detectDeviceType(userAgent);

  await logAuth({
    userId,
    loginType: provider,
    ipAddress,
    userAgent,
    deviceType,
    status: success ? 'success' : 'failed'
  });
}

/**
 * 계정 삭제 로그
 */
async function logAccountDelete(userId, email, reason = '', adminId = null, req = null) {
  const ipAddress = req ? getClientIp(req) : null;
  const userAgent = req?.headers?.['user-agent'] || null;

  await logActivity({
    userId,
    adminId,
    action: LOG_TYPES.AUTH_DELETE,
    entityType: 'user',
    entityId: userId,
    description: `계정 삭제: ${email}${reason ? ` (사유: ${reason})` : ''}`,
    ipAddress,
    userAgent
  });
}

/**
 * 관리자 활동 로그 (상품/파트너 등)
 */
async function logAdminAction(options) {
  const {
    adminId,
    action,
    entityType,
    entityId,
    entityName,
    changes = null,
    req = null
  } = options;

  const ipAddress = req ? getClientIp(req) : null;
  const userAgent = req?.headers?.['user-agent'] || null;

  let description = '';
  switch (action) {
    case LOG_TYPES.ADMIN_PRODUCT_CREATE:
      description = `상품 등록: ${entityName}`;
      break;
    case LOG_TYPES.ADMIN_PRODUCT_UPDATE:
      description = `상품 수정: ${entityName}`;
      break;
    case LOG_TYPES.ADMIN_PRODUCT_DELETE:
      description = `상품 삭제: ${entityName}`;
      break;
    case LOG_TYPES.ADMIN_PARTNER_APPROVE:
      description = `파트너 승인: ${entityName}`;
      break;
    case LOG_TYPES.ADMIN_PARTNER_REJECT:
      description = `파트너 거절: ${entityName}`;
      break;
    case LOG_TYPES.ADMIN_USER_ROLE_CHANGE:
      description = `사용자 역할 변경: ${entityName} → ${changes?.newRole}`;
      break;
    case LOG_TYPES.ADMIN_COUPON_CREATE:
      description = `쿠폰 생성: ${entityName}`;
      break;
    case LOG_TYPES.ADMIN_BANNER_CREATE:
      description = `배너 등록: ${entityName}`;
      break;
    case LOG_TYPES.ADMIN_REFUND:
      description = `환불 처리: ${entityName}`;
      break;
    case LOG_TYPES.ADMIN_POINTS_ADJUST:
      description = `포인트 조정: ${entityName} (${changes?.points > 0 ? '+' : ''}${changes?.points}P)`;
      break;
    default:
      description = `${action}: ${entityName}`;
  }

  await logActivity({
    adminId,
    action,
    entityType,
    entityId,
    description,
    details: changes,
    ipAddress,
    userAgent
  });
}

/**
 * 주문/결제 로그
 */
async function logOrder(options) {
  const {
    userId,
    action,
    orderId,
    orderNumber,
    amount,
    productName,
    req = null
  } = options;

  const ipAddress = req ? getClientIp(req) : null;
  const userAgent = req?.headers?.['user-agent'] || null;

  let description = '';
  switch (action) {
    case LOG_TYPES.ORDER_CREATE:
      description = `주문 생성: ${orderNumber} - ${productName}`;
      break;
    case LOG_TYPES.ORDER_PAYMENT:
      description = `결제 완료: ${orderNumber} - ${amount?.toLocaleString()}원`;
      break;
    case LOG_TYPES.ORDER_CANCEL:
      description = `주문 취소: ${orderNumber}`;
      break;
    case LOG_TYPES.ORDER_REFUND:
      description = `환불 처리: ${orderNumber} - ${amount?.toLocaleString()}원`;
      break;
    default:
      description = `${action}: ${orderNumber}`;
  }

  await logActivity({
    userId,
    action,
    entityType: 'order',
    entityId: orderId,
    description,
    ipAddress,
    userAgent
  });
}

/**
 * 사용자 활동 로그
 */
async function logUserAction(options) {
  const {
    userId,
    action,
    entityType,
    entityId,
    entityName,
    details = null,
    req = null
  } = options;

  const ipAddress = req ? getClientIp(req) : null;
  const userAgent = req?.headers?.['user-agent'] || null;

  let description = '';
  switch (action) {
    case LOG_TYPES.USER_PROFILE_UPDATE:
      description = `프로필 수정`;
      break;
    case LOG_TYPES.USER_COUPON_USE:
      description = `쿠폰 사용: ${entityName}`;
      break;
    case LOG_TYPES.USER_REVIEW_CREATE:
      description = `리뷰 작성: ${entityName}`;
      break;
    case LOG_TYPES.USER_FAVORITE_ADD:
      description = `찜 추가: ${entityName}`;
      break;
    case LOG_TYPES.USER_FAVORITE_REMOVE:
      description = `찜 제거: ${entityName}`;
      break;
    default:
      description = `${action}: ${entityName || ''}`;
  }

  await logActivity({
    userId,
    action,
    entityType,
    entityId,
    description,
    details,
    ipAddress,
    userAgent
  });
}

/**
 * 클라이언트 IP 추출
 */
function getClientIp(req) {
  if (!req) return null;

  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return req.headers?.['x-real-ip'] ||
         req.socket?.remoteAddress ||
         req.connection?.remoteAddress ||
         null;
}

/**
 * 디바이스 타입 감지
 */
function detectDeviceType(userAgent) {
  if (!userAgent) return 'desktop';

  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
    if (/ipad|tablet/i.test(ua)) return 'tablet';
    return 'mobile';
  }
  return 'desktop';
}

module.exports = {
  LOG_TYPES,
  logActivity,
  logAuth,
  logSignup,
  logLogin,
  logAccountDelete,
  logAdminAction,
  logOrder,
  logUserAction,
  getClientIp,
  detectDeviceType
};
