import type { VercelRequest, VercelResponse} from '@vercel/node';
import { connect } from '@planetscale/database';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL! });

    const result = await connection.execute(`
      SELECT * FROM activities
      WHERE is_active = 1
      ORDER BY display_order ASC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows || []
    });
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
