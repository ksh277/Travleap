import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listingId = parseInt(params.id);
    if (isNaN(listingId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 상품 ID입니다.' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // DB 연결
    const conn = connect(config);

    // 업데이트할 필드 준비
    const updateFields: any = {};

    if (body.title !== undefined) updateFields.title = body.title;
    if (body.description !== undefined) updateFields.description_md = body.description;
    if (body.longDescription !== undefined) updateFields.description_md = body.longDescription;
    if (body.price !== undefined) updateFields.price_from = body.price;
    if (body.location !== undefined) updateFields.location = body.location;
    if (body.address !== undefined) updateFields.address = body.address;
    if (body.coordinates !== undefined) updateFields.coordinates = body.coordinates;
    if (body.category_id !== undefined) updateFields.category_id = body.category_id;
    if (body.partner_id !== undefined) updateFields.partner_id = body.partner_id;
    if (body.is_active !== undefined) updateFields.is_active = body.is_active ? 1 : 0;
    if (body.featured !== undefined) updateFields.featured = body.featured ? 1 : 0;
    if (body.maxCapacity !== undefined) updateFields.max_capacity = body.maxCapacity;

    // 이미지 배열 처리
    if (body.images !== undefined) {
      updateFields.images = JSON.stringify(body.images);
    }

    // 하이라이트, 포함사항, 미포함사항 처리
    if (body.highlights !== undefined) {
      updateFields.highlights = JSON.stringify(body.highlights);
    }
    if (body.included !== undefined) {
      updateFields.included = JSON.stringify(body.included);
    }
    if (body.excluded !== undefined) {
      updateFields.excluded = JSON.stringify(body.excluded);
    }

    // SQL UPDATE 쿼리 생성
    const setClause = Object.keys(updateFields)
      .map(key => `${key} = ?`)
      .join(', ');

    const values = Object.values(updateFields);
    values.push(listingId);

    const query = `UPDATE listings SET ${setClause}, updated_at = NOW() WHERE id = ?`;

    await conn.execute(query, values);

    // 업데이트된 상품 조회
    const result = await conn.execute(
      'SELECT * FROM listings WHERE id = ?',
      [listingId]
    );

    const updatedListing = result.rows[0];

    return NextResponse.json({
      success: true,
      data: updatedListing,
      message: '상품이 성공적으로 수정되었습니다.'
    });

  } catch (error) {
    console.error('상품 수정 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '상품 수정에 실패했습니다: ' + (error instanceof Error ? error.message : String(error))
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listingId = parseInt(params.id);
    if (isNaN(listingId)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 상품 ID입니다.' },
        { status: 400 }
      );
    }

    const conn = connect(config);

    // 소프트 삭제 (is_active = 0)
    await conn.execute(
      'UPDATE listings SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [listingId]
    );

    return NextResponse.json({
      success: true,
      message: '상품이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('상품 삭제 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: '상품 삭제에 실패했습니다: ' + (error instanceof Error ? error.message : String(error))
      },
      { status: 500 }
    );
  }
}
