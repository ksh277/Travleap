const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

// JWT 디코딩 함수
function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 벤더 인증 확인
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: '인증이 필요합니다.'
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = decodeJWT(token);

  if (!decoded || !decoded.userId) {
    return res.status(401).json({
      success: false,
      error: '유효하지 않은 토큰입니다.'
    });
  }

  const userId = decoded.userId;
  console.log(`🔐 [Vendor Listings] userId: ${userId}`);

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // userId로 partner_id 조회
    const partnerResult = await connection.execute(
      'SELECT id, category, status FROM partners WHERE user_id = ? AND status = "active" LIMIT 1',
      [userId]
    );

    if (!partnerResult.rows || partnerResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '활성화된 파트너 계정이 없습니다.'
      });
    }

    const partner = partnerResult.rows[0];
    const partnerId = partner.id;
    console.log(`✅ [Vendor Listings] partnerId: ${partnerId}, category: ${partner.category}`);

    // GET - 벤더의 상품 목록 조회
    if (req.method === 'GET') {
      const result = await connection.execute(`
        SELECT
          l.*,
          COUNT(DISTINCT r.id) as review_count,
          AVG(r.rating) as avg_rating
        FROM listings l
        LEFT JOIN reviews r ON l.id = r.listing_id
        WHERE l.partner_id = ?
        GROUP BY l.id
        ORDER BY l.created_at DESC
      `, [partnerId]);

      console.log(`📋 [Vendor Listings] ${result.rows?.length || 0}개 상품 조회`);

      return res.status(200).json({
        success: true,
        data: result.rows || [],
        partner: {
          id: partnerId,
          category: partner.category
        }
      });
    }

    // POST - 새 상품 생성
    if (req.method === 'POST') {
      const listingData = req.body;

      // 필수 필드 검증
      if (!listingData.title || !listingData.category) {
        return res.status(400).json({
          success: false,
          error: '상품명과 카테고리는 필수입니다.'
        });
      }

      const result = await connection.execute(
        `INSERT INTO listings (
          title, description_md, short_description, price_from, child_price, infant_price,
          location, address, meeting_point, category_id, category, partner_id,
          images, max_capacity, highlights, included, excluded,
          is_active, is_featured, is_published,
          has_options, min_purchase, max_purchase, stock_enabled, stock, shipping_fee, is_refundable, refund_policy,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          listingData.title,
          listingData.longDescription || listingData.description || '',
          listingData.description || listingData.short_description || '',
          listingData.price || listingData.price_from || 0,
          listingData.childPrice || listingData.child_price || null,
          listingData.infantPrice || listingData.infant_price || null,
          listingData.location || '',
          listingData.detailedAddress || listingData.address || '',
          listingData.meetingPoint || listingData.meeting_point || '',
          listingData.category_id || null,
          listingData.category,
          partnerId, // 벤더 자신의 partner_id로 자동 설정
          listingData.images ? JSON.stringify(listingData.images) : '[]',
          listingData.maxCapacity || listingData.max_capacity || 10,
          listingData.highlights ? JSON.stringify(Array.isArray(listingData.highlights) ? listingData.highlights.filter(h => h.trim()) : []) : '[]',
          listingData.included ? JSON.stringify(Array.isArray(listingData.included) ? listingData.included.filter(i => i.trim()) : []) : '[]',
          listingData.excluded ? JSON.stringify(Array.isArray(listingData.excluded) ? listingData.excluded.filter(e => e.trim()) : []) : '[]',
          listingData.is_active !== false ? 1 : 0,
          0, // is_featured - 벤더는 직접 설정 불가
          1, // is_published
          // 팝업 상품 전용 필드
          listingData.hasOptions || listingData.has_options ? 1 : 0,
          listingData.minPurchase || listingData.min_purchase || null,
          listingData.maxPurchase || listingData.max_purchase || null,
          listingData.stockEnabled || listingData.stock_enabled ? 1 : 0,
          listingData.stock || null,
          listingData.shippingFee || listingData.shipping_fee || null,
          listingData.isRefundable !== undefined ? (listingData.isRefundable ? 1 : 0) : (listingData.is_refundable !== undefined ? (listingData.is_refundable ? 1 : 0) : 1),
          listingData.refundPolicy || listingData.refund_policy ? JSON.stringify(listingData.refundPolicy || listingData.refund_policy) : null
        ]
      );

      console.log(`✅ [Vendor Listings] 상품 생성 완료: listing_id=${result.insertId}`);

      return res.status(201).json({
        success: true,
        data: { id: result.insertId },
        message: '상품이 성공적으로 생성되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ [Vendor Listings] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
