// ============================================
// 행사 티켓 주문 API
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

/**
 * 주문 번호 생성 (EVT + YYYYMMDD + 랜덤6자리)
 */
function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `EVT${dateStr}${random}`;
}

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
    // POST - 티켓 주문 생성
    // ==========================================
    if (req.method === 'POST') {
      const {
        event_id,
        ticket_type, // 'general' or 'vip'
        quantity
      } = req.body;

      // 필수 필드 검증
      if (!event_id || !ticket_type || !quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '필수 항목이 누락되었습니다.',
        });
      }

      // 트랜잭션 시작
      await connection.beginTransaction();

      try {
        // 행사 정보 조회 (FOR UPDATE로 락 획득)
        const [events] = await connection.execute(
          `SELECT
            id,
            title,
            general_price_krw,
            vip_price_krw,
            total_capacity,
            tickets_remaining,
            start_datetime
          FROM events
          WHERE id = ? AND is_active = 1
          FOR UPDATE`,
          [event_id]
        );

        if (events.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            error: 'EVENT_NOT_FOUND',
            message: '행사를 찾을 수 없습니다.',
          });
        }

        const event = events[0];

        // 티켓 재고 확인
        if (event.tickets_remaining < quantity) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            error: 'INSUFFICIENT_TICKETS',
            message: `티켓이 부족합니다. (남은 티켓: ${event.tickets_remaining}매)`,
          });
        }

        // 🔒 가격 검증 (서버에서 재계산)
        let unitPrice = 0;
        if (ticket_type === 'vip') {
          if (!event.vip_price_krw || event.vip_price_krw === 0) {
            await connection.rollback();
            return res.status(400).json({
              success: false,
              error: 'INVALID_TICKET_TYPE',
              message: 'VIP 티켓이 제공되지 않습니다.',
            });
          }
          unitPrice = event.vip_price_krw;
        } else if (ticket_type === 'general') {
          unitPrice = event.general_price_krw;
        } else {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            error: 'INVALID_TICKET_TYPE',
            message: '잘못된 티켓 종류입니다.',
          });
        }

        const totalAmount = unitPrice * quantity;

        console.log(`🔒 [Event Order] 서버 측 가격 재계산:
          - 티켓 종류: ${ticket_type}
          - 수량: ${quantity}매
          - 단가: ${unitPrice}원
          - 서버 계산 합계: ${totalAmount}원`);

        // 주문 번호 생성
        const orderNumber = generateOrderNumber();

        // 주문 생성
        const [result] = await connection.execute(
          `INSERT INTO event_orders (
            order_number,
            event_id,
            user_id,
            ticket_type,
            quantity,
            unit_price,
            total_amount,
            payment_status,
            order_status,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW())`,
          [
            orderNumber,
            event_id,
            user.userId,
            ticket_type,
            quantity,
            unitPrice,
            totalAmount
          ]
        );

        // 티켓 재고 감소
        await connection.execute(
          `UPDATE events
          SET tickets_remaining = tickets_remaining - ?
          WHERE id = ?`,
          [quantity, event_id]
        );

        // 트랜잭션 커밋
        await connection.commit();

        console.log(`✅ [Event Order] 주문 생성: ${orderNumber}, event_id=${event_id}, user_id=${user.userId}, total=${totalAmount}원`);

        return res.status(201).json({
          success: true,
          message: '주문이 생성되었습니다.',
          data: {
            order_id: result.insertId,
            order_number: orderNumber,
            event_title: event.title,
            ticket_type,
            quantity,
            unit_price: unitPrice,
            total_amount: totalAmount,
            event_datetime: event.start_datetime
          }
        });

      } catch (innerError) {
        await connection.rollback();
        throw innerError;
      }
    }

    // ==========================================
    // GET - 주문 목록 조회 (사용자별)
    // ==========================================
    if (req.method === 'GET') {
      const [orders] = await connection.execute(
        `SELECT
          eo.id,
          eo.order_number,
          eo.event_id,
          e.title as event_title,
          e.venue_name,
          e.venue_address,
          e.start_datetime,
          eo.ticket_type,
          eo.quantity,
          eo.unit_price,
          eo.total_amount,
          eo.payment_status,
          eo.order_status,
          eo.created_at
        FROM event_orders eo
        JOIN events e ON eo.event_id = e.id
        WHERE eo.user_id = ?
        ORDER BY eo.created_at DESC
        LIMIT 50`,
        [user.userId]
      );

      return res.status(200).json({
        success: true,
        data: orders
      });
    }

    // 지원하지 않는 메서드
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: '지원하지 않는 HTTP 메서드입니다.',
    });

  } catch (error) {
    console.error('[Event Orders API Error]', error);
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
