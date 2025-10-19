import { NextRequest, NextResponse } from 'next/server';
import { searchVehicles } from '@/api/rentcar/vehicles';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await searchVehicles({
      pickup_location_id: body.pickupLocationId,
      pickup_date: body.pickupDate,
      dropoff_date: body.dropoffDate,
      vehicle_type: body.vehicleType,
      passenger_capacity: body.passengerCapacity,
      fuel_type: body.fuelType,
      transmission: body.transmission,
      price_min: body.priceMin,
      price_max: body.priceMax,
      features: body.features,
      sort_by: body.sortBy,
      page: body.page || 1,
      limit: body.limit || 20
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Rentcar search API error:', error);
    return NextResponse.json(
      { success: false, message: '차량 검색 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
