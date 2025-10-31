/**
 * 벤더 - 관광지 관리 API
 * GET /api/vendor/attractions/attractions - 내 관광지 목록 조회
 * POST /api/vendor/attractions/attractions - 새 관광지 등록
 * PUT /api/vendor/attractions/attractions - 관광지 정보 수정
 */

const { connect } = require('@planetscale/database');

function generateAttractionCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ATTR-${timestamp}-${random}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  const { vendor_id } = req.query;

  if (!vendor_id) {
    return res.status(401).json({
      success: false,
      error: '벤더 인증이 필요합니다.'
    });
  }

  // GET: 내 관광지 목록 조회
  if (req.method === 'GET') {
    try {
      const { attraction_id, is_active } = req.query;

      let query = `
        SELECT
          a.*,
          l.title as listing_title,
          l.location,
          l.rating_avg,
          l.rating_count,
          COUNT(DISTINCT et.id) as total_tickets_sold,
          SUM(CASE WHEN et.status = 'active' THEN 1 ELSE 0 END) as active_tickets
        FROM attractions a
        LEFT JOIN listings l ON a.listing_id = l.id
        LEFT JOIN entry_tickets et ON a.id = et.attraction_id
        WHERE a.vendor_id = ?
      `;

      const params = [vendor_id];

      if (attraction_id) {
        query += ` AND a.id = ?`;
        params.push(attraction_id);
      }

      if (is_active !== undefined) {
        query += ` AND a.is_active = ?`;
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += ` GROUP BY a.id ORDER BY a.created_at DESC`;

      const result = await connection.execute(query, params);

      const attractions = (result.rows || []).map(attraction => ({
        ...attraction,
        images: attraction.images ? JSON.parse(attraction.images) : [],
        operating_hours: attraction.operating_hours ? JSON.parse(attraction.operating_hours) : {},
        free_entry_days: attraction.free_entry_days ? JSON.parse(attraction.free_entry_days) : [],
        highlights: attraction.highlights ? JSON.parse(attraction.highlights) : []
      }));

      return res.status(200).json({
        success: true,
        attractions
      });

    } catch (error) {
      console.error('❌ [Vendor Attractions GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST: 새 관광지 등록
  if (req.method === 'POST') {
    try {
      const {
        listing_id,
        name,
        description,
        type,
        category,
        address,
        phone,
        website,
        operating_hours,
        last_entry_time,
        admission_fee_adult,
        admission_fee_child,
        admission_fee_senior,
        admission_fee_infant,
        free_entry_days,
        parking_available,
        parking_fee,
        parking_info,
        wheelchair_accessible,
        stroller_friendly,
        pet_allowed,
        thumbnail_url,
        images,
        estimated_visit_duration_minutes,
        highlights
      } = req.body;

      if (!listing_id || !name || !type || !admission_fee_adult) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다. (listing_id, name, type, admission_fee_adult)'
        });
      }

      // 리스팅이 벤더 소유인지 확인
      const listingCheck = await connection.execute(`
        SELECT id FROM listings
        WHERE id = ? AND partner_id = ? AND category = 'attractions'
      `, [listing_id, vendor_id]);

      if (!listingCheck.rows || listingCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 관광지 리스팅에만 추가할 수 있습니다.'
        });
      }

      const attraction_code = generateAttractionCode();

      const result = await connection.execute(`
        INSERT INTO attractions (
          listing_id,
          vendor_id,
          attraction_code,
          name,
          description,
          type,
          category,
          address,
          phone,
          website,
          operating_hours,
          last_entry_time,
          admission_fee_adult,
          admission_fee_child,
          admission_fee_senior,
          admission_fee_infant,
          free_entry_days,
          parking_available,
          parking_fee,
          parking_info,
          wheelchair_accessible,
          stroller_friendly,
          pet_allowed,
          thumbnail_url,
          images,
          estimated_visit_duration_minutes,
          highlights,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, [
        listing_id,
        vendor_id,
        attraction_code,
        name,
        description || null,
        type,
        category || null,
        address || null,
        phone || null,
        website || null,
        JSON.stringify(operating_hours || {}),
        last_entry_time || null,
        admission_fee_adult,
        admission_fee_child || null,
        admission_fee_senior || null,
        admission_fee_infant || 0,
        JSON.stringify(free_entry_days || []),
        parking_available ? 1 : 0,
        parking_fee || 0,
        parking_info || null,
        wheelchair_accessible ? 1 : 0,
        stroller_friendly ? 1 : 0,
        pet_allowed ? 1 : 0,
        thumbnail_url || null,
        JSON.stringify(images || []),
        estimated_visit_duration_minutes || null,
        JSON.stringify(highlights || [])
      ]);

      console.log(`✅ [Vendor Attraction] 생성 완료: ${name} (${attraction_code}) by vendor ${vendor_id}`);

      return res.status(201).json({
        success: true,
        attraction_id: result.insertId,
        attraction_code
      });

    } catch (error) {
      console.error('❌ [Vendor Attractions POST] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 관광지 정보 수정
  if (req.method === 'PUT') {
    try {
      const { attraction_id, ...fields } = req.body;

      if (!attraction_id) {
        return res.status(400).json({
          success: false,
          error: 'attraction_id가 필요합니다.'
        });
      }

      // 관광지가 벤더 소유인지 확인
      const attractionCheck = await connection.execute(`
        SELECT id FROM attractions
        WHERE id = ? AND vendor_id = ?
      `, [attraction_id, vendor_id]);

      if (!attractionCheck.rows || attractionCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 관광지만 수정할 수 있습니다.'
        });
      }

      const updates = [];
      const values = [];

      const allowedFields = [
        'name', 'description', 'type', 'category', 'address', 'phone', 'website',
        'operating_hours', 'last_entry_time', 'admission_fee_adult', 'admission_fee_child',
        'admission_fee_senior', 'admission_fee_infant', 'free_entry_days', 'parking_available',
        'parking_fee', 'parking_info', 'wheelchair_accessible', 'stroller_friendly',
        'pet_allowed', 'thumbnail_url', 'images', 'estimated_visit_duration_minutes',
        'highlights', 'is_active'
      ];

      for (const field of allowedFields) {
        if (fields[field] !== undefined) {
          if (['operating_hours', 'free_entry_days', 'images', 'highlights'].includes(field)) {
            updates.push(`${field} = ?`);
            values.push(JSON.stringify(fields[field]));
          } else if (typeof fields[field] === 'boolean') {
            updates.push(`${field} = ?`);
            values.push(fields[field] ? 1 : 0);
          } else {
            updates.push(`${field} = ?`);
            values.push(fields[field]);
          }
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(attraction_id);

      const query = `UPDATE attractions SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(query, values);

      console.log(`✅ [Vendor Attraction] 수정 완료: attraction_id=${attraction_id} by vendor ${vendor_id}`);

      return res.status(200).json({
        success: true,
        message: '관광지 정보가 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Attractions PUT] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};
