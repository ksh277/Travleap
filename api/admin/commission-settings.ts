// 관리자 정산 비율 관리 API
import { db } from '../../utils/database';

export interface CommissionRate {
  id?: number;
  category?: string; // null이면 전체 기본값
  vendor_id?: number; // null이면 카테고리 기본값
  rate: number; // 플랫폼 수수료 (예: 10 = 10%)
  effective_from?: Date;
  effective_to?: Date;
  is_active: boolean;
  notes?: string;
  created_by?: number;
  updated_by?: number;
}

/**
 * 관리자: 모든 수수료 정책 조회
 */
export async function getAllCommissionRates() {
  try {
    const rates = await db.query(`
      SELECT
        cr.*,
        c.name_ko as category_name,
        rv.business_name as vendor_name,
        u1.name as created_by_name,
        u2.name as updated_by_name
      FROM commission_rates cr
      LEFT JOIN categories c ON cr.category = c.slug
      LEFT JOIN rentcar_vendors rv ON cr.vendor_id = rv.id
      LEFT JOIN users u1 ON cr.created_by = u1.id
      LEFT JOIN users u2 ON cr.updated_by = u2.id
      ORDER BY
        CASE
          WHEN cr.vendor_id IS NOT NULL THEN 1
          WHEN cr.category IS NOT NULL THEN 2
          ELSE 3
        END,
        cr.category,
        cr.vendor_id,
        cr.created_at DESC
    `);

    return {
      success: true,
      rates
    };
  } catch (error) {
    console.error('❌ [Commission Settings] 조회 오류:', error);
    return {
      success: false,
      message: '수수료 정책 조회 중 오류가 발생했습니다',
      rates: []
    };
  }
}

/**
 * 관리자: 특정 벤더/카테고리의 수수료율 조회
 */
