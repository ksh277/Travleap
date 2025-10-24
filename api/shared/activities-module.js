/**
 * 액티비티 관리 API
 *
 * 기능:
 * - 액티비티 목록 조회 (활성화된 것만)
 * - 관리자: 전체 액티비티 조회
 * - 관리자: 액티비티 생성/수정/삭제
 */

/**
 * 활성화된 액티비티 목록 조회 (공개용)
 */
export async function getActiveActivities() {
  try {
    const { db } = await import('../../utils/database.js');
    const activities = await db.query(`
      SELECT * FROM activities
      WHERE is_active = 1
      ORDER BY display_order ASC
    `);
    return { success: true, data: activities || [] };
  } catch (error) {
    console.error('getActiveActivities error:', error);
    // 테이블이 없으면 빈 배열 반환
    return { success: true, data: [] };
  }
}

/**
 * 전체 액티비티 목록 조회 (관리자용)
 */
export async function getAllActivities() {
  try {
    const { db } = await import('../../utils/database.js');
    const activities = await db.query(`
      SELECT * FROM activities
      ORDER BY display_order ASC, created_at DESC
    `);
    return { success: true, data: activities || [] };
  } catch (error) {
    console.error('getAllActivities error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 액티비티 단일 조회
 */
export async function getActivityById(id) {
  try {
    const { db } = await import('../../utils/database.js');
    const activities = await db.query(`
      SELECT * FROM activities WHERE id = ?
    `, [id]);
    return { success: true, data: activities && activities.length > 0 ? activities[0] : null };
  } catch (error) {
    console.error('getActivityById error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 액티비티 생성
 */
export async function createActivity(data) {
  try {
    const { db } = await import('../../utils/database.js');
    const result = await db.execute(`
      INSERT INTO activities
      (title, description, image_url, category, price, duration, location, display_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      data.title,
      data.description || null,
      data.image_url || null,
      data.category || null,
      data.price || 0,
      data.duration || null,
      data.location || null,
      data.display_order || 0,
      data.is_active !== undefined ? data.is_active : true
    ]);

    return { success: true, data: { id: result.insertId } };
  } catch (error) {
    console.error('createActivity error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 액티비티 수정
 */
export async function updateActivity(id, data) {
  try {
    const { db } = await import('../../utils/database.js');
    await db.execute(`
      UPDATE activities
      SET title = ?,
          description = ?,
          image_url = ?,
          category = ?,
          price = ?,
          duration = ?,
          location = ?,
          display_order = ?,
          is_active = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [
      data.title,
      data.description || null,
      data.image_url || null,
      data.category || null,
      data.price || 0,
      data.duration || null,
      data.location || null,
      data.display_order || 0,
      data.is_active !== undefined ? data.is_active : true,
      id
    ]);

    return { success: true };
  } catch (error) {
    console.error('updateActivity error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 액티비티 삭제
 */
export async function deleteActivity(id) {
  try {
    const { db } = await import('../../utils/database.js');
    await db.execute('DELETE FROM activities WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('deleteActivity error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 액티비티 순서 변경
 */
export async function reorderActivities(activityIds) {
  try {
    const { db } = await import('../../utils/database.js');
    // 액티비티 순서를 배열 인덱스 기반으로 업데이트
    for (let i = 0; i < activityIds.length; i++) {
      await db.execute(`
        UPDATE activities
        SET display_order = ?, updated_at = NOW()
        WHERE id = ?
      `, [i, activityIds[i]]);
    }
    return { success: true };
  } catch (error) {
    console.error('reorderActivities error:', error);
    return { success: false, error: error.message };
  }
}
