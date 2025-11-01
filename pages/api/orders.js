/**
 * 주문 관리 API
 * GET /api/orders - 모든 주문 조회
 * POST /api/orders - 장바구니 주문 생성
 */

const { connect } = require('@planetscale/database');

function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORDER_${timestamp}_${random}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // GET: 관리자 주문 목록 조회 (payments 기반)
  if (req.method === 'GET') {
    try {
      // payments 테이블 기반으로 주문 정보 조회
      const result = await connection.execute(`
        SELECT
          p.id,
          p.user_id,
          p.amount,
          p.payment_status,
          p.payment_key,
          p.gateway_transaction_id as order_number,
          p.notes,
          p.created_at,
          p.approved_at,
          p.refund_amount,
          p.refunded_at,
          b.id as booking_id,
          b.booking_number,
          b.status as booking_status,
          b.start_date,
          b.end_date,
          b.guests,
          b.adults,
          b.children,
          b.infants,
          b.listing_id,
          b.delivery_status,
          b.shipping_name,
          b.shipping_phone,
          b.shipping_address,
          b.shipping_address_detail,
          b.shipping_zipcode,
          b.tracking_number,
          b.courier_company,
          l.title as product_title,
          l.category,
          l.images
        FROM payments p
        LEFT JOIN bookings b ON p.booking_id = b.id
        LEFT JOIN listings l ON b.listing_id = l.id
        WHERE p.payment_status IN ('paid', 'completed', 'refunded')
        ORDER BY p.created_at DESC
      `);

      // Neon PostgreSQL에서 사용자 정보 조회
      const { Pool } = require('@neondatabase/serverless');
      const poolNeon = new Pool({
        connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
      });

      let ordersWithUserInfo = [];

      try {
        // 모든 주문의 user_id 수집
        const userIds = [...new Set((result.rows || []).map(order => order.user_id).filter(Boolean))];

        let userMap = new Map();
        if (userIds.length > 0) {
          // IN 쿼리로 사용자 정보 한번에 조회
          const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
          const usersResult = await poolNeon.query(
            `SELECT id, name, email, phone, address, detail_address, postal_code FROM users WHERE id IN (${placeholders})`,
            userIds
          );

          usersResult.rows.forEach(user => {
            userMap.set(user.id, user);
          });
        }

        // 🔧 혼합 주문의 모든 bookings 조회 (부분 환불 지원)
        const orderNumbersForCart = (result.rows || [])
          .filter(order => !order.booking_id && order.gateway_transaction_id)
          .map(order => order.gateway_transaction_id);

        let bookingsMap = new Map(); // order_number → [bookings]

        if (orderNumbersForCart.length > 0) {
          console.log(`📦 [Orders] 혼합 주문 ${orderNumbersForCart.length}건의 bookings 조회 중...`);

          for (const orderNumber of orderNumbersForCart) {
            const bookingsResult = await connection.execute(`
              SELECT
                b.id as booking_id,
                b.listing_id,
                b.status,
                b.delivery_status,
                b.guests,
                b.shipping_name,
                b.shipping_phone,
                b.shipping_address,
                b.shipping_address_detail,
                b.shipping_zipcode,
                l.title as product_title,
                l.category
              FROM bookings b
              LEFT JOIN listings l ON b.listing_id = l.id
              WHERE b.order_number = ? AND b.status != 'cancelled'
              ORDER BY b.created_at ASC
            `, [orderNumber]);

            if (bookingsResult.rows && bookingsResult.rows.length > 0) {
              bookingsMap.set(orderNumber, bookingsResult.rows);
              console.log(`📦 [Orders] order_number=${orderNumber}: ${bookingsResult.rows.length}개 booking 발견`);
            }
          }
        }

        // 주문 데이터와 사용자 정보 병합
        ordersWithUserInfo = (result.rows || []).map(order => {
          const user = userMap.get(order.user_id);

          // notes 파싱하여 상품 정보 및 청구 정보 추출
          let itemsInfo = null;
          let itemCount = 1;
          let totalQuantity = 1; // ✅ 실제 총 수량 (각 아이템의 quantity 합산)
          let displayTitle = order.product_title || '';
          let deliveryFee = 0;
          let subtotal = 0;
          let actualOrderNumber = order.order_number;
          // ✅ FIX: notes에서 청구 정보 추출 (users 테이블에 없을 경우 대비)
          let billingName = '';
          let billingEmail = '';
          let billingPhone = '';

          if (order.notes) {
            try {
              const notesData = JSON.parse(order.notes);

              // 주문번호 추출
              if (notesData.orderNumber) {
                actualOrderNumber = notesData.orderNumber;
              }

              // 배송비 및 상품 금액 추출
              deliveryFee = notesData.deliveryFee || 0;
              subtotal = notesData.subtotal || 0;

              // ✅ FIX: 청구 정보 추출 (주문 시 입력한 정보)
              if (notesData.billingInfo) {
                billingName = notesData.billingInfo.name || '';
                billingEmail = notesData.billingInfo.email || '';
                billingPhone = notesData.billingInfo.phone || '';
              }
              // ✅ shippingInfo도 체크 (이전 버전 호환)
              if (!billingName && notesData.shippingInfo) {
                billingName = notesData.shippingInfo.name || '';
                billingEmail = notesData.shippingInfo.email || '';
                billingPhone = notesData.shippingInfo.phone || '';
              }

              // 상품 정보 추출 (우선순위: notes.items > product_title)
              if (notesData.items && Array.isArray(notesData.items) && notesData.items.length > 0) {
                itemsInfo = notesData.items;
                itemCount = notesData.items.length; // 아이템 종류 수

                // ✅ 총 수량 계산: 각 아이템의 quantity 합산
                totalQuantity = notesData.items.reduce((sum, item) => {
                  return sum + (item.quantity || 1);
                }, 0);

                console.log(`📊 [Orders] order_id=${order.id}: ${itemCount}개 종류, 총 ${totalQuantity}개 수량`);

                // 첫 번째 아이템의 상품명 가져오기 (title 또는 name 필드)
                const firstItemTitle = notesData.items[0].title || notesData.items[0].name || '';

                if (itemCount > 1) {
                  displayTitle = firstItemTitle ? `${firstItemTitle} 외 ${itemCount - 1}개` : (order.product_title || '주문');
                } else {
                  displayTitle = firstItemTitle || order.product_title || '주문';
                }

                // ✅ 디버깅: 상품명이 비어있거나 이상한 경우 로깅
                if (!firstItemTitle || firstItemTitle.includes('배송지') || firstItemTitle.includes('undefined')) {
                  console.warn(`⚠️ [Orders] order_id=${order.id}: 이상한 상품명 감지:`, {
                    firstItemTitle,
                    item: notesData.items[0],
                    product_title: order.product_title
                  });
                }
              } else if (!displayTitle) {
                // notes.items도 없고 product_title도 없으면
                displayTitle = '주문';
                console.warn(`⚠️ [Orders] order_id=${order.id}: notes.items가 없음, product_title=${order.product_title}`);
              }
            } catch (e) {
              console.error('❌ [Orders] notes 파싱 오류:', e, 'order_id:', order.id);
              // 파싱 실패 시 product_title 사용
              displayTitle = order.product_title || '주문';
            }
          } else if (!displayTitle) {
            // notes도 없고 product_title도 없으면
            displayTitle = '주문';
            console.warn(`⚠️ [Orders] order_id=${order.id}: notes가 없음`);
          }

          // 🔧 혼합 주문의 경우 모든 bookings 정보 추가
          const orderNumber = order.gateway_transaction_id;
          const bookingsList = bookingsMap.get(orderNumber) || null;

          // ✅ FIX: 사용자 정보 우선순위
          // 1순위: notes의 billingInfo (주문 시 입력한 정보)
          // 2순위: users 테이블 (회원 정보)
          // 3순위: bookings 테이블의 shipping 정보 (배송지로 입력한 정보)
          const finalUserName = billingName || user?.name || order.shipping_name || '';
          const finalUserEmail = billingEmail || user?.email || '';
          const finalUserPhone = billingPhone || user?.phone || order.shipping_phone || '';

          return {
            id: order.id,
            booking_id: order.booking_id, // ✅ 환불 시 필요
            booking_number: order.booking_number,
            user_name: finalUserName, // ✅ FIX: notes → users → bookings 순서로 우선순위
            user_email: finalUserEmail, // ✅ FIX: notes → users 순서로 우선순위
            user_phone: finalUserPhone, // ✅ FIX: notes → users → bookings 순서로 우선순위
            product_name: displayTitle,
            product_title: displayTitle,
            listing_id: order.listing_id,
            amount: order.amount, // ✅ AdminOrders.tsx amount 필드 (필수)
            total_amount: order.amount, // ✅ 하위 호환성
            subtotal: subtotal || (order.amount - deliveryFee),
            delivery_fee: deliveryFee,
            items_info: itemsInfo, // ✅ 주문 상품 상세 정보 (배송 관리용)
            bookings_list: bookingsList, // 🔧 혼합 주문의 모든 bookings (부분 환불용)
            item_count: itemCount, // ✅ 상품 종류 수
            total_quantity: totalQuantity, // ✅ 총 수량
            status: order.booking_status || 'pending',
            payment_status: order.payment_status,
            created_at: order.created_at,
            start_date: order.start_date,
            end_date: order.end_date,
            // ✅ FIX: 팝업 상품은 totalQuantity(실제 수량 합산), 예약 상품은 인원 수
            num_adults: order.category === '팝업' ? totalQuantity : (order.adults || order.guests || 0),
            guests: order.category === '팝업' ? totalQuantity : (order.adults || order.guests || 0), // ✅ AdminOrders.tsx에서 사용
            num_children: order.children || 0,
            num_seniors: 0,
            category: order.category,
            is_popup: order.category === '팝업',
            order_number: actualOrderNumber,
            // ✅ 배송 정보 (주문 당시 배송지: bookings 우선, 없으면 users 테이블)
            delivery_status: order.delivery_status,
            shipping_name: order.shipping_name || user?.name || '',
            shipping_phone: order.shipping_phone || user?.phone || '',
            shipping_address: order.shipping_address || user?.address || '',
            shipping_address_detail: order.shipping_address_detail || user?.detail_address || '',
            shipping_zipcode: order.shipping_zipcode || user?.postal_code || '',
            // ✅ 배송 조회 정보
            tracking_number: order.tracking_number || null,
            courier_company: order.courier_company || null
          };
        });
      } finally {
        await poolNeon.end();
      }

      return res.status(200).json({
        success: true,
        orders: ordersWithUserInfo
      });
    } catch (error) {
      console.error('Orders GET API error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || '주문 목록 조회 실패',
        orders: []
      });
    }
  }

  // POST: 장바구니 주문 생성
  if (req.method === 'POST') {
    try {
      const {
        userId,
        items,
        subtotal,
        deliveryFee,
        couponDiscount,
        couponCode,
        pointsUsed,
        total,
        status,
        paymentMethod,
        shippingInfo
      } = req.body;

      console.log('🛒 [Orders] 주문 생성 요청:', {
        userId,
        itemCount: items?.length,
        subtotal,
        deliveryFee,
        couponDiscount,
        couponCode,
        pointsUsed,
        total,
        hasShipping: !!shippingInfo
      });

      // 필수 파라미터 검증
      if (!userId || !items || items.length === 0 || total === undefined) {
        return res.status(400).json({
          success: false,
          error: '필수 파라미터가 누락되었습니다.'
        });
      }

      // 🔒 금액 검증 (보안: 클라이언트 조작 방지)
      // ⚠️ CRITICAL: 클라이언트가 보낸 subtotal을 절대 믿지 말 것!
      // items 배열에서 서버가 직접 재계산
      let serverCalculatedSubtotal = 0;

      for (const item of items) {
        if (!item.price || !item.quantity || item.price < 0 || item.quantity <= 0) {
          return res.status(400).json({
            success: false,
            error: 'INVALID_ITEM',
            message: '잘못된 상품 정보입니다.'
          });
        }

        // 옵션 가격이 있으면 포함
        const itemPrice = item.price || 0;
        const optionPrice = item.selectedOption?.priceAdjustment || 0;  // ✅ priceAdjustment 사용
        const totalItemPrice = (itemPrice + optionPrice) * item.quantity;

        serverCalculatedSubtotal += totalItemPrice;
      }

      console.log(`🔒 [Orders] 서버 측 subtotal 재계산: ${serverCalculatedSubtotal}원 (클라이언트: ${subtotal}원)`);

      // 클라이언트가 보낸 subtotal과 서버 계산이 다르면 거부
      if (Math.abs(serverCalculatedSubtotal - (subtotal || 0)) > 1) {
        console.error(`❌ [Orders] Subtotal 조작 감지!
          - 클라이언트 subtotal: ${subtotal}원
          - 서버 계산 subtotal: ${serverCalculatedSubtotal}원
          - 차이: ${Math.abs(serverCalculatedSubtotal - (subtotal || 0))}원`);

        return res.status(400).json({
          success: false,
          error: 'SUBTOTAL_TAMPERED',
          message: '상품 금액이 조작되었습니다. 페이지를 새로고침해주세요.'
        });
      }

      // 🔒 배송비 서버 검증 (팝업 상품만의 금액으로 계산)
      let serverDeliveryFee = 0;
      const hasPopupProduct = items.some(item => item.category === '팝업');

      if (hasPopupProduct) {
        // 팝업 상품만의 금액 계산 (혼합 주문 대응)
        let popupSubtotal = 0;
        for (const item of items) {
          if (item.category === '팝업') {
            const itemPrice = item.price || 0;
            const optionPrice = item.selectedOption?.priceAdjustment || 0;  // ✅ priceAdjustment 사용 (price가 아님!)
            popupSubtotal += (itemPrice + optionPrice) * item.quantity;
          }
        }

        // 팝업 상품 금액이 50,000원 이상이면 배송비 무료
        serverDeliveryFee = popupSubtotal >= 50000 ? 0 : 3000;
        console.log(`📦 [Orders] 팝업 상품 배송비 계산: 팝업=${popupSubtotal}원, 전체=${serverCalculatedSubtotal}원 → 배송비 ${serverDeliveryFee}원`);

        // 클라이언트가 보낸 배송비와 다르면 경고
        if (deliveryFee !== serverDeliveryFee) {
          console.warn(`⚠️ [Orders] 배송비 불일치: 클라이언트=${deliveryFee}원, 서버=${serverDeliveryFee}원`);
        }
      } else {
        // 팝업이 아니면 배송비 0
        serverDeliveryFee = 0;
      }

      // 🔒 쿠폰 서버 검증 (트랜잭션 밖 - 빠른 검증)
      let serverCouponDiscount = 0;
      let couponInfo = null;

      if (couponCode) {
        const couponResult = await connection.execute(`
          SELECT * FROM coupons
          WHERE code = ? AND is_active = 1
          LIMIT 1
        `, [couponCode.toUpperCase()]);

        if (!couponResult.rows || couponResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'INVALID_COUPON',
            message: '유효하지 않은 쿠폰 코드입니다.'
          });
        }

        couponInfo = couponResult.rows[0];

        // 유효 기간 체크
        const now = new Date();
        if (couponInfo.valid_from && new Date(couponInfo.valid_from) > now) {
          return res.status(400).json({
            success: false,
            error: 'COUPON_NOT_YET_VALID',
            message: '아직 사용할 수 없는 쿠폰입니다.'
          });
        }
        if (couponInfo.valid_until && new Date(couponInfo.valid_until) < now) {
          return res.status(400).json({
            success: false,
            error: 'COUPON_EXPIRED',
            message: '만료된 쿠폰입니다.'
          });
        }

        // 최소 주문 금액 확인
        if (couponInfo.min_amount && serverCalculatedSubtotal < couponInfo.min_amount) {
          return res.status(400).json({
            success: false,
            error: 'MIN_AMOUNT_NOT_MET',
            message: `최소 주문 금액 ${couponInfo.min_amount.toLocaleString()}원 이상이어야 사용 가능합니다.`
          });
        }

        // 할인 금액 서버 계산
        if (couponInfo.discount_type === 'percentage') {
          serverCouponDiscount = Math.floor(serverCalculatedSubtotal * couponInfo.discount_value / 100);
        } else {
          serverCouponDiscount = couponInfo.discount_value;
        }

        console.log(`🎟️ [Orders] 쿠폰 검증 통과: ${couponCode}, 할인액: ${serverCouponDiscount}원`);
      }

      // 🔒 포인트 사용 검증 (음수/NaN 방지)
      let serverPointsUsed = parseInt(pointsUsed) || 0;
      if (isNaN(serverPointsUsed) || serverPointsUsed < 0) {
        console.warn(`⚠️ [Orders] 잘못된 pointsUsed 값 감지: ${pointsUsed}, 0으로 처리`);
        serverPointsUsed = 0;
      }

      // 서버 측 최종 금액 계산 (서버가 재계산한 subtotal 사용)
      const expectedTotal = serverCalculatedSubtotal - serverCouponDiscount + serverDeliveryFee - serverPointsUsed;

      // 1원 이하 오차 허용 (부동소수점 연산 오차)
      if (Math.abs(expectedTotal - total) > 1) {
        console.error(`❌ [Orders] 최종 금액 불일치 감지:
          - 클라이언트 total: ${total}원
          - 서버 계산: ${expectedTotal}원
          - 차이: ${Math.abs(expectedTotal - total)}원
          - serverSubtotal: ${serverCalculatedSubtotal}
          - deliveryFee: ${serverDeliveryFee}
          - couponDiscount: ${serverCouponDiscount}
          - pointsUsed: ${serverPointsUsed}`);

        return res.status(400).json({
          success: false,
          error: 'AMOUNT_MISMATCH',
          message: `금액이 일치하지 않습니다. 페이지를 새로고침해주세요.`,
          expected: expectedTotal,
          received: total
        });
      }

      console.log(`✅ [Orders] 금액 검증 통과: ${total.toLocaleString()}원`);

      // 🔍 주문 생성 전 모든 상품 유효성 검증
      console.log('🔍 [Orders] 받은 items 배열:', JSON.stringify(items, null, 2));

      for (const item of items) {
        const itemName = item.title || item.name || `상품 ID ${item.listingId}`;

        console.log(`🔍 [Orders] 상품 검증 중:`, {
          itemName,
          'item.listingId': item.listingId,
          'item.id': item.id,
          'typeof listingId': typeof item.listingId,
          'item keys': Object.keys(item)
        });

        const listingCheck = await connection.execute(`
          SELECT id, title, is_active FROM listings
          WHERE id = ?
        `, [item.listingId]);

        console.log(`🔍 [Orders] DB 쿼리 결과:`, {
          listingId: item.listingId,
          found: listingCheck.rows?.length > 0,
          rows: listingCheck.rows
        });

        if (!listingCheck.rows || listingCheck.rows.length === 0) {
          console.error(`❌ [Orders] 상품을 찾을 수 없음: ${itemName} (listing_id: ${item.listingId})`);
          return res.status(400).json({
            success: false,
            error: 'LISTING_NOT_FOUND',
            message: `장바구니에 삭제된 상품이 포함되어 있습니다: ${itemName}\n장바구니를 새로고침해주세요.`,
            invalidListing: itemName
          });
        }

        const listing = listingCheck.rows[0];
        if (!listing.is_active) {
          console.error(`❌ [Orders] 판매 중단된 상품: ${itemName}`);
          return res.status(400).json({
            success: false,
            error: 'LISTING_INACTIVE',
            message: `판매가 중단된 상품이 포함되어 있습니다: ${itemName}\n장바구니를 새로고침해주세요.`,
            invalidListing: itemName
          });
        }

        console.log(`✅ [Orders] 상품 유효성 확인: ${listing.title}`);
      }

      const orderNumber = generateOrderNumber();

      // ✅ 트랜잭션 시작 (데이터 일관성 보장)
      await connection.execute('START TRANSACTION');

      try {
        // 🔒 쿠폰 재검증 (트랜잭션 안 - FOR UPDATE로 동시성 제어)
        if (couponCode && couponInfo) {
          const couponLockResult = await connection.execute(`
            SELECT used_count, usage_limit
            FROM coupons
            WHERE code = ? AND is_active = 1
            FOR UPDATE
          `, [couponCode.toUpperCase()]);

          if (!couponLockResult.rows || couponLockResult.rows.length === 0) {
            throw new Error('쿠폰이 비활성화되었습니다.');
          }

          const lockedCoupon = couponLockResult.rows[0];

          // 최대 사용 횟수 재확인 (Race Condition 방지)
          if (lockedCoupon.usage_limit !== null && lockedCoupon.used_count >= lockedCoupon.usage_limit) {
            throw new Error('쿠폰 사용 가능 횟수가 초과되었습니다.');
          }

          console.log(`🔒 [Orders] 쿠폰 락 획득: ${couponCode}, used_count=${lockedCoupon.used_count}, usage_limit=${lockedCoupon.usage_limit}`);
        }

        // 🔧 카테고리별로 주문 분리 (개별 환불 지원)
        // items를 category로 그룹화
        const itemsByCategory = items.reduce((acc, item) => {
          const category = item.category || '기타';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(item);
          return acc;
        }, {});

        const categoryKeys = Object.keys(itemsByCategory);
        console.log(`📦 [Orders] ${categoryKeys.length}개 카테고리로 주문 분리: ${categoryKeys.join(', ')}`);

        const paymentIds = [];
        let isFirstCategory = true;

        // 각 카테고리마다 별도의 payment 생성
        for (const category of categoryKeys) {
          const categoryItems = itemsByCategory[category];

          // 카테고리별 상품 금액 계산
          const categorySubtotal = categoryItems.reduce((sum, item) => {
            const itemPrice = item.price || 0;
            const optionPrice = item.selectedOption?.priceAdjustment || 0;  // ✅ priceAdjustment 사용
            return sum + (itemPrice + optionPrice) * item.quantity;
          }, 0);

          // 배송비는 팝업 카테고리에만 적용
          const categoryDeliveryFee = category === '팝업' ? serverDeliveryFee : 0;

          // 쿠폰/포인트는 첫 번째 카테고리에만 적용
          const categoryCouponDiscount = isFirstCategory ? serverCouponDiscount : 0;
          const categoryPointsUsed = isFirstCategory ? serverPointsUsed : 0;
          const categoryCouponCode = isFirstCategory ? (couponCode || null) : null;

          const categoryTotal = categorySubtotal + categoryDeliveryFee - categoryCouponDiscount - categoryPointsUsed;

          const insertResult = await connection.execute(`
            INSERT INTO payments (
              user_id,
              amount,
              payment_status,
              payment_method,
              gateway_transaction_id,
              notes,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
          `, [
            userId,
            categoryTotal,
            'pending',
            paymentMethod || 'card',
            orderNumber, // ✅ 모든 카테고리가 같은 orderNumber 사용
            JSON.stringify({
              category: category,
              items: categoryItems,
              subtotal: categorySubtotal,
              deliveryFee: categoryDeliveryFee,
              couponDiscount: categoryCouponDiscount,
              couponCode: categoryCouponCode,
              pointsUsed: categoryPointsUsed,
              shippingInfo: shippingInfo || null, // ✅ FIX: 카테고리 무관하게 항상 저장
              billingInfo: shippingInfo ? {
                name: shippingInfo.name,
                email: shippingInfo.email || null,
                phone: shippingInfo.phone
              } : null
            })
          ]);

          paymentIds.push(insertResult.insertId);
          console.log(`✅ [Orders] ${category} payment 생성: payment_id=${insertResult.insertId}, amount=${categoryTotal}원`);

          isFirstCategory = false;
        }

        console.log(`✅ [Orders] ${paymentIds.length}개 payments 생성 완료:`, paymentIds);

      // bookings 테이블에 각 상품별 예약 생성
      for (const item of items) {
        const bookingNumber = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // ✅ 실제 주문 수량 계산
        // 🔒 CRITICAL: 재고 차감 로직(line 202)과 정확히 동일한 계산식 사용!
        // 재고 복구 시 이 값을 사용하므로 일치해야 함
        const actualQuantity = item.quantity || 1;

        // ✅ FIX: 배송지 정보는 카테고리 무관하게 저장 (팝업뿐만 아니라 모든 상품)
        const shippingData = shippingInfo ? {
          name: shippingInfo.name || null,
          phone: shippingInfo.phone || null,
          address: shippingInfo.address || null,
          addressDetail: shippingInfo.addressDetail || null,
          zipcode: shippingInfo.zipcode || null
        } : null;

        await connection.execute(`
          INSERT INTO bookings (
            user_id,
            listing_id,
            booking_number,
            order_number,
            total_amount,
            status,
            payment_status,
            start_date,
            end_date,
            adults,
            children,
            infants,
            guests,
            selected_option_id,
            special_requests,
            shipping_fee,
            shipping_name,
            shipping_phone,
            shipping_address,
            shipping_address_detail,
            shipping_zipcode,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          userId,
          item.listingId,
          bookingNumber,
          orderNumber,
          item.subtotal || item.price * item.quantity, // ✅ subtotal 사용 (옵션 가격 포함)
          status || 'pending',
          'pending',
          item.selectedDate || null,
          item.selectedDate || null,
          item.adults || 0,
          item.children || 0,
          item.infants || 0,
          actualQuantity, // ✅ 실제 주문 수량 (재고 차감/복구에 사용)
          item.selectedOption?.id || null, // ✅ 옵션 ID 저장 (재고 복구에 사용)
          JSON.stringify(item.selectedOption || {}),
          item.category === '팝업' ? (deliveryFee || 0) / items.length : 0,
          shippingData?.name,
          shippingData?.phone,
          shippingData?.address,
          shippingData?.addressDetail,
          shippingData?.zipcode
        ]);

        console.log(`✅ [Orders] bookings 생성: ${bookingNumber}, listing ${item.listingId}`);

        // ✅ 재고 차감 (옵션 또는 상품 레벨) - 재고 부족 시 명확한 에러
        const stockQuantity = item.quantity || 1;
        const itemName = item.title || item.name || `상품 ID ${item.listingId}`;

        if (item.selectedOption && item.selectedOption.id) {
          // 옵션 재고 확인 (FOR UPDATE로 락 획득)
          const stockCheck = await connection.execute(`
            SELECT stock, option_name FROM product_options
            WHERE id = ?
            FOR UPDATE
          `, [item.selectedOption.id]);

          if (!stockCheck.rows || stockCheck.rows.length === 0) {
            throw new Error(`옵션을 찾을 수 없습니다: ${itemName} - ${item.selectedOption.name || 'Unknown'}`);
          }

          const currentStock = stockCheck.rows[0].stock;
          const optionName = stockCheck.rows[0].option_name || item.selectedOption.name;

          // 재고 NULL이면 무제한 재고로 간주
          if (currentStock !== null && currentStock < stockQuantity) {
            throw new Error(`재고 부족: ${itemName} (${optionName}) - 현재 재고 ${currentStock}개, 주문 수량 ${stockQuantity}개`);
          }

          // 재고 차감 (동시성 제어: stock >= ? 조건 추가)
          const updateResult = await connection.execute(`
            UPDATE product_options
            SET stock = stock - ?
            WHERE id = ? AND stock IS NOT NULL AND stock >= ?
          `, [stockQuantity, item.selectedOption.id, stockQuantity]);

          // affectedRows 확인으로 동시성 충돌 감지
          if (updateResult.affectedRows === 0) {
            throw new Error(`재고 차감 실패 (동시성 충돌 또는 재고 부족): ${itemName} (${optionName}) - 다른 사용자가 먼저 구매했을 수 있습니다.`);
          }

          console.log(`✅ [Orders] 옵션 재고 차감: ${itemName} (${optionName}), -${stockQuantity}개 (남은 재고: ${currentStock - stockQuantity}개)`);

        } else {
          // 상품 레벨 재고 확인 (stock_enabled=1인 경우만)
          const stockCheck = await connection.execute(`
            SELECT stock, stock_enabled, title FROM listings
            WHERE id = ?
            FOR UPDATE
          `, [item.listingId]);

          if (!stockCheck.rows || stockCheck.rows.length === 0) {
            throw new Error(`상품을 찾을 수 없습니다: ${itemName}`);
          }

          const listing = stockCheck.rows[0];
          const currentStock = listing.stock;
          const stockEnabled = listing.stock_enabled;
          const title = listing.title || itemName;

          // 재고 관리가 활성화되어 있고, 재고가 부족한 경우
          if (stockEnabled && currentStock !== null && currentStock < stockQuantity) {
            throw new Error(`재고 부족: ${title} - 현재 재고 ${currentStock}개, 주문 수량 ${stockQuantity}개`);
          }

          // 재고 차감 (stock_enabled=1이고 stock이 NOT NULL인 경우만)
          if (stockEnabled && currentStock !== null) {
            // 동시성 제어: stock >= ? 조건 추가
            const updateResult = await connection.execute(`
              UPDATE listings
              SET stock = stock - ?
              WHERE id = ? AND stock >= ?
            `, [stockQuantity, item.listingId, stockQuantity]);

            // affectedRows 확인으로 동시성 충돌 감지
            if (updateResult.affectedRows === 0) {
              throw new Error(`재고 차감 실패 (동시성 충돌 또는 재고 부족): ${title} - 다른 사용자가 먼저 구매했을 수 있습니다.`);
            }

            console.log(`✅ [Orders] 상품 재고 차감: ${title}, -${stockQuantity}개 (남은 재고: ${currentStock - stockQuantity}개)`);
          } else {
            console.log(`ℹ️ [Orders] 재고 관리 비활성화: ${title} (재고 차감 스킵)`);
          }
        }
      }

      // 🔒 포인트 사용 검증 (차감은 결제 확정 후 confirmPayment에서 수행)
      if (pointsUsed && pointsUsed > 0) {
        // ✅ Neon PostgreSQL Pool 사용 (users 테이블은 Neon에 있음)
        const { Pool } = require('@neondatabase/serverless');
        const poolNeon = new Pool({
          connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
        });

        try {
          // 현재 포인트 조회 및 충분한지 검증만 수행 (Neon - users 테이블)
          const userResult = await poolNeon.query(
            'SELECT total_points FROM users WHERE id = $1',
            [userId]
          );

          if (userResult.rows && userResult.rows.length > 0) {
            const currentPoints = userResult.rows[0].total_points || 0;

            if (currentPoints < pointsUsed) {
              throw new Error(`포인트가 부족합니다. (보유: ${currentPoints}P, 사용 요청: ${pointsUsed}P)`);
            }

            console.log(`✅ [Orders] 포인트 사용 가능 확인: ${pointsUsed}P (현재 잔액: ${currentPoints}P)`);
            console.log(`ℹ️ [Orders] 포인트 차감은 결제 확정 후 수행됩니다.`);
          } else {
            throw new Error('사용자를 찾을 수 없습니다.');
          }
        } catch (pointsError) {
          console.error('❌ [Orders] 포인트 검증 실패:', pointsError);
          throw pointsError;
        } finally {
          // ✅ Connection pool 정리 (에러 발생해도 반드시 실행)
          await poolNeon.end();
        }
      }

      // ✅ 트랜잭션 커밋
      await connection.execute('COMMIT');
      console.log('✅ [Orders] 트랜잭션 커밋 완료');

      return res.status(200).json({
        success: true,
        data: {
          orderNumber,
          orderId: paymentIds[0] || 0, // 🔧 첫 번째 payment id 사용
          paymentIds, // 🔧 모든 payment ids 반환 (디버깅용)
          total
        },
        message: '주문이 생성되었습니다.'
      });

    } catch (transactionError) {
      // ✅ 트랜잭션 롤백
      await connection.execute('ROLLBACK');
      console.error('❌ [Orders] 트랜잭션 롤백:', transactionError);
      throw transactionError;
    }

    } catch (error) {
      console.error('❌ [Orders] POST API error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || '주문 생성에 실패했습니다.'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};
