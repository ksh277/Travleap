const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 렌트카 보험 상품 API
 * GET /api/vendor/insurance - 보험 상품 목록 조회
 * POST /api/vendor/insurance - 보험 상품 추가
 * PUT /api/vendor/insurance - 보험 상품 수정
 * DELETE /api/vendor/insurance - 보험 상품 삭제
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // JWT 인증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.'
      });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '벤더 권한이 필요합니다.'
      });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 벤더 ID 조회
    let vendorId;
    if (decoded.role === 'admin') {
      vendorId = req.query.vendorId || req.body?.vendorId;
    } else {
      const vendorResult = await connection.execute(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult || vendorResult.length === 0) {
        return res.status(403).json({
          success: false,
          message: '등록된 벤더 정보가 없습니다.'
        });
      }

      vendorId = vendorResult[0].id;
    }

    // GET: 보험 상품 목록 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT
          id, vendor_id, name, description, coverage_details,
          hourly_rate_krw, is_active, display_order,
          created_at, updated_at
         FROM rentcar_insurance
         WHERE vendor_id = ?
         ORDER BY display_order ASC, created_at DESC`,
        [vendorId]
      );

      return res.status(200).json({
        success: true,
        data: result || []
      });
    }

    // POST: 보험 상품 추가
    if (req.method === 'POST') {
      const {
        name,
        description,
        coverage_details,
        hourly_rate_krw,
        is_active,
        display_order
      } = req.body;

      if (!name || !hourly_rate_krw) {
        return res.status(400).json({
          success: false,
          message: '보험 상품명과 시간당 요금은 필수 항목입니다.'
        });
      }

      // 시간당 요금 검증
      if (typeof hourly_rate_krw !== 'number' || hourly_rate_krw < 0) {
        return res.status(400).json({
          success: false,
          message: '시간당 요금은 0 이상의 숫자여야 합니다.'
        });
      }

      await connection.execute(
        `INSERT INTO rentcar_insurance (
          vendor_id, name, description, coverage_details,
          hourly_rate_krw, is_active, display_order,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          vendorId,
          name,
          description || null,
          coverage_details || null,
          hourly_rate_krw,
          is_active !== undefined ? is_active : true,
          display_order || 0
        ]
      );

      return res.status(201).json({
        success: true,
        message: '보험 상품이 추가되었습니다.'
      });
    }

    // PUT: 보험 상품 수정
    if (req.method === 'PUT') {
      const {
        id,
        name,
        description,
        coverage_details,
        hourly_rate_krw,
        is_active,
        display_order
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '수정할 보험 상품 ID가 필요합니다.'
        });
      }

      // 해당 보험 상품이 벤더 소유인지 확인
      const checkResult = await connection.execute(
        'SELECT id FROM rentcar_insurance WHERE id = ? AND vendor_id = ?',
        [id, vendorId]
      );

      if (!checkResult || checkResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: '보험 상품을 찾을 수 없거나 수정 권한이 없습니다.'
        });
      }

      // 업데이트할 필드만 동적으로 구성
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (coverage_details !== undefined) {
        updates.push('coverage_details = ?');
        values.push(coverage_details);
      }
      if (hourly_rate_krw !== undefined) {
        if (typeof hourly_rate_krw !== 'number' || hourly_rate_krw < 0) {
          return res.status(400).json({
            success: false,
            message: '시간당 요금은 0 이상의 숫자여야 합니다.'
          });
        }
        updates.push('hourly_rate_krw = ?');
        values.push(hourly_rate_krw);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active);
      }
      if (display_order !== undefined) {
        updates.push('display_order = ?');
        values.push(display_order);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: '수정할 항목이 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(id, vendorId);

      await connection.execute(
        `UPDATE rentcar_insurance
         SET ${updates.join(', ')}
         WHERE id = ? AND vendor_id = ?`,
        values
      );

      return res.status(200).json({
        success: true,
        message: '보험 상품이 수정되었습니다.'
      });
    }

    // DELETE: 보험 상품 삭제
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '삭제할 보험 상품 ID가 필요합니다.'
        });
      }

      // 해당 보험 상품이 벤더 소유인지 확인
      const checkResult = await connection.execute(
        'SELECT id FROM rentcar_insurance WHERE id = ? AND vendor_id = ?',
        [id, vendorId]
      );

      if (!checkResult || checkResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: '보험 상품을 찾을 수 없거나 삭제 권한이 없습니다.'
        });
      }

      // 보험 상품 삭제 (CASCADE로 연결된 예약의 insurance_id는 NULL로 설정됨)
      await connection.execute(
        'DELETE FROM rentcar_insurance WHERE id = ? AND vendor_id = ?',
        [id, vendorId]
      );

      return res.status(200).json({
        success: true,
        message: '보험 상품이 삭제되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
    });

  } catch (error) {
    console.error('❌ [Insurance API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
