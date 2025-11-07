import { NextResponse } from 'next/server';
import { connect } from '@planetscale/database';
import { Pool } from '@neondatabase/serverless';

export async function GET() {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

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
      WHERE p.payment_status IN ('pending', 'paid', 'completed', 'refunded')
      ORDER BY p.created_at DESC
    `);

    // Neon PostgreSQL에서 사용자 정보 조회
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    let ordersWithUserInfo = [];

    try {
      // 모든 주문의 user_id 수집
      const userIds = [...new Set((result.rows || []).map((order: any) => order.user_id).filter(Boolean))];

      let userMap = new Map();
      if (userIds.length > 0) {
        // IN 쿼리로 사용자 정보 한번에 조회
        const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
        const usersResult = await poolNeon.query(
          `SELECT id, name, email, phone, address, detail_address, postal_code FROM users WHERE id IN (${placeholders})`,
          userIds
        );

        usersResult.rows.forEach((user: any) => {
          userMap.set(user.id, user);
        });
      }

      // 혼합 주문의 모든 bookings 조회 (부분 환불 지원)
      const orderNumbersForCart = (result.rows || [])
        .filter((order: any) => !order.booking_id && order.gateway_transaction_id)
        .map((order: any) => order.gateway_transaction_id);

      let bookingsMap = new Map(); // order_number → [bookings]

      if (orderNumbersForCart.length > 0) {
        console.log(`📦 [Orders] 혼합 주문 ${orderNumbersForCart.length}건의 bookings 조회 중...`);

        // N+1 쿼리 개선: IN 절로 한 번에 조회
        const placeholders = orderNumbersForCart.map(() => '?').join(',');
        const bookingsResult = await connection.execute(`
          SELECT
            b.id as booking_id,
            b.order_number,
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
          WHERE b.order_number IN (${placeholders}) AND b.status != 'cancelled'
          ORDER BY b.order_number, b.created_at ASC
        `, orderNumbersForCart);

        // order_number별로 그룹화
        (bookingsResult.rows || []).forEach((booking: any) => {
          if (!bookingsMap.has(booking.order_number)) {
            bookingsMap.set(booking.order_number, []);
          }
          bookingsMap.get(booking.order_number).push(booking);
        });

        console.log(`📦 [Orders] ${bookingsResult.rows?.length || 0}개 booking 조회 완료`);
      }

      // 주문 데이터와 사용자 정보 병합
      ordersWithUserInfo = (result.rows || []).map((order: any) => {
        const user = userMap.get(order.user_id);

        // notes 파싱하여 상품 정보 및 청구 정보 추출
        let itemsInfo = null;
        let itemCount = 1;
        let totalQuantity = 1;
        let displayTitle = order.product_title || '';
        let deliveryFee = 0;
        let subtotal = 0;
        let actualOrderNumber = order.order_number;
        let billingName = '';
        let billingEmail = '';
        let billingPhone = '';
        let categoryFromNotes = null;

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

            // 카테고리 추출 (booking_id가 null인 경우 notes에서 가져옴)
            // notes.category 우선, 없으면 notes.items[0].category에서 추출
            if (notesData.category) {
              categoryFromNotes = notesData.category;
            } else if (notesData.items && notesData.items.length > 0 && notesData.items[0].category) {
              categoryFromNotes = notesData.items[0].category;
            }

            // 청구 정보 추출 (주문 시 입력한 정보)
            if (notesData.billingInfo) {
              billingName = notesData.billingInfo.name || '';
              billingEmail = notesData.billingInfo.email || '';
              billingPhone = notesData.billingInfo.phone || '';
            }
            // shippingInfo도 체크 (이전 버전 호환)
            if (!billingName && notesData.shippingInfo) {
              billingName = notesData.shippingInfo.name || '';
              billingEmail = notesData.shippingInfo.email || '';
              billingPhone = notesData.shippingInfo.phone || '';
            }

            // 상품 정보 추출 (우선순위: notes.items > product_title)
            if (notesData.items && Array.isArray(notesData.items) && notesData.items.length > 0) {
              itemsInfo = notesData.items;
              itemCount = notesData.items.length;

              // 총 수량 계산: 각 아이템의 quantity 합산
              totalQuantity = notesData.items.reduce((sum: number, item: any) => {
                return sum + (item.quantity || 1);
              }, 0);

              // 첫 번째 아이템의 상품명 가져오기
              const firstItemTitle = notesData.items[0].title || notesData.items[0].name || '';

              if (itemCount > 1) {
                displayTitle = firstItemTitle ? `${firstItemTitle} 외 ${itemCount - 1}개` : (order.product_title || '주문');
              } else {
                displayTitle = firstItemTitle || order.product_title || '주문';
              }
            } else if (!displayTitle) {
              displayTitle = '주문';
            }
          } catch (e) {
            console.error('❌ [Orders] notes 파싱 오류:', e, 'order_id:', order.id);
            displayTitle = order.product_title || '주문';
          }
        } else if (!displayTitle) {
          displayTitle = '주문';
        }

        // 혼합 주문의 경우 모든 bookings 정보 추가
        const orderNumber = order.gateway_transaction_id;
        const bookingsList = bookingsMap.get(orderNumber) || null;

        // 사용자 정보 우선순위
        // 1순위: notes의 billingInfo (주문 시 입력한 정보)
        // 2순위: users 테이블 (회원 정보)
        // 3순위: bookings 테이블의 shipping 정보 (배송지로 입력한 정보)
        const finalUserName = billingName || user?.name || order.shipping_name || '';
        const finalUserEmail = billingEmail || user?.email || '';
        const finalUserPhone = billingPhone || user?.phone || order.shipping_phone || '';

        // 카테고리 우선순위: listings.category → notes.category
        const finalCategory = order.category || categoryFromNotes;

        return {
          id: order.id,
          booking_id: order.booking_id,
          booking_number: order.booking_number,
          user_name: finalUserName,
          user_email: finalUserEmail,
          user_phone: finalUserPhone,
          product_name: displayTitle,
          product_title: displayTitle,
          listing_id: order.listing_id,
          amount: order.amount,
          total_amount: order.amount,
          subtotal: subtotal || (order.amount - deliveryFee),
          delivery_fee: deliveryFee,
          items_info: itemsInfo,
          bookings_list: bookingsList,
          item_count: itemCount,
          total_quantity: totalQuantity,
          status: order.booking_status || 'pending',
          payment_status: order.payment_status,
          created_at: order.created_at,
          start_date: order.start_date,
          end_date: order.end_date,
          num_adults: finalCategory === '팝업' ? totalQuantity : (order.adults || order.guests || 0),
          guests: finalCategory === '팝업' ? totalQuantity : (order.adults || order.guests || 0),
          num_children: order.children || 0,
          num_seniors: 0,
          category: finalCategory,
          is_popup: finalCategory === '팝업',
          order_number: actualOrderNumber,
          delivery_status: order.delivery_status,
          shipping_name: order.shipping_name || user?.name || '',
          shipping_phone: order.shipping_phone || user?.phone || '',
          shipping_address: order.shipping_address || user?.address || '',
          shipping_address_detail: order.shipping_address_detail || user?.detail_address || '',
          shipping_zipcode: order.shipping_zipcode || user?.postal_code || '',
          tracking_number: order.tracking_number || null,
          courier_company: order.courier_company || null
        };
      });
    } finally {
      await poolNeon.end();
    }

    return NextResponse.json({
      success: true,
      version: "2.0.0-app-router",
      orders: ordersWithUserInfo
    });
  } catch (error) {
    console.error('Admin Orders API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '주문 목록 조회 실패',
        orders: []
      },
      { status: 500 }
    );
  }
}
