/**
 * 팝업 CSV 업로드 API
 * POST /api/admin/popups/csv-upload
 *
 * 보안:
 * - Admin 권한 필수
 * - CSV 파일 검증 (타입, 크기)
 * - CSV Injection 방지
 * - Rate Limiting
 *
 * CSV 형식:
 * vendor_id,brand_name,popup_name,description,location_name,address,start_date,end_date,entrance_fee,operating_hours,image_url,tags,status
 */

const { connect } = require('@planetscale/database');
const formidable = require('formidable');
const fs = require('fs');
const { withAuth } = require('../../../../utils/auth-middleware');
const { withSecureCors } = require('../../../../utils/cors-middleware');
const { withStrictRateLimit } = require('../../../../utils/rate-limit-middleware');
const {
  validateCSVFile,
  sanitizeCSVContent,
  sanitizeFilename
} = require('../../../../utils/file-upload-security');

// Vercel에서는 body parser를 비활성화해야 함
export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Admin 권한 확인
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다.'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('📥 [POST] CSV 팝업 업로드 요청');

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
        // 파일명 새니타이징
        const safeFilename = sanitizeFilename(file.originalFilename || file.name || 'upload.csv');

        // CSV 파일 검증
        const fileBuffer = fs.readFileSync(file.filepath || file.path);
        const validation = validateCSVFile({
          filename: safeFilename,
          buffer: fileBuffer
        });

        if (!validation.valid) {
          console.warn(`⚠️ [CSV Upload] Invalid CSV: ${validation.reason}`);
          return res.status(400).json({
            success: false,
            error: validation.reason
          });
        }

        // CSV 파일 읽기 및 새니타이징
        let csvContent = fs.readFileSync(file.filepath || file.path, 'utf-8');
        csvContent = sanitizeCSVContent(csvContent);
        const lines = csvContent.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          return res.status(400).json({
            success: false,
            error: 'CSV 파일이 비어있습니다. (헤더 포함 최소 2줄 필요)'
          });
        }

        // 헤더 파싱
        const header = lines[0].split(',').map(h => h.trim());
        console.log('📊 CSV 헤더:', header);

        // 필수 컬럼 검증
        const requiredColumns = ['vendor_id', 'brand_name', 'popup_name', 'start_date', 'end_date'];
        const missingColumns = requiredColumns.filter(col => !header.includes(col));

        if (missingColumns.length > 0) {
          return res.status(400).json({
            success: false,
            error: `필수 컬럼이 누락되었습니다: ${missingColumns.join(', ')}`
          });
        }

        // 데이터 파싱 및 삽입
        const results = {
          success: [],
          failed: []
        };

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          try {
            // CSV 라인 파싱 (간단한 split, 실제로는 CSV parser 라이브러리 사용 권장)
            const values = line.split(',').map(v => v.trim());

            const rowData = {};
            header.forEach((col, idx) => {
              rowData[col] = values[idx] || null;
            });

            // 필수 필드 검증
            if (!rowData.vendor_id || !rowData.brand_name || !rowData.popup_name || !rowData.start_date || !rowData.end_date) {
              throw new Error('필수 필드 누락');
            }

            // tags JSON 파싱 (있는 경우)
            let tags = [];
            if (rowData.tags) {
              try {
                tags = JSON.parse(rowData.tags);
              } catch (e) {
                // tags가 JSON이 아니면 배열로 변환
                tags = rowData.tags.split('|').map(t => t.trim());
              }
            }

            // gallery_images JSON 파싱 (있는 경우)
            let gallery_images = [];
            if (rowData.gallery_images) {
              try {
                gallery_images = JSON.parse(rowData.gallery_images);
              } catch (e) {
                // gallery_images가 JSON이 아니면 배열로 변환
                gallery_images = rowData.gallery_images.split('|').map(img => img.trim());
              }
            }

            // 팝업 삽입
            await connection.execute(
              `INSERT INTO popups (
                vendor_id, brand_name, popup_name, description, category,
                location_name, address, latitude, longitude,
                start_date, end_date, operating_hours,
                entrance_fee, is_free, image_url, gallery_images,
                requires_reservation, max_capacity, booking_url,
                tags, sns_instagram, sns_website, parking_info, nearby_subway,
                is_active, status, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [
                rowData.vendor_id,
                rowData.brand_name,
                rowData.popup_name,
                rowData.description || null,
                rowData.category || '팝업',
                rowData.location_name || null,
                rowData.address || null,
                rowData.latitude || null,
                rowData.longitude || null,
                rowData.start_date,
                rowData.end_date,
                rowData.operating_hours || null,
                rowData.entrance_fee || 0,
                rowData.is_free === 'true' || rowData.is_free === '1',
                rowData.image_url || null,
                JSON.stringify(gallery_images),
                rowData.requires_reservation === 'true' || rowData.requires_reservation === '1',
                rowData.max_capacity || null,
                rowData.booking_url || null,
                JSON.stringify(tags),
                rowData.sns_instagram || null,
                rowData.sns_website || null,
                rowData.parking_info || null,
                rowData.nearby_subway || null,
                rowData.is_active !== 'false' && rowData.is_active !== '0',
                rowData.status || 'upcoming'
              ]
            );

            results.success.push({
              row: i,
              popup_name: rowData.popup_name
            });

          } catch (rowError) {
            console.error(`❌ [CSV] 라인 ${i} 실패:`, rowError);
            results.failed.push({
              row: i,
              error: rowError.message
            });
          }
        }

        console.log(`✅ [CSV Upload] 성공: ${results.success.length}개, 실패: ${results.failed.length}개`);

        return res.status(200).json({
          success: true,
          message: `${results.success.length}개의 팝업이 업로드되었습니다.`,
          results
        });

      } catch (fileError) {
        console.error('CSV 처리 오류:', fileError);
        return res.status(500).json({
          success: false,
          error: 'CSV 처리 중 오류가 발생했습니다.',
          details: fileError.message
        });
      }
    });

  } catch (error) {
    console.error('CSV 업로드 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      details: error.message
    });
  }
}

// 미들웨어 적용 순서: Rate Limit -> Auth -> CORS
export default withStrictRateLimit(withAuth(withSecureCors(handler)));
