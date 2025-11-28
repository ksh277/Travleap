/**
 * 파트너 대시보드 접근 문제 분석
 * partners.user_id와 실제 유저 연결 상태 확인
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');
const { neon } = require('@neondatabase/serverless');

async function analyze() {
  const conn = connect({ url: process.env.DATABASE_URL });
  const sql = neon(process.env.POSTGRES_DATABASE_URL);

  console.log('========================================');
  console.log('  파트너 대시보드 접근 문제 분석');
  console.log('========================================\n');

  // 1. partners 테이블의 user_id 분석
  console.log('=== 1. partners 테이블 user_id 분석 ===\n');

  const partners = await conn.execute(`
    SELECT id, user_id, business_name, status, is_coupon_partner
    FROM partners
    WHERE status = 'approved'
    ORDER BY id
    LIMIT 30
  `);

  console.log('ID\tuser_id\t\tcoupon\t업체명');
  console.log('-'.repeat(70));

  const userIds = [];
  (partners.rows || []).forEach(p => {
    console.log(`${p.id}\t${p.user_id || 'NULL'}\t\t${p.is_coupon_partner ? 'ON' : 'OFF'}\t${p.business_name}`);
    if (p.user_id) userIds.push(p.user_id);
  });

  const uniqueUserIds = [...new Set(userIds)];
  console.log(`\n총 승인 파트너: ${partners.rows.length}개`);
  console.log(`user_id가 있는 파트너: ${userIds.length}개`);
  console.log(`고유 user_id: ${uniqueUserIds.length}개`);
  console.log(`user_id 목록: [${uniqueUserIds.join(', ')}]`);

  // 2. Neon DB의 users 테이블에서 해당 user_id 확인
  console.log('\n=== 2. Neon users 테이블 확인 ===\n');

  if (uniqueUserIds.length > 0) {
    try {
      const users = await sql`
        SELECT id, email, name, role FROM users WHERE id = ANY(${uniqueUserIds})
      `;

      console.log('ID\trole\t\temail');
      console.log('-'.repeat(60));
      users.forEach(u => {
        console.log(`${u.id}\t${u.role || 'user'}\t\t${u.email}`);
      });

      console.log(`\n연결된 유저: ${users.length}개`);

      // 어떤 user_id가 실제 존재하는지
      const existingIds = users.map(u => u.id);
      const missingIds = uniqueUserIds.filter(id => !existingIds.includes(id));
      if (missingIds.length > 0) {
        console.log(`\n⚠️  users 테이블에 없는 user_id: [${missingIds.join(', ')}]`);
      }
    } catch (e) {
      console.error('Neon 조회 오류:', e.message);
    }
  }

  // 3. role='partner'인 유저 확인
  console.log('\n=== 3. role=partner인 유저 확인 ===\n');

  try {
    const partnerUsers = await sql`
      SELECT id, email, name, role FROM users WHERE role = 'partner'
    `;

    if (partnerUsers.length === 0) {
      console.log('❌ role=partner인 유저가 없습니다!');
    } else {
      console.log('ID\temail\t\t\t\tname');
      console.log('-'.repeat(60));
      partnerUsers.forEach(u => {
        console.log(`${u.id}\t${u.email}\t\t${u.name || '-'}`);
      });
      console.log(`\n총 partner 역할 유저: ${partnerUsers.length}명`);

      // 이 유저들이 partners 테이블에 연결되어 있는지
      const partnerUserIds = partnerUsers.map(u => u.id);
      for (const uid of partnerUserIds) {
        const linked = await conn.execute(
          `SELECT id, business_name, status FROM partners WHERE user_id = ?`,
          [uid]
        );
        if (linked.rows && linked.rows.length > 0) {
          const p = linked.rows[0];
          console.log(`  ✅ user ${uid} → partner ${p.id} (${p.business_name}) [${p.status}]`);
        } else {
          console.log(`  ❌ user ${uid} → 연결된 partner 없음`);
        }
      }
    }
  } catch (e) {
    console.error('Neon 조회 오류:', e.message);
  }

  // 4. 현재 로그인 가능한 테스트 계정 확인
  console.log('\n=== 4. 문제 원인 요약 ===\n');

  console.log(`파트너 대시보드 접근 조건:
1. 유저가 로그인되어 있어야 함 (useAuth의 user.id 필요)
2. /api/partner/info?userId={user.id} 호출
3. partners 테이블에서 user_id = {user.id} AND status = 'approved' 조회
4. 결과가 있으면 파트너 정보 표시, 없으면 "파트너 정보 없음"

문제: partners.user_id와 실제 로그인한 유저의 id가 일치해야 함
`);

  // 5. 해결책 제안
  console.log('=== 5. 해결책 ===\n');

  console.log(`방법 1: 기존 유저를 파트너로 연결
  - users 테이블에서 특정 유저 선택
  - 해당 유저의 id를 partners.user_id에 설정
  - users.role을 'partner'로 변경

방법 2: 새 파트너 계정 생성
  - 새 유저 생성 (role='partner')
  - partners 테이블에 해당 user_id로 새 레코드 추가
`);
}

analyze().catch(console.error);
