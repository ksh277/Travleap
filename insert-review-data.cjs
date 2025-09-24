// DB에 리뷰 데이터 8개 추가 (카테고리별 5점 리뷰)
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'database.db');
const db = new Database(dbPath);

const reviewsData = [
  {
    listing_id: 1,
    user_id: 1,
    rating: 5,
    title: '최고의 투어 체험!',
    content: '신안 퍼플섬 투어가 정말 최고였어요! 보라색으로 물든 마을이 너무 아름다웠고, 가이드님의 설명도 흥미로웠습니다. 사진도 예쁘게 나오고 기념품도 좋았어요.',
    images: JSON.stringify(['https://images.unsplash.com/photo-1494790108755-2616b612b641?w=100&h=100&fit=crop&crop=face']),
    visit_date: '2024-03-15',
    is_verified: true,
    helpful_count: 8,
    is_visible: true,
    response_from_partner: null
  },
  {
    listing_id: 4,
    user_id: 2,
    rating: 5,
    title: '완벽한 숙박!',
    content: '임자도 대광해수욕장 펜션에서 머물렀는데 정말 완벽했어요. 오션뷰가 환상적이고 시설도 깔끔했습니다. 아침에 일어나서 바로 해변을 볼 수 있어서 힐링되었어요.',
    images: JSON.stringify(['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face']),
    visit_date: '2024-03-12',
    is_verified: true,
    helpful_count: 12,
    is_visible: true,
    response_from_partner: '감사합니다. 다음에도 좋은 서비스로 모시겠습니다.'
  },
  {
    listing_id: 5,
    user_id: 3,
    rating: 5,
    title: '맛있는 젓갈!',
    content: '신안 전통 젓갈 맛집에서 정말 맛있게 먹었어요. 3대째 이어져 내려온 전통의 맛이 느껴졌습니다. 신선한 해산물과 젓갈이 일품이었어요. 현지 맛을 제대로 느낄 수 있었습니다.',
    images: JSON.stringify(['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face']),
    visit_date: '2024-03-10',
    is_verified: true,
    helpful_count: 15,
    is_visible: true,
    response_from_partner: null
  },
  {
    listing_id: 3,
    user_id: 4,
    rating: 5,
    title: '홍도의 절경!',
    content: '홍도 서해 최고 절경 투어는 정말 볼거리가 많았어요. 33개의 기암괴석이 만든 풍경이 장관이었고, 유람선에서 바라본 풍경은 평생 잊을 수 없을 것 같아요.',
    images: JSON.stringify(['https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face']),
    visit_date: '2024-03-08',
    is_verified: true,
    helpful_count: 10,
    is_visible: true,
    response_from_partner: '홍도의 아름다움을 느껴주셔서 감사합니다!'
  },
  {
    listing_id: 2,
    user_id: 5,
    rating: 5,
    title: '교육적인 체험!',
    content: '증도 천일염 체험이 정말 유익했어요. 아이들과 함께 참여했는데 소금이 만들어지는 과정을 직접 볼 수 있어서 좋은 교육이 되었습니다. 체험 키트도 잘 준비되어 있었어요.',
    images: JSON.stringify(['https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop&crop=face']),
    visit_date: '2024-03-05',
    is_verified: true,
    helpful_count: 6,
    is_visible: true,
    response_from_partner: null
  },
  {
    listing_id: 15,
    user_id: 6,
    rating: 5,
    title: '환상적인 드라이브!',
    content: '암태도 1004섬 드라이브 코스가 정말 환상적이었어요! 천사대교를 달리며 보는 풍경이 너무 아름다웠습니다. 렌터카도 깔끔하고 코스 안내도 잘 되어 있었어요.',
    images: JSON.stringify(['https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face']),
    visit_date: '2024-03-03',
    is_verified: true,
    helpful_count: 9,
    is_visible: true,
    response_from_partner: '좋은 추억 만드셨길 바랍니다!'
  },
  {
    listing_id: 16,
    user_id: 7,
    rating: 5,
    title: '승마 체험 최고!',
    content: '하의도 해변 승마체험이 정말 특별한 경험이었어요. 바다를 바라보며 말을 타는 기분이 환상적이었습니다. 강사님도 친절하시고 안전하게 잘 가르쳐주셨어요.',
    images: JSON.stringify(['https://images.unsplash.com/photo-1494790108755-2616b612b641?w=100&h=100&fit=crop&crop=face']),
    visit_date: '2024-03-01',
    is_verified: true,
    helpful_count: 7,
    is_visible: true,
    response_from_partner: null
  },
  {
    listing_id: 11,
    user_id: 8,
    rating: 5,
    title: '갯벌체험 재미있어요!',
    content: '장산도 갯벌체험에서 바지락도 캐고 갯벌 생태계도 배울 수 있어서 정말 좋았어요. 아이들이 특히 재미있어했고, 직접 캔 바지락을 가져갈 수 있어서 뜻깊었습니다.',
    images: JSON.stringify(['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face']),
    visit_date: '2024-02-28',
    is_verified: true,
    helpful_count: 11,
    is_visible: true,
    response_from_partner: '좋은 체험 하셨다니 다행입니다!'
  }
];

try {
  // 기존 리뷰 데이터 삭제
  console.log('기존 리뷰 데이터 삭제 중...');
  db.prepare('DELETE FROM reviews').run();

  // 새로운 리뷰 데이터 삽입
  console.log('새로운 리뷰 데이터 삽입 중...');
  const insertReview = db.prepare(`
    INSERT INTO reviews (
      listing_id, user_id, rating, title, content, images, visit_date,
      is_verified, helpful_count, is_visible, response_from_partner,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  for (const review of reviewsData) {
    insertReview.run(
      review.listing_id,
      review.user_id,
      review.rating,
      review.title,
      review.content,
      review.images,
      review.visit_date,
      review.is_verified ? 1 : 0,
      review.helpful_count,
      review.is_visible ? 1 : 0,
      review.response_from_partner
    );
  }

  console.log(`${reviewsData.length}개의 리뷰 데이터가 성공적으로 삽입되었습니다.`);

  // 삽입된 데이터 확인
  const count = db.prepare('SELECT COUNT(*) as count FROM reviews').get();
  console.log(`총 리뷰 개수: ${count.count}`);

} catch (error) {
  console.error('리뷰 데이터 삽입 실패:', error);
} finally {
  db.close();
}