export async function getCommissionRate(params: { category?: string; vendor_id?: number }) {
  try {
    // 우선순위: 벤더별 > 카테고리별 > 전체 기본값
    let rate: any = null;

    // 1. 벤더별 수수료율
    if (params.vendor_id) {
      const vendorRates = await db.query(`
        SELECT * FROM commission_rates
        WHERE vendor_id = ? AND is_active = TRUE
        AND (effective_from IS NULL OR effective_from <= NOW())
        AND (effective_to IS NULL OR effective_to >= NOW())
        ORDER BY created_at DESC
        LIMIT 1
      `, [params.vendor_id]);

      if (vendorRates.length > 0) {
        rate = vendorRates[0];
      }
    }

    // 2. 카테고리별 수수료율
    if (!rate && params.category) {
      const categoryRates = await db.query(`
        SELECT * FROM commission_rates
        WHERE category = ? AND vendor_id IS NULL AND is_active = TRUE
        AND (effective_from IS NULL OR effective_from <= NOW())
        AND (effective_to IS NULL OR effective_to >= NOW())
        ORDER BY created_at DESC
        LIMIT 1
      `, [params.category]);

      if (categoryRates.length > 0) {
        rate = categoryRates[0];
      }
    }

    // 3. 전체 기본값
    if (!rate) {
      const defaultRates = await db.query(`
        SELECT * FROM commission_rates
        WHERE category IS NULL AND vendor_id IS NULL AND is_active = TRUE
        AND (effective_from IS NULL OR effective_from <= NOW())
        AND (effective_to IS NULL OR effective_to >= NOW())
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (defaultRates.length > 0) {
        rate = defaultRates[0];
      }
    }

    // 4. 아무것도 없으면 기본 10%
    if (!rate) {
      rate = {
        id: 0,
        rate: 10,
        category: params.category || null,
        vendor_id: params.vendor_id || null,
        is_active: true,
        notes: '시스템 기본값'
      };
    }

    return {
      success: true,
      rate
    };
  } catch (error) {
    console.error('❌ [Commission Settings] 수수료율 조회 오류:', error);
    return {
      success: false,
      message: '수수료율 조회 중 오류가 발생했습니다',
      rate: { rate: 10 } // 폴백
    };
  }
}

/**
 * 관리자: 새 수수료 정책 생성
 */
export async function createCommissionRate(data: CommissionRate, adminUserId: number) {
  try {
    console.log('💰 [Commission Settings] 새 수수료 정책 생성:', data);

    // 입력 검증
    if (data.rate < 0 || data.rate > 100) {
      return {
        success: false,
        message: '수수료율은 0~100 사이여야 합니다'
      };
    }

    // 중복 체크
    let duplicateQuery = `
      SELECT id FROM commission_rates
      WHERE is_active = TRUE
    `;
    const params: any[] = [];

    if (data.vendor_id) {
      duplicateQuery += ' AND vendor_id = ?';
      params.push(data.vendor_id);
    } else if (data.category) {
      duplicateQuery += ' AND category = ? AND vendor_id IS NULL';
      params.push(data.category);
    } else {
      duplicateQuery += ' AND category IS NULL AND vendor_id IS NULL';
    }

    const duplicates = await db.query(duplicateQuery, params);

    if (duplicates.length > 0) {
      return {
        success: false,
        message: '해당 대상에 대한 활성 수수료 정책이 이미 존재합니다. 기존 정책을 비활성화하거나 수정해주세요.'
      };
    }

    // 삽입
    const result = await db.execute(`
      INSERT INTO commission_rates (
        category, vendor_id, rate, effective_from, effective_to,
        is_active, notes, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      data.category || null,
      data.vendor_id || null,
      data.rate,
      data.effective_from || null,
      data.effective_to || null,
      data.is_active !== false ? 1 : 0,
      data.notes || null,
      adminUserId,
      adminUserId
    ]);

    console.log(`✅ [Commission Settings] 수수료 정책 생성 완료 (ID: ${result.insertId})`);

    return {
      success: true,
      message: '수수료 정책이 생성되었습니다',
      rate_id: result.insertId
    };
  } catch (error) {
    console.error('❌ [Commission Settings] 생성 오류:', error);
    return {
      success: false,
      message: '수수료 정책 생성 중 오류가 발생했습니다'
    };
  }
}

/**
 * 관리자: 수수료 정책 수정
 */
export async function updateCommissionRate(rateId: number, data: Partial<CommissionRate>, adminUserId: number) {
  try {
    console.log(`✏️ [Commission Settings] 수수료 정책 수정 (ID: ${rateId})`);

    // 수수료율 검증
    if (data.rate !== undefined && (data.rate < 0 || data.rate > 100)) {
      return {
        success: false,
        message: '수수료율은 0~100 사이여야 합니다'
      };
    }

    // 업데이트할 필드 동적 생성
    const fields: string[] = [];
    const values: any[] = [];

    if (data.rate !== undefined) {
      fields.push('rate = ?');
      values.push(data.rate);
    }
    if (data.effective_from !== undefined) {
      fields.push('effective_from = ?');
      values.push(data.effective_from);
    }
    if (data.effective_to !== undefined) {
      fields.push('effective_to = ?');
      values.push(data.effective_to);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active ? 1 : 0);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    fields.push('updated_by = ?');
    values.push(adminUserId);

    fields.push('updated_at = NOW()');

    if (fields.length === 2) { // updated_by와 updated_at만 있으면
      return {
        success: false,
        message: '업데이트할 정보가 없습니다'
      };
    }

    values.push(rateId);

    await db.execute(`
      UPDATE commission_rates SET ${fields.join(', ')} WHERE id = ?
    `, values);

    console.log(`✅ [Commission Settings] 수수료 정책 수정 완료 (ID: ${rateId})`);

    return {
      success: true,
      message: '수수료 정책이 수정되었습니다'
    };
  } catch (error) {
    console.error('❌ [Commission Settings] 수정 오류:', error);
    return {
      success: false,
      message: '수수료 정책 수정 중 오류가 발생했습니다'
    };
  }
}

/**
 * 관리자: 수수료 정책 비활성화
 */
export async function deactivateCommissionRate(rateId: number, adminUserId: number) {
  try {
    console.log(`🗑️ [Commission Settings] 수수료 정책 비활성화 (ID: ${rateId})`);

    await db.execute(`
      UPDATE commission_rates
      SET is_active = FALSE, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `, [adminUserId, rateId]);

    console.log(`✅ [Commission Settings] 수수료 정책 비활성화 완료 (ID: ${rateId})`);

    return {
      success: true,
      message: '수수료 정책이 비활성화되었습니다'
    };
  } catch (error) {
    console.error('❌ [Commission Settings] 비활성화 오류:', error);
    return {
      success: false,
      message: '수수료 정책 비활성화 중 오류가 발생했습니다'
    };
  }
}

/**
 * 관리자: 수수료 정책 삭제 (물리적 삭제)
 */
export async function deleteCommissionRate(rateId: number) {
  try {
    console.log(`🗑️ [Commission Settings] 수수료 정책 삭제 (ID: ${rateId})`);

    await db.execute(`
      DELETE FROM commission_rates WHERE id = ?
    `, [rateId]);

    console.log(`✅ [Commission Settings] 수수료 정책 삭제 완료 (ID: ${rateId})`);

    return {
      success: true,
      message: '수수료 정책이 삭제되었습니다'
    };
  } catch (error) {
    console.error('❌ [Commission Settings] 삭제 오류:', error);
    return {
      success: false,
      message: '수수료 정책 삭제 중 오류가 발생했습니다'
    };
  }
}

/**
 * 벤더별 수수료 통계 조회
 */
export async function getCommissionStatistics(filters: {
  vendor_id?: number;
  category?: string;
  start_date?: string;
  end_date?: string;
}) {
  try {
    let query = `
      SELECT
        DATE(rb.paid_at) as date,
        rb.vendor_id,
        rv.business_name,
        COUNT(*) as booking_count,
        SUM(rb.total_krw) as total_revenue,
        SUM(rb.platform_fee_krw) as total_commission,
        SUM(rb.vendor_amount_krw) as total_vendor_amount,
        AVG(rb.commission_rate * 100) as avg_commission_rate
      FROM rentcar_bookings rb
      LEFT JOIN rentcar_vendors rv ON rb.vendor_id = rv.id
      WHERE rb.payment_status = 'completed'
    `;

    const params: any[] = [];

    if (filters.vendor_id) {
      query += ' AND rb.vendor_id = ?';
      params.push(filters.vendor_id);
    }

    if (filters.start_date) {
      query += ' AND DATE(rb.paid_at) >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND DATE(rb.paid_at) <= ?';
      params.push(filters.end_date);
    }

    query += ' GROUP BY DATE(rb.paid_at), rb.vendor_id ORDER BY date DESC, total_revenue DESC';

    const stats = await db.query(query, params);

    return {
      success: true,
      statistics: stats
    };
  } catch (error) {
    console.error('❌ [Commission Settings] 통계 조회 오류:', error);
    return {
      success: false,
      message: '수수료 통계 조회 중 오류가 발생했습니다',
      statistics: []
    };
  }
}
