import { connect } from '@planetscale/database';

export async function GET(request: Request) {
  const origin = request.headers.get('origin') || '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const conn = connect({ url: process.env.DATABASE_URL! });
    const result = await conn.execute(\`
      SELECT id, image_url, title, link_url, size, display_order
      FROM activity_images
      WHERE is_active = TRUE
      ORDER BY display_order ASC, created_at DESC
    \`);

    return new Response(
      JSON.stringify({ success: true, activities: result.rows || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Activities error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch activities', activities: [] }),
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
