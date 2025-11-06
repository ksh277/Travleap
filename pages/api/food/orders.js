/**
 * 사용자용 - 음식 주문 API
 * POST /api/food/orders - 주문 생성 (매장/포장/배달) - 금액 서버 검증 적용
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
        subtotal_krw, // 클라이언트가 보낸 값 (검증 필요)
        delivery_fee_krw = 0, // 클라이언트가 보낸 값 (검증 필요)
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

      // 🔒 트랜잭션 시작
      await connection.execute('START TRANSACTION');

      try {
        // 식당 정보 조회
        const restaurantQuery = `
          SELECT
            r.id,
            r.name,
            r.accepts_reservations,
            r.accepts_takeout,
            r.accepts_delivery,
            r.delivery_fee_krw,
            r.min_delivery_amount_krw
          FROM restaurants r
          WHERE r.id = ? AND r.is_active = 1
          FOR UPDATE
        `;

        const restaurantResult = await connection.execute(restaurantQuery, [restaurant_id]);

        if (!restaurantResult.rows || restaurantResult.rows.length === 0) {
          await connection.execute('ROLLBACK');
          return res.status(404).json({
            success: false,
            error: '식당을 찾을 수 없습니다.'
          });
        }

        const restaurant = restaurantResult.rows[0];

        // 주문 타입별 가능 여부 체크
        if (order_type === 'takeout' && !restaurant.accepts_takeout) {
          await connection.execute('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: '이 식당은 포장 주문을 받지 않습니다.'
          });
        }

        if (order_type === 'delivery' && !restaurant.accepts_delivery) {
          await connection.execute('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: '이 식당은 배달을 하지 않습니다.'
          });
        }

        // 🔒 금액 검증 (보안: 클라이언트 조작 방지)
        // ⚠️ CRITICAL: 클라이언트가 보낸 subtotal_krw를 절대 믿지 말 것!
        // items 배열에서 서버가 직접 메뉴 가격을 DB 조회 후 재계산
        let serverCalculatedSubtotal = 0;
        const validatedItems = [];

        for (const item of items) {
          if (!item.menu_id || !item.quantity || item.quantity <= 0) {
            await connection.execute('ROLLBACK');
            return res.status(400).json({
              success: false,
              error: 'INVALID_ITEM',
              message: '잘못된 메뉴 정보입니다.'
            });
          }

          // DB에서 실제 메뉴 가격 조회
          const menuQuery = `
            SELECT id, name, price_krw, is_available, options
            FROM menus
            WHERE id = ? AND restaurant_id = ?
          `;

          const menuResult = await connection.execute(menuQuery, [item.menu_id, restaurant_id]);

          if (!menuResult.rows || menuResult.rows.length === 0) {
            await connection.execute('ROLLBACK');
            return res.status(404).json({
              success: false,
              error: 'MENU_NOT_FOUND',
              message: `메뉴를 찾을 수 없습니다: ${item.name || item.menu_id}`
            });
          }

          const menu = menuResult.rows[0];

          if (!menu.is_available) {
            await connection.execute('ROLLBACK');
            return res.status(400).json({
              success: false,
              error: 'MENU_NOT_AVAILABLE',
              message: `현재 주문할 수 없는 메뉴입니다: ${menu.name}`
            });
          }

          // 서버에서 가격 계산 (DB 가격 사용)
          const menuPrice = parseFloat(menu.price_krw) || 0;

          // 옵션 가격 계산 (있는 경우)
          let optionPrice = 0;
          if (item.options && item.options.length > 0) {
            const menuOptions = menu.options ?
              (typeof menu.options === 'string' ? JSON.parse(menu.options) : menu.options) : [];

            for (const selectedOption of item.options) {
              const optionDef = menuOptions.find(opt => opt.name === selectedOption.name);
              if (optionDef) {
                optionPrice += parseFloat(optionDef.price || 0);
              }
            }
          }

          const totalItemPrice = (menuPrice + optionPrice) * item.quantity;
          serverCalculatedSubtotal += totalItemPrice;

          validatedItems.push({
            menu_id: menu.id,
            name: menu.name,
            quantity: item.quantity,
            price_krw: menuPrice,
            options: item.options || [],
            option_price_krw: optionPrice,
            total_price_krw: totalItemPrice
          });
        }

        console.log(`🔒 [Food Orders] 서버 측 subtotal 재계산: ${serverCalculatedSubtotal}원 (클라이언트: ${subtotal_krw}원)`);

        // 클라이언트가 보낸 subtotal과 서버 계산이 다르면 거부
        if (Math.abs(serverCalculatedSubtotal - (subtotal_krw || 0)) > 1) {
          await connection.execute('ROLLBACK');
          console.error(`❌ [Food Orders] Subtotal 조작 감지!
            - 클라이언트 subtotal: ${subtotal_krw}원
            - 서버 계산 subtotal: ${serverCalculatedSubtotal}원
            - 차이: ${Math.abs(serverCalculatedSubtotal - (subtotal_krw || 0))}원`);

          return res.status(400).json({
            success: false,
            error: 'SUBTOTAL_TAMPERED',
            message: '주문 금액이 조작되었습니다. 페이지를 새로고침해주세요.'
          });
        }

        // 🔒 배송비 서버 검증
        let serverDeliveryFee = 0;
        if (order_type === 'delivery') {
          // 최소 배달 금액 확인
          if (restaurant.min_delivery_amount_krw &&
              serverCalculatedSubtotal < restaurant.min_delivery_amount_krw) {
            await connection.execute('ROLLBACK');
            return res.status(400).json({
              success: false,
              error: 'MIN_DELIVERY_AMOUNT_NOT_MET',
              message: `최소 배달 금액 ${restaurant.min_delivery_amount_krw.toLocaleString()}원 이상이어야 합니다.`
            });
          }

          serverDeliveryFee = restaurant.delivery_fee_krw || 0;

          // 클라이언트가 보낸 배송비와 다르면 경고
          if (delivery_fee_krw !== serverDeliveryFee) {
            console.warn(`⚠️ [Food Orders] 배송비 불일치: 클라이언트=${delivery_fee_krw}원, 서버=${serverDeliveryFee}원`);
          }
        } else {
          serverDeliveryFee = 0;
        }

        // 서버 측 최종 금액 계산
        const serverTotalKrw = serverCalculatedSubtotal + serverDeliveryFee - (discount_krw || 0);

        console.log(`✅ [Food Orders] 금액 검증 통과: subtotal=${serverCalculatedSubtotal}원, delivery=${serverDeliveryFee}원, discount=${discount_krw}원, total=${serverTotalKrw}원`);

        // 주문 번호 생성
        const orderNumber = generateOrderNumber();

        // 예상 준비 시간 (현재 시간 + 30분)
        const estimatedReadyTime = new Date();
        estimatedReadyTime.setMinutes(estimatedReadyTime.getMinutes() + 30);

        // 주문 생성 (서버 검증된 금액 사용)
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
          JSON.stringify(validatedItems), // 서버 검증된 items 사용
          serverCalculatedSubtotal, // 서버 계산 subtotal
          serverDeliveryFee, // 서버 계산 배송비
          discount_krw || 0,
          serverTotalKrw, // 서버 계산 total
          special_requests || null,
          estimatedReadyTime.toISOString().slice(0, 19).replace('T', ' ')
        ]);

        // 🔒 트랜잭션 커밋
        await connection.execute('COMMIT');

        console.log('✅ [Food Order] 주문 생성 완료:', {
          order_number: orderNumber,
          restaurant: restaurant.name,
          order_type,
          items_count: validatedItems.length,
          total: serverTotalKrw
        });

        return res.status(201).json({
          success: true,
          order: {
            id: insertResult.insertId,
            order_number: orderNumber,
            restaurant_name: restaurant.name,
            order_type,
            items: validatedItems,
            subtotal_krw: serverCalculatedSubtotal,
            delivery_fee_krw: serverDeliveryFee,
            discount_krw: discount_krw || 0,
            total_krw: serverTotalKrw,
            status: 'pending',
            payment_status: 'pending',
            estimated_ready_time: estimatedReadyTime
          }
        });

      } catch (innerError) {
        // 트랜잭션 롤백
        await connection.execute('ROLLBACK');
        throw innerError;
      }

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
