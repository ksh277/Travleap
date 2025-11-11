/**
 * Google Maps API Key 제공 엔드포인트
 * 런타임 환경변수를 사용하여 API 키 제공
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1시간 캐시

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Vercel 런타임 환경변수에서 가져오기
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

    if (!apiKey) {
      console.error('❌ Google Maps API key not found in environment variables');
      return res.status(500).json({
        success: false,
        error: 'API key not configured'
      });
    }

    console.log('✅ Google Maps API key found:', apiKey.substring(0, 10) + '...');

    return res.status(200).json({
      success: true,
      key: apiKey
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
