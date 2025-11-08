/**
 * 주문 알림 이메일 발송 유틸리티
 */

const { connect } = require('@planetscale/database');
const { createOrderNotificationEmail, createOrderNotificationText } = require('./email-templates.cjs');

/**
 * 주문 카테고리에 따라 벤더 이메일 조회
 */
async function getVendorEmail(orderId, category, connection) {
  try {
    // 렌트카 주문
    if (category === '렌트카' || category === 'rentcar') {
      const result = await connection.execute(`
        SELECT rv.contact_email, rv.brand_name
        FROM rentcar_bookings rb
        JOIN rentcar_vendors rv ON rb.vendor_id = rv.id
        WHERE rb.id = ?
      `, [orderId]);

      if (result.rows && result.rows.length > 0) {
        return {
          email: result.rows[0].contact_email,
          vendorName: result.rows[0].brand_name
        };
      }
    }

    // 숙박 주문
    if (category === '숙박' || category === 'accommodation') {
      const result = await connection.execute(`
        SELECT av.contact_email, av.brand_name
        FROM bookings b
        JOIN accommodation_vendors av ON b.vendor_id = av.id
        WHERE b.id = ?
      `, [orderId]);

      if (result.rows && result.rows.length > 0) {
        return {
          email: result.rows[0].contact_email,
          vendorName: result.rows[0].brand_name
        };
      }
    }

    // 팝업/일반 주문 - listings를 통해 partner 찾기
    const listingResult = await connection.execute(`
      SELECT p.email, p.business_name, c.listing_id
      FROM cart_items c
      JOIN listings l ON c.listing_id = l.id
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE c.payment_id = ?
      LIMIT 1
    `, [orderId]);

    if (listingResult.rows && listingResult.rows.length > 0 && listingResult.rows[0].email) {
      return {
        email: listingResult.rows[0].email,
        vendorName: listingResult.rows[0].business_name
      };
    }

    // 벤더를 찾을 수 없는 경우
    console.warn(`⚠️ 주문 ${orderId}에 대한 벤더 이메일을 찾을 수 없습니다.`);
    return null;

  } catch (error) {
    console.error(`❌ 벤더 이메일 조회 실패 (주문 ${orderId}):`, error);
    return null;
  }
}

/**
 * 주문 알림 이메일 발송
 * @param {Object} orderData - 주문 데이터
 * @param {string} orderData.id - 주문 ID
 * @param {string} orderData.orderNumber - 주문번호
 * @param {string} orderData.category - 카테고리
 * @param {string} orderData.productName - 상품명
 * @param {string} orderData.customerName - 주문자명
 * @param {string} orderData.customerEmail - 주문자 이메일
 * @param {string} orderData.customerPhone - 주문자 연락처
 * @param {number} orderData.amount - 결제 금액
 * @param {number} orderData.quantity - 수량
 * @param {string} orderData.bookingDate - 예약일 (선택)
 * @param {string} orderData.reservationInfo - 예약 정보 (선택)
 */
async function sendOrderNotification(orderData) {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // 벤더 이메일 조회
    const vendorInfo = await getVendorEmail(orderData.id, orderData.category, connection);

    if (!vendorInfo || !vendorInfo.email) {
      console.warn(`⚠️ 주문 ${orderData.orderNumber}: 벤더 이메일 없음, 알림 발송 스킵`);
      return { success: false, reason: 'No vendor email found' };
    }

    // 이메일 템플릿 생성
    const emailData = {
      ...orderData,
      vendorName: vendorInfo.vendorName,
      orderDate: orderData.orderDate || new Date().toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    const htmlContent = createOrderNotificationEmail(emailData);
    const textContent = createOrderNotificationText(emailData);

    // 이메일 발송 (SendGrid or 다른 서비스)
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/shared/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: vendorInfo.email,
        subject: `[Travleap] 새 주문 알림 - ${orderData.orderNumber}`,
        html: htmlContent,
        text: textContent
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ 주문 알림 이메일 발송 성공: ${vendorInfo.email} (주문 ${orderData.orderNumber})`);
      return { success: true, email: vendorInfo.email };
    } else {
      console.error(`❌ 주문 알림 이메일 발송 실패: ${vendorInfo.email}`, result.error);
      return { success: false, error: result.error };
    }

  } catch (error) {
    console.error('❌ 주문 알림 발송 중 오류:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendOrderNotification,
  getVendorEmail
};
