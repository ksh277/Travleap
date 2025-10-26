/**
 * 차량 차단 관리 API (Vehicle Block Management)
 *
 * 기능:
 * - 차량을 일정 기간 예약 불가능하게 차단 (유지보수, 수리, 검사 등)
 * - 차단 기간 중 기존 예약과 충돌 방지
 * - 차단 해제 (완료 또는 취소)
 *
 * 라우트:
 * - POST /api/rentcar/vehicles/:vehicle_id/blocks - 차단 생성
 * - GET /api/rentcar/vehicles/:vehicle_id/blocks - 차단 목록 조회
 * - PATCH /api/rentcar/vehicles/:vehicle_id/blocks/:block_id - 차단 해제
 *
 * 권한: 벤더, 관리자
 */

const { db } = require('../../utils/database');
const { JWTUtils } = require('../../utils/jwt');

module.exports = async function handler(req, res) {
  try {
    // 1. JWT 인증 확인
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

    // 2. 권한 확인
    const allowedRoles = ['admin', 'vendor'];
    if (!allowedRoles.includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Admin or vendor role required'
      });
    }

    // 3. 차량 ID 추출
    const vehicleId = req.query.vehicle_id || req.params.vehicle_id;

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle ID is required'
      });
    }

    // 4. 차량 정보 및 벤더 확인
    const vehicles = await db.query(`
      SELECT id, vendor_id, model, license_plate
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

    // 5. 메서드별 처리
    if (req.method === 'POST') {
      // ========== 차단 생성 ==========
      return await createBlock(req, res, vehicleId, vehicle, decoded);
    } else if (req.method === 'GET') {
      // ========== 차단 목록 조회 ==========
      return await listBlocks(req, res, vehicleId);
    } else if (req.method === 'PATCH') {
      // ========== 차단 해제 ==========
      return await updateBlock(req, res, vehicleId, vehicle, decoded);
    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('❌ [Vehicle Blocks] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 차단 생성
 */
async function createBlock(req, res, vehicleId, vehicle, decoded) {
  const {
    starts_at,
    ends_at,
    block_reason,
    notes
  } = req.body;

  // 필수 필드 검증
  if (!starts_at || !ends_at) {
    return res.status(400).json({
      success: false,
      error: 'starts_at and ends_at are required'
    });
  }

  if (!block_reason) {
    return res.status(400).json({
      success: false,
      error: 'block_reason is required (e.g., maintenance, repair, inspection)'
    });
  }

  // 1. 시간 형식 검증
  const startTime = new Date(starts_at);
  const endTime = new Date(ends_at);

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid datetime format',
      message: 'Please provide valid datetime format (YYYY-MM-DD HH:mm:ss)'
    });
  }

  // 2. 종료 시간 > 시작 시간 검증
  if (endTime <= startTime) {
    return res.status(400).json({
      success: false,
      error: 'Invalid time range',
      error_code: 'INVALID_TIME_RANGE',
      message: 'Block end time must be after start time'
    });
  }

  // 3. 과거 시간 차단 방지 (시작 시간이 현재보다 과거면 에러)
  const now = new Date();
  if (startTime < now) {
    return res.status(400).json({
      success: false,
      error: 'Cannot create block in the past',
      error_code: 'PAST_BLOCK_NOT_ALLOWED',
      message: 'Block start time must be in the future',
      provided_start: starts_at,
      current_time: now.toISOString()
    });
  }

  // 4. 차단 기간 최대 길이 제한 (1년 = 365일)
  const blockDurationDays = (endTime - startTime) / (1000 * 60 * 60 * 24);
  const MAX_BLOCK_DAYS = 365;

  if (blockDurationDays > MAX_BLOCK_DAYS) {
    return res.status(400).json({
      success: false,
      error: 'Block duration too long',
      error_code: 'BLOCK_DURATION_EXCEEDED',
      message: `Block duration cannot exceed ${MAX_BLOCK_DAYS} days`,
      provided_duration_days: Math.floor(blockDurationDays),
      max_duration_days: MAX_BLOCK_DAYS
    });
  }

  // 5. block_reason enum 검증
  const validBlockReasons = ['external_booking', 'maintenance', 'repair', 'inspection'];
  if (!validBlockReasons.includes(block_reason)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid block_reason',
      error_code: 'INVALID_BLOCK_REASON',
      message: 'block_reason must be one of: ' + validBlockReasons.join(', '),
      provided: block_reason,
      valid_reasons: validBlockReasons
    });
  }

  console.log(`🚫 [Vehicle Block] Creating block for vehicle ${vehicle.license_plate}`);
  console.log(`   Period: ${starts_at} ~ ${ends_at}`);
  console.log(`   Reason: ${block_reason}`);

  // 6. 중복 차단 방지 (같은 기간에 이미 활성 차단이 있으면 에러)
  const overlappingBlocks = await db.query(`
    SELECT
      id,
      starts_at,
      ends_at,
      block_reason,
      created_by
    FROM rentcar_vehicle_blocks
    WHERE vehicle_id = ?
      AND is_active = 1
      AND NOT (ends_at <= ? OR ? <= starts_at)
    LIMIT 1
  `, [vehicleId, starts_at, ends_at]);

  if (overlappingBlocks.length > 0) {
    const existingBlock = overlappingBlocks[0];
    return res.status(409).json({
      success: false,
      error: 'Vehicle already has an active block during this period',
      error_code: 'DUPLICATE_BLOCK',
      conflicting_block: {
        block_id: existingBlock.id,
        starts_at: existingBlock.starts_at,
        ends_at: existingBlock.ends_at,
        block_reason: existingBlock.block_reason,
        created_by: existingBlock.created_by
      },
      message: 'Resolve or modify the existing block before creating a new one'
    });
  }

  // 7. 기존 예약과 충돌 확인
  const overlappingBookings = await db.query(`
    SELECT
      id,
      booking_number,
      pickup_at_utc,
      return_at_utc,
      status
    FROM rentcar_bookings
    WHERE vehicle_id = ?
      AND status IN ('pending', 'confirmed', 'picked_up', 'returned')
      AND NOT (return_at_utc <= ? OR ? <= pickup_at_utc)
    LIMIT 1
  `, [vehicleId, starts_at, ends_at]);

  if (overlappingBookings.length > 0) {
    const booking = overlappingBookings[0];
    return res.status(409).json({
      success: false,
      error: 'Vehicle has overlapping bookings during this period',
      error_code: 'BOOKING_CONFLICT',
      conflicting_booking: {
        booking_number: booking.booking_number,
        pickup_at: booking.pickup_at_utc,
        return_at: booking.return_at_utc,
        status: booking.status
      },
      message: 'Cancel or reschedule the booking before creating a block'
    });
  }

  // 차단 생성
  const result = await db.execute(`
    INSERT INTO rentcar_vehicle_blocks (
      vehicle_id,
      starts_at,
      ends_at,
      block_reason,
      notes,
      created_by,
      is_active,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
  `, [
    vehicleId,
    starts_at,
    ends_at,
    block_reason,
    notes || '',
    decoded.email
  ]);

  console.log(`✅ [Vehicle Block] Created: Block ID ${result.insertId}`);

  return res.status(201).json({
    success: true,
    data: {
      block_id: result.insertId,
      vehicle_id: vehicleId,
      vehicle: {
        model: vehicle.model,
        license_plate: vehicle.license_plate
      },
      starts_at,
      ends_at,
      block_reason,
      notes: notes || '',
      is_active: true,
      created_by: decoded.email
    },
    message: 'Vehicle block created successfully'
  });
}

/**
 * 차단 목록 조회
 */
async function listBlocks(req, res, vehicleId) {
  const { is_active } = req.query;

  let query = `
    SELECT
      id,
      vehicle_id,
      starts_at,
      ends_at,
      block_reason,
      notes,
      is_active,
      created_by,
      created_at,
      resolved_at,
      resolved_by
    FROM rentcar_vehicle_blocks
    WHERE vehicle_id = ?
  `;

  const params = [vehicleId];

  // 필터링
  if (is_active !== undefined) {
    query += ' AND is_active = ?';
    params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
  }

  query += ' ORDER BY starts_at DESC';

  const blocks = await db.query(query, params);

  return res.status(200).json({
    success: true,
    data: {
      vehicle_id: vehicleId,
      blocks,
      count: blocks.length
    }
  });
}

/**
 * 차단 해제
 */
async function updateBlock(req, res, vehicleId, vehicle, decoded) {
  const blockId = req.query.block_id || req.params.block_id;

  if (!blockId) {
    return res.status(400).json({
      success: false,
      error: 'Block ID is required'
    });
  }

  const { is_active } = req.body;

  if (is_active === undefined) {
    return res.status(400).json({
      success: false,
      error: 'is_active field is required (true or false)'
    });
  }

  // 차단 정보 확인
  const blocks = await db.query(`
    SELECT id, vehicle_id, is_active, block_reason
    FROM rentcar_vehicle_blocks
    WHERE id = ? AND vehicle_id = ?
    LIMIT 1
  `, [blockId, vehicleId]);

  if (blocks.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Block not found'
    });
  }

  const block = blocks[0];

  console.log(`🔓 [Vehicle Block] Updating block ${blockId}: is_active = ${is_active}`);

  // 차단 상태 업데이트
  await db.execute(`
    UPDATE rentcar_vehicle_blocks
    SET
      is_active = ?,
      resolved_at = IF(? = 0, NOW(), NULL),
      resolved_by = IF(? = 0, ?, NULL)
    WHERE id = ?
  `, [
    is_active ? 1 : 0,
    is_active ? 1 : 0,
    is_active ? 1 : 0,
    decoded.email,
    blockId
  ]);

  console.log(`✅ [Vehicle Block] Updated: Block ${blockId}`);

  return res.status(200).json({
    success: true,
    data: {
      block_id: blockId,
      vehicle_id: vehicleId,
      is_active: is_active ? true : false,
      resolved_by: is_active ? null : decoded.email,
      resolved_at: is_active ? null : new Date().toISOString()
    },
    message: `Vehicle block ${is_active ? 'reactivated' : 'resolved'} successfully`
  });
}
