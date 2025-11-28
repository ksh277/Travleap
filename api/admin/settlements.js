/**
 * 정산 관리 API
 * GET /api/admin/settlements - 파트너별 정산 내역 조회
 *
 * 렌트카, 숙박, 일반 상품의 결제 내역을 집계하여 정산 데이터 제공
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

// 기본 수수료율
const DEFAULT_COMMISSION_RATE = 10; // 10%
const RENTCAR_COMMISSION_RATE = 15; // 렌트카 15%
const LODGING_COMMISSION_RATE = 15; // 숙박 15%

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  // 관리자 권한 확인
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: '관리자 권한이 필요합니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { partner_id, start_date, end_date, status } = req.query;

    // 1. 렌트카 벤더 정산 (실제 컬럼: business_name, contact_email, contact_phone)
    let rentcarQuery = `
      SELECT
        rv.id as partner_id,
        rv.business_name as business_name,
        'rentcar' as partner_type,
        rv.contact_email as email,
        rv.contact_phone as phone,
        COUNT(DISTINCT rb.id) as total_orders,
        SUM(CASE
          WHEN rb.status IN ('confirmed', 'completed', 'checked_in', 'in_progress', 'returned') THEN 1
          ELSE 0
        END) as confirmed_orders,
        SUM(rb.total_krw) as total_sales,
        COALESCE(SUM(rb.refund_amount_krw), 0) as total_refunded,
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
    rentcarQuery += ` GROUP BY rv.id, rv.business_name, rv.contact_email, rv.contact_phone`;
    rentcarQuery += ` HAVING total_orders > 0`;
    rentcarQuery += ` ORDER BY total_sales DESC`;

    // 2. 숙박 정산 (lodging_bookings 기반)
    let lodgingQuery = `
      SELECT
        lb.listing_id as partner_id,
        COALESCE(l.title, CONCAT('숙박 #', lb.listing_id)) as business_name,
        'lodging' as partner_type,
        p.email,
        p.phone,
        COUNT(DISTINCT lb.id) as total_orders,
        SUM(CASE
          WHEN lb.booking_status IN ('confirmed', 'checked_in', 'checked_out') THEN 1
          ELSE 0
        END) as confirmed_orders,
        COALESCE(SUM(lb.total_amount), 0) as total_sales,
        0 as total_refunded,
        MIN(lb.created_at) as first_order_date,
        MAX(lb.created_at) as last_order_date
      FROM lodging_bookings lb
      LEFT JOIN listings l ON lb.listing_id = l.id
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE 1=1
    `;

    const lodgingParams = [];
    if (start_date) {
      lodgingQuery += ` AND lb.created_at >= ?`;
      lodgingParams.push(start_date);
    }
    if (end_date) {
      lodgingQuery += ` AND lb.created_at <= ?`;
      lodgingParams.push(end_date);
    }
    lodgingQuery += ` GROUP BY lb.listing_id, l.title, p.email, p.phone`;
    lodgingQuery += ` HAVING total_orders > 0`;
    lodgingQuery += ` ORDER BY total_sales DESC`;

    // 3. 일반 결제 요약 (payments)
    let paymentsQuery = `
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount,
        COALESCE(SUM(refund_amount), 0) as refunded_amount
      FROM payments
      WHERE 1=1
    `;
    const paymentsParams = [];
    if (start_date) {
      paymentsQuery += ` AND created_at >= ?`;
      paymentsParams.push(start_date);
    }
    if (end_date) {
      paymentsQuery += ` AND created_at <= ?`;
      paymentsParams.push(end_date);
    }

    console.log('정산 조회 쿼리 실행:', { partner_id, start_date, end_date });

    // 쿼리 실행
    let rentcarResult = { rows: [] };
    let lodgingResult = { rows: [] };
    let paymentsResult = { rows: [] };

    try {
      rentcarResult = await connection.execute(rentcarQuery, rentcarParams);
    } catch (e) {
      console.error('렌트카 정산 쿼리 오류:', e.message);
    }

    try {
      lodgingResult = await connection.execute(lodgingQuery, lodgingParams);
    } catch (e) {
      console.error('숙박 정산 쿼리 오류:', e.message);
    }

    try {
      paymentsResult = await connection.execute(paymentsQuery, paymentsParams);
    } catch (e) {
      console.error('결제 요약 쿼리 오류:', e.message);
    }

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
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true, requireAdmin: true }));
