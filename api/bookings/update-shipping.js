/**
 * 배송 정보 업데이트 API
 *
 * PUT /api/bookings/update-shipping
 *
 * 기능:
 * - 벤더가 주문의 배송 정보를 업데이트
 * - 운송장 번호, 택배사, 배송 상태 수정
 *
 * 권한: vendor (본인 상품 주문만 수정 가능)
 */

const { connect } = require('@planetscale/database');
const { JWTUtils } = require('../../utils/jwt');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // PUT 메서드만 허용
    if (req.method !== 'PUT') {
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

    const {
      booking_id,
      tracking_number,
      courier_company,
      delivery_status // 'pending', 'shipped', 'delivered', 'cancelled'
    } = req.body;

    // 필수 입력 검증
    if (!booking_id) {
      return res.status(400).json({
        success: false,
        error: '주문 ID가 필요합니다.'
      });
    }

    console.log(`📦 [Update Shipping] Booking ${booking_id} - ${delivery_status || 'status update'}`);

    const db = connect({ url: process.env.DATABASE_URL });

    // 1. 주문 조회 및 권한 확인 (본인 상품 주문인지)
    const bookingResult = await db.execute(
      `SELECT b.id, b.listing_id, l.user_id as vendor_id, b.delivery_status
       FROM bookings b
       INNER JOIN listings l ON b.listing_id = l.id
       WHERE b.id = ?`,
      [booking_id]
    );

    if (!bookingResult.rows || bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '주문을 찾을 수 없습니다.'
      });
    }

    const booking = bookingResult.rows[0];

    // 본인 상품 주문인지 확인
    if (booking.vendor_id !== decoded.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - 본인 상품 주문만 수정할 수 있습니다.'
      });
    }

    // 2. 배송 정보 업데이트
    const updates = [];
    const params = [];

    if (tracking_number !== undefined) {
      updates.push('tracking_number = ?');
      params.push(tracking_number);
    }

    if (courier_company !== undefined) {
      updates.push('courier_company = ?');
      params.push(courier_company);
    }

    if (delivery_status !== undefined) {
      // 배송 상태 검증
      const validStatuses = ['pending', 'shipped', 'in_transit', 'delivered', 'cancelled', 'returned'];
      if (!validStatuses.includes(delivery_status)) {
        return res.status(400).json({
          success: false,
          error: '유효하지 않은 배송 상태입니다.',
          validStatuses
        });
      }

      updates.push('delivery_status = ?');
      params.push(delivery_status);

      // 발송 상태로 변경 시 shipped_at 자동 설정
      if (delivery_status === 'shipped' && booking.delivery_status !== 'shipped') {
        updates.push('shipped_at = NOW()');
      }

      // 배송 완료 시 delivered_at 자동 설정
      if (delivery_status === 'delivered' && booking.delivery_status !== 'delivered') {
        updates.push('delivered_at = NOW()');
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: '업데이트할 정보가 없습니다.'
      });
    }

    // updated_at도 업데이트
    updates.push('updated_at = NOW()');
    params.push(booking_id);

    const updateQuery = `
      UPDATE bookings
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    await db.execute(updateQuery, params);

    console.log(`✅ [Update Shipping] Booking ${booking_id} updated successfully`);

    // 3. 업데이트된 배송 정보 조회
    const updatedResult = await db.execute(
      `SELECT
        id,
        booking_number,
        delivery_status,
        tracking_number,
        courier_company,
        shipped_at,
        delivered_at,
        updated_at
       FROM bookings
       WHERE id = ?`,
      [booking_id]
    );

    return res.status(200).json({
      success: true,
      data: updatedResult.rows[0],
      message: '배송 정보가 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('❌ [Update Shipping] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
