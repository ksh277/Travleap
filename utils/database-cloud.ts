// Cloud Database (PlanetScale via Serverless Functions)
// 브라우저에서 실행되며, Vercel Serverless Functions를 통해 PlanetScale에 접근

export interface QueryResult {
  rows: any[];
  insertId?: number;
  affectedRows?: number;
}

class CloudDatabase {
  private getApiBase(): string {
    // 서버 사이드에서는 항상 절대 경로 사용
    if (typeof window === 'undefined') {
      return process.env.API_URL || 'http://localhost:3004/api/db';
    }
    // 브라우저에서는 프로덕션에서 상대 경로, 로컬에서 절대 경로
    const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';
    return isProduction ? '/api/db' : 'http://localhost:3004/api/db';
  }

  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    const apiBase = this.getApiBase();
    try {
      const response = await fetch(`${apiBase}?action=query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql, params })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Database query failed');
      }

      return {
        rows: data.data || [],
        insertId: data.insertId || 0,
        affectedRows: data.affectedRows || 0
      };
    } catch (error) {
      console.error('Database execution error:', error);
      return {
        rows: [],
        insertId: 0,
        affectedRows: 0
      };
    }
  }

  // SELECT
  async select(table: string, where?: Record<string, any>): Promise<any[]> {
    const apiBase = this.getApiBase();
    try {
      const response = await fetch(`${apiBase}?action=select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ table, where })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Select failed:', data.error);
        return [];
      }

      return data.data || [];
    } catch (error) {
      console.error('Select error:', error);
      return [];
    }
  }

  // 별칭: findAll
  async findAll(table: string, where?: Record<string, any>): Promise<any[]> {
    return this.select(table, where);
  }

  // 별칭: findOne
  async findOne(table: string, where?: Record<string, any>): Promise<any | null> {
    const results = await this.select(table, where);
    return results.length > 0 ? results[0] : null;
  }

  // INSERT
  async insert(table: string, data: Record<string, any>): Promise<{ id: number; [key: string]: any }> {
    const apiBase = this.getApiBase();
    try {
      const response = await fetch(`${apiBase}?action=insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ table, data })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Insert failed:', result.error);
        return { id: Date.now(), ...data };
      }

      return result.data;
    } catch (error) {
      console.error('Insert error:', error);
      return { id: Date.now(), ...data };
    }
  }

  // UPDATE
  async update(table: string, id: number, data: Record<string, any>): Promise<boolean> {
    const apiBase = this.getApiBase();
    try {
      const response = await fetch(`${apiBase}?action=update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ table, id, data })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Update failed:', result.error);
        return false;
      }

      return result.success;
    } catch (error) {
      console.error('Update error:', error);
      return false;
    }
  }

  // UPSERT
  async upsert(table: string, where: Record<string, any>, data: Record<string, any>): Promise<{ id: number; [key: string]: any }> {
    const existing = await this.select(table, where);

    if (existing.length > 0) {
      await this.update(table, existing[0].id, data);
      return { id: existing[0].id, ...data };
    } else {
      return await this.insert(table, { ...where, ...data });
    }
  }

  // DELETE
  async delete(table: string, id: number): Promise<boolean> {
    const apiBase = this.getApiBase();
    try {
      const response = await fetch(`${apiBase}?action=delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ table, id })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Delete failed:', result.error);
        return false;
      }

      return result.success;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  }

  // QUERY (raw SQL)
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const result = await this.execute(sql, params);
    return result.rows as T[];
  }

  // Test Connection
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as test');
      return result.length > 0 && result[0].test === 1;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const db = new CloudDatabase();
export default db;
