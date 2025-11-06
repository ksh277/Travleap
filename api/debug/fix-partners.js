/**
 * 디버깅용 API - partners 테이블 partner_type 수정
 * GET /api/debug/fix-partners
 *
 * 문제: 숙박 업체가 partner_type='general'로 되어 있어서 숙박 관리 탭에 안 나옴
 * 해결: business_name에 숙박 관련 키워드가 있으면 partner_type='lodging'으로 업데이트
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

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔧 [Fix Partners] Starting partner_type update...');

    // 1. 업데이트 전 상태 확인
    const beforeTypeResult = await connection.execute(`
      SELECT partner_type, COUNT(*) as count
      FROM partners
      GROUP BY partner_type
    `);

    const beforeLodgingResult = await connection.execute(
      `SELECT COUNT(*) as count FROM partners WHERE partner_type = 'lodging'`
    );
    const beforeLodging = beforeLodgingResult.rows?.[0]?.count || 0;

    console.log('   Before lodging count:', beforeLodging);

    // 2. 숙박 관련 키워드로 lodging 타입 설정
    // 민박, 펜션, 호텔, 리조트, 게스트하우스, 모텔, 숙박 등
    const lodgingKeywords = [
      '민박', '펜션', '호텔', '리조트', '게스트하우스',
      '모텔', '숙박', '여관', 'hotel', 'resort', 'guesthouse',
      '풀빌라', '콘도', '객실', '스테이'
    ];

    let totalUpdated = 0;
    const updatedPartners = [];

    for (const keyword of lodgingKeywords) {
      const updateResult = await connection.execute(`
        UPDATE partners
        SET partner_type = 'lodging'
        WHERE (partner_type = 'general' OR partner_type IS NULL)
          AND (business_name LIKE ? OR description LIKE ?)
      `, [`%${keyword}%`, `%${keyword}%`]);

      if (updateResult.rowsAffected > 0) {
        console.log(`   Updated ${updateResult.rowsAffected} partners for keyword: ${keyword}`);
        totalUpdated += updateResult.rowsAffected;
        updatedPartners.push({
          keyword,
          count: updateResult.rowsAffected
        });
      }
    }

    // 3. 업데이트 후 상태 확인
    const afterLodgingResult = await connection.execute(
      `SELECT COUNT(*) as count FROM partners WHERE partner_type = 'lodging'`
    );
    const afterLodging = afterLodgingResult.rows?.[0]?.count || 0;

    const afterTypeResult = await connection.execute(`
      SELECT partner_type, COUNT(*) as count
      FROM partners
      GROUP BY partner_type
    `);

    // 4. lodging 타입 파트너 샘플 조회
    const sampleResult = await connection.execute(`
      SELECT id, business_name, partner_type, status, created_at
      FROM partners
      WHERE partner_type = 'lodging'
      ORDER BY id DESC
      LIMIT 5
    `);

    console.log('✅ [Fix Partners] Update completed');

    return res.status(200).json({
      success: true,
      message: 'partner_type updated successfully',
      before: {
        lodging: beforeLodging,
        byType: beforeTypeResult.rows || []
      },
      after: {
        lodging: afterLodging,
        byType: afterTypeResult.rows || []
      },
      updated: totalUpdated,
      updatedByKeyword: updatedPartners,
      sampleLodgingPartners: sampleResult.rows || []
    });

  } catch (error) {
    console.error('❌ [Fix Partners] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
