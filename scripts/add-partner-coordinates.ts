/**
 * partners와 partner_applications 테이블에 좌표 컬럼 추가
 */

import 'dotenv/config';
import { connect } from '@planetscale/database';

const db = connect({ url: process.env.DATABASE_URL! });

async function addCoordinatesColumn() {
  try {
    console.log('📍 파트너 테이블에 좌표 컬럼 추가 중...\n');

    // 1. partners 테이블에 컬럼 추가
    console.log('1️⃣  partners 테이블 업데이트 중...');

    try {
      await db.execute(`ALTER TABLE partners ADD COLUMN coordinates VARCHAR(100)`);
      console.log('   ✅ partners.coordinates 컬럼 추가됨');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column')) {
        console.log('   ⏭️  partners.coordinates 컬럼 이미 존재');
      } else {
        throw error;
      }
    }

    try {
      await db.execute(`ALTER TABLE partners ADD COLUMN location VARCHAR(100)`);
      console.log('   ✅ partners.location 컬럼 추가됨');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column')) {
        console.log('   ⏭️  partners.location 컬럼 이미 존재');
      } else {
        throw error;
      }
    }

    // 2. partner_applications 테이블에 컬럼 추가
    console.log('\n2️⃣  partner_applications 테이블 업데이트 중...');

    try {
      await db.execute(`ALTER TABLE partner_applications ADD COLUMN coordinates VARCHAR(100)`);
      console.log('   ✅ partner_applications.coordinates 컬럼 추가됨');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column')) {
        console.log('   ⏭️  partner_applications.coordinates 컬럼 이미 존재');
      } else {
        throw error;
      }
    }

    try {
      await db.execute(`ALTER TABLE partner_applications ADD COLUMN location VARCHAR(100)`);
      console.log('   ✅ partner_applications.location 컬럼 추가됨');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column')) {
        console.log('   ⏭️  partner_applications.location 컬럼 이미 존재');
      } else {
        throw error;
      }
    }

    console.log('\n✅ 완료!');
    console.log('\n📋 추가된 컬럼:');
    console.log('   - partners.coordinates (좌표: "위도,경도")');
    console.log('   - partners.location (간단 위치: "신안군 증도면")');
    console.log('   - partner_applications.coordinates');
    console.log('   - partner_applications.location');
    console.log('\n🗺️  이제 파트너 등록 시 카카오 주소 검색으로 좌표가 자동 저장됩니다!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

addCoordinatesColumn();
