const { connect } = require('@planetscale/database');

/**
 * 숙박 캘린더 재고 초기화 API
 * POST: 특정 기간의 캘린더 재고 자동 생성
 * 예: 2025년 전체 또는 향후 1년
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      room_id,
      start_date,
      end_date,
      total_rooms,
      base_price_krw
    } = req.body;

    // 필수 필드 검증
    if (!room_id || !start_date || !end_date || !total_rooms || !base_price_krw) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      });
    }

    // 객실 존재 확인
    const roomCheck = await connection.execute(
      'SELECT id, room_name FROM rooms WHERE id = ?',
      [room_id]
    );

    if (!roomCheck.rows || roomCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '객실을 찾을 수 없습니다.'
      });
    }

    // 날짜 범위 계산
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const diffTime = Math.abs(endDateObj - startDateObj);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 730) {
      return res.status(400).json({
        success: false,
        error: '최대 2년(730일)까지만 초기화할 수 있습니다.'
      });
    }

    console.log(`📅 [캘린더 초기화] 객실 ${room_id}: ${start_date} ~ ${end_date} (${diffDays}일)`);

    // 날짜별 재고 생성
    const insertedDates = [];
    const skippedDates = [];

    for (let i = 0; i <= diffDays; i++) {
      const currentDate = new Date(startDateObj);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 0=일, 1=월, ..., 6=토

      // 주말 가격 (금요일, 토요일)
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
      const weekendPrice = isWeekend ? Math.round(base_price_krw * 1.3) : null;

      // 기존 데이터 확인 (중복 방지)
      const existingCheck = await connection.execute(
        'SELECT id FROM room_availability WHERE room_id = ? AND date = ?',
        [room_id, dateStr]
      );

      if (existingCheck.rows && existingCheck.rows.length > 0) {
        skippedDates.push(dateStr);
        continue;
      }

      // 재고 데이터 삽입
      await connection.execute(
        `INSERT INTO room_availability (
          room_id, date,
          total_rooms, available_rooms, booked_rooms, blocked_rooms,
          base_price_krw, weekend_price_krw,
          min_stay_nights, is_available
        ) VALUES (?, ?, ?, ?, 0, 0, ?, ?, 1, TRUE)`,
        [
          room_id,
          dateStr,
          total_rooms,
          total_rooms, // 처음에는 모두 available
          base_price_krw,
          weekendPrice
        ]
      );

      insertedDates.push(dateStr);
    }

    console.log(`✅ [캘린더 초기화 완료] 삽입: ${insertedDates.length}일, 건너뜀: ${skippedDates.length}일`);

    return res.status(201).json({
      success: true,
      data: {
        room_id,
        start_date,
        end_date,
        total_days: diffDays + 1,
        inserted: insertedDates.length,
        skipped: skippedDates.length
      },
      message: `캘린더가 초기화되었습니다. (${insertedDates.length}일 생성)`
    });

  } catch (error) {
    console.error('❌ [캘린더 초기화 API 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '캘린더 초기화 중 오류가 발생했습니다.'
    });
  }
};
