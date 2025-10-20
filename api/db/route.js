/**
 * 데이터베이스 API 엔드포인트
 * PlanetScale MySQL 연결을 위한 서버리스 함수
 *
 * POST /api/db?action=query - Raw SQL 실행
 * POST /api/db?action=select - SELECT 쿼리
 * POST /api/db?action=insert - INSERT 쿼리
 * POST /api/db?action=update - UPDATE 쿼리
 * POST /api/db?action=delete - DELETE 쿼리
 */

// @ts-ignore - Next.js types not installed in Vite project
import { NextRequest, NextResponse } from 'next/server';
import { connect, Connection } from '@planetscale/database';

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// PlanetScale 연결 설정
function getConnection() {
  const config = {
    host: process.env.DATABASE_HOST,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
  };

  // 환경 변수 확인
  if (!config.host || !config.username || !config.password) {
    console.error('❌ PlanetScale 환경 변수가 설정되지 않았습니다:', {
      host: !!config.host,
      username: !!config.username,
      password: !!config.password,
    });
    throw new Error('데이터베이스 연결 설정이 올바르지 않습니다.');
  }

  return connect(config);
}

// OPTIONS 요청 처리 (CORS preflight)
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST 요청 처리
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const body = await request.json();

    console.log(`📊 DB API 요청: ${action}`);

    switch (action) {
      case 'query':
        return await handleQuery(body);
      case 'select':
        return await handleSelect(body);
      case 'insert':
        return await handleInsert(body);
      case 'update':
        return await handleUpdate(body);
      case 'delete':
        return await handleDelete(body);
      default:
        return NextResponse.json(
          { success: false, error: '잘못된 action 파라미터입니다.' },
          { status: 400, headers: corsHeaders }
        );
    }
  } catch (error) {
    console.error('❌ DB API 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '데이터베이스 오류가 발생했습니다.',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Raw SQL 쿼리 실행
async function handleQuery(body: { sql; params?: any[] }) {
  const { sql, params = [] } = body;

  if (!sql) {
    return NextResponse.json(
      { success: false, error: 'SQL 쿼리가 필요합니다.' },
      { status: 400, headers: corsHeaders }
    );
  }

  const conn = getConnection();

  try {
    const result = await conn.execute(sql, params);

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        insertId: result.insertId,
        affectedRows: result.rowsAffected,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Query 실행 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// SELECT 쿼리
async function handleSelect(body: { table; where?: Record<string, any> }) {
  const { table, where } = body;

  if (!table) {
    return NextResponse.json(
      { success: false, error: '테이블명이 필요합니다.' },
      { status: 400, headers: corsHeaders }
    );
  }

  const conn = getConnection();

  try {
    let sql = `SELECT * FROM ${table}`;
    const params = [];

    if (where && Object.keys(where).length > 0) {
      const conditions = Object.keys(where).map((key) => `${key} = ?`);
      sql += ` WHERE ${conditions.join(' AND ')}`;
      params.push(...Object.values(where));
    }

    const result = await conn.execute(sql, params);

    return NextResponse.json(
      { success: true, data: result.rows },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ SELECT 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// INSERT 쿼리
async function handleInsert(body: { table; data: Record<string, any> }) {
  const { table, data } = body;

  if (!table || !data) {
    return NextResponse.json(
      { success: false, error: '테이블명과 데이터가 필요합니다.' },
      { status: 400, headers: corsHeaders }
    );
  }

  const conn = getConnection();

  try {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await conn.execute(sql, values);

    return NextResponse.json(
      {
        success: true,
        data: { id: result.insertId, ...data },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ INSERT 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// UPDATE 쿼리
async function handleUpdate(body: { table; id; data: Record<string, any> }) {
  const { table, id, data } = body;

  if (!table || !id || !data) {
    return NextResponse.json(
      { success: false, error: '테이블명, ID, 데이터가 필요합니다.' },
      { status: 400, headers: corsHeaders }
    );
  }

  const conn = getConnection();

  try {
    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(data), id];

    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const result = await conn.execute(sql, values);

    return NextResponse.json(
      {
        success: true,
        affectedRows: result.rowsAffected,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ UPDATE 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE 쿼리
async function handleDelete(body: { table; id: number }) {
  const { table, id } = body;

  if (!table || !id) {
    return NextResponse.json(
      { success: false, error: '테이블명과 ID가 필요합니다.' },
      { status: 400, headers: corsHeaders }
    );
  }

  const conn = getConnection();

  try {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    const result = await conn.execute(sql, [id]);

    return NextResponse.json(
      {
        success: true,
        affectedRows: result.rowsAffected,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ DELETE 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
