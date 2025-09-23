import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  BarChart3,
  Users,
  Package,
  TrendingUp,
  Calendar,
  MapPin,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../utils/api';
import { useAuthStore } from '../hooks/useAuthStore';
import type { Listing, User } from '../types/database';

interface AdminPageProps {}

interface Product {
  id: string;
  title: string;
  category: string;
  price: number;
  location: string;
  rating: number;
  reviewCount: number;
  image: string;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
  featured?: boolean;
}

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  image: string;
  author: string;
  category: string;
  tags: string[];
  status: 'published' | 'draft' | 'archived';
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
  featured?: boolean;
}

// API에서 상품 데이터 로드
const loadProducts = async (): Promise<Product[]> => {
  try {
    const listings = await api.getListings({ page: 1, limit: 100 });

    return listings.data.map((listing) => ({
      id: listing.id.toString(),
      title: listing.title,
      category: listing.category === 'tour' ? '여행' :
                listing.category === 'stay' ? '숙박' :
                listing.category === 'food' ? '음식' :
                listing.category === 'rentcar' ? '렌트카' :
                listing.category === 'tourist' ? '관광지' :
                listing.category === 'popup' ? '팝업' :
                listing.category === 'event' ? '행사' :
                listing.category === 'experience' ? '체험' : '기타',
      price: listing.price_from || 0,
      location: listing.location || '',
      rating: listing.rating_avg || 0,
      reviewCount: listing.rating_count || 0,
      image: listing.images ?
             (Array.isArray(listing.images) ?
              listing.images[0] || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop' :
              'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop') :
             'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
      description: listing.short_description || '상세 정보를 확인해보세요.',
      status: listing.is_active ? 'active' : 'inactive',
      createdAt: listing.created_at ? listing.created_at.split('T')[0] : '2024-01-01',
      featured: listing.is_featured || false
    }));
  } catch (error) {
    console.error('Failed to load products:', error);
    return [];
  }
};

// 사용자 데이터 로드
const loadUsers = async (): Promise<User[]> => {
  try {
    const users = await api.getUsers();
    return users || [];
  } catch (error) {
    console.error('Failed to load users:', error);
    return [];
  }
};

