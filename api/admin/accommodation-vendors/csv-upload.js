/**
 * 숙박 벤더 CSV 업로드 API
 * POST /api/admin/accommodation-vendors/csv-upload
 */

const { connect } = require('@planetscale/database');
const multiparty = require('multiparty');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // JWT 인증 (관리자 권한 확인)
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - No token provided'
    });
  }

  const token = authHeader.substring(7);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid token'
    });
  }

  // 관리자 권한 확인
  if (decoded.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden - Admin role required'
    });
  }

  const adminUserId = decoded.userId;
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
          // user_id: CSV에서 제공되면 사용, 없으면 업로드한 관리자 ID 사용
          const userId = row.user_id ? parseInt(row.user_id) : adminUserId;

          await connection.execute(
            `INSERT INTO partners (
              user_id, business_name, contact_name, email, phone,
              mobile_phone, business_number, business_address, description,
              partner_type, status, is_active,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'lodging', ?, 1, NOW(), NOW())`,
            [
              userId,
              row.business_name || '이름없음',
              row.contact_name || '담당자',
              row.contact_email || null,
              row.contact_phone || null,
              row.mobile_phone || row.contact_phone || null,
              row.business_number || null,
              row.business_address || null,
              row.description || null,
              row.status === 'approved' ? 'approved' : 'pending'
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
