const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // rentcar_vendors 테이블 구조 확인
    const vendorsSchema = await connection.execute(`
      DESCRIBE rentcar_vendors
    `);

    // partners 테이블 구조 확인
    const partnersSchema = await connection.execute(`
      DESCRIBE partners
    `);

    // rentcar_vendors 샘플 데이터 확인 (1개만)
    const vendorSample = await connection.execute(`
      SELECT * FROM rentcar_vendors LIMIT 1
    `);

    return res.status(200).json({
      success: true,
      schemas: {
        rentcar_vendors: vendorsSchema,
        partners: partnersSchema
      },
      samples: {
        rentcar_vendors: vendorSample
      }
    });

  } catch (error) {
    console.error('[Debug Schema] ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
