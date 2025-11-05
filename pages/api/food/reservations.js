// ============================================
// 음식점 예약 API
// ============================================

import { withSecureCors } from '../../../utils/cors-middleware';
import { withAuth } from '../../../utils/auth-middleware';
import mysql from 'mysql2/promise';

const connectionConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
};

async function handler(req, res) {
  const { user } = req;

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: '로그인이 필요합니다.',
    });
  }

  let connection;

  try {
    connection = await mysql.createConnection(connectionConfig);

    // ==========================================
    // POST - 예약 생성
    // ==========================================
    if (req.method === 'POST') {
      const {
        restaurant_id,
        reservation_date,
        reservation_time,
        party_size,
        special_requests
      } = req.body;

      // 필수 필드 검증
      if (!restaurant_id || !reservation_date || !reservation_time || !party_size) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '필수 항목이 누락되었습니다.',
        });
      }

      // 인원 검증
      if (party_size < 1 || party_size > 20) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PARTY_SIZE',
          message: '인원은 1명 이상 20명 이하로 선택해주세요.',
        });
      }

      // 날짜 검증 (과거 날짜 방지)
      const reservationDateTime = new Date(`${reservation_date}T${reservation_time}`);
      const now = new Date();

      if (reservationDateTime < now) {
        return res.status(400).json({
          success: false,
          error: 'PAST_DATE',
          message: '과거 날짜/시간으로는 예약할 수 없습니다.',
        });
      }

      // 식당 정보 조회
      const [restaurants] = await connection.execute(
        `SELECT id, name, accepts_reservations FROM food_restaurants WHERE id = ?`,
        [restaurant_id]
      );

      if (restaurants.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'RESTAURANT_NOT_FOUND',
          message: '식당을 찾을 수 없습니다.',
        });
      }

      const restaurant = restaurants[0];

      if (!restaurant.accepts_reservations) {
        return res.status(400).json({
          success: false,
          error: 'RESERVATION_NOT_ALLOWED',
          message: '이 식당은 예약을 받지 않습니다.',
        });
      }

      // reservation_number 생성 (FOOD + YYYYMMDD + 랜덤6자리)
      const dateStr = reservation_date.replace(/-/g, '');
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      const reservation_number = `FOOD${dateStr}${randomStr}`;

      // 예약 생성
      const [result] = await connection.execute(
        `INSERT INTO food_reservations (
          reservation_number,
          restaurant_id,
          user_id,
          reservation_date,
          reservation_time,
          party_size,
          special_requests,
          status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', NOW())`,
        [
          reservation_number,
          restaurant_id,
          user.userId,
          reservation_date,
          reservation_time,
          party_size,
          special_requests || null
        ]
      );

      return res.status(201).json({
        success: true,
        message: '예약이 완료되었습니다.',
        data: {
          reservation_id: result.insertId,
          reservation_number,
          restaurant_name: restaurant.name,
          reservation_date,
          reservation_time,
          party_size
        }
      });
    }

    // ==========================================
    // GET - 예약 목록 조회 (사용자별)
    // ==========================================
    if (req.method === 'GET') {
      const [reservations] = await connection.execute(
        `SELECT
          fr.id,
          fr.reservation_number,
          fr.restaurant_id,
          rest.name as restaurant_name,
          rest.address as restaurant_address,
          rest.phone as restaurant_phone,
          fr.reservation_date,
          fr.reservation_time,
          fr.party_size,
          fr.special_requests,
          fr.status,
          fr.created_at,
          fr.canceled_at
        FROM food_reservations fr
        JOIN food_restaurants rest ON fr.restaurant_id = rest.id
        WHERE fr.user_id = ?
        ORDER BY fr.reservation_date DESC, fr.reservation_time DESC
        LIMIT 50`,
        [user.userId]
      );

      return res.status(200).json({
        success: true,
        data: reservations
      });
    }

    // ==========================================
    // DELETE - 예약 취소
    // ==========================================
    if (req.method === 'DELETE') {
      const { reservation_id } = req.body;

      if (!reservation_id) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_ID',
          message: '예약 ID가 필요합니다.',
        });
      }

      // 예약 소유권 확인
      const [existing] = await connection.execute(
        `SELECT id, status, reservation_date, reservation_time
        FROM food_reservations
        WHERE id = ? AND user_id = ?`,
        [reservation_id, user.userId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: '예약을 찾을 수 없습니다.',
        });
      }

      const reservation = existing[0];

      if (reservation.status === 'canceled') {
        return res.status(400).json({
          success: false,
          error: 'ALREADY_CANCELED',
          message: '이미 취소된 예약입니다.',
        });
      }

      // 예약 시간 1시간 전까지만 취소 가능
      const reservationDateTime = new Date(`${reservation.reservation_date}T${reservation.reservation_time}`);
      const now = new Date();
      const timeDiff = reservationDateTime - now;
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff < 1) {
        return res.status(400).json({
          success: false,
          error: 'TOO_LATE',
          message: '예약 시간 1시간 전까지만 취소 가능합니다.',
        });
      }

      // 예약 취소 처리
      await connection.execute(
        `UPDATE food_reservations
        SET status = 'canceled', canceled_at = NOW()
        WHERE id = ? AND user_id = ?`,
        [reservation_id, user.userId]
      );

      return res.status(200).json({
        success: true,
        message: '예약이 취소되었습니다.',
      });
    }

    // 지원하지 않는 메서드
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: '지원하지 않는 HTTP 메서드입니다.',
    });

  } catch (error) {
    console.error('[Food Reservations API Error]', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '서버 오류가 발생했습니다.',
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export default withSecureCors(withAuth(handler));
