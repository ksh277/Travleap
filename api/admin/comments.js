/**
 * 댓글 관리 API
 * GET /api/admin/comments - 모든 댓글 조회
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // TODO: 댓글 데이터베이스 연동 필요
    // 현재는 빈 배열 반환
    return res.status(200).json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('Comments API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
