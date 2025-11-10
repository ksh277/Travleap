import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Eye, Search, RefreshCw } from 'lucide-react';

interface Listing {
  id: number;
  title: string;
  category: string;
  price_from: number;
  location: string;
  is_active: boolean;
  is_published: boolean;
  view_count: number;
  booking_count: number;
  review_count: number;
  avg_rating: number;
  created_at: string;
}

interface Partner {
  id: number;
  category: string;
}

interface VendorDashboardProps {
  categoryFilter?: string; // 특정 카테고리만 표시 (선택사항)
  categoryName?: string; // 카테고리 표시 이름
}

export function VendorDashboard({ categoryFilter, categoryName }: VendorDashboardProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  const handleDelete = async (id: number) => {
    if (!confirm('정말로 이 상품을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/vendor/listings/${id}`, {
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
    }
  };

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
        <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
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
                            onClick={() => {
                              setEditingListing(listing);
                              setShowForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(listing.id)}
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

      {/* 상품 등록/수정 폼 (간단 버전 - 추후 확장) */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingListing ? '상품 수정' : '새 상품 등록'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              상품 등록/수정 폼은 추후 구현 예정입니다.
            </p>
            <Button
              onClick={() => {
                setShowForm(false);
                setEditingListing(null);
              }}
              variant="outline"
              className="mt-4"
            >
              닫기
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
