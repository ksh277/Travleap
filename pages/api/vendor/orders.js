/**
 * 벤더 주문 목록 조회 API
 *
 * GET /api/vendor/orders?vendorId={vendorId}
 *
 * 권한: vendor (본인의 상품 주문만 조회 가능)
 */

const { db } = require('../../../utils/database.cjs');
const { JWTUtils } = require('../../../utils/jwt.cjs');
const { maskForLog } = require('../../../utils/pii-masking.cjs');

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

    // JWT에서 vendorId 추출
    const vendorId = decoded.userId;

    // 카테고리 필터 (쿼리 파라미터로 지정 가능, 없으면 전체)
    const categoryFilter = req.query.category;

    console.log(`📋 [Vendor Orders] Loading orders for vendor ${vendorId}, category: ${categoryFilter || 'all'}`);

    // 벤더의 주문 목록 조회 (본인이 등록한 상품의 주문)
    // ✅ 모든 카테고리 지원: 팝업, 여행, 음식, 관광지, 행사, 체험
    let query = `
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
        b.end_date,
        b.num_adults,
        b.num_children,
        b.num_seniors,
        b.adults,
        b.children,
        b.infants,
        b.order_number as payment_order_number,
        p.points_used,
        p.notes as payment_notes,
        p.amount as payment_amount
      FROM bookings b
      INNER JOIN listings l ON b.listing_id = l.id
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN payments p ON (
        b.order_number = p.order_id_str
        OR b.booking_number = p.gateway_transaction_id
      )
      WHERE l.user_id = ?
    `;

    const params = [vendorId];

    // 카테고리 필터 적용 (있을 경우에만)
    if (categoryFilter) {
      query += ` AND l.category = ?`;
      params.push(categoryFilter);
    }

    query += ` ORDER BY b.created_at DESC`;

    const orders = await db.query(query, params);

    // customer_info 및 payment_notes JSON 파싱
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

      // ✅ notes에서 추가 정보 추출 (인원, 보험, 포인트)
      let pointsUsed = order.points_used || 0;
      // bookings 테이블에는 두 세트의 컬럼이 있음: (num_adults, num_children, num_seniors) 및 (adults, children, infants)
      let actualAdults = order.adults || order.num_adults || 0;
      let actualChildren = order.children || order.num_children || 0;
      let actualInfants = order.infants || 0;
      let insuranceInfo = null;

      // notes가 있으면 정확한 정보 추출
      if (order.payment_notes) {
        try {
          const notesData = typeof order.payment_notes === 'string'
            ? JSON.parse(order.payment_notes)
            : order.payment_notes;

          // 포인트 사용액 (notes가 더 정확함)
          pointsUsed = notesData.pointsUsed || order.points_used || 0;

          // 인원 정보 (notes.items[0]에서 추출)
          if (notesData.items && notesData.items.length > 0) {
            const item = notesData.items[0];
            actualAdults = item.adults || order.num_adults || 0;
            actualChildren = item.children || order.num_children || 0;
            actualInfants = item.infants || order.num_infants || 0;
          }

          // 보험 정보
          if (notesData.insurance) {
            insuranceInfo = {
              name: notesData.insurance.name,
              price: parseInt(notesData.insuranceFee || notesData.insurance.price || 0)
            };
          }
        } catch (e) {
          console.warn(`Failed to parse payment_notes for order ${order.id}`);
        }
      }

      return {
        ...order,
        customer_info: customerInfo,
        points_used: pointsUsed,
        // 실제 인원 정보로 덮어쓰기
        num_adults: actualAdults,
        num_children: actualChildren,
        num_infants: actualInfants,
        // 보험 정보 추가
        insurance: insuranceInfo
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
