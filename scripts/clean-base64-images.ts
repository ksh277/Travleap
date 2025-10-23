/**
 * Base64 이미지 정리 스크립트
 * partners 테이블에서 base64로 인코딩된 큰 이미지를 제거
 */

import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function cleanBase64Images() {
  const connection = connect({
    url: process.env.DATABASE_URL
  });

  try {
    console.log('🔍 Base64 이미지가 있는 파트너를 찾는 중...\n');

    // images 필드가 있는 파트너들 조회
    const { rows: partners } = await connection.execute(`
      SELECT id, business_name, images
      FROM partners
      WHERE images IS NOT NULL AND images != ''
    `);

    console.log(`✅ 총 ${partners.length}개 파트너에 이미지 데이터가 있습니다.\n`);

    let cleanedCount = 0;
    let base64Count = 0;
    let urlCount = 0;

    for (const partner of partners as any[]) {
      try {
        const images = typeof partner.images === 'string'
          ? JSON.parse(partner.images)
          : partner.images;

        if (!Array.isArray(images)) {
          console.log(`⚠️  파트너 ${partner.id} (${partner.business_name}): images가 배열이 아님`);
          continue;
        }

        // base64와 URL 이미지 분리
        const base64Images: string[] = [];
        const urlImages: string[] = [];

        for (const img of images) {
          if (typeof img === 'string') {
            if (img.startsWith('data:image')) {
              base64Images.push(img);
              base64Count++;
            } else if (img.startsWith('http://') || img.startsWith('https://')) {
              urlImages.push(img);
              urlCount++;
            }
          }
        }

        // base64 이미지가 있으면 정리
        if (base64Images.length > 0) {
          console.log(`🧹 파트너 ${partner.id} (${partner.business_name}):`);
          console.log(`   - Base64 이미지: ${base64Images.length}개`);
          console.log(`   - URL 이미지: ${urlImages.length}개`);

          // URL 이미지만 남기기 (없으면 NULL)
          const newImagesValue = urlImages.length > 0
            ? JSON.stringify(urlImages)
            : null;

          await connection.execute(
            `UPDATE partners SET images = ? WHERE id = ?`,
            [newImagesValue, partner.id]
          );

          cleanedCount++;
          console.log(`   ✅ 정리 완료 (${urlImages.length}개 URL 이미지 유지)\n`);
        }
      } catch (error) {
        console.error(`❌ 파트너 ${partner.id} 처리 중 오류:`, error);
      }
    }

    console.log('\n📊 정리 결과:');
    console.log(`   - 정리된 파트너: ${cleanedCount}개`);
    console.log(`   - 제거된 Base64 이미지: ${base64Count}개`);
    console.log(`   - 유지된 URL 이미지: ${urlCount}개`);
    console.log('\n✅ Base64 이미지 정리 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 스크립트 실행
cleanBase64Images()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
