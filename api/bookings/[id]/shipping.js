/**
 * 배송 정보 업데이트 API
 *
 * 기능:
 * - 송장번호 입력
 * - 택배사 정보 입력
 * - 배송 상태 변경
 * - 발송/배송완료 시각 기록
 *
 * 권한: 관리자, 벤더만 접근 가능
 * 라우트: PATCH /api/bookings/:id/shipping
 */

const { db } = require('../../../utils/database');
const { JWTUtils } = require('../../../utils/jwt');
const { maskForLog } = require('../../../utils/pii-masking');

module.exports = async function handler(req, res) {
  try {
    // 1. PATCH 메서드만 허용
    if (req.method !== 'PATCH') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // 2. JWT 인증 확인
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

    // 3. 권한 확인 (admin 또는 vendor만 허용)
    const allowedRoles = ['admin', 'vendor'];
    if (!allowedRoles.includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Admin or vendor role required',
        userRole: decoded.role
      });
    }

    console.log(`🔐 [Shipping Update] User: ${maskForLog(decoded.email)}, Role: ${decoded.role}`);

    // 4. 예약 ID 추출
    const bookingId = req.query.id || req.params.id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID is required'
      });
    }

    // 4.5. 벤더인 경우 본인 상품인지 확인 (보안 강화)
    if (decoded.role === 'vendor') {
      console.log(`🔍 [Shipping Update] Checking vendor ownership for booking ${bookingId}`);

      const ownerCheck = await db.query(`
        SELECT l.user_id, l.title, b.booking_number
        FROM bookings b
        INNER JOIN listings l ON b.listing_id = l.id
        WHERE b.id = ?
        LIMIT 1
      `, [bookingId]);

      if (!ownerCheck || ownerCheck.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      // 다른 벤더의 상품이면 차단
      if (ownerCheck[0].user_id !== decoded.userId) {
        console.log(`⛔ [Shipping Update] Vendor ${decoded.userId} attempted to access vendor ${ownerCheck[0].user_id}'s product (booking: ${ownerCheck[0].booking_number})`);
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: '본인의 상품만 관리할 수 있습니다.',
          hint: '다른 벤더의 주문에는 접근할 수 없습니다.'
        });
      }

      console.log(`✅ [Shipping Update] Vendor ${decoded.userId} owns product: ${ownerCheck[0].title}`);
    }

    // 5. 요청 데이터 파싱
    const {
      tracking_number,
      courier_company,
      delivery_status,
      shipped_at,
      delivered_at
    } = req.body;

    console.log(`📦 [Shipping Update] Booking ID: ${bookingId}`, req.body);

    // 6. 예약 정보 조회 (FOR UPDATE로 동시성 제어)
    // 🔒 동시에 여러 요청이 배송 상태를 변경하는 것을 방지
    const bookings = await db.query(`
      SELECT id, booking_number, status, payment_status, delivery_status
      FROM bookings
      WHERE id = ?
      FOR UPDATE
    `, [bookingId]);

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // 5. 업데이트할 필드 구성
    const updates = [];
    const values = [];

    if (tracking_number !== undefined) {
      updates.push('tracking_number = ?');
      values.push(tracking_number);
    }

    if (courier_company !== undefined) {
      updates.push('courier_company = ?');
      values.push(courier_company);
    }

    if (delivery_status !== undefined) {
      // 배송 상태 검증
      const validStatuses = ['PENDING', 'READY', 'SHIPPING', 'DELIVERED', 'CANCELED'];
      if (!validStatuses.includes(delivery_status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid delivery_status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      // 🔒 상태 전이 규칙 검증 (실전 배포 필수)
      const currentStatus = booking.delivery_status;
      const allowedTransitions = {
        'PENDING': ['READY', 'CANCELED'],
        'READY': ['SHIPPING', 'CANCELED'],
        'SHIPPING': ['DELIVERED'],
        'DELIVERED': [], // 배송 완료 후 상태 변경 불가
        'CANCELED': [] // 취소 후 상태 변경 불가
      };

      const allowed = allowedTransitions[currentStatus] || [];

      if (currentStatus && delivery_status !== currentStatus && !allowed.includes(delivery_status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid state transition: ${currentStatus} → ${delivery_status}`,
          currentStatus,
          requestedStatus: delivery_status,
          allowedTransitions: allowed.length > 0 ? allowed : ['No transitions allowed']
        });
      }

      updates.push('delivery_status = ?');
      values.push(delivery_status);

      // 배송 상태에 따라 자동으로 시각 기록
      if (delivery_status === 'SHIPPING' && !shipped_at) {
        updates.push('shipped_at = NOW()');
      }

      if (delivery_status === 'DELIVERED' && !delivered_at) {
        updates.push('delivered_at = NOW()');
      }
    }

    if (shipped_at !== undefined) {
      updates.push('shipped_at = ?');
      values.push(shipped_at);
    }

    if (delivered_at !== undefined) {
      updates.push('delivered_at = ?');
      values.push(delivered_at);
    }

    // 6. 업데이트할 내용이 없으면 에러
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // 7. 항상 updated_at 추가
    updates.push('updated_at = NOW()');
    values.push(bookingId);

    // 8. DB 업데이트 실행
    await db.execute(`
      UPDATE bookings
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    console.log(`✅ [Shipping Update] Updated booking ${bookingId}`);

    // 9. 업데이트된 정보 조회
    const updatedBooking = await db.query(`
      SELECT
        id,
        booking_number,
        shipping_name,
        shipping_phone,
        shipping_address,
        shipping_address_detail,
        shipping_zipcode,
        shipping_memo,
        tracking_number,
        courier_company,
        delivery_status,
        shipped_at,
        delivered_at,
        status,
        payment_status
      FROM bookings
      WHERE id = ?
      LIMIT 1
    `, [bookingId]);

    // 10. 성공 응답
    return res.status(200).json({
      success: true,
      data: updatedBooking[0],
      message: 'Shipping information updated successfully'
    });

  } catch (error) {
    console.error('❌ [Shipping Update] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
