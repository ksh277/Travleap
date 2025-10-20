const { connect } = require('@planetscale/database');


module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', req.headers['origin'] || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'GET') {

  try {
    const conn = connect({ url: process.env.DATABASE_URL });
    const result = await conn.execute(`
      SELECT id, image_url, title, link_url, display_order
      FROM home_banners
      WHERE is_active = TRUE
      ORDER BY display_order ASC, created_at DESC
    `);

    return new Response(
      JSON.stringify({ success: true, banners: result.rows || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Banners error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch banners', banners: [] }),
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
