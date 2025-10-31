/**
 * 사용자용 - 음식 주문 API
 * POST /api/food/orders - 주문 생성 (매장/포장/배달)
 * GET /api/food/orders?user_id=123 - 사용자 주문 내역
 * GET /api/food/orders?id=456 - 특정 주문 상세 조회
 */

const { connect } = require('@planetscale/database');

// 주문 번호 생성 (FOOD + 타임스탬프 + 랜덤)
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `FOOD${timestamp}${random}`;
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // POST: 주문 생성
  if (req.method === 'POST') {
    try {
      const {
        user_id,
        restaurant_id,
        order_type, // 'dine_in', 'takeout', 'delivery'
        table_number,
        guest_count,
        pickup_time,
        delivery_address,
        items, // [{menu_id, name, quantity, price, options}]
        special_requests,
        subtotal_krw,
        delivery_fee_krw = 0,
        discount_krw = 0
      } = req.body;

      // 필수 필드 검증
      if (!restaurant_id || !order_type || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: '필수 정보를 모두 입력해주세요.'
        });
      }

      // 주문 타입별 필수 필드 검증
      if (order_type === 'dine_in' && !table_number) {
        return res.status(400).json({
          success: false,
          error: '매장 식사는 테이블 번호가 필요합니다.'
        });
      }

      if (order_type === 'delivery' && !delivery_address) {
        return res.status(400).json({
          success: false,
          error: '배달은 주소가 필요합니다.'
        });
      }

      // 식당 정보 조회
      const restaurantQuery = `
        SELECT
          r.id,
          r.name,
          r.accepts_reservations,
          r.accepts_takeout,
          r.accepts_delivery
        FROM restaurants r
        WHERE r.id = ? AND r.is_active = 1
      `;

      const restaurantResult = await connection.execute(restaurantQuery, [restaurant_id]);

      if (!restaurantResult.rows || restaurantResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '식당을 찾을 수 없습니다.'
        });
      }

      const restaurant = restaurantResult.rows[0];

      // 주문 타입별 가능 여부 체크
      if (order_type === 'takeout' && !restaurant.accepts_takeout) {
        return res.status(400).json({
          success: false,
          error: '이 식당은 포장 주문을 받지 않습니다.'
        });
      }

      if (order_type === 'delivery' && !restaurant.accepts_delivery) {
        return res.status(400).json({
          success: false,
          error: '이 식당은 배달을 하지 않습니다.'
        });
      }

      // 총 금액 계산
      const total_krw = subtotal_krw + delivery_fee_krw - discount_krw;

      // 주문 번호 생성
      const orderNumber = generateOrderNumber();

      // 예상 준비 시간 (현재 시간 + 30분)
      const estimatedReadyTime = new Date();
      estimatedReadyTime.setMinutes(estimatedReadyTime.getMinutes() + 30);

      // 주문 생성
      const insertQuery = `
        INSERT INTO food_orders (
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
          status,
          payment_status,
          estimated_ready_time,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, NOW())
      `;

      const insertResult = await connection.execute(insertQuery, [
        orderNumber,
        restaurant_id,
        user_id || null,
        order_type,
        table_number || null,
        guest_count || null,
        pickup_time || null,
        delivery_address || null,
        JSON.stringify(items),
        subtotal_krw,
        delivery_fee_krw,
        discount_krw,
        total_krw,
        special_requests || null,
        estimatedReadyTime.toISOString().slice(0, 19).replace('T', ' ')
      ]);

      console.log('✅ [Food Order] 주문 생성:', {
        order_number: orderNumber,
        restaurant: restaurant.name,
        order_type,
        items_count: items.length,
        total: total_krw
      });

      return res.status(201).json({
        success: true,
        order: {
          id: insertResult.insertId,
          order_number: orderNumber,
          restaurant_name: restaurant.name,
          order_type,
          items,
          subtotal_krw,
          delivery_fee_krw,
          discount_krw,
          total_krw,
          status: 'pending',
          payment_status: 'pending',
          estimated_ready_time: estimatedReadyTime
        }
      });

    } catch (error) {
      console.error('❌ [Food Order] 주문 생성 실패:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET: 주문 조회
  if (req.method === 'GET') {
    try {
      const { id, user_id, restaurant_id, order_number, status } = req.query;

      // 특정 주문 상세 조회
      if (id || order_number) {
        let query = `
          SELECT
            fo.*,
            r.name as restaurant_name,
            r.address as restaurant_address,
            r.phone as restaurant_phone
          FROM food_orders fo
          LEFT JOIN restaurants r ON fo.restaurant_id = r.id
          WHERE
        `;

        let params = [];

        if (id) {
          query += ` fo.id = ?`;
          params.push(id);
        } else {
          query += ` fo.order_number = ?`;
          params.push(order_number);
        }

        const result = await connection.execute(query, params);

        if (!result.rows || result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '주문을 찾을 수 없습니다.'
          });
        }

        const order = result.rows[0];

        // JSON 필드 파싱
        const formattedOrder = {
          ...order,
          items: order.items ? (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) : []
        };

        return res.status(200).json({
          success: true,
          order: formattedOrder
        });
      }

      // 사용자 주문 내역 조회
      if (!user_id && !restaurant_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id 또는 restaurant_id가 필요합니다.'
        });
      }

      let query = `
        SELECT
          fo.*,
          r.name as restaurant_name,
          r.address as restaurant_address,
          r.thumbnail_url as restaurant_thumbnail
        FROM food_orders fo
        LEFT JOIN restaurants r ON fo.restaurant_id = r.id
        WHERE 1=1
      `;

      const params = [];

      if (user_id) {
        query += ` AND fo.user_id = ?`;
        params.push(user_id);
      }

      if (restaurant_id) {
        query += ` AND fo.restaurant_id = ?`;
        params.push(restaurant_id);
      }

      if (status) {
        query += ` AND fo.status = ?`;
        params.push(status);
      }

      query += ` ORDER BY fo.created_at DESC`;

      const result = await connection.execute(query, params);

      // JSON 필드 파싱
      const orders = (result.rows || []).map(order => ({
        ...order,
        items: order.items ? (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) : []
      }));

      return res.status(200).json({
        success: true,
        orders
      });

    } catch (error) {
      console.error('❌ [Food Order] 주문 조회 실패:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};
