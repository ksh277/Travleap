/**
 * 정산 관리 API
 * GET /api/admin/settlements - 파트너별 정산 내역 조회
 *
 * payments, bookings, listings, partners 테이블을 조인하여
 * 파트너별 매출, 수수료, 정산금액 계산
 */

const { connect } = require('@planetscale/database');

// 기본 수수료율
const DEFAULT_COMMISSION_RATE = 10; // 10%
const RENTCAR_COMMISSION_RATE = 15; // 렌트카 15%
const LODGING_COMMISSION_RATE = 15; // 숙박 15%

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    const { partner_id, start_date, end_date, status } = req.query;

    // 1. 렌트카 벤더 정산
    let rentcarQuery = `
      SELECT
        rv.id as partner_id,
        rv.business_name,
        'rentcar' as partner_type,
        rv.contact_email as email,
        COUNT(DISTINCT rb.id) as total_orders,
        SUM(CASE
          WHEN rb.payment_status IN ('paid', 'captured') THEN rb.total_price_krw
          ELSE 0
        END) as total_sales,
        0 as total_refunded,
        MIN(rb.created_at) as first_order_date,
        MAX(rb.created_at) as last_order_date
      FROM rentcar_vendors rv
      LEFT JOIN rentcar_bookings rb ON rb.vendor_id = rv.id
      WHERE 1=1
    `;

    const rentcarParams = [];
    if (start_date) {
      rentcarQuery += ` AND rb.created_at >= ?`;
      rentcarParams.push(start_date);
    }
    if (end_date) {
      rentcarQuery += ` AND rb.created_at <= ?`;
      rentcarParams.push(end_date);
    }
    rentcarQuery += ` GROUP BY rv.id, rv.business_name, rv.contact_email`;
    rentcarQuery += ` HAVING total_orders > 0`;

    // 2. 숙박 파트너 정산 (partners 테이블 기반)
    let lodgingQuery = `
      SELECT
        p.id as partner_id,
        p.business_name,
        p.partner_type,
        p.email,
        COUNT(DISTINCT pay.id) as total_orders,
        SUM(CASE
          WHEN pay.payment_status IN ('paid', 'captured') THEN pay.amount
          ELSE 0
        END) as total_sales,
        SUM(COALESCE(pay.refund_amount, 0)) as total_refunded,
        MIN(pay.created_at) as first_order_date,
        MAX(pay.created_at) as last_order_date
      FROM partners p
      LEFT JOIN listings l ON l.partner_id = p.id
      LEFT JOIN bookings b ON b.listing_id = l.id
      LEFT JOIN payments pay ON pay.booking_id = b.id
      WHERE p.partner_type = 'lodging'
    `;

    const lodgingParams = [];
    if (start_date) {
      lodgingQuery += ` AND pay.created_at >= ?`;
      lodgingParams.push(start_date);
    }
    if (end_date) {
      lodgingQuery += ` AND pay.created_at <= ?`;
      lodgingParams.push(end_date);
    }
    lodgingQuery += ` GROUP BY p.id, p.business_name, p.partner_type, p.email`;
    lodgingQuery += ` HAVING total_orders > 0`;

    console.log('정산 조회 쿼리 실행:', { partner_id, start_date, end_date });

    // 쿼리 실행
    const [rentcarResult, lodgingResult] = await Promise.all([
      connection.execute(rentcarQuery, rentcarParams),
      connection.execute(lodgingQuery, lodgingParams)
    ]);

    const settlements = [
      ...(rentcarResult.rows || []),
      ...(lodgingResult.rows || [])
    ];

    // 수수료 및 정산 금액 계산
    const processedSettlements = settlements.map(settlement => {
      // 수수료율 결정
      let commissionRate = DEFAULT_COMMISSION_RATE;
      if (settlement.partner_type === 'rentcar') {
        commissionRate = RENTCAR_COMMISSION_RATE;
      } else if (settlement.partner_type === 'lodging') {
        commissionRate = LODGING_COMMISSION_RATE;
      }

      // 순 매출 = 총 매출 - 환불
      const netSales = parseFloat(settlement.total_sales) - parseFloat(settlement.total_refunded);

      // 수수료 = 순 매출 * 수수료율
      const commissionAmount = (netSales * commissionRate) / 100;

      // 정산 금액 = 순 매출 - 수수료
      const settlementAmount = netSales - commissionAmount;

      return {
        partner_id: settlement.partner_id,
        business_name: settlement.business_name,
        partner_type: settlement.partner_type,
        email: settlement.email,
        total_orders: settlement.total_orders,
        total_sales: parseFloat(settlement.total_sales),
        total_refunded: parseFloat(settlement.total_refunded),
        net_sales: netSales,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        settlement_amount: settlementAmount,
        first_order_date: settlement.first_order_date,
        last_order_date: settlement.last_order_date,
        status: 'pending' // 기본 상태 (추후 DB에 저장 시 업데이트)
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
      filters: {
        partner_id,
        start_date,
        end_date,
        status
      }
    });

  } catch (error) {
    console.error('❌ 정산 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
