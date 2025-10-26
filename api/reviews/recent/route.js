const { connect } = require('@planetscale/database');


module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', req.headers['origin'] || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'GET') {

  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    const conn = connect({ url: process.env.DATABASE_URL });
    const result = await conn.execute(`
      SELECT r.id, r.rating, r.comment, r.created_at,
             u.name, l.title, l.id
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN listings l ON r.listing_id = l.id
      WHERE r.is_visible = TRUE
      ORDER BY r.created_at DESC
      LIMIT ?
    `, [limit]);

    return new Response(
      JSON.stringify({ success: true, reviews: result || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Reviews error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch reviews', reviews: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }  } else if (req.method === 'OPTIONS') {

  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
};
