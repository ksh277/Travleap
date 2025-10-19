/**
 * 숙박 파트너 전용 대시보드 (실제 DB 스키마 기준)
 *
 * 기능:
 * - 이미지 URL 입력 (최대 5개)
 * - CSV 대량 업로드
 * - 객실 수정 기능
 * - 객실 이용가능 여부 토글
 * - 편의시설/하이라이트 정보
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import {
  Hotel,
  Plus,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Settings,
  Loader2,
  LogOut,
  Building2,
  Tag,
  Upload,
  X,
  Image as ImageIcon,
  FileUp,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Listing {
  id: number;
  partner_id: number;
  title: string;
  short_description: string;
  description_md: string;
  price_from: number;
  price_to: number;
  images: string[];
  amenities: string[];
  highlights: string[];
  available_spots: number;
  rating_avg: number;
  rating_count: number;
  is_featured: boolean;
  is_published: boolean;
  is_active: boolean;
  location: string;
  created_at: string;
}

interface Booking {
  id: number;
  listing_id: number;
  room_name: string;
  customer_name: string;
  customer_phone: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface PartnerInfo {
  id: number;
  business_name: string;
  contact_email: string;
  contact_phone: string;
  contact_name: string;
  address: string;
  is_verified: boolean;
  room_count: number;
}

interface ListingFormData {
  title: string;
  short_description: string;
  description_md: string;
  price_from: number;
  price_to: number;
  is_published: boolean;
  is_active: boolean;
  image_urls: string[];
  amenities_text: string;
  highlights_text: string;
  available_spots: number;
  location: string;
}

export function PartnerDashboardPageEnhanced() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState('listings');
  const [revenueData, setRevenueData] = useState<Array<{ date: string; revenue: number }>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 예약 필터
  const [bookingFilters, setBookingFilters] = useState({
    startDate: '',
    endDate: '',
    listingId: '',
    status: '',
    searchQuery: ''
  });

  // 업체 정보 수정
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editedInfo, setEditedInfo] = useState<Partial<PartnerInfo>>({});

  // 객실 추가/수정
  const [isAddingListing, setIsAddingListing] = useState(false);
  const [isEditingListing, setIsEditingListing] = useState(false);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);
  const [listingForm, setListingForm] = useState<ListingFormData>({
    title: '',
    short_description: '',
    description_md: '',
    price_from: 80000,
    price_to: 150000,
    is_published: true,
    is_active: true,
    image_urls: [],
    amenities_text: 'WiFi, TV, 에어컨, 냉장고',
    highlights_text: '오션뷰, 조식 포함',
    available_spots: 2,
    location: ''
  });

  // 이미지 URL 입력용
  const [currentImageUrl, setCurrentImageUrl] = useState('');

  // 파트너 정보 로드
  useEffect(() => {
    loadPartnerData();
  }, [user?.id]);

  const loadPartnerData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // 1. 파트너 정보 조회 API
      const partnerResponse = await fetch(`/api/partner/info?userId=${user.id}`);
      const partnerData = await partnerResponse.json();

      if (!partnerData.success || !partnerData.data) {
        toast.error('파트너 정보를 찾을 수 없습니다.');
        navigate('/login');
        return;
      }

      const partner = partnerData.data;
      setPartnerInfo(partner);

      // 2. 객실 목록 조회 API
      const listingsResponse = await fetch(`/api/partner/listings?userId=${user.id}`);
      const listingsData = await listingsResponse.json();

      if (listingsData.success && listingsData.data) {
        // Parse JSON fields
        const parsedListings = listingsData.data.map((l: any) => ({
          ...l,
          images: typeof l.images === 'string' ? JSON.parse(l.images) : l.images,
          amenities: typeof l.amenities === 'string' ? JSON.parse(l.amenities) : l.amenities,
          highlights: typeof l.highlights === 'string' ? JSON.parse(l.highlights) : l.highlights
        }));
        setListings(parsedListings);
      } else {
        setListings([]);
      }

      // 3. 예약 목록 조회 API
      const bookingsResponse = await fetch(`/api/partner/bookings?userId=${user.id}`);
      const bookingsData = await bookingsResponse.json();

      if (bookingsData.success && bookingsData.data) {
        setBookings(bookingsData.data);
        setFilteredBookings(bookingsData.data);
      } else {
        setBookings([]);
        setFilteredBookings([]);
      }

      // 4. 매출 통계 조회 API
      const revenueResponse = await fetch(`/api/partner/revenue?userId=${user.id}`);
      const revenueData = await revenueResponse.json();

      if (revenueData.success && revenueData.data) {
        setRevenueData(revenueData.data.map((r: any) => ({
          date: new Date(r.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
          revenue: r.revenue
        })));
      } else {
        setRevenueData([]);
      }

      console.log(`✅ 파트너 데이터 로드 완료: ${partner.business_name}`);
    } catch (error) {
      console.error('파트너 데이터 로드 실패:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('로그아웃되었습니다.');
  };

  const resetListingForm = () => {
    setListingForm({
      title: '',
      short_description: '',
      description_md: '',
      price_from: 80000,
      price_to: 150000,
      is_published: true,
      is_active: true,
      image_urls: [],
      amenities_text: 'WiFi, TV, 에어컨, 냉장고',
      highlights_text: '오션뷰, 조식 포함',
      available_spots: 2,
      location: partnerInfo?.address || ''
    });
    setCurrentImageUrl('');
  };

  const handleAddListing = () => {
    resetListingForm();
    setIsAddingListing(true);
    setIsEditingListing(false);
    setEditingListingId(null);
  };

  const handleEditListing = (listing: Listing) => {
    setListingForm({
      title: listing.title,
      short_description: listing.short_description || '',
      description_md: listing.description_md || '',
      price_from: listing.price_from,
      price_to: listing.price_to,
      is_published: listing.is_published,
      is_active: listing.is_active,
      image_urls: Array.isArray(listing.images) ? listing.images : [],
      amenities_text: Array.isArray(listing.amenities) ? listing.amenities.join(', ') : '',
      highlights_text: Array.isArray(listing.highlights) ? listing.highlights.join(', ') : '',
      available_spots: listing.available_spots,
      location: listing.location || partnerInfo?.address || ''
    });
    setEditingListingId(listing.id);
    setIsEditingListing(true);
    setIsAddingListing(true);
  };

  const handleCancelForm = () => {
    setIsAddingListing(false);
    setIsEditingListing(false);
    setEditingListingId(null);
    resetListingForm();
  };

  const addImageUrl = () => {
    if (!currentImageUrl.trim()) {
      toast.error('이미지 URL을 입력해주세요.');
      return;
    }

    if (listingForm.image_urls.length >= 5) {
      toast.error('최대 5개까지 이미지를 추가할 수 있습니다.');
      return;
    }

    setListingForm({
      ...listingForm,
      image_urls: [...listingForm.image_urls, currentImageUrl.trim()]
    });
    setCurrentImageUrl('');
  };

  const removeImageUrl = (index: number) => {
    setListingForm({
      ...listingForm,
      image_urls: listingForm.image_urls.filter((_, i) => i !== index)
    });
  };

  const handleSaveListing = async () => {
    if (!partnerInfo?.id || !user?.id) return;

    if (!listingForm.title.trim()) {
      toast.error('객실명을 입력해주세요.');
      return;
    }

    try {
      const image_urls = listingForm.image_urls.length > 0
        ? listingForm.image_urls
        : [
            'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=600&fit=crop',
            'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop'
          ];

      // Convert comma-separated strings to arrays
      const amenities = listingForm.amenities_text.split(',').map(s => s.trim()).filter(s => s);
      const highlights = listingForm.highlights_text.split(',').map(s => s.trim()).filter(s => s);

      const payload = {
        userId: user.id,
        title: listingForm.title,
        short_description: listingForm.short_description,
        description_md: listingForm.description_md,
        price_from: listingForm.price_from,
        price_to: listingForm.price_to,
        is_published: listingForm.is_published,
        is_active: listingForm.is_active,
        image_urls,
        amenities,
        highlights,
        available_spots: listingForm.available_spots,
        location: listingForm.location
      };

      if (isEditingListing && editingListingId) {
        // 수정 - PUT API
        const response = await fetch(`/api/partner/listings/${editingListingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id.toString()
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.success) {
          toast.success('객실이 수정되었습니다!');
        } else {
          toast.error(result.message || '객실 수정에 실패했습니다.');
          return;
        }
      } else {
        // 신규 등록 - POST API
        const response = await fetch('/api/partner/listings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id.toString()
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.success) {
          toast.success('객실이 등록되었습니다!');
        } else {
          toast.error(result.message || '객실 등록에 실패했습니다.');
          return;
        }
      }

      handleCancelForm();
      loadPartnerData();
    } catch (error) {
      console.error('객실 저장 실패:', error);
      toast.error('객실 저장에 실패했습니다.');
    }
  };

  const handleDeleteListing = async (listingId: number) => {
    if (!confirm('정말 이 객실을 삭제하시겠습니까?')) return;
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/partner/listings/${listingId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id.toString()
        }
      });

      const result = await response.json();
      if (result.success) {
        toast.success('객실이 삭제되었습니다.');
        loadPartnerData();
      } else {
        toast.error(result.message || '객실 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('객실 삭제 실패:', error);
      toast.error('객실 삭제에 실패했습니다.');
    }
  };

  const toggleListingAvailability = async (listingId: number, currentStatus: boolean) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/partner/listings/${listingId}/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          userId: user.id,
          is_active: !currentStatus
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(currentStatus ? '객실이 예약 불가로 변경되었습니다.' : '객실이 예약 가능으로 변경되었습니다.');
        loadPartnerData();
      } else {
        toast.error(result.message || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('상태 변경 실패:', error);
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  // CSV 업로드
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('CSV 파일만 업로드할 수 있습니다.');
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast.error('CSV 파일에 데이터가 없습니다.');
        return;
      }

      const dataLines = lines.slice(1);
      let successCount = 0;
      let errorCount = 0;

      for (const line of dataLines) {
        const values = line.split(',');

        try {
          const amenities = ['WiFi', 'TV', '에어컨', '냉장고'];
          const highlights = ['오션뷰', '조식 포함'];

          const listingData = {
            title: values[0] || '',
            short_description: values[1] || '',
            description_md: values[7] || '',
            price_from: parseInt(values[5]) || 80000,
            price_to: parseInt(values[6]) || 150000,
            available_spots: parseInt(values[2]) || 2,
            is_published: true,
            is_active: true,
            image_urls: [
              'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=600&fit=crop',
              'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop'
            ],
            amenities,
            highlights,
            location: partnerInfo?.address || ''
          };

          if (!listingData.title.trim()) {
            errorCount++;
            continue;
          }

          const response = await fetch('/api/partner/listings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': user.id.toString()
            },
            body: JSON.stringify({
              userId: user.id,
              ...listingData
            })
          });

          const result = await response.json();
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          console.error('객실 등록 실패:', err);
          errorCount++;
        }
      }

      toast.success(`CSV 업로드 완료! 성공: ${successCount}건, 실패: ${errorCount}건`);
      loadPartnerData();
    } catch (error) {
      console.error('CSV 파일 읽기 실패:', error);
      toast.error('CSV 파일을 읽는데 실패했습니다.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadCSVTemplate = () => {
    const csv = `객실명,간단설명,인원,침대수,욕실수,최저가,최고가,상세설명
스탠다드 더블,편안한 더블룸,2,1,1,80000,120000,바다 전망을 즐길 수 있는 편안한 객실입니다.
디럭스 트윈,넓은 트윈룸,2,2,1,100000,150000,2개의 싱글 침대가 있는 넓은 객실입니다.
프리미엄 스위트,고급 스위트룸,4,2,2,150000,200000,거실과 침실이 분리된 프리미엄 객실입니다.
패밀리룸,가족 단위 객실,4,2,2,120000,180000,가족 여행에 적합한 넓은 객실입니다.`;

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rooms_template.csv';
    link.click();
    toast.success('CSV 템플릿이 다운로드되었습니다!');
  };

  // 예약 필터 적용
  const applyBookingFilters = () => {
    let filtered = [...bookings];

    if (bookingFilters.startDate) {
      filtered = filtered.filter(
        (b) => new Date(b.check_in_date) >= new Date(bookingFilters.startDate)
      );
    }
    if (bookingFilters.endDate) {
      filtered = filtered.filter(
        (b) => new Date(b.check_in_date) <= new Date(bookingFilters.endDate)
      );
    }

    if (bookingFilters.listingId) {
      filtered = filtered.filter(
        (b) => b.listing_id === parseInt(bookingFilters.listingId)
      );
    }

    if (bookingFilters.status) {
      filtered = filtered.filter((b) => b.status === bookingFilters.status);
    }

    if (bookingFilters.searchQuery) {
      const query = bookingFilters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.customer_name.toLowerCase().includes(query) ||
          b.id.toString().includes(query)
      );
    }

    setFilteredBookings(filtered);
  };

  const resetBookingFilters = () => {
    setBookingFilters({
      startDate: '',
      endDate: '',
      listingId: '',
      status: '',
      searchQuery: ''
    });
    setFilteredBookings(bookings);
  };

  useEffect(() => {
    applyBookingFilters();
  }, [bookingFilters, bookings]);

  const handleEditInfo = () => {
    setIsEditingInfo(true);
    setEditedInfo({
      business_name: partnerInfo?.business_name,
      contact_name: partnerInfo?.contact_name,
      contact_email: partnerInfo?.contact_email,
      contact_phone: partnerInfo?.contact_phone,
      address: partnerInfo?.address
    });
  };

  const handleCancelEdit = () => {
    setIsEditingInfo(false);
    setEditedInfo({});
  };

  const handleSaveInfo = async () => {
    if (!partnerInfo?.id || !user?.id) return;

    try {
      const response = await fetch('/api/partner/info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          userId: user.id,
          business_name: editedInfo.business_name,
          contact_name: editedInfo.contact_name,
          contact_email: editedInfo.contact_email,
          contact_phone: editedInfo.contact_phone,
          address: editedInfo.address
        })
      });

      const result = await response.json();
      if (result.success) {
        setPartnerInfo({
          ...partnerInfo,
          business_name: editedInfo.business_name!,
          contact_name: editedInfo.contact_name!,
          contact_email: editedInfo.contact_email!,
          contact_phone: editedInfo.contact_phone!,
          address: editedInfo.address!
        });

        setIsEditingInfo(false);
        setEditedInfo({});
        toast.success('파트너 정보가 수정되었습니다!');
      } else {
        toast.error(result.message || '정보 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('정보 수정 실패:', error);
      toast.error('정보 수정에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!partnerInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>파트너 정보 없음</CardTitle>
            <CardDescription>파트너 정보를 찾을 수 없습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')}>로그인 페이지로</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Hotel className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{partnerInfo.business_name}</h1>
              <p className="text-gray-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                숙박 파트너 대시보드
                {partnerInfo.is_verified && (
                  <Badge variant="default" className="ml-2">인증됨</Badge>
                )}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                등록 객실
              </CardTitle>
              <Hotel className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{listings.length}개</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                총 예약
              </CardTitle>
              <Calendar className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{bookings.length}건</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                이번 달 매출
              </CardTitle>
              <DollarSign className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {bookings
                  .filter(b => b.status === 'completed')
                  .reduce((sum, b) => sum + b.total_amount, 0)
                  .toLocaleString()}원
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 최근 7일 매출 차트 */}
        {revenueData.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>최근 7일 매출 추이</CardTitle>
              <CardDescription>
                일별 매출 현황 (확정 + 완료 예약 기준)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()}원`, '매출']}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 빠른 액션 버튼 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => setActiveTab('listings')}
          >
            <Hotel className="w-6 h-6" />
            <span>객실 관리</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => navigate('/partner/pms')}
          >
            <Zap className="w-6 h-6 text-purple-600" />
            <span className="text-purple-600 font-semibold">PMS 연동</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => navigate('/partner/pricing')}
          >
            <Tag className="w-6 h-6" />
            <span>요금 설정</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => setActiveTab('bookings')}
          >
            <Calendar className="w-6 h-6" />
            <span>예약 관리</span>
          </Button>
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2"
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="w-6 h-6" />
            <span>업체 정보</span>
          </Button>
        </div>

        {/* 탭 메뉴 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="listings">객실 관리</TabsTrigger>
            <TabsTrigger value="bookings">예약 관리</TabsTrigger>
            <TabsTrigger value="settings">업체 정보</TabsTrigger>
          </TabsList>

          {/* 객실 관리 */}
          <TabsContent value="listings">
            {/* 객실 추가/수정 폼 */}
            {isAddingListing && (
              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle>{isEditingListing ? '객실 수정' : '새 객실 등록'}</CardTitle>
                  <CardDescription>객실 정보를 입력해주세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>객실명 *</Label>
                      <Input
                        placeholder="예: 스탠다드 더블룸"
                        value={listingForm.title}
                        onChange={(e) => setListingForm({...listingForm, title: e.target.value})}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>간단 설명</Label>
                      <Input
                        placeholder="예: 편안한 더블 침대가 있는 스탠다드룸"
                        value={listingForm.short_description}
                        onChange={(e) => setListingForm({...listingForm, short_description: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label>최저가 (원)</Label>
                      <Input
                        type="number"
                        min="30000"
                        step="5000"
                        value={listingForm.price_from}
                        onChange={(e) => setListingForm({...listingForm, price_from: parseInt(e.target.value)})}
                      />
                    </div>

                    <div>
                      <Label>최고가 (원)</Label>
                      <Input
                        type="number"
                        min="50000"
                        step="5000"
                        value={listingForm.price_to}
                        onChange={(e) => setListingForm({...listingForm, price_to: parseInt(e.target.value)})}
                      />
                    </div>

                    <div>
                      <Label>최대 인원</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={listingForm.available_spots}
                        onChange={(e) => setListingForm({...listingForm, available_spots: parseInt(e.target.value)})}
                      />
                    </div>

                    <div>
                      <Label>위치</Label>
                      <Input
                        placeholder="예: 서울시 강남구"
                        value={listingForm.location}
                        onChange={(e) => setListingForm({...listingForm, location: e.target.value})}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>편의시설 (쉼표로 구분)</Label>
                      <Input
                        placeholder="예: WiFi, TV, 에어컨, 냉장고"
                        value={listingForm.amenities_text}
                        onChange={(e) => setListingForm({...listingForm, amenities_text: e.target.value})}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>하이라이트 (쉼표로 구분)</Label>
                      <Input
                        placeholder="예: 오션뷰, 조식 포함, 무료 주차"
                        value={listingForm.highlights_text}
                        onChange={(e) => setListingForm({...listingForm, highlights_text: e.target.value})}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>상세 설명 (Markdown)</Label>
                      <Textarea
                        placeholder="객실에 대한 상세 설명을 입력하세요 (Markdown 형식)"
                        value={listingForm.description_md}
                        onChange={(e) => setListingForm({...listingForm, description_md: e.target.value})}
                        rows={4}
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={listingForm.is_published}
                          onCheckedChange={(checked) => setListingForm({...listingForm, is_published: checked})}
                        />
                        <Label>공개</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={listingForm.is_active}
                          onCheckedChange={(checked) => setListingForm({...listingForm, is_active: checked})}
                        />
                        <Label>예약 가능</Label>
                      </div>
                    </div>

                    {/* 이미지 URL 입력 */}
                    <div className="md:col-span-2 border-t pt-4">
                      <Label className="mb-2 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        객실 이미지 URL (최대 5개)
                      </Label>
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="이미지 URL을 입력하세요"
                          value={currentImageUrl}
                          onChange={(e) => setCurrentImageUrl(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addImageUrl();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addImageUrl}
                          disabled={listingForm.image_urls.length >= 5}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {listingForm.image_urls.length > 0 && (
                        <div className="space-y-2">
                          {listingForm.image_urls.map((url, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                              <ImageIcon className="w-4 h-4 text-gray-400" />
                              <span className="flex-1 text-sm truncate">{url}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeImageUrl(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {listingForm.image_urls.length === 0 && (
                        <p className="text-sm text-gray-500">
                          이미지를 추가하지 않으면 기본 이미지가 사용됩니다.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Button onClick={handleSaveListing}>
                      {isEditingListing ? '수정' : '등록'}
                    </Button>
                    <Button variant="outline" onClick={handleCancelForm}>
                      취소
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>객실 목록</CardTitle>
                  <CardDescription>등록된 객실 {listings.length}개</CardDescription>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    CSV 업로드
                  </Button>
                  <Button variant="outline" onClick={downloadCSVTemplate}>
                    <FileUp className="w-4 h-4 mr-2" />
                    CSV 템플릿
                  </Button>
                  <Button onClick={handleAddListing} disabled={isAddingListing}>
                    <Plus className="w-4 h-4 mr-2" />
                    객실 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {listings.length === 0 ? (
                  <div className="text-center py-12">
                    <Hotel className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">등록된 객실이 없습니다.</p>
                    <Button onClick={handleAddListing}>
                      <Plus className="w-4 h-4 mr-2" />
                      첫 객실 등록하기
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>객실명</TableHead>
                        <TableHead>설명</TableHead>
                        <TableHead>인원</TableHead>
                        <TableHead>가격대</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listings.map((listing) => (
                        <TableRow key={listing.id}>
                          <TableCell className="font-medium">
                            {listing.title}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {listing.short_description}
                          </TableCell>
                          <TableCell>{listing.available_spots}명</TableCell>
                          <TableCell>
                            ₩{listing.price_from.toLocaleString()}~{listing.price_to.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={listing.is_active}
                                onCheckedChange={() => toggleListingAvailability(listing.id, listing.is_active)}
                              />
                              <Badge variant={listing.is_active ? 'default' : 'secondary'}>
                                {listing.is_active ? '예약 가능' : '예약 불가'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditListing(listing)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteListing(listing.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 예약 관리 */}
          <TabsContent value="bookings">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>예약 검색 및 필터</CardTitle>
                <CardDescription>
                  총 {bookings.length}건 중 {filteredBookings.length}건 표시
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label>체크인 시작</Label>
                    <Input
                      type="date"
                      value={bookingFilters.startDate}
                      onChange={(e) =>
                        setBookingFilters({ ...bookingFilters, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>체크인 종료</Label>
                    <Input
                      type="date"
                      value={bookingFilters.endDate}
                      onChange={(e) =>
                        setBookingFilters({ ...bookingFilters, endDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>객실 선택</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={bookingFilters.listingId}
                      onChange={(e) =>
                        setBookingFilters({ ...bookingFilters, listingId: e.target.value })
                      }
                    >
                      <option value="">전체 객실</option>
                      {listings.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>예약 상태</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={bookingFilters.status}
                      onChange={(e) =>
                        setBookingFilters({ ...bookingFilters, status: e.target.value })
                      }
                    >
                      <option value="">전체 상태</option>
                      <option value="pending">대기</option>
                      <option value="confirmed">확정</option>
                      <option value="completed">완료</option>
                      <option value="cancelled">취소</option>
                    </select>
                  </div>
                  <div>
                    <Label>고객명 / 예약번호 검색</Label>
                    <Input
                      type="text"
                      placeholder="홍길동 또는 예약번호"
                      value={bookingFilters.searchQuery}
                      onChange={(e) =>
                        setBookingFilters({ ...bookingFilters, searchQuery: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={resetBookingFilters}
                      className="w-full"
                    >
                      필터 초기화
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>예약 목록</CardTitle>
                <CardDescription>필터링된 예약 {filteredBookings.length}건</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">예약 내역이 없습니다.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>예약번호</TableHead>
                        <TableHead>객실</TableHead>
                        <TableHead>고객명</TableHead>
                        <TableHead>연락처</TableHead>
                        <TableHead>체크인</TableHead>
                        <TableHead>체크아웃</TableHead>
                        <TableHead>금액</TableHead>
                        <TableHead>상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>#{booking.id}</TableCell>
                          <TableCell className="font-medium">
                            {booking.room_name}
                          </TableCell>
                          <TableCell>{booking.customer_name}</TableCell>
                          <TableCell>{booking.customer_phone}</TableCell>
                          <TableCell>
                            {new Date(booking.check_in_date).toLocaleDateString('ko-KR')}
                          </TableCell>
                          <TableCell>
                            {new Date(booking.check_out_date).toLocaleDateString('ko-KR')}
                          </TableCell>
                          <TableCell>₩{booking.total_amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                booking.status === 'completed'
                                  ? 'default'
                                  : booking.status === 'confirmed'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {booking.status === 'completed'
                                ? '완료'
                                : booking.status === 'confirmed'
                                ? '확정'
                                : '대기'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 업체 정보 */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>파트너 정보</CardTitle>
                <CardDescription>업체 기본 정보 및 연락처</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>업체명</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.business_name || '') : partnerInfo.business_name}
                    onChange={(e) => setEditedInfo({ ...editedInfo, business_name: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div>
                  <Label>담당자</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.contact_name || '') : partnerInfo.contact_name}
                    onChange={(e) => setEditedInfo({ ...editedInfo, contact_name: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div>
                  <Label>이메일</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.contact_email || '') : partnerInfo.contact_email}
                    onChange={(e) => setEditedInfo({ ...editedInfo, contact_email: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div>
                  <Label>전화번호</Label>
                  <Input
                    value={isEditingInfo ? (editedInfo.contact_phone || '') : partnerInfo.contact_phone}
                    onChange={(e) => setEditedInfo({ ...editedInfo, contact_phone: e.target.value })}
                    disabled={!isEditingInfo}
                  />
                </div>
                <div>
                  <Label>주소</Label>
                  <Textarea
                    value={isEditingInfo ? (editedInfo.address || '') : (partnerInfo.address || '미등록')}
                    onChange={(e) => setEditedInfo({ ...editedInfo, address: e.target.value })}
                    disabled={!isEditingInfo}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  {!isEditingInfo ? (
                    <Button onClick={handleEditInfo}>
                      <Edit className="w-4 h-4 mr-2" />
                      정보 수정
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleSaveInfo}>
                        <Settings className="w-4 h-4 mr-2" />
                        저장
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit}>
                        취소
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default PartnerDashboardPageEnhanced;
