/**
 * 숙박 벤더 CSV 업로드 API
 * POST /api/admin/accommodation-vendors/csv-upload
 */

const { connect } = require('@planetscale/database');
const multiparty = require('multiparty');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // multiparty로 파일 파싱
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: '파일 업로드 실패',
          details: err.message
        });
      }

      const file = files.file?.[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'CSV 파일이 없습니다.'
        });
      }

      // CSV 파일 읽기
      const fs = require('fs');
      const csvContent = fs.readFileSync(file.path, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'CSV 파일에 데이터가 없습니다.'
        });
      }

      // 헤더 파싱
      const headers = lines[0].split(',').map(h => h.trim());

      // 데이터 파싱 및 삽입
      let successCount = 0;
      let errorCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || null;
        });

        try {
          // user_id 기본값 (관리자가 추후 설정 필요)
          const userId = row.user_id || 1;

          await connection.execute(
            `INSERT INTO partners (
              user_id, partner_type, business_name, business_number,
              contact_name, email, phone, description,
              status, is_active, created_at, updated_at
            ) VALUES (?, 'lodging', ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
            [
              userId,
              row.business_name || '이름없음',
              row.business_number,
              row.contact_name,
              row.contact_email,
              row.contact_phone,
              row.description,
              row.status || 'active'
            ]
          );

          successCount++;
        } catch (insertError) {
          console.error(`Row ${i} insert failed:`, insertError.message);
          errorCount++;
        }
      }

      return res.status(200).json({
        success: true,
        message: `${successCount}개 벤더 추가 완료`,
        count: successCount,
        errors: errorCount
      });
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      message: error.message
    });
  }
};
