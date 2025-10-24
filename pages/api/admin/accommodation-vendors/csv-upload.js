/**
 * 숙박 벤더 CSV 업로드 API (partners 테이블 사용)
 * POST /api/admin/accommodation-vendors/csv-upload
 */

const { connect } = require('@planetscale/database');
const formidable = require('formidable');
const fs = require('fs');

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
    console.log('📥 [POST] CSV 벤더 업로드 요청');

    // formidable로 파일 파싱
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
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'CSV 파일이 없습니다.'
        });
      }

      try {
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
            const business_name = row.business_name || `업체${i}`;
            const contact_email = row.contact_email || `vendor${i}@example.com`;

            // 임시 사용자 생성 또는 조회
            let userId;
            const userCheck = await connection.execute(
              'SELECT id FROM users WHERE email = ? LIMIT 1',
              [contact_email]
            );

            if (userCheck.rows && userCheck.rows.length > 0) {
              userId = userCheck.rows[0].id;
            } else {
              const userResult = await connection.execute(
                `INSERT INTO users (email, name, user_type, created_at, updated_at)
                 VALUES (?, ?, 'vendor', NOW(), NOW())`,
                [contact_email, row.contact_name || business_name]
              );
              userId = userResult.insertId;
            }

            // partners 테이블에 삽입
            await connection.execute(
              `INSERT INTO partners (
                user_id,
                partner_type,
                business_name,
                business_number,
                contact_name,
                email,
                phone,
                description,
                status,
                is_active,
                tier,
                created_at,
                updated_at
              ) VALUES (?, 'lodging', ?, ?, ?, ?, ?, ?, ?, 1, 'basic', NOW(), NOW())`,
              [
                userId,
                business_name,
                row.business_number,
                row.contact_name,
                contact_email,
                row.contact_phone,
                row.description,
                row.status || 'active'
              ]
            );

            successCount++;
          } catch (insertError) {
            console.error(`Row ${i} insert failed:`, insertError.message);
            errorCount++;
            errors.push({ row: i, error: insertError.message });
          }
        }

        console.log(`✅ CSV 업로드 완료: ${successCount}개 성공, ${errorCount}개 실패`);

        return res.status(200).json({
          success: true,
          message: `${successCount}개 벤더 추가 완료`,
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
