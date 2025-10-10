import type { VercelRequest, VercelResponse } from '@vercel/node';
import { connect } from '@planetscale/database';

// PlanetScale connection
const connection = connect({
  host: process.env.VITE_PLANETSCALE_HOST,
  username: process.env.VITE_PLANETSCALE_USERNAME,
  password: process.env.VITE_PLANETSCALE_PASSWORD
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS settings
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action, table } = req.query;

  try {
    // Get all tables
    if (action === 'tables') {
      const result = await connection.execute('SHOW TABLES');
      const tables = result.rows.map((row: any) => Object.values(row)[0]);

      return res.json({
        success: true,
        count: tables.length,
        tables: tables
      });
    }

    // Get table structure
    if (action === 'describe' && table) {
      const result = await connection.execute(`DESCRIBE ${table}`);

      return res.json({
        success: true,
        table: table,
        columns: result.rows
      });
    }

    // Get sample data from table
    if (action === 'sample' && table) {
      const result = await connection.execute(`SELECT * FROM ${table} LIMIT 5`);

      return res.json({
        success: true,
        table: table,
        count: result.rows.length,
        data: result.rows
      });
    }

    // Get all table info at once
    if (action === 'full-inspect') {
      // Get all tables
      const tablesResult = await connection.execute('SHOW TABLES');
      const tables = tablesResult.rows.map((row: any) => Object.values(row)[0]) as string[];

      // Get structure for each table
      const tableInfo: any = {};

      for (const table of tables) {
        try {
          const describeResult = await connection.execute(`DESCRIBE ${table as string}`);
          const sampleResult = await connection.execute(`SELECT * FROM ${table as string} LIMIT 3`);
          const countResult = await connection.execute(`SELECT COUNT(*) as count FROM ${table as string}`);

          tableInfo[table as string] = {
            columns: describeResult.rows,
            sampleData: sampleResult.rows,
            totalRows: (countResult.rows[0] as any).count
          };
        } catch (error) {
          tableInfo[table as string] = {
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }

      return res.json({
        success: true,
        totalTables: tables.length,
        tables: tables,
        details: tableInfo
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid action. Use: tables, describe, sample, or full-inspect'
    });

  } catch (error) {
    console.error('Database inspection error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
