import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
};

/**
 * GET /api/rentcars
 * 렌트카 업체 목록 (vendor 기준 그룹핑)
 */
export async function GET(request: NextRequest) {
  try {
    const connection = connect(config);

    // 렌트카 업체별로 그룹핑 (vendor_id 기준)
    const vendors = await connection.execute(`
      SELECT
        v.id as vendor_id,
        v.vendor_code,
        COUNT(rv.id) as vehicle_count,
        MIN(rv.daily_rate_krw) as min_price,
        MAX(rv.daily_rate_krw) as max_price,
        MIN(rv.images) as sample_images,
        GROUP_CONCAT(DISTINCT rv.vehicle_class SEPARATOR ', ') as vehicle_classes
      FROM rentcar_vendors v
      LEFT JOIN rentcar_vehicles rv ON v.id = rv.vendor_id
      WHERE rv.is_active = 1
      GROUP BY v.id, v.vendor_code
      ORDER BY v.vendor_code
    `);

    // 이미지 JSON 파싱
    const parsedVendors = vendors.rows.map((vendor: any) => {
      let images = [];
      try {
        if (vendor.sample_images) {
          const parsed = JSON.parse(vendor.sample_images);
          images = Array.isArray(parsed) ? parsed : [];
        }
      } catch (e) {
        // JSON 파싱 실패시 빈 배열
      }

      return {
        vendor_id: vendor.vendor_id,
        vendor_code: vendor.vendor_code,
        vendor_name: vendor.vendor_code, // vendor_name 컬럼이 없으므로 code 사용
        vehicle_count: vendor.vehicle_count,
        min_price: vendor.min_price,
        max_price: vendor.max_price,
        images: images,
        vehicle_classes: vendor.vehicle_classes,
      };
    });

    return NextResponse.json({
      success: true,
      data: parsedVendors,
      total: parsedVendors.length,
    });

  } catch (error: any) {
    console.error('Error fetching rentcar vendors:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
