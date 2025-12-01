/**
 * 정산 관리 API (Vercel Pages 라우팅용)
 * GET /api/admin/settlements - 파트너별 정산 내역 조회
 */

const { connect } = require('@planetscale/database');

// 기본 수수료율
const DEFAULT_COMMISSION_RATE = 10;
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
    const { start_date, end_date } = req.query;

    let settlements = [];
    let errors = [];

    // 1. 렌트카 벤더 정산 조회
    try {
      let rentcarQuery = `
        SELECT
          rv.id as partner_id,
          rv.business_name as business_name,
          'rentcar' as partner_type,
          COALESCE(rv.contact_email, rv.email, '') as email,
          COUNT(rb.id) as total_orders,
          COALESCE(SUM(rb.total_krw), 0) as total_sales,
          COALESCE(SUM(rb.refund_amount_krw), 0) as total_refunded,
          MIN(rb.created_at) as first_order_date,
          MAX(rb.created_at) as last_order_date
        FROM rentcar_vendors rv
        LEFT JOIN rentcar_bookings rb ON rb.vendor_id = rv.id
          AND rb.status IN ('confirmed', 'completed', 'checked_in', 'in_progress', 'returned')
      `;

      const rentcarParams = [];
      if (start_date) {
        rentcarQuery += ` AND rb.created_at >= ?`;
        rentcarParams.push(start_date);
      }
      if (end_date) {
        rentcarQuery += ` AND rb.created_at <= ?`;
        rentcarParams.push(end_date + ' 23:59:59');
      }
      rentcarQuery += ` GROUP BY rv.id, rv.business_name, rv.contact_email, rv.email`;
      rentcarQuery += ` HAVING total_orders > 0`;
      rentcarQuery += ` ORDER BY total_sales DESC`;

      const rentcarResult = await connection.execute(rentcarQuery, rentcarParams);
      if (rentcarResult.rows && rentcarResult.rows.length > 0) {
        settlements.push(...rentcarResult.rows);
      }
    } catch (e) {
      console.error('렌트카 정산 쿼리 오류:', e.message);
      errors.push('렌트카: ' + e.message);
    }

    // 2. 숙박 정산 조회
    try {
      let lodgingQuery = `
        SELECT
          lb.listing_id as partner_id,
          COALESCE(l.title, CONCAT('숙박 #', lb.listing_id)) as business_name,
          'lodging' as partner_type,
          COALESCE(p.email, '') as email,
          COUNT(lb.id) as total_orders,
          COALESCE(SUM(lb.total_amount), 0) as total_sales,
          0 as total_refunded,
          MIN(lb.created_at) as first_order_date,
          MAX(lb.created_at) as last_order_date
        FROM lodging_bookings lb
        LEFT JOIN listings l ON lb.listing_id = l.id
        LEFT JOIN partners p ON l.partner_id = p.id
        WHERE lb.booking_status IN ('confirmed', 'checked_in', 'checked_out')
      `;

      const lodgingParams = [];
      if (start_date) {
        lodgingQuery += ` AND lb.created_at >= ?`;
        lodgingParams.push(start_date);
      }
      if (end_date) {
        lodgingQuery += ` AND lb.created_at <= ?`;
        lodgingParams.push(end_date + ' 23:59:59');
      }
      lodgingQuery += ` GROUP BY lb.listing_id, l.title, p.email`;
      lodgingQuery += ` HAVING total_orders > 0`;
      lodgingQuery += ` ORDER BY total_sales DESC`;

      const lodgingResult = await connection.execute(lodgingQuery, lodgingParams);
      if (lodgingResult.rows && lodgingResult.rows.length > 0) {
        settlements.push(...lodgingResult.rows);
      }
    } catch (e) {
      console.error('숙박 정산 쿼리 오류:', e.message);
      errors.push('숙박: ' + e.message);
    }

    // 수수료 및 정산 금액 계산
    const processedSettlements = settlements.map(settlement => {
      let commissionRate = DEFAULT_COMMISSION_RATE;
      if (settlement.partner_type === 'rentcar') {
        commissionRate = RENTCAR_COMMISSION_RATE;
      } else if (settlement.partner_type === 'lodging') {
        commissionRate = LODGING_COMMISSION_RATE;
      }

      const totalSales = parseFloat(settlement.total_sales || 0);
      const totalRefunded = parseFloat(settlement.total_refunded || 0);
      const netSales = totalSales - totalRefunded;
      const commissionAmount = Math.round((netSales * commissionRate) / 100);
      const settlementAmount = netSales - commissionAmount;

      return {
        partner_id: settlement.partner_id,
        business_name: settlement.business_name || '이름 없음',
        partner_type: settlement.partner_type,
        email: settlement.email || '',
        total_orders: parseInt(settlement.total_orders) || 0,
        total_sales: totalSales,
        total_refunded: totalRefunded,
        net_sales: netSales,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        settlement_amount: settlementAmount,
        first_order_date: settlement.first_order_date,
        last_order_date: settlement.last_order_date,
        status: 'pending'
      };
    });

    // 통계 계산
    const totalStats = processedSettlements.reduce((acc, s) => ({
      total_partners: acc.total_partners + 1,
      total_orders: acc.total_orders + s.total_orders,
      total_sales: acc.total_sales + s.total_sales,
      total_refunded: acc.total_refunded + s.total_refunded,
      total_net_sales: acc.total_net_sales + s.net_sales,
      total_commission: acc.total_commission + s.commission_amount,
      total_settlement: acc.total_settlement + s.settlement_amount
    }), {
      total_partners: 0,
      total_orders: 0,
      total_sales: 0,
      total_refunded: 0,
      total_net_sales: 0,
      total_commission: 0,
      total_settlement: 0
    });

    console.log(`✅ 정산 내역 조회 완료: ${processedSettlements.length}개 파트너`);

    return res.status(200).json({
      success: true,
      data: processedSettlements,
      stats: totalStats,
      errors: errors.length > 0 ? errors : undefined,
      filters: { start_date, end_date }
    });

  } catch (error) {
    console.error('❌ 정산 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: '정산 데이터 조회 중 오류가 발생했습니다'
    });
  }
};
