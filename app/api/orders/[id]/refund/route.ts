import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = parseInt(params.id);
    const conn = connect(config);

    // 주문 상태 확인
    const orderResult = await conn.execute(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (!orderResult.rows || orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    // 환불 불가능한 상태 체크
    if (order.status === 'refund_requested' || order.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: '이미 환불 요청되었거나 취소된 주문입니다' },
        { status: 400 }
      );
    }

    // 환불 요청 상태로 변경
    await conn.execute(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      ['refund_requested', orderId]
    );

    return NextResponse.json({
      success: true,
      message: '환불 요청이 접수되었습니다'
    });

  } catch (error) {
    console.error('Refund request failed:', error);
    return NextResponse.json(
      { success: false, error: '환불 요청 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
