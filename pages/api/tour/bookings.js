/**
 * 사용자용 - 투어 예약 API
 * POST /api/tour/bookings - 투어 예약 생성
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
        total_price_krw,
        special_requests
      } = req.body;

      // 필수 필드 검증
      if (!schedule_id || !user_id || !participants || !total_price_krw) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        });
      }

      // 일정 정보 및 잔여 좌석 확인
      const scheduleResult = await connection.execute(`
        SELECT
          ts.*,
          (ts.max_participants - ts.current_participants) as available_seats
        FROM tour_schedules ts
        WHERE ts.id = ? AND ts.status IN ('scheduled', 'confirmed')
      `, [schedule_id]);

      if (!scheduleResult.rows || scheduleResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '일정을 찾을 수 없거나 예약이 불가능합니다.'
        });
      }

      const schedule = scheduleResult.rows[0];
      const totalParticipants = (adult_count || 0) + (child_count || 0) + (infant_count || 0);

      if (schedule.available_seats < totalParticipants) {
        return res.status(400).json({
          success: false,
          error: `잔여 좌석이 부족합니다. (잔여: ${schedule.available_seats}석)`
        });
      }

      // 예약 번호 및 바우처 코드 생성
      const booking_number = generateBookingNumber();
      const voucher_code = generateVoucherCode();

      // 예약 생성
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
        total_price_krw,
        voucher_code,
        special_requests || null
      ]);

      // 일정의 참가자 수 업데이트
      await connection.execute(`
        UPDATE tour_schedules
        SET current_participants = current_participants + ?,
            updated_at = NOW()
        WHERE id = ?
      `, [totalParticipants, schedule_id]);

      console.log(`✅ [Tour Booking] 생성 완료: ${booking_number}, user_id=${user_id}, ${totalParticipants}명`);

      return res.status(201).json({
        success: true,
        booking: {
          id: result.insertId,
          booking_number,
          voucher_code,
          total_price_krw
        }
      });

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
