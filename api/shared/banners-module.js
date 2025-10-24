/**
 * 홈페이지 배너 관리 API
 *
 * 기능:
 * - 배너 목록 조회 (활성화된 배너만)
 * - 관리자: 전체 배너 조회
 * - 관리자: 배너 생성/수정/삭제
 */

/**
 * 활성화된 배너 목록 조회 (공개용)
 */
export async function getActiveBanners() {
  try {
    const { db } = await import('../../utils/database.js');
    const banners = await db.query(`
      SELECT * FROM home_banners
      WHERE is_active = 1
      ORDER BY display_order ASC
    `);
    return { success: true, data: banners || [] };
  } catch (error) {
    console.error('getActiveBanners error:', error);
    // 테이블이 없으면 빈 배열 반환
    return { success: true, data: [] };
  }
}

/**
 * 전체 배너 목록 조회 (관리자용)
 */
export async function getAllBanners() {
  try {
    const { db } = await import('../../utils/database.js');
    const banners = await db.query(`
      SELECT * FROM home_banners
      ORDER BY display_order ASC, created_at DESC
    `);
    return { success: true, data: banners || [] };
  } catch (error) {
    console.error('getAllBanners error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 배너 단일 조회
 */
export async function getBannerById(id) {
  try {
    const { db } = await import('../../utils/database.js');
    const banners = await db.query(`
      SELECT * FROM home_banners WHERE id = ?
    `, [id]);
    return { success: true, data: banners && banners.length > 0 ? banners[0] : null };
  } catch (error) {
    console.error('getBannerById error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 배너 생성
 */
export async function createBanner(data) {
  try {
    const { db } = await import('../../utils/database.js');
    const result = await db.execute(`
      INSERT INTO home_banners
      (image_url, title, subtitle, link_url, display_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      data.image_url,
      data.title || null,
      data.subtitle || null,
      data.link_url || null,
      data.display_order || 0,
      data.is_active !== undefined ? data.is_active : true
    ]);

    return { success: true, data: { id: result.insertId } };
  } catch (error) {
    console.error('createBanner error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 배너 수정
 */
export async function updateBanner(id, data) {
  try {
    const { db } = await import('../../utils/database.js');
    await db.execute(`
      UPDATE home_banners
      SET image_url = ?,
          title = ?,
          subtitle = ?,
          link_url = ?,
          display_order = ?,
          is_active = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [
      data.image_url,
      data.title || null,
      data.subtitle || null,
      data.link_url || null,
      data.display_order || 0,
      data.is_active !== undefined ? data.is_active : true,
      id
    ]);

    return { success: true };
  } catch (error) {
    console.error('updateBanner error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 배너 삭제
 */
export async function deleteBanner(id) {
  try {
    const { db } = await import('../../utils/database.js');
    await db.execute('DELETE FROM home_banners WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('deleteBanner error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 배너 순서 변경
 */
export async function reorderBanners(bannerIds) {
  try {
    const { db } = await import('../../utils/database.js');
    // 배너 순서를 배열 인덱스 기반으로 업데이트
    for (let i = 0; i < bannerIds.length; i++) {
      await db.execute(`
        UPDATE home_banners
        SET display_order = ?, updated_at = NOW()
        WHERE id = ?
      `, [i, bannerIds[i]]);
    }
    return { success: true };
  } catch (error) {
    console.error('reorderBanners error:', error);
    return { success: false, error: error.message };
  }
}
