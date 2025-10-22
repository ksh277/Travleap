/**
 * 숙박 업체 요금제 관리 API
 * GET /api/admin/accommodation-vendors/[id]/rate-plans - 요금제 목록 조회
 * POST /api/admin/accommodation-vendors/[id]/rate-plans - 요금제 추가
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id: vendorId } = req.query;

  if (!vendorId) {
    return res.status(400).json({ success: false, error: 'Vendor ID is required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET - 요금제 목록 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT * FROM accommodation_rate_plans
         WHERE vendor_id = ?
         ORDER BY start_date DESC`,
        [vendorId]
      );

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    }

    // POST - 요금제 추가
    if (req.method === 'POST') {
      const {
        plan_name,
        plan_code,
        start_date,
        end_date,
        base_price,
        weekend_surcharge = 0,
        weekday_discount = 0,
        long_stay_discount = 0,
        min_nights,
        max_nights
      } = req.body;

      // 필수 필드 검증
      if (!plan_name || !plan_code || !start_date || !end_date || base_price === undefined) {
        return res.status(400).json({
          success: false,
          error: '필수 항목을 모두 입력해주세요. (plan_name, plan_code, start_date, end_date, base_price)'
        });
      }

      // 날짜 검증
      if (new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({
          success: false,
          error: '종료일은 시작일보다 늦어야 합니다.'
        });
      }

      // 중복 plan_code 검증
      const existingPlan = await connection.execute(
        'SELECT id FROM accommodation_rate_plans WHERE vendor_id = ? AND plan_code = ?',
        [vendorId, plan_code]
      );

      if (existingPlan.rows && existingPlan.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: `요금제 코드 "${plan_code}"가 이미 존재합니다.`
        });
      }

      // 요금제 추가
      const result = await connection.execute(
        `INSERT INTO accommodation_rate_plans
        (vendor_id, plan_name, plan_code, start_date, end_date, base_price,
         weekend_surcharge, weekday_discount, long_stay_discount, min_nights, max_nights,
         is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [
          vendorId,
          plan_name,
          plan_code,
          start_date,
          end_date,
          base_price,
          weekend_surcharge,
          weekday_discount,
          long_stay_discount,
          min_nights || null,
          max_nights || null
        ]
      );

      return res.status(201).json({
        success: true,
        message: '요금제가 추가되었습니다.',
        data: { id: result.insertId }
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('Rate plan API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
