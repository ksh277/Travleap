/**
 * 블로그 샘플 데이터 삽입 스크립트
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { connect } from '@planetscale/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config();

async function seedBlogData() {
  console.log('🚀 Starting blog data seeding...\n');

  const conn = connect({ url: process.env.DATABASE_URL! });

  try {
    const blogs = [
      {
        title: '신안 1004섬 섬 호핑 여행기 - 증도부터 선도까지',
        slug: 'sinan-island-hopping-guide',
        excerpt: '신안의 아름다운 섬들을 돌아다니며 느낀 자연의 경이로움. 증도, 선도, 임자도를 중심으로 한 3박 4일 여행 후기입니다.',
        content_md: `# 신안 1004섬 섬 호핑 여행기

## 여행 개요
신안군은 무려 1004개의 섬으로 이루어진 곳입니다. 이번 여행에서는 **증도**, **선도**, **임자도**를 중심으로 3박 4일 동안 섬 호핑을 즐겼습니다.

## 1일차: 증도 - 슬로시티의 매력
증도는 아시아 최초의 슬로시티로 지정된 곳입니다.
- 우전해수욕장의 투명한 바닷물
- 태평염전에서 본 일몰
- 신비의 바닷길 체험

> 증도의 느린 시간은 일상의 스트레스를 모두 날려버렸습니다.

## 2일차: 선도 - 보랏빛 섬
4월에 방문한 선도는 온통 **보라색 꽃**으로 뒤덮여 있었습니다.
- 보리밭과 청보리의 향연
- 선도의 작은 포구에서 먹은 싱싱한 회
- 섬 한 바퀴 걸으며 만난 친절한 주민분들

## 3일차: 임자도 - 끝없는 백사장
임자도는 12km의 긴 백사장이 자랑입니다.
- 대광해수욕장에서의 여유로운 산책
- 임자도 대파 농장 방문
- 해질녘 해안도로 드라이브`,
        category: 'travel',
        tags: JSON.stringify(['섬여행', '증도', '선도', '임자도', '힐링여행']),
        featured_image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=500&fit=crop',
        views: 342,
        likes: 28
      },
      {
        title: '신안에서 꼭 먹어봐야 할 로컬 맛집 BEST 5',
        slug: 'sinan-local-restaurant-guide',
        excerpt: '신안 현지인이 추천하는 진짜 맛집들. 짱뚱어탕부터 민어회까지, 신안의 해산물 별미를 소개합니다.',
        content_md: `# 신안 로컬 맛집 BEST 5

## 1. 증도항 할매횟집 ⭐⭐⭐⭐⭐
- **메뉴**: 민어회, 광어회
- **가격**: 소자 35,000원
- **특징**: 바로 잡은 싱싱한 생선, 푸짐한 양

> 민어회가 정말 쫄깃하고 맛있었어요. 밑반찬도 너무 푸짐합니다!

## 2. 지도읍 짱뚱어탕 전문점
짱뚱어는 신안의 특산물입니다. 처음 먹어보는 분들에게는 조금 생소할 수 있지만, 한 번 맛보면 계속 생각나는 맛이에요.`,
        category: 'local',
        tags: JSON.stringify(['맛집', '신안맛집', '해산물', '짱뚱어']),
        featured_image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=500&fit=crop',
        views: 521,
        likes: 45
      },
      {
        title: '태평염전에서의 특별한 하루 - 천일염 만들기 체험',
        slug: 'taepyeong-salt-field-experience',
        excerpt: '증도 태평염전에서 직접 천일염을 만들어보는 특별한 체험. 소금이 만들어지는 과정을 직접 보고 느낄 수 있었습니다.',
        content_md: `# 태평염전 천일염 체험기

## 체험 소개
증도의 **태평염전**은 국내 최대 규모의 단일 염전입니다.

## 체험 과정
### 1단계: 염전 투어
소금이 만들어지는 과정을 배웁니다.

### 2단계: 소금 긁기
나무 판을 이용해 결정지의 소금을 직접 긁어냅니다.

> 생각보다 힘든 작업이었어요. 염부님들의 노고를 느낄 수 있었습니다.`,
        category: 'culture',
        tags: JSON.stringify(['체험', '증도', '염전', '천일염']),
        featured_image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=800&h=500&fit=crop',
        views: 189,
        likes: 22
      },
      {
        title: '신안 여행 준비 완벽 가이드 - 교통, 숙소, 여행 팁 총정리',
        slug: 'sinan-travel-complete-guide',
        excerpt: '신안 여행을 계획 중이신가요? 교통편부터 숙소, 알아두면 유용한 여행 팁까지 완벽하게 정리해드립니다.',
        content_md: `# 신안 여행 완벽 가이드

## 🚗 교통편
### 1. 자차 이용
가장 편리한 방법입니다.
- **서울 → 목포**: 약 4시간
- 목포에서 각 섬으로 가는 다리 이용

### 2. 대중교통
- **KTX**: 용산역 → 목포역 (약 3시간)
- 목포에서 렌터카 이용 권장

## 📅 여행 시기
### 봄 (4~5월) ⭐⭐⭐⭐⭐
- 날씨 쾌적
- 보리밭 풍경 (선도)

### 가을 (9~10월) ⭐⭐⭐⭐⭐
- 날씨 좋음
- 해산물 제철
- 관광객 적음 (추천!)`,
        category: 'tips',
        tags: JSON.stringify(['여행팁', '여행가이드', '신안여행']),
        featured_image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=500&fit=crop',
        views: 678,
        likes: 67
      }
    ];

    for (const blog of blogs) {
      try {
        await conn.execute(
          `INSERT INTO blog_posts (
            author_id, title, slug, excerpt, content_md,
            category, tags, featured_image,
            is_published, views, likes, comments_count,
            published_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [1, blog.title, blog.slug, blog.excerpt, blog.content_md, blog.category, blog.tags, blog.featured_image, 1, blog.views, blog.likes, 0]
        );
        console.log(`✅ Inserted: ${blog.title}`);
      } catch (error: any) {
        if (error.message?.includes('Duplicate entry')) {
          console.log(`⏭️  Skipped (already exists): ${blog.title}`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n🎉 Blog data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - 4 blog posts inserted');
    console.log('   - Categories: travel, local, culture, tips');
    console.log('   - Ready to view at /community-blog\n');

  } catch (error) {
    console.error('❌ Error seeding blog data:', error);
    process.exit(1);
  }
}

seedBlogData();
