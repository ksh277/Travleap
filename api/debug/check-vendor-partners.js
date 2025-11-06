/**
 * 디버깅용 API - 벤더 파트너 목록 확인
 * GET /api/debug/check-vendor-partners?email=xxx@travleap.com
 *
 * 특정 이메일의 partners 레코드 조회
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

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ success: false, error: 'Email parameter required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔍 [Check Partners] Checking partners for email:', email);

    // 이메일로 partners 조회
    const partnersResult = await connection.execute(`
      SELECT
        id,
        user_id,
        partner_type,
        business_name,
        contact_name,
        email,
        phone,
        status,
        is_active,
        created_at
      FROM partners
      WHERE email = ?
      ORDER BY created_at DESC
    `, [email]);

    const partners = partnersResult.rows || [];
    console.log(`   Found ${partners.length} partner(s)`);

    return res.status(200).json({
      success: true,
      email: email,
      totalPartners: partners.length,
      partners: partners,
      warning: partners.length > 1 ? '⚠️ 중복 파트너가 발견되었습니다!' : null
    });

  } catch (error) {
    console.error('❌ [Check Partners] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
