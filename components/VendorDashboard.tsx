import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, Search, RefreshCw, Save, X, Clock, Menu, Package, Loader2, Image as ImageIcon } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import TimeSlotManager from './vendor/TimeSlotManager';
import ListingOptionsManager from './vendor/ListingOptionsManager';
import { ImageUploadComponent } from './admin/ImageUploadComponent';

interface Listing {
  id: number;
  title: string;
  category: string;
  category_id?: number;
  price_from: number;
  child_price?: number;
  infant_price?: number;
  location: string;
  address?: string;
  meeting_point?: string;
  description_md?: string;
  short_description?: string;
  images?: string[];
  max_capacity?: number;
  highlights?: string[];
  included?: string[];
  excluded?: string[];
  is_active: boolean;
  is_published: boolean;
  is_featured?: boolean;
  has_options?: boolean;
  stock?: number;
  stock_enabled?: boolean;
  min_purchase?: number;
  max_purchase?: number;
  shipping_fee?: number;
  lat?: number;
  lng?: number;
  view_count: number;
  booking_count: number;
  review_count: number;
  avg_rating: number;
  created_at: string;
}

interface ListingFormData {
  title: string;
  category: string;
  category_id: number | null;
  price_from: number;
  child_price: number | null;
  infant_price: number | null;
  location: string;
  address: string;
  meeting_point: string;
  description_md: string;
  short_description: string;
  images: string[];
  max_capacity: number;
  highlights: string[];
  included: string[];
  excluded: string[];
  is_active: boolean;
  is_featured: boolean;
  has_options: boolean;
  stock: number | null;
  stock_enabled: boolean;
  min_purchase: number;
  max_purchase: number | null;
  shipping_fee: number;
  lat: number | null;
  lng: number | null;
}

interface Partner {
  id: number;
  category: string;
}

interface VendorDashboardProps {
  categoryFilter?: string; // 특정 카테고리만 표시 (선택사항)
  categoryName?: string; // 카테고리 표시 이름
}

// 카테고리별 옵션 타입 매핑
type OptionType = 'menu' | 'time_slot' | 'seat_class' | 'package' | 'addon' | '';

const CATEGORY_OPTION_CONFIG: Record<string, { hasTimeSlot: boolean; optionType: OptionType; optionLabel: string }> = {
  food: { hasTimeSlot: true, optionType: 'menu', optionLabel: '메뉴' },
  attractions: { hasTimeSlot: true, optionType: '', optionLabel: '' },
  events: { hasTimeSlot: true, optionType: 'seat_class', optionLabel: '좌석등급' },
  experience: { hasTimeSlot: true, optionType: '', optionLabel: '' },
  tour: { hasTimeSlot: true, optionType: 'package', optionLabel: '패키지' },
  popup: { hasTimeSlot: false, optionType: 'menu', optionLabel: '메뉴/옵션' },
  travel: { hasTimeSlot: true, optionType: 'package', optionLabel: '패키지' }
};

const DEFAULT_FORM_DATA: ListingFormData = {
  title: '',
  category: 'popup',
  category_id: null,
  price_from: 0,
  child_price: null,
  infant_price: null,
  location: '',
  address: '',
  meeting_point: '',
  description_md: '',
  short_description: '',
  images: [],
  max_capacity: 10,
  highlights: ['', '', ''],
  included: ['', '', ''],
  excluded: ['', '', ''],
  is_active: true,
  is_featured: false,
  has_options: false,
  stock: null,
  stock_enabled: false,
  min_purchase: 1,
  max_purchase: null,
  shipping_fee: 0,
  lat: null,
  lng: null
};

