/**
 * 특정 벤더의 객실 추가 API
 * POST /api/admin/lodging/vendors/[vendorId]/rooms - 객실 추가
 */

const { connect } = require('@planetscale/database');

const STAY_CATEGORY_ID = 1857;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const { vendorId } = req.query;
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log(`📥 [POST] 객실 추가 요청 (vendorId: ${vendorId})`);

    const {
      listing_name,
      description,
      location,
      address,
      price_from,
      images
    } = req.body;

    // 필수 필드 검증
    if (!listing_name || !location || !address || !price_from) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다. (listing_name, location, address, price_from)'
      });
    }

    // 벤더 존재 확인
    const vendorCheck = await connection.execute(
      'SELECT id, business_name FROM partners WHERE id = ? AND partner_type = "lodging"',
      [vendorId]
    );

    if (!vendorCheck.rows || vendorCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '벤더를 찾을 수 없습니다.'
      });
    }

    // images 처리
    const imagesJson = Array.isArray(images) ? JSON.stringify(images) : (images || '[]');

    // room_code 자동 생성
    const roomCode = `ROOM_${vendorId}_${Date.now()}`;

    // 객실 생성
    const result = await connection.execute(
      `INSERT INTO listings (
        category_id,
        category,
        partner_id,
        title,
        description_md,
        room_code,
        location,
        address,
        price_from,
        base_price_per_night,
        images,
        amenities,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        ?, 'stay', ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 1, NOW(), NOW()
      )`,
      [
        STAY_CATEGORY_ID,
        vendorId,
        listing_name,
        description || listing_name,
        roomCode,
        location,
        address,
        parseFloat(price_from),
        parseFloat(price_from),
        imagesJson
      ]
    );

    console.log('✅ 객실 추가 완료:', {
      id: result.insertId,
      vendorId,
      listing_name
    });

    return res.status(201).json({
      success: true,
      message: '객실이 추가되었습니다.',
      data: {
        id: result.insertId,
        room_code: roomCode,
        listing_name
      }
    });

  } catch (error) {
    console.error('Room creation error:', error);
    return res.status(500).json({
      success: false,
      error: '객실 추가 중 오류가 발생했습니다.',
      message: error.message
    });
  }
};
