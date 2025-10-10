/**
 * PMS 웹훅 핸들러
 * PMS에서 재고/요금 변경 이벤트를 수신하고 처리
 */

import { PMSService } from './service';
import type { PMSVendor, PMSWebhookEvent } from '../../types/database';
import { db } from '../database';

// 웹훅 페이로드 인터페이스
export interface WebhookPayload {
  eventId: string;
  eventType: 'inventory_update' | 'rate_update' | 'booking_confirm' | 'booking_cancel' | 'room_update';
  hotelId: string;
  roomTypeId?: string;
  timestamp: string;
  data: any;
}

// 웹훅 검증 결과
interface WebhookValidation {
  valid: boolean;
  error?: string;
}

/**
 * 웹훅 서명 검증 (HMAC SHA256)
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Node.js 환경에서는 crypto 모듈 사용
  // 브라우저 환경에서는 Web Crypto API 사용
  if (typeof window === 'undefined') {
    // Node.js
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    return signature === expectedSignature;
  } else {
    // 브라우저 환경에서는 웹훅 검증을 서버에서 해야 함
    console.warn('Webhook validation should be done on server side');
    return false;
  }
}

/**
 * 중복 웹훅 이벤트 체크 (멱등성 보장)
 */
export async function isWebhookDuplicate(
  vendor: PMSVendor,
  eventId: string,
  idempotencyKey: string
): Promise<boolean> {
  try {
    // DB에서 동일한 이벤트 ID가 있는지 확인
    const existing = await db.findOne('pms_webhook_events', {
      vendor,
      event_id: eventId,
      idempotency_key: idempotencyKey,
    });

    return !!existing;
  } catch (error) {
    console.error('중복 체크 실패:', error);
    return false;
  }
}

/**
 * 웹훅 이벤트 저장
 */
export async function saveWebhookEvent(
  vendor: PMSVendor,
  payload: WebhookPayload,
  idempotencyKey: string
): Promise<number> {
  const event: Partial<PMSWebhookEvent> = {
    vendor,
    event_id: payload.eventId,
    event_type: payload.eventType,
    hotel_id: payload.hotelId,
    room_type_id: payload.roomTypeId,
    payload: payload.data,
    processed: false,
    idempotency_key: idempotencyKey,
    created_at: new Date().toISOString(),
  };

  const result = await db.insert('pms_webhook_events', event);
  return result.id;
}

/**
 * 웹훅 이벤트 처리
 */
