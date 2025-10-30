const { connect } = require('@planetscale/database');

/**
 * 객실 월별 캘린더 데이터 API
 * GET: 특정 객실의 월별 캘린더 데이터 (예약 가능 여부 + 가격)
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // URL에서 roomId 추출
  const urlParts = req.url.split('/');
  const roomId = urlParts[urlParts.length - 1].split('?')[0];

  if (!roomId || roomId === 'calendar') {
    return res.status(400).json({
      success: false,
      error: 'Room ID is required'
    });
  }

  try {
    const { year, month } = req.query;

    // 현재 날짜 기준 또는 쿼리 파라미터
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;

    // 해당 월의 시작일과 종료일
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // 캘린더 데이터 조회
    const calendarData = await connection.execute(
      `SELECT
        date,
        total_rooms,
        available_rooms,
        booked_rooms,
        blocked_rooms,
        base_price_krw,
        weekend_price_krw,
        holiday_price_krw,
        special_price_krw,
        min_stay_nights,
        is_available,
        close_out_reason
      FROM room_availability
      WHERE room_id = ?
        AND date >= ?
        AND date <= ?
      ORDER BY date ASC`,
      [roomId, startDateStr, endDateStr]
    );

    const dates = calendarData.rows || [];

    // 날짜별 데이터 포맷팅
    const formattedDates = dates.map(d => {
      // 가격 우선순위: 특가 > 공휴일 > 주말 > 기본
      let displayPrice = d.base_price_krw;
      let priceLabel = '기본';

      if (d.special_price_krw) {
        displayPrice = d.special_price_krw;
        priceLabel = '특가';
      } else if (d.holiday_price_krw) {
        displayPrice = d.holiday_price_krw;
        priceLabel = '공휴일';
      } else if (d.weekend_price_krw) {
        displayPrice = d.weekend_price_krw;
        priceLabel = '주말';
      }

      // 가용성 상태
      let availabilityStatus = 'available'; // available, limited, soldout, closed
      if (!d.is_available) {
        availabilityStatus = 'closed';
      } else if (d.available_rooms === 0) {
        availabilityStatus = 'soldout';
      } else if (d.available_rooms <= 2) {
        availabilityStatus = 'limited';
      }

      return {
        date: d.date,
        day_of_week: new Date(d.date).getDay(), // 0=일, 1=월, ..., 6=토
        total_rooms: d.total_rooms,
        available_rooms: d.available_rooms,
        availability_status: availabilityStatus,
        price_krw: displayPrice,
        price_label: priceLabel,
        min_stay_nights: d.min_stay_nights,
        is_available: d.is_available,
        close_out_reason: d.close_out_reason
      };
    });

    // 객실 정보
    const roomInfo = await connection.execute(
      `SELECT
        r.id,
        r.room_name,
        r.room_type,
        r.max_occupancy,
        p.business_name as partner_name
      FROM rooms r
      LEFT JOIN accommodation_partners p ON r.partner_id = p.id
      WHERE r.id = ?`,
      [roomId]
    );

    if (!roomInfo.rows || roomInfo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '객실 정보를 찾을 수 없습니다.'
      });
    }

    const room = roomInfo.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: room.room_name,
          type: room.room_type,
          max_occupancy: room.max_occupancy,
          partner_name: room.partner_name
        },
        calendar: {
          year: currentYear,
          month: currentMonth,
          dates: formattedDates
        }
      }
    });

  } catch (error) {
    console.error('❌ [캘린더 데이터 API 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '캘린더 데이터 조회 중 오류가 발생했습니다.'
    });
  }
};