export function VendorDashboard({ categoryFilter, categoryName }: VendorDashboardProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ListingFormData>(DEFAULT_FORM_DATA);
  const [formTab, setFormTab] = useState('basic');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<number | null>(null);

  const loadListings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token');

      if (!token) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const response = await fetch('/api/vendor/listings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'API 오류');
      }

      let fetchedListings = result.data || [];

      // categoryFilter가 있으면 필터링
      if (categoryFilter) {
        fetchedListings = fetchedListings.filter((l: Listing) => l.category === categoryFilter);
      }

      setListings(fetchedListings);
      setPartner(result.partner);

      console.log(`✅ [VendorDashboard] ${fetchedListings.length}개 상품 로드 완료`);
    } catch (error) {
      console.error('Failed to load listings:', error);
      toast.error('상품 목록을 불러오는데 실패했습니다');
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setListingToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!listingToDelete) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/vendor/listings?id=${listingToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'API 오류');
      }

      toast.success('상품이 삭제되었습니다');
      loadListings();
    } catch (error: any) {
      console.error('Failed to delete listing:', error);
      toast.error(error.message || '상품 삭제에 실패했습니다');
    } finally {
      setListingToDelete(null);
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      ...DEFAULT_FORM_DATA,
      category: categoryFilter || 'popup'
    });
    setEditingListing(null);
    setFormTab('basic');
  };

  // 상품 수정 시 폼 데이터 로드
  const openEditForm = (listing: Listing) => {
    setEditingListing(listing);
    setFormData({
      title: listing.title || '',
      category: listing.category || categoryFilter || 'popup',
      category_id: listing.category_id || null,
      price_from: listing.price_from || 0,
      child_price: listing.child_price || null,
      infant_price: listing.infant_price || null,
      location: listing.location || '',
      address: listing.address || '',
      meeting_point: listing.meeting_point || '',
      description_md: listing.description_md || '',
      short_description: listing.short_description || '',
      images: listing.images || [],
      max_capacity: listing.max_capacity || 10,
      highlights: listing.highlights?.length ? [...listing.highlights, '', ''].slice(0, 5) : ['', '', ''],
      included: listing.included?.length ? [...listing.included, '', ''].slice(0, 5) : ['', '', ''],
      excluded: listing.excluded?.length ? [...listing.excluded, '', ''].slice(0, 5) : ['', '', ''],
      is_active: listing.is_active ?? true,
      is_featured: listing.is_featured ?? false,
      has_options: listing.has_options ?? false,
      stock: listing.stock || null,
      stock_enabled: listing.stock_enabled ?? false,
      min_purchase: listing.min_purchase || 1,
      max_purchase: listing.max_purchase || null,
      shipping_fee: listing.shipping_fee || 0,
      lat: listing.lat || null,
      lng: listing.lng || null
    });
    setFormTab('basic');
    setShowForm(true);
  };

  // 상품 저장 (생성/수정)
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('상품명을 입력해주세요.');
      return;
    }

    if (formData.price_from <= 0) {
      toast.error('가격을 입력해주세요.');
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('auth_token');
      const isEdit = !!editingListing;

      const payload = {
        ...formData,
        id: editingListing?.id,
        highlights: formData.highlights.filter(h => h.trim()),
        included: formData.included.filter(i => i.trim()),
        excluded: formData.excluded.filter(e => e.trim())
      };

      const response = await fetch('/api/vendor/listings', {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'API 오류');
      }

      toast.success(isEdit ? '상품이 수정되었습니다.' : '상품이 등록되었습니다.');
      resetForm();
      setShowForm(false);
      loadListings();
    } catch (error: any) {
      console.error('Failed to save listing:', error);
      toast.error(error.message || '상품 저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  // 배열 필드 업데이트 헬퍼
  const updateArrayField = (field: 'highlights' | 'included' | 'excluded', index: number, value: string) => {
    setFormData(prev => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  // 현재 카테고리의 옵션 설정
  const currentCategory = formData.category || categoryFilter || 'popup';
  const optionConfig = CATEGORY_OPTION_CONFIG[currentCategory] || { hasTimeSlot: false, optionType: '', optionLabel: '' };

  useEffect(() => {
    loadListings();
  }, []);

  const filteredListings = listings.filter(listing =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {categoryName || '상품 관리'}
          </h1>
          <p className="text-gray-600 mt-1">
            등록된 상품: {filteredListings.length}개
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          새 상품 등록
        </Button>
      </div>

      {/* 검색 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="상품명 또는 위치로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={loadListings}>
              <RefreshCw className="h-4 w-4 mr-2" />
              새로고침
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 상품 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>상품 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">로딩 중...</p>
            </div>
          ) : filteredListings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">상품명</th>
                    <th className="text-left py-3 px-4">카테고리</th>
                    <th className="text-left py-3 px-4">위치</th>
                    <th className="text-right py-3 px-4">가격</th>
                    <th className="text-center py-3 px-4">상태</th>
                    <th className="text-center py-3 px-4">조회수</th>
                    <th className="text-center py-3 px-4">예약수</th>
                    <th className="text-center py-3 px-4">평점</th>
                    <th className="text-center py-3 px-4">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredListings.map((listing) => (
                    <tr key={listing.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{listing.title}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{listing.category}</Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {listing.location || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        ₩{listing.price_from?.toLocaleString() || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {listing.is_active ? (
                          <Badge className="bg-green-500">활성</Badge>
                        ) : (
                          <Badge variant="secondary">비활성</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {listing.view_count || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {listing.booking_count || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {listing.avg_rating ? (
                          <div className="flex items-center justify-center gap-1">
                            <span>{listing.avg_rating.toFixed(1)}</span>
                            <span className="text-yellow-500">★</span>
                            <span className="text-xs text-gray-500">
                              ({listing.review_count})
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/listing/${listing.id}`, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditForm(listing)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(listing.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">
                {searchQuery ? '검색 결과가 없습니다' : '등록된 상품이 없습니다'}
              </p>
              <Button onClick={() => setShowForm(true)} className="mt-4">
                첫 상품 등록하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상품 등록/수정 폼 */}
      {showForm && (
        <Card className="border-2 border-purple-200">
          <CardHeader className="bg-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {editingListing ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editingListing ? '상품 수정' : '새 상품 등록'}
                </CardTitle>
                <CardDescription>
                  {editingListing ? `ID: ${editingListing.id} - ${editingListing.title}` : '새로운 상품을 등록하세요'}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowForm(false); resetForm(); }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs value={formTab} onValueChange={setFormTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="basic">기본 정보</TabsTrigger>
                <TabsTrigger value="detail">상세 정보</TabsTrigger>
                <TabsTrigger value="images">이미지</TabsTrigger>
                {optionConfig.hasTimeSlot && (
                  <TabsTrigger value="timeslot">
                    <Clock className="h-4 w-4 mr-1" />
                    시간대
                  </TabsTrigger>
                )}
                {optionConfig.optionType && (
                  <TabsTrigger value="options">
                    <Menu className="h-4 w-4 mr-1" />
                    {optionConfig.optionLabel}
                  </TabsTrigger>
                )}
                <TabsTrigger value="settings">설정</TabsTrigger>
              </TabsList>

              {/* 기본 정보 탭 */}
              <TabsContent value="basic" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label htmlFor="title">상품명 *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="상품명을 입력하세요"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">카테고리</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="popup">팝업</SelectItem>
                        <SelectItem value="food">음식</SelectItem>
                        <SelectItem value="attractions">관광지</SelectItem>
                        <SelectItem value="events">이벤트</SelectItem>
                        <SelectItem value="experience">체험</SelectItem>
                        <SelectItem value="tour">투어</SelectItem>
                        <SelectItem value="travel">여행</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="location">위치/지역</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="예: 서울, 부산, 제주"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="price_from">기본 가격 (원) *</Label>
                    <Input
                      id="price_from"
                      type="number"
                      value={formData.price_from || ''}
                      onChange={(e) => setFormData({ ...formData, price_from: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="child_price">어린이 가격 (원)</Label>
                    <Input
                      id="child_price"
                      type="number"
                      value={formData.child_price || ''}
                      onChange={(e) => setFormData({ ...formData, child_price: parseInt(e.target.value) || null })}
                      placeholder="없으면 비워두세요"
                      className="mt-1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="address">상세 주소</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="상세 주소"
                      className="mt-1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="short_description">간단 설명</Label>
                    <Textarea
                      id="short_description"
                      value={formData.short_description}
                      onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                      placeholder="상품에 대한 간단한 설명 (1-2줄)"
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="description_md">상세 설명</Label>
                    <Textarea
                      id="description_md"
                      value={formData.description_md}
                      onChange={(e) => setFormData({ ...formData, description_md: e.target.value })}
                      placeholder="상품에 대한 자세한 설명"
                      rows={6}
                      className="mt-1"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* 상세 정보 탭 */}
              <TabsContent value="detail" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label>하이라이트</Label>
                    <div className="space-y-2 mt-2">
                      {formData.highlights.map((h, i) => (
                        <Input
                          key={i}
                          value={h}
                          onChange={(e) => updateArrayField('highlights', i, e.target.value)}
                          placeholder={`하이라이트 ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>포함 사항</Label>
                    <div className="space-y-2 mt-2">
                      {formData.included.map((item, i) => (
                        <Input
                          key={i}
                          value={item}
                          onChange={(e) => updateArrayField('included', i, e.target.value)}
                          placeholder={`포함 ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>불포함 사항</Label>
                    <div className="space-y-2 mt-2">
                      {formData.excluded.map((item, i) => (
                        <Input
                          key={i}
                          value={item}
                          onChange={(e) => updateArrayField('excluded', i, e.target.value)}
                          placeholder={`불포함 ${i + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="meeting_point">만남 장소</Label>
                    <Input
                      id="meeting_point"
                      value={formData.meeting_point}
                      onChange={(e) => setFormData({ ...formData, meeting_point: e.target.value })}
                      placeholder="집합 장소 또는 픽업 위치"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_capacity">최대 인원</Label>
                    <Input
                      id="max_capacity"
                      type="number"
                      value={formData.max_capacity || ''}
                      onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 10 })}
                      placeholder="10"
                      className="mt-1"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* 이미지 탭 */}
              <TabsContent value="images" className="space-y-6">
                <div>
                  <Label className="flex items-center gap-2 mb-4">
                    <ImageIcon className="h-4 w-4" />
                    상품 이미지 (최대 10장)
                  </Label>
                  <ImageUploadComponent
                    category="listings"
                    maxFiles={10}
                    multiple={true}
                    existingImages={formData.images}
                    onImagesUploaded={(urls) => setFormData({ ...formData, images: urls })}
                  />
                </div>
              </TabsContent>

              {/* 시간대 관리 탭 */}
              {optionConfig.hasTimeSlot && editingListing && (
                <TabsContent value="timeslot" className="space-y-4">
                  <TimeSlotManager
                    listings={[{ id: editingListing.id, title: editingListing.title, category: editingListing.category }]}
                    categoryLabel="예약 시간대"
                    defaultCapacity={formData.max_capacity || 10}
                  />
                </TabsContent>
              )}

              {optionConfig.hasTimeSlot && !editingListing && (
                <TabsContent value="timeslot" className="space-y-4">
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">상품을 먼저 저장한 후 시간대를 설정할 수 있습니다.</p>
                  </div>
                </TabsContent>
              )}

              {/* 옵션 관리 탭 */}
              {optionConfig.optionType && editingListing && (
                <TabsContent value="options" className="space-y-4">
                  <ListingOptionsManager
                    listings={[{ id: editingListing.id, title: editingListing.title, category: editingListing.category }]}
                    defaultOptionType={optionConfig.optionType as 'menu' | 'time_slot' | 'seat_class' | 'package' | 'addon'}
                    categoryLabel={optionConfig.optionLabel}
                  />
                </TabsContent>
              )}

              {optionConfig.optionType && !editingListing && (
                <TabsContent value="options" className="space-y-4">
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">상품을 먼저 저장한 후 {optionConfig.optionLabel}를 설정할 수 있습니다.</p>
                  </div>
                </TabsContent>
              )}

              {/* 설정 탭 */}
              <TabsContent value="settings" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label>활성 상태</Label>
                        <p className="text-sm text-gray-500">비활성화하면 고객에게 표시되지 않습니다</p>
                      </div>
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label>추천 상품</Label>
                        <p className="text-sm text-gray-500">메인 페이지에 우선 노출됩니다</p>
                      </div>
                      <Switch
                        checked={formData.is_featured}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label>옵션 사용</Label>
                        <p className="text-sm text-gray-500">메뉴, 시간대 등 옵션을 사용합니다</p>
                      </div>
                      <Switch
                        checked={formData.has_options}
                        onCheckedChange={(checked) => setFormData({ ...formData, has_options: checked })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label>재고 관리</Label>
                        <p className="text-sm text-gray-500">재고 수량을 관리합니다</p>
                      </div>
                      <Switch
                        checked={formData.stock_enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, stock_enabled: checked })}
                      />
                    </div>

                    {formData.stock_enabled && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <Label htmlFor="stock">재고 수량</Label>
                        <Input
                          id="stock"
                          type="number"
                          value={formData.stock || ''}
                          onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || null })}
                          placeholder="재고 수량"
                          className="mt-2"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min_purchase">최소 구매 수량</Label>
                        <Input
                          id="min_purchase"
                          type="number"
                          value={formData.min_purchase || ''}
                          onChange={(e) => setFormData({ ...formData, min_purchase: parseInt(e.target.value) || 1 })}
                          placeholder="1"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="max_purchase">최대 구매 수량</Label>
                        <Input
                          id="max_purchase"
                          type="number"
                          value={formData.max_purchase || ''}
                          onChange={(e) => setFormData({ ...formData, max_purchase: parseInt(e.target.value) || null })}
                          placeholder="제한 없음"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="shipping_fee">배송비 (원)</Label>
                      <Input
                        id="shipping_fee"
                        type="number"
                        value={formData.shipping_fee || ''}
                        onChange={(e) => setFormData({ ...formData, shipping_fee: parseInt(e.target.value) || 0 })}
                        placeholder="0 (무료배송)"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* 저장 버튼 */}
            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
              <Button
                variant="outline"
                onClick={() => { setShowForm(false); resetForm(); }}
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingListing ? '수정 완료' : '상품 등록'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="상품 삭제"
        description="정말로 이 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        variant="destructive"
      />
    </div>
  );
}
