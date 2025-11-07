/**
 * 관리자 - 개별 환불 정책 관리 API
 * PUT /api/admin/refund-policies/[id] - 환불 정책 수정
 * DELETE /api/admin/refund-policies/[id] - 환불 정책 삭제
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // TODO: 관리자 권한 체크
  // const token = req.headers.authorization?.replace('Bearer ', '');
  // if (!token || !isAdmin(token)) {
  //   return res.status(403).json({ success: false, error: 'Unauthorized' });
  // }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Policy ID is required'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'PUT') {
      // 환불 정책 수정
      const {
        policy_name,
        category,
        listing_id,
        is_refundable,
        refund_policy_json,
        priority,
        is_active
      } = req.body;

      // 정책 존재 확인
      const checkResult = await connection.execute(
        'SELECT id FROM refund_policies WHERE id = ?',
        [id]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '환불 정책을 찾을 수 없습니다.'
        });
      }

      // 환불 정책 업데이트
      await connection.execute(`
        UPDATE refund_policies
        SET
          policy_name = ?,
          category = ?,
          listing_id = ?,
          is_refundable = ?,
          refund_policy_json = ?,
          priority = ?,
          is_active = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        policy_name,
        category || null,
        listing_id || null,
        is_refundable ? 1 : 0,
        JSON.stringify(refund_policy_json),
        priority,
        is_active ? 1 : 0,
        id
      ]);

      console.log(`✅ 환불 정책 수정 완료: ${policy_name} (ID: ${id})`);

      return res.status(200).json({
        success: true,
        data: {
          id: parseInt(id),
          policy_name,
          category,
          is_refundable,
          priority
        }
      });
    }

    if (req.method === 'DELETE') {
      // 환불 정책 삭제
      const checkResult = await connection.execute(
        'SELECT id, policy_name FROM refund_policies WHERE id = ?',
        [id]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '환불 정책을 찾을 수 없습니다.'
        });
      }

      const policyName = checkResult.rows[0].policy_name;

      await connection.execute('DELETE FROM refund_policies WHERE id = ?', [id]);

      console.log(`✅ 환불 정책 삭제 완료: ${policyName} (ID: ${id})`);

      return res.status(200).json({
        success: true,
        message: '환불 정책이 삭제되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ Refund Policy API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
