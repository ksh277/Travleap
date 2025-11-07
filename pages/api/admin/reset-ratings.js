/**
 * 모든 listings의 rating을 0으로 초기화하는 API
 * GET /api/admin/reset-ratings
 */

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
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('🔄 모든 listings의 rating 초기화 시작...');

    const result = await connection.execute(
      'UPDATE listings SET rating_count = 0, rating_avg = 0 WHERE rating_count > 0 OR rating_avg > 0'
    );

    console.log(`✅ ${result.rowsAffected}개 listings의 rating 초기화 완료`);

    return res.status(200).json({
      success: true,
      message: `${result.rowsAffected}개 listings의 rating이 0으로 초기화되었습니다.`,
      rowsAffected: result.rowsAffected
    });
  } catch (error) {
    console.error('Error resetting ratings:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
