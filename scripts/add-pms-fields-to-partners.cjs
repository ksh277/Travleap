/**
 * partners 테이블에 PMS 필드 추가
 * 기존 테이블을 활용하여 숙박 업체 PMS 연동 지원
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function addPMSFields() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n' + '='.repeat(70));
  console.log('partners 테이블에 PMS 필드 추가');
  console.log('='.repeat(70) + '\n');

  try {
    // 추가할 필드들
    const fields = [
      { name: 'pms_provider', type: 'VARCHAR(50)', comment: 'PMS 제공업체 (cloudbeds, opera, mews, ezee, custom)' },
      { name: 'pms_api_key', type: 'VARCHAR(255)', comment: 'PMS API 키' },
      { name: 'pms_property_id', type: 'VARCHAR(100)', comment: 'PMS 숙소 ID' },
      { name: 'pms_sync_enabled', type: 'TINYINT(1) DEFAULT 0', comment: 'PMS 자동 동기화 활성화' },
      { name: 'pms_sync_interval', type: 'INT DEFAULT 60', comment: 'PMS 동기화 주기 (분)' },
      { name: 'last_sync_at', type: 'DATETIME', comment: '마지막 PMS 동기화 시간' },
      { name: 'check_in_time', type: 'VARCHAR(10)', comment: '체크인 시간' },
      { name: 'check_out_time', type: 'VARCHAR(10)', comment: '체크아웃 시간' },
      { name: 'policies', type: 'TEXT', comment: '숙소 정책' },
      { name: 'logo', type: 'VARCHAR(500)', comment: '벤더 로고 URL' }
    ];

    // 기존 필드 확인
    const existingFields = await connection.execute('DESCRIBE partners');
    const existingFieldNames = existingFields.rows.map(row => row.Field);

    console.log('추가할 필드 확인 중...\n');

    for (const field of fields) {
      if (existingFieldNames.includes(field.name)) {
        console.log(`  ⊙ ${field.name.padEnd(25)} 이미 존재함`);
      } else {
        console.log(`  + ${field.name.padEnd(25)} 추가 예정`);

        try {
          await connection.execute(
            `ALTER TABLE partners ADD COLUMN ${field.name} ${field.type} COMMENT '${field.comment}'`
          );
          console.log(`    ✓ ${field.name} 추가 완료`);
        } catch (error) {
          console.log(`    ✗ ${field.name} 추가 실패: ${error.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('PMS 필드 추가 완료!');
    console.log('='.repeat(70));
    console.log(`
이제 partners 테이블로 숙박 업체 관리 가능:
  - 기존 partner_type='lodging' 사용
  - PMS 연동 정보 저장
  - CloudBeds, Opera, Mews, eZee, Custom 지원
`);

  } catch (error) {
    console.error('\n✗ 오류 발생:', error.message);
  }
}

addPMSFields();
