/**
 * 홈페이지 배너 관리 API
 *
 * 기능:
 * - 배너 목록 조회 (활성화된 배너만)
 * - 관리자: 전체 배너 조회
 * - 관리자: 배너 생성/수정/삭제
 */

import { db } from '../utils/database';

export interface Banner {
  id?: number;
  image_url: string;
  title?: string;
  link_url?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BannerResponse {
  success: boolean;
  banners?: Banner[];
  banner?: Banner;
  message?: string;
}

/**
 * 활성화된 배너 목록 조회 (공개용)
 */
export async function getActiveBanners(): Promise<BannerResponse> {
  try {
    const banners = await db.query(`
      SELECT id, image_url, title, link_url, display_order
      FROM home_banners
      WHERE is_active = TRUE
      ORDER BY display_order ASC, created_at DESC
    `);

    return { success: true, banners: banners || [] };
  } catch (error) {
    console.error('❌ 배너 목록 조회 실패:', error);
    return { success: false, message: '배너를 불러오는데 실패했습니다.' };
  }
}

/**
 * 전체 배너 목록 조회 (관리자용)
 */
export async function getAllBanners(): Promise<BannerResponse> {
  try {
    const banners = await db.query(`
      SELECT *
      FROM home_banners
      ORDER BY display_order ASC, created_at DESC
    `);

    return { success: true, banners: banners || [] };
  } catch (error) {
    console.error('❌ 전체 배너 목록 조회 실패:', error);
    return { success: false, message: '배너를 불러오는데 실패했습니다.' };
  }
}

/**
 * 배너 단일 조회
 */
export async function getBannerById(id: number): Promise<BannerResponse> {
  try {
    const banners = await db.query(`
      SELECT * FROM home_banners WHERE id = ?
    `, [id]);

    if (!banners || banners.length === 0) {
      return { success: false, message: '배너를 찾을 수 없습니다.' };
    }

    return { success: true, banner: banners[0] };
  } catch (error) {
    console.error('❌ 배너 조회 실패:', error);
    return { success: false, message: '배너 조회에 실패했습니다.' };
  }
}

/**
 * 배너 생성
 */
export async function createBanner(banner: Banner): Promise<BannerResponse> {
  try {
    const result = await db.execute(`
      INSERT INTO home_banners
      (image_url, title, link_url, display_order, is_active)
      VALUES (?, ?, ?, ?, ?)
    `, [
      banner.image_url,
      banner.title || null,
      banner.link_url || null,
      banner.display_order,
      banner.is_active !== false
    ]);

    console.log(`✅ 배너 생성 완료: ID ${result.insertId}`);
    return {
      success: true,
      banner: { ...banner, id: result.insertId },
      message: '배너가 생성되었습니다.'
    };
  } catch (error) {
    console.error('❌ 배너 생성 실패:', error);
    return { success: false, message: '배너 생성에 실패했습니다.' };
  }
}

/**
 * 배너 수정
 */
export async function updateBanner(id: number, banner: Partial<Banner>): Promise<BannerResponse> {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (banner.image_url !== undefined) {
      updates.push('image_url = ?');
      values.push(banner.image_url);
    }
    if (banner.title !== undefined) {
      updates.push('title = ?');
      values.push(banner.title);
    }
    if (banner.link_url !== undefined) {
      updates.push('link_url = ?');
      values.push(banner.link_url);
    }
    if (banner.display_order !== undefined) {
      updates.push('display_order = ?');
      values.push(banner.display_order);
    }
    if (banner.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(banner.is_active);
    }

    if (updates.length === 0) {
      return { success: false, message: '수정할 내용이 없습니다.' };
    }

    values.push(id);
    await db.execute(`
      UPDATE home_banners
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `, values);

    console.log(`✅ 배너 수정 완료: ID ${id}`);
    return { success: true, message: '배너가 수정되었습니다.' };
  } catch (error) {
    console.error('❌ 배너 수정 실패:', error);
    return { success: false, message: '배너 수정에 실패했습니다.' };
  }
}

/**
 * 배너 삭제
 */
export async function deleteBanner(id: number): Promise<BannerResponse> {
  try {
    await db.execute(`
      DELETE FROM home_banners WHERE id = ?
    `, [id]);

    console.log(`✅ 배너 삭제 완료: ID ${id}`);
    return { success: true, message: '배너가 삭제되었습니다.' };
  } catch (error) {
    console.error('❌ 배너 삭제 실패:', error);
    return { success: false, message: '배너 삭제에 실패했습니다.' };
  }
}

/**
 * 배너 순서 변경
 */
export async function reorderBanners(bannerOrders: { id: number; display_order: number }[]): Promise<BannerResponse> {
  try {
    for (const item of bannerOrders) {
      await db.execute(`
        UPDATE home_banners
        SET display_order = ?, updated_at = NOW()
        WHERE id = ?
      `, [item.display_order, item.id]);
    }

    console.log(`✅ 배너 순서 변경 완료: ${bannerOrders.length}개`);
    return { success: true, message: '배너 순서가 변경되었습니다.' };
  } catch (error) {
    console.error('❌ 배너 순서 변경 실패:', error);
    return { success: false, message: '배너 순서 변경에 실패했습니다.' };
  }
}

