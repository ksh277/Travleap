import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, MoveUp, MoveDown, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { ImageUploadComponent } from './ImageUploadComponent';
import { useAuth } from '../../contexts/AuthContext';

interface Banner {
  id?: number;
  page?: string;
  image_url: string;
  title?: string;
  link_url?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function BannerManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'page'>('home');
  const [selectedPage, setSelectedPage] = useState<string>('about');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [pageBanner, setPageBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Banner>({
    image_url: '',
    title: '',
    link_url: '',
    display_order: 0,
    is_active: true
  });

  // 인증 헤더 생성
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // 배너 목록 로드
  const loadBanners = async () => {
    try {
      setLoading(true);
      if (activeTab === 'home') {
        const response = await fetch('/api/admin/banners', {
          headers: getAuthHeaders()
        });
        const data = await response.json();

        if (data.success && data.banners) {
          setBanners(data.banners);
        } else {
          toast.error('배너 목록을 불러오지 못했습니다.');
        }
      } else {
        // 페이지별 배너 로드
        const response = await fetch(`/api/banners?page=${selectedPage}`);
        const data = await response.json();

        if (data.success) {
          setPageBanner(data.data);
        }
      }
    } catch (error) {
      console.error('배너 로드 실패:', error);
      toast.error('배너 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, [activeTab, selectedPage]);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      image_url: '',
      title: '',
      link_url: '',
      display_order: banners.length,
      is_active: true
    });
    setEditingBanner(null);
    setShowForm(false);
  };

  // 새 배너 추가 버튼
  const handleAddNew = () => {
    resetForm();
    setFormData({
      ...formData,
      display_order: banners.length
    });
    setShowForm(true);
  };

  // 배너 수정 버튼
  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData(banner);
    setShowForm(true);
  };

  // 배너 저장 (생성/수정)
  const handleSave = async () => {
    if (!formData.image_url.trim()) {
      toast.error('배너 이미지를 선택해주세요.');
      return;
    }

    try {
      const url = editingBanner
        ? `/api/admin/banners/${editingBanner.id}`
        : '/api/admin/banners';

      const method = editingBanner ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || '배너가 저장되었습니다.');
        await loadBanners();
        resetForm();
      } else {
        toast.error(data.message || '배너 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('배너 저장 실패:', error);
      toast.error('배너 저장 중 오류가 발생했습니다.');
    }
  };

