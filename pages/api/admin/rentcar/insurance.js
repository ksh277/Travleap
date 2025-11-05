// ============================================
// 관리자 - 렌트카 보험 관리 API (CRUD)
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

/**
 * 관리자 권한 확인
 */
function checkAdminPermission(user) {
  if (!user) {
    return { error: 'UNAUTHORIZED', message: '로그인이 필요합니다.' };
  }

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return { error: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' };
  }

  return null;
}

async function handler(req, res) {
  const { user } = req;

  // 관리자 권한 확인
  const permissionError = checkAdminPermission(user);
  if (permissionError) {
    return res.status(permissionError.error === 'UNAUTHORIZED' ? 401 : 403).json({
      success: false,
      error: permissionError.error,
      message: permissionError.message,
    });
  }

  let connection;

  try {
    connection = await mysql.createConnection(connectionConfig);

    // ==========================================
    // GET - 보험 상품 목록 조회
    // ==========================================
    if (req.method === 'GET') {
      const { vendor_id } = req.query;

      let query = `
        SELECT
          i.id,
          i.vendor_id,
          i.name,
          i.description,
          i.coverage_details,
          i.hourly_rate_krw,
          i.is_required,
          i.is_active,
          i.display_order,
          i.created_at,
          i.updated_at,
          v.business_name as vendor_name
        FROM rentcar_insurance i
        LEFT JOIN rentcar_vendors v ON i.vendor_id = v.id
      `;

      const params = [];

      if (vendor_id) {
        query += ' WHERE i.vendor_id = ?';
        params.push(vendor_id);
      }

      query += ' ORDER BY i.vendor_id, i.display_order ASC, i.created_at DESC';

      const [insurances] = await connection.execute(query, params);

      return res.status(200).json({
        success: true,
        data: insurances,
      });
    }

    // ==========================================
    // POST - 새 보험 상품 추가
    // ==========================================
    if (req.method === 'POST') {
      const {
        vendor_id,
        name,
        description,
        coverage_details,
        hourly_rate_krw,
        is_required = false,
        display_order = 0,
      } = req.body;

      // 필수 필드 검증
      if (!vendor_id || !name || hourly_rate_krw === undefined) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '필수 항목이 누락되었습니다. (vendor_id, name, hourly_rate_krw)',
        });
      }

      // 가격 검증
      if (hourly_rate_krw < 0) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PRICE',
          message: '시간당 요금은 0 이상이어야 합니다.',
        });
      }

      // 벤더 존재 확인
      const [vendors] = await connection.execute(
        'SELECT id FROM rentcar_vendors WHERE id = ?',
        [vendor_id]
      );

      if (vendors.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'VENDOR_NOT_FOUND',
          message: '해당 렌트카 업체를 찾을 수 없습니다.',
        });
      }

      const [result] = await connection.execute(
        `INSERT INTO rentcar_insurance
        (vendor_id, name, description, coverage_details, hourly_rate_krw, is_required, display_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [
          vendor_id,
          name,
          description || null,
          coverage_details || null,
          hourly_rate_krw,
          is_required ? 1 : 0,
          display_order,
        ]
      );

      console.log(`✅ [Admin] 보험 상품 추가: ${name} (vendor_id=${vendor_id}, admin=${user.userId})`);

      return res.status(201).json({
        success: true,
        message: '보험 상품이 추가되었습니다.',
        data: {
          id: result.insertId,
        },
      });
    }

    // ==========================================
    // PUT - 보험 상품 수정
    // ==========================================
    if (req.method === 'PUT') {
      const {
        id,
        name,
        description,
        coverage_details,
        hourly_rate_krw,
        is_required,
        is_active,
        display_order,
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_ID',
          message: '보험 ID가 필요합니다.',
        });
      }

      // 보험 존재 확인
      const [existing] = await connection.execute(
        'SELECT id FROM rentcar_insurance WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: '보험 상품을 찾을 수 없습니다.',
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
      if (coverage_details !== undefined) {
        updates.push('coverage_details = ?');
        values.push(coverage_details);
      }
      if (hourly_rate_krw !== undefined) {
        if (hourly_rate_krw < 0) {
          return res.status(400).json({
            success: false,
            error: 'INVALID_PRICE',
            message: '시간당 요금은 0 이상이어야 합니다.',
          });
        }
        updates.push('hourly_rate_krw = ?');
        values.push(hourly_rate_krw);
      }
      if (is_required !== undefined) {
        updates.push('is_required = ?');
        values.push(is_required ? 1 : 0);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(is_active ? 1 : 0);
      }
      if (display_order !== undefined) {
        updates.push('display_order = ?');
        values.push(display_order);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'NO_UPDATES',
          message: '수정할 내용이 없습니다.',
        });
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      await connection.execute(
        `UPDATE rentcar_insurance SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      console.log(`✅ [Admin] 보험 상품 수정: ID=${id} (admin=${user.userId})`);

      return res.status(200).json({
        success: true,
        message: '보험 상품이 수정되었습니다.',
      });
    }

    // ==========================================
    // DELETE - 보험 상품 삭제
    // ==========================================
    if (req.method === 'DELETE') {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_ID',
          message: '보험 ID가 필요합니다.',
        });
      }

      // 보험 존재 확인
      const [existing] = await connection.execute(
        'SELECT id, name FROM rentcar_insurance WHERE id = ?',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: '보험 상품을 찾을 수 없습니다.',
        });
      }

      const insuranceName = existing[0].name;

      // Soft delete (is_active = 0)
      await connection.execute(
        'UPDATE rentcar_insurance SET is_active = 0, updated_at = NOW() WHERE id = ?',
        [id]
      );

      console.log(`✅ [Admin] 보험 상품 삭제: ${insuranceName} (ID=${id}, admin=${user.userId})`);

      return res.status(200).json({
        success: true,
        message: '보험 상품이 삭제되었습니다.',
      });
    }

    // 지원하지 않는 메서드
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: '지원하지 않는 HTTP 메서드입니다.',
    });
  } catch (error) {
    console.error('[Admin Rentcar Insurance API Error]', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '서버 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export default withSecureCors(withAuth(handler));
