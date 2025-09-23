import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Progress } from './progress';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import {
  Upload,
  File,
  X,
  Check,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  Archive
} from 'lucide-react';
import { toast } from 'sonner';

interface CloudStorageProps {
  onFileUpload?: (files: FileUploadResult[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // bytes
  acceptedTypes?: string[];
  disabled?: boolean;
}

interface FileUploadResult {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export function CloudStorage({
  onFileUpload,
  maxFiles = 10,
  maxSizePerFile = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/*', 'application/pdf', 'text/*'],
  disabled = false
}: CloudStorageProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 유형 아이콘 반환
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    } else if (type === 'application/pdf') {
      return <FileText className="h-4 w-4" />;
    } else if (type.startsWith('application/')) {
      return <Archive className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 파일 유효성 검사
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // 크기 체크
    if (file.size > maxSizePerFile) {
      return {
        valid: false,
        error: `파일 크기가 ${formatFileSize(maxSizePerFile)}를 초과합니다.`
      };
    }

    // 타입 체크
    const isValidType = acceptedTypes.some(type => {
      if (type.includes('/*')) {
        const category = type.split('/')[0];
        return file.type.startsWith(category + '/');
      }
      return file.type === type;
    });

    if (!isValidType) {
      return {
        valid: false,
        error: '지원하지 않는 파일 형식입니다.'
      };
    }

    return { valid: true };
  };

  // 파일 업로드 시뮬레이션 (실제 환경에서는 클라우드 스토리지 API 사용)
  const uploadFileToCloud = async (file: File): Promise<string> => {
    // 실제 구현에서는 AWS S3, Google Cloud Storage, Azure Blob 등을 사용
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% 성공률
          // 가상의 URL 생성
          const url = `https://storage.example.com/${Date.now()}-${file.name}`;
          resolve(url);
        } else {
          reject(new Error('업로드 실패'));
        }
      }, 1000 + Math.random() * 2000); // 1-3초 업로드 시간
    });
  };

  // 파일 업로드 처리
  const handleFileUpload = async (files: File[]) => {
    if (disabled) return;

    // 최대 파일 수 체크
    if (uploadingFiles.length + files.length > maxFiles) {
      toast.error(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`);
      return;
    }

    const newUploadingFiles: UploadingFile[] = [];

    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }

      newUploadingFiles.push({
        file,
        progress: 0,
        status: 'uploading'
      });
    }

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // 각 파일 업로드 처리
    for (let i = 0; i < newUploadingFiles.length; i++) {
      const uploadingFile = newUploadingFiles[i];

      try {
        // 진행률 업데이트 시뮬레이션
        const progressInterval = setInterval(() => {
          setUploadingFiles(prev => prev.map(f =>
            f.file === uploadingFile.file && f.progress < 95
              ? { ...f, progress: f.progress + Math.random() * 10 }
              : f
          ));
        }, 200);

        // 파일 업로드
        const url = await uploadFileToCloud(uploadingFile.file);

        clearInterval(progressInterval);

        setUploadingFiles(prev => prev.map(f =>
          f.file === uploadingFile.file
            ? { ...f, progress: 100, status: 'completed', url }
            : f
        ));

        toast.success(`${uploadingFile.file.name} 업로드 완료`);

      } catch (error) {
        setUploadingFiles(prev => prev.map(f =>
          f.file === uploadingFile.file
            ? {
                ...f,
                status: 'error',
                error: error instanceof Error ? error.message : '알 수 없는 오류'
              }
            : f
        ));

        toast.error(`${uploadingFile.file.name} 업로드 실패`);
      }
    }

    // 완료된 파일들을 부모에게 전달
    setTimeout(() => {
      const completedFiles = uploadingFiles
        .filter(f => f.status === 'completed' && f.url)
        .map(f => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: f.file.name,
          url: f.url!,
          type: f.file.type,
          size: f.file.size,
          uploadedAt: new Date().toISOString()
        }));

      if (completedFiles.length > 0 && onFileUpload) {
        onFileUpload(completedFiles);
      }
    }, 1000);
  };

  // 파일 제거
  const removeFile = (fileToRemove: UploadingFile) => {
    setUploadingFiles(prev => prev.filter(f => f !== fileToRemove));
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && !disabled) {
      const files = Array.from(e.target.files);
      handleFileUpload(files);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          파일 업로드
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 파일 드롭 영역 */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Upload className={`h-8 w-8 mx-auto mb-4 ${disabled ? 'text-muted-foreground' : 'text-primary'}`} />
          <p className="text-sm font-medium mb-2">
            {disabled ? '업로드 비활성화됨' : '파일을 여기에 드래그하거나 클릭하여 선택'}
          </p>
          <p className="text-xs text-muted-foreground">
            {acceptedTypes.join(', ')} | 최대 {formatFileSize(maxSizePerFile)} | {maxFiles}개까지
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
        </div>

        {/* 업로드 중인 파일 목록 */}
        {uploadingFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">업로드 진행 상황</h4>
            {uploadingFiles.map((uploadingFile, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0">
                  {getFileIcon(uploadingFile.file.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadingFile.file.size)}
                  </p>

                  {uploadingFile.status === 'uploading' && (
                    <Progress value={uploadingFile.progress} className="mt-2" />
                  )}

                  {uploadingFile.status === 'error' && (
                    <p className="text-xs text-destructive mt-1">{uploadingFile.error}</p>
                  )}
                </div>

                <div className="flex-shrink-0 flex items-center gap-2">
                  {uploadingFile.status === 'uploading' && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(uploadingFile.progress)}%
                    </span>
                  )}

                  {uploadingFile.status === 'completed' && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}

                  {uploadingFile.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadingFile)}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 완료된 파일들의 간단한 요약 */}
        {uploadingFiles.filter(f => f.status === 'completed').length > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✅ {uploadingFiles.filter(f => f.status === 'completed').length}개 파일이 성공적으로 업로드되었습니다.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CloudStorage;