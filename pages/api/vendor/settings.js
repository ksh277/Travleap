/**
 * 벤더 설정 API - 환불 정책 관리
 *
 * GET /api/vendor/settings - 현재 설정 조회
 * PUT /api/vendor/settings - 설정 업데이트 (환불 정책 포함)
 *
 * 환불 정책 JSON 구조:
 * {
 *   "rules": [
 *     {"days_before": 7, "fee_rate": 0, "description": "7일 전 무료 취소"},
 *     {"days_before": 3, "fee_rate": 0.2, "description": "3일 전 20% 수수료"},
 *     {"days_before": 0, "fee_rate": 0.5, "description": "당일 50% 수수료"}
 *   ],
 *   "is_refundable": true,
 *   "notes": ["추가 안내사항"]
 * }
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // JWT 토큰 검증
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

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // user_id로 partner_id 조회
    let partnerId;
    if (decoded.role === 'admin') {
      partnerId = req.query.partnerId || req.body?.partnerId;
      if (!partnerId) {
        return res.status(400).json({ success: false, message: 'partnerId가 필요합니다.' });
      }
    } else {
      const partnerResult = await connection.execute(
        'SELECT id FROM partners WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!partnerResult.rows || partnerResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '등록된 파트너 정보가 없습니다.' });
      }

      partnerId = partnerResult.rows[0].id;
    }

    console.log(`ℹ️ [Vendor Settings API] 요청: method=${req.method}, partnerId=${partnerId}, user=${decoded.email}`);

    if (req.method === 'GET') {
      // 파트너 설정 조회
      const result = await connection.execute(
        `SELECT
          id,
          company_name,
          category,
          cancellation_rules,
          created_at,
          updated_at
        FROM partners
        WHERE id = ?
        LIMIT 1`,
        [partnerId]
      );

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ success: false, message: '파트너 정보를 찾을 수 없습니다.' });
      }

      const partner = result.rows[0];

      // cancellation_rules 파싱
      let cancellationRules = null;
      if (partner.cancellation_rules) {
        try {
          cancellationRules = typeof partner.cancellation_rules === 'string'
            ? JSON.parse(partner.cancellation_rules)
            : partner.cancellation_rules;
        } catch (e) {
          console.error('❌ cancellation_rules 파싱 실패:', e);
          cancellationRules = null;
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          id: partner.id,
          company_name: partner.company_name,
          category: partner.category,
          cancellation_rules: cancellationRules,
          has_custom_policy: !!cancellationRules
        }
      });
    }

    if (req.method === 'PUT') {
      // 환불 정책 업데이트
      const { cancellation_rules } = req.body;

      // 유효성 검사
      if (cancellation_rules !== null && cancellation_rules !== undefined) {
        // rules 배열 검증
        if (cancellation_rules.rules) {
          if (!Array.isArray(cancellation_rules.rules)) {
            return res.status(400).json({
              success: false,
              message: 'cancellation_rules.rules는 배열이어야 합니다.'
            });
          }

          // 각 규칙 검증
          for (const rule of cancellation_rules.rules) {
            if (typeof rule.days_before !== 'number' || rule.days_before < 0) {
              return res.status(400).json({
                success: false,
                message: 'days_before는 0 이상의 숫자여야 합니다.'
              });
            }
            if (typeof rule.fee_rate !== 'number' || rule.fee_rate < 0 || rule.fee_rate > 1) {
              return res.status(400).json({
                success: false,
                message: 'fee_rate는 0~1 사이의 숫자여야 합니다. (0=무료, 1=환불불가)'
              });
            }
          }
        }
      }

      // partners 테이블 업데이트
      const rulesJson = cancellation_rules ? JSON.stringify(cancellation_rules) : null;

      await connection.execute(
        `UPDATE partners
        SET cancellation_rules = ?,
            updated_at = NOW()
        WHERE id = ?`,
        [rulesJson, partnerId]
      );

      console.log(`✅ [Vendor Settings] 환불 정책 업데이트 완료: partnerId=${partnerId}`);

      return res.status(200).json({
        success: true,
        message: '환불 정책이 업데이트되었습니다.',
        data: {
          cancellation_rules: cancellation_rules
        }
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });

  } catch (error) {
    console.error('❌ [Vendor Settings API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
