/**
 * 모든 페이지 배너/배경 이미지 설정 스크립트
 *
 * 배너 관리에서 통합 관리할 수 있도록 모든 페이지의 배경 이미지를 설정합니다.
 */

import { connect } from '@planetscale/database';
import { config } from 'dotenv';

config();

const connection = connect({ url: process.env.DATABASE_URL_BUSINESS! });

interface PageBanner {
  page: string;
  page_name: string;
  image_url: string;
  title?: string;
  description?: string;
}

// 모든 페이지의 배너/배경 이미지 설정
const pageBanners: PageBanner[] = [
  // 1. 로그인 페이지
  {
    page: 'login',
    page_name: '로그인',
    image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1366&h=300&fit=crop',
    title: '여행의 시작',
    description: '트래블립과 함께 특별한 여행을 시작하세요'
  },

  // 2. 회원가입 페이지
  {
    page: 'signup',
    page_name: '회원가입',
    image_url: 'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=1366&h=300&fit=crop',
    title: '함께 시작해요',
    description: '지금 가입하고 특별한 혜택을 받으세요'
  },

  // 3. 메인 페이지 (배경)
  {
    page: 'home_background',
    page_name: '메인 페이지 배경',
    image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    title: '여행의 모든 것',
    description: '트래블립에서 완벽한 여행을 계획하세요'
  },

  // 4. 소개 페이지
  {
    page: 'about',
    page_name: '소개 페이지',
    image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop',
    title: '트래블립 소개',
    description: '신뢰할 수 있는 여행 플랫폼'
  },

  // 5. 가맹점 페이지
  {
    page: 'partner',
    page_name: '가맹점 페이지',
    image_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=300&fit=crop',
    title: '파트너 모집',
    description: '트래블립과 함께 성장하세요'
  },

  // 6. 가맹점 신청 페이지
  {
    page: 'partner_apply',
    page_name: '가맹점 신청',
    image_url: 'https://images.unsplash.com/photo-1730720426620-9b96001122f0?w=1080&h=300&fit=crop',
    title: '파트너 신청',
    description: '지금 바로 신청하세요'
  },

  // 7. 문의 페이지
  {
    page: 'contact',
    page_name: '문의 페이지',
    image_url: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=1200&h=300&fit=crop',
    title: '문의하기',
    description: '언제든지 연락주세요'
  },

  // 8. 카테고리 페이지
  {
    page: 'category',
    page_name: '카테고리 목록',
    image_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=300&fit=crop',
    title: '여행 카테고리',
    description: '원하는 여행 상품을 찾아보세요'
  },

  // 9. 카테고리 상세 페이지
  {
    page: 'category_detail',
    page_name: '카테고리 상세',
    image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=300&fit=crop',
    title: '카테고리 상세',
    description: '다양한 상품을 확인하세요'
  }
];

async function setupPageBanners() {
  console.log('='.repeat(80));
  console.log('페이지 배너 설정 시작');
  console.log('='.repeat(80));

  try {
    // 1. 기존 페이지 배너 확인
    const existingBanners = await connection.execute(`
      SELECT page FROM banners WHERE page IS NOT NULL
    `);

    const existingPages = new Set((existingBanners.rows as any[]).map(r => r.page));

    console.log(`\n기존 페이지 배너: ${existingPages.size}개`);

    // 2. 각 페이지 배너 삽입 또는 업데이트
    for (const banner of pageBanners) {
      const exists = existingPages.has(banner.page);

      if (exists) {
        // 업데이트
        await connection.execute(`
          UPDATE banners
          SET
            image_url = ?,
            title = ?,
            link_url = ?,
            is_active = 1,
            updated_at = NOW()
          WHERE page = ?
        `, [
          banner.image_url,
          banner.title || '',
          '', // link_url
          banner.page
        ]);

        console.log(`✅ [${banner.page_name}] 배너 업데이트 완료`);
      } else {
        // 삽입
        await connection.execute(`
          INSERT INTO banners (
            page,
            image_url,
            title,
            link_url,
            display_order,
            is_active,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          banner.page,
          banner.image_url,
          banner.title || '',
          '', // link_url
          0, // display_order
          1 // is_active
        ]);

        console.log(`✅ [${banner.page_name}] 새 배너 생성 완료`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ 모든 페이지 배너 설정 완료!');
    console.log('='.repeat(80));

    // 3. 최종 확인
    const finalCheck = await connection.execute(`
      SELECT page, image_url, title, is_active
      FROM banners
      WHERE page IS NOT NULL
      ORDER BY page
    `);

    console.log(`\n총 ${finalCheck.rows.length}개 페이지 배너:`);
    for (const row of finalCheck.rows as any[]) {
      const status = row.is_active ? '🟢 활성' : '🔴 비활성';
      console.log(`  ${status} [${row.page}] ${row.title || '제목 없음'}`);
      console.log(`      ${row.image_url}`);
    }

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
setupPageBanners()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });
