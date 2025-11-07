import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // TODO: 블로그 데이터베이스 연동 필요
    // 현재는 빈 배열 반환
    return NextResponse.json({
      success: true,
      blogs: []
    });
  } catch (error) {
    console.error('Blogs API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch blogs',
        blogs: []
      },
      { status: 500 }
    );
  }
}
