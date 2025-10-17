/**
 * 배너 API - Vercel Serverless Function
 * GET /api/banners - 활성화된 배너 목록 조회
 */

// @ts-ignore - Next.js types not installed in Vite project
import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';
import { getCorsHeaders } from '../../utils/cors';

// Vercel 환경에서 직접 DB 연결 생성
const getDbConnection = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return connect({ url });
};

// CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  return NextResponse.json({}, { headers: getCorsHeaders(origin) });
}

// GET - 활성화된 배너 목록
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  const corsHeaders = getCorsHeaders(origin);

  try {
    const conn = getDbConnection();
    const result = await conn.execute(`
      SELECT id, image_url, title, link_url, display_order
      FROM home_banners
      WHERE is_active = TRUE
      ORDER BY display_order ASC, created_at DESC
    `);

    return NextResponse.json(
      {
        success: true,
        banners: result.rows || []
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Get banners error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch banners',
        banners: []
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
