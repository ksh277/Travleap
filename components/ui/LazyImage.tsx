import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  threshold?: number;
}

/**
 * LazyImage Component - 성능 최적화를 위한 지연 로딩 이미지 컴포넌트
 *
 * Features:
 * - Intersection Observer API를 사용한 뷰포트 내 이미지만 로드
 * - 로딩 중 플레이스홀더 표시
 * - 이미지 로드 실패 시 fallback 이미지 표시
 * - 메모리 누수 방지를 위한 cleanup
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  fallback = '/placeholder-image.svg',
  threshold = 0.1
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Intersection Observer 설정
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 뷰포트에 들어오면 이미지 로드 시작
            setImageSrc(src);
            if (imgRef.current) {
              observer.unobserve(imgRef.current);
            }
          }
        });
      },
      {
        rootMargin: '50px', // 뷰포트 50px 전에 미리 로드
        threshold
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    // Cleanup
    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, threshold]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    setImageSrc(fallback);
  };

  return (
    <div className="relative">
      {isLoading && !hasError && (
        <div className={`absolute inset-0 bg-gray-200 animate-pulse ${className}`} />
      )}
      <img
        ref={imgRef}
        src={imageSrc || fallback}
        alt={alt}
        className={className}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};

export default LazyImage;
