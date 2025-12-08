export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ImageMetadata {
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
  pathname: string;
}

class ImageUploadService {
  private validateImage(file: File): { valid: boolean; error?: string } {
    // 파일 타입 검증
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: '지원하지 않는 파일 형식입니다. (JPG, PNG, WebP, GIF만 가능)'
      };
    }

    // 파일 크기 검증 (10MB 제한)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: '파일 크기가 너무 큽니다. (최대 10MB)'
      };
    }

    return { valid: true };
  }

  /**
   * 단일 이미지 업로드 (서버 API 사용)
   */
  async uploadImage(
    file: File,
    category: string = 'listings',
    metadata?: Record<string, any>
  ): Promise<UploadResult> {
    try {
      // 파일 검증
      const validation = this.validateImage(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // FormData로 서버 API 호출
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.url) {
        return {
          success: true,
          url: result.url
        };
      } else {
        return {
          success: false,
          error: result.message || '이미지 업로드에 실패했습니다.'
        };
      }

    } catch (error) {
      console.error('Image upload failed:', error);
      return {
        success: false,
        error: '이미지 업로드에 실패했습니다.'
      };
    }
  }

  /**
   * 여러 이미지 업로드
   */
  async uploadMultipleImages(
    files: File[],
    category: string = 'listings'
  ): Promise<{ success: boolean; urls: string[]; errors: string[] }> {
    const urls: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const result = await this.uploadImage(file, category);

      if (result.success && result.url) {
        urls.push(result.url);
      } else {
        errors.push(result.error || `${file.name} 업로드 실패`);
      }
    }

    return {
      success: urls.length > 0,
      urls,
      errors
    };
  }

  /**
   * 이미지 삭제 (클라이언트에서는 실제 삭제 불가, UI에서만 제거)
   * 실제 Blob 삭제는 서버 측에서 관리자가 처리해야 함
   */
  async deleteImage(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 클라이언트에서는 실제 Blob 삭제가 불가능
      // UI에서 이미지 참조만 제거하고 성공으로 처리
      console.log('Image reference removed (actual blob deletion requires server action):', url);
      return { success: true };
    } catch (error) {
      console.error('Image deletion failed:', error);
      return {
        success: false,
        error: '이미지 삭제에 실패했습니다.'
      };
    }
  }

  /**
   * 카테고리별 이미지 목록 조회 (서버 API 필요)
   */
  async listImages(category?: string): Promise<ImageMetadata[]> {
    // 클라이언트에서 직접 Blob 목록 조회 불가
    // 필요시 서버 API 구현 필요
    console.warn('listImages requires server-side implementation');
    return [];
  }

  /**
   * 이미지 URL에서 썸네일 URL 생성 (이미지 최적화)
   */
  generateThumbnailUrl(originalUrl: string, width: number = 400, height: number = 300): string {
    // Vercel의 이미지 최적화 기능 활용
    const url = new URL(originalUrl);
    url.searchParams.set('w', width.toString());
    url.searchParams.set('h', height.toString());
    url.searchParams.set('q', '80'); // 품질 80%
    url.searchParams.set('f', 'webp'); // WebP 형식으로 변환

    return url.toString();
  }

  /**
   * 이미지 크기 조정 URL 생성
   */
  generateResizedUrl(
    originalUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'jpg' | 'png';
    } = {}
  ): string {
    const url = new URL(originalUrl);

    if (options.width) url.searchParams.set('w', options.width.toString());
    if (options.height) url.searchParams.set('h', options.height.toString());
    if (options.quality) url.searchParams.set('q', options.quality.toString());
    if (options.format) url.searchParams.set('f', options.format);

    return url.toString();
  }
}

// 싱글톤 인스턴스 생성
export const imageUploadService = new ImageUploadService();

// React 컴포넌트에서 사용할 수 있는 훅
export function useImageUpload() {
  const uploadImage = async (file: File, category?: string) => {
    return await imageUploadService.uploadImage(file, category);
  };

  const uploadMultipleImages = async (files: File[], category?: string) => {
    return await imageUploadService.uploadMultipleImages(files, category);
  };

  const deleteImage = async (url: string) => {
    return await imageUploadService.deleteImage(url);
  };

  return {
    uploadImage,
    uploadMultipleImages,
    deleteImage,
    generateThumbnailUrl: imageUploadService.generateThumbnailUrl.bind(imageUploadService),
    generateResizedUrl: imageUploadService.generateResizedUrl.bind(imageUploadService)
  };
}

export default imageUploadService;