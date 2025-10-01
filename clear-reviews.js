const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

try {
  // 모든 리뷰 삭제
  const result = db.prepare('DELETE FROM reviews').run();
  console.log(`✅ ${result.changes}개의 리뷰가 삭제되었습니다.`);

  // 모든 상품의 평점 초기화
  const updateResult = db.prepare('UPDATE listings SET rating_avg = 0, rating_count = 0').run();
  console.log(`✅ ${updateResult.changes}개의 상품 평점이 초기화되었습니다.`);

  // 확인
  const reviews = db.prepare('SELECT COUNT(*) as count FROM reviews').get();
  console.log(`현재 리뷰 개수: ${reviews.count}`);

} catch (error) {
  console.error('❌ 에러:', error.message);
} finally {
  db.close();
}
