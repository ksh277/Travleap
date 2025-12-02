/**
 * 상품 옵션 관리 API
 * GET /api/listings/options?listing_id=123 - 상품의 옵션 목록 조회
 * POST /api/listings/options - 옵션 생성
 * PUT /api/listings/options - 옵션 수정
 * DELETE /api/listings/options?id=123 - 옵션 삭제
 */

const { connect } = require('@planetscale/database');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET: 옵션 목록 조회
    if (req.method === 'GET') {
      const { listing_id, option_type } = req.query;

      if (!listing_id) {
        return res.status(400).json({
          success: false,
          error: 'listing_id가 필요합니다'
        });
      }

      let query = `
        SELECT * FROM listing_options
        WHERE listing_id = ?
      `;
      const params = [listing_id];

      if (option_type) {
        query += ' AND option_type = ?';
        params.push(option_type);
      }

      query += ' AND is_active = 1 ORDER BY sort_order ASC, id ASC';

      const result = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    }

    // POST: 옵션 생성
    if (req.method === 'POST') {
      const {
        listing_id,
        option_type = 'menu',
        name,
        description,
        price = 0,
        original_price,
        price_type = 'per_person',
        start_time,
        end_time,
        duration_minutes,
        max_capacity,
        available_count,
        min_quantity = 1,
        max_quantity = 10,
        sort_order = 0,
        is_default = false,
        meta
      } = req.body;

      if (!listing_id || !name) {
        return res.status(400).json({
          success: false,
          error: 'listing_id와 name은 필수입니다'
        });
      }

      const result = await connection.execute(`
        INSERT INTO listing_options (
          listing_id, option_type, name, description,
          price, original_price, price_type,
          start_time, end_time, duration_minutes,
          max_capacity, available_count,
          min_quantity, max_quantity,
          sort_order, is_default, meta
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        listing_id, option_type, name, description || null,
        price, original_price || null, price_type,
        start_time || null, end_time || null, duration_minutes || null,
        max_capacity || null, available_count || null,
        min_quantity, max_quantity,
        sort_order, is_default ? 1 : 0, meta ? JSON.stringify(meta) : null
      ]);

      // has_options 플래그 업데이트
      await connection.execute(
        'UPDATE listings SET has_options = 1 WHERE id = ?',
        [listing_id]
      );

      console.log(`✅ [Options] 옵션 생성: listing_id=${listing_id}, name=${name}`);

      return res.status(201).json({
        success: true,
        data: { id: result.insertId },
        message: '옵션이 생성되었습니다'
      });
    }

    // PUT: 옵션 수정
    if (req.method === 'PUT') {
      const {
        id,
        name,
        description,
        price,
        original_price,
        price_type,
        start_time,
        end_time,
        duration_minutes,
        max_capacity,
        available_count,
        min_quantity,
        max_quantity,
        sort_order,
        is_active,
        is_default,
        meta
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '옵션 id가 필요합니다'
        });
      }

      const updates = [];
      const values = [];

      if (name !== undefined) { updates.push('name = ?'); values.push(name); }
      if (description !== undefined) { updates.push('description = ?'); values.push(description); }
      if (price !== undefined) { updates.push('price = ?'); values.push(price); }
      if (original_price !== undefined) { updates.push('original_price = ?'); values.push(original_price); }
      if (price_type !== undefined) { updates.push('price_type = ?'); values.push(price_type); }
      if (start_time !== undefined) { updates.push('start_time = ?'); values.push(start_time); }
      if (end_time !== undefined) { updates.push('end_time = ?'); values.push(end_time); }
      if (duration_minutes !== undefined) { updates.push('duration_minutes = ?'); values.push(duration_minutes); }
      if (max_capacity !== undefined) { updates.push('max_capacity = ?'); values.push(max_capacity); }
      if (available_count !== undefined) { updates.push('available_count = ?'); values.push(available_count); }
      if (min_quantity !== undefined) { updates.push('min_quantity = ?'); values.push(min_quantity); }
      if (max_quantity !== undefined) { updates.push('max_quantity = ?'); values.push(max_quantity); }
      if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order); }
      if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
      if (is_default !== undefined) { updates.push('is_default = ?'); values.push(is_default ? 1 : 0); }
      if (meta !== undefined) { updates.push('meta = ?'); values.push(JSON.stringify(meta)); }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 필드가 없습니다'
        });
      }

      values.push(id);

      await connection.execute(
        `UPDATE listing_options SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      console.log(`✅ [Options] 옵션 수정: id=${id}`);

      return res.status(200).json({
        success: true,
        message: '옵션이 수정되었습니다'
      });
    }

    // DELETE: 옵션 삭제
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '옵션 id가 필요합니다'
        });
      }

      // 삭제 전 listing_id 조회
      const optionResult = await connection.execute(
        'SELECT listing_id FROM listing_options WHERE id = ?',
        [id]
      );

      if (!optionResult.rows || optionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '옵션을 찾을 수 없습니다'
        });
      }

      const listingId = optionResult.rows[0].listing_id;

      // 옵션 삭제
      await connection.execute('DELETE FROM listing_options WHERE id = ?', [id]);

      // 남은 옵션이 없으면 has_options 플래그 해제
      const remainingOptions = await connection.execute(
        'SELECT COUNT(*) as count FROM listing_options WHERE listing_id = ? AND is_active = 1',
        [listingId]
      );

      if (remainingOptions.rows[0].count === 0) {
        await connection.execute(
          'UPDATE listings SET has_options = 0 WHERE id = ?',
          [listingId]
        );
      }

      console.log(`✅ [Options] 옵션 삭제: id=${id}`);

      return res.status(200).json({
        success: true,
        message: '옵션이 삭제되었습니다'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Options] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = withPublicCors(handler);
