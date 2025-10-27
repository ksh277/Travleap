/**
 * 관리자 쿠폰 관리 API
 *
 * GET /api/admin/coupons - 쿠폰 목록 조회 (전체, 활성/비활성 포함)
 * POST /api/admin/coupons - 쿠폰 생성
 * PUT /api/admin/coupons/:id - 쿠폰 수정
 * DELETE /api/admin/coupons/:id - 쿠폰 삭제
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. JWT 인증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    // 관리자 권한 확인
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // GET: 쿠폰 목록 조회
    if (req.method === 'GET') {
      console.log('📋 [Admin Coupons] Fetching all coupons');

      const result = await connection.execute(`
        SELECT
          c.*,
          u.name as created_by_name,
          (SELECT COUNT(*) FROM coupon_usage WHERE coupon_id = c.id) as total_used
        FROM coupons c
        LEFT JOIN users u ON c.created_by = u.id
        ORDER BY c.created_at DESC
      `);

      const coupons = result.rows || [];

      console.log(`✅ [Admin Coupons] Found ${coupons.length} coupons`);

      return res.status(200).json({
        success: true,
        data: coupons
      });
    }

    // POST: 쿠폰 생성
    if (req.method === 'POST') {
      const {
        code,
        description,
        discount_type,
        discount_value,
        min_amount,
        max_usage,
        usage_per_user,
        valid_from,
        valid_until,
        target_category,
        is_active
      } = req.body;

      // 필수 필드 검증
      if (!code || !discount_type || !discount_value) {
        return res.status(400).json({
          success: false,
          message: '쿠폰 코드, 할인 유형, 할인 값은 필수입니다.'
        });
      }

      console.log(`➕ [Admin Coupons] Creating coupon: ${code}`);

      // 중복 코드 확인
      const duplicateCheck = await connection.execute(`
        SELECT id FROM coupons WHERE code = ? LIMIT 1
      `, [code.toUpperCase()]);

      if (duplicateCheck.rows && duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: '이미 존재하는 쿠폰 코드입니다.'
        });
      }

      // 쿠폰 생성
      const insertResult = await connection.execute(`
        INSERT INTO coupons (
          code,
          description,
          discount_type,
          discount_value,
          min_amount,
          max_usage,
          usage_per_user,
          valid_from,
          valid_until,
          target_category,
          is_active,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        code.toUpperCase(),
        description || null,
        discount_type,
        discount_value,
        min_amount || 0,
        max_usage || null,
        usage_per_user || null,
        valid_from || null,
        valid_until || null,
        target_category || null,
        is_active !== false ? 1 : 0,
        decoded.userId
      ]);

      console.log(`✅ [Admin Coupons] Coupon created successfully, ID: ${insertResult.insertId}`);

      return res.status(201).json({
        success: true,
        message: '쿠폰이 생성되었습니다.',
        data: {
          id: insertResult.insertId,
          code: code.toUpperCase()
        }
      });
    }

    // PUT: 쿠폰 수정
    if (req.method === 'PUT') {
      const couponId = req.query.id || req.body.id;

      if (!couponId) {
        return res.status(400).json({
          success: false,
          message: '쿠폰 ID가 필요합니다.'
        });
      }

      const {
        description,
        discount_type,
        discount_value,
        min_amount,
        max_usage,
        usage_per_user,
        valid_from,
        valid_until,
        target_category,
        is_active
      } = req.body;

      console.log(`✏️ [Admin Coupons] Updating coupon ID: ${couponId}`);

      // 쿠폰 존재 확인
      const couponCheck = await connection.execute(`
        SELECT id FROM coupons WHERE id = ? LIMIT 1
      `, [couponId]);

      if (!couponCheck.rows || couponCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '쿠폰을 찾을 수 없습니다.'
        });
      }

      // 쿠폰 업데이트
      await connection.execute(`
        UPDATE coupons SET
          description = ?,
          discount_type = ?,
          discount_value = ?,
          min_amount = ?,
          max_usage = ?,
          usage_per_user = ?,
          valid_from = ?,
          valid_until = ?,
          target_category = ?,
          is_active = ?
        WHERE id = ?
      `, [
        description || null,
        discount_type,
        discount_value,
        min_amount || 0,
        max_usage || null,
        usage_per_user || null,
        valid_from || null,
        valid_until || null,
        target_category || null,
        is_active !== false ? 1 : 0,
        couponId
      ]);

      console.log(`✅ [Admin Coupons] Coupon updated successfully`);

      return res.status(200).json({
        success: true,
        message: '쿠폰이 수정되었습니다.'
      });
    }

    // DELETE: 쿠폰 삭제
    if (req.method === 'DELETE') {
      const couponId = req.query.id;

      if (!couponId) {
        return res.status(400).json({
          success: false,
          message: '쿠폰 ID가 필요합니다.'
        });
      }

      console.log(`🗑️ [Admin Coupons] Deleting coupon ID: ${couponId}`);

      // 쿠폰 사용 내역 확인
      const usageCheck = await connection.execute(`
        SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = ?
      `, [couponId]);

      const usageCount = usageCheck.rows[0]?.count || 0;

      if (usageCount > 0) {
        // 사용 내역이 있으면 비활성화만 진행
        await connection.execute(`
          UPDATE coupons SET is_active = 0 WHERE id = ?
        `, [couponId]);

        console.log(`⚠️ [Admin Coupons] Coupon has ${usageCount} usage records, deactivated instead of deleted`);

        return res.status(200).json({
          success: true,
          message: `쿠폰에 ${usageCount}개의 사용 내역이 있어 비활성화되었습니다.`,
          deactivated: true
        });
      } else {
        // 사용 내역이 없으면 완전 삭제
        await connection.execute(`
          DELETE FROM coupons WHERE id = ?
        `, [couponId]);

        console.log(`✅ [Admin Coupons] Coupon deleted successfully`);

        return res.status(200).json({
          success: true,
          message: '쿠폰이 삭제되었습니다.',
          deleted: true
        });
      }
    }

    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
    });

  } catch (error) {
    console.error('❌ [Admin Coupons] API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
