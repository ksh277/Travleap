import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

// 장바구니 아이템 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cartItemId = parseInt(params.id);

    const conn = connect(config);

    await conn.execute(
      'DELETE FROM cart_items WHERE id = ?',
      [cartItemId]
    );

    return NextResponse.json({
      success: true,
      message: '장바구니에서 삭제되었습니다'
    });

  } catch (error) {
    console.error('Failed to delete cart item:', error);
    return NextResponse.json(
      { success: false, error: '장바구니 아이템 삭제에 실패했습니다' },
      { status: 500 }
    );
  }
}
