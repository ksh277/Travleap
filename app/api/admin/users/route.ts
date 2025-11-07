import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

export async function GET() {
  try {
    console.log('👥 [Admin Users] API 호출 시작');

    const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('POSTGRES_DATABASE_URL not configured');
    }

    const pool = new Pool({ connectionString });
    console.log('✅ [Admin Users] Pool 연결 성공');

    try {
      // Neon PostgreSQL에서 사용자 정보 조회
      const result = await pool.query(`
        SELECT
          id, email, name, role, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
      `);

      console.log(`✅ [Admin Users] ${result.rows?.length || 0}명 조회 완료`);

      const total = result.rows?.length || 0;

      return NextResponse.json({
        success: true,
        data: result.rows || [],
        pagination: {
          page: 1,
          limit: total,
          total: total,
          total_pages: 1
        }
      });
    } finally {
      await pool.end();
    }
  } catch (error) {
    console.error('❌ [Admin Users] Error fetching users:', error);

    // 에러 시 빈 배열 반환 (200 상태로)
    return NextResponse.json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 0,
        total: 0,
        total_pages: 0
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      _debug: {
        hasPostgresUrl: !!process.env.POSTGRES_DATABASE_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL
      }
    });
  }
}
