const { connect } = require('@planetscale/database');

/**
 * 음식 주문 생성 API
 * POST /api/food/order
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      restaurant_id,
      user_id,
      order_type,
      table_number,
      guest_count,
      pickup_time,
      delivery_address,
      items,
      subtotal_krw,
      delivery_fee_krw = 0,
      discount_krw = 0,
      special_requests = ''
    } = req.body;

    // 필수 필드 확인
    if (!restaurant_id || !order_type || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      });
    }

    // 총 금액 계산
    const total_krw = subtotal_krw + delivery_fee_krw - discount_krw;

    // 주문 번호 생성 (FOOD-YYYYMMDD-XXXX)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `FOOD-${today}-${randomNum}`;

    // 예상 준비 시간 계산 (기본 30분)
    const estimatedReadyTime = new Date(Date.now() + 30 * 60 * 1000);

    // 주문 생성
    const result = await connection.execute(
      `INSERT INTO food_orders (
        order_number,
        restaurant_id,
        user_id,
        order_type,
        table_number,
        guest_count,
        pickup_time,
        delivery_address,
        items,
        subtotal_krw,
        delivery_fee_krw,
        discount_krw,
        total_krw,
        special_requests,
        estimated_ready_time,
        status,
        payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
      [
        orderNumber,
        restaurant_id,
        user_id,
        order_type,
        table_number,
        guest_count,
        pickup_time,
        delivery_address,
        JSON.stringify(items),
        subtotal_krw,
        delivery_fee_krw,
        discount_krw,
        total_krw,
        special_requests,
        estimatedReadyTime
      ]
    );

    console.log(`✅ [Food Order] 주문 생성 완료: ${orderNumber}`);

    return res.status(201).json({
      success: true,
      message: '주문이 생성되었습니다.',
      data: {
        order_id: result.insertId,
        order_number: orderNumber,
        total_krw,
        estimated_ready_time: estimatedReadyTime,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('❌ [Food Order API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
