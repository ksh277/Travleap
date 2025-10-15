import { db } from '../utils/database';

const sampleBlogs = [
  {
    title: '2025 신안 튤립 축제',
    slug: '2025-shinan-tulip-festival',
    content_md: '신안 튤립 축제가 4월 한 달간 진행됩니다. 아름다운 튤립 정원을 만나보세요!',
    excerpt: '4월 한 달간 신안에서 열리는 튤립 축제',
    featured_image: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=800',
    category: '행사',
    tags: JSON.stringify(['튤립', '축제', '봄']),
    author_id: 1,
    is_published: true,
    is_featured: true,
    published_at: new Date('2025-03-01').toISOString(),
    event_start_date: '2025-04-01',
    event_end_date: '2025-04-30'
  },
  {
    title: '여름 해수욕장 개장 안내',
    slug: 'summer-beach-opening',
    content_md: '신안의 아름다운 해수욕장들이 7월부터 8월까지 개장합니다!',
    excerpt: '여름 시즌 해수욕장 개장 안내',
    featured_image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    category: '여행 팁',
    tags: JSON.stringify(['해수욕장', '여름', '바다']),
    author_id: 1,
    is_published: true,
    is_featured: false,
    published_at: new Date('2025-06-15').toISOString(),
    event_start_date: '2025-07-01',
    event_end_date: '2025-08-31'
  }
];

async function seedBlogs() {
  try {
    console.log('🌱 샘플 블로그 데이터 추가 중...');

    for (const blog of sampleBlogs) {
      const result = await db.insert('blog_posts', blog);
      console.log(`✅ 블로그 추가됨: ${blog.title} (ID: ${result.id})`);
    }

    console.log('✨ 샘플 블로그 데이터 추가 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

seedBlogs();