  // 배너 삭제
  const handleDelete = async (id: number) => {
    if (!confirm('이 배너를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();

      if (data.success) {
        toast.success('배너가 삭제되었습니다.');
        await loadBanners();
      } else {
        toast.error(data.message || '배너 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('배너 삭제 실패:', error);
      toast.error('배너 삭제 중 오류가 발생했습니다.');
    }
  };

  // 배너 순서 변경
  const handleReorder = async (banner: Banner, direction: 'up' | 'down') => {
    const currentIndex = banners.findIndex(b => b.id === banner.id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === banners.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newBanners = [...banners];
    [newBanners[currentIndex], newBanners[newIndex]] = [newBanners[newIndex], newBanners[currentIndex]];

    // 순서 업데이트
    const updates = newBanners.map((b, index) => ({
      id: b.id!,
      display_order: index
    }));

    try {
      const response = await fetch('/api/admin/banners/reorder', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ banners: updates })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('배너 순서가 변경되었습니다.');
        await loadBanners();
      } else {
        toast.error(data.message || '배너 순서 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('배너 순서 변경 실패:', error);
      toast.error('배너 순서 변경 중 오류가 발생했습니다.');
    }
  };

  // 이미지 업로드 완료 핸들러
  const handleImageUpload = (url: string) => {
    setFormData({ ...formData, image_url: url });
  };

  // 페이지 배너 저장
  const handleSavePageBanner = async () => {
    if (!formData.image_url.trim()) {
      toast.error('배너 이미지를 선택해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: selectedPage,
          image_url: formData.image_url,
          title: formData.title,
          link_url: formData.link_url
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || '배너가 저장되었습니다.');
        await loadBanners();
        resetForm();
      } else {
        toast.error(data.message || '배너 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('배너 저장 실패:', error);
      toast.error('배너 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 탭 선택 */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'home' ? 'default' : 'outline'}
          onClick={() => setActiveTab('home')}
        >
          홈페이지 배너
        </Button>
        <Button
          variant={activeTab === 'page' ? 'default' : 'outline'}
          onClick={() => setActiveTab('page')}
        >
          페이지별 배너
        </Button>
      </div>

      {activeTab === 'page' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>페이지 선택</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              <Button
                variant={selectedPage === 'login' ? 'default' : 'outline'}
                onClick={() => setSelectedPage('login')}
                size="sm"
              >
                로그인 페이지
              </Button>
              <Button
                variant={selectedPage === 'signup' ? 'default' : 'outline'}
                onClick={() => setSelectedPage('signup')}
                size="sm"
              >
                회원가입 페이지
              </Button>
              <Button
                variant={selectedPage === 'home_background' ? 'default' : 'outline'}
                onClick={() => setSelectedPage('home_background')}
                size="sm"
              >
                메인 페이지 배경
              </Button>
              <Button
                variant={selectedPage === 'about' ? 'default' : 'outline'}
                onClick={() => setSelectedPage('about')}
                size="sm"
              >
                소개 페이지
              </Button>
              <Button
                variant={selectedPage === 'partner' ? 'default' : 'outline'}
                onClick={() => setSelectedPage('partner')}
                size="sm"
              >
                가맹점 페이지
              </Button>
              <Button
                variant={selectedPage === 'partner_apply' ? 'default' : 'outline'}
                onClick={() => setSelectedPage('partner_apply')}
                size="sm"
              >
                가맹점 신청
              </Button>
              <Button
                variant={selectedPage === 'contact' ? 'default' : 'outline'}
                onClick={() => setSelectedPage('contact')}
                size="sm"
              >
                문의 페이지
              </Button>
              <Button
                variant={selectedPage === 'category' ? 'default' : 'outline'}
                onClick={() => setSelectedPage('category')}
                size="sm"
              >
                카테고리 목록
              </Button>
              <Button
                variant={selectedPage === 'category_detail' ? 'default' : 'outline'}
                onClick={() => setSelectedPage('category_detail')}
                size="sm"
              >
                카테고리 상세
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {activeTab === 'home' ? '홈페이지 배너 관리' : `${selectedPage} 페이지 배너`}
            </CardTitle>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              {activeTab === 'page' && pageBanner ? '배너 수정' : '새 배너 추가'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 배너 목록 */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              배너 목록을 불러오는 중...
            </div>
          ) : activeTab === 'page' ? (
            // 페이지별 배너 표시
            pageBanner ? (
              <Card className="overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <div className="w-48 h-32 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={pageBanner.image_url}
                      alt={pageBanner.title || '배너'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1">
                      {pageBanner.title || '(제목 없음)'}
                    </h3>
                    <p className="text-sm text-gray-600 truncate">
                      {pageBanner.image_url}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        ...pageBanner,
                        page: selectedPage
                      });
                      setShowForm(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    수정
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="text-center py-8 text-gray-500">
                등록된 배너가 없습니다. 새 배너를 추가해보세요.
              </div>
            )
          ) : banners.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              등록된 배너가 없습니다. 새 배너를 추가해보세요.
            </div>
          ) : (
            <div className="space-y-4">
              {banners.map((banner, index) => (
                <Card key={banner.id} className="overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    {/* 배너 이미지 썸네일 */}
                    <div className="w-32 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={banner.image_url}
                        alt={banner.title || '배너'}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* 배너 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">
                          {banner.title || '(제목 없음)'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          banner.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {banner.is_active ? '활성' : '비활성'}
                        </span>
                      </div>
                      {banner.link_url && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate">{banner.link_url}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        순서: {index + 1} / {banners.length}
                      </p>
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="flex items-center gap-2">
                      {/* 순서 변경 */}
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReorder(banner, 'up')}
                          disabled={index === 0}
                          className="h-7 w-7 p-0"
                        >
                          <MoveUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReorder(banner, 'down')}
                          disabled={index === banners.length - 1}
                          className="h-7 w-7 p-0"
                        >
                          <MoveDown className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* 수정/삭제 */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(banner)}
                        className="gap-1"
                      >
                        <Pencil className="h-3 w-3" />
                        수정
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(banner.id!)}
                        className="gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        삭제
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 배너 추가/수정 폼 */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingBanner ? '배너 수정' : '새 배너 추가'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 이미지 업로드 */}
            <div className="space-y-2">
              <Label>배너 이미지 *</Label>
              <ImageUploadComponent
                onUploadComplete={handleImageUpload}
                existingImageUrl={formData.image_url}
              />
              {formData.image_url && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <img
                    src={formData.image_url}
                    alt="미리보기"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
            </div>

            {/* 배너 제목 */}
            <div className="space-y-2">
              <Label htmlFor="title">배너 제목 (선택)</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="배너에 표시할 제목을 입력하세요"
              />
            </div>

            {/* 링크 URL */}
            <div className="space-y-2">
              <Label htmlFor="link_url">클릭 시 이동할 URL (선택)</Label>
              <Input
                id="link_url"
                value={formData.link_url || ''}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="https://example.com 또는 /category/tour"
              />
              <p className="text-xs text-gray-500">
                외부 링크는 https://로 시작하며, 내부 링크는 /로 시작합니다
              </p>
            </div>

            {/* 활성화 여부 */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">배너 활성화</Label>
            </div>

            {/* 버튼들 */}
            <div className="flex gap-2">
              <Button
                onClick={activeTab === 'page' ? handleSavePageBanner : handleSave}
                className="flex-1"
              >
                {editingBanner || (activeTab === 'page' && pageBanner) ? '수정 완료' : '배너 추가'}
              </Button>
              <Button onClick={resetForm} variant="outline" className="flex-1">
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
