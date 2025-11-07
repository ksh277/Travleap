// 관리자 정산 비율 관리 API
const { db } = require('../../utils/database.cjs');

/**
 * 관리자: 모든 수수료 정책 조회
 */
async function getAllCommissionRates() {
  try {
    const rates = await db.query(`
      SELECT * FROM commission_rates
      WHERE is_active = 1
      ORDER BY created_at DESC
    `);
    return { success: true, data: rates || [] };
  } catch (error) {
    console.error('getAllCommissionRates error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 관리자: 특정 벤더/카테고리의 수수료율 조회
 */
async function getCommissionRate({ category, vendor_id }) {
  try {
    let query = 'SELECT * FROM commission_rates WHERE is_active = 1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (vendor_id) {
      query += ' AND vendor_id = ?';
      params.push(vendor_id);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    const rates = await db.query(query, params);
    return { success: true, data: rates && rates.length > 0 ? rates[0] : null };
  } catch (error) {
    console.error('getCommissionRate error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 관리자: 새 수수료 정책 생성
 */
async function createCommissionRate(data, userId) {
  try {
    const result = await db.execute(`
      INSERT INTO commission_rates
      (category, vendor_id, rate_percent, is_active, created_by, created_at, updated_at)
      VALUES (?, ?, ?, 1, ?, NOW(), NOW())
    `, [data.category, data.vendor_id || null, data.rate_percent, userId]);

    return { success: true, data: { id: result.insertId } };
  } catch (error) {
    console.error('createCommissionRate error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 관리자: 수수료 정책 수정
 */
async function updateCommissionRate(rateId, data, userId) {
  try {
    await db.execute(`
      UPDATE commission_rates
      SET rate_percent = ?, updated_at = NOW()
      WHERE id = ?
    `, [data.rate_percent, rateId]);

    return { success: true };
  } catch (error) {
    console.error('updateCommissionRate error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 관리자: 수수료 정책 비활성화
 */
async function deactivateCommissionRate(rateId, userId) {
  try {
    await db.execute(`
      UPDATE commission_rates
      SET is_active = 0, updated_at = NOW()
      WHERE id = ?
    `, [rateId]);

    return { success: true };
  } catch (error) {
    console.error('deactivateCommissionRate error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 관리자: 수수료 정책 삭제 (물리적 삭제)
 */
async function deleteCommissionRate(rateId) {
  try {
    await db.execute('DELETE FROM commission_rates WHERE id = ?', [rateId]);
    return { success: true };
  } catch (error) {
    console.error('deleteCommissionRate error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 벤더별 수수료 통계 조회
 */
async function getCommissionStatistics({ vendor_id, category, start_date, end_date }) {
  try {
    let query = 'SELECT * FROM commission_rates WHERE 1=1';
    const params = [];

    if (vendor_id) {
      query += ' AND vendor_id = ?';
      params.push(vendor_id);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date);
    }

    const stats = await db.query(query, params);
    return { success: true, data: stats || [] };
  } catch (error) {
    console.error('getCommissionStatistics error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getAllCommissionRates,
  getCommissionRate,
  createCommissionRate,
  updateCommissionRate,
  deactivateCommissionRate,
  deleteCommissionRate,
  getCommissionStatistics
};

// Default export for Vercel serverless
module.exports.default = async function handler(req, res) {
  res.status(404).json({ success: false, error: 'Not implemented' });
};
