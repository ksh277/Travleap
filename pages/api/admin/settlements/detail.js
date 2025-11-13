/**
 * 정산 상세 정보 API - 기간별 통계
 * GET /api/admin/settlements/detail
 *
 * Query Parameters:
 * - partner_id: 파트너 ID (필수)
 * - partner_type: 'rentcar' | 'lodging' (필수)
 *
 * Returns:
 * - period_stats: { today, this_week, this_month, total }
 */

const { connect } = require('@planetscale/database');

const RENTCAR_COMMISSION_RATE = 15;
const LODGING_COMMISSION_RATE = 15;

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
    const { partner_id, partner_type } = req.query;

    if (!partner_id || !partner_type) {
      return res.status(400).json({
        success: false,
        error: 'partner_id and partner_type are required'
      });
    }

    console.log('📊 [Detail API] partner_id:', partner_id, 'type:', partner_type);

    const commissionRate = partner_type === 'rentcar' ? RENTCAR_COMMISSION_RATE : LODGING_COMMISSION_RATE;

    let periodStats = {
      today: null,
      this_week: null,
      this_month: null,
      total: null
    };

    // 렌트카 통계
    if (partner_type === 'rentcar') {
      const periods = [
        { key: 'today', condition: 'DATE(rb.created_at) = CURDATE()' },
        { key: 'this_week', condition: 'YEARWEEK(rb.created_at, 1) = YEARWEEK(CURDATE(), 1)' },
        { key: 'this_month', condition: 'YEAR(rb.created_at) = YEAR(CURDATE()) AND MONTH(rb.created_at) = MONTH(CURDATE())' },
        { key: 'total', condition: '1=1' }
      ];

      for (const period of periods) {
        const query = `
          SELECT
            COUNT(DISTINCT CASE WHEN rb.payment_status = 'paid' THEN rb.id END) as total_orders,
            COALESCE(SUM(CASE WHEN rb.payment_status = 'paid' THEN rb.total_krw ELSE 0 END), 0) as total_sales,
            COALESCE(SUM(CASE WHEN rb.payment_status = 'refunded' THEN rb.total_krw ELSE 0 END), 0) as total_refunded
          FROM rentcar_bookings rb
          WHERE rb.vendor_id = ? AND ${period.condition}
        `;

        const result = await connection.execute(query, [partner_id]);
        const data = result.rows[0];

        if (data && data.total_orders > 0) {
          const totalSales = parseFloat(data.total_sales || 0);
          const totalRefunded = parseFloat(data.total_refunded || 0);
          const netSales = totalSales - totalRefunded;
          const commissionAmount = Math.floor(netSales * commissionRate / 100);
          const settlementAmount = netSales - commissionAmount;

          periodStats[period.key] = {
            total_orders: parseInt(data.total_orders),
            total_sales: totalSales,
            total_refunded: totalRefunded,
            net_sales: netSales,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            settlement_amount: settlementAmount
          };
        }
      }
    }
    // 숙박 통계
    else if (partner_type === 'lodging') {
      const periods = [
        { key: 'today', condition: 'DATE(pay.created_at) = CURDATE()' },
        { key: 'this_week', condition: 'YEARWEEK(pay.created_at, 1) = YEARWEEK(CURDATE(), 1)' },
        { key: 'this_month', condition: 'YEAR(pay.created_at) = YEAR(CURDATE()) AND MONTH(pay.created_at) = MONTH(CURDATE())' },
        { key: 'total', condition: '1=1' }
      ];

      for (const period of periods) {
        const query = `
          SELECT
            COUNT(DISTINCT pay.id) as total_orders,
            COALESCE(SUM(CASE WHEN pay.payment_status = 'paid' THEN pay.amount ELSE 0 END), 0) as total_sales,
            COALESCE(SUM(COALESCE(pay.refund_amount, 0)), 0) as total_refunded
          FROM payments pay
          INNER JOIN bookings b ON pay.booking_id = b.id
          INNER JOIN listings l ON b.listing_id = l.id
          WHERE l.partner_id = ? AND ${period.condition}
        `;

        const result = await connection.execute(query, [partner_id]);
        const data = result.rows[0];

        if (data && data.total_orders > 0) {
          const totalSales = parseFloat(data.total_sales || 0);
          const totalRefunded = parseFloat(data.total_refunded || 0);
          const netSales = totalSales - totalRefunded;
          const commissionAmount = Math.floor(netSales * commissionRate / 100);
          const settlementAmount = netSales - commissionAmount;

          periodStats[period.key] = {
            total_orders: parseInt(data.total_orders),
            total_sales: totalSales,
            total_refunded: totalRefunded,
            net_sales: netSales,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            settlement_amount: settlementAmount
          };
        }
      }
    }

    console.log('✅ [Detail API] 기간별 통계 조회 완료');

    return res.status(200).json({
      success: true,
      data: {
        partner_id: parseInt(partner_id),
        partner_type,
        period_stats: periodStats
      }
    });

  } catch (error) {
    console.error('❌ [Detail API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
