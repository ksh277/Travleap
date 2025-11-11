/**
 * 이미지 업로드 컴포넌트
 * Vercel Blob을 사용한 이미지 업로드
 */

import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
  category?: string;
}

export function ImageUploader({
  images,
  onImagesChange,
  maxImages = 5,
  label = "이미지 업로드",
  category = "rentcar"
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast.error(`최대 ${maxImages}개까지 업로드 가능합니다`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 파일 크기 체크 (10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}은(는) 10MB를 초과합니다`);
          continue;
        }

        // 파일을 base64로 변환
        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // JSON으로 base64 이미지 전송
        const token = localStorage.getItem('auth_token');
        console.log('🔐 [ImageUploader] Token exists:', !!token);
        if (token) {
          console.log('🔑 [ImageUploader] Token preview:', token.substring(0, 20) + '...');
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // JWT 인증 토큰 추가
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        } else {
          console.error('❌ [ImageUploader] No auth token found in localStorage!');
        }

        console.log('📤 [ImageUploader] Uploading:', file.name, `(${Math.round(file.size / 1024)}KB)`);
        console.log('🌐 [ImageUploader] Request URL:', '/api/upload-image');
        console.log('📋 [ImageUploader] Headers:', Object.keys(headers));

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            image: base64Image,
            filename: file.name,
            category: category
          })
        });

        console.log('📥 [ImageUploader] Response status:', response.status, response.statusText);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ [ImageUploader] Upload success:', data);
          if (data.success && data.url) {
            uploadedUrls.push(data.url);
          }
        } else {
          const errorData = await response.json().catch(() => ({ message: '업로드 실패' }));
          console.error('❌ [ImageUploader] Upload failed:');
          console.error('  Status:', response.status, response.statusText);
          console.error('  Error Data:', JSON.stringify(errorData, null, 2));
          console.error('  Full response headers:', Array.from(response.headers.entries()));
          toast.error(`${file.name} 업로드 실패: ${errorData.message || errorData.error || '알 수 없는 오류'}`);
        }

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      if (uploadedUrls.length > 0) {
        onImagesChange([...images, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length}개 이미지가 업로드되었습니다`);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('이미지 업로드에 실패했습니다');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
    toast.success('이미지가 제거되었습니다');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // 이미지 파일만 필터링
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast.error('이미지 파일만 업로드 가능합니다');
      return;
    }

    // File input에 파일 설정하고 handleFileSelect 호출
    const dataTransfer = new DataTransfer();
    imageFiles.forEach(file => dataTransfer.items.add(file));

    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
      handleFileSelect({ target: fileInputRef.current } as any);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">{label}</label>

        {/* 드래그 앤 드롭 영역 */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-2" />
              <p className="text-sm text-gray-600">업로드 중... {Math.round(uploadProgress)}%</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-1">
                클릭하거나 이미지를 드래그하여 업로드
              </p>
              <p className="text-xs text-gray-500">
                최대 {maxImages}개, 각 10MB 이하 (JPG, PNG, WebP, GIF)
              </p>
            </div>
          )}
        </div>

        {images.length < maxImages && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            파일 선택
          </Button>
        )}
      </div>

      {/* 업로드된 이미지 미리보기 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={url}
                  alt={`업로드 이미지 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
              {index === 0 && (
                <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                  대표 이미지
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
          <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">업로드된 이미지가 없습니다</p>
        </div>
      )}
    </div>
  );
}
