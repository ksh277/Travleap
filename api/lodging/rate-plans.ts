/**
 * 요금제(Rate Plans) 관리 API
 */

import { db } from '../../utils/database-cloud';

export interface RatePlan {
  id?: number;
  room_id: number;
  name: string;
  description?: string;
  currency?: string;
  base_price_per_night: number;
  weekend_markup_pct?: number;
  peak_season_markup_pct?: number;
  long_stay_discount_pct?: number;
  extra_person_fee?: number;
  breakfast_included?: boolean;
  breakfast_price?: number;
  tax_rules?: Record<string, number>;
  min_stay_nights?: number;
  max_stay_nights?: number;
  cancel_policy_code?: string;
  is_active?: boolean;
  valid_from?: string;
  valid_until?: string;
}

export async function getRatePlans(roomId: number) {
  try {
    const plans = await db.query(`
      SELECT * FROM rate_plans WHERE room_id = ? AND is_active = 1
      ORDER BY base_price_per_night
    `, [roomId]);

    return { success: true, ratePlans: plans };
  } catch (error) {
    console.error('❌ 요금제 목록 조회 실패:', error);
    return { success: false, message: '요금제 목록 조회 실패' };
  }
}

export async function createRatePlan(plan: RatePlan, userId: number) {
  try {
    // 권한 확인
    const room = await db.query(`
      SELECT r.id, l.vendor_id, v.user_id
      FROM rooms r
      JOIN lodgings l ON r.lodging_id = l.id
      JOIN rentcar_vendors v ON l.vendor_id = v.id
      WHERE r.id = ?
    `, [plan.room_id]);

    if (room.length === 0 || room[0].user_id !== userId) {
      return { success: false, message: '권한이 없습니다.' };
    }

    const result = await db.execute(`
      INSERT INTO rate_plans (
        room_id, name, description, currency, base_price_per_night,
        weekend_markup_pct, peak_season_markup_pct, long_stay_discount_pct,
        extra_person_fee, breakfast_included, breakfast_price,
        tax_rules, min_stay_nights, max_stay_nights, cancel_policy_code,
        is_active, valid_from, valid_until,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      plan.room_id, plan.name, plan.description || null,
      plan.currency || 'KRW', plan.base_price_per_night,
      plan.weekend_markup_pct || 0, plan.peak_season_markup_pct || 0,
      plan.long_stay_discount_pct || 0, plan.extra_person_fee || 0,
      plan.breakfast_included || false, plan.breakfast_price || 0,
      plan.tax_rules ? JSON.stringify(plan.tax_rules) : null,
      plan.min_stay_nights || 1, plan.max_stay_nights || 365,
      plan.cancel_policy_code || 'moderate',
      plan.is_active !== false, plan.valid_from || null, plan.valid_until || null
    ]);

    console.log(`✅ 요금제 생성 완료: ${plan.name} (ID: ${result.insertId})`);
    return { success: true, ratePlanId: result.insertId, message: '요금제가 생성되었습니다.' };

  } catch (error) {
    console.error('❌ 요금제 생성 실패:', error);
    return { success: false, message: '요금제 생성 실패' };
  }
}

export async function updateRatePlan(planId: number, userId: number, updateData: Partial<RatePlan>) {
  try {
    const plan = await db.query(`
      SELECT rp.room_id, l.vendor_id, v.user_id
      FROM rate_plans rp
      JOIN rooms r ON rp.room_id = r.id
      JOIN lodgings l ON r.lodging_id = l.id
      JOIN rentcar_vendors v ON l.vendor_id = v.id
      WHERE rp.id = ?
    `, [planId]);

    if (plan.length === 0 || plan[0].user_id !== userId) {
      return { success: false, message: '권한이 없습니다.' };
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updateData.name) { fields.push('name = ?'); values.push(updateData.name); }
    if (updateData.base_price_per_night) { fields.push('base_price_per_night = ?'); values.push(updateData.base_price_per_night); }
    if (updateData.is_active !== undefined) { fields.push('is_active = ?'); values.push(updateData.is_active); }

    fields.push('updated_at = NOW()');
    values.push(planId);

    if (fields.length === 1) {
      return { success: false, message: '업데이트할 정보가 없습니다.' };
    }

    await db.execute(`UPDATE rate_plans SET ${fields.join(', ')} WHERE id = ?`, values);
    console.log(`✅ 요금제 수정 완료: ID ${planId}`);

    return { success: true, message: '요금제가 수정되었습니다.' };

  } catch (error) {
    console.error('❌ 요금제 수정 실패:', error);
    return { success: false, message: '요금제 수정 실패' };
  }
}

export async function deleteRatePlan(planId: number, userId: number) {
  try {
    const plan = await db.query(`
      SELECT rp.room_id, l.vendor_id, v.user_id
      FROM rate_plans rp
      JOIN rooms r ON rp.room_id = r.id
      JOIN lodgings l ON r.lodging_id = l.id
      JOIN rentcar_vendors v ON l.vendor_id = v.id
      WHERE rp.id = ?
    `, [planId]);

    if (plan.length === 0 || plan[0].user_id !== userId) {
      return { success: false, message: '권한이 없습니다.' };
    }

    await db.execute(`DELETE FROM rate_plans WHERE id = ?`, [planId]);
    console.log(`✅ 요금제 삭제 완료: ID ${planId}`);

    return { success: true, message: '요금제가 삭제되었습니다.' };

  } catch (error) {
    console.error('❌ 요금제 삭제 실패:', error);
    return { success: false, message: '요금제 삭제 실패' };
  }
}
