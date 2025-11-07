import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // TODO: 댓글 데이터베이스 연동 필요
    // 현재는 빈 배열 반환
    return NextResponse.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Comments API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch comments',
        data: []
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // TODO: 댓글 삭제 로직 구현 필요
    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete comment'
      },
      { status: 500 }
    );
  }
}
