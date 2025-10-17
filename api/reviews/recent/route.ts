/**
 * 최근 리뷰 API - Vercel Serverless Function
 * GET /api/reviews/recent - 최근 리뷰 조회
 */

// @ts-ignore - Next.js types not installed in Vite project
import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@planetscale/database';
import { getCorsHeaders } from '../../../utils/cors';

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

// GET - 최근 리뷰 조회
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin') || undefined;
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const conn = getDbConnection();
    const result = await conn.execute(`
      SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.name as user_name,
        l.title as listing_title,
        l.id as listing_id
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      WHERE r.is_visible = TRUE
      ORDER BY r.created_at DESC
      LIMIT ?
    `, [limit]);

    return NextResponse.json(
      {
        success: true,
        reviews: result.rows || []
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Get recent reviews error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch reviews',
        reviews: []
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
