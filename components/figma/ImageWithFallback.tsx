import React, { useState, useEffect, useRef } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

const PLACEHOLDER_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+'

/**
 * Enhanced ImageWithFallback Component with Lazy Loading
 * - Uses Intersection Observer for advanced lazy loading control
 * - Displays placeholder while image loads
 * - Native lazy loading as fallback
 * - Error handling with fallback image
 */
export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined)
  const imgRef = useRef<HTMLImageElement>(null)

  const { src, alt, style, className, loading = 'lazy', ...rest } = props

  // 🌐 URL 인코딩 헬퍼 (한글 등 특수문자 처리)
  const encodeImageUrl = (url: string): string => {
    try {
      // 이미 인코딩된 URL인지 확인 (data: URL, blob: URL, 완전한 URL 등)
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        return url
      }

      // URL 파싱 시도
      const urlObj = new URL(url)

      // pathname만 인코딩 (쿼리 파라미터와 프로토콜은 유지)
      const encodedPathname = urlObj.pathname
        .split('/')
        .map(segment => encodeURIComponent(decodeURIComponent(segment)))
        .join('/')

      urlObj.pathname = encodedPathname
      return urlObj.toString()
    } catch {
      // URL 파싱 실패 시 (상대 경로 등) 전체 인코딩
      return url
        .split('/')
        .map(segment => {
          // 이미 인코딩된 부분은 유지
          try {
            return encodeURIComponent(decodeURIComponent(segment))
          } catch {
            return encodeURIComponent(segment)
          }
        })
        .join('/')
    }
  }

  useEffect(() => {
    if (!src) return

    // Intersection Observer for advanced lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !imageSrc) {
            // 🔒 URL 인코딩 적용 (한글 파일명 등 처리)
            const encodedSrc = encodeImageUrl(src)
            setImageSrc(encodedSrc)
            if (imgRef.current) {
              observer.unobserve(imgRef.current)
            }
          }
        })
      },
      {
        rootMargin: '100px', // Load 100px before entering viewport
        threshold: 0.01
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current)
      }
    }
  }, [src, imageSrc])

  const handleError = () => {
    setDidError(true)
    setIsLoaded(true)
  }

  const handleLoad = () => {
    setIsLoaded(true)
  }

  if (didError) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
        </div>
      </div>
    )
  }

  return (
    <div className="relative" style={style}>
      {/* Loading placeholder */}
      {!isLoaded && (
        <div
          className={`absolute inset-0 bg-gray-200 animate-pulse ${className ?? ''}`}
          style={style}
        />
      )}
      <img
        ref={imgRef}
        src={imageSrc || PLACEHOLDER_SRC}
        alt={alt}
        className={`${className ?? ''} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        style={{
          ...style,
          imageRendering: '-webkit-optimize-contrast',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden' as const,
          WebkitFontSmoothing: 'antialiased' as const
        }}
        loading={loading}
        decoding="async"
        {...rest}
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  )
}
