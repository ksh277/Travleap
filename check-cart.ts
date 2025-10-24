import { connect } from '@planetscale/database';

const connection = connect({ url: process.env.DATABASE_URL! });

async function checkCart() {
  // admin@shinan.com 사용자 ID 찾기
  const userResult = await connection.execute(`
    SELECT id, email, name FROM users WHERE email = 'admin@shinan.com'
  `);
  
  if (userResult.rows.length === 0) {
    console.log('❌ admin@shinan.com 사용자를 찾을 수 없습니다.');
    return;
  }
  
  const user = userResult.rows[0] as any;
  console.log(`\n✅ 사용자: ${user.name} (ID: ${user.id}, 이메일: ${user.email})\n`);
  
  // 장바구니 조회
  const cartResult = await connection.execute(`
    SELECT * FROM cart_items WHERE user_id = ?
  `, [user.id]);
  
  console.log('=== 장바구니 내역 ===\n');
  if (cartResult.rows.length === 0) {
    console.log('장바구니가 비어있습니다.');
  } else {
    cartResult.rows.forEach((item: any) => {
      console.log(`ID: ${item.id} | listing_id: ${item.listing_id} | quantity: ${item.quantity} | created_at: ${item.created_at}`);
    });
    console.log(`\n총 ${cartResult.rows.length}개 항목`);
  }
}

checkCart();
