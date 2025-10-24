/**
 * 객실 CSV 업로드 API (listings 테이블 사용)
 * POST /api/admin/accommodation-rooms/csv-upload
 */

const { connect } = require('@planetscale/database');
const formidable = require('formidable');
const fs = require('fs');

const STAY_CATEGORY_ID = 1857;

// Vercel에서는 body parser를 비활성화해야 함
export const config = {
  api: {
    bodyParser: false,
  },
};

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
    console.log('📥 [POST] CSV 객실 업로드 요청');

    const form = formidable({ multiples: false });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('File parse error:', err);
        return res.status(400).json({
          success: false,
          error: '파일 업로드 실패',
          details: err.message
        });
      }

      const file = files.file?.[0] || files.file;
      const vendorId = fields.vendor_id?.[0] || fields.vendor_id;

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

      try {
        // 벤더 존재 확인
        const vendorCheck = await connection.execute(
          'SELECT id FROM partners WHERE id = ? AND partner_type = "lodging"',
          [vendorId]
        );

        if (!vendorCheck.rows || vendorCheck.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '벤더를 찾을 수 없습니다.'
          });
        }

        // CSV 파일 읽기
        const csvContent = fs.readFileSync(file.filepath || file.path, 'utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          return res.status(400).json({
            success: false,
            error: 'CSV 파일에 데이터가 없습니다.'
          });
        }

        // 헤더 파싱
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        // 데이터 파싱 및 삽입
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};

          headers.forEach((header, index) => {
            row[header] = values[index] || null;
          });

          try {
            const room_name = row.room_name || `객실${i}`;
            const room_code = `ROOM_${vendorId}_${Date.now()}_${i}`;
            const base_price = parseFloat(row.base_price) || 100000;
            const capacity = parseInt(row.capacity) || 2;
            const breakfast_included = row.breakfast_included === 'true' || row.breakfast_included === '1';

            // listings 테이블에 삽입
            await connection.execute(
              `INSERT INTO listings (
                category_id,
                category,
                partner_id,
                title,
                description_md,
                room_code,
                room_type,
                max_occupancy,
                base_price_per_night,
                price_from,
                breakfast_included,
                amenities,
                images,
                is_active,
                created_at,
                updated_at
              ) VALUES (
                ?, 'stay', ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', 1, NOW(), NOW()
              )`,
              [
                STAY_CATEGORY_ID,
                vendorId,
                room_name,
                row.description || room_name,
                room_code,
                row.room_type || 'standard',
                capacity,
                base_price,
                base_price,
                breakfast_included ? 1 : 0
              ]
            );

            successCount++;
          } catch (insertError) {
            console.error(`Row ${i} insert failed:`, insertError.message);
            errorCount++;
            errors.push({ row: i, error: insertError.message });
          }
        }

        console.log(`✅ CSV 객실 업로드 완료: ${successCount}개 성공, ${errorCount}개 실패`);

        return res.status(200).json({
          success: true,
          message: `${successCount}개 객실 추가 완료`,
          count: successCount,
          errors: errorCount,
          errorDetails: errors
        });
      } catch (readError) {
        console.error('CSV read error:', readError);
        return res.status(500).json({
          success: false,
          error: 'CSV 파일 읽기 실패',
          message: readError.message
        });
      }
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
