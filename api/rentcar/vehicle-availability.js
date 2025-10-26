/**
 * 차량 비활성화/활성화 API
 *
 * 기능:
 * - 차량을 비활성화하여 예약 불가 상태로 만들기
 * - 외부 판매, 장기 정비 등의 사유로 사용
 * - 차량 활성화로 다시 예약 가능하게 만들기
 *
 * 라우트: PATCH /api/rentcar/vehicles/:id/availability
 * 권한: 벤더, 관리자
 */

const { db } = require('../../utils/database');
const { JWTUtils } = require('../../utils/jwt');

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

    // 3. 권한 확인
    const allowedRoles = ['admin', 'vendor'];
    if (!allowedRoles.includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Admin or vendor role required'
      });
    }

    // 4. 차량 ID 추출
    const vehicleId = req.query.id || req.params.id;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle ID is required'
      });
    }

    // 5. 요청 데이터 파싱
    const { is_available, reason } = req.body;

    if (is_available === undefined) {
      return res.status(400).json({
        success: false,
        error: 'is_available field is required (true or false)'
      });
    }

    // 6. 차량 정보 확인
    const vehicles = await db.query(`
      SELECT id, vendor_id, display_name, is_available
      FROM rentcar_vehicles
      WHERE id = ?
      LIMIT 1
    `, [vehicleId]);

    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    const vehicle = vehicles[0];

    // 벤더 권한 확인
    if (decoded.role === 'vendor' && decoded.vendorId !== vehicle.vendor_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - This vehicle belongs to another vendor'
      });
    }

    // 7. 활성화 상태 업데이트
    const isAvailable = is_available === true || is_available === 'true' || is_available === 1;

    console.log(`${isAvailable ? '✅' : '🚫'} [Vehicle Availability] ${vehicle.display_name}: ${vehicle.is_available ? 'active' : 'inactive'} → ${isAvailable ? 'active' : 'inactive'}`);

    await db.execute(`
      UPDATE rentcar_vehicles
      SET
        is_available = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [isAvailable ? 1 : 0, vehicleId]);

    // 8. 변경 로그 기록 (선택적)
    if (reason) {
      try {
        await db.execute(`
          INSERT INTO rentcar_vehicle_availability_log (
            vehicle_id,
            changed_by,
            previous_status,
            new_status,
            reason,
            created_at
          ) VALUES (?, ?, ?, ?, ?, NOW())
        `, [
          vehicleId,
          decoded.email,
          vehicle.is_available ? 1 : 0,
          isAvailable ? 1 : 0,
          reason
        ]);
      } catch (logError) {
        console.warn('⚠️  Availability log failed (non-critical):', logError.message);
      }
    }

    console.log(`✅ [Vehicle Availability] Updated successfully`);

    // 9. 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        vehicle_id: vehicleId,
        vehicle_name: vehicle.display_name,
        is_available: isAvailable,
        previous_status: vehicle.is_available,
        changed_by: decoded.email,
        reason: reason || null
      },
      message: `Vehicle ${isAvailable ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('❌ [Vehicle Availability] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
