import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, Link, Check } from 'lucide-react';
import { useImageUpload } from '../../utils/imageUpload';
import { toast } from 'sonner';

interface BannerImageUploadProps {
  onUploadComplete: (url: string) => void;
  existingImageUrl?: string;
  category?: string;
}

export function BannerImageUpload({
  onUploadComplete,
  existingImageUrl = '',
  category = 'banners'
}: BannerImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(existingImageUrl);
  const [urlInput, setUrlInput] = useState(existingImageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadImage, deleteImage, generateThumbnailUrl } = useImageUpload();

  // 파일 선택
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // 파일 업로드
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const result = await uploadImage(file, category);

      if (result.success && result.url) {
        setImageUrl(result.url);
        setUrlInput(result.url);
        onUploadComplete(result.url);
        toast.success('이미지가 업로드되었습니다.');
      } else {
        setError(result.error || '업로드에 실패했습니다.');
        toast.error(result.error || '업로드에 실패했습니다.');
      }
    } catch (error) {
      const errorMsg = '업로드 중 오류가 발생했습니다.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setUploading(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // URL 직접 입력
  const handleUrlSubmit = () => {
    if (!urlInput || !urlInput.trim()) {
      setError('URL을 입력해주세요.');
      return;
    }

    // URL 형식 검증
    try {
      new URL(urlInput);
      setImageUrl(urlInput);
      onUploadComplete(urlInput);
      setError('');
      toast.success('이미지 URL이 설정되었습니다.');
    } catch (e) {
      setError('올바른 URL 형식이 아닙니다.');
      toast.error('올바른 URL 형식이 아닙니다.');
    }
  };

  // 이미지 제거
  const handleRemoveImage = async () => {
    // Vercel Blob 이미지인 경우에만 삭제 시도
    if (imageUrl && imageUrl.includes('vercel')) {
      try {
        await deleteImage(imageUrl);
      } catch (error) {
        console.error('이미지 삭제 실패:', error);
      }
    }

    setImageUrl('');
    setUrlInput('');
    onUploadComplete('');
    toast.success('이미지가 제거되었습니다.');
  };

  // 드래그 앤 드롭
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
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 첫 번째 파일만 사용
    const file = files[0];
    setUploading(true);
    setError('');

    try {
      const result = await uploadImage(file, category);

      if (result.success && result.url) {
        setImageUrl(result.url);
        setUrlInput(result.url);
        onUploadComplete(result.url);
        toast.success('이미지가 업로드되었습니다.');
      } else {
        setError(result.error || '업로드에 실패했습니다.');
        toast.error(result.error || '업로드에 실패했습니다.');
      }
    } catch (error) {
      const errorMsg = '업로드 중 오류가 발생했습니다.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            파일 업로드
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link className="h-4 w-4 mr-2" />
            URL 입력
          </TabsTrigger>
        </TabsList>

        {/* 파일 업로드 탭 */}
        <TabsContent value="upload" className="space-y-4">
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
                      배너에 최적화된 가로형 이미지를 권장합니다
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    disabled={uploading}
                    className="mt-2"
                    type="button"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    파일 선택
                  </Button>
                </div>
              </div>

              {/* 숨겨진 파일 입력 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* URL 입력 탭 */}
        <TabsContent value="url" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image-url">이미지 URL</Label>
            <div className="flex gap-2">
              <Input
                id="image-url"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUrlSubmit();
                  }
                }}
              />
              <Button
                onClick={handleUrlSubmit}
                type="button"
                disabled={!urlInput || !urlInput.trim()}
              >
                적용
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              외부 이미지 URL을 입력하거나, Unsplash, Pexels 등의 무료 이미지 사이트에서 URL을 복사하세요
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* 에러 메시지 */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* 현재 이미지 미리보기 */}
      {imageUrl && (
        <div>
          <Label className="mb-2 block">현재 배너 이미지</Label>
          <div className="relative group rounded-lg overflow-hidden border border-gray-200">
            <img
              src={imageUrl}
              alt="배너 미리보기"
              className="w-full h-48 object-cover"
            />

            {/* 삭제 버튼 */}
            <button
              onClick={handleRemoveImage}
              type="button"
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>

            {/* 성공 표시 */}
            <div className="absolute bottom-2 left-2 bg-green-500 text-white rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1">
              <Check className="h-3 w-3" />
              이미지 설정됨
            </div>
          </div>

          {/* 이미지 URL 정보 */}
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 break-all">
            {imageUrl}
          </div>
        </div>
      )}

      {/* 업로드 가이드 */}
      <div className="text-xs text-gray-500 space-y-1 bg-blue-50 p-3 rounded-md">
        <p className="font-medium text-blue-900 mb-1">💡 권장사항</p>
        <p>• 배너 이미지는 가로 1920px x 세로 600px 이상을 권장합니다</p>
        <p>• 파일 업로드 시 Vercel Blob에 자동 저장됩니다</p>
        <p>• URL 입력 시 외부 이미지 링크를 직접 사용할 수 있습니다</p>
        <p>• 모바일에서도 잘 보이도록 중앙 정렬된 이미지를 사용하세요</p>
      </div>
    </div>
  );
}
