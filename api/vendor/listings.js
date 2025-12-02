/**
 * 벤더 상품 관리 API
 *
 * GET    /api/vendor/listings - 상품 목록 조회
 * POST   /api/vendor/listings - 상품 등록
 * PUT    /api/vendor/listings - 상품 수정
 * DELETE /api/vendor/listings?id={id} - 상품 삭제
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withSecureCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  const connection = connect({ url: process.env.DATABASE_URL });
  const userId = req.user.id;

  try {
    // GET - 상품 목록 조회
    if (req.method === 'GET') {
      const { category, include_stock } = req.query;

      let sql = `
        SELECT
          l.id,
          l.title,
          l.description_md,
          l.short_description,
          l.price_from,
          l.child_price,
          l.infant_price,
          l.location,
          l.address,
          l.meeting_point,
          l.category,
          l.category_id,
          l.images,
          l.max_capacity,
          l.highlights,
          l.included,
          l.excluded,
          l.is_active,
          l.is_featured,
          l.is_published,
          l.has_options,
          l.stock,
          l.stock_enabled,
          l.min_purchase,
          l.max_purchase,
          l.shipping_fee,
          l.refund_policy,
          l.lat,
          l.lng,
          l.view_count,
          l.created_at,
          l.updated_at,
          (SELECT COUNT(*) FROM bookings b WHERE b.listing_id = l.id) as booking_count,
          (SELECT COUNT(*) FROM reviews r WHERE r.listing_id = l.id AND r.is_hidden != 1) as review_count,
          (SELECT AVG(r.rating) FROM reviews r WHERE r.listing_id = l.id AND r.is_hidden != 1) as avg_rating
        FROM listings l
        WHERE l.user_id = ?
      `;

      const params = [userId];

      if (category) {
        sql += ` AND l.category = ?`;
        params.push(category);
      }

      sql += ` ORDER BY l.created_at DESC`;

      const result = await connection.execute(sql, params);

      // JSON 필드 파싱
      const listings = (result.rows || []).map(listing => ({
        ...listing,
        images: parseJson(listing.images, []),
        highlights: parseJson(listing.highlights, []),
        included: parseJson(listing.included, []),
        excluded: parseJson(listing.excluded, []),
        refund_policy: parseJson(listing.refund_policy, null)
      }));

      return res.status(200).json({
        success: true,
        data: listings
      });
    }

    // POST - 상품 등록
    if (req.method === 'POST') {
      const data = req.body;

      if (!data.title) {
        return res.status(400).json({
          success: false,
          error: '상품명은 필수입니다.'
        });
      }

      const result = await connection.execute(`
        INSERT INTO listings (
          user_id,
          title,
          description_md,
          short_description,
          price_from,
          child_price,
          infant_price,
          location,
          address,
          meeting_point,
          category,
          category_id,
          images,
          max_capacity,
          highlights,
          included,
          excluded,
          is_active,
          is_featured,
          is_published,
          has_options,
          stock,
          stock_enabled,
          min_purchase,
          max_purchase,
          shipping_fee,
          refund_policy,
          lat,
          lng,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        userId,
        data.title,
        data.description_md || data.longDescription || '',
        data.short_description || data.description || '',
        data.price_from || data.price || 0,
        data.child_price || null,
        data.infant_price || null,
        data.location || '',
        data.address || data.detailedAddress || '',
        data.meeting_point || '',
        data.category || 'popup',
        data.category_id || null,
        JSON.stringify(data.images || []),
        data.max_capacity || data.maxCapacity || 10,
        JSON.stringify(data.highlights || []),
        JSON.stringify(data.included || []),
        JSON.stringify(data.excluded || []),
        data.is_active !== false ? 1 : 0,
        data.is_featured ? 1 : 0,
        data.is_published !== false ? 1 : 0,
        data.has_options ? 1 : 0,
        data.stock || null,
        data.stock_enabled ? 1 : 0,
        data.min_purchase || 1,
        data.max_purchase || null,
        data.shipping_fee || 0,
        data.refund_policy ? JSON.stringify(data.refund_policy) : null,
        data.lat || null,
        data.lng || null
      ]);

      const newId = result.insertId;

      console.log(`✅ [Vendor Listings] 새 상품 등록: ID=${newId}, title=${data.title}, user_id=${userId}`);

      return res.status(201).json({
        success: true,
        data: { id: newId },
        message: '상품이 등록되었습니다.'
      });
    }

    // PUT - 상품 수정
    if (req.method === 'PUT') {
      const data = req.body;

      if (!data.id) {
        return res.status(400).json({
          success: false,
          error: '상품 ID가 필요합니다.'
        });
      }

      // 본인 상품인지 확인
      const checkResult = await connection.execute(
        `SELECT id FROM listings WHERE id = ? AND user_id = ?`,
        [data.id, userId]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '권한이 없거나 상품을 찾을 수 없습니다.'
        });
      }

      await connection.execute(`
        UPDATE listings SET
          title = ?,
          description_md = ?,
          short_description = ?,
          price_from = ?,
          child_price = ?,
          infant_price = ?,
          location = ?,
          address = ?,
          meeting_point = ?,
          category = ?,
          category_id = ?,
          images = ?,
          max_capacity = ?,
          highlights = ?,
          included = ?,
          excluded = ?,
          is_active = ?,
          is_featured = ?,
          has_options = ?,
          stock = ?,
          stock_enabled = ?,
          min_purchase = ?,
          max_purchase = ?,
          shipping_fee = ?,
          refund_policy = ?,
          lat = ?,
          lng = ?,
          updated_at = NOW()
        WHERE id = ? AND user_id = ?
      `, [
        data.title,
        data.description_md || data.longDescription || '',
        data.short_description || data.description || '',
        data.price_from || data.price || 0,
        data.child_price || null,
        data.infant_price || null,
        data.location || '',
        data.address || data.detailedAddress || '',
        data.meeting_point || '',
        data.category || 'popup',
        data.category_id || null,
        JSON.stringify(data.images || []),
        data.max_capacity || data.maxCapacity || 10,
        JSON.stringify(data.highlights || []),
        JSON.stringify(data.included || []),
        JSON.stringify(data.excluded || []),
        data.is_active !== false ? 1 : 0,
        data.is_featured ? 1 : 0,
        data.has_options ? 1 : 0,
        data.stock || null,
        data.stock_enabled ? 1 : 0,
        data.min_purchase || 1,
        data.max_purchase || null,
        data.shipping_fee || 0,
        data.refund_policy ? JSON.stringify(data.refund_policy) : null,
        data.lat || null,
        data.lng || null,
        data.id,
        userId
      ]);

      console.log(`✅ [Vendor Listings] 상품 수정: ID=${data.id}`);

      return res.status(200).json({
        success: true,
        message: '상품이 수정되었습니다.'
      });
    }

    // DELETE - 상품 삭제
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '상품 ID가 필요합니다.'
        });
      }

      // 본인 상품인지 확인
      const checkResult = await connection.execute(
        `SELECT id FROM listings WHERE id = ? AND user_id = ?`,
        [id, userId]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: '권한이 없거나 상품을 찾을 수 없습니다.'
        });
      }

      // 관련 옵션 삭제
      await connection.execute(`DELETE FROM listing_options WHERE listing_id = ?`, [id]);

      // 상품 삭제
      await connection.execute(`DELETE FROM listings WHERE id = ? AND user_id = ?`, [id, userId]);

      console.log(`✅ [Vendor Listings] 상품 삭제: ID=${id}`);

      return res.status(200).json({
        success: true,
        message: '상품이 삭제되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Vendor Listings] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '서버 오류가 발생했습니다.'
    });
  }
}

function parseJson(value, defaultValue) {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

module.exports = withSecureCors(withAuth(handler, { requireAuth: true }));
