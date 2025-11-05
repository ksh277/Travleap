// ============================================
// 렌트카 벤더 - 옵션 관리 API (CRUD)
// ============================================

import { withSecureCors } from '../../../../utils/cors-middleware';
import { withAuth } from '../../../../utils/auth-middleware';
import mysql from 'mysql2/promise';

const connectionConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
};

async function handler(req, res) {
  const { user } = req;

  // 벤더 권한 확인
  if (!user || !user.vendorId) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: '벤더 권한이 필요합니다.',
    });
  }

  const vendorId = user.vendorId;
  let connection;

  try {
    connection = await mysql.createConnection(connectionConfig);

    // ==========================================
    // GET - 옵션 목록 조회
    // ==========================================
    if (req.method === 'GET') {
      const [extras] = await connection.execute(
        `SELECT
          id,
          extra_code,
          name,
          description,
          category,
          price_type,
          price_krw,
          max_quantity,
          has_inventory,
          current_stock,
          is_active,
          created_at
        FROM rentcar_extras
        WHERE vendor_id = ?
        ORDER BY category, created_at DESC`,
        [vendorId]
      );

      return res.status(200).json({
        success: true,
        data: extras,
      });
    }

    // ==========================================
    // POST - 새 옵션 추가
    // ==========================================
    if (req.method === 'POST') {
      const {
        name,
        description,
        category,
        price_type,
        price_krw,
        max_quantity,
        has_inventory,
        current_stock,
      } = req.body;

      // 필수 필드 검증
      if (!name || !category || !price_type || price_krw === undefined) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '필수 항목이 누락되었습니다.',
        });
      }

      // 카테고리 검증
      const validCategories = ['equipment', 'service', 'driver', 'insurance', 'misc'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_CATEGORY',
          message: '유효하지 않은 카테고리입니다.',
        });
      }

      // 가격 유형 검증
      const validPriceTypes = ['per_day', 'per_rental', 'per_hour', 'per_item'];
      if (!validPriceTypes.includes(price_type)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PRICE_TYPE',
          message: '유효하지 않은 가격 유형입니다.',
        });
      }

      // extra_code 생성 (vendor_id + timestamp)
      const extra_code = `${vendorId}_${Date.now()}`;

      const [result] = await connection.execute(
        `INSERT INTO rentcar_extras
        (vendor_id, extra_code, name, description, category, price_type, price_krw, max_quantity, has_inventory, current_stock, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          vendorId,
          extra_code,
          name,
          description || null,
          category,
          price_type,
          price_krw,
          max_quantity || 1,
          has_inventory ? 1 : 0,
          has_inventory ? (current_stock || 0) : null,
        ]
      );

      return res.status(201).json({
        success: true,
        message: '옵션이 추가되었습니다.',
        data: {
          id: result.insertId,
          extra_code,
        },
      });
    }

    // ==========================================
    // PUT - 옵션 수정
    // ==========================================
    if (req.method === 'PUT') {
      const {
        id,
        name,
        description,
        category,
        price_type,
        price_krw,
        max_quantity,
        has_inventory,
        current_stock,
        is_active,
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_ID',
          message: '옵션 ID가 필요합니다.',
        });
      }

      // 옵션 소유권 확인
      const [existing] = await connection.execute(
        `SELECT id FROM rentcar_extras WHERE id = ? AND vendor_id = ?`,
        [id, vendorId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: '옵션을 찾을 수 없습니다.',
        });
      }

      // 동적 업데이트 쿼리 생성
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
      if (price_type !== undefined) {
        updates.push('price_type = ?');
        values.push(price_type);
      }
      if (price_krw !== undefined) {
        updates.push('price_krw = ?');
        values.push(price_krw);
      }
      if (max_quantity !== undefined) {
        updates.push('max_quantity = ?');
        values.push(max_quantity);
      }
      if (has_inventory !== undefined) {
        updates.push('has_inventory = ?');
        values.push(has_inventory ? 1 : 0);
      }
      if (current_stock !== undefined) {
        updates.push('current_stock = ?');
        values.push(current_stock);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'NO_UPDATES',
          message: '수정할 내용이 없습니다.',
        });
      }

      values.push(id, vendorId);

      await connection.execute(
        `UPDATE rentcar_extras SET ${updates.join(', ')} WHERE id = ? AND vendor_id = ?`,
        values
      );

      return res.status(200).json({
        success: true,
        message: '옵션이 수정되었습니다.',
      });
    }

    // ==========================================
    // DELETE - 옵션 삭제
    // ==========================================
    if (req.method === 'DELETE') {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_ID',
          message: '옵션 ID가 필요합니다.',
        });
      }

      // 옵션 소유권 확인
      const [existing] = await connection.execute(
        `SELECT id FROM rentcar_extras WHERE id = ? AND vendor_id = ?`,
        [id, vendorId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: '옵션을 찾을 수 없습니다.',
        });
      }

      // Soft delete (is_active = 0)
      await connection.execute(
        `UPDATE rentcar_extras SET is_active = 0 WHERE id = ? AND vendor_id = ?`,
        [id, vendorId]
      );

      return res.status(200).json({
        success: true,
        message: '옵션이 삭제되었습니다.',
      });
    }

    // 지원하지 않는 메서드
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: '지원하지 않는 HTTP 메서드입니다.',
    });
  } catch (error) {
    console.error('[Rentcar Extras API Error]', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '서버 오류가 발생했습니다.',
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export default withSecureCors(withAuth(handler));
