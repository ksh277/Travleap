/**
 * PMS (Property Management System) Integration API
 *
 * 외부 PMS 시스템과의 연동을 위한 기본 API 구조
 *
 * 기능:
 * 1. 외부 예약 동기화 (External Booking Sync)
 * 2. 재고 가용성 조회 (Availability Check)
 * 3. 예약 상태 업데이트 웹훅 (Booking Status Webhook)
 *
 * 라우트:
 * - POST /api/rentcar/pms/bookings - 외부 예약 생성/동기화
 * - GET /api/rentcar/pms/availability - 차량 가용성 조회
 * - POST /api/rentcar/pms/webhook - PMS로 상태 업데이트 전송
 *
 * 인증: API Key (X-API-Key 헤더)
 */

const { db } = require('../../utils/database');

// PMS API Key 검증 (환경변수 또는 DB에서 관리)
const PMS_API_KEYS = process.env.PMS_API_KEYS
  ? process.env.PMS_API_KEYS.split(',')
  : ['demo-pms-key-12345']; // 개발용 기본값

module.exports = async function handler(req, res) {
  try {
    // 1. API Key 인증
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];

    if (!apiKey || !PMS_API_KEYS.includes(apiKey)) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid API Key',
        message: 'Please provide a valid X-API-Key header'
      });
    }

    // 2. 라우팅
    const action = req.query.action || req.body?.action;

    if (req.method === 'POST' && action === 'sync_booking') {
      return await syncExternalBooking(req, res);
    } else if (req.method === 'GET' && action === 'availability') {
      return await checkAvailability(req, res);
    } else if (req.method === 'POST' && action === 'webhook') {
      return await sendWebhook(req, res);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid action',
        message: 'Supported actions: sync_booking, availability, webhook'
      });
    }

  } catch (error) {
    console.error('❌ [PMS Integration] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * 외부 예약 동기화
 *
 * PMS 시스템에서 예약을 받아 차량 차단(block)을 생성합니다.
 */
async function syncExternalBooking(req, res) {
  const {
    external_booking_id, // PMS의 예약 ID
    vehicle_id,
    starts_at,
    ends_at,
    customer_name,
    customer_email,
    customer_phone,
    notes,
    pms_source // 예: 'airbnb', 'booking_com', 'expedia'
  } = req.body;

  // 필수 필드 검증
  if (!external_booking_id || !vehicle_id || !starts_at || !ends_at) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['external_booking_id', 'vehicle_id', 'starts_at', 'ends_at']
    });
  }

  console.log(`🔗 [PMS] Syncing external booking: ${external_booking_id} (${pms_source || 'unknown'})`);

  // 차량 존재 확인
  const vehicles = await db.query(`
    SELECT id, vendor_id, display_name, license_plate
    FROM rentcar_vehicles
    WHERE id = ?
    LIMIT 1
  `, [vehicle_id]);

  if (vehicles.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Vehicle not found'
    });
  }

  const vehicle = vehicles[0];

  // 중복 예약 확인 (동일 external_booking_id)
  const existing = await db.query(`
    SELECT id
    FROM rentcar_vehicle_blocks
    WHERE notes LIKE ?
    LIMIT 1
  `, [`%EXTERNAL_BOOKING:${external_booking_id}%`]);

  if (existing.length > 0) {
    return res.status(409).json({
      success: false,
      error: 'Booking already exists',
      block_id: existing[0].id
    });
  }

  // 시간 충돌 확인
  const overlappingBookings = await db.query(`
    SELECT id, booking_number
    FROM rentcar_bookings
    WHERE vehicle_id = ?
    AND status IN ('hold', 'confirmed', 'in_progress')
    AND NOT (return_at_utc <= ? OR ? <= pickup_at_utc)
    LIMIT 1
  `, [vehicle_id, starts_at, ends_at]);

  if (overlappingBookings.length > 0) {
    return res.status(409).json({
      success: false,
      error: 'Vehicle has overlapping bookings',
      conflicting_booking: overlappingBookings[0].booking_number
    });
  }

  // 차량 차단 생성
  const blockNotes = `EXTERNAL_BOOKING:${external_booking_id}\nSource: ${pms_source || 'PMS'}\nCustomer: ${customer_name || 'N/A'}\nEmail: ${customer_email || ''}\nPhone: ${customer_phone || ''}\n${notes || ''}`;

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
    ) VALUES (?, ?, ?, 'external_booking', ?, 'PMS_SYSTEM', 1, NOW())
  `, [vehicle_id, starts_at, ends_at, blockNotes]);

  console.log(`✅ [PMS] External booking synced: Block ID ${result.insertId}`);

  return res.status(201).json({
    success: true,
    data: {
      block_id: result.insertId,
      vehicle_id,
      vehicle_name: vehicle.display_name,
      external_booking_id,
      starts_at,
      ends_at,
      status: 'blocked'
    },
    message: 'External booking synced successfully'
  });
}

/**
 * 차량 가용성 조회
 *
 * 특정 기간에 예약 가능한 차량 목록을 반환합니다.
 */
async function checkAvailability(req, res) {
  const { vendor_id, starts_at, ends_at, vehicle_type } = req.query;

  if (!starts_at || !ends_at) {
    return res.status(400).json({
      success: false,
      error: 'starts_at and ends_at are required'
    });
  }

  console.log(`🔍 [PMS] Checking availability: ${starts_at} ~ ${ends_at}`);

  let query = `
    SELECT
      v.id,
      v.vendor_id,
      v.display_name,
      v.model,
      v.license_plate,
      v.vehicle_type,
      v.price_per_day,
      v.capacity,
      vn.business_name as vendor_name
    FROM rentcar_vehicles v
    LEFT JOIN rentcar_vendors vn ON v.vendor_id = vn.id
    WHERE v.is_active = 1
  `;

  const params = [];

  if (vendor_id) {
    query += ' AND v.vendor_id = ?';
    params.push(vendor_id);
  }

  if (vehicle_type) {
    query += ' AND v.vehicle_type = ?';
    params.push(vehicle_type);
  }

  const vehicles = await db.query(query, params);

  // 각 차량의 가용성 확인
  const availableVehicles = [];

  for (const vehicle of vehicles) {
    // 예약 충돌 확인
    const overlappingBookings = await db.query(`
      SELECT id
      FROM rentcar_bookings
      WHERE vehicle_id = ?
      AND status IN ('hold', 'confirmed', 'in_progress')
      AND NOT (return_at_utc <= ? OR ? <= pickup_at_utc)
      LIMIT 1
    `, [vehicle.id, starts_at, ends_at]);

    // 차단 충돌 확인
    const overlappingBlocks = await db.query(`
      SELECT id
      FROM rentcar_vehicle_blocks
      WHERE vehicle_id = ?
      AND is_active = 1
      AND NOT (ends_at <= ? OR ? <= starts_at)
      LIMIT 1
    `, [vehicle.id, starts_at, ends_at]);

    if (overlappingBookings.length === 0 && overlappingBlocks.length === 0) {
      availableVehicles.push({
        ...vehicle,
        available: true
      });
    }
  }

  console.log(`✅ [PMS] Found ${availableVehicles.length} available vehicles`);

  return res.status(200).json({
    success: true,
    data: {
      period: { starts_at, ends_at },
      total_vehicles: vehicles.length,
      available_count: availableVehicles.length,
      vehicles: availableVehicles
    }
  });
}

/**
 * 웹훅 전송
 *
 * 예약 상태 변경 시 외부 PMS로 알림을 전송합니다.
 * (실제 구현 시 각 PMS의 웹훅 URL로 HTTP POST 요청)
 */
async function sendWebhook(req, res) {
  const { booking_id, event_type, webhook_url } = req.body;

  if (!booking_id || !event_type) {
    return res.status(400).json({
      success: false,
      error: 'booking_id and event_type are required'
    });
  }

  console.log(`📤 [PMS] Sending webhook: ${event_type} for booking ${booking_id}`);

  // 예약 정보 조회
  const bookings = await db.query(`
    SELECT
      id,
      booking_number,
      status,
      payment_status,
      customer_name,
      pickup_at_utc,
      return_at_utc
    FROM rentcar_bookings
    WHERE id = ?
    LIMIT 1
  `, [booking_id]);

  if (bookings.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Booking not found'
    });
  }

  const booking = bookings[0];

  // 웹훅 페이로드 구성
  const webhookPayload = {
    event_type,
    timestamp: new Date().toISOString(),
    booking: {
      id: booking.id,
      booking_number: booking.booking_number,
      status: booking.status,
      payment_status: booking.payment_status,
      customer_name: booking.customer_name,
      pickup_at: booking.pickup_at_utc,
      return_at: booking.return_at_utc
    }
  };

  // TODO: 실제 웹훅 전송
  // if (webhook_url) {
  //   await fetch(webhook_url, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(webhookPayload)
  //   });
  // }

  console.log(`✅ [PMS] Webhook prepared (actual sending not implemented)`);

  return res.status(200).json({
    success: true,
    data: {
      webhook_sent: false, // 실제 전송 시 true
      payload: webhookPayload
    },
    message: 'Webhook prepared successfully (TODO: implement actual HTTP request)'
  });
}
