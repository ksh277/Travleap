/**
 * 벤더 상품 목록 조회 API
 *
 * GET /api/vendor/products?vendorId={vendorId}
 *
 * 권한: vendor (본인 상품만 조회 가능)
 */

const { db } = require('../../utils/database');
const { JWTUtils } = require('../../utils/jwt');

module.exports = async function handler(req, res) {
  try {
    // GET 메서드만 허용
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // JWT 인증 확인
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = JWTUtils.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid token'
      });
    }

    // 벤더 권한 확인
    if (decoded.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Vendor role required',
        userRole: decoded.role
      });
    }

    const vendorId = req.query.vendorId;

    // 본인 상품만 조회 가능
    if (parseInt(vendorId) !== decoded.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden - Can only view own products'
      });
    }

    console.log(`📦 [Vendor Products] Loading products for vendor ${vendorId}`);

    // 벤더의 상품 목록 조회
    const products = await db.query(`
      SELECT
        id,
        title,
        category,
        price,
        stock,
        status,
        is_active,
        created_at
      FROM listings
      WHERE user_id = ?
        AND category = '팝업'
      ORDER BY created_at DESC
    `, [vendorId]);

    console.log(`✅ [Vendor Products] Found ${products.length} products`);

    return res.status(200).json({
      success: true,
      data: products,
      count: products.length
    });

  } catch (error) {
    console.error('❌ [Vendor Products] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
