import { put, del, list } from '@vercel/blob';

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
  private readonly BLOB_READ_WRITE_TOKEN = process.env.VITE_BLOB_READ_WRITE_TOKEN;

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

  private generateFilename(originalName: string, category: string = 'general'): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop()?.toLowerCase();

    return `${category}/${timestamp}-${randomString}.${extension}`;
  }

  /**
   * 단일 이미지 업로드
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

      // 파일명 생성
      const filename = this.generateFilename(file.name, category);

      // Vercel Blob에 업로드
      const blob = await put(filename, file, {
        access: 'public',
        addRandomSuffix: false,
        ...(metadata && { metadata })
      });

      return {
        success: true,
        url: blob.url
      };

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
   * 이미지 삭제
   */
  async deleteImage(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      await del(url);
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
   * 카테고리별 이미지 목록 조회
   */
  async listImages(category?: string): Promise<ImageMetadata[]> {
    try {
      const response = await list({
        prefix: category ? `${category}/` : undefined,
        limit: 100
      });

      return response.blobs.map(blob => ({
        url: blob.url,
        filename: blob.pathname.split('/').pop() || '',
        size: blob.size,
        uploadedAt: blob.uploadedAt.toISOString(),
        pathname: blob.pathname
      }));

    } catch (error) {
      console.error('Failed to list images:', error);
      return [];
    }
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