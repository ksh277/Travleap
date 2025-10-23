/**
 * 페이지별 배너 이미지를 가져오는 Hook
 *
 * 사용법:
 * const bannerImage = usePageBanner('login');
 * const bannerImage = usePageBanner('signup');
 * const bannerImage = usePageBanner('about');
 */

import { useEffect, useState } from 'react';

export function usePageBanner(page: string): string {
  const [bannerImage, setBannerImage] = useState<string>('');

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const response = await fetch(`/api/banners?page=${page}`);
        const data = await response.json();

        if (data.success && data.data && data.data.image_url) {
          setBannerImage(data.data.image_url);
        } else {
          // 기본 이미지 설정
          setBannerImage(getDefaultBanner(page));
        }
      } catch (error) {
        console.error(`배너 로드 실패 (${page}):`, error);
        setBannerImage(getDefaultBanner(page));
      }
    };

    fetchBanner();
  }, [page]);

  return bannerImage;
}

// 페이지별 기본 이미지
function getDefaultBanner(page: string): string {
  const defaults: Record<string, string> = {
    login: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1366&h=300&fit=crop',
    signup: 'https://images.unsplash.com/photo-1527004013197-933c4bb611b3?w=1366&h=300&fit=crop',
    home_background: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    about: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop',
    partner: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=300&fit=crop',
    partner_apply: 'https://images.unsplash.com/photo-1730720426620-9b96001122f0?w=1080&h=300&fit=crop',
    contact: 'https://images.unsplash.com/photo-1423666639041-f56000c27a9a?w=1200&h=300&fit=crop',
    category: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=300&fit=crop',
    category_detail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=300&fit=crop'
  };

  return defaults[page] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=300&fit=crop';
}
