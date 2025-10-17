/**
 * 카테고리 API - Vercel Serverless Function
 * GET /api/categories - 활성화된 카테고리 목록 조회
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

// GET - 활성화된 카테고리 목록
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  const corsHeaders = getCorsHeaders(origin);

  try {
    const conn = getDbConnection();
    const result = await conn.execute(`
      SELECT
        id,
        name_ko,
        name_en,
        slug,
        icon,
        description_ko,
        description_en,
        sort_order,
        is_active
      FROM categories
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `);

    return NextResponse.json(
      {
        success: true,
        categories: result.rows || []
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Get categories error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch categories',
        categories: []
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