export function AdminPage({}: AdminPageProps) {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [partnerApplications, setPartnerApplications] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // 관리자 권한 확인
  useEffect(() => {
    if (!isLoggedIn || !user || user.role !== 'admin') {
      toast.error('관리자 권한이 필요합니다.');
      navigate('/');
      return;
    }
  }, [isLoggedIn, user, navigate]);
  
  // 새 상품 폼 데이터
  const [newProduct, setNewProduct] = useState({
    title: '',
    category: '',
    price: '',
    location: '',
    image: '',
    description: '',
    featured: false,
    startDate: '',
    endDate: '',
    duration: '1일'
  });

  const categories = ['여행', '렌트카', '숙박', '음식', '관광지', '팝업', '행사', '체험'];

  // 초기 데이터 로드
  useEffect(() => {
    const loadAdminData = async () => {
      setIsLoading(true);
      try {
        // 상품 목록 가져오기
        const listingsResponse = await api.getListings();
        if (listingsResponse.success && listingsResponse.data) {
          const mappedProducts: Product[] = listingsResponse.data.map(listing => ({
            id: String(listing.id),
            title: listing.title,
            category: listing.category === 'tour' ? '투어' :
                      listing.category === 'stay' ? '숙박' :
                      listing.category === 'food' ? '음식' : '기타',
            price: listing.price_from || 0,
            location: listing.location || '',
            rating: listing.rating_avg || 0,
            reviewCount: listing.rating_count || 0,
            image: listing.images?.[0] || '',
            description: listing.short_description || '',
            status: listing.is_active ? 'active' : 'inactive' as const,
            createdAt: new Date(listing.created_at).toISOString().split('T')[0],
            featured: listing.is_featured || false
          }));
          setProducts(mappedProducts);
        }

        // 대시보드 통계 가져오기
        const statsResponse = await api.admin.getDashboardStats();
        if (statsResponse) {
          setDashboardStats(statsResponse);
        }

        // 파트너 신청 목록 가져오기
        const applicationsResponse = await api.admin.getPartnerApplications();
        if (applicationsResponse.success) {
          setPartnerApplications(applicationsResponse.data);
        }

        // 예약 목록 가져오기
        const bookingsResponse = await api.admin.getBookings();
        if (bookingsResponse.success) {
          setBookings(bookingsResponse.data);
        }

      } catch (error) {
        console.error('Failed to load admin data:', error);
        toast.error('관리자 데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminData();
  }, []);

  // 통계 데이터 계산 (DB 데이터 우선, 없으면 계산)
  const stats = dashboardStats ? {
    totalProducts: dashboardStats.total_listings,
    activeProducts: dashboardStats.active_listings,
    totalRevenue: dashboardStats.total_revenue,
    avgRating: dashboardStats.average_rating
  } : {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.status === 'active').length,
    totalRevenue: products.reduce((sum, p) => sum + (p.price * p.reviewCount * 0.1), 0),
    avgRating: products.length > 0 ? products.reduce((sum, p) => sum + p.rating, 0) / products.length : 0
  };

  // 필터링 및 검색
  useEffect(() => {
    let filtered = products;

    if (searchQuery) {
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(product => product.status === selectedStatus);
    }

    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, selectedStatus, products]);

  // 상품 추가
  const handleAddProduct = async () => {
    if (!newProduct.title || !newProduct.category || !newProduct.price) {
      toast.error('필수 정보를 모두 입력해주세요.');
      return;
    }

    try {
      // 카테고리 ID 찾기
      const categoryMap: { [key: string]: number } = {
        '여행': 1, '렌트카': 4, '숙박': 2, '음식': 3, '관광지': 5, '팝업': 6, '행사': 7, '체험': 8
      };

      const listingData = {
        title: newProduct.title,
        category: newProduct.category === '여행' ? 'tour' :
                 newProduct.category === '숙박' ? 'stay' :
                 newProduct.category === '음식' ? 'food' :
                 newProduct.category === '렌트카' ? 'rentcar' :
                 newProduct.category === '관광지' ? 'tourist' :
                 newProduct.category === '팝업' ? 'popup' :
                 newProduct.category === '행사' ? 'event' :
                 newProduct.category === '체험' ? 'experience' : 'tour',
        category_id: categoryMap[newProduct.category] || 1,
        short_description: newProduct.description,
        description_md: newProduct.description,
        price_from: parseInt(newProduct.price),
        price_to: parseInt(newProduct.price),
        location: newProduct.location || '',
        images: newProduct.image ? [newProduct.image] : [],
        is_active: true,
        is_featured: newProduct.featured,
        max_capacity: 10,
        duration: newProduct.duration,
        available_from: newProduct.startDate || null,
        available_to: newProduct.endDate || null
      };

      const response = await api.admin.createListing(listingData);
      if (response.success) {
        const newProductForUI: Product = {
          id: String(response.data.id),
          title: newProduct.title,
          category: newProduct.category,
          price: parseInt(newProduct.price),
          location: newProduct.location,
          rating: 0,
          reviewCount: 0,
          image: newProduct.image || '',
          description: newProduct.description,
          status: 'active',
          createdAt: new Date().toISOString().split('T')[0],
          featured: newProduct.featured
        };

        setProducts(prev => [...prev, newProductForUI]);
        setNewProduct({
          title: '', category: '', price: '', location: '', image: '', description: '', featured: false,
          startDate: '', endDate: '', duration: '1일'
        });
        setIsAddModalOpen(false);
        toast.success('상품이 추가되었습니다.');
      } else {
        throw new Error(response.error || '상품 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to add product:', error);
      toast.error(error instanceof Error ? error.message : '상품 추가 중 오류가 발생했습니다.');
    }
  };

  // 상품 수정
  const handleEditProduct = async () => {
    if (!editingProduct) return;

    try {
      const updateData = {
        title: editingProduct.title,
        category: editingProduct.category === '여행' ? 'tour' :
                 editingProduct.category === '숙박' ? 'stay' :
                 editingProduct.category === '음식' ? 'food' :
                 editingProduct.category === '렌트카' ? 'rentcar' :
                 editingProduct.category === '관광지' ? 'tourist' :
                 editingProduct.category === '팝업' ? 'popup' :
                 editingProduct.category === '행사' ? 'event' :
                 editingProduct.category === '체험' ? 'experience' : 'tour',
        price_from: editingProduct.price,
        location: editingProduct.location,
        short_description: editingProduct.description,
        is_active: editingProduct.status === 'active',
        is_featured: editingProduct.featured || false
      };

      const result = await api.admin.updateListing(parseInt(editingProduct.id), updateData);
      if (result.success && result.data) {
        setProducts(prev =>
          prev.map(p =>
            p.id === editingProduct.id
              ? { ...editingProduct }
              : p
          )
        );
        setEditingProduct(null);
        setIsEditModalOpen(false);
        toast.success('상품이 수정되었습니다.');
      } else {
        toast.error(result.error || '상품 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('상품 수정에 실패했습니다.');
    }
  };

  // 상품 삭제
  const handleDeleteProduct = async (id: string) => {
    if (confirm('정말 이 상품을 삭제하시겠습니까?')) {
      try {
        const result = await api.admin.deleteListing(parseInt(id));
        if (result.success) {
          setProducts(prev => prev.filter(p => p.id !== id));
          toast.success('상품이 삭제되었습니다.');
        } else {
          toast.error(result.error || '상품 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('Delete failed:', error);
        toast.error('상품 삭제에 실패했습니다.');
      }
    }
  };

  // 상품 상태 토글
  const handleToggleStatus = (id: string) => {
    setProducts(prev => 
      prev.map(p => 
        p.id === id 
          ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' }
          : p
      )
    );
    toast.success('상품 상태가 변경되었습니다.');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">관리자 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
              <p className="text-gray-600">신안 여행 플랫폼 상품 관리</p>
            </div>
            <Button onClick={() => navigate('/')} variant="outline">
              돌아가기
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid grid-cols-8 w-full max-w-5xl">
            <TabsTrigger value="dashboard">대시보드</TabsTrigger>
            <TabsTrigger value="products">상품 관리</TabsTrigger>
            <TabsTrigger value="reviews">리뷰 관리</TabsTrigger>
            <TabsTrigger value="partners">파트너 관리</TabsTrigger>
            <TabsTrigger value="blogs">블로그 관리</TabsTrigger>
            <TabsTrigger value="images">이미지 관리</TabsTrigger>
            <TabsTrigger value="orders">주문 관리</TabsTrigger>
            <TabsTrigger value="users">사용자 관리</TabsTrigger>
          </TabsList>

          {/* 대시보드 탭 */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">총 상품 수</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalProducts}</div>
                  <p className="text-xs text-muted-foreground">
                    활성 상품: {stats.activeProducts}개
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">예상 수익</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₩{stats.totalRevenue.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    이번 달 예상
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">평균 평점</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">
                    5점 만점
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">신규 가입</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+12</div>
                  <p className="text-xs text-muted-foreground">
                    이번 주
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 최근 상품 목록 */}
            <Card>
              <CardHeader>
                <CardTitle>최근 등록된 상품</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center space-x-4">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{product.title}</h4>
                        <p className="text-sm text-gray-600">{product.category} • {product.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₩{product.price.toLocaleString()}</p>
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                          {product.status === 'active' ? '활성' : '비활성'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 상품 관리 탭 */}
          <TabsContent value="products" className="space-y-6">
            {/* 검색 및 필터 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>상품 관리</CardTitle>
                  <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#8B5FBF] hover:bg-[#7A4FB5]">
                        <Plus className="h-4 w-4 mr-2" />
                        상품 추가
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>새 상품 추가</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">상품명 *</label>
                          <Input
                            value={newProduct.title}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="상품명을 입력하세요"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">카테고리 *</label>
                          <Select
                            value={newProduct.category}
                            onValueChange={(value) => setNewProduct(prev => ({ ...prev, category: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="카테고리 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">가격 *</label>
                          <Input
                            type="number"
                            value={newProduct.price}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="가격을 입력하세요"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">위치</label>
                          <Input
                            value={newProduct.location}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, location: e.target.value }))}
                            placeholder="위치를 입력하세요"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm font-medium mb-1 block">이미지 URL</label>
                          <Input
                            value={newProduct.image}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, image: e.target.value }))}
                            placeholder="이미지 URL을 입력하세요"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">시작일</label>
                          <Input
                            type="date"
                            value={newProduct.startDate}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, startDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">종료일</label>
                          <Input
                            type="date"
                            value={newProduct.endDate}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, endDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">소요시간</label>
                          <Select
                            value={newProduct.duration}
                            onValueChange={(value) => setNewProduct(prev => ({ ...prev, duration: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="소요시간 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1시간">1시간</SelectItem>
                              <SelectItem value="2시간">2시간</SelectItem>
                              <SelectItem value="반나절">반나절</SelectItem>
                              <SelectItem value="1일">1일</SelectItem>
                              <SelectItem value="2일">2일</SelectItem>
                              <SelectItem value="3일">3일</SelectItem>
                              <SelectItem value="1주일">1주일</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">
                            <input
                              type="checkbox"
                              checked={newProduct.featured}
                              onChange={(e) => setNewProduct(prev => ({ ...prev, featured: e.target.checked }))}
                              className="mr-2"
                            />
                            추천 상품
                          </label>
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm font-medium mb-1 block">설명</label>
                          <Textarea
                            value={newProduct.description}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="상품 설명을 입력하세요"
                            rows={3}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                          취소
                        </Button>
                        <Button onClick={handleAddProduct} className="bg-[#8B5FBF] hover:bg-[#7A4FB5]">
                          추가
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="상품명, 위치, 설명으로 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 카테고리</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="active">활성</SelectItem>
                      <SelectItem value="inactive">비활성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 상품 테이블 */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>상품</TableHead>
                        <TableHead>카테고리</TableHead>
                        <TableHead>가격</TableHead>
                        <TableHead>평점</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>등록일</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <img
                                src={product.image}
                                alt={product.title}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                              <div>
                                <div className="font-medium flex items-center">
                                  {product.title}
                                  {product.featured && (
                                    <Badge className="ml-2 bg-orange-100 text-orange-800">
                                      Featured
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {product.location}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category}</Badge>
                          </TableCell>
                          <TableCell>₩{product.price.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                              {product.rating} ({product.reviewCount})
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={product.status === 'active' ? 'default' : 'secondary'}
                              className="cursor-pointer"
                              onClick={() => handleToggleStatus(product.id)}
                            >
                              {product.status === 'active' ? '활성' : '비활성'}
                            </Badge>
                          </TableCell>
                          <TableCell>{product.createdAt}</TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setIsEditModalOpen(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 블로그 관리 탭 */}
          <TabsContent value="blogs" className="space-y-6">
            {/* 블로그 검색 및 필터 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>블로그 관리</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        새 포스트 작성
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>새 블로그 포스트 작성</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <label htmlFor="blog-title">제목</label>
                          <Input id="blog-title" placeholder="포스트 제목을 입력하세요" />
                        </div>
                        <div className="grid gap-2">
                          <label htmlFor="blog-excerpt">요약</label>
                          <Input id="blog-excerpt" placeholder="포스트 요약을 입력하세요" />
                        </div>
                        <div className="grid gap-2">
                          <label htmlFor="blog-content">내용</label>
                          <Textarea
                            id="blog-content"
                            placeholder="포스트 내용을 입력하세요"
                            className="min-h-[200px]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <label htmlFor="blog-category">카테고리</label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="카테고리 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="travel">여행 정보</SelectItem>
                                <SelectItem value="culture">문화/역사</SelectItem>
                                <SelectItem value="food">음식</SelectItem>
                                <SelectItem value="nature">자연</SelectItem>
                                <SelectItem value="tips">여행 팁</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <label htmlFor="blog-image">이미지 URL</label>
                            <Input id="blog-image" placeholder="https://..." />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <label htmlFor="blog-tags">태그 (쉼표로 구분)</label>
                          <Input id="blog-tags" placeholder="신안, 퍼플섬, 여행" />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline">임시저장</Button>
                          <Button>발행</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex-1">
                    <Input placeholder="블로그 포스트 검색..." />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="published">발행됨</SelectItem>
                      <SelectItem value="draft">임시저장</SelectItem>
                      <SelectItem value="archived">보관됨</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 블로그 포스트 목록 */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>제목</TableHead>
                        <TableHead>카테고리</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>조회수</TableHead>
                        <TableHead>좋아요</TableHead>
                        <TableHead>작성일</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <div>
                            <div className="font-medium">신안 퍼플섬 완전 정복 가이드</div>
                            <div className="text-sm text-gray-500">보라색으로 물든 아름다운 섬의 모든 것</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">여행 정보</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">발행됨</Badge>
                        </TableCell>
                        <TableCell>1,234</TableCell>
                        <TableCell>89</TableCell>
                        <TableCell>2024-01-15</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <div>
                            <div className="font-medium">신안 맛집 투어 베스트 10</div>
                            <div className="text-sm text-gray-500">현지인이 추천하는 진짜 맛집들</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">음식</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">발행됨</Badge>
                        </TableCell>
                        <TableCell>2,156</TableCell>
                        <TableCell>156</TableCell>
                        <TableCell>2024-01-12</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <div>
                            <div className="font-medium">청산도 슬로우길 걷기 코스</div>
                            <div className="text-sm text-gray-500">영화 촬영지를 따라 걷는 힐링 코스</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">자연</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-yellow-100 text-yellow-800">임시저장</Badge>
                        </TableCell>
                        <TableCell>0</TableCell>
                        <TableCell>0</TableCell>
                        <TableCell>2024-01-20</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 이미지 관리 탭 */}
          <TabsContent value="images" className="space-y-6">
            {/* 이미지 업로드 및 관리 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>이미지 관리</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        이미지 업로드
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>새 이미지 업로드</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">이미지 파일</label>
                          <Input
                            type="file"
                            accept="image/*"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">이미지 제목</label>
                          <Input
                            placeholder="이미지 제목을 입력하세요"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">사용 위치</label>
                          <Select>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="사용 위치 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="homepage-main">홈페이지 메인</SelectItem>
                              <SelectItem value="homepage-activity">홈페이지 액티비티</SelectItem>
                              <SelectItem value="product">상품 이미지</SelectItem>
                              <SelectItem value="blog">블로그 이미지</SelectItem>
                              <SelectItem value="banner">배너</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">설명</label>
                          <Textarea
                            placeholder="이미지 설명을 입력하세요"
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                        <Button className="w-full">업로드</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* 현재 액티비티 섹션 이미지들 */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">홈페이지 액티비티 섹션</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 왼쪽 큰 이미지 */}
                      <Card className="md:col-span-2">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <img
                              src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop"
                              alt="민박 메인 이미지"
                              className="w-full h-48 object-cover rounded-lg"
                            />
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">신안 민박 (메인)</h4>
                                <p className="text-sm text-gray-600">홈페이지 액티비티 섹션 메인 이미지</p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 오른쪽 작은 이미지들 */}
                      <div className="space-y-4">
                        <Card>
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <img
                                src="https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=300&h=200&fit=crop"
                                alt="갯벌체험"
                                className="w-full h-24 object-cover rounded"
                              />
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="text-sm font-medium">갯벌체험</h5>
                                  <p className="text-xs text-gray-600">우상단 이미지</p>
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <img
                                src="https://images.unsplash.com/photo-1464822759880-4601b726be04?w=300&h=200&fit=crop"
                                alt="홍도 유람선"
                                className="w-full h-24 object-cover rounded"
                              />
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="text-sm font-medium">홍도 유람선</h5>
                                  <p className="text-xs text-gray-600">우하단 이미지</p>
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>

                  {/* 기타 이미지들 */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">기타 이미지</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <Card key={index}>
                          <CardContent className="p-2">
                            <div className="space-y-2">
                              <div className="w-full h-20 bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-500">이미지 {index + 1}</span>
                              </div>
                              <div className="flex justify-center gap-1">
                                <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 파트너 관리 탭 */}
          <TabsContent value="partners" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>파트너 관리</CardTitle>
                  <Button className="bg-[#8B5FBF] hover:bg-[#7A4FB5]">
                    <Plus className="h-4 w-4 mr-2" />
                    파트너 승인
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center space-x-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="파트너 검색..."
                      className="pl-9"
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="상태 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="pending">승인 대기</SelectItem>
                      <SelectItem value="approved">승인됨</SelectItem>
                      <SelectItem value="rejected">거부됨</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {partnerApplications.map((partner) => (
                    <Card key={partner.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{partner.business_name || '파트너 업체'}</h3>
                            <p className="text-sm text-gray-600">{partner.contact_name || '담당자 미상'}</p>
                          </div>
                          <Badge
                            variant={
                              partner.status === 'approved' ? 'default' :
                              partner.status === 'pending' ? 'secondary' : 'destructive'
                            }
                          >
                            {partner.status === 'approved' ? '승인됨' :
                             partner.status === 'pending' ? '대기중' : '거부됨'}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{partner.business_address || '주소 미입력'}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Star className="h-4 w-4 mr-2 text-yellow-500" />
                            <span>{partner.tier || 'bronze'} 등급</span>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Eye className="h-4 w-4 mr-1" />
                            상세
                          </Button>
                          {partner.status === 'pending' && (
                            <>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                승인
                              </Button>
                              <Button size="sm" variant="destructive">
                                거부
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {partnerApplications.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">등록된 파트너가 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 주문 관리 탭 */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>주문 관리</CardTitle>
                  <div className="flex space-x-2">
                    <Button variant="outline" className="text-green-600 border-green-600">
                      주문 내보내기
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center space-x-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="주문 번호 검색..."
                      className="pl-9"
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="상태 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="pending">대기중</SelectItem>
                      <SelectItem value="confirmed">확정</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="cancelled">취소</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>주문번호</TableHead>
                      <TableHead>고객명</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>주문일</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">ORD-001</TableCell>
                      <TableCell>김민지</TableCell>
                      <TableCell>신안 퍼플섬 투어</TableCell>
                      <TableCell>₩45,000</TableCell>
                      <TableCell>
                        <Badge variant="secondary">대기중</Badge>
                      </TableCell>
                      <TableCell>{new Date().toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                            확정
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">ORD-002</TableCell>
                      <TableCell>이수연</TableCell>
                      <TableCell>임자도 펜션 예약</TableCell>
                      <TableCell>₩180,000</TableCell>
                      <TableCell>
                        <Badge variant="default">확정</Badge>
                      </TableCell>
                      <TableCell>{new Date(Date.now() - 86400000).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive">
                            취소
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">ORD-003</TableCell>
                      <TableCell>박준혁</TableCell>
                      <TableCell>신안 젓갈 맛집</TableCell>
                      <TableCell>₩25,000</TableCell>
                      <TableCell>
                        <Badge variant="default">완료</Badge>
                      </TableCell>
                      <TableCell>{new Date(Date.now() - 172800000).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">총 3개의 주문</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 리뷰 관리 탭 */}
          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>리뷰 관리</CardTitle>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="bg-[#8B5FBF] hover:bg-[#7A4FB5]">
                          <Plus className="h-4 w-4 mr-2" />
                          리뷰 추가
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>새 리뷰 추가</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">상품 선택</label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="상품을 선택하세요" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">작성자</label>
                            <Input placeholder="작성자명을 입력하세요" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-1 block">평점</label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="평점 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="5">⭐⭐⭐⭐⭐ (5점)</SelectItem>
                                  <SelectItem value="4">⭐⭐⭐⭐ (4점)</SelectItem>
                                  <SelectItem value="3">⭐⭐⭐ (3점)</SelectItem>
                                  <SelectItem value="2">⭐⭐ (2점)</SelectItem>
                                  <SelectItem value="1">⭐ (1점)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">방문일</label>
                              <Input type="date" />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">리뷰 제목</label>
                            <Input placeholder="리뷰 제목을 입력하세요" />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">리뷰 내용</label>
                            <Textarea placeholder="리뷰 내용을 입력하세요" rows={4} />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                          <Button variant="outline">취소</Button>
                          <Button className="bg-[#8B5FBF] hover:bg-[#7A4FB5]">추가</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="리뷰 검색..."
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="평점 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="5">5점</SelectItem>
                      <SelectItem value="4">4점</SelectItem>
                      <SelectItem value="3">3점</SelectItem>
                      <SelectItem value="2">2점</SelectItem>
                      <SelectItem value="1">1점</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>상품명</TableHead>
                      <TableHead>작성자</TableHead>
                      <TableHead>평점</TableHead>
                      <TableHead>리뷰 내용</TableHead>
                      <TableHead>작성일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>증도 천일염 체험</TableCell>
                      <TableCell>김민지</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                          5.0
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        정말 멋진 경험이었습니다! 갯벌의 신비로운 생태계를...
                      </TableCell>
                      <TableCell>2024-03-15</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">승인됨</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>흑산도 홍어 삼합 투어</TableCell>
                      <TableCell>박정훈</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                          4.0
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        맛있는 홍어삼합! 현지 분들이 추천해주신 맛집들이...
                      </TableCell>
                      <TableCell>2024-03-12</TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-100 text-yellow-800">대기중</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 사용자 관리 탭 */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>사용자 관리</CardTitle>
                  <Button className="bg-[#8B5FBF] hover:bg-[#7A4FB5]">
                    <Plus className="h-4 w-4 mr-2" />
                    사용자 초대
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center space-x-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="사용자 검색..."
                      className="pl-9"
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="역할 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="admin">관리자</SelectItem>
                      <SelectItem value="partner">파트너</SelectItem>
                      <SelectItem value="user">일반 사용자</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>역할</TableHead>
                      <TableHead>가입일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.slice(0, 10).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? '관리자' :
                             user.role === 'partner' ? '파트너' : '일반 사용자'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="default">활성</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {users.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">등록된 사용자가 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* 수정 모달 */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>상품 수정</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">상품명</label>
                <Input
                  value={editingProduct.title}
                  onChange={(e) => setEditingProduct(prev => 
                    prev ? { ...prev, title: e.target.value } : null
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">카테고리</label>
                <Select
                  value={editingProduct.category}
                  onValueChange={(value) => setEditingProduct(prev => 
                    prev ? { ...prev, category: value } : null
                  )}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">가격</label>
                <Input
                  type="number"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct(prev => 
                    prev ? { ...prev, price: parseInt(e.target.value) || 0 } : null
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">위치</label>
                <Input
                  value={editingProduct.location}
                  onChange={(e) => setEditingProduct(prev => 
                    prev ? { ...prev, location: e.target.value } : null
                  )}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">설명</label>
                <Textarea
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct(prev => 
                    prev ? { ...prev, description: e.target.value } : null
                  )}
                  rows={3}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleEditProduct} className="bg-[#8B5FBF] hover:bg-[#7A4FB5]">
              수정
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}