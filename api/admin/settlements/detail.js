/**
 * 정산 관리 - 업체별 상세 정보 및 기간별 매출 조회 API
 * GET /api/admin/settlements/detail?partner_id=X&partner_type=rentcar
 *
 * 응답: 하루/한주/한달/총 매출 통계
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
    const { partner_id, partner_type } = req.query;

    if (!partner_id || !partner_type) {
      return res.status(400).json({
        success: false,
        error: 'partner_id and partner_type are required'
      });
    }

    console.log('[정산 상세] 조회:', { partner_id, partner_type });

    // 현재 시간 기준
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // 날짜를 MySQL 포맷으로 변환
    const formatDate = (date) => date.toISOString().split('T')[0];

    const todayStr = formatDate(today);
    const weekAgoStr = formatDate(weekAgo);
    const monthAgoStr = formatDate(monthAgo);

    let partnerInfo = {};
    let periodStats = {
      today: { total_orders: 0, total_sales: 0, total_refunded: 0 },
      this_week: { total_orders: 0, total_sales: 0, total_refunded: 0 },
      this_month: { total_orders: 0, total_sales: 0, total_refunded: 0 },
      total: { total_orders: 0, total_sales: 0, total_refunded: 0 }
    };

    if (partner_type === 'rentcar') {
      // 렌트카 벤더 정보 조회 (컬럼명: business_name, contact_email)
      const vendorResult = await connection.execute(
        'SELECT id, business_name, contact_email FROM rentcar_vendors WHERE id = ? LIMIT 1',
        [partner_id]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '업체를 찾을 수 없습니다.'
        });
      }

      partnerInfo = {
        partner_id: vendorResult.rows[0].id,
        business_name: vendorResult.rows[0].business_name,
        email: vendorResult.rows[0].contact_email,
        partner_type: 'rentcar',
        commission_rate: RENTCAR_COMMISSION_RATE
      };

      // 오늘 매출 (컬럼명: total_krw, status)
      const todayResult = await connection.execute(
        `SELECT
          COUNT(DISTINCT id) as total_orders,
          SUM(CASE WHEN status IN ('confirmed', 'completed', 'checked_in', 'in_progress', 'returned') THEN total_krw ELSE 0 END) as total_sales,
          COALESCE(SUM(refund_amount_krw), 0) as total_refunded
        FROM rentcar_bookings
        WHERE vendor_id = ? AND DATE(created_at) = ?`,
        [partner_id, todayStr]
      );

      // 이번 주 매출
      const weekResult = await connection.execute(
        `SELECT
          COUNT(DISTINCT id) as total_orders,
          SUM(CASE WHEN status IN ('confirmed', 'completed', 'checked_in', 'in_progress', 'returned') THEN total_krw ELSE 0 END) as total_sales,
          COALESCE(SUM(refund_amount_krw), 0) as total_refunded
        FROM rentcar_bookings
        WHERE vendor_id = ? AND created_at >= ?`,
        [partner_id, weekAgoStr]
      );

      // 이번 달 매출
      const monthResult = await connection.execute(
        `SELECT
          COUNT(DISTINCT id) as total_orders,
          SUM(CASE WHEN status IN ('confirmed', 'completed', 'checked_in', 'in_progress', 'returned') THEN total_krw ELSE 0 END) as total_sales,
          COALESCE(SUM(refund_amount_krw), 0) as total_refunded
        FROM rentcar_bookings
        WHERE vendor_id = ? AND created_at >= ?`,
        [partner_id, monthAgoStr]
      );

      // 전체 매출
      const totalResult = await connection.execute(
        `SELECT
          COUNT(DISTINCT id) as total_orders,
          SUM(CASE WHEN status IN ('confirmed', 'completed', 'checked_in', 'in_progress', 'returned') THEN total_krw ELSE 0 END) as total_sales,
          COALESCE(SUM(refund_amount_krw), 0) as total_refunded
        FROM rentcar_bookings
        WHERE vendor_id = ?`,
        [partner_id]
      );

      periodStats.today = todayResult.rows[0] || periodStats.today;
      periodStats.this_week = weekResult.rows[0] || periodStats.this_week;
      periodStats.this_month = monthResult.rows[0] || periodStats.this_month;
      periodStats.total = totalResult.rows[0] || periodStats.total;

    } else if (partner_type === 'lodging') {
      // 숙박: listing_id 기준으로 조회 (lodging_bookings 사용)
      // partner_id가 실제로 listing_id임
      const listingResult = await connection.execute(
        'SELECT id, title FROM listings WHERE id = ? LIMIT 1',
        [partner_id]
      );

      if (!listingResult.rows || listingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '숙박 업체를 찾을 수 없습니다.'
        });
      }

      // 파트너 정보 조회
      const partnerResult = await connection.execute(
        'SELECT p.email, p.phone FROM listings l LEFT JOIN partners p ON l.partner_id = p.id WHERE l.id = ? LIMIT 1',
        [partner_id]
      );

      partnerInfo = {
        partner_id: listingResult.rows[0].id,
        business_name: listingResult.rows[0].title,
        email: partnerResult.rows?.[0]?.email || '',
        partner_type: 'lodging',
        commission_rate: LODGING_COMMISSION_RATE
      };

      // 오늘 매출 (lodging_bookings 사용, booking_status 컬럼)
      const todayResult = await connection.execute(
        `SELECT
          COUNT(DISTINCT id) as total_orders,
          COALESCE(SUM(CASE WHEN booking_status IN ('confirmed', 'checked_in', 'checked_out') THEN total_amount ELSE 0 END), 0) as total_sales,
          0 as total_refunded
        FROM lodging_bookings
        WHERE listing_id = ? AND DATE(created_at) = ?`,
        [partner_id, todayStr]
      );

      // 이번 주 매출
      const weekResult = await connection.execute(
        `SELECT
          COUNT(DISTINCT id) as total_orders,
          COALESCE(SUM(CASE WHEN booking_status IN ('confirmed', 'checked_in', 'checked_out') THEN total_amount ELSE 0 END), 0) as total_sales,
          0 as total_refunded
        FROM lodging_bookings
        WHERE listing_id = ? AND created_at >= ?`,
        [partner_id, weekAgoStr]
      );

      // 이번 달 매출
      const monthResult = await connection.execute(
        `SELECT
          COUNT(DISTINCT id) as total_orders,
          COALESCE(SUM(CASE WHEN booking_status IN ('confirmed', 'checked_in', 'checked_out') THEN total_amount ELSE 0 END), 0) as total_sales,
          0 as total_refunded
        FROM lodging_bookings
        WHERE listing_id = ? AND created_at >= ?`,
        [partner_id, monthAgoStr]
      );

      // 전체 매출
      const totalResult = await connection.execute(
        `SELECT
          COUNT(DISTINCT id) as total_orders,
          COALESCE(SUM(CASE WHEN booking_status IN ('confirmed', 'checked_in', 'checked_out') THEN total_amount ELSE 0 END), 0) as total_sales,
          0 as total_refunded
        FROM lodging_bookings
        WHERE listing_id = ?`,
        [partner_id]
      );

      periodStats.today = todayResult.rows[0] || periodStats.today;
      periodStats.this_week = weekResult.rows[0] || periodStats.this_week;
      periodStats.this_month = monthResult.rows[0] || periodStats.this_month;
      periodStats.total = totalResult.rows[0] || periodStats.total;

    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid partner_type (must be rentcar or lodging)'
      });
    }

    // 각 기간별로 수수료 및 정산 금액 계산
    const calculateSettlement = (stats) => {
      const totalSales = parseFloat(stats.total_sales || 0);
      const totalRefunded = parseFloat(stats.total_refunded || 0);
      const netSales = totalSales - totalRefunded;
      const commissionAmount = (netSales * partnerInfo.commission_rate) / 100;
      const settlementAmount = netSales - commissionAmount;

      return {
        total_orders: parseInt(stats.total_orders || 0),
        total_sales: totalSales,
        total_refunded: totalRefunded,
        net_sales: netSales,
        commission_rate: partnerInfo.commission_rate,
        commission_amount: commissionAmount,
        settlement_amount: settlementAmount
      };
    };

    const processedStats = {
      today: calculateSettlement(periodStats.today),
      this_week: calculateSettlement(periodStats.this_week),
      this_month: calculateSettlement(periodStats.this_month),
      total: calculateSettlement(periodStats.total)
    };

    console.log(`✅ [정산 상세] 조회 완료: ${partnerInfo.business_name}`);

    return res.status(200).json({
      success: true,
      data: {
        partner_info: partnerInfo,
        period_stats: processedStats
      }
    });

  } catch (error) {
    console.error('❌ [정산 상세] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
