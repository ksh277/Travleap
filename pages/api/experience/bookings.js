/**
 * 체험 예약 API - 금액 서버 검증 적용
 * POST /api/experience/bookings - 체험 예약
 * GET /api/experience/bookings - 내 예약 목록 조회
 */

const { connect } = require('@planetscale/database');

function generateBookingNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `EXP${timestamp}${random}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // POST: 체험 예약
  if (req.method === 'POST') {
    try {
      const {
        experience_id,
        user_id,
        experience_date,
        experience_time,
        num_adults,
        num_children = 0,
        total_krw, // 클라이언트가 보낸 값 (검증 필요)
        participant_names,
        participant_ages,
        special_requests,
        contact_name,
        contact_email,
        contact_phone
      } = req.body;

      if (!experience_id || !user_id || !experience_date || !experience_time || !num_adults) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        });
      }

      // 🔒 트랜잭션 시작
      await connection.execute('START TRANSACTION');

      try {
        // 체험 조회 및 정원 확인 (FOR UPDATE로 락 획득)
        const experienceQuery = `
          SELECT
            e.*,
            SUM(CASE WHEN eb.status IN ('confirmed', 'pending') THEN eb.total_participants ELSE 0 END) as booked_participants
          FROM experiences e
          LEFT JOIN experience_bookings eb ON e.id = eb.experience_id
            AND eb.experience_date = ?
            AND eb.experience_time = ?
          WHERE e.id = ? AND e.is_active = 1
          GROUP BY e.id
          FOR UPDATE
        `;

        const experienceResult = await connection.execute(
          experienceQuery,
          [experience_date, experience_time, experience_id]
        );

        if (!experienceResult.rows || experienceResult.rows.length === 0) {
          await connection.execute('ROLLBACK');
          return res.status(404).json({
            success: false,
            error: '체험을 찾을 수 없습니다.'
          });
        }

        const experience = experienceResult.rows[0];
        const totalParticipants = num_adults + num_children;

        // 최소 인원 확인
        if (totalParticipants < experience.min_participants) {
          await connection.execute('ROLLBACK');
          return res.status(400).json({
            success: false,
            error: `최소 ${experience.min_participants}명 이상 예약 가능합니다.`
          });
        }

        // 최대 인원 확인 (동시성 제어)
        if (experience.max_participants) {
          const bookedParticipants = parseInt(experience.booked_participants) || 0;
          const availableSpots = experience.max_participants - bookedParticipants;

          if (totalParticipants > availableSpots) {
            await connection.execute('ROLLBACK');
            return res.status(400).json({
              success: false,
              error: `정원 초과입니다. (남은 인원: ${availableSpots}명)`
            });
          }
        }

        // 🔒 가격 검증 (서버에서 재계산)
        const priceAdult = parseFloat(experience.price_per_person_krw) || 0;
        const priceChild = parseFloat(experience.child_price_krw || experience.price_per_person_krw) || 0;

        const serverCalculatedTotal = (num_adults * priceAdult) + (num_children * priceChild);

        console.log(`🔒 [Experience Booking] 서버 측 가격 재계산:
          - 성인 ${num_adults}명 × ${priceAdult}원 = ${num_adults * priceAdult}원
          - 아동 ${num_children}명 × ${priceChild}원 = ${num_children * priceChild}원
          - 서버 계산 합계: ${serverCalculatedTotal}원
          - 클라이언트 값: ${total_krw}원`);

        // 클라이언트가 보낸 가격과 서버 계산이 다르면 거부
        if (total_krw !== undefined && Math.abs(serverCalculatedTotal - total_krw) > 1) {
          await connection.execute('ROLLBACK');
          console.error(`❌ [Experience Booking] 가격 조작 감지!
            - 클라이언트 total: ${total_krw}원
            - 서버 계산 total: ${serverCalculatedTotal}원
            - 차이: ${Math.abs(serverCalculatedTotal - total_krw)}원`);

          return res.status(400).json({
            success: false,
            error: 'PRICE_TAMPERED',
            message: '예약 금액이 조작되었습니다. 페이지를 새로고침해주세요.'
          });
        }

        const booking_number = generateBookingNumber();

        // 예약 생성 (서버 검증된 가격 사용)
        const result = await connection.execute(`
          INSERT INTO experience_bookings (
            experience_id,
            user_id,
            booking_number,
            experience_date,
            experience_time,
            num_adults,
            num_children,
            total_participants,
            price_per_adult_krw,
            price_per_child_krw,
            total_krw,
            participant_names,
            participant_ages,
            special_requests,
            contact_name,
            contact_email,
            contact_phone,
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
        `, [
          experience_id,
          user_id,
          booking_number,
          experience_date,
          experience_time,
          num_adults,
          num_children,
          totalParticipants,
          priceAdult,
          priceChild,
          serverCalculatedTotal, // 서버 계산 가격 사용
          participant_names || null,
          participant_ages || null,
          special_requests || null,
          contact_name || null,
          contact_email || null,
          contact_phone || null
        ]);

        // 🔒 트랜잭션 커밋
        await connection.execute('COMMIT');

        console.log(`✅ [Experience Booking] 예약 생성: ${booking_number}, experience_id=${experience_id}, user_id=${user_id}, total=${serverCalculatedTotal}원`);

        return res.status(201).json({
          success: true,
          message: '체험 예약이 완료되었습니다.',
          booking_id: result.insertId,
          booking_number,
          total_krw: serverCalculatedTotal
        });

      } catch (innerError) {
        // 트랜잭션 롤백
        await connection.execute('ROLLBACK');
        throw innerError;
      }

    } catch (error) {
      console.error('❌ [Experience Bookings POST] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // GET: 예약 목록 조회
  if (req.method === 'GET') {
    try {
      const { user_id, booking_id, status } = req.query;

      if (!user_id && !booking_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id 또는 booking_id가 필요합니다.'
        });
      }

      let query = `
        SELECT
          eb.*,
          e.name as experience_name,
          e.location,
          e.address,
          e.duration_minutes,
          e.meeting_point,
          e.thumbnail_url as experience_thumbnail,
          e.instructor_name
        FROM experience_bookings eb
        LEFT JOIN experiences e ON eb.experience_id = e.id
        WHERE 1=1
      `;

      const params = [];

      if (booking_id) {
        query += ` AND eb.id = ?`;
        params.push(booking_id);
      } else if (user_id) {
        query += ` AND eb.user_id = ?`;
        params.push(user_id);
      }

      if (status) {
        query += ` AND eb.status = ?`;
        params.push(status);
      }

      query += ` ORDER BY eb.experience_date DESC, eb.experience_time DESC, eb.created_at DESC`;

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        bookings: result.rows || []
      });

    } catch (error) {
      console.error('❌ [Experience Bookings GET] Error:', error);
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
