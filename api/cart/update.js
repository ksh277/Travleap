/**
 * 장바구니 수량 변경 API
 * PUT /api/cart/update
 *
 * cart.js의 PUT 메서드로 리다이렉트
 */

const cartHandler = require('../cart');

module.exports = async function handler(req, res) {
  // PUT 메서드만 허용
  if (req.method !== 'PUT' && req.method !== 'OPTIONS') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // body에서 listingId를 itemId로 변환 (cart.js가 itemId를 query에서 읽음)
  if (req.body.listingId) {
    req.query.itemId = req.body.listingId.toString();
  }

  // body에서 userId를 query로 옮김
  if (req.body.userId) {
    req.query.userId = req.body.userId.toString();
  }

  console.log('🔢 [Cart Update] Redirecting to cart.js PUT handler');
  console.log('   userId:', req.query.userId, 'itemId:', req.query.itemId);
  console.log('   quantity:', req.body.quantity);

  // cart.js의 PUT 핸들러로 위임
  return cartHandler(req, res);
};
