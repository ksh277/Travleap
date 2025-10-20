import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  MapPin,
  Clock,
  Users,
  Globe,
  Calendar,
  Share2,
  Heart,
  Star,
  Phone,
  Mail,
  Camera,
} from 'lucide-react';
import { toast } from 'sonner';

interface Partner {
  id: number;
  name: string;
  category: string;
  address: string;
  promotion: string;
  description: string;
  business_hours: string;
  phone: string;
  email: string;
  images: string[];
  location: string;
  rating: number;
  review_count: number;
  discount_rate?: number;
  member_since: string;
  base_price?: number;
}

export function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  // 예약 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    note: '',
  });

  useEffect(() => {
    loadPartnerDetail();
  }, [id]);

  const loadPartnerDetail = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // API 호출 - 환경에 따라 자동으로 URL 설정
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/partners/${id}`);
      const result = await response.json();

      if (result.success && result.data) {
        const partnerData = result.data;
        setPartner({
          id: partnerData.id,
          name: partnerData.business_name || partnerData.name,
          category: partnerData.category,
          address: partnerData.address || partnerData.business_address,
          promotion: partnerData.promotion || '',
          description: partnerData.description || partnerData.services,
          business_hours: partnerData.business_hours || '매일 09:00-18:00',
          phone: partnerData.phone || partnerData.contact_phone,
          email: partnerData.email || partnerData.contact_email,
          images: partnerData.images ? (typeof partnerData.images === 'string' ? JSON.parse(partnerData.images) : partnerData.images) : ['/images/placeholder.jpg'],
          location: partnerData.location || '신안, 대한민국',
          rating: partnerData.avg_rating || partnerData.rating || 0,
          review_count: partnerData.review_count || 0,
          discount_rate: partnerData.discount_rate,
          member_since: partnerData.created_at ? new Date(partnerData.created_at).getFullYear().toString() : new Date().getFullYear().toString(),
          base_price: partnerData.base_price || 0,
        });
      } else {
        throw new Error(result.message || '파트너 정보를 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('Failed to load partner:', error);
      toast.error(error instanceof Error ? error.message : '가맹점 정보를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: partner?.name,
        text: partner?.promotion,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 복사되었습니다');
    }
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    toast.success(isFavorited ? '찜 목록에서 제거되었습니다' : '찜 목록에 추가되었습니다');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('문의가 접수되었습니다. 곧 연락드리겠습니다.');
    setFormData({ name: '', email: '', phone: '', note: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">가맹점을 찾을 수 없습니다</p>
          <Button onClick={() => navigate('/partners')}>목록으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{partner.name} - Travleap</title>
        <meta name="description" content={partner.description} />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Hero Image Section */}
        <div className="relative h-[400px] md:h-[500px] overflow-hidden">
          <img
            src={partner.images[currentImageIndex]}
            alt={partner.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/images/placeholder.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40"></div>

          {/* Top Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-white/90 hover:bg-white"
              onClick={handleShare}
            >
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className={`rounded-full ${
                isFavorited ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/90 hover:bg-white'
              }`}
              onClick={handleFavorite}
            >
              <Heart className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''}`} />
            </Button>
          </div>

          {/* Image Counter */}
          {partner.images.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
              <Camera className="h-4 w-4" />
              더 사진
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title & Location */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                  {partner.name}
                </h1>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <MapPin className="h-5 w-5" />
                  <span className="text-sm">{partner.location}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{partner.rating || '지'}</span>
                    <span className="text-gray-600">평가</span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">{partner.review_count} 리뷰</span>
                </div>
              </div>

              {/* Info Icons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200">
                  <Clock className="h-6 w-6 text-purple-600 mb-2" />
                  <span className="text-sm text-gray-600">기간</span>
                  <span className="text-sm font-medium">___</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200">
                  <Users className="h-6 w-6 text-purple-600 mb-2" />
                  <span className="text-sm text-gray-600">최소 연령</span>
                  <span className="text-sm font-medium">회대 7일</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200">
                  <Users className="h-6 w-6 text-purple-600 mb-2" />
                  <span className="text-sm text-gray-600">그룹 크기</span>
                  <span className="text-sm font-medium">1명</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200">
                  <Globe className="h-6 w-6 text-purple-600 mb-2" />
                  <span className="text-sm text-gray-600">언어</span>
                  <span className="text-sm font-medium">___</span>
                </div>
              </div>

              {/* Overview Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">개요</h2>
                <div className="space-y-3 text-gray-700">
                  <div>
                    <span className="font-semibold">주소 :</span> {partner.address}
                  </div>
                  {partner.promotion && (
                    <div>
                      <span className="font-semibold">프로모션 :</span> {partner.promotion}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">내용 :</span> {partner.description}
                  </div>
                  <div>
                    <span className="font-semibold">영업시간 :</span> {partner.business_hours}
                  </div>
                </div>
              </div>

              {/* Map Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">활동의 위치</h2>
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <MapPin className="h-5 w-5" />
                  <span className="text-sm">{partner.location}</span>
                </div>
                <div className="w-full h-[400px] bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <p className="mb-2">Google 지도를 제대로 로드할 수 없습니다.</p>
                    <p className="text-sm">이 웹사이트의 소유자이신가요? 확인</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 space-y-6">
                {/* Price Card */}
                <Card className="overflow-hidden">
                  <div className="bg-purple-600 text-white p-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm">from</span>
                      <span className="text-3xl font-bold">
                        {partner.base_price && partner.base_price > 0
                          ? `${partner.base_price.toLocaleString()}원`
                          : '가격 문의'}
                      </span>
                    </div>
                    {partner.discount_rate && (
                      <Badge className="absolute top-4 right-4 bg-red-500">
                        {partner.discount_rate}%
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-4">조회</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">이름*</label>
                        <Input
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="이름을 입력하세요"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">이메일*</label>
                        <Input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="이메일을 입력하세요"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">전화*</label>
                        <Input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="전화번호를 입력하세요"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Note*</label>
                        <Textarea
                          required
                          value={formData.note}
                          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                          placeholder="문의 내용을 입력하세요"
                          rows={4}
                        />
                      </div>
                      <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                        보내기
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Host Info Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-4">주최</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-bold">T</span>
                      </div>
                      <div>
                        <div className="font-semibold">{partner.name}</div>
                        <div className="text-sm text-gray-600">travleap</div>
                        <div className="text-xs text-gray-500">Member Since {partner.member_since}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4].map((star) => (
                        <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                      <Star className="h-4 w-4 text-gray-300" />
                    </div>
                    <div className="text-sm text-gray-600">{partner.review_count || 7} 리뷰</div>
                  </CardContent>
                </Card>

                {/* Contact Info Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold mb-4">연락처 정보</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-purple-600" />
                        <span className="text-sm">{partner.phone}</span>
                      </div>
                      {partner.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-purple-600" />
                          <span className="text-sm">{partner.email}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Nearby Partners Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">근처 제휴 프로모션 추천</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Placeholder for nearby partners - will be populated dynamically */}
              <div className="text-center text-gray-500 col-span-full py-8">
                근처 프로모션을 불러오는 중...
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
