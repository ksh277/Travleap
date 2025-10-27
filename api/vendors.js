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
      // latitude, longitude 컬럼 존재 여부 확인
      let latLngColumns = '';
      try {
        await connection.execute('SELECT latitude, longitude FROM rentcar_vendors LIMIT 1');
        latLngColumns = 'v.latitude, v.longitude,';
      } catch (e) {
        console.warn('⚠️ latitude/longitude 컬럼 없음 - 기본값 사용');
      }

      // address_detail, rental_guide, cancellation_rules 컬럼 존재 여부 확인
      let newColumns = '';
      try {
        await connection.execute('SELECT address_detail, rental_guide, cancellation_rules FROM rentcar_vendors LIMIT 1');
        newColumns = 'v.address_detail, v.rental_guide, v.cancellation_rules,';
      } catch (e) {
        console.warn('⚠️ address_detail/rental_guide/cancellation_rules 컬럼 없음');
      }

      const vendors = await connection.execute(`
        SELECT
          v.id,
          v.user_id,
          v.vendor_code,
          v.business_name as name,
          v.contact_name as contact_person,
          v.contact_email,
          v.contact_phone,
          v.address,
          ${latLngColumns}
          ${newColumns}
          v.description,
          v.logo_url,
          v.images,
          v.cancellation_policy,
          v.status,
          v.is_verified,
          v.created_at,
          v.updated_at,
          COALESCE(vehicle_counts.total, 0) as total_vehicles,
          COALESCE(vehicle_counts.active, 0) as active_vehicles,
          COALESCE(vehicle_counts.total, 0) as vehicle_count,
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

      // images, cancellation_rules 필드 파싱 (JSON 타입)
      const parsedVendors = (vendors.rows || []).map(vendor => {
        let images = [];
        if (vendor.images) {
          try {
            images = typeof vendor.images === 'string' ? JSON.parse(vendor.images) : vendor.images;
          } catch (e) {
            console.error('Failed to parse vendor images:', vendor.id, e);
          }
        }

        let cancellationRules = null;
        if (vendor.cancellation_rules) {
          try {
            cancellationRules = typeof vendor.cancellation_rules === 'string'
              ? JSON.parse(vendor.cancellation_rules)
              : vendor.cancellation_rules;
          } catch (e) {
            console.error('Failed to parse cancellation_rules:', vendor.id, e);
          }
        }

        return {
          ...vendor,
          images: Array.isArray(images) ? images : [],
          cancellation_rules: cancellationRules
        };
      });

      return res.status(200).json({
        success: true,
        data: parsedVendors
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
        address_detail,
        latitude,
        longitude,
        description,
        logo_url,
        images,
        cancellation_policy,
        rental_guide,
        cancellation_rules,
        old_email,
        new_password
      } = req.body;

      console.log('✏️ [Vendor Update] 업체 정보 수정:', id, req.body);

      // 기존 데이터 조회 (null 방지를 위해)
      let existingVendor;
      try {
        // 모든 컬럼 조회 시도 (새 컬럼 포함)
        existingVendor = await connection.execute(
          'SELECT business_name, contact_name, contact_email, contact_phone, address, address_detail, latitude, longitude, description, logo_url, images, cancellation_policy, rental_guide, cancellation_rules FROM rentcar_vendors WHERE id = ?',
          [id]
        );
      } catch (e) {
        // 새 컬럼 없으면 기존 컬럼만 조회
        try {
          existingVendor = await connection.execute(
            'SELECT business_name, contact_name, contact_email, contact_phone, address, latitude, longitude, description, logo_url, images, cancellation_policy FROM rentcar_vendors WHERE id = ?',
            [id]
          );
        } catch (e2) {
          // latitude, longitude도 없으면 최소 컬럼만
          existingVendor = await connection.execute(
            'SELECT business_name, contact_name, contact_email, contact_phone, address, description, logo_url, images, cancellation_policy FROM rentcar_vendors WHERE id = ?',
            [id]
          );
        }
      }

      if (!existingVendor.rows || existingVendor.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '업체를 찾을 수 없습니다.'
        });
      }

      const existing = existingVendor.rows[0];

      // NULL 값 방지 - 값이 없으면 기존 값 유지
      const finalName = name || existing.business_name;
      const finalContactPerson = contact_person || existing.contact_name;
      const finalContactEmail = contact_email || existing.contact_email;
      const finalContactPhone = contact_phone || existing.contact_phone;
      const finalAddress = address !== undefined ? address : existing.address;
      const finalAddressDetail = address_detail !== undefined ? address_detail : existing.address_detail;
      const finalLatitude = latitude !== undefined ? latitude : existing.latitude;
      const finalLongitude = longitude !== undefined ? longitude : existing.longitude;
      const finalDescription = description !== undefined ? description : existing.description;
      const finalLogoUrl = logo_url !== undefined ? logo_url : existing.logo_url;
      const finalCancellationPolicy = cancellation_policy !== undefined ? cancellation_policy : existing.cancellation_policy;
      const finalRentalGuide = rental_guide !== undefined ? rental_guide : existing.rental_guide;

      // images 처리: 배열을 JSON 문자열로 변환
      let finalImages = existing.images;
      if (images !== undefined) {
        finalImages = Array.isArray(images) ? JSON.stringify(images) : images;
      }

      // cancellation_rules 처리: 객체를 JSON 문자열로 변환
      let finalCancellationRules = existing.cancellation_rules;
      if (cancellation_rules !== undefined) {
        finalCancellationRules = typeof cancellation_rules === 'object'
          ? JSON.stringify(cancellation_rules)
          : cancellation_rules;
      }

      // 1. PlanetScale rentcar_vendors 테이블 업데이트
      const hasLatLng = existing.latitude !== undefined;
      const hasNewFields = existing.address_detail !== undefined;

      if (hasNewFields) {
        // 새 컬럼 포함 (address_detail, rental_guide, cancellation_rules)
        await connection.execute(
          `UPDATE rentcar_vendors
           SET business_name = ?, contact_name = ?, contact_email = ?, contact_phone = ?,
               address = ?, address_detail = ?, latitude = ?, longitude = ?,
               description = ?, logo_url = ?, images = ?,
               cancellation_policy = ?, rental_guide = ?, cancellation_rules = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [finalName, finalContactPerson, finalContactEmail, finalContactPhone,
           finalAddress, finalAddressDetail, finalLatitude, finalLongitude,
           finalDescription, finalLogoUrl, finalImages,
           finalCancellationPolicy, finalRentalGuide, finalCancellationRules, id]
        );
      } else if (hasLatLng) {
        // latitude, longitude만 있을 때
        await connection.execute(
          `UPDATE rentcar_vendors
           SET business_name = ?, contact_name = ?, contact_email = ?, contact_phone = ?,
               address = ?, latitude = ?, longitude = ?, description = ?, logo_url = ?, images = ?, cancellation_policy = ?, updated_at = NOW()
           WHERE id = ?`,
          [finalName, finalContactPerson, finalContactEmail, finalContactPhone, finalAddress, finalLatitude, finalLongitude, finalDescription, finalLogoUrl, finalImages, finalCancellationPolicy, id]
        );
      } else {
        // 기본 컬럼만
        await connection.execute(
          `UPDATE rentcar_vendors
           SET business_name = ?, contact_name = ?, contact_email = ?, contact_phone = ?,
               address = ?, description = ?, logo_url = ?, images = ?, cancellation_policy = ?, updated_at = NOW()
           WHERE id = ?`,
          [finalName, finalContactPerson, finalContactEmail, finalContactPhone, finalAddress, finalDescription, finalLogoUrl, finalImages, finalCancellationPolicy, id]
        );
      }

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
