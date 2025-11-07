/**
 * 관리자 - 환불 정책 관리 API
 * GET /api/admin/refund-policies - 모든 환불 정책 조회
 * POST /api/admin/refund-policies - 새 환불 정책 추가
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // TODO: 관리자 권한 체크
  // const token = req.headers.authorization?.replace('Bearer ', '');
  // if (!token || !isAdmin(token)) {
  //   return res.status(403).json({ success: false, error: 'Unauthorized' });
  // }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      // 모든 환불 정책 조회
      const result = await connection.execute(`
        SELECT * FROM refund_policies
        ORDER BY priority DESC, category, created_at DESC
      `);

      const policies = (result.rows || []).map(policy => ({
        ...policy,
        refund_policy_json: typeof policy.refund_policy_json === 'string'
          ? JSON.parse(policy.refund_policy_json)
          : policy.refund_policy_json
      }));

      console.log(`✅ 환불 정책 목록 조회: ${policies.length}개`);

      return res.status(200).json({
        success: true,
        data: policies
      });
    }

    if (req.method === 'POST') {
      // 새 환불 정책 추가
      const {
        policy_name,
        category,
        listing_id,
        is_refundable,
        refund_policy_json,
        priority = 10
      } = req.body;

      // 유효성 검사
      if (!policy_name || !refund_policy_json) {
        return res.status(400).json({
          success: false,
          error: '필수 필드가 누락되었습니다.'
        });
      }

      // 환불 정책 추가
      const result = await connection.execute(`
        INSERT INTO refund_policies (
          policy_name, category, listing_id, is_refundable,
          refund_policy_json, priority, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        policy_name,
        category || null,
        listing_id || null,
        is_refundable ? 1 : 0,
        JSON.stringify(refund_policy_json),
        priority,
        1
      ]);

      console.log(`✅ 환불 정책 추가 완료: ${policy_name} (ID: ${result.insertId})`);

      return res.status(201).json({
        success: true,
        data: {
          id: result.insertId,
          policy_name,
          category,
          is_refundable,
          priority
        }
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
