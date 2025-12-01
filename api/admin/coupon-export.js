/**
 * 쿠폰 데이터 CSV 내보내기 API
 * GET /api/admin/coupon-export?type=usage|partners|daily
 *
 * CSV 형식으로 쿠폰 데이터를 내보냅니다.
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'GET 요청만 허용됩니다'
    });
  }

  // 관리자 권한 확인
  const adminRoles = ['admin', 'super_admin', 'md_admin'];
  if (!req.user || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: '관리자 권한이 필요합니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    const { type = 'usage', start_date, end_date } = req.query;

    let csv = '';
    let filename = '';

    // 기간 필터
    let dateFilter = '';
    let dateParams = [];
    if (start_date && end_date) {
      dateFilter = 'AND uc.used_at BETWEEN ? AND ?';
      dateParams = [start_date, end_date];
    }

    switch (type) {
      case 'usage': {
        // 쿠폰 사용 내역 전체
        const usageQuery = `
          SELECT
            uc.id,
            uc.coupon_code,
            uc.user_id,
            uc.order_amount,
            uc.discount_amount,
            uc.final_amount,
            uc.used_at,
            c.code as campaign_code,
            c.name as coupon_name,
            p.id as partner_id,
            p.business_name,
            p.services as category
          FROM user_coupons uc
          LEFT JOIN coupons c ON uc.coupon_id = c.id
          LEFT JOIN partners p ON uc.used_partner_id = p.id
          WHERE uc.status = 'USED' ${dateFilter}
          ORDER BY uc.used_at DESC
        `;

        const usageResult = await connection.execute(usageQuery, dateParams);
        const usageRows = usageResult.rows || [];

        // 유저 정보 조회
        const userIds = [...new Set(usageRows.map(r => r.user_id).filter(Boolean))];
        let userNames = {};
        if (userIds.length > 0) {
          try {
            const userResult = await poolNeon.query(
              `SELECT id, name, email FROM users WHERE id = ANY($1)`,
              [userIds]
            );
            userNames = userResult.rows.reduce((acc, u) => {
              acc[u.id] = { name: u.name, email: u.email };
              return acc;
            }, {});
          } catch (e) {
            console.warn('⚠️ Neon user query failed:', e.message);
          }
        }

        // CSV 헤더
        csv = 'ID,쿠폰코드,캠페인코드,쿠폰명,고객ID,고객명,고객이메일,주문금액,할인금액,최종금액,사용일시,가맹점ID,가맹점명,카테고리\n';

        // CSV 데이터
        usageRows.forEach(row => {
          const user = userNames[row.user_id] || {};
          csv += `${row.id},`;
          csv += `"${row.coupon_code || ''}",`;
          csv += `"${row.campaign_code || ''}",`;
          csv += `"${row.coupon_name || ''}",`;
          csv += `${row.user_id || ''},`;
          csv += `"${user.name || '고객'}",`;
          csv += `"${user.email || ''}",`;
          csv += `${row.order_amount || 0},`;
          csv += `${row.discount_amount || 0},`;
          csv += `${row.final_amount || 0},`;
          csv += `"${row.used_at ? new Date(row.used_at).toLocaleString('ko-KR') : ''}",`;
          csv += `${row.partner_id || ''},`;
          csv += `"${row.business_name || ''}",`;
          csv += `"${row.category || ''}"\n`;
        });

        filename = `coupon_usage_${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      }

      case 'partners': {
        // 가맹점별 통계
        const partnerQuery = `
          SELECT
            p.id,
            p.business_name,
            p.services as category,
            p.contact_name,
            p.contact_phone,
            p.contact_email,
            p.address,
            COALESCE(p.total_coupon_usage, 0) as total_usage,
            COALESCE(p.total_discount_given, 0) as total_discount,
            (
              SELECT COUNT(*)
              FROM user_coupons uc
              WHERE uc.used_partner_id = p.id AND uc.status = 'USED' ${dateFilter}
            ) as period_usage,
            (
              SELECT COALESCE(SUM(discount_amount), 0)
              FROM user_coupons uc
              WHERE uc.used_partner_id = p.id AND uc.status = 'USED' ${dateFilter}
            ) as period_discount,
            (
              SELECT COALESCE(SUM(order_amount), 0)
              FROM user_coupons uc
              WHERE uc.used_partner_id = p.id AND uc.status = 'USED' ${dateFilter}
            ) as period_orders
          FROM partners p
          WHERE p.is_coupon_partner = 1 AND p.status = 'approved'
          ORDER BY total_usage DESC
        `;

        const partnerResult = await connection.execute(partnerQuery, dateParams);
        const partnerRows = partnerResult.rows || [];

        // CSV 헤더
        csv = '가맹점ID,가맹점명,카테고리,담당자,전화번호,이메일,주소,총사용횟수,총할인금액,기간사용횟수,기간할인금액,기간주문금액\n';

        // CSV 데이터
        partnerRows.forEach(row => {
          csv += `${row.id},`;
          csv += `"${row.business_name || ''}",`;
          csv += `"${row.category || ''}",`;
          csv += `"${row.contact_name || ''}",`;
          csv += `"${row.contact_phone || ''}",`;
          csv += `"${row.contact_email || ''}",`;
          csv += `"${(row.address || '').replace(/"/g, '""')}",`;
          csv += `${row.total_usage || 0},`;
          csv += `${row.total_discount || 0},`;
          csv += `${row.period_usage || 0},`;
          csv += `${row.period_discount || 0},`;
          csv += `${row.period_orders || 0}\n`;
        });

        filename = `coupon_partners_${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      }

      case 'daily': {
        // 일별 통계
        const dailyQuery = `
          SELECT
            DATE(used_at) as date,
            COUNT(*) as usage_count,
            COALESCE(SUM(discount_amount), 0) as discount_amount,
            COALESCE(SUM(order_amount), 0) as order_amount,
            COALESCE(AVG(discount_amount), 0) as avg_discount
          FROM user_coupons
          WHERE status = 'USED'
          GROUP BY DATE(used_at)
          ORDER BY date DESC
          LIMIT 365
        `;

        const dailyResult = await connection.execute(dailyQuery);
        const dailyRows = dailyResult.rows || [];

        // CSV 헤더
        csv = '날짜,사용건수,할인금액합계,주문금액합계,평균할인금액\n';

        // CSV 데이터
        dailyRows.forEach(row => {
          csv += `"${row.date || ''}",`;
          csv += `${row.usage_count || 0},`;
          csv += `${row.discount_amount || 0},`;
          csv += `${row.order_amount || 0},`;
          csv += `${Math.round(row.avg_discount) || 0}\n`;
        });

        filename = `coupon_daily_${new Date().toISOString().slice(0, 10)}.csv`;
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: 'INVALID_TYPE',
          message: 'type은 usage, partners, daily 중 하나여야 합니다'
        });
    }

    // UTF-8 BOM 추가 (Excel에서 한글 깨짐 방지)
    const bom = '\uFEFF';
    const csvWithBom = bom + csv;

    console.log(`✅ [Admin] CSV 내보내기 완료: ${type}`);

    // CSV 응답
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvWithBom);

  } catch (error) {
    console.error('❌ [Admin Coupon Export] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'CSV 내보내기 중 오류가 발생했습니다'
    });
  } finally {
    try {
      await poolNeon.end();
    } catch (e) {
      // ignore
    }
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true, requireMDAdmin: true }));
