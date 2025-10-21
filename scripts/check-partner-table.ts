import 'dotenv/config';
import { connect } from '@planetscale/database';

async function checkPartnerApplicationsTable() {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // 테이블 구조 확인
    console.log('partner_applications 테이블 구조 확인...\n');
    const columns = await connection.execute(`
      DESCRIBE partner_applications
    `);

    console.log('컬럼 목록:');
    columns.rows.forEach((col: any) => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // 최근 신청 데이터 확인
    const applications = await connection.execute(`
      SELECT * FROM partner_applications ORDER BY created_at DESC LIMIT 5
    `);

    console.log('\n최근 파트너 신청 데이터 (총 ' + applications.rows.length + '개):');

    if (applications.rows.length === 0) {
      console.log('  → 신청 데이터가 없습니다.');
    } else {
      (applications.rows as any[]).forEach((app: any) => {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('신청 ID:', app.id);
        console.log('업체명:', app.company_name);
        console.log('담당자:', app.representative_name);
        console.log('이메일:', app.email);
        console.log('전화:', app.phone);
        console.log('주소:', app.address || '(미입력)');
        console.log('위치:', app.location || '(미입력)');
        console.log('좌표:', app.coordinates || '(미입력)');
        console.log('카테고리:', app.category || '(미입력)');
        console.log('상태:', app.status);
        console.log('신청일:', app.created_at);
      });
    }

  } catch (error) {
    console.error('에러:', error);
  } finally {
    process.exit(0);
  }
}

checkPartnerApplicationsTable();
