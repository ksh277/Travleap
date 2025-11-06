import { connect } from '@planetscale/database';
const { requireVendorAuth } = require('../../../../../middleware/vendor-auth');

const connection = connect({ url: process.env.DATABASE_URL });

/**
 * 특정 차량 수정/삭제 API (단순화 버전)
 * PUT: 차량 정보 수정
 * DELETE: 차량 삭제
 */
export default async function handler(req, res) {
  const { id } = req.query;
  const { method } = req;

  // 벤더 인증 필수
  const auth = await requireVendorAuth(req, res);
  if (!auth.success) return;

  const vendorId = auth.vendorId;

  console.log(`🚗 [Vehicle ${id} API]`, { method, vendorId, vehicleId: id });

  try {
    // 차량 소유권 확인
    const vehicleCheck = await connection.execute(
      'SELECT vendor_id FROM rentcar_vehicles WHERE id = ?',
      [id]
    );

    if (!vehicleCheck.rows || vehicleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '차량을 찾을 수 없습니다.'
      });
    }

    const vehicleVendorId = vehicleCheck.rows[0].vendor_id;

    // 관리자가 아니면서 다른 업체의 차량인 경우 거부
    if (!auth.isAdmin && vehicleVendorId !== vendorId) {
      return res.status(403).json({
        success: false,
        message: '이 차량을 수정/삭제할 권한이 없습니다.'
      });
    }

    if (method === 'PUT') {
      // 차량 정보 수정 (단순화: 필수 필드만)
      const {
        display_name,
        daily_rate_krw,
        hourly_rate_krw,
        is_available,
        image_urls
      } = req.body;

      // 필수 필드 검증
      if (!display_name || !daily_rate_krw) {
        return res.status(400).json({
          success: false,
          message: '필수 항목을 입력해주세요. (차량명, 일일 요금)'
        });
      }

      // 이미지 JSON 변환
      const imagesJson = JSON.stringify(image_urls || []);

      // 시간당 요금 자동 계산 (입력하지 않은 경우 일일 요금 / 24)
      const calculatedHourlyRate = hourly_rate_krw || Math.ceil(daily_rate_krw / 24);

      console.log(`📝 [Vehicle ${id}] 수정 시도:`, {
        display_name,
        daily_rate_krw,
        hourly_rate_krw: calculatedHourlyRate
      });

      await connection.execute(
        `UPDATE rentcar_vehicles
         SET
           display_name = ?,
           daily_rate_krw = ?,
           hourly_rate_krw = ?,
           is_active = ?,
           images = ?,
           thumbnail_url = ?,
           updated_at = NOW()
         WHERE id = ?`,
        [
          display_name,
          daily_rate_krw,
          calculatedHourlyRate,
          is_available !== undefined ? (is_available ? 1 : 0) : 1,
          imagesJson,
          image_urls && image_urls.length > 0 ? image_urls[0] : null,
          id
        ]
      );

      console.log(`✅ [Vehicle ${id}] 수정 완료`);

      return res.status(200).json({
        success: true,
        message: '차량 정보가 수정되었습니다.',
        data: {
          id,
          display_name,
          daily_rate_krw,
          hourly_rate_krw: calculatedHourlyRate
        }
      });
    }

    if (method === 'DELETE') {
      // 차량 삭제
      await connection.execute(
        'DELETE FROM rentcar_vehicles WHERE id = ?',
        [id]
      );

      console.log(`✅ [Vehicle ${id}] 삭제 완료`);

      return res.status(200).json({
        success: true,
        message: '차량이 삭제되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
    });
  } catch (error) {
    console.error(`❌ [Vehicle ${id} API] 오류:`, error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
