/**
 * 장바구니 추가 API (Backwards Compatibility)
 * POST /api/cart/add
 *
 * 실제로는 /api/cart.js의 POST 메서드를 사용하므로,
 * 이 파일은 단순히 리다이렉트 역할
 */

const cartHandler = require('../cart');

module.exports = async function handler(req, res) {
  // POST 메서드만 허용
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // userId를 body에서 query로 옮김 (cart.js가 query에서 읽음)
  if (req.body.userId) {
    req.query.userId = req.body.userId;
  }

  // cart.js의 POST 핸들러로 위임
  return cartHandler(req, res);
};
