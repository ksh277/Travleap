const { connect } = require('@planetscale/database');

/**
 * 숙박 객실 예약 가능 여부 조회 API
 * GET: 체크인/체크아웃 날짜로 예약 가능 객실 조회 및 가격 계산
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

  try {
    const { room_id, checkin_date, checkout_date } = req.query;

    if (!room_id || !checkin_date || !checkout_date) {
      return res.status(400).json({
        success: false,
        error: '객실 ID, 체크인 날짜, 체크아웃 날짜가 필요합니다.'
      });
    }

    // 숙박 일수 계산
    const checkinDateObj = new Date(checkin_date);
    const checkoutDateObj = new Date(checkout_date);
    const diffTime = checkoutDateObj - checkinDateObj;
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (nights < 1) {
      return res.status(400).json({
        success: false,
        error: '체크아웃 날짜는 체크인 날짜 이후여야 합니다.'
      });
    }

    // 체크인 날짜부터 체크아웃 전날까지의 재고 확인
    const availabilityData = await connection.execute(
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
        AND date < ?
      ORDER BY date ASC`,
      [room_id, checkin_date, checkout_date]
    );

    const dates = availabilityData.rows || [];

    // 모든 날짜에 대한 재고가 있는지 확인
    if (dates.length !== nights) {
      return res.status(404).json({
        success: false,
        error: `선택한 기간의 재고 정보가 없습니다. (요청: ${nights}일, 존재: ${dates.length}일)`
      });
    }

    // 예약 가능 여부 확인
    let isAvailable = true;
    let unavailableReason = null;
    let minAvailableRooms = Infinity;
    let totalPrice = 0;

    for (const dateData of dates) {
      // 판매 중지 여부
      if (!dateData.is_available) {
        isAvailable = false;
        unavailableReason = dateData.close_out_reason || '판매 중지';
        break;
      }

      // 재고 확인
      if (dateData.available_rooms < 1) {
        isAvailable = false;
        unavailableReason = '재고 부족 (매진)';
        break;
      }

      // 최소 숙박일 확인 (첫 날만)
      if (dateData.date === checkin_date && nights < dateData.min_stay_nights) {
        isAvailable = false;
        unavailableReason = `최소 ${dateData.min_stay_nights}박 이상 필요합니다.`;
        break;
      }

      // 가장 적은 재고 수 추적
      minAvailableRooms = Math.min(minAvailableRooms, dateData.available_rooms);

      // 가격 계산 (우선순위: 특가 > 공휴일 > 주말 > 기본)
      let dailyPrice = dateData.base_price_krw;
      if (dateData.special_price_krw) {
        dailyPrice = dateData.special_price_krw;
      } else if (dateData.holiday_price_krw) {
        dailyPrice = dateData.holiday_price_krw;
      } else if (dateData.weekend_price_krw) {
        dailyPrice = dateData.weekend_price_krw;
      }

      totalPrice += dailyPrice;
    }

    // 객실 정보 가져오기
    const roomInfo = await connection.execute(
      `SELECT
        r.id,
        r.room_name,
        r.room_type,
        r.max_occupancy,
        r.thumbnail_url,
        p.business_name as partner_name
      FROM rooms r
      LEFT JOIN accommodation_partners p ON r.partner_id = p.id
      WHERE r.id = ?`,
      [room_id]
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
          thumbnail: room.thumbnail_url,
          partner_name: room.partner_name
        },
        availability: {
          is_available: isAvailable,
          unavailable_reason: unavailableReason,
          available_rooms: isAvailable ? minAvailableRooms : 0,
          nights: nights,
          total_price_krw: isAvailable ? totalPrice : 0,
          average_price_per_night_krw: isAvailable ? Math.round(totalPrice / nights) : 0
        },
        dates: dates.map(d => ({
          date: d.date,
          available_rooms: d.available_rooms,
          price_krw: d.special_price_krw || d.holiday_price_krw || d.weekend_price_krw || d.base_price_krw,
          is_special: !!d.special_price_krw,
          is_holiday: !!d.holiday_price_krw,
          is_weekend: !!d.weekend_price_krw
        }))
      }
    });

  } catch (error) {
    console.error('❌ [예약 가능 여부 API 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '예약 가능 여부 조회 중 오류가 발생했습니다.'
    });
  }
};
