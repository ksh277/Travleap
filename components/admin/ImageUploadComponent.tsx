import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Upload, X, Image, Loader2, AlertCircle, Check } from 'lucide-react';

interface ImageUploadProps {
  category?: string;
  maxFiles?: number;
  onImagesUploaded?: (urls: string[]) => void;
  existingImages?: string[];
  multiple?: boolean;
}

export function ImageUploadComponent({
  category = 'listings',
  maxFiles = 5,
  onImagesUploaded,
  existingImages = [],
  multiple = true
}: ImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<string[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // existingImages가 변경되면 상태 동기화
  useEffect(() => {
    setUploadedImages(existingImages);
  }, [existingImages]);

  // API를 통한 이미지 업로드 (인증 불필요)
  const uploadImageViaAPI = async (file: File, cat: string): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', cat);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success && data.url) {
        return { success: true, url: data.url };
      } else {
        return { success: false, error: data.message || '업로드에 실패했습니다.' };
      }
    } catch (error) {
      console.error('Image upload error:', error);
      return { success: false, error: '업로드 중 오류가 발생했습니다.' };
    }
  };

  // 썸네일 URL 생성
  const generateThumbnailUrl = (originalUrl: string, width: number = 400, height: number = 300): string => {
    try {
      const url = new URL(originalUrl);
      url.searchParams.set('w', width.toString());
      url.searchParams.set('h', height.toString());
      url.searchParams.set('q', '80');
      return url.toString();
    } catch {
      return originalUrl;
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // 파일 수 제한 확인
    if (uploadedImages.length + files.length > maxFiles) {
      setErrors([`최대 ${maxFiles}개의 이미지만 업로드할 수 있습니다.`]);
      return;
    }

    setUploading(true);
    setErrors([]);

    try {
      const uploadErrors: string[] = [];
      const newUrls: string[] = [];

      // 각 파일을 순차적으로 업로드
      for (const file of files) {
        const result = await uploadImageViaAPI(file, category);
        if (result.success && result.url) {
          newUrls.push(result.url);
        } else {
          uploadErrors.push(`이미지 업로드 실패: ${file.name} - ${result.error}`);
        }
      }

      if (newUrls.length > 0) {
        const newImages = [...uploadedImages, ...newUrls];
        setUploadedImages(newImages);
        onImagesUploaded?.(newImages);
      }

      if (uploadErrors.length > 0) {
        setErrors(uploadErrors);
      }
    } catch (error) {
      setErrors(['업로드 중 오류가 발생했습니다.']);
    } finally {
      setUploading(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (_imageUrl: string, index: number) => {
    // 로컬 상태에서 제거 (실제 Blob 삭제는 서버에서 처리)
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    onImagesUploaded?.(newImages);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length === 0) {
      setErrors(['이미지 파일만 업로드할 수 있습니다.']);
      return;
    }

    // 파일 input의 files 설정을 시뮬레이션
    const dt = new DataTransfer();
    files.forEach(file => dt.items.add(file));

    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
      await handleFileChange({ target: fileInputRef.current } as any);
    }
  };

  return (
    <div className="space-y-4">
      {/* 업로드 영역 */}
      <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
        <CardContent className="p-6">
          <div
            className="text-center cursor-pointer"
            onClick={handleFileSelect}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-4">
              {uploading ? (
                <Loader2 className="h-12 w-12 text-gray-400 animate-spin" />
              ) : (
                <Upload className="h-12 w-12 text-gray-400" />
              )}

              <div>
                <p className="text-lg font-medium text-gray-700">
                  {uploading ? '업로드 중...' : '이미지를 드래그하거나 클릭하여 업로드'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  JPG, PNG, WebP, GIF 파일 지원 (최대 10MB)
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {multiple ? `최대 ${maxFiles}개 파일` : '1개 파일만'} 업로드 가능
                </p>
              </div>

              <Button
                variant="outline"
                disabled={uploading || uploadedImages.length >= maxFiles}
                className="mt-2"
              >
                <Image className="h-4 w-4 mr-2" />
                파일 선택
              </Button>
            </div>
          </div>

          {/* 숨겨진 파일 입력 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            onChange={handleFileChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* 에러 메시지 */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* 업로드된 이미지 미리보기 */}
      {uploadedImages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            업로드된 이미지 ({uploadedImages.length}/{maxFiles})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedImages.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={generateThumbnailUrl(imageUrl, 200, 200)}
                    alt={`업로드된 이미지 ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />

                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => handleRemoveImage(imageUrl, index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>

                  {/* 성공 표시 */}
                  <div className="absolute bottom-2 left-2 bg-green-500 text-white rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                </div>

                {/* 이미지 정보 */}
                <div className="mt-2 text-xs text-gray-500 text-center">
                  이미지 {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 업로드 가이드 */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• 이미지는 자동으로 최적화되어 저장됩니다.</p>
        <p>• 첫 번째 이미지가 대표 이미지로 사용됩니다.</p>
        <p>• 업로드된 이미지는 즉시 적용됩니다.</p>
      </div>
    </div>
  );
}