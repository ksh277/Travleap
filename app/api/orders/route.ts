import { NextResponse } from 'next/server';
import { connect } from '@planetscale/database';

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

export async function GET() {
  try {
    const conn = connect(config);

    const result = await conn.execute(`
      SELECT
        o.id,
        o.total_amount as amount,
        o.status,
        o.payment_status,
        o.created_at,
        o.start_date,
        o.end_date,
        o.guests,
        u.name as user_name,
        u.email as user_email,
        l.title as product_title,
        l.id as listing_id
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN listings l ON o.listing_id = l.id
      ORDER BY o.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      orders: result.rows
    });

  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders', orders: [] },
      { status: 500 }
    );
  }
}
