/**
 * partners 테이블 확인 - 숙박 파트너 정보
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkPartners() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('Partners 테이블 점검');
  console.log('========================================\n');

  // 1. partners 테이블 구조
  console.log('🔍 1. partners 테이블 구조\n');
  try {
    const desc = await conn.execute('DESCRIBE partners');
    console.log('✅ 테이블 존재 확인\n');

    console.log('📋 전체 컬럼:');
    desc.rows.forEach(row => {
      console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? '[NOT NULL]' : ''} ${row.Key ? `[${row.Key}]` : ''}`);
    });

    const columns = desc.rows.map(r => r.Field);

    // 파트너 타입 확인
    if (columns.includes('partner_type') || columns.includes('type')) {
      const typeCol = columns.includes('partner_type') ? 'partner_type' : 'type';
      console.log(`\n📊 파트너 타입별 분포:`);

      const typeDist = await conn.execute(`
        SELECT ${typeCol}, COUNT(*) as count
        FROM partners
        GROUP BY ${typeCol}
      `);

      typeDist.rows.forEach(row => {
        console.log(`   - ${row[typeCol] || '(NULL)'}: ${row.count}건`);
      });
    }

    // 총 파트너 수
    const count = await conn.execute('SELECT COUNT(*) as count FROM partners');
    console.log(`\n📊 총 파트너 수: ${count.rows[0].count}건`);

    // 숙박 파트너 확인
    if (columns.includes('partner_type') || columns.includes('type') || columns.includes('category')) {
      let lodgingQuery = '';
      if (columns.includes('partner_type')) {
        lodgingQuery = `
          SELECT * FROM partners
          WHERE partner_type IN ('accommodation', 'lodging', 'hotel', 'stay', '숙박')
             OR partner_type LIKE '%숙박%'
             OR partner_type LIKE '%accommodation%'
          ORDER BY id
        `;
      } else if (columns.includes('type')) {
        lodgingQuery = `
          SELECT * FROM partners
          WHERE type IN ('accommodation', 'lodging', 'hotel', 'stay', '숙박')
             OR type LIKE '%숙박%'
          ORDER BY id
        `;
      } else if (columns.includes('category')) {
        lodgingQuery = `
          SELECT * FROM partners
          WHERE category IN ('accommodation', 'lodging', 'hotel', 'stay', '숙박')
             OR category LIKE '%숙박%'
          ORDER BY id
        `;
      }

      if (lodgingQuery) {
        const lodgingPartners = await conn.execute(lodgingQuery);

        console.log(`\n🏨 숙박 파트너: ${lodgingPartners.rows.length}건\n`);

        if (lodgingPartners.rows.length > 0) {
          lodgingPartners.rows.forEach((p, idx) => {
            console.log(`${idx + 1}. ID: ${p.id} - ${p.name || p.business_name || p.partner_name}`);
            if (p.partner_type) console.log(`   타입: ${p.partner_type}`);
            if (p.location || p.address) console.log(`   위치: ${p.location || p.address}`);
            if (p.contact_email) console.log(`   이메일: ${p.contact_email}`);
            if (p.contact_phone || p.phone) console.log(`   연락처: ${p.contact_phone || p.phone}`);
            if (p.is_active !== undefined) console.log(`   활성화: ${p.is_active ? '예' : '아니오'}`);
            console.log('');
          });
        } else {
          console.log('⚠️  숙박 파트너 없음');
        }
      }
    }

    // partner_id로 연결된 숙박 listings 확인
    console.log('\n🔗 listings와의 연결 확인:\n');

    const linkedListings = await conn.execute(`
      SELECT
        p.id as partner_id,
        p.name,
        p.partner_type,
        COUNT(l.id) as listing_count,
        GROUP_CONCAT(l.id) as listing_ids
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id
      WHERE l.category IN ('숙박', 'accommodation', 'stay', 'lodging')
      GROUP BY p.id, p.name, p.partner_type
      ORDER BY listing_count DESC
    `);

    if (linkedListings.rows.length > 0) {
      console.log('숙박 listings를 가진 파트너:');
      linkedListings.rows.forEach(p => {
        console.log(`   - Partner ID ${p.partner_id} (${p.name}): ${p.listing_count}개 숙박 시설`);
        console.log(`     타입: ${p.partner_type || 'N/A'}`);
        console.log(`     Listing IDs: ${p.listing_ids}`);
        console.log('');
      });
    } else {
      console.log('⚠️  숙박 listings와 연결된 파트너 없음');
    }

    // partner_id가 NULL인 숙박 listings
    const orphanListings = await conn.execute(`
      SELECT COUNT(*) as count
      FROM listings
      WHERE category IN ('숙박', 'accommodation', 'stay', 'lodging')
        AND partner_id IS NULL
    `);

    if (orphanListings.rows[0].count > 0) {
      console.log(`⚠️  partner_id가 NULL인 숙박 listings: ${orphanListings.rows[0].count}건`);

      const orphanDetails = await conn.execute(`
        SELECT id, title, category, location
        FROM listings
        WHERE category IN ('숙박', 'accommodation', 'stay', 'lodging')
          AND partner_id IS NULL
      `);

      orphanDetails.rows.forEach(l => {
        console.log(`   - Listing ID ${l.id}: ${l.title} (${l.location || '위치 미지정'})`);
      });
    } else {
      console.log('✅ 모든 숙박 listings가 파트너와 연결됨');
    }

  } catch (error) {
    console.log(`❌ 테이블 조회 실패: ${error.message}`);
  }

  // 2. 파트너와 예약의 연결 확인
  console.log('\n\n🔍 2. 파트너-예약 연결 확인\n');

  try {
    // bookings를 통한 파트너별 예약 수
    const partnerBookings = await conn.execute(`
      SELECT
        p.id as partner_id,
        p.name,
        p.partner_type,
        COUNT(DISTINCT b.id) as booking_count
      FROM partners p
      INNER JOIN listings l ON p.id = l.partner_id
      INNER JOIN bookings b ON l.id = b.listing_id
      WHERE l.category IN ('숙박', 'accommodation', 'stay', 'lodging')
      GROUP BY p.id, p.name, p.partner_type
      ORDER BY booking_count DESC
    `);

    if (partnerBookings.rows.length > 0) {
      console.log('파트너별 숙박 예약 현황:');
      partnerBookings.rows.forEach(p => {
        console.log(`   - ${p.name} (ID: ${p.partner_id}): ${p.booking_count}건`);
        console.log(`     타입: ${p.partner_type || 'N/A'}`);
      });
    } else {
      console.log('🔍 파트너를 통한 숙박 예약 없음');
    }

  } catch (error) {
    console.log(`❌ 조회 실패: ${error.message}`);
  }

  // 3. 데이터 무결성 확인
  console.log('\n\n🔍 3. 데이터 무결성\n');

  try {
    // listings의 partner_id가 실제 partners에 존재하는지 확인
    const invalidPartners = await conn.execute(`
      SELECT COUNT(*) as count
      FROM listings l
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE l.category IN ('숙박', 'accommodation', 'stay', 'lodging')
        AND l.partner_id IS NOT NULL
        AND p.id IS NULL
    `);

    if (invalidPartners.rows[0].count > 0) {
      console.log(`⚠️  존재하지 않는 partner_id를 참조하는 숙박 listings: ${invalidPartners.rows[0].count}건`);

      const details = await conn.execute(`
        SELECT l.id, l.title, l.partner_id
        FROM listings l
        LEFT JOIN partners p ON l.partner_id = p.id
        WHERE l.category IN ('숙박', 'accommodation', 'stay', 'lodging')
          AND l.partner_id IS NOT NULL
          AND p.id IS NULL
      `);

      details.rows.forEach(l => {
        console.log(`   - Listing ID ${l.id}: ${l.title} (partner_id: ${l.partner_id})`);
      });
    } else {
      console.log('✅ 모든 숙박 listings의 partner_id가 유효함');
    }

    // 필수 필드 확인
    const desc = await conn.execute('DESCRIBE partners');
    const columns = desc.rows.map(r => r.Field);

    if (columns.includes('name') || columns.includes('business_name')) {
      const nameCol = columns.includes('name') ? 'name' : 'business_name';

      const nullNames = await conn.execute(`
        SELECT COUNT(*) as count
        FROM partners
        WHERE ${nameCol} IS NULL OR ${nameCol} = ''
      `);

      if (nullNames.rows[0].count > 0) {
        console.log(`⚠️  이름이 없는 파트너: ${nullNames.rows[0].count}건`);
      } else {
        console.log('✅ 모든 파트너에 이름 존재');
      }
    }

  } catch (error) {
    console.log(`❌ 조회 실패: ${error.message}`);
  }

  console.log('\n========================================');
  console.log('Partners 테이블 점검 완료');
  console.log('========================================\n');
}

checkPartners().catch(console.error);
