/**
 * 시스템 설정 관리 API
 * GET /api/admin/system-settings - 모든 설정 조회
 * PUT /api/admin/system-settings - 설정 업데이트
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET - 모든 설정 조회
    if (req.method === 'GET') {
      const { category } = req.query;

      let query = 'SELECT * FROM admin_settings';
      const params = [];

      if (category) {
        query += ' WHERE setting_category = ?';
        params.push(category);
      }

      query += ' ORDER BY setting_category, setting_key';

      const result = await connection.execute(query, params);
      const settings = result.rows || [];

      // 카테고리별로 그룹화
      const grouped = settings.reduce((acc, setting) => {
        const category = setting.setting_category || 'general';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          id: setting.id,
          key: setting.setting_key,
          value: setting.setting_value,
          dataType: setting.data_type,
          description: setting.description
        });
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        data: grouped,
        settings: settings.map(s => ({
          id: s.id,
          key: s.setting_key,
          value: s.setting_value,
          category: s.setting_category,
          dataType: s.data_type,
          description: s.description
        }))
      });
    }

    // PUT - 설정 업데이트
    if (req.method === 'PUT') {
      const { settings } = req.body;

      if (!settings || !Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          error: 'settings 배열이 필요합니다'
        });
      }

      let updatedCount = 0;

      for (const setting of settings) {
        const { key, value } = setting;

        if (!key) {
          continue;
        }

        // 설정 업데이트
        const updateResult = await connection.execute(
          `UPDATE admin_settings
           SET setting_value = ?, updated_at = NOW()
           WHERE setting_key = ?`,
          [value, key]
        );

        if (updateResult.rowsAffected || updateResult.affectedRows) {
          updatedCount++;
        }
      }

      console.log(`✅ 시스템 설정 ${updatedCount}개 업데이트 완료`);

      return res.status(200).json({
        success: true,
        message: `${updatedCount}개 설정이 업데이트되었습니다.`,
        updatedCount
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('❌ 시스템 설정 API 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
