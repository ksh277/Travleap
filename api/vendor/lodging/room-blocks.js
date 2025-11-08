const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 숙박 벤더 대시보드 - 객실 차단/재고 관리 API
 * GET: 차단 내역 조회
 * POST: 새 차단 추가
 * DELETE: 차단 해제
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // JWT 토큰 검증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' });
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 사용자의 vendor_id 조회
    const vendorResult = await connection.execute(
      `SELECT p.id as partner_id
       FROM partners p
       WHERE p.user_id = ? AND p.partner_type = 'lodging' AND p.is_active = 1
       LIMIT 1`,
      [userId]
    );

    if (!vendorResult.rows || vendorResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '숙박 업체 정보를 찾을 수 없습니다.'
      });
    }

    const partnerId = vendorResult.rows[0].partner_id;

    // GET: 차단 내역 조회
    if (req.method === 'GET') {
      const { listing_id } = req.query;

      let query = `
        SELECT
          rb.*,
          l.title as room_name
        FROM room_blocks rb
        JOIN listings l ON rb.listing_id = l.id
        WHERE l.partner_id = ?
      `;
      const params = [partnerId];

      if (listing_id) {
        query += ` AND rb.listing_id = ?`;
        params.push(listing_id);
      }

      query += ` ORDER BY rb.start_date ASC`;

      const blocksResult = await connection.execute(query, params);

      const blocks = (blocksResult.rows || []).map(block => ({
        id: block.id,
        listing_id: block.listing_id,
        room_name: block.room_name,
        start_date: block.start_date,
        end_date: block.end_date,
        reason: block.reason,
        notes: block.notes,
        created_at: block.created_at
      }));

      return res.status(200).json({
        success: true,
        data: blocks
      });
    }

    // POST: 새 차단 추가
    if (req.method === 'POST') {
      const {
        listing_id,
        start_date,
        end_date,
        reason,
        notes
      } = req.body;

      if (!listing_id || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          error: '필수 항목이 누락되었습니다. (listing_id, start_date, end_date)'
        });
      }

      // 날짜 검증
      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);

      if (endDateObj <= startDateObj) {
        return res.status(400).json({
          success: false,
          error: '종료 날짜는 시작 날짜 이후여야 합니다.'
        });
      }

      // 객실이 해당 업체 소유인지 확인
      const listingResult = await connection.execute(
        `SELECT id, partner_id, title
         FROM listings
         WHERE id = ?
         LIMIT 1`,
        [listing_id]
      );

      if (!listingResult.rows || listingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '객실을 찾을 수 없습니다.'
        });
      }

      const listing = listingResult.rows[0];

      if (listing.partner_id !== partnerId) {
        return res.status(403).json({
          success: false,
          error: '이 객실에 대한 권한이 없습니다.'
        });
      }

      // 기존 차단과 겹치는지 확인
      const conflictResult = await connection.execute(
        `SELECT id, start_date, end_date, reason
         FROM room_blocks
         WHERE listing_id = ?
           AND (
             (start_date <= ? AND end_date > ?)
             OR (start_date < ? AND end_date >= ?)
             OR (start_date >= ? AND end_date <= ?)
           )`,
        [listing_id, start_date, start_date, end_date, end_date, start_date, end_date]
      );

      if (conflictResult.rows && conflictResult.rows.length > 0) {
        const conflict = conflictResult.rows[0];
        return res.status(409).json({
          success: false,
          error: '선택한 기간에 이미 차단된 날짜가 있습니다.',
          conflict: {
            start_date: conflict.start_date,
            end_date: conflict.end_date,
            reason: conflict.reason
          }
        });
      }

      // 차단 추가
      const insertResult = await connection.execute(
        `INSERT INTO room_blocks (
          listing_id,
          start_date,
          end_date,
          reason,
          notes,
          created_by,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          listing_id,
          start_date,
          end_date,
          reason || 'maintenance',
          notes || '',
          userId
        ]
      );

      return res.status(201).json({
        success: true,
        message: '객실 차단이 추가되었습니다.',
        data: {
          id: insertResult.insertId,
          listing_id,
          room_name: listing.title,
          start_date,
          end_date,
          reason,
          notes
        }
      });
    }

    // DELETE: 차단 해제
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '차단 ID가 필요합니다.'
        });
      }

      // 차단이 해당 업체 소유인지 확인
      const blockResult = await connection.execute(
        `SELECT rb.id, rb.listing_id
         FROM room_blocks rb
         JOIN listings l ON rb.listing_id = l.id
         WHERE rb.id = ? AND l.partner_id = ?
         LIMIT 1`,
        [id, partnerId]
      );

      if (!blockResult.rows || blockResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '차단을 찾을 수 없거나 권한이 없습니다.'
        });
      }

      // 차단 삭제
      await connection.execute(
        `DELETE FROM room_blocks WHERE id = ?`,
        [id]
      );

      return res.status(200).json({
        success: true,
        message: '객실 차단이 해제되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [객실 차단 관리 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '객실 차단 관리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
