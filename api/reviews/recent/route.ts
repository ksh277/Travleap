import { connect } from '@planetscale/database';

export async function GET(request: Request) {
  const origin = request.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    const conn = connect({ url: process.env.DATABASE_URL! });
    const result = await conn.execute(\`
      SELECT r.id, r.rating, r.comment, r.created_at,
             u.name as user_name, l.title as listing_title, l.id as listing_id
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      WHERE r.is_visible = TRUE
      ORDER BY r.created_at DESC
      LIMIT ?
    \`, [limit]);

    return new Response(
      JSON.stringify({ success: true, reviews: result.rows || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Reviews error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch reviews', reviews: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
