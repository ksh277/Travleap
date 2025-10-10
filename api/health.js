const { connect } = require('@planetscale/database');

export default async function handler(req, res) {
  // CORS
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

  try {
    const connection = connect({
      host: process.env.VITE_PLANETSCALE_HOST,
      username: process.env.VITE_PLANETSCALE_USERNAME,
      password: process.env.VITE_PLANETSCALE_PASSWORD
    });

    const result = await connection.execute('SELECT 1 as test');

    return res.status(200).json({
      success: true,
      message: 'Database connected',
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
