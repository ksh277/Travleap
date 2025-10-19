import type { VercelRequest, VercelResponse } from '@vercel/node';
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
    const { limit = '4' } = req.query;
    const limitNum = parseInt(limit as string);

    const connection = connect({ url: process.env.DATABASE_URL! });

    const result = await connection.execute(`
      SELECT r.*, l.title as listing_title, u.email as user_email
      FROM reviews r
      LEFT JOIN listings l ON r.listing_id = l.id
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT ?
    `, [limitNum]);

    return res.status(200).json({
      success: true,
      data: result.rows || []
    });
  } catch (error: any) {
    console.error('Error fetching recent reviews:', error);
    return res.status(500).json({ success: false, message: '리뷰 조회 실패', data: [] });
  }
}
