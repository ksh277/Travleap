import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
};

function parseJsonField(field: any): any {
  if (!field) return null;
  if (typeof field === 'object') return field;
  try {
    return JSON.parse(field);
  } catch {
    return null;
  }
}

/**
 * GET /api/rentcars/[vendorId]
 * 특정 렌트카 업체의 모든 차량 목록
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const vendorId = parseInt(params.vendorId);

    if (isNaN(vendorId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid vendor ID' },
        { status: 400 }
      );
    }

    const connection = connect(config);

    // Vendor 정보 조회
    const vendorResult = await connection.execute(
      'SELECT * FROM rentcar_vendors WHERE id = ?',
      [vendorId]
    );

    if (vendorResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      );
    }

    const vendor = vendorResult.rows[0];

    // 해당 업체의 모든 차량 조회
    const vehicles = await connection.execute(`
      SELECT
        rv.id,
        rv.vendor_id,
        rv.vehicle_class,
        rv.brand,
        rv.model,
        rv.year,
        rv.display_name,
        rv.transmission,
        rv.fuel_type,
        rv.seating_capacity,
        rv.large_bags,
        rv.small_bags,
        rv.daily_rate_krw,
        rv.images,
        rv.features,
        rv.is_active,
        rv.is_featured,
        rv.average_rating,
        rv.total_bookings
      FROM rentcar_vehicles rv
      WHERE rv.vendor_id = ?
        AND rv.is_active = 1
      ORDER BY rv.daily_rate_krw ASC
    `, [vendorId]);

    // JSON 필드 파싱
    const parsedVehicles = vehicles.rows.map((vehicle: any) => ({
      id: vehicle.id,
      vendor_id: vehicle.vendor_id,
      vehicle_class: vehicle.vehicle_class,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      display_name: vehicle.display_name,
      transmission: vehicle.transmission,
      fuel_type: vehicle.fuel_type,
      seating_capacity: vehicle.seating_capacity,
      large_bags: vehicle.large_bags,
      small_bags: vehicle.small_bags,
      daily_rate_krw: vehicle.daily_rate_krw,
      images: parseJsonField(vehicle.images) || [],
      features: parseJsonField(vehicle.features) || [],
      is_active: vehicle.is_active,
      is_featured: vehicle.is_featured,
      average_rating: vehicle.average_rating,
      total_bookings: vehicle.total_bookings,
    }));

    return NextResponse.json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          vendor_code: vendor.vendor_code,
          vendor_name: vendor.business_name || vendor.brand_name || vendor.vendor_code,
          business_name: vendor.business_name,
        },
        vehicles: parsedVehicles,
        total_vehicles: parsedVehicles.length,
      },
    });

  } catch (error: any) {
    console.error('Error fetching vendor vehicles:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
