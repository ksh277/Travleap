/**
 * 숙박 업체 요금제 개별 관리 API
 * PUT /api/admin/accommodation-vendors/[id]/rate-plans/[planId] - 요금제 수정
 * DELETE /api/admin/accommodation-vendors/[id]/rate-plans/[planId] - 요금제 삭제
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id: vendorId, planId } = req.query;

  if (!vendorId || !planId) {
    return res.status(400).json({ success: false, error: 'Vendor ID and Plan ID are required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // PUT - 요금제 수정
    if (req.method === 'PUT') {
      const {
        plan_name,
        plan_code,
        start_date,
        end_date,
        base_price,
        weekend_surcharge,
        weekday_discount,
        long_stay_discount,
        min_nights,
        max_nights
      } = req.body;

      // 날짜 검증
      if (end_date && start_date && new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({
          success: false,
          error: '종료일은 시작일보다 늦어야 합니다.'
        });
      }

      // plan_code 변경 시 중복 검증
      if (plan_code) {
        const existingPlan = await connection.execute(
          'SELECT id FROM accommodation_rate_plans WHERE vendor_id = ? AND plan_code = ? AND id != ?',
          [vendorId, plan_code, planId]
        );

        if (existingPlan.rows && existingPlan.rows.length > 0) {
          return res.status(400).json({
            success: false,
            error: `요금제 코드 "${plan_code}"가 이미 존재합니다.`
          });
        }
      }

      const updates = [];
      const values = [];

      if (plan_name !== undefined) {
        updates.push('plan_name = ?');
        values.push(plan_name);
      }
      if (plan_code !== undefined) {
        updates.push('plan_code = ?');
        values.push(plan_code);
      }
      if (start_date !== undefined) {
        updates.push('start_date = ?');
        values.push(start_date);
      }
      if (end_date !== undefined) {
        updates.push('end_date = ?');
        values.push(end_date);
      }
      if (base_price !== undefined) {
        updates.push('base_price = ?');
        values.push(base_price);
      }
      if (weekend_surcharge !== undefined) {
        updates.push('weekend_surcharge = ?');
        values.push(weekend_surcharge);
      }
      if (weekday_discount !== undefined) {
        updates.push('weekday_discount = ?');
        values.push(weekday_discount);
      }
      if (long_stay_discount !== undefined) {
        updates.push('long_stay_discount = ?');
        values.push(long_stay_discount);
      }
      if (min_nights !== undefined) {
        updates.push('min_nights = ?');
        values.push(min_nights || null);
      }
      if (max_nights !== undefined) {
        updates.push('max_nights = ?');
        values.push(max_nights || null);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: '수정할 항목이 없습니다.'
        });
      }

      updates.push('updated_at = NOW()');
      values.push(vendorId, planId);

      const result = await connection.execute(
        `UPDATE accommodation_rate_plans
         SET ${updates.join(', ')}
         WHERE vendor_id = ? AND id = ?`,
        values
      );

      console.log('Rate plan update result:', result);

      return res.status(200).json({
        success: true,
        message: '요금제가 수정되었습니다.'
      });
    }

    // DELETE - 요금제 삭제
    if (req.method === 'DELETE') {
      // 활성 예약에 사용 중인지 확인 (선택적)
      // const activeBookings = await connection.execute(
      //   'SELECT COUNT(*) as count FROM bookings WHERE rate_plan_id = ? AND status IN ("pending", "confirmed")',
      //   [planId]
      // );
      // if (activeBookings.rows[0].count > 0) {
      //   return res.status(400).json({
      //     success: false,
      //     error: '이 요금제를 사용 중인 예약이 있어 삭제할 수 없습니다.'
      //   });
      // }

      const result = await connection.execute(
        'DELETE FROM accommodation_rate_plans WHERE vendor_id = ? AND id = ?',
        [vendorId, planId]
      );

      console.log('Rate plan delete result:', result);

      return res.status(200).json({
        success: true,
        message: '요금제가 삭제되었습니다.'
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
