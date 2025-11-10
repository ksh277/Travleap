const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 렌트카 보험 상품 API (Vendor)
 * GET /api/vendor/insurance - 보험 상품 목록 조회
 * POST /api/vendor/insurance - 보험 상품 추가
 * PUT /api/vendor/insurance - 보험 상품 수정
 * DELETE /api/vendor/insurance - 보험 상품 삭제
 *
 * ✅ 마이그레이션 완료: insurances 테이블 사용
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

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '등록된 벤더 정보가 없습니다.'
        });
      }

      vendorId = vendorResult.rows[0].id;
    }

    // GET: 보험 상품 목록 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT
          id, vendor_id, vehicle_id, category, name, description,
          price, pricing_unit, coverage_amount, coverage_details,
          is_active, created_at, updated_at
         FROM insurances
         WHERE category = 'rentcar' AND vendor_id = ?
         ORDER BY is_active DESC, price ASC, created_at DESC`,
        [vendorId]
      );

      // coverage_details JSON 파싱
      const insurances = (result.rows || []).map(row => ({
        ...row,
        coverage_details: typeof row.coverage_details === 'string'
          ? JSON.parse(row.coverage_details)
          : row.coverage_details
      }));

      return res.status(200).json({
        success: true,
        data: insurances
      });
    }

    // POST: 보험 상품 추가
    if (req.method === 'POST') {
      const {
        name,
        description,
        coverage_details,
        price,
        pricing_unit,
        coverage_amount,
        vehicle_id,
        is_active
      } = req.body;

      // 필수 필드 검증
      if (!name || !price || !pricing_unit) {
        return res.status(400).json({
          success: false,
          message: '보험 상품명, 가격, 가격 단위는 필수 항목입니다.'
        });
      }

      // 가격 검증
      if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({
          success: false,
          message: '가격은 0 이상의 숫자여야 합니다.'
        });
      }

      // pricing_unit 검증
      if (!['fixed', 'hourly', 'daily'].includes(pricing_unit)) {
        return res.status(400).json({
          success: false,
          message: '가격 단위는 fixed, hourly, daily 중 하나여야 합니다.'
        });
      }

      // coverage_details JSON 변환
      let coverageDetailsJson = null;
      if (coverage_details) {
        try {
          coverageDetailsJson = typeof coverage_details === 'string'
            ? coverage_details
            : JSON.stringify(coverage_details);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: 'coverage_details는 유효한 JSON이어야 합니다.'
          });
        }
      }

      await connection.execute(
        `INSERT INTO insurances (
          category, vendor_id, vehicle_id, name, description,
          price, pricing_unit, coverage_amount, coverage_details,
          is_active, created_at, updated_at
        ) VALUES ('rentcar', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          vendorId,
          vehicle_id || null,
          name,
          description || null,
          price,
          pricing_unit,
          coverage_amount || 0,
          coverageDetailsJson,
          is_active !== undefined ? is_active : true
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
        price,
        pricing_unit,
        coverage_amount,
        vehicle_id,
        is_active
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '수정할 보험 상품 ID가 필요합니다.'
        });
      }

      // 해당 보험 상품이 벤더 소유인지 확인
      const checkResult = await connection.execute(
        'SELECT id FROM insurances WHERE id = ? AND category = ? AND vendor_id = ?',
        [id, 'rentcar', vendorId]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
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
        const coverageDetailsJson = typeof coverage_details === 'string'
          ? coverage_details
          : JSON.stringify(coverage_details);
        updates.push('coverage_details = ?');
        values.push(coverageDetailsJson);
      }
      if (price !== undefined) {
        if (typeof price !== 'number' || price < 0) {
          return res.status(400).json({
            success: false,
            message: '가격은 0 이상의 숫자여야 합니다.'
          });
        }
        updates.push('price = ?');
        values.push(price);
      }
      if (pricing_unit !== undefined) {
        if (!['fixed', 'hourly', 'daily'].includes(pricing_unit)) {
          return res.status(400).json({
            success: false,
            message: '가격 단위는 fixed, hourly, daily 중 하나여야 합니다.'
          });
        }
        updates.push('pricing_unit = ?');
        values.push(pricing_unit);
      }
      if (coverage_amount !== undefined) {
        updates.push('coverage_amount = ?');
        values.push(coverage_amount);
      }
      if (vehicle_id !== undefined) {
        updates.push('vehicle_id = ?');
        values.push(vehicle_id || null);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active);
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
        `UPDATE insurances
         SET ${updates.join(', ')}
         WHERE id = ? AND vendor_id = ? AND category = 'rentcar'`,
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
        'SELECT id FROM insurances WHERE id = ? AND category = ? AND vendor_id = ?',
        [id, 'rentcar', vendorId]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '보험 상품을 찾을 수 없거나 삭제 권한이 없습니다.'
        });
      }

      // 보험 상품 삭제 (예약의 insurance_id는 NULL로 유지됨)
      await connection.execute(
        'DELETE FROM insurances WHERE id = ? AND vendor_id = ? AND category = ?',
        [id, vendorId, 'rentcar']
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
    console.error('❌ [Vendor Insurance API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
