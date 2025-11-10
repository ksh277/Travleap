/**
 * 벤더용 렌트카 옵션 관리 API
 * GET    /api/vendor/rentcar/extras - 옵션 목록 조회
 * POST   /api/vendor/rentcar/extras - 옵션 추가
 * PUT    /api/vendor/rentcar/extras - 옵션 수정
 * DELETE /api/vendor/rentcar/extras - 옵션 삭제
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
    // 벤더 인증
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

    // DB 연결
    const connection = connect({ url: process.env.DATABASE_URL });

    // 벤더 ID 조회
    let vendorId;
    if (decoded.role === 'admin') {
      vendorId = req.query.vendorId || req.body?.vendorId;
    } else {
      const vendorResult = await connection.execute(
        'SELECT id, business_name, status FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '등록된 벤더 정보가 없습니다.'
        });
      }

      const vendor = vendorResult.rows[0];
      if (vendor.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: '비활성화된 벤더 계정입니다.'
        });
      }

      vendorId = vendor.id;
    }

    console.log('🎛️ [Extras API] 요청:', { method: req.method, vendorId, user: decoded.email });

    // GET: 옵션 목록 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT
          id,
          vendor_id,
          name,
          description,
          category,
          price_krw,
          price_type,
          has_inventory,
          current_stock,
          max_quantity,
          display_order,
          is_active,
          created_at,
          updated_at
        FROM rentcar_extras
        WHERE vendor_id = ?
        ORDER BY display_order ASC, created_at DESC`,
        [vendorId]
      );

      const extras = (result.rows || []).map(extra => ({
        ...extra,
        is_active: extra.is_active === 1,
        has_inventory: extra.has_inventory === 1
      }));

      return res.status(200).json({
        success: true,
        data: {
          extras,
          total: extras.length
        }
      });
    }

    // POST: 옵션 추가
    if (req.method === 'POST') {
      const {
        name,
        description,
        category = 'misc',
        price_krw,
        price_type = 'per_rental',
        has_inventory = false,
        current_stock = 0,
        max_quantity = 10,
        display_order = 0,
        is_active = true
      } = req.body;

      if (!name || !price_krw) {
        return res.status(400).json({
          success: false,
          error: '이름과 가격은 필수입니다'
        });
      }

      // 가격 타입 검증
      const validPriceTypes = ['per_rental', 'per_day', 'per_hour', 'per_item'];
      if (!validPriceTypes.includes(price_type)) {
        return res.status(400).json({
          success: false,
          error: `price_type은 ${validPriceTypes.join(', ')} 중 하나여야 합니다`
        });
      }

      // 카테고리 검증
      const validCategories = ['equipment', 'service', 'driver', 'insurance', 'misc'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: `category는 ${validCategories.join(', ')} 중 하나여야 합니다`
        });
      }

      const result = await connection.execute(
        `INSERT INTO rentcar_extras (
          vendor_id, name, description, category,
          price_krw, price_type,
          has_inventory, current_stock, max_quantity,
          display_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vendorId, name, description || '', category,
          price_krw, price_type,
          has_inventory, current_stock, max_quantity,
          display_order, is_active
        ]
      );

      return res.status(201).json({
        success: true,
        data: {
          id: result.insertId,
          message: '옵션이 추가되었습니다'
        }
      });
    }

    // PUT: 옵션 수정
    if (req.method === 'PUT') {
      const {
        id,
        name,
        description,
        category,
        price_krw,
        price_type,
        has_inventory,
        current_stock,
        max_quantity,
        display_order,
        is_active
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '옵션 ID가 필요합니다'
        });
      }

      // 해당 옵션이 이 벤더의 것인지 확인
      const checkResult = await connection.execute(
        'SELECT id FROM rentcar_extras WHERE id = ? AND vendor_id = ?',
        [id, vendorId]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '옵션을 찾을 수 없거나 권한이 없습니다'
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
      if (category !== undefined) {
        updates.push('category = ?');
        values.push(category);
      }
      if (price_krw !== undefined) {
        updates.push('price_krw = ?');
        values.push(price_krw);
      }
      if (price_type !== undefined) {
        updates.push('price_type = ?');
        values.push(price_type);
      }
      if (has_inventory !== undefined) {
        updates.push('has_inventory = ?');
        values.push(has_inventory);
      }
      if (current_stock !== undefined) {
        updates.push('current_stock = ?');
        values.push(current_stock);
      }
      if (max_quantity !== undefined) {
        updates.push('max_quantity = ?');
        values.push(max_quantity);
      }
      if (display_order !== undefined) {
        updates.push('display_order = ?');
        values.push(display_order);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '업데이트할 필드가 없습니다'
        });
      }

      values.push(id);

      await connection.execute(
        `UPDATE rentcar_extras SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return res.status(200).json({
        success: true,
        data: {
          message: '옵션이 수정되었습니다'
        }
      });
    }

    // DELETE: 옵션 삭제
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '옵션 ID가 필요합니다'
        });
      }

      // 해당 옵션이 이 벤더의 것인지 확인
      const checkResult = await connection.execute(
        'SELECT id FROM rentcar_extras WHERE id = ? AND vendor_id = ?',
        [id, vendorId]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '옵션을 찾을 수 없거나 권한이 없습니다'
        });
      }

      await connection.execute(
        'DELETE FROM rentcar_extras WHERE id = ?',
        [id]
      );

      return res.status(200).json({
        success: true,
        data: {
          message: '옵션이 삭제되었습니다'
        }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ [Vendor Extras API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다',
      message: error.message
    });
  }
};
