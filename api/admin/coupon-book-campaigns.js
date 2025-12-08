const { connect } = require('@planetscale/database');

/**
 * 쿠폰북 캠페인 관리 API
 * GET /api/admin/coupon-book-campaigns - 목록 조회
 * POST /api/admin/coupon-book-campaigns - 생성
 * PUT /api/admin/coupon-book-campaigns - 수정
 * DELETE /api/admin/coupon-book-campaigns - 삭제
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // GET: 캠페인 목록 조회
    if (req.method === 'GET') {
      const result = await connection.execute(`
        SELECT
          cbc.*,
          c.code as coupon_code,
          c.name as coupon_name,
          c.discount_type,
          c.discount_value,
          c.valid_until as coupon_expires_at
        FROM coupon_book_campaigns cbc
        LEFT JOIN coupons c ON cbc.coupon_id = c.id
        ORDER BY cbc.created_at DESC
      `);

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    }

    // POST: 캠페인 생성
    if (req.method === 'POST') {
      const {
        name,
        description,
        coupon_id,
        target_islands,
        max_claims,
        valid_from,
        valid_until
      } = req.body;

      if (!name || !coupon_id) {
        return res.status(400).json({
          success: false,
          message: '캠페인명과 쿠폰 ID가 필요합니다'
        });
      }

      // 쿠폰 존재 확인
      const couponCheck = await connection.execute(
        'SELECT id FROM coupons WHERE id = ?',
        [coupon_id]
      );

      if (!couponCheck.rows || couponCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: '존재하지 않는 쿠폰입니다'
        });
      }

      // 캠페인 생성
      const insertResult = await connection.execute(`
        INSERT INTO coupon_book_campaigns (
          name, description, coupon_id, target_islands,
          max_claims, current_claims, valid_from, valid_until, is_active
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, 1)
      `, [
        name,
        description || null,
        coupon_id,
        target_islands ? JSON.stringify(target_islands) : null,
        max_claims || null,
        valid_from || null,
        valid_until || null
      ]);

      const campaignId = insertResult.insertId;

      // QR URL 및 Claim URL 생성
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://travleap.com';
      const claimUrl = `${baseUrl}/coupon-book/claim?campaign=${campaignId}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(claimUrl)}`;

      // URL 업데이트
      await connection.execute(`
        UPDATE coupon_book_campaigns
        SET claim_url = ?, qr_code_url = ?
        WHERE id = ?
      `, [claimUrl, qrCodeUrl, campaignId]);

      console.log(`[CouponBook] Campaign created: ${campaignId} - ${name}`);

      return res.status(201).json({
        success: true,
        message: '캠페인이 생성되었습니다',
        data: {
          id: campaignId,
          claim_url: claimUrl,
          qr_code_url: qrCodeUrl
        }
      });
    }

    // PUT: 캠페인 수정
    if (req.method === 'PUT') {
      const {
        id,
        name,
        description,
        coupon_id,
        target_islands,
        max_claims,
        valid_from,
        valid_until,
        is_active
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '캠페인 ID가 필요합니다'
        });
      }

      await connection.execute(`
        UPDATE coupon_book_campaigns SET
          name = ?,
          description = ?,
          coupon_id = ?,
          target_islands = ?,
          max_claims = ?,
          valid_from = ?,
          valid_until = ?,
          is_active = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        name,
        description || null,
        coupon_id,
        target_islands ? JSON.stringify(target_islands) : null,
        max_claims || null,
        valid_from || null,
        valid_until || null,
        is_active ? 1 : 0,
        id
      ]);

      console.log(`[CouponBook] Campaign updated: ${id}`);

      return res.status(200).json({
        success: true,
        message: '캠페인이 수정되었습니다'
      });
    }

    // DELETE: 캠페인 삭제
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '캠페인 ID가 필요합니다'
        });
      }

      // 발급된 쿠폰이 있는지 확인
      const usageCheck = await connection.execute(
        'SELECT current_claims FROM coupon_book_campaigns WHERE id = ?',
        [id]
      );

      if (usageCheck.rows && usageCheck.rows.length > 0 && usageCheck.rows[0].current_claims > 0) {
        // 발급된 쿠폰이 있으면 비활성화만
        await connection.execute(
          'UPDATE coupon_book_campaigns SET is_active = 0 WHERE id = ?',
          [id]
        );

        return res.status(200).json({
          success: true,
          message: '발급된 쿠폰이 있어 비활성화되었습니다'
        });
      }

      // 발급된 쿠폰이 없으면 삭제
      await connection.execute(
        'DELETE FROM coupon_book_campaigns WHERE id = ?',
        [id]
      );

      console.log(`[CouponBook] Campaign deleted: ${id}`);

      return res.status(200).json({
        success: true,
        message: '캠페인이 삭제되었습니다'
      });
    }

    return res.status(405).json({
      success: false,
      message: '허용되지 않는 메소드입니다'
    });

  } catch (error) {
    console.error('[CouponBook] API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다'
    });
  }
};
