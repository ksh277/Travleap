const { connect } = require('@planetscale/database');

/**
 * 투어 출발 일정 조회 API
 * GET /api/tour/schedules/[packageId]
 *
 * 특정 패키지의 출발 일정 목록 (날짜별)
 *
 * Query Parameters:
 * - startDate: 시작 날짜 (YYYY-MM-DD)
 * - endDate: 종료 날짜 (YYYY-MM-DD)
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { packageId } = req.query;
    const { startDate, endDate } = req.query;

    if (!packageId) {
      return res.status(400).json({
        success: false,
        error: '패키지 ID가 필요합니다.'
      });
    }

    // 날짜 범위 설정 (기본: 오늘부터 90일)
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 일정 조회
    const result = await connection.execute(
      `SELECT
        ts.*,
        tp.package_name,
        tp.duration_days,
        tp.duration_nights,
        (ts.max_participants - ts.current_participants) as available_seats
       FROM tour_schedules ts
       INNER JOIN tour_packages tp ON ts.package_id = tp.id
       WHERE ts.package_id = ?
         AND ts.departure_date >= ?
         AND ts.departure_date <= ?
         AND ts.status IN ('scheduled', 'confirmed')
       ORDER BY ts.departure_date ASC, ts.departure_time ASC`,
      [packageId, start, end]
    );

    // 날짜별로 그룹화
    const schedulesByDate = {};
    result.rows.forEach(schedule => {
      const date = schedule.departure_date.toISOString().split('T')[0];
      if (!schedulesByDate[date]) {
        schedulesByDate[date] = [];
      }
      schedulesByDate[date].push({
        ...schedule,
        is_available: schedule.available_seats > 0,
        is_almost_full: schedule.available_seats <= 5 && schedule.available_seats > 0
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        schedules: result.rows,
        schedulesByDate,
        dateRange: {
          start,
          end
        }
      }
    });

  } catch (error) {
    console.error('❌ [Tour Schedules API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
