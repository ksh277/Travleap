/**
 * 디버깅용 API - 벤더 계정 조회
 * GET /api/debug/get-vendor-accounts
 *
 * 조회:
 * - partners 테이블에서 partner_type별 계정 정보
 * - users 테이블과 JOIN하여 이메일 정보 가져오기
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

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

  const planetscale = connect({ url: process.env.DATABASE_URL });
  const neonPool = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    console.log('🔍 [Get Vendor Accounts] Fetching vendor accounts...');

    // 1. PlanetScale에서 모든 파트너 조회
    const partnersResult = await planetscale.execute(`
      SELECT
        id,
        user_id,
        partner_type,
        business_name,
        contact_name,
        email,
        phone,
        status,
        tier,
        created_at
      FROM partners
      WHERE partner_type IN ('lodging', 'rentcar')
      ORDER BY partner_type, id
    `);

    const partners = partnersResult.rows || [];
    console.log(`   Found ${partners.length} partners`);

    // 2. Neon에서 user 정보 조회
    const userIds = [...new Set(partners.map(p => p.user_id))];
    const accounts = [];

    for (const partner of partners) {
      try {
        const userResult = await neonPool.query(`
          SELECT id, email, name, role, user_id
          FROM users
          WHERE id = $1
        `, [partner.user_id]);

        const user = userResult.rows[0];

        accounts.push({
          partnerId: partner.id,
          partnerType: partner.partner_type,
          businessName: partner.business_name,
          contactName: partner.contact_name,
          phone: partner.phone,
          status: partner.status,
          tier: partner.tier,
          userId: partner.user_id,
          email: user?.email || partner.email || 'N/A',
          userName: user?.name || partner.contact_name || 'N/A',
          role: user?.role || 'vendor',
          createdAt: partner.created_at
        });
      } catch (e) {
        console.warn(`   Failed to fetch user for partner ${partner.id}:`, e.message);
        accounts.push({
          partnerId: partner.id,
          partnerType: partner.partner_type,
          businessName: partner.business_name,
          contactName: partner.contact_name,
          phone: partner.phone,
          status: partner.status,
          tier: partner.tier,
          userId: partner.user_id,
          email: partner.email || 'N/A',
          userName: partner.contact_name || 'N/A',
          role: 'vendor',
          createdAt: partner.created_at,
          error: 'User not found in Neon'
        });
      }
    }

    // 3. partner_type별로 그룹화
    const lodgingAccounts = accounts.filter(a => a.partnerType === 'lodging');
    const rentcarAccounts = accounts.filter(a => a.partnerType === 'rentcar');

    console.log('✅ [Get Vendor Accounts] Fetching completed');
    console.log(`   Lodging: ${lodgingAccounts.length}, Rentcar: ${rentcarAccounts.length}`);

    await neonPool.end();

    return res.status(200).json({
      success: true,
      summary: {
        total: accounts.length,
        lodging: lodgingAccounts.length,
        rentcar: rentcarAccounts.length
      },
      accounts: {
        lodging: lodgingAccounts,
        rentcar: rentcarAccounts
      },
      loginUrl: 'https://travleap.com/login',
      note: '비밀번호는 보안상 조회할 수 없습니다. 새로 생성한 계정만 비밀번호가 표시됩니다.'
    });

  } catch (error) {
    console.error('❌ [Get Vendor Accounts] Error:', error);
    try {
      await neonPool.end();
    } catch (e) {}

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
