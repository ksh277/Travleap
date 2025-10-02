import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Search,
  Upload,
  Image as ImageIcon,
  Check,
  LayoutGrid,
  List,
  ZoomIn
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../utils/api';

interface MediaItem {
  id: number;
  filename: string;
  original_filename: string;
  url: string;
  thumbnail_url?: string;
  file_type: string;
  file_size?: number;
  width?: number;
  height?: number;
  alt_text?: string;
  caption?: string;
  category: 'product' | 'banner' | 'blog' | 'partner' | 'event' | 'other';
  usage_location?: string;
  tags?: string[];
  uploader_name?: string;
  created_at: string;
}

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem | MediaItem[]) => void;
  multiSelect?: boolean;
  category?: string;
  usageLocation?: string;
}

export function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  multiSelect = false,
  category,
  usageLocation
}: MediaLibraryModalProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(category || 'all');
  const [selectedUsage, setSelectedUsage] = useState<string>(usageLocation || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 20;

  // 업로드 진행 상태
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    filename: string;
  } | null>(null);

  // 미디어 로드
  const loadMedia = async (page: number = 1, append: boolean = false) => {
    setIsLoading(true);
    try {
      const filters: any = {
        limit: ITEMS_PER_PAGE,
        offset: (page - 1) * ITEMS_PER_PAGE
      };
      if (category) filters.category = category;
      if (usageLocation) filters.usage_location = usageLocation;

      const response = await api.getMedia(filters);
      if (response.success && response.data) {
        if (append) {
          setMediaItems(prev => [...prev, ...response.data]);
        } else {
          setMediaItems(response.data);
        }

        // 더 이상 데이터가 없는지 확인
        setHasMore(response.data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('Failed to load media:', error);
      toast.error('미디어 로딩에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 더 보기 버튼
  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadMedia(nextPage, true);
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setMediaItems([]);
      loadMedia(1, false);
      setSelectedItems([]);
    }
  }, [isOpen]);

  // 필터링 - 클라이언트 사이드에서 처리
  useEffect(() => {
    let filtered = [...mediaItems];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.original_filename.toLowerCase().includes(query) ||
        item.alt_text?.toLowerCase().includes(query) ||
        item.caption?.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (selectedUsage && selectedUsage !== 'all') {
      filtered = filtered.filter(item => item.usage_location === selectedUsage);
    }

    setFilteredItems(filtered);
  }, [searchQuery, selectedCategory, selectedUsage, mediaItems]);

  // 이미지 선택 토글
  const toggleSelect = (id: number) => {
    if (multiSelect) {
      setSelectedItems(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setSelectedItems([id]);
    }
  };

  // 파일 업로드 핸들러
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    const totalFiles = files.length;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 진행 상태 업데이트
        setUploadProgress({
          current: i + 1,
          total: totalFiles,
          filename: file.name
        });

        // 파일 크기 체크 (10MB 제한)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}은(는) 10MB보다 큽니다.`);
          continue;
        }

        // 이미지 파일인지 확인
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name}은(는) 이미지 파일이 아닙니다.`);
          continue;
        }

        // 이미지를 Base64 또는 외부 URL로 변환
        // 프로덕션에서는 실제 파일 스토리지 서비스 사용 필요
        const reader = new FileReader();

        await new Promise((resolve, reject) => {
          reader.onload = async (e) => {
            const dataUrl = e.target?.result as string;

            // 이미지 메타데이터 추출
            const img = new window.Image();
            img.onload = () => {
              // 미디어 데이터 생성
              const mediaData = {
                filename: `${Date.now()}_${file.name}`,
                original_filename: file.name,
                url: dataUrl, // Base64 Data URL (작은 이미지용)
                file_type: file.type,
                file_size: file.size,
                width: img.width,
                height: img.height,
                category: category as any || 'other',
                usage_location: usageLocation
              };

              // API 호출하여 DB에 저장
              api.uploadMedia(mediaData)
                .then(() => {
                  toast.success(`${file.name} 업로드 완료`);
                  resolve(true);
                })
                .catch(error => {
                  console.error('Upload failed:', error);
                  toast.error(`${file.name} 업로드 실패`);
                  reject(error);
                });
            };

            img.onerror = () => {
              toast.error(`${file.name} 로딩 실패`);
              reject(new Error('Image load failed'));
            };

            img.src = dataUrl;
          };

          reader.onerror = () => {
            toast.error(`${file.name} 읽기 실패`);
            reject(new Error('File read failed'));
          };

          reader.readAsDataURL(file);
        });
      }

      // 업로드 후 목록 새로고침
      await loadMedia();
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setUploadingFiles(false);
      setUploadProgress(null);
      event.target.value = '';
    }
  };

  // 선택 완료
  const handleConfirm = () => {
    const selected = mediaItems.filter(item => selectedItems.includes(item.id));
    if (selected.length === 0) {
      toast.error('이미지를 선택해주세요.');
      return;
    }

    onSelect(multiSelect ? selected : selected[0]);
    onClose();
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>미디어 라이브러리</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                </Button>
                <label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button variant="default" size="sm" disabled={uploadingFiles} asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingFiles ? '업로드 중...' : '이미지 업로드'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {/* 업로드 진행 상태 */}
            {uploadProgress && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between text-sm text-blue-900 mb-2">
                  <span className="font-medium truncate flex-1 mr-4">
                    {uploadProgress.filename}
                  </span>
                  <span className="font-medium whitespace-nowrap">
                    {uploadProgress.current} / {uploadProgress.total}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </DialogHeader>

          <Tabs defaultValue="library" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="library">라이브러리</TabsTrigger>
              <TabsTrigger value="url">URL 직접 입력</TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="flex-1 flex flex-col overflow-hidden mt-4">
              {/* 필터 및 검색 */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="파일명, 설명, 태그로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="카테고리" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="product">상품</SelectItem>
                    <SelectItem value="banner">배너</SelectItem>
                    <SelectItem value="blog">블로그</SelectItem>
                    <SelectItem value="partner">파트너</SelectItem>
                    <SelectItem value="event">이벤트</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedUsage} onValueChange={setSelectedUsage}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="사용 위치" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 위치</SelectItem>
                    <SelectItem value="main_banner">메인 배너</SelectItem>
                    <SelectItem value="category_banner">카테고리 배너</SelectItem>
                    <SelectItem value="product_main">상품 대표 이미지</SelectItem>
                    <SelectItem value="product_gallery">상품 갤러리</SelectItem>
                    <SelectItem value="blog_thumbnail">블로그 썸네일</SelectItem>
                    <SelectItem value="blog_content">블로그 본문</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 미디어 그리드/리스트 */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">로딩 중...</div>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
                    <p>미디어가 없습니다.</p>
                    <p className="text-sm mt-2">이미지를 업로드해보세요.</p>
                  </div>
                ) : viewMode === 'grid' ? (
                  <>
                    <div className="grid grid-cols-4 gap-4">
                      {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className={`relative group cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                          selectedItems.includes(item.id)
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleSelect(item.id)}
                      >
                        <div className="aspect-square bg-gray-100">
                          <img
                            src={item.thumbnail_url || item.url}
                            alt={item.alt_text || item.original_filename}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {selectedItems.includes(item.id) && (
                          <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 text-white hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewMedia(item);
                            }}
                          >
                            <ZoomIn className="w-5 h-5" />
                          </Button>
                        </div>
                        <div className="p-2 bg-white">
                          <p className="text-xs truncate font-medium">{item.original_filename}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">{formatFileSize(item.file_size)}</span>
                            {item.width && item.height && (
                              <span className="text-xs text-gray-500">{item.width}×{item.height}</span>
                            )}
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {item.tags.slice(0, 2).map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs px-1 py-0">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    </div>

                    {/* 더 보기 버튼 */}
                    {hasMore && !searchQuery && (
                      <div className="flex justify-center mt-4">
                        <Button
                          variant="outline"
                          onClick={loadMore}
                          disabled={isLoading}
                        >
                          {isLoading ? '로딩 중...' : '더 보기'}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      {filteredItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedItems.includes(item.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleSelect(item.id)}
                      >
                        <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                          <img
                            src={item.thumbnail_url || item.url}
                            alt={item.alt_text || item.original_filename}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.original_filename}</p>
                          {item.alt_text && (
                            <p className="text-sm text-gray-600 truncate">{item.alt_text}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{formatFileSize(item.file_size)}</span>
                            {item.width && item.height && (
                              <span>{item.width}×{item.height}</span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                            {item.usage_location && (
                              <span className="text-xs text-blue-600">{item.usage_location}</span>
                            )}
                          </div>
                        </div>
                        {selectedItems.includes(item.id) && (
                          <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                    </div>

                    {/* 더 보기 버튼 */}
                    {hasMore && !searchQuery && (
                      <div className="flex justify-center mt-4">
                        <Button
                          variant="outline"
                          onClick={loadMore}
                          disabled={isLoading}
                        >
                          {isLoading ? '로딩 중...' : '더 보기'}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 푸터 */}
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <div className="text-sm text-gray-600">
                  {selectedItems.length > 0 && (
                    <span>{selectedItems.length}개 선택됨</span>
                  )}
                  {filteredItems.length > 0 && (
                    <span className="ml-2 text-gray-400">
                      / 총 {filteredItems.length}개
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    취소
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={selectedItems.length === 0}
                  >
                    선택 완료 ({selectedItems.length})
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="url" className="flex-1 flex flex-col mt-4">
              <URLInputTab onConfirm={(url) => {
                onSelect({
                  id: Date.now(),
                  filename: 'external',
                  original_filename: url,
                  url: url,
                  file_type: 'image/external',
                  category: 'other',
                  created_at: new Date().toISOString()
                });
                onClose();
              }} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 미리보기 모달 */}
      {previewMedia && (
        <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewMedia.original_filename}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <img
                src={previewMedia.url}
                alt={previewMedia.alt_text || previewMedia.original_filename}
                className="w-full rounded-lg"
              />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">파일 크기:</span> {formatFileSize(previewMedia.file_size)}
                </div>
                <div>
                  <span className="font-medium">해상도:</span> {previewMedia.width}×{previewMedia.height}
                </div>
                <div>
                  <span className="font-medium">카테고리:</span> {previewMedia.category}
                </div>
                {previewMedia.usage_location && (
                  <div>
                    <span className="font-medium">사용 위치:</span> {previewMedia.usage_location}
                  </div>
                )}
              </div>
              {previewMedia.caption && (
                <div className="text-sm">
                  <span className="font-medium">설명:</span> {previewMedia.caption}
                </div>
              )}
              {previewMedia.tags && previewMedia.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {previewMedia.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// URL 직접 입력 탭
function URLInputTab({ onConfirm }: { onConfirm: (url: string) => void }) {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  const handlePreview = () => {
    if (url.trim()) {
      setPreview(url.trim());
    }
  };

  const handleConfirm = () => {
    if (!url.trim()) {
      toast.error('URL을 입력해주세요.');
      return;
    }
    onConfirm(url.trim());
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">이미지 URL</label>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/image.jpg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePreview()}
            />
            <Button variant="outline" onClick={handlePreview}>
              미리보기
            </Button>
          </div>
        </div>

        {preview && (
          <div className="border rounded-lg p-4">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-96 object-contain rounded"
              onError={() => {
                toast.error('이미지를 불러올 수 없습니다.');
                setPreview(null);
              }}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-auto pt-4">
        <Button onClick={handleConfirm} disabled={!url.trim()}>
          URL 사용
        </Button>
      </div>
    </div>
  );
}
