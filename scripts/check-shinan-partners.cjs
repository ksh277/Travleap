const { connect } = require('@planetscale/database');
require('dotenv').config();

async function check() {
  const conn = connect({ url: process.env.DATABASE_URL });

  const result = await conn.execute(`
    SELECT id, business_name, partner_type, business_address, location, lat, lng, logo, images
    FROM partners
    WHERE business_name LIKE '%신안%'
       OR business_name LIKE '%홍도%'
       OR business_name LIKE '%흑산%'
       OR business_name LIKE '%퍼플%'
       OR business_name LIKE '%증도%'
       OR business_name LIKE '%축제%'
       OR business_name LIKE '%체험%'
       OR business_name LIKE '%트레킹%'
       OR business_name LIKE '%유람선%'
       OR business_name LIKE '%임자도%'
       OR business_name LIKE '%비금도%'
       OR business_name LIKE '%김환기%'
       OR business_name LIKE '%김대중%'
       OR business_name LIKE '%옥도%'
       OR business_name LIKE '%무한의%'
       OR business_name LIKE '%짱뚱어%'
       OR business_name LIKE '%천사섬%'
       OR business_name LIKE '%태평염전%'
       OR business_name LIKE '%순례자%'
       OR business_name LIKE '%모실길%'
       OR business_name LIKE '%라벤더%'
       OR business_name LIKE '%수선화%'
    ORDER BY partner_type, id
  `);

  console.log('=== 신안 관련 파트너 목록 ===\n');
  console.log(`총 ${result.rows.length}개\n`);

  result.rows.forEach(r => {
    console.log(`[${r.id}] ${r.partner_type} | ${r.business_name}`);
    console.log(`   주소: ${r.business_address || r.location || '❌ 없음'}`);
    console.log(`   좌표: ${r.lat && r.lng ? '✅ ' + r.lat + ', ' + r.lng : '❌ 없음'}`);
    console.log(`   이미지: ${r.logo || r.images ? '✅' : '❌ 없음'}`);
    console.log('');
  });
}

check().catch(console.error);
