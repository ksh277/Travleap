const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

// Neon PostgreSQL connection
let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // GET: 벤더 목록 조회
    if (req.method === 'GET') {
      const vendors = await connection.execute(`
        SELECT
          v.*,
          COALESCE(vehicle_counts.total, 0) as total_vehicles,
          COALESCE(vehicle_counts.active, 0) as active_vehicles,
          COALESCE(booking_counts.total, 0) as total_bookings,
          COALESCE(booking_counts.confirmed, 0) as confirmed_bookings,
          0 as average_rating,
          0 as review_count
        FROM rentcar_vendors v
        LEFT JOIN (
          SELECT vendor_id,
            COUNT(*) as total,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
          FROM rentcar_vehicles
          GROUP BY vendor_id
        ) vehicle_counts ON v.id = vehicle_counts.vendor_id
        LEFT JOIN (
          SELECT vendor_id,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
          FROM rentcar_bookings
          GROUP BY vendor_id
        ) booking_counts ON v.id = booking_counts.vendor_id
        ORDER BY v.created_at DESC
      `);

      return res.status(200).json({
        success: true,
        data: vendors.rows || []
      });
    }

    // PUT: 벤더 정보 수정
    if (req.method === 'PUT') {
      const {
        id,
        name,
        contact_person,
        contact_email,
        contact_phone,
        address,
        description,
        logo_url,
        cancellation_policy,
        old_email,
        new_password
      } = req.body;

      console.log('✏️ [Vendor Update] 업체 정보 수정:', id, req.body);

      // 1. PlanetScale rentcar_vendors 테이블 업데이트
      await connection.execute(
        `UPDATE rentcar_vendors
         SET business_name = ?, contact_name = ?, contact_email = ?, contact_phone = ?,
             address = ?, description = ?, logo_url = ?, cancellation_policy = ?, updated_at = NOW()
         WHERE id = ?`,
        [name, contact_person, contact_email, contact_phone, address, description, logo_url, cancellation_policy, id]
      );

      // 2. 이메일이 변경되었거나 비밀번호가 제공된 경우 Neon users 테이블 업데이트
      if (old_email && (old_email !== contact_email || new_password)) {
        const neonDb = getPool();

        if (new_password) {
          // 비밀번호 변경
          const hashedPassword = await bcrypt.hash(new_password, 10);
          await neonDb.query(
            'UPDATE users SET email = $1, password_hash = $2, updated_at = NOW() WHERE email = $3',
            [contact_email, hashedPassword, old_email]
          );
          console.log('✅ [Neon] 이메일 및 비밀번호 업데이트 완료');
        } else {
          // 이메일만 변경
          await neonDb.query(
            'UPDATE users SET email = $1, updated_at = NOW() WHERE email = $2',
            [contact_email, old_email]
          );
          console.log('✅ [Neon] 이메일 업데이트 완료');
        }
      }

      return res.status(200).json({
        success: true,
        message: '업체 정보가 수정되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in vendors API:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
