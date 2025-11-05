// ============================================
// 관광지 티켓 주문 API
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
 * 주문 번호 생성 (ATR + YYYYMMDD + 랜덤6자리)
 */
function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ATR${dateStr}${random}`;
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
        attraction_id,
        visit_date,
        tickets // [{ type: 'adult', count: 2 }, { type: 'child', count: 1 }]
      } = req.body;

      // 필수 필드 검증
      if (!attraction_id || !visit_date || !tickets || tickets.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '필수 항목이 누락되었습니다.',
        });
      }

      // 관광지 정보 조회
      const [attractions] = await connection.execute(
        `SELECT
          id,
          name,
          admission_fee_adult,
          admission_fee_child,
          admission_fee_senior,
          admission_fee_infant
        FROM attractions
        WHERE id = ?`,
        [attraction_id]
      );

      if (attractions.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'ATTRACTION_NOT_FOUND',
          message: '관광지를 찾을 수 없습니다.',
        });
      }

      const attraction = attractions[0];

      // 티켓 가격 계산
      let totalAmount = 0;
      const ticketDetails = [];

      for (const ticket of tickets) {
        const { type, count } = ticket;

        if (count <= 0) continue;

        let unitPrice = 0;
        let typeName = '';

        switch (type) {
          case 'adult':
            unitPrice = attraction.admission_fee_adult || 0;
            typeName = '성인';
            break;
          case 'child':
            unitPrice = attraction.admission_fee_child || 0;
            typeName = '어린이';
            break;
          case 'senior':
            unitPrice = attraction.admission_fee_senior || 0;
            typeName = '경로';
            break;
          case 'infant':
            unitPrice = attraction.admission_fee_infant || 0;
            typeName = '유아';
            break;
          default:
            continue;
        }

        const subtotal = unitPrice * count;
        totalAmount += subtotal;

        ticketDetails.push({
          type,
          type_name: typeName,
          count,
          unit_price: unitPrice,
          subtotal
        });
      }

      if (totalAmount === 0) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_AMOUNT',
          message: '주문 금액이 0원입니다.',
        });
      }

      // 주문 번호 생성
      const orderNumber = generateOrderNumber();

      // 주문 생성
      const [result] = await connection.execute(
        `INSERT INTO attraction_orders (
          order_number,
          attraction_id,
          user_id,
          visit_date,
          tickets,
          total_amount,
          payment_status,
          order_status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW())`,
        [
          orderNumber,
          attraction_id,
          user.userId,
          visit_date,
          JSON.stringify(ticketDetails),
          totalAmount
        ]
      );

      return res.status(201).json({
        success: true,
        message: '주문이 생성되었습니다.',
        data: {
          order_id: result.insertId,
          order_number: orderNumber,
          attraction_name: attraction.name,
          visit_date,
          tickets: ticketDetails,
          total_amount: totalAmount
        }
      });
    }

    // ==========================================
    // GET - 주문 목록 조회 (사용자별)
    // ==========================================
    if (req.method === 'GET') {
      const [orders] = await connection.execute(
        `SELECT
          ao.id,
          ao.order_number,
          ao.attraction_id,
          a.name as attraction_name,
          a.address as attraction_address,
          ao.visit_date,
          ao.tickets,
          ao.total_amount,
          ao.payment_status,
          ao.order_status,
          ao.created_at
        FROM attraction_orders ao
        JOIN attractions a ON ao.attraction_id = a.id
        WHERE ao.user_id = ?
        ORDER BY ao.created_at DESC
        LIMIT 50`,
        [user.userId]
      );

      // tickets JSON 파싱
      const formattedOrders = orders.map(order => ({
        ...order,
        tickets: typeof order.tickets === 'string' ? JSON.parse(order.tickets) : order.tickets
      }));

      return res.status(200).json({
        success: true,
        data: formattedOrders
      });
    }

    // 지원하지 않는 메서드
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: '지원하지 않는 HTTP 메서드입니다.',
    });

  } catch (error) {
    console.error('[Attraction Orders API Error]', error);
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
