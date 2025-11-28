import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  Video,
  Eye,
  EyeOff,
  Upload,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface PageMedia {
  id: number;
  page_name: string;
  section_name: string;
  media_type: 'image' | 'video';
  media_url: string;
  alt_text: string | null;
  position_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function MediaManagement() {
  const [media, setMedia] = useState<PageMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPage, setFilterPage] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMedia, setEditingMedia] = useState<PageMedia | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    page_name: '',
    section_name: '',
    media_type: 'image' as 'image' | 'video',
    media_url: '',
    alt_text: '',
    position_order: 0,
    is_active: true
  });

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/media');
      const result = await response.json();

      if (result.success) {
        setMedia(result.data);
      } else {
        throw new Error(result.message || '미디어 로드 실패');
      }
    } catch (error) {
      console.error('Failed to load media:', error);
      toast.error(error instanceof Error ? error.message : '미디어 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.page_name || !formData.section_name || !formData.media_url) {
        toast.error('필수 항목을 입력해주세요');
        return;
      }

      if (editingMedia) {
        // Update - API 호출
        const response = await fetch(`/api/admin/media/${editingMedia.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const result = await response.json();

        if (result.success) {
          toast.success('미디어가 수정되었습니다');
        } else {
          throw new Error(result.message || '미디어 수정 실패');
        }
      } else {
        // Insert - API 호출
        const response = await fetch('/api/admin/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const result = await response.json();

        if (result.success) {
          toast.success('미디어가 추가되었습니다');
        } else {
          throw new Error(result.message || '미디어 추가 실패');
        }
      }

      setIsDialogOpen(false);
      resetForm();
      loadMedia();
    } catch (error) {
      console.error('Failed to save media:', error);
      toast.error(error instanceof Error ? error.message : '저장 실패');
    }
  };

  const handleDelete = async (id: number, section: string) => {
    if (!confirm(`"${section}" 미디어를 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch(`/api/admin/media/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        toast.success('미디어가 삭제되었습니다');
        loadMedia();
      } else {
        throw new Error(result.message || '삭제 실패');
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
      toast.error(error instanceof Error ? error.message : '삭제 실패');
    }
  };

  const handleEdit = (item: PageMedia) => {
    setEditingMedia(item);
    setFormData({
      page_name: item.page_name,
      section_name: item.section_name,
      media_type: item.media_type,
      media_url: item.media_url,
      alt_text: item.alt_text || '',
      position_order: item.position_order,
      is_active: item.is_active
    });
    setIsDialogOpen(true);
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/media/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      const result = await response.json();

      if (result.success) {
        toast.success(currentStatus ? '비활성화되었습니다' : '활성화되었습니다');
        loadMedia();
      } else {
        throw new Error(result.message || '상태 변경 실패');
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
      toast.error(error instanceof Error ? error.message : '상태 변경 실패');
    }
  };

  const resetForm = () => {
    setEditingMedia(null);
    setFormData({
      page_name: '',
      section_name: '',
      media_type: 'image',
      media_url: '',
      alt_text: '',
      position_order: 0,
      is_active: true
    });
  };

  const filteredMedia = media.filter(item => {
    if (filterPage !== 'all' && item.page_name !== filterPage) return false;
    if (filterType !== 'all' && item.media_type !== filterType) return false;
    if (searchQuery && !item.section_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const uniquePages = [...new Set(media.map(m => m.page_name))];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>🎨 페이지 미디어 관리</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  미디어 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingMedia ? '미디어 수정' : '새 미디어 추가'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>페이지 이름 *</Label>
                      <Input
                        value={formData.page_name}
                        onChange={(e) => setFormData({ ...formData, page_name: e.target.value })}
                        placeholder="HomePage, LoginPage 등"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>섹션 이름 *</Label>
                      <Input
                        value={formData.section_name}
                        onChange={(e) => setFormData({ ...formData, section_name: e.target.value })}
                        placeholder="Hero Background, Login Logo 등"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>미디어 타입 *</Label>
                      <Select
                        value={formData.media_type}
                        onValueChange={(value: 'image' | 'video') =>
                          setFormData({ ...formData, media_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">이미지</SelectItem>
                          <SelectItem value="video">비디오</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>표시 순서</Label>
                      <Input
                        type="number"
                        value={formData.position_order}
                        onChange={(e) =>
                          setFormData({ ...formData, position_order: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>미디어 URL *</Label>
                    <Input
                      value={formData.media_url}
                      onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Alt 텍스트 (이미지 설명)</Label>
                    <Input
                      value={formData.alt_text}
                      onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                      placeholder="이미지 설명"
                    />
                  </div>

                  {formData.media_url && (
                    <div className="space-y-2">
                      <Label>미리보기</Label>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        {formData.media_type === 'image' ? (
                          <img
                            src={formData.media_url}
                            alt={formData.alt_text}
                            className="max-h-48 mx-auto object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Invalid+URL';
                            }}
                          />
                        ) : (
                          <video
                            src={formData.media_url}
                            className="max-h-48 mx-auto"
                            controls
                          />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="is_active">활성화</Label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      취소
                    </Button>
                    <Button onClick={handleSave}>
                      {editingMedia ? '수정' : '추가'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="섹션 이름 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterPage} onValueChange={setFilterPage}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="페이지 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 페이지</SelectItem>
                {uniquePages.map(page => (
                  <SelectItem key={page} value={page}>{page}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="타입" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="image">이미지</SelectItem>
                <SelectItem value="video">비디오</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8">로딩 중...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>미리보기</TableHead>
                  <TableHead>페이지</TableHead>
                  <TableHead>섹션</TableHead>
                  <TableHead>타입</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>순서</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedia.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      미디어가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMedia.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                          {item.media_type === 'image' ? (
                            <img
                              src={item.media_url}
                              alt={item.alt_text || ''}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=404';
                              }}
                            />
                          ) : (
                            <Video className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.page_name}</TableCell>
                      <TableCell>{item.section_name}</TableCell>
                      <TableCell>
                        <Badge variant={item.media_type === 'image' ? 'default' : 'secondary'}>
                          {item.media_type === 'image' ? (
                            <><ImageIcon className="h-3 w-3 mr-1" /> 이미지</>
                          ) : (
                            <><Video className="h-3 w-3 mr-1" /> 비디오</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-gray-500">
                          {item.media_url}
                        </div>
                      </TableCell>
                      <TableCell>{item.position_order}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={item.is_active ? 'default' : 'outline'}
                          onClick={() => handleToggleActive(item.id, item.is_active)}
                        >
                          {item.is_active ? (
                            <><Eye className="h-3 w-3 mr-1" /> 활성</>
                          ) : (
                            <><EyeOff className="h-3 w-3 mr-1" /> 비활성</>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(item.id, item.section_name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 text-sm text-gray-500">
            총 {filteredMedia.length}개의 미디어
          </div>
        </CardContent>
      </Card>

      {/* 페이지별 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>📊 페이지별 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {uniquePages.map(page => {
              const pageMedia = media.filter(m => m.page_name === page);
              const activeCount = pageMedia.filter(m => m.is_active).length;
              return (
                <Card key={page}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">{page}</h3>
                    <div className="space-y-1 text-sm">
                      <div>전체: {pageMedia.length}개</div>
                      <div>활성: {activeCount}개</div>
                      <div>이미지: {pageMedia.filter(m => m.media_type === 'image').length}개</div>
                      <div>비디오: {pageMedia.filter(m => m.media_type === 'video').length}개</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
