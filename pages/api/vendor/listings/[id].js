const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
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

  // JWT 서명 검증 (보안 강화)
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: '유효하지 않은 토큰입니다.'
    });
  }

  if (!decoded || !decoded.userId) {
    return res.status(401).json({
      success: false,
      error: '토큰에 사용자 정보가 없습니다.'
    });
  }

  const userId = decoded.userId;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: '상품 ID가 필요합니다.'
    });
  }

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

    const partnerId = partnerResult.rows[0].id;

    // 상품이 해당 벤더의 것인지 확인
    const listingCheck = await connection.execute(
      'SELECT id, partner_id FROM listings WHERE id = ?',
      [id]
    );

    if (!listingCheck.rows || listingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '상품을 찾을 수 없습니다.'
      });
    }

    if (listingCheck.rows[0].partner_id !== partnerId) {
      return res.status(403).json({
        success: false,
        error: '이 상품에 대한 권한이 없습니다.'
      });
    }

    // GET - 상품 상세 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        'SELECT * FROM listings WHERE id = ?',
        [id]
      );

      return res.status(200).json({
        success: true,
        data: result.rows[0]
      });
    }

    // PUT - 상품 수정
    if (req.method === 'PUT') {
      const listingData = req.body;

      // 필수 필드 검증
      if (!listingData.title || !listingData.category) {
        return res.status(400).json({
          success: false,
          error: '상품명과 카테고리는 필수입니다.'
        });
      }

      await connection.execute(
        `UPDATE listings SET
          title = ?,
          description_md = ?,
          short_description = ?,
          price_from = ?,
          child_price = ?,
          infant_price = ?,
          location = ?,
          address = ?,
          meeting_point = ?,
          category_id = ?,
          category = ?,
          images = ?,
          max_capacity = ?,
          highlights = ?,
          included = ?,
          excluded = ?,
          is_active = ?,
          has_options = ?,
          min_purchase = ?,
          max_purchase = ?,
          stock_enabled = ?,
          stock = ?,
          shipping_fee = ?,
          is_refundable = ?,
          refund_policy = ?,
          updated_at = NOW()
        WHERE id = ? AND partner_id = ?`,
        [
          listingData.title,
          listingData.longDescription || listingData.description_md || listingData.description || '',
          listingData.description || listingData.short_description || '',
          listingData.price || listingData.price_from || 0,
          listingData.childPrice || listingData.child_price || null,
          listingData.infantPrice || listingData.infant_price || null,
          listingData.location || '',
          listingData.detailedAddress || listingData.address || '',
          listingData.meetingPoint || listingData.meeting_point || '',
          listingData.category_id || null,
          listingData.category,
          listingData.images ? JSON.stringify(listingData.images) : '[]',
          listingData.maxCapacity || listingData.max_capacity || 10,
          listingData.highlights ? JSON.stringify(Array.isArray(listingData.highlights) ? listingData.highlights.filter(h => h.trim()) : []) : '[]',
          listingData.included ? JSON.stringify(Array.isArray(listingData.included) ? listingData.included.filter(i => i.trim()) : []) : '[]',
          listingData.excluded ? JSON.stringify(Array.isArray(listingData.excluded) ? listingData.excluded.filter(e => e.trim()) : []) : '[]',
          listingData.is_active !== false ? 1 : 0,
          listingData.hasOptions || listingData.has_options ? 1 : 0,
          listingData.minPurchase || listingData.min_purchase || null,
          listingData.maxPurchase || listingData.max_purchase || null,
          listingData.stockEnabled || listingData.stock_enabled ? 1 : 0,
          listingData.stock || null,
          listingData.shippingFee || listingData.shipping_fee || null,
          listingData.isRefundable !== undefined ? (listingData.isRefundable ? 1 : 0) : (listingData.is_refundable !== undefined ? (listingData.is_refundable ? 1 : 0) : 1),
          listingData.refundPolicy || listingData.refund_policy ? JSON.stringify(listingData.refundPolicy || listingData.refund_policy) : null,
          id,
          partnerId
        ]
      );

      console.log(`✅ [Vendor Listings] 상품 수정 완료: listing_id=${id}`);

      return res.status(200).json({
        success: true,
        message: '상품이 성공적으로 수정되었습니다.'
      });
    }

    // DELETE - 상품 삭제
    if (req.method === 'DELETE') {
      // 예약이 있는지 확인
      const bookingCheck = await connection.execute(
        'SELECT COUNT(*) as count FROM bookings WHERE listing_id = ? AND status NOT IN ("cancelled", "completed")',
        [id]
      );

      if (bookingCheck.rows[0].count > 0) {
        return res.status(400).json({
          success: false,
          error: '진행 중인 예약이 있는 상품은 삭제할 수 없습니다.'
        });
      }

      // soft delete (is_active = 0)
      await connection.execute(
        'UPDATE listings SET is_active = 0, is_published = 0, updated_at = NOW() WHERE id = ? AND partner_id = ?',
        [id, partnerId]
      );

      console.log(`✅ [Vendor Listings] 상품 삭제(비활성화) 완료: listing_id=${id}`);

      return res.status(200).json({
        success: true,
        message: '상품이 성공적으로 삭제되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ [Vendor Listing] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
