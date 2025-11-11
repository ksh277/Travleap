/**
 * 숙박 벤더 관리 API (partners 테이블 사용)
 * GET /api/admin/accommodation-vendors - 모든 숙박 벤더 조회
 * POST /api/admin/accommodation-vendors - 숙박 벤더 추가
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

// Neon PostgreSQL connection for users table
let neonPool;
function getNeonPool() {
  if (!neonPool) {
    const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
    neonPool = new Pool({ connectionString });
  }
  return neonPool;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET - 모든 숙박 벤더 조회 (partners 테이블에서 partner_type='lodging')
    if (req.method === 'GET') {
      // Stay category ID (stay slug = 1857)
      const categoryId = 1857;

      const result = await connection.execute(
        `SELECT
          p.id,
          p.user_id,
          p.business_name,
          p.business_number,
          p.contact_name,
          p.email as contact_email,
          p.phone as contact_phone,
          p.description,
          p.logo as logo_url,
          p.pms_provider,
          p.pms_api_key,
          p.pms_property_id,
          p.pms_sync_enabled,
          p.pms_sync_interval,
          p.last_sync_at,
          p.check_in_time,
          p.check_out_time,
          p.policies,
          p.status,
          p.is_active,
          p.tier,
          p.created_at,
          p.updated_at,
          COUNT(DISTINCT l.id) as room_count,
          MIN(l.price_from) as min_price,
          MAX(l.price_from) as max_price,
          (
            SELECT AVG(r.rating)
            FROM reviews r
            INNER JOIN listings l2 ON r.listing_id = l2.id
            WHERE l2.partner_id = p.id AND r.status = 'approved'
          ) as avg_rating,
          (
            SELECT COUNT(*)
            FROM reviews r
            INNER JOIN listings l2 ON r.listing_id = l2.id
            WHERE l2.partner_id = p.id AND r.status = 'approved'
          ) as total_reviews
        FROM partners p
        LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ? AND l.is_published = 1 AND l.is_active = 1
        WHERE p.partner_type = 'lodging'
        GROUP BY p.id, p.user_id, p.business_name, p.business_number, p.contact_name, p.email, p.phone, p.description, p.logo, p.pms_provider, p.pms_api_key, p.pms_property_id, p.pms_sync_enabled, p.pms_sync_interval, p.last_sync_at, p.check_in_time, p.check_out_time, p.policies, p.status, p.is_active, p.tier, p.created_at, p.updated_at
        ORDER BY p.created_at DESC`,
        [categoryId]
      );

      // brand_name 없으면 business_name 사용, 집계 데이터 포함
      const vendors = (result.rows || []).map(vendor => ({
        ...vendor,
        brand_name: vendor.brand_name || vendor.business_name,
        vendor_code: `ACC${vendor.id}`,
        room_count: vendor.room_count || 0,
        min_price: vendor.min_price || 0,
        max_price: vendor.max_price || 0,
        avg_rating: vendor.avg_rating ? parseFloat(vendor.avg_rating).toFixed(1) : '0.0',
        total_reviews: vendor.total_reviews || 0
      }));

      return res.status(200).json({
        success: true,
        data: vendors
      });
    }

    // POST - 숙박 벤더 추가 (partners 테이블에 삽입)
    if (req.method === 'POST') {
      const {
        user_id,
        business_name,
        brand_name,
        business_number,
        contact_name,
        contact_email,
        contact_phone,
        description,
        logo_url,
        pms_provider,
        pms_api_key,
        pms_property_id,
        pms_sync_enabled = 0,
        pms_sync_interval = 60,
        check_in_time = '15:00',
        check_out_time = '11:00',
        policies,
        status = 'active'
      } = req.body;

      // 필수 필드 검증
      if (!business_name) {
        return res.status(400).json({
          success: false,
          error: '사업자명은 필수입니다.'
        });
      }

      // user_id가 없으면 임시 생성 (Neon PostgreSQL의 users 테이블 사용)
      let finalUserId = user_id;
      if (!finalUserId) {
        try {
          const neonDb = getNeonPool();
          // 임시 사용자 ID 생성 또는 조회
          const tempUserResult = await neonDb.query(
            `SELECT id FROM users WHERE email = $1 LIMIT 1`,
            [contact_email || 'temp@accommodation.com']
          );

          if (tempUserResult.rows && tempUserResult.rows.length > 0) {
            finalUserId = tempUserResult.rows[0].id;
          } else {
            // 임시 사용자 생성
            const createUserResult = await neonDb.query(
              `INSERT INTO users (email, name, role, created_at, updated_at)
               VALUES ($1, $2, 'vendor', NOW(), NOW()) RETURNING id`,
              [contact_email || 'temp@accommodation.com', contact_name || business_name]
            );
            finalUserId = createUserResult.rows[0].id;
          }
        } catch (userError) {
          console.warn('Failed to create/find user in Neon, using default:', userError);
          finalUserId = 1; // Fallback to default admin user
        }
      }

      const result = await connection.execute(
        `INSERT INTO partners (
          user_id,
          partner_type,
          business_name,
          business_number,
          contact_name,
          email,
          phone,
          description,
          logo,
          pms_provider,
          pms_api_key,
          pms_property_id,
          pms_sync_enabled,
          pms_sync_interval,
          check_in_time,
          check_out_time,
          policies,
          status,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, 'lodging', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [
          finalUserId,
          business_name,
          business_number,
          contact_name,
          contact_email,
          contact_phone,
          description,
          logo_url,
          pms_provider,
          pms_api_key,
          pms_property_id,
          pms_sync_enabled,
          pms_sync_interval,
          check_in_time,
          check_out_time,
          policies,
          status
        ]
      );

      console.log('Accommodation vendor added to partners table:', result);

      return res.status(201).json({
        success: true,
        message: '숙박 벤더가 추가되었습니다.',
        data: {
          id: result.insertId,
          vendor_code: `ACC${result.insertId}`,
          user_id: finalUserId
        }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('Accommodation vendors API error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      message: error.message
    });
  }
};
