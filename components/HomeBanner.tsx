import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Banner {
  id: number;
  image_url: string;
  title?: string;
  link_url?: string;
  display_order: number;
  media_type?: 'image' | 'video';
  video_url?: string;
}

interface HomeBannerProps {
  autoSlideInterval?: number; // milliseconds, default 5000 (5초)
}

export function HomeBanner({ autoSlideInterval = 5000 }: HomeBannerProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // 배너 데이터 로드
  useEffect(() => {
    const loadBanners = async () => {
      try {
        const response = await fetch('/api/banners');
        const data = await response.json();

        if (data.success && data.banners && data.banners.length > 0) {
          setBanners(data.banners);
        }
      } catch (error) {
        console.error('배너 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBanners();
  }, []);

  // 다음 슬라이드로 이동
  const nextSlide = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  // 이전 슬라이드로 이동
  const prevSlide = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // 특정 슬라이드로 이동
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // 자동 슬라이드
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      nextSlide();
    }, autoSlideInterval);

    return () => clearInterval(interval);
  }, [banners.length, isPaused, autoSlideInterval, nextSlide]);

  // 배너 클릭 핸들러
  const handleBannerClick = (banner: Banner) => {
    if (banner.link_url) {
      if (banner.link_url.startsWith('http')) {
        window.open(banner.link_url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = banner.link_url;
      }
    }
  };

  // 로딩 중이거나 배너가 없으면 아무것도 렌더링하지 않음
  if (isLoading || banners.length === 0) {
    return null;
  }

  return (
    <div
      className="relative w-full overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 배너 이미지/동영상들 */}
      <div className="relative w-full">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`${index === currentIndex ? 'relative opacity-100 z-10' : 'absolute inset-0 opacity-0 z-0'} transition-opacity duration-700 ease-in-out`}
            onClick={() => handleBannerClick(banner)}
            style={{ cursor: banner.link_url ? 'pointer' : 'default' }}
          >
            {/* 동영상 배너 */}
            {banner.media_type === 'video' && banner.video_url ? (
              <video
                src={banner.video_url}
                className="w-full h-auto"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              /* 이미지 배너 (기본) - 원본 화질 유지 */
              <img
                src={banner.image_url}
                alt={banner.title || `배너 ${index + 1}`}
                className="w-full h-auto"
                style={{ imageRendering: 'auto' }}
                loading="eager"
                decoding="sync"
              />
            )}

            {/* 배너 제목 (있는 경우) */}
            {banner.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                <h3 className="text-white text-xl md:text-2xl font-semibold drop-shadow-lg">
                  {banner.title}
                </h3>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 배너가 2개 이상일 때만 컨트롤 표시 */}
      {banners.length > 1 && (
        <>
          {/* 이전/다음 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-800 rounded-full p-2 md:p-3 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="이전 배너"
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-800 rounded-full p-2 md:p-3 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="다음 배너"
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
          </button>

          {/* 인디케이터 점들 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(index);
                }}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex
                    ? 'w-8 h-2 bg-white'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`배너 ${index + 1}로 이동`}
              />
            ))}
          </div>

          {/* 슬라이드 카운터 */}
          <div className="absolute top-4 right-4 z-20 bg-black/50 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
            {currentIndex + 1} / {banners.length}
          </div>
        </>
      )}
    </div>
  );
}
