/**
 * 가맹점 예약 API
 * POST /api/reservations - 날짜/시간 예약 생성
 * GET /api/reservations - 예약 목록 조회
 */

const { connect } = require('@planetscale/database');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // POST: 새 예약 생성
    if (req.method === 'POST') {
      const {
        vendor_id,
        category, // hotel, restaurant, attraction, experience, event, rentcar
        vendor_name,
        service_name,
        reservation_date,
        reservation_time,
        end_date, // 숙박의 경우 체크아웃 날짜
        party_size,
        num_adults = 2,
        num_children = 0,
        customer_name,
        customer_phone,
        customer_email,
        special_requests
      } = req.body;

      // 필수 항목 검증
      if (!vendor_id || !category || !reservation_date || !customer_name || !customer_phone) {
        return res.status(400).json({
          success: false,
          message: '필수 항목이 누락되었습니다.',
          required: {
            vendor_id: '가맹점 ID',
            category: '카테고리',
            reservation_date: '예약 날짜',
            customer_name: '예약자명',
            customer_phone: '연락처'
          }
        });
      }

      // 예약 번호 생성
      const order_number = `RES-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // DB에 예약 저장
      const insertResult = await connection.execute(`
        INSERT INTO reservations (
          order_number,
          vendor_id,
          category,
          vendor_name,
          service_name,
          reservation_date,
          reservation_time,
          end_date,
          party_size,
          num_adults,
          num_children,
          customer_name,
          customer_phone,
          customer_email,
          special_requests,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
      `, [
        order_number,
        vendor_id,
        category,
        vendor_name || '',
        service_name || '',
        reservation_date,
        reservation_time || null,
        end_date || null,
        party_size || num_adults + num_children,
        num_adults,
        num_children,
        customer_name,
        customer_phone,
        customer_email || '',
        special_requests || null
      ]);

      const reservation_id = insertResult.insertId;

      console.log(`✅ [Reservation] 예약 생성 완료: ${order_number}`);

      // 파트너 이메일 조회
      let vendorEmail = null;
      try {
        const vendorResult = await connection.execute(
          'SELECT email, contact_email FROM partners WHERE id = ? LIMIT 1',
          [vendor_id]
        );
        if (vendorResult.rows && vendorResult.rows.length > 0) {
          vendorEmail = vendorResult.rows[0].email || vendorResult.rows[0].contact_email;
        }
      } catch (emailQueryError) {
        console.error('⚠️ [Reservation] 파트너 이메일 조회 실패:', emailQueryError);
      }

      // 이메일 알림 발송 (비동기 - 실패해도 예약은 저장됨)
      if (vendorEmail) {
        try {
          await sendReservationEmail({
            vendor_email: vendorEmail,
            order_number,
            vendor_name: vendor_name || '가맹점',
            service_name: service_name || category,
            customer_name,
            customer_phone,
            customer_email,
            reservation_date,
            reservation_time,
            end_date,
            party_size: party_size || num_adults + num_children,
            special_requests
          });
        } catch (emailError) {
          console.error('⚠️ [Reservation] 이메일 발송 실패 (예약은 저장됨):', emailError);
        }
      }

      // 알림톡 발송 (비동기 - 실패해도 예약은 저장됨)
      try {
        await sendReservationAlimtalk({
          order_number,
          vendor_name: vendor_name || '가맹점',
          service_name: service_name || category,
          customer_name,
          customer_phone,
          reservation_date,
          reservation_time,
          end_date,
          party_size: party_size || num_adults + num_children,
          special_requests
        });
      } catch (alimtalkError) {
        console.error('⚠️ [Reservation] 알림톡 발송 실패 (예약은 저장됨):', alimtalkError);
      }

      return res.status(201).json({
        success: true,
        message: '예약이 완료되었습니다. 가맹점 확인 후 연락드립니다.',
        data: {
          reservation_id,
          order_number,
          status: 'pending'
        }
      });
    }

    // GET: 예약 목록 조회
    if (req.method === 'GET') {
      const { customer_phone, vendor_id, status } = req.query;

      let whereConditions = [];
      let queryParams = [];

      if (customer_phone) {
        whereConditions.push('customer_phone = ?');
        queryParams.push(customer_phone);
      }

      if (vendor_id) {
        whereConditions.push('vendor_id = ?');
        queryParams.push(vendor_id);
      }

      if (status) {
        whereConditions.push('status = ?');
        queryParams.push(status);
      }

      const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const result = await connection.execute(`
        SELECT
          id,
          order_number,
          vendor_id,
          category,
          vendor_name,
          service_name,
          reservation_date,
          reservation_time,
          end_date,
          party_size,
          num_adults,
          num_children,
          customer_name,
          customer_phone,
          customer_email,
          special_requests,
          status,
          created_at,
          updated_at
        FROM reservations
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT 100
      `, queryParams);

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Reservation] API error:', error);
    return res.status(500).json({
      success: false,
      message: '예약 처리 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}

/**
 * 예약 알림톡 발송 (가맹점 + 고객)
 */
async function sendReservationAlimtalk(reservation) {
  const {
    order_number,
    vendor_name,
    service_name,
    customer_name,
    customer_phone,
    reservation_date,
    reservation_time,
    end_date,
    party_size,
    special_requests
  } = reservation;

  // 날짜 포맷팅
  const dateStr = reservation_time
    ? `${reservation_date} ${reservation_time}`
    : reservation_date;

  const endDateStr = end_date ? ` ~ ${end_date}` : '';

  const message = `[Travleap] 새로운 예약이 접수되었습니다

📋 예약번호: ${order_number}
🏢 서비스: ${service_name}
📅 예약일시: ${dateStr}${endDateStr}
👤 예약자: ${customer_name}
📞 연락처: ${customer_phone}
👥 인원: ${party_size}명
${special_requests ? `📝 요청사항: ${special_requests}` : ''}

고객에게 예약 확정 연락을 해주세요.`;

  // 알림톡 발송
  if (process.env.VITE_KAKAO_ALIMTALK_API_KEY) {
    try {
      // 실제 카카오 알림톡 API 호출
      await fetch('https://alimtalk-api.bizmsg.kr/v2/sender/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'userid': process.env.VITE_KAKAO_BIZ_USER_ID || '',
          'Authorization': `Bearer ${process.env.VITE_KAKAO_ALIMTALK_API_KEY}`
        },
        body: JSON.stringify({
          senderkey: process.env.VITE_KAKAO_SENDER_KEY,
          tpl_code: 'new_reservation', // 템플릿 코드 (실제 등록한 코드로 변경)
          receiver: customer_phone.replace(/-/g, ''),
          recvname: vendor_name,
          message: message
        })
      });

      console.log('✅ [Reservation] 알림톡 발송 완료');
    } catch (error) {
      console.error('❌ [Reservation] 알림톡 발송 실패:', error);
      throw error;
    }
  } else {
    // 개발 모드: 콘솔 출력
    console.log('📱 [Reservation] 알림톡 발송 (개발 모드):');
    console.log(message);
  }
}

/**
 * 예약 이메일 발송 (가맹점 주인에게)
 */
async function sendReservationEmail(reservation) {
  const {
    vendor_email,
    order_number,
    vendor_name,
    service_name,
    customer_name,
    customer_phone,
    customer_email,
    reservation_date,
    reservation_time,
    end_date,
    party_size,
    special_requests
  } = reservation;

  // 날짜 포맷팅
  const dateStr = reservation_time
    ? `${reservation_date} ${reservation_time}`
    : reservation_date;

  const endDateStr = end_date ? ` ~ ${end_date}` : '';

  // HTML 이메일 본문
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .info-row { margin: 15px 0; padding: 10px; background-color: white; border-radius: 4px; }
        .label { font-weight: bold; color: #4F46E5; }
        .value { color: #333; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 새로운 예약이 접수되었습니다</h1>
        </div>
        <div class="content">
          <p>안녕하세요, ${vendor_name} 담당자님</p>
          <p>Travleap를 통해 새로운 예약이 들어왔습니다. 고객에게 예약 확정 연락을 부탁드립니다.</p>

          <div class="info-row">
            <span class="label">📋 예약번호:</span>
            <span class="value">${order_number}</span>
          </div>

          <div class="info-row">
            <span class="label">🏢 서비스:</span>
            <span class="value">${service_name}</span>
          </div>

          <div class="info-row">
            <span class="label">📅 예약일시:</span>
            <span class="value">${dateStr}${endDateStr}</span>
          </div>

          <div class="info-row">
            <span class="label">👤 예약자:</span>
            <span class="value">${customer_name}</span>
          </div>

          <div class="info-row">
            <span class="label">📞 연락처:</span>
            <span class="value">${customer_phone}</span>
          </div>

          ${customer_email ? `
          <div class="info-row">
            <span class="label">📧 이메일:</span>
            <span class="value">${customer_email}</span>
          </div>
          ` : ''}

          <div class="info-row">
            <span class="label">👥 인원:</span>
            <span class="value">${party_size}명</span>
          </div>

          ${special_requests ? `
          <div class="info-row">
            <span class="label">📝 요청사항:</span>
            <span class="value">${special_requests}</span>
          </div>
          ` : ''}

          <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
            ⚠️ 고객에게 예약 확정 여부를 빠른 시일 내에 연락해 주시기 바랍니다.
          </p>
        </div>

        <div class="footer">
          <p>이 이메일은 Travleap 예약 시스템에서 자동으로 발송되었습니다.</p>
          <p>문의사항이 있으시면 고객센터로 연락주세요.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // SendGrid API로 이메일 발송
  if (process.env.SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: vendor_email }],
            subject: `[Travleap] 새로운 예약 - ${order_number}`
          }],
          from: {
            email: 'noreply@travleap.com',
            name: 'Travleap 예약 시스템'
          },
          content: [{
            type: 'text/html',
            value: htmlContent
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
      }

      console.log(`✅ [Reservation] 이메일 발송 완료: ${vendor_email}`);
    } catch (error) {
      console.error('❌ [Reservation] 이메일 발송 실패:', error);
      throw error;
    }
  } else {
    // 개발 모드: 콘솔 출력
    console.log('📧 [Reservation] 이메일 발송 (개발 모드):');
    console.log(`To: ${vendor_email}`);
    console.log(`Subject: [Travleap] 새로운 예약 - ${order_number}`);
    console.log('HTML Content:', htmlContent.substring(0, 200) + '...');
  }
}

module.exports = withPublicCors(handler);
