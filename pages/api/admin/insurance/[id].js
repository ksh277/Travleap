/**
 * 관리자 - 개별 보험 관리 API
 * PUT /api/admin/insurance/[id] - 보험 수정
 * DELETE /api/admin/insurance/[id] - 보험 삭제
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withSecureCors } = require('../../utils/cors-middleware.cjs');
const { withStandardRateLimit } = require('../../utils/rate-limit-middleware.cjs');

async function handler(req, res) {
  // 관리자 권한 확인
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다.'
    });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Insurance ID is required'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'PUT') {
      // 보험 수정
      const {
        name,
        category,
        price,
        coverage_amount,
        description,
        coverage_details,
        is_active
      } = req.body;

      // 보험 존재 확인
      const checkResult = await connection.execute(
        'SELECT id FROM insurances WHERE id = ?',
        [id]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '보험을 찾을 수 없습니다.'
        });
      }

      // 보험 업데이트
      await connection.execute(`
        UPDATE insurances
        SET
          name = ?,
          category = ?,
          price = ?,
          coverage_amount = ?,
          description = ?,
          coverage_details = ?,
          is_active = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        name,
        category,
        price,
        coverage_amount,
        description,
        JSON.stringify(coverage_details),
        is_active ? 1 : 0,
        id
      ]);

      console.log(`✅ 보험 수정 완료: ${name} (ID: ${id})`);

      return res.status(200).json({
        success: true,
        data: {
          id: parseInt(id),
          name,
          category,
          price,
          coverage_amount,
          description,
          coverage_details,
          is_active
        }
      });
    }

    if (req.method === 'DELETE') {
      // 보험 삭제
      const checkResult = await connection.execute(
        'SELECT id, name FROM insurances WHERE id = ?',
        [id]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '보험을 찾을 수 없습니다.'
        });
      }

      const insuranceName = checkResult.rows[0].name;

      await connection.execute('DELETE FROM insurances WHERE id = ?', [id]);

      console.log(`✅ 보험 삭제 완료: ${insuranceName} (ID: ${id})`);

      return res.status(200).json({
        success: true,
        message: '보험이 삭제되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ Insurance API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// 올바른 미들웨어 순서: CORS → RateLimit → Auth
module.exports = withSecureCors(
  withStandardRateLimit(
    withAuth(handler, { requireAuth: true, requireAdmin: true })
  )
);