export async function processWebhookEvent(
  vendor: PMSVendor,
  payload: WebhookPayload
): Promise<{ success: boolean; error?: string }> {
  const pmsService = new PMSService();

  try {
    switch (payload.eventType) {
      case 'inventory_update':
        await handleInventoryUpdate(pmsService, vendor, payload);
        break;

      case 'rate_update':
        await handleRateUpdate(pmsService, vendor, payload);
        break;

      case 'booking_confirm':
        await handleBookingConfirm(payload);
        break;

      case 'booking_cancel':
        await handleBookingCancel(payload);
        break;

      case 'room_update':
        await handleRoomUpdate(payload);
        break;

      default:
        console.warn('Unknown webhook event type:', payload.eventType);
    }

    return { success: true };
  } catch (error) {
    console.error('웹훅 이벤트 처리 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 재고 업데이트 처리
 */
async function handleInventoryUpdate(
  pmsService: PMSService,
  vendor: PMSVendor,
  payload: WebhookPayload
): Promise<void> {
  const { hotelId, roomTypeId, data } = payload;

  if (!roomTypeId) {
    throw new Error('roomTypeId is required for inventory_update');
  }

  console.log(`[Webhook] 재고 업데이트: ${hotelId} / ${roomTypeId}`);

  // 1. Redis 캐시 무효화
  await pmsService.handleWebhook(vendor, 'inventory_update', {
    hotelId,
    roomTypeId,
    date: data.date,
  });

  // 2. DB 재고 업데이트 (선택적)
  if (data.date && data.available !== undefined) {
    await db.upsert(
      'room_inventory',
      {
        room_type_id: roomTypeId,
        date: data.date,
      },
      {
        available: data.available,
        total: data.total || data.available,
        updated_at: new Date().toISOString(),
      }
    );
  }

  console.log(`[Webhook] 재고 업데이트 완료`);
}

/**
 * 요금 업데이트 처리
 */
async function handleRateUpdate(
  pmsService: PMSService,
  vendor: PMSVendor,
  payload: WebhookPayload
): Promise<void> {
  const { hotelId, roomTypeId, data } = payload;

  if (!roomTypeId) {
    throw new Error('roomTypeId is required for rate_update');
  }

  console.log(`[Webhook] 요금 업데이트: ${hotelId} / ${roomTypeId}`);

  // 1. Redis 캐시 무효화
  await pmsService.handleWebhook(vendor, 'rate_update', {
    hotelId,
    roomTypeId,
    date: data.date,
  });

  // 2. DB 요금 업데이트 (선택적)
  if (data.date && data.price !== undefined) {
    await db.upsert(
      'room_inventory',
      {
        room_type_id: roomTypeId,
        date: data.date,
      },
      {
        price_override: data.price,
        updated_at: new Date().toISOString(),
      }
    );
  }

  console.log(`[Webhook] 요금 업데이트 완료`);
}

/**
 * 예약 확정 처리
 */
async function handleBookingConfirm(payload: WebhookPayload): Promise<void> {
  const { data } = payload;

  console.log(`[Webhook] 예약 확정: ${data.bookingId}`);

  // PMS에서 예약이 확정되었음을 알림
  // 우리 시스템의 booking 테이블 업데이트
  if (data.bookingId) {
    const records = await db.select('pms_booking_records', { pms_booking_id: data.bookingId });
    if (records.length > 0) {
      await db.update(
        'pms_booking_records',
        records[0].id,
        {
          status: 'confirmed',
          pms_confirmation_number: data.confirmationNumber,
          updated_at: new Date().toISOString(),
        }
      );
    }
  }

  console.log(`[Webhook] 예약 확정 처리 완료`);
}

/**
 * 예약 취소 처리
 */
async function handleBookingCancel(payload: WebhookPayload): Promise<void> {
  const { data } = payload;

  console.log(`[Webhook] 예약 취소: ${data.bookingId}`);

  // PMS에서 예약이 취소되었음을 알림
  if (data.bookingId) {
    const records = await db.select('pms_booking_records', { pms_booking_id: data.bookingId });
    if (records.length > 0) {
      await db.update(
        'pms_booking_records',
        records[0].id,
        {
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        }
      );
    }

    // 재고 복구는 PMS가 자동으로 처리하므로 캐시만 무효화
    // (다음 조회 시 PMS에서 최신 재고를 가져옴)
  }

  console.log(`[Webhook] 예약 취소 처리 완료`);
}

/**
 * 객실 정보 업데이트 처리
 */
async function handleRoomUpdate(payload: WebhookPayload): Promise<void> {
  const { roomTypeId, data } = payload;

  console.log(`[Webhook] 객실 정보 업데이트: ${roomTypeId}`);

  // 객실 타입 정보 업데이트 (이름, 설명, 편의시설 등)
  if (roomTypeId && data) {
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.name) updates.room_type_name = data.name;
    if (data.description) updates.description = data.description;
    if (data.amenities) updates.amenities = JSON.stringify(data.amenities);
    if (data.maxOccupancy) updates.max_occupancy = data.maxOccupancy;

    const roomTypes = await db.select('room_types', { pms_room_type_id: roomTypeId });
    if (roomTypes.length > 0) {
      await db.update('room_types', roomTypes[0].id, updates);
    }
  }

  console.log(`[Webhook] 객실 정보 업데이트 완료`);
}

/**
 * 웹훅 엔드포인트 핸들러 (Express.js 예시)
 *
 * POST /api/webhooks/pms/:vendor
 */
export async function handleWebhookRequest(
  vendor: PMSVendor,
  payload: WebhookPayload,
  signature: string,
  secret: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. 서명 검증
    const payloadString = JSON.stringify(payload);
    const isValid = validateWebhookSignature(payloadString, signature, secret);

    if (!isValid) {
      console.error('웹훅 서명 검증 실패');
      return { success: false, error: 'Invalid signature' };
    }

    // 2. 중복 체크 (멱등성 보장)
    const idempotencyKey = `${vendor}:${payload.eventId}:${payload.timestamp}`;
    const isDuplicate = await isWebhookDuplicate(vendor, payload.eventId, idempotencyKey);

    if (isDuplicate) {
      console.log('중복 웹훅 이벤트 무시:', payload.eventId);
      return { success: true }; // 중복은 성공으로 처리
    }

    // 3. 웹훅 이벤트 저장
    const eventId = await saveWebhookEvent(vendor, payload, idempotencyKey);

    // 4. 웹훅 이벤트 처리
    const result = await processWebhookEvent(vendor, payload);

    // 5. 처리 결과 업데이트
    await db.update('pms_webhook_events', eventId, {
      processed: result.success,
      processed_at: new Date().toISOString(),
      error_message: result.error,
    });

    return result;
  } catch (error) {
    console.error('웹훅 요청 처리 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 사용 예시 (Express.js):
 *
 * app.post('/api/webhooks/pms/:vendor', async (req, res) => {
 *   const vendor = req.params.vendor as PMSVendor;
 *   const payload = req.body;
 *   const signature = req.headers['x-pms-signature'] as string;
 *   const secret = process.env.PMS_WEBHOOK_SECRET || '';
 *
 *   const result = await handleWebhookRequest(vendor, payload, signature, secret);
 *
 *   if (result.success) {
 *     res.status(200).json({ success: true });
 *   } else {
 *     res.status(400).json({ success: false, error: result.error });
 *   }
 * });
 */
