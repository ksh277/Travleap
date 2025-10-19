import { NextRequest, NextResponse } from 'next/server';
import { getVehicleById } from '@/api/rentcar/vehicles';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicleId = parseInt(params.id);

    if (isNaN(vehicleId)) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 차량 ID입니다' },
        { status: 400 }
      );
    }

    const result = await getVehicleById(vehicleId);

    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Rentcar vehicle detail API error:', error);
    return NextResponse.json(
      { success: false, message: '차량 정보 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
