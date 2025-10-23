const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkVendor() {
  const businessDB = connect({ url: process.env.DATABASE_URL_BUSINESS });
  
  // 각 벤더별 차량 수 확인
  const vendorResult = await businessDB.execute(`
    SELECT 
      rv.id,
      rv.vendor_name,
      rv.vendor_email,
      rv.user_id,
      COUNT(v.id) as vehicle_count
    FROM rentcar_vendors rv
    LEFT JOIN rentcar_vehicles v ON v.vendor_id = rv.id
    GROUP BY rv.id, rv.vendor_name, rv.vendor_email, rv.user_id
    ORDER BY vehicle_count DESC
    LIMIT 5
  `);
  
  console.log('=== 벤더별 차량 수 ===');
  vendorResult.rows.forEach(v => {
    console.log(`${v.vendor_name}: ${v.vehicle_count}대 (user_id: ${v.user_id}, email: ${v.vendor_email})`);
  });
  
  // 165대 가진 벤더의 user_id로 Neon에서 계정 정보 찾기
  const vendor165 = vendorResult.rows.find(v => v.vehicle_count >= 165);
  
  if (vendor165) {
    console.log('\n=== 165대 차량 보유 벤더 ===');
    console.log('벤더명:', vendor165.vendor_name);
    console.log('user_id:', vendor165.user_id);
    console.log('vendor_email:', vendor165.vendor_email);
    
    // Neon DB에서 이 user_id의 계정 정보 조회
    const neonDB = connect({ url: process.env.DATABASE_URL });
    
    const userResult = await neonDB.execute(
      'SELECT id, email, role, name FROM users WHERE id = ?',
      [vendor165.user_id]
    );
    
    console.log('\n=== 로그인 계정 정보 ===');
    if (userResult.rows.length > 0) {
      console.log('이메일:', userResult.rows[0].email);
      console.log('역할:', userResult.rows[0].role);
      console.log('이름:', userResult.rows[0].name);
      console.log('\n로그인 정보:');
      console.log('  이메일:', userResult.rows[0].email);
      console.log('  비밀번호: vendor123 (기본 테스트 비밀번호)');
    } else {
      console.log('Neon DB에서 계정을 찾을 수 없습니다.');
      console.log('vendor_email로 시도:', vendor165.vendor_email);
    }
  } else {
    console.log('\n165대 이상의 차량을 보유한 벤더를 찾을 수 없습니다.');
  }
}

checkVendor().catch(console.error);
