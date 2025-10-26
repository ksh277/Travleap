/**
 * 벤더 주문 목록 조회 API
 *
 * GET /api/vendor/orders?vendorId={vendorId}
 *
 * 권한: vendor (본인의 상품 주문만 조회 가능)
 */

const { db } = require('../../utils/database');
const { JWTUtils } = require('../../utils/jwt');
const { maskForLog } = require('../../utils/pii-masking');

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

    const vendorId = req.query.vendorId;

    // 본인 주문만 조회 가능
    if (parseInt(vendorId) !== decoded.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Can only view own orders'
      });
    }

    console.log(`📋 [Vendor Orders] Loading orders for vendor ${vendorId}`);

    // 벤더의 주문 목록 조회 (본인이 등록한 팝업 상품의 주문만)
    const orders = await db.query(`
      SELECT
        b.id,
        b.booking_number as order_number,
        b.listing_id,
        l.title as product_name,
        l.category,
        b.user_id,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
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
        b.num_adults
      FROM bookings b
      INNER JOIN listings l ON b.listing_id = l.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE l.user_id = ?
        AND l.category = '팝업'
      ORDER BY b.created_at DESC
    `, [vendorId]);

    // customer_info JSON 파싱
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

      return {
        ...order,
        customer_info: customerInfo
      };
    });

    console.log(`✅ [Vendor Orders] Found ${ordersWithParsedInfo.length} orders`);

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
