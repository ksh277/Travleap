const { connect } = require('@planetscale/database');

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

  try {
    const { vendorId } = req.query;
    const connection = connect({ url: process.env.DATABASE_URL });

    // 해당 업체의 모든 활성 예약 조회 (rentcar_bookings 테이블이 있다고 가정)
    // 테이블이 없으면 빈 배열 반환
    let bookings = [];

    try {
      const bookingsResult = await connection.execute(`
        SELECT
          rb.id,
          rb.vehicle_id,
          rb.pickup_date,
          rb.dropoff_date,
          rb.status
        FROM rentcar_bookings rb
        JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
        WHERE rv.vendor_id = ?
          AND rb.status IN ('confirmed', 'pending', 'in_progress')
          AND rb.dropoff_date >= CURDATE()
        ORDER BY rb.pickup_date ASC
      `, [vendorId]);

      bookings = bookingsResult || [];
    } catch (error) {
      // rentcar_bookings 테이블이 없을 수 있으므로 에러는 무시하고 빈 배열 반환
      console.log('No bookings table or no data:', error.message);
    }

    return res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
