#!/usr/bin/env tsx
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyProducts() {
  const connection = connect({
    url: process.env.DATABASE_URL
  });

  const result = await connection.execute(`
    SELECT
      id, title, category, category_id, price_from, child_price, infant_price,
      max_capacity, location, address, meeting_point,
      JSON_LENGTH(highlights) as highlight_count,
      JSON_LENGTH(included) as included_count,
      JSON_LENGTH(excluded) as excluded_count
    FROM listings
    WHERE id >= 311
    ORDER BY id
  `);

  console.log('📦 데이터베이스에 저장된 테스트 상품:\n');

  result.rows.forEach((p: any) => {
    console.log(`[${p.category}] ${p.title}`);
    console.log(`   ID: ${p.id} | category_id: ${p.category_id}`);
    console.log(`   가격: ${p.price_from?.toLocaleString()}원 | 어린이: ${p.child_price?.toLocaleString() || 0}원 | 유아: ${p.infant_price || 0}원`);
    console.log(`   정원: ${p.max_capacity}명`);
    console.log(`   위치: ${p.location} / ${p.address}`);
    console.log(`   집합장소: ${p.meeting_point || '미지정'}`);
    console.log(`   하이라이트: ${p.highlight_count}개 | 포함: ${p.included_count}개 | 불포함: ${p.excluded_count}개\n`);
  });
}

verifyProducts();
