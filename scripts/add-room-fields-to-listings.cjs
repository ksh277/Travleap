/**
 * listings 테이블에 객실 관리 필드 추가
 * PMS 동기화 및 객실 상세 정보 지원
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function addRoomFields() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n' + '='.repeat(70));
  console.log('listings 테이블에 객실 관리 필드 추가');
  console.log('='.repeat(70) + '\n');

  try {
    // 추가할 필드들
    const fields = [
      { name: 'room_code', type: 'VARCHAR(50)', comment: '객실 코드 (PMS 연동용)' },
      { name: 'room_number', type: 'VARCHAR(50)', comment: '객실 번호' },
      { name: 'floor', type: 'INT', comment: '층수' },
      { name: 'bed_type', type: 'VARCHAR(50)', comment: '침대 타입 (single, double, queen, king)' },
      { name: 'bed_count', type: 'INT DEFAULT 1', comment: '침대 개수' },
      { name: 'size_sqm', type: 'DECIMAL(10,2)', comment: '객실 크기 (제곱미터)' },
      { name: 'base_price_per_night', type: 'DECIMAL(10,2)', comment: '1박 기본 가격' },
      { name: 'weekend_surcharge', type: 'DECIMAL(10,2) DEFAULT 0', comment: '주말 할증' },
      { name: 'view_type', type: 'VARCHAR(50)', comment: '뷰 타입 (ocean, garden, city, mountain)' },
      { name: 'has_balcony', type: 'TINYINT(1) DEFAULT 0', comment: '발코니 여부' },
      { name: 'breakfast_included', type: 'TINYINT(1) DEFAULT 0', comment: '조식 포함 여부' },
      { name: 'wifi_available', type: 'TINYINT(1) DEFAULT 1', comment: 'WiFi 제공' },
      { name: 'tv_available', type: 'TINYINT(1) DEFAULT 1', comment: 'TV 제공' },
      { name: 'minibar_available', type: 'TINYINT(1) DEFAULT 0', comment: '미니바 제공' },
      { name: 'air_conditioning', type: 'TINYINT(1) DEFAULT 1', comment: '에어컨' },
      { name: 'heating', type: 'TINYINT(1) DEFAULT 1', comment: '난방' },
      { name: 'bathroom_type', type: 'VARCHAR(50)', comment: '욕실 타입 (shower, bathtub, jacuzzi)' },
      { name: 'max_occupancy', type: 'INT', comment: '최대 투숙 인원' },
      { name: 'min_nights', type: 'INT DEFAULT 1', comment: '최소 숙박일' },
      { name: 'max_nights', type: 'INT DEFAULT 30', comment: '최대 숙박일' }
    ];

    // 기존 필드 확인
    const existingFields = await connection.execute('DESCRIBE listings');
    const existingFieldNames = existingFields.rows.map(row => row.Field);

    console.log('추가할 필드 확인 중...\n');

    for (const field of fields) {
      if (existingFieldNames.includes(field.name)) {
        console.log(`  ⊙ ${field.name.padEnd(30)} 이미 존재함`);
      } else {
        console.log(`  + ${field.name.padEnd(30)} 추가 예정`);

        try {
          await connection.execute(
            `ALTER TABLE listings ADD COLUMN ${field.name} ${field.type} COMMENT '${field.comment}'`
          );
          console.log(`    ✓ ${field.name} 추가 완료`);
        } catch (error) {
          console.log(`    ✗ ${field.name} 추가 실패: ${error.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('객실 필드 추가 완료!');
    console.log('='.repeat(70));
    console.log(`
이제 listings 테이블로 객실 관리 가능:
  - category='stay' + category_id로 숙박 필터링
  - room_code로 PMS 동기화
  - 상세 객실 정보 (침대, 뷰, 어메니티)
  - 가격 정책 (기본가, 주말할증)
`);

  } catch (error) {
    console.error('\n✗ 오류 발생:', error.message);
  }
}

addRoomFields();
