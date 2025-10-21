import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

// 이미지 목록 조회
export async function GET(request: NextRequest) {
  try {
    const conn = connect(config);

    const result = await conn.execute(`
      SELECT * FROM media_library
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Failed to fetch images:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch images', data: [] },
      { status: 500 }
    );
  }
}
