/**
 * 렌트카 벤더 월별 정산 API
 *
 * 기능:
 * - 월별 대여료 합계
 * - 월별 보증금 환불 합계
 * - 월별 보증금 차감 합계
 * - 월별 추가 결제 합계
 *
 * 라우트: GET /api/vendor/monthly-settlement
 * 권한: 벤더, 관리자
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. JWT 인증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 2. 벤더 ID 확인
    let vendorId;
    if (decoded.role === 'admin') {
      vendorId = req.query.vendorId || req.body?.vendorId;
    } else {
      const vendorResult = await connection.execute(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '등록된 벤더 정보가 없습니다.' });
      }

      vendorId = vendorResult.rows[0].id;
    }

    if (req.method === 'GET') {
      try {
        // 쿼리 파라미터로 월 지정 (기본값: 현재 월)
        const { month, year } = req.query;
        const targetYear = year || new Date().getFullYear();
        const targetMonth = month || (new Date().getMonth() + 1);

        console.log(`📊 [Monthly Settlement] vendor_id: ${vendorId}, year: ${targetYear}, month: ${targetMonth}`);

        // 1. 월별 대여료 합계 (완료된 예약)
        const rentalRevenueResult = await connection.execute(
          `SELECT COALESCE(SUM(total_amount), 0) as rental_revenue
          FROM rentcar_bookings
          WHERE vendor_id = ?
            AND status = 'completed'
            AND YEAR(created_at) = ?
            AND MONTH(created_at) = ?`,
          [vendorId, targetYear, targetMonth]
        );

        // 2. 월별 추가 결제 합계 (지연 수수료, 파손 수수료 등)
        const additionalPaymentResult = await connection.execute(
          `SELECT COALESCE(SUM(late_return_fee_krw), 0) as late_fees,
                  COALESCE(SUM(other_charges_krw), 0) as other_charges
          FROM rentcar_bookings
          WHERE vendor_id = ?
            AND status IN ('completed', 'returned')
            AND YEAR(return_checked_out_at) = ?
            AND MONTH(return_checked_out_at) = ?`,
          [vendorId, targetYear, targetMonth]
        );

        const rentalRevenue = Number(rentalRevenueResult.rows[0]?.rental_revenue || 0);
        const lateFees = Number(additionalPaymentResult.rows[0]?.late_fees || 0);
        const otherCharges = Number(additionalPaymentResult.rows[0]?.other_charges || 0);
        const additionalPayment = lateFees + otherCharges;

        const totalRevenue = rentalRevenue + additionalPayment;
        const netRevenue = totalRevenue;

        return res.status(200).json({
          success: true,
          data: {
            period: {
              year: targetYear,
              month: targetMonth
            },
            summary: {
              rental_revenue: rentalRevenue,
              additional_payment: additionalPayment,
              total_revenue: totalRevenue,
              net_revenue: netRevenue
            },
            breakdown: {
              rental_fees: rentalRevenue,
              late_fees: lateFees,
              other_charges: otherCharges
            }
          }
        });
      } catch (queryError) {
        console.error('❌ [Monthly Settlement] 쿼리 오류:', queryError);
        return res.status(500).json({
          success: false,
          message: '정산 데이터 조회 실패',
          error: queryError.message
        });
      }
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });

  } catch (error) {
    console.error('❌ [Monthly Settlement] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
