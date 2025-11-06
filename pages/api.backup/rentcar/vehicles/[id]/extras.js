// ============================================
// 렌트카 차량별 사용 가능한 옵션 조회 API
// ============================================

import { withSecureCors } from '../../../../../utils/cors-middleware';
import mysql from 'mysql2/promise';

const connectionConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
};

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: '지원하지 않는 HTTP 메서드입니다.',
    });
  }

  const { id: vehicleId } = req.query;

  if (!vehicleId) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_VEHICLE_ID',
      message: '차량 ID가 필요합니다.',
    });
  }

  let connection;

  try {
    connection = await mysql.createConnection(connectionConfig);

    // 1. 차량의 vendor_id 조회
    const [vehicles] = await connection.execute(
      `SELECT vendor_id FROM rentcar_vehicles WHERE id = ?`,
      [vehicleId]
    );

    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'VEHICLE_NOT_FOUND',
        message: '차량을 찾을 수 없습니다.',
      });
    }

    const vendorId = vehicles[0].vendor_id;

    // 2. 해당 벤더의 활성화된 옵션 조회
    const [extras] = await connection.execute(
      `SELECT
        id,
        extra_code,
        name,
        description,
        category,
        price_type,
        price_krw,
        max_quantity,
        has_inventory,
        current_stock,
        image_url,
        taxable,
        tax_rate_pct
      FROM rentcar_extras
      WHERE vendor_id = ? AND is_active = 1
      ORDER BY category, display_order, name`,
      [vendorId]
    );

    // 3. 카테고리별로 그룹화
    const groupedExtras = {
      equipment: [],
      service: [],
      driver: [],
      insurance: [],
      misc: []
    };

    extras.forEach(extra => {
      if (groupedExtras[extra.category]) {
        groupedExtras[extra.category].push(extra);
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        extras: extras,
        grouped: groupedExtras,
        total: extras.length
      }
    });
  } catch (error) {
    console.error('[Vehicle Extras API Error]', error);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: '서버 오류가 발생했습니다.',
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

export default withSecureCors(handler);
