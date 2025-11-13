const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 최근 30일간의 일별 매출 데이터 조회
    const { days = 30 } = req.query;

    // 일반 주문 매출 (payments 테이블)
    const paymentsQuery = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(amount) as revenue
      FROM payments
      WHERE payment_status IN ('paid', 'captured')
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // 렌트카 매출 (rentcar_bookings 테이블)
    const rentcarQuery = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as order_count,
        SUM(total_price_krw) as revenue
      FROM rentcar_bookings
      WHERE payment_status IN ('paid', 'captured')
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const [paymentsResult, rentcarResult] = await Promise.all([
      connection.execute(paymentsQuery, [parseInt(days)]),
      connection.execute(rentcarQuery, [parseInt(days)])
    ]);

    // 날짜별로 데이터 병합
    const dateMap = new Map();

    // payments 데이터 추가
    (paymentsResult.rows || []).forEach(row => {
      const date = row.date.split('T')[0]; // YYYY-MM-DD 형식
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, revenue: 0, orders: 0 });
      }
      const entry = dateMap.get(date);
      entry.revenue += parseFloat(row.revenue) || 0;
      entry.orders += parseInt(row.order_count) || 0;
    });

    // rentcar 데이터 추가
    (rentcarResult.rows || []).forEach(row => {
      const date = row.date.split('T')[0]; // YYYY-MM-DD 형식
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, revenue: 0, orders: 0 });
      }
      const entry = dateMap.get(date);
      entry.revenue += parseFloat(row.revenue) || 0;
      entry.orders += parseInt(row.order_count) || 0;
    });

    // Map을 배열로 변환하고 날짜순 정렬
    const chartData = Array.from(dateMap.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // 날짜 형식 변경 (MM/DD)
    const formattedData = chartData.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
    }));

    console.log(`✅ 매출 차트 데이터 조회 완료: ${formattedData.length}일`);

    return res.status(200).json({
      success: true,
      data: formattedData,
      meta: {
        days: parseInt(days),
        total_revenue: formattedData.reduce((sum, d) => sum + d.revenue, 0),
        total_orders: formattedData.reduce((sum, d) => sum + d.orders, 0)
      }
    });

  } catch (error) {
    console.error('❌ 매출 차트 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
