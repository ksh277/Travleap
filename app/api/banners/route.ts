import { connect } from '@planetscale/database';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page'); // about, home 등 페이지 구분

    const conn = connect({ url: process.env.DATABASE_URL! });

    // 페이지별 배너 조회
    if (page) {
      const result = await conn.execute(`
        SELECT id, page, image_url, title, link_url, display_order, is_active
        FROM page_banners
        WHERE page = ? AND is_active = TRUE
        ORDER BY display_order ASC, created_at DESC
        LIMIT 1
      `, [page]);

      return NextResponse.json(
        { success: true, data: result.rows?.[0] || null },
        { status: 200, headers: corsHeaders }
      );
    }

    // 홈 배너 목록 (기존 로직)
    const result = await conn.execute(`
      SELECT id, image_url, title, link_url, display_order
      FROM home_banners
      WHERE is_active = TRUE
      ORDER BY display_order ASC, created_at DESC
    `);

    return NextResponse.json(
      { success: true, banners: result.rows || [] },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Banners error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch banners', banners: [] },
      { status: 500, headers: corsHeaders }
    );
  }
}

// 배너 추가/수정 (관리자 전용)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { page, image_url, title, link_url, display_order = 0 } = body;

    if (!page || !image_url) {
      return NextResponse.json(
        { success: false, error: '페이지와 이미지 URL은 필수입니다.' },
        { status: 400 }
      );
    }

    const conn = connect({ url: process.env.DATABASE_URL! });

    // 기존 배너 비활성화
    await conn.execute(
      'UPDATE page_banners SET is_active = FALSE WHERE page = ?',
      [page]
    );

    // 새 배너 추가
    const result = await conn.execute(`
      INSERT INTO page_banners (page, image_url, title, link_url, display_order, is_active)
      VALUES (?, ?, ?, ?, ?, TRUE)
    `, [page, image_url, title || '', link_url || '', display_order]);

    return NextResponse.json({
      success: true,
      message: '배너가 저장되었습니다.',
      data: result
    });
  } catch (error) {
    console.error('Banner creation error:', error);
    return NextResponse.json(
      { success: false, error: '배너 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
