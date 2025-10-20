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
    const result = await conn.execute(`
      SELECT id, name_ko, name_en, slug, icon, description_ko, description_en, sort_order, is_active
      FROM categories
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `);

    return new Response(
      JSON.stringify({ success: true, categories: result.rows || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Categories error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch categories', categories: [] }),
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
