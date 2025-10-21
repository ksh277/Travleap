import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

// 장바구니 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const conn = connect(config);

    const result = await conn.execute(
      `SELECT
        c.*,
        l.title as product_title,
        l.price_from,
        l.images,
        l.location
      FROM cart_items c
      LEFT JOIN listings l ON c.listing_id = l.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC`,
      [parseInt(userId)]
    );

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Failed to fetch cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

// 장바구니에 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      listing_id,
      selected_date,
      num_adults = 2,
      num_children = 0,
      num_seniors = 0,
      price_snapshot
    } = body;

    // 필수 필드 검증
    if (!user_id || !listing_id || !selected_date) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다' },
        { status: 400 }
      );
    }

    const conn = connect(config);

    // 상품 가격 조회 (price_snapshot이 없는 경우)
    let finalPrice = price_snapshot;
    if (!finalPrice) {
      const listingResult = await conn.execute(
        'SELECT price_from FROM listings WHERE id = ?',
        [listing_id]
      );

      if (listingResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '상품을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      finalPrice = listingResult.rows[0].price_from;
    }

    // 장바구니에 추가
    const result = await conn.execute(
      `INSERT INTO cart_items
        (user_id, listing_id, selected_date, num_adults, num_children, num_seniors, price_snapshot, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [user_id, listing_id, selected_date, num_adults, num_children, num_seniors, finalPrice]
    );

    return NextResponse.json({
      success: true,
      message: '장바구니에 추가되었습니다',
      data: { id: result.insertId }
    });

  } catch (error) {
    console.error('Failed to add to cart:', error);
    return NextResponse.json(
      { success: false, error: '장바구니 추가에 실패했습니다' },
      { status: 500 }
    );
  }
}

// 장바구니 전체 삭제 (체크아웃 후)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const conn = connect(config);

    await conn.execute(
      'DELETE FROM cart_items WHERE user_id = ?',
      [parseInt(userId)]
    );

    return NextResponse.json({
      success: true,
      message: '장바구니가 비워졌습니다'
    });

  } catch (error) {
    console.error('Failed to clear cart:', error);
    return NextResponse.json(
      { success: false, error: '장바구니 비우기에 실패했습니다' },
      { status: 500 }
    );
  }
}
