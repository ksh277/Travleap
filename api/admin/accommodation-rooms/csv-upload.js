/**
 * 객실 CSV 업로드 API
 * POST /api/admin/accommodation-rooms/csv-upload
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
      const vendorId = fields.vendor_id?.[0];

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'CSV 파일이 없습니다.'
        });
      }

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          error: '벤더 ID가 필요합니다.'
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
          await connection.execute(
            `INSERT INTO accommodation_rooms (
              vendor_id, room_name, room_type, capacity,
              base_price_per_night, breakfast_included, description,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              vendorId,
              row.room_name || '이름없음',
              row.room_type || 'standard',
              parseInt(row.capacity) || 2,
              parseFloat(row.base_price) || 0,
              row.breakfast_included === 'true' || row.breakfast_included === '1',
              row.description,
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
        message: `${successCount}개 객실 추가 완료`,
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
