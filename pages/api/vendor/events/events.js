/**
 * 벤더 - 이벤트 관리 API
 * GET /api/vendor/events/events - 내 이벤트 목록 조회
 * POST /api/vendor/events/events - 새 이벤트 등록
 * PUT /api/vendor/events/events - 이벤트 정보 수정
 */

const { connect } = require('@planetscale/database');

function generateEventCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `EVENT-${timestamp}-${random}`;
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

  // GET: 내 이벤트 목록 조회
  if (req.method === 'GET') {
    try {
      const { event_id, is_active, upcoming } = req.query;

      let query = `
        SELECT
          e.*,
          l.title as listing_title,
          l.location,
          l.rating_avg,
          l.rating_count,
          COUNT(DISTINCT et.id) as total_tickets_sold,
          SUM(CASE WHEN et.status = 'active' THEN 1 ELSE 0 END) as active_tickets
        FROM events e
        LEFT JOIN listings l ON e.listing_id = l.id
        LEFT JOIN event_tickets et ON e.id = et.event_id
        WHERE e.vendor_id = ?
      `;

      const params = [vendor_id];

      if (event_id) {
        query += ` AND e.id = ?`;
        params.push(event_id);
      }

      if (is_active !== undefined) {
        query += ` AND e.is_active = ?`;
        params.push(is_active === 'true' ? 1 : 0);
      }

      if (upcoming === 'true') {
        query += ` AND e.start_datetime >= NOW()`;
      }

      query += ` GROUP BY e.id ORDER BY e.start_datetime DESC`;

      const result = await connection.execute(query, params);

      const events = (result.rows || []).map(event => ({
        ...event,
        images: event.images ? JSON.parse(event.images) : [],
        ticket_types: event.ticket_types ? JSON.parse(event.ticket_types) : [],
        facilities: event.facilities ? JSON.parse(event.facilities) : []
      }));

      return res.status(200).json({
        success: true,
        events
      });

    } catch (error) {
      console.error('❌ [Vendor Events GET] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // POST: 새 이벤트 등록
  if (req.method === 'POST') {
    try {
      const {
        listing_id,
        name,
        description,
        event_type,
        category,
        venue,
        venue_address,
        start_datetime,
        end_datetime,
        doors_open_time,
        ticket_types,
        total_capacity,
        age_restriction,
        duration_minutes,
        organizer,
        organizer_contact,
        website,
        parking_available,
        parking_info,
        wheelchair_accessible,
        facilities,
        thumbnail_url,
        images,
        refund_policy
      } = req.body;

      if (!listing_id || !name || !event_type || !venue || !start_datetime || !ticket_types) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다. (listing_id, name, event_type, venue, start_datetime, ticket_types)'
        });
      }

      // 리스팅이 벤더 소유인지 확인
      const listingCheck = await connection.execute(`
        SELECT id FROM listings
        WHERE id = ? AND partner_id = ? AND category = 'events'
      `, [listing_id, vendor_id]);

      if (!listingCheck.rows || listingCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 이벤트 리스팅에만 추가할 수 있습니다.'
        });
      }

      const event_code = generateEventCode();

      const result = await connection.execute(`
        INSERT INTO events (
          listing_id,
          vendor_id,
          event_code,
          name,
          description,
          event_type,
          category,
          venue,
          venue_address,
          start_datetime,
          end_datetime,
          doors_open_time,
          ticket_types,
          total_capacity,
          age_restriction,
          duration_minutes,
          organizer,
          organizer_contact,
          website,
          parking_available,
          parking_info,
          wheelchair_accessible,
          facilities,
          thumbnail_url,
          images,
          refund_policy,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, [
        listing_id,
        vendor_id,
        event_code,
        name,
        description || null,
        event_type,
        category || null,
        venue,
        venue_address || null,
        start_datetime,
        end_datetime || null,
        doors_open_time || null,
        JSON.stringify(ticket_types),
        total_capacity || null,
        age_restriction || null,
        duration_minutes || null,
        organizer || null,
        organizer_contact || null,
        website || null,
        parking_available ? 1 : 0,
        parking_info || null,
        wheelchair_accessible ? 1 : 0,
        JSON.stringify(facilities || []),
        thumbnail_url || null,
        JSON.stringify(images || []),
        refund_policy || null
      ]);

      console.log(`✅ [Vendor Event] 생성 완료: ${name} (${event_code}) by vendor ${vendor_id}`);

      return res.status(201).json({
        success: true,
        event_id: result.insertId,
        event_code
      });

    } catch (error) {
      console.error('❌ [Vendor Events POST] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // PUT: 이벤트 정보 수정
  if (req.method === 'PUT') {
    try {
      const { event_id, ...fields } = req.body;

      if (!event_id) {
        return res.status(400).json({
          success: false,
          error: 'event_id가 필요합니다.'
        });
      }

      // 이벤트가 벤더 소유인지 확인
      const eventCheck = await connection.execute(`
        SELECT id FROM events
        WHERE id = ? AND vendor_id = ?
      `, [event_id, vendor_id]);

      if (!eventCheck.rows || eventCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '본인의 이벤트만 수정할 수 있습니다.'
        });
      }

      const updates = [];
      const values = [];

      const allowedFields = [
        'name', 'description', 'event_type', 'category', 'venue', 'venue_address',
        'start_datetime', 'end_datetime', 'doors_open_time', 'ticket_types',
        'total_capacity', 'age_restriction', 'duration_minutes', 'organizer',
        'organizer_contact', 'website', 'parking_available', 'parking_info',
        'wheelchair_accessible', 'facilities', 'thumbnail_url', 'images',
        'refund_policy', 'is_active'
      ];

      for (const field of allowedFields) {
        if (fields[field] !== undefined) {
          if (['ticket_types', 'facilities', 'images'].includes(field)) {
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
      values.push(event_id);

      const query = `UPDATE events SET ${updates.join(', ')} WHERE id = ?`;
      await connection.execute(query, values);

      console.log(`✅ [Vendor Event] 수정 완료: event_id=${event_id} by vendor ${vendor_id}`);

      return res.status(200).json({
        success: true,
        message: '이벤트 정보가 수정되었습니다.'
      });

    } catch (error) {
      console.error('❌ [Vendor Events PUT] Error:', error);
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
