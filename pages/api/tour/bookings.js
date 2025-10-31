/**
 * 사용자용 - 투어 예약 API
 * POST /api/tour/bookings - 투어 예약 생성 - 금액 서버 검증 적용
 * GET /api/tour/bookings - 내 예약 목록 조회 (user_id 필요)
 */

const { connect } = require('@planetscale/database');

function generateBookingNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TOUR-${timestamp}-${random}`;
}

function generateVoucherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // POST: 투어 예약 생성
  if (req.method === 'POST') {
    try {
      const {
        schedule_id,
        user_id,
        participants, // [{name, age, phone, type: 'adult'|'child'|'infant'}]
        adult_count,
        child_count,
        infant_count,
        total_price_krw, // 클라이언트가 보낸 값 (검증 필요)
        special_requests
      } = req.body;

      // 필수 필드 검증
      if (!schedule_id || !user_id || !participants || total_price_krw === undefined) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        });
      }

      // 🔒 트랜잭션 시작
      await connection.execute('START TRANSACTION');

      try {
        // 일정 정보 및 잔여 좌석 확인 (FOR UPDATE로 락 획득)
        const scheduleResult = await connection.execute(`
          SELECT
            ts.*,
            tp.price_adult_krw,
            tp.price_child_krw,
            tp.price_infant_krw,
            tp.package_name,
            (ts.max_participants - ts.current_participants) as available_seats
          FROM tour_schedules ts
          JOIN tour_packages tp ON ts.package_id = tp.id
          WHERE ts.id = ? AND ts.status IN ('scheduled', 'confirmed')
          FOR UPDATE
        `, [schedule_id]);

        if (!scheduleResult.rows || scheduleResult.rows.length === 0) {
          await connection.execute('ROLLBACK');
          return res.status(404).json({
            success: false,
            error: '일정을 찾을 수 없거나 예약이 불가능합니다.'
          });
        }

        const schedule = scheduleResult.rows[0];
        const totalParticipants = (adult_count || 0) + (child_count || 0) + (infant_count || 0);

        // 잔여 좌석 확인
        if (schedule.available_seats < totalParticipants) {
          await connection.execute('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: `잔여 좌석이 부족합니다. (잔여: ${schedule.available_seats}석)`
          });
        }

        // 🔒 금액 검증 (보안: 클라이언트 조작 방지)
        // ⚠️ CRITICAL: 클라이언트가 보낸 total_price_krw를 절대 믿지 말 것!
        // DB에서 가격 정보를 조회하여 서버에서 재계산
        const priceAdult = parseFloat(schedule.price_adult_krw) || 0;
        const priceChild = parseFloat(schedule.price_child_krw) || 0;
        const priceInfant = parseFloat(schedule.price_infant_krw) || 0;

        const serverCalculatedTotal =
          (adult_count || 0) * priceAdult +
          (child_count || 0) * priceChild +
          (infant_count || 0) * priceInfant;

        console.log(`🔒 [Tour Booking] 서버 측 가격 재계산:
          - 성인 ${adult_count}명 × ${priceAdult}원 = ${(adult_count || 0) * priceAdult}원
          - 아동 ${child_count}명 × ${priceChild}원 = ${(child_count || 0) * priceChild}원
          - 유아 ${infant_count}명 × ${priceInfant}원 = ${(infant_count || 0) * priceInfant}원
          - 서버 계산 합계: ${serverCalculatedTotal}원
          - 클라이언트 값: ${total_price_krw}원`);

        // 클라이언트가 보낸 가격과 서버 계산이 다르면 거부
        if (Math.abs(serverCalculatedTotal - total_price_krw) > 1) {
          await connection.execute('ROLLBACK');
          console.error(`❌ [Tour Booking] 가격 조작 감지!
            - 클라이언트 total_price: ${total_price_krw}원
            - 서버 계산 total: ${serverCalculatedTotal}원
            - 차이: ${Math.abs(serverCalculatedTotal - total_price_krw)}원`);

          return res.status(400).json({
            success: false,
            error: 'PRICE_TAMPERED',
            message: '예약 금액이 조작되었습니다. 페이지를 새로고침해주세요.'
          });
        }

        // 예약 번호 및 바우처 코드 생성
        const booking_number = generateBookingNumber();
        const voucher_code = generateVoucherCode();

        // 예약 생성 (서버 검증된 가격 사용)
        const result = await connection.execute(`
          INSERT INTO tour_bookings (
            booking_number,
            schedule_id,
            user_id,
            participants,
            adult_count,
            child_count,
            infant_count,
            total_price_krw,
            voucher_code,
            special_requests,
            status,
            payment_status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW(), NOW())
        `, [
          booking_number,
          schedule_id,
          user_id,
          JSON.stringify(participants),
          adult_count || 0,
          child_count || 0,
          infant_count || 0,
          serverCalculatedTotal, // 서버 계산 가격 사용
          voucher_code,
          special_requests || null
        ]);

        // 일정의 참가자 수 업데이트 (트랜잭션 내에서 원자적 처리)
        await connection.execute(`
          UPDATE tour_schedules
          SET current_participants = current_participants + ?,
              updated_at = NOW()
          WHERE id = ?
        `, [totalParticipants, schedule_id]);

        // 🔒 트랜잭션 커밋
        await connection.execute('COMMIT');

        console.log(`✅ [Tour Booking] 생성 완료: ${booking_number}, user_id=${user_id}, ${totalParticipants}명, ${serverCalculatedTotal}원`);

        return res.status(201).json({
          success: true,
          booking: {
            id: result.insertId,
            booking_number,
            voucher_code,
            total_price_krw: serverCalculatedTotal,
            package_name: schedule.package_name,
            participants: totalParticipants
          }
        });

      } catch (innerError) {
        // 트랜잭션 롤백
        await connection.execute('ROLLBACK');
        throw innerError;
      }

    } catch (error) {
      console.error('❌ [Tour Bookings POST] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET: 내 예약 목록 조회
  if (req.method === 'GET') {
    try {
      const { user_id } = req.query;

      if (!user_id) {
        return res.status(401).json({
          success: false,
          error: '사용자 인증이 필요합니다.'
        });
      }

      const query = `
        SELECT
          tb.*,
          tp.package_name,
          tp.thumbnail_url,
          tp.duration_days,
          tp.duration_nights,
          ts.departure_date,
          ts.departure_time,
          ts.guide_name,
          l.location
        FROM tour_bookings tb
        LEFT JOIN tour_schedules ts ON tb.schedule_id = ts.id
        LEFT JOIN tour_packages tp ON ts.package_id = tp.id
        LEFT JOIN listings l ON tp.listing_id = l.id
        WHERE tb.user_id = ?
        ORDER BY tb.created_at DESC
      `;

      const result = await connection.execute(query, [user_id]);

      const bookings = (result.rows || []).map(booking => ({
        ...booking,
        participants: booking.participants ? JSON.parse(booking.participants) : []
      }));

      return res.status(200).json({
        success: true,
        bookings
      });

    } catch (error) {
      console.error('❌ [Tour Bookings GET] Error:', error);
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
