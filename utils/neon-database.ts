/**
 * Neon PostgreSQL 데이터베이스 연결 유틸리티
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// WebSocket 설정 (로컬 개발 환경)
neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;

export function getNeonPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('POSTGRES_DATABASE_URL 또는 DATABASE_URL 환경변수가 설정되지 않았습니다');
    }

    pool = new Pool({ connectionString });
    console.log('✅ Neon PostgreSQL 연결 풀 생성됨');
  }

  return pool;
}

export async function queryNeon<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  const pool = getNeonPool();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function queryNeonSingle<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const rows = await queryNeon<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// 트랜잭션 지원
export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const pool = getNeonPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
