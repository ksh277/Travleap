/**
 * Vercel Cron API: 포인트 만료 자동 처리
 *
 * 실행 주기: 매일 자정 (00:00 KST)
 *
 * Vercel Cron 설정 (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-points",
 *     "schedule": "0 15 * * *"
 *   }]
 * }
 *
 * 참고: "0 15 * * *"는 UTC 15:00 = KST 00:00 (다음날)
 */

const { expirePoints } = require('../../scripts/expire-points-cron.cjs');

module.exports = async function handler(req, res) {
  // 보안: Vercel Cron만 호출 가능하도록 검증
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET이 설정되어 있으면 검증
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ [Cron] 인증 실패: 잘못된 시크릿');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
  } else {
    // CRON_SECRET이 없으면 Vercel Cron header 검증
    const isVercelCron = req.headers['user-agent']?.includes('vercel-cron');
    if (!isVercelCron && process.env.NODE_ENV === 'production') {
      console.error('❌ [Cron] 인증 실패: Vercel Cron이 아님');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Not from Vercel Cron'
      });
    }
  }

  try {
    console.log('⏰ [Cron API] 포인트 만료 처리 시작');
    const result = await expirePoints();

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Point expiration processed successfully',
        data: {
          processedCount: result.processedCount,
          failedCount: result.failedCount || 0,
          totalExpiredPoints: result.totalExpiredPoints
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error,
        data: {
          processedCount: result.processedCount,
          totalExpiredPoints: result.totalExpiredPoints
        }
      });
    }

  } catch (error) {
    console.error('❌ [Cron API] 포인트 만료 처리 실패:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
