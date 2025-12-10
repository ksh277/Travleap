const { connect } = require('@planetscale/database');
const { logAdminAction, LOG_TYPES } = require('../../utils/activity-logger.cjs');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // POST - 새 상품 생성
    if (req.method === 'POST') {
      const listingData = req.body;

      const result = await connection.execute(
        `INSERT INTO listings (
          title, description_md, short_description, price_from, child_price, infant_price,
          location, address, meeting_point, category_id, category, partner_id,
          images, max_capacity, highlights, included, excluded,
          is_active, is_featured, is_published,
          has_options, min_purchase, max_purchase, stock_enabled, stock, shipping_fee, refund_policy,
          lat, lng,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          listingData.title,
          listingData.longDescription || listingData.description || '',
          listingData.description || '',
          listingData.price || 0,
          listingData.childPrice || null,
          listingData.infantPrice || null,
          listingData.location || '',
          listingData.detailedAddress || '',
          listingData.meetingPoint || '',
          listingData.category_id,
          listingData.category || 'travel',
          listingData.partner_id || null,
          listingData.images ? JSON.stringify(listingData.images) : '[]',
          listingData.maxCapacity || 10,
          listingData.highlights ? JSON.stringify(listingData.highlights.filter(h => h.trim())) : '[]',
          listingData.included ? JSON.stringify(listingData.included.filter(i => i.trim())) : '[]',
          listingData.excluded ? JSON.stringify(listingData.excluded.filter(e => e.trim())) : '[]',
          listingData.is_active !== false ? 1 : 0,
          listingData.featured ? 1 : 0,
          1, // is_published
          // 팝업 상품 전용 필드
          listingData.hasOptions ? 1 : 0,
          listingData.minPurchase || null,
          listingData.maxPurchase || null,
          listingData.stockEnabled ? 1 : 0,
          listingData.stock || null,
          listingData.shippingFee || null,
          listingData.refundPolicy ? JSON.stringify(listingData.refundPolicy) : null,
          listingData.lat || null,
          listingData.lng || null
        ]
      );

      // 상품 생성 로그 기록
      try {
        await logAdminAction({
          adminId: req.headers['x-user-id'] || null,
          action: LOG_TYPES.ADMIN_PRODUCT_CREATE,
          entityType: 'listing',
          entityId: result.insertId,
          entityName: listingData.title,
          req
        });
      } catch (logError) {
        console.warn('상품 생성 로그 기록 실패:', logError.message);
      }

      return res.status(201).json({
        success: true,
        data: { id: result.insertId },
        message: '상품이 성공적으로 생성되었습니다.'
      });
    }

    // GET - 상품 목록 조회
    if (req.method === 'GET') {
      const result = await connection.execute(`
      SELECT
        l.*,
        c.name_ko as category_name,
        c.slug as category_slug,
        p.business_name as partner_name,
        p.status as partner_status,
        (SELECT COUNT(*) FROM reviews r WHERE r.listing_id = l.id AND r.is_hidden != 1) as actual_review_count,
        (SELECT AVG(r.rating) FROM reviews r WHERE r.listing_id = l.id AND r.is_hidden != 1) as actual_rating_avg
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE c.slug != 'stay' AND c.slug != 'rentcar'
      ORDER BY l.created_at DESC
      `);

      // ✅ 실제 리뷰 데이터 사용
      const listings = (result.rows || []).map(listing => {
        const actualCount = Number(listing.actual_review_count) || 0;
        const actualAvg = Number(listing.actual_rating_avg) || 0;

        return {
          ...listing,
          rating_count: actualCount,
          rating_avg: actualAvg > 0 ? actualAvg : 0
        };
      });

      return res.status(200).json({
        success: true,
        data: listings
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('Listing API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
