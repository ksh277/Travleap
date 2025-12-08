/**
 * 벤더 주문 목록 조회 API
 *
 * GET /api/vendor/orders?vendorId={vendorId}
 *
 * 권한: vendor (본인의 상품 주문만 조회 가능)
 *
 * ✅ FIX: users 테이블은 Neon PostgreSQL에 있으므로 별도 조회
 */

const { db } = require('../../utils/database.cjs');
const { JWTUtils } = require('../../utils/jwt.cjs');
const { maskForLog } = require('../../utils/pii-masking.cjs');
const { Pool } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  try {
    // GET 메서드만 허용
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // JWT 인증 확인
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = JWTUtils.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token'
      });
    }

    // 벤더 권한 확인
    if (decoded.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Vendor role required',
        userRole: decoded.role
      });
    }

    // JWT에서 vendorId 추출 (쿼리 파라미터 무시)
    const vendorId = decoded.userId;

    console.log(`📋 [Vendor Orders] Loading orders for vendor ${vendorId}`);

    // ✅ FIX: users 테이블 JOIN 제거 (users는 Neon PostgreSQL에 있음)
    const orders = await db.query(`
      SELECT
        b.id,
        b.booking_number as order_number,
        b.listing_id,
        l.title as product_name,
        l.category,
        b.user_id,
        b.customer_info,
        b.total_amount,
        b.payment_status,
        b.status,
        b.delivery_status,
        b.tracking_number,
        b.courier_company,
        b.shipped_at,
        b.delivered_at,
        b.created_at,
        b.start_date,
        b.num_adults,
        p.method as payment_method,
        p.card_company,
        p.virtual_account_bank,
        p.refund_amount,
        p.refund_reason,
        p.refunded_at
      FROM bookings b
      INNER JOIN listings l ON b.listing_id = l.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE l.user_id = ?
        AND l.category = '팝업'
      ORDER BY b.created_at DESC
    `, [vendorId]);

    // ✅ FIX: Neon PostgreSQL에서 사용자 정보 별도 조회
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    let userMap = new Map();
    try {
      const userIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];

      if (userIds.length > 0) {
        const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
        const usersResult = await poolNeon.query(
          `SELECT id, name, email, phone, address, detailed_address, postal_code FROM users WHERE id IN (${placeholders})`,
          userIds
        );
        usersResult.rows.forEach(user => {
          userMap.set(user.id, user);
        });
      }
    } catch (neonError) {
      console.warn('⚠️ [Vendor Orders] Neon users 조회 실패 (customer_info로 대체):', neonError.message);
    } finally {
      await poolNeon.end();
    }

    // customer_info JSON 파싱 + Neon 사용자 정보 병합
    const ordersWithParsedInfo = orders.map(order => {
      let customerInfo = null;
      if (order.customer_info) {
        try {
          customerInfo = typeof order.customer_info === 'string'
            ? JSON.parse(order.customer_info)
            : order.customer_info;
        } catch (e) {
          console.warn(`Failed to parse customer_info for order ${order.id}`);
        }
      }

      // ✅ Neon에서 조회한 사용자 정보
      const neonUser = userMap.get(order.user_id);

      return {
        ...order,
        customer_info: customerInfo,
        // 사용자 정보 (Neon users 테이블에서 가져옴)
        user_name: neonUser?.name || '',
        user_email: neonUser?.email || '',
        user_phone: neonUser?.phone || '',
        user_address: neonUser?.address || '',
        user_detailed_address: neonUser?.detailed_address || '',
        user_postal_code: neonUser?.postal_code || ''
      };
    });

    console.log(`✅ [Vendor Orders] Found ${ordersWithParsedInfo.length} orders (with Neon user data)`);

    return res.status(200).json({
      success: true,
      data: ordersWithParsedInfo,
      count: ordersWithParsedInfo.length
    });

  } catch (error) {
    console.error('❌ [Vendor Orders] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
