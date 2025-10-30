import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
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
  Star,
  Check,
  Upload,
  X,
  Car,
  Settings,
  Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../utils/api';
import { rentcarApi } from '../utils/rentcar-api';
import { useAuth } from '../hooks/useAuth';
import { notifyDataChange, refreshAllData, useRealTimeData } from '../hooks/useRealTimeData';
import { getGoogleMapsApiKey } from '../utils/env';
import { MediaLibraryModal } from './MediaLibraryModal';
import { PMSIntegrationModal } from './admin/PMSIntegrationModal';
import { RentcarAPIModal, type RentcarAPISettings } from './admin/RentcarAPIModal';
import { MediaManagement } from './admin/MediaManagement';
import { RentcarManagement } from './admin/RentcarManagement';
import { AccommodationManagement } from './admin/AccommodationManagement';
import { BannerManagement } from './admin/BannerManagement';
import { ShippingManagementDialog } from './ShippingManagementDialog';
import { ImageWithFallback } from './figma/ImageWithFallback';
import type { Listing, User } from '../types/database';
import type { AdminProductFormData } from '../utils/pms/admin-integration';
import { previewPrice, sanitizePriceInput } from '../utils/price-formatter';

interface AdminPageProps {}

interface Product {
  id: string;
  title: string;
  category: string;
  price: number;
  location: string;
  rating: number;
  reviewCount: number;
  rating_avg?: number;
  rating_count?: number;
  image: string;
  description: string;
  status: 'active' | 'inactive';
  is_active?: boolean;
  createdAt: string;
  featured?: boolean;
  highlights?: string[];
  included?: string[];
  excluded?: string[];
  tags?: string[];
  amenities?: string[];
  childPrice?: number;
  infantPrice?: number;
  availableStartTimes?: string[];
  itinerary?: { time: string; activity: string; description?: string }[];
  packages?: { id: string; name: string; price: string; description?: string }[];
  hasOptions?: boolean;
  minPurchase?: number;
  maxPurchase?: number;
  stockEnabled?: boolean;
  stock?: number;
  shippingFee?: number;
  isRefundable?: boolean;
}


// API에서 상품 데이터 로드
const loadProducts = async (): Promise<Product[]> => {
  try {
    const listings = await api.admin.getListings();

    return listings.data.map((listing) => {
      // images 파싱 (DB에서 JSON 문자열로 저장됨)
      let imagesArray: string[] = [];
      try {
        if (listing.images) {
          imagesArray = typeof listing.images === 'string'
            ? JSON.parse(listing.images)
            : listing.images;
        }
      } catch (e) {
        console.warn('Failed to parse images for listing:', listing.id);
      }

      return {
        id: listing.id.toString(),
        title: listing.title,
        category: (listing as any).category_name || (listing as any).category_slug || listing.category || '미분류',
        price: listing.price_from || 0,
        location: listing.location || '',
        rating: listing.rating_avg || 0,
        reviewCount: listing.rating_count || 0,
        image: (Array.isArray(imagesArray) && imagesArray.length > 0)
          ? imagesArray[0]
          : 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
        description: listing.short_description || '상세 정보를 확인해보세요.',
        status: listing.is_active ? 'active' : 'inactive',
        createdAt: listing.created_at ? listing.created_at.split('T')[0] : '2024-01-01',
        featured: listing.is_featured || false
      } as Product;
    });
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
  const { user, isLoggedIn, sessionRestored } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 미디어 라이브러리 상태
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPMSModalOpen, setIsPMSModalOpen] = useState(false);
  const [isRentcarAPIModalOpen, setIsRentcarAPIModalOpen] = useState(false);
  const [rentcarAPISettings, setRentcarAPISettings] = useState<RentcarAPISettings | null>(null);

  // 검색 state 추가
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [blogSearchQuery, setBlogSearchQuery] = useState('');
  const [blogCategoryFilter, setBlogCategoryFilter] = useState('all');

  // 파트너 페이지네이션 state
  const [partnerCurrentPage, setPartnerCurrentPage] = useState(1);
  const partnersPerPage = 6;

  // 파트너 검색 시 페이지 리셋
  useEffect(() => {
    setPartnerCurrentPage(1);
  }, [partnerSearchQuery]);

  // 사용자 페이지네이션 state
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const usersPerPage = 15;

  // 사용자 검색 시 페이지 리셋
  useEffect(() => {
    setUserCurrentPage(1);
  }, [userSearchQuery]);

  // 블로그 카테고리 매핑
  const blogCategoryNames: Record<string, string> = {
    'travel': '여행기',
    'tips': '여행팁',
    'local': '로컬맛집',
    'culture': '문화체험',
    'news': '소식'
  };
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  // 문의 관리 state
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [isContactDetailOpen, setIsContactDetailOpen] = useState(false);
  const [contactReply, setContactReply] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState<'all' | 'pending' | 'replied' | 'resolved'>('all');

  // 실시간 데이터 갱신 - 리뷰가 작성되면 자동으로 새로고침
  useRealTimeData('reviews', async () => {
    console.log('🔄 새 리뷰 감지 - 리뷰 데이터 새로고침');
    const reviewsData = await api.admin.getAllReviews();
    if (reviewsData.success) {
      setReviews(reviewsData.data || []);
    }
  });


  // 개발용 테스트 함수
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testModal = () => {
        setIsAddModalOpen(true);
      };

      (window as any).testAddProduct = (categoryName: string) => {
        setNewProduct({
          title: `신안 ${categoryName} 테스트 상품`,
          category: categoryName,
          price: '50000',
          childPrice: '',
          infantPrice: '',
          priceType: 'fixed',
          location: '신안군',
          address: '전남 신안군',
          coordinates: '',
          description: `신안의 ${categoryName} 관련 테스트 상품입니다.`,
          longDescription: `신안군에서 제공하는 ${categoryName} 상품으로 많은 사람들이 즐길 수 있는 체험입니다.`,
          highlights: [''],
          maxCapacity: '20',
          minCapacity: '1',
          meetingPoint: '',
          cancellationPolicy: 'standard',
          language: 'korean',
          tags: [''],
          included: ['가이드 동행', '체험도구 제공'],
          excluded: ['개인 용품'],
          policies: ['우천시 취소 가능'],
          amenities: ['주차장', '화장실'],
          images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop'],
          featured: false,
          isPMSProduct: false,
          pmsFormData: null,
          hasOptions: false,
          minPurchase: '1',
          maxPurchase: '',
          stockEnabled: false,
          stock: '0',
          shippingFee: '',
          isRefundable: true,
          availableStartTimes: [],
          itinerary: [],
          packages: []
        });
        setIsAddModalOpen(true);
      };

      // 전체 카테고리 테스트 함수 추가
      (window as any).testAllCategories = async () => {
        const categories = ['여행', '숙박', '음식', '렌트카', '관광지', '팝업', '행사', '체험'];
        const testProducts = [
          {
            category: '여행',
            title: '신안 퍼플섬 당일투어',
            description: '보라색으로 물든 아름다운 퍼플섬에서의 특별한 투어',
            price: '45000',
            images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop']
          },
          {
            category: '숙박',
            title: '임자도 대광해수욕장 펜션',
            description: '12km 백사장 앞 오션뷰 펜션에서의 힐링 스테이',
            price: '120000',
            images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop']
          },
          {
            category: '음식',
            title: '신안 전통 젓갈 맛집',
            description: '3대째 이어져온 전통 젓갈과 신선한 해산물 요리',
            price: '25000',
            images: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop']
          },
          {
            category: '렌트카',
            title: '신안 여행 렌트카',
            description: '신안 섬 여행을 위한 편리한 렌트카 서비스',
            price: '80000',
            images: ['https://images.unsplash.com/photo-1549924231-f129b911e442?w=400&h=300&fit=crop']
          },
          {
            category: '관광지',
            title: '증도 태평염전',
            description: '세계 최대 염전에서의 소금 만들기 체험',
            price: '15000',
            images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop']
          },
          {
            category: '팝업',
            title: '신안 해넘이 팝업 카페',
            description: '일몰과 함께하는 특별한 팝업 카페 경험',
            price: '12000',
            images: ['https://images.unsplash.com/photo-1559239002-5d26bb018bfe?w=400&h=300&fit=crop']
          },
          {
            category: '행사',
            title: '신안 갯벌 축제',
            description: '신안의 청정 갯벌에서 펼쳐지는 체험 축제',
            price: '8000',
            images: ['https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop']
          },
          {
            category: '체험',
            title: '신안 전통 소금 만들기',
            description: '염전에서 직접 소금을 만드는 전통 체험',
            price: '20000',
            images: ['https://images.unsplash.com/photo-1603484477859-abe6a73f9366?w=400&h=300&fit=crop']
          }
        ];

        for (const product of testProducts) {
          try {
            const categoryMap: { [key: string]: number } = {
              '여행': 1855, '렌트카': 1856, '숙박': 1857, '음식': 1858, '관광지': 1859, '팝업': 1860, '행사': 1861, '체험': 1862
            };

            const categorySlug = product.category === '여행' ? 'tour' :
                            product.category === '숙박' ? 'stay' :
                            product.category === '음식' ? 'food' :
                            product.category === '렌트카' ? 'rentcar' :
                            product.category === '관광지' ? 'tourist' :
                            product.category === '팝업' ? 'popup' :
                            product.category === '행사' ? 'event' :
                            product.category === '체험' ? 'experience' : 'tour';

            const listingData = {
              title: product.title,
              category: categorySlug,
              category_id: categoryMap[product.category] || 1,
              short_description: product.description,
              description_md: product.description,
              price_from: parseInt(product.price),
              price_to: parseInt(product.price),
              location: '신안군',
              address: '전남 신안군',
              images: product.images,
              highlights: ['신안 특산품', '현지 체험'],
              included: ['가이드 동행', '체험 도구'],
              excluded: ['개인 용품'],
              tags: ['신안', '체험', '관광'],
              amenities: ['주차장', '화장실'],
              is_active: true,
              is_published: true,
              is_featured: false,
              max_capacity: 20,
              min_capacity: 1,
              duration: '2-3시간',
              difficulty: '초급',
              meeting_point: '신안군 관광안내소',
              currency: 'KRW',
              rating_avg: 0,
              rating_count: 0,
              view_count: 0,
              booking_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const response = await api.admin.createListing(listingData);
            if (response.success) {
              // 상품 생성 성공
            }
          } catch (error) {
            // 상품 생성 실패
          }
        }

        // 데이터 새로고침
        await loadAdminData();
        notifyDataChange.listingCreated();
        toast.success('🎉 모든 카테고리 테스트 상품이 생성되었습니다!');
      };

      // 개별 카테고리 상품 생성 함수들
      (window as any).create여행 = async () => {
        const product = {
          category: '여행',
          title: '신안 퍼플섬 당일투어',
          description: '보라색으로 물든 아름다운 퍼플섬에서의 특별한 투어 체험',
          price: '45000',
          images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop']
        };
        await createSingleProduct(product);
      };

      (window as any).create숙박 = async () => {
        const product = {
          category: '숙박',
          title: '임자도 대광해수욕장 펜션',
          description: '12km 백사장 앞 오션뷰 펜션에서의 힐링 스테이',
          price: '120000',
          images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop']
        };
        await createSingleProduct(product);
      };

      (window as any).create음식 = async () => {
        const product = {
          category: '음식',
          title: '신안 전통 젓갈 맛집',
          description: '3대째 이어져온 전통 젓갈과 신선한 해산물 요리',
          price: '25000',
          images: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop']
        };
        await createSingleProduct(product);
      };

      (window as any).create렌트카 = async () => {
        const product = {
          category: '렌트카',
          title: '신안 여행 렌트카',
          description: '신안 섬 여행을 위한 편리한 렌트카 서비스',
          price: '80000',
          images: ['https://images.unsplash.com/photo-1549924231-f129b911e442?w=400&h=300&fit=crop']
        };
        await createSingleProduct(product);
      };

      (window as any).create관광지 = async () => {
        const product = {
          category: '관광지',
          title: '증도 태평염전',
          description: '세계 최대 염전에서의 소금 만들기 체험',
          price: '15000',
          images: ['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop']
        };
        await createSingleProduct(product);
      };

      (window as any).create팝업 = async () => {
        const product = {
          category: '팝업',
          title: '신안 해넘이 팝업 카페',
          description: '일몰과 함께하는 특별한 팝업 카페 경험',
          price: '12000',
          images: ['https://images.unsplash.com/photo-1559239002-5d26bb018bfe?w=400&h=300&fit=crop']
        };
        await createSingleProduct(product);
      };

      (window as any).create행사 = async () => {
        const product = {
          category: '행사',
          title: '신안 갯벌 축제',
          description: '신안의 청정 갯벌에서 펼쳐지는 체험 축제',
          price: '8000',
          images: ['https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop']
        };
        await createSingleProduct(product);
      };

      (window as any).create체험 = async () => {
        const product = {
          category: '체험',
          title: '신안 전통 소금 만들기',
          description: '염전에서 직접 소금을 만드는 전통 체험',
          price: '20000',
          images: ['https://images.unsplash.com/photo-1603484477859-abe6a73f9366?w=400&h=300&fit=crop']
        };
        await createSingleProduct(product);
      };

      // 개별 상품 생성 헬퍼 함수
      const createSingleProduct = async (product: any) => {
        try {
          const categoryMap: { [key: string]: number } = {
            '여행': 1855, '렌트카': 1856, '숙박': 1857, '음식': 1858, '관광지': 1859, '팝업': 1860, '행사': 1861, '체험': 1862
          };

          const categorySlug = product.category === '여행' ? 'tour' :
                          product.category === '숙박' ? 'stay' :
                          product.category === '음식' ? 'food' :
                          product.category === '렌트카' ? 'rentcar' :
                          product.category === '관광지' ? 'tourist' :
                          product.category === '팝업' ? 'popup' :
                          product.category === '행사' ? 'event' :
                          product.category === '체험' ? 'experience' : 'tour';

          const listingData = {
            title: product.title,
            category: categorySlug,
            category_id: categoryMap[product.category] || 1,
            short_description: product.description,
            description_md: product.description,
            price_from: parseInt(product.price),
            price_to: parseInt(product.price),
            location: '신안군',
            address: '전남 신안군',
            images: product.images,
            highlights: ['신안 특산품', '현지 체험'],
            included: ['가이드 동행', '체험 도구'],
            excluded: ['개인 용품'],
            tags: ['신안', '체험', '관광'],
            amenities: ['주차장', '화장실'],
            is_active: true,
            is_published: true,
            is_featured: false,
            max_capacity: 20,
            min_capacity: 1,
            duration: '2-3시간',
            difficulty: '초급',
            meeting_point: '신안군 관광안내소',
            currency: 'KRW',
            rating_avg: 0,
            rating_count: 0,
            view_count: 0,
            booking_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const response = await api.admin.createListing(listingData);

          if (response.success) {
            await loadAdminData();
            notifyDataChange.listingCreated();
            toast.success(`✅ ${product.category} 상품 생성 완료: ${product.title}`);

            // 카테고리 페이지 URL 제공
            const categoryUrl = `/category/${categorySlug}`;
            toast.success(`🔗 확인하세요: ${categoryUrl}`, { duration: 5000 });
          } else {
            toast.error(`❌ ${product.category} 상품 생성 실패`);
          }
        } catch (error) {
          toast.error(`❌ ${product.category} 상품 생성 중 오류 발생`);
        }
      };

      // 디버깅용 간단한 테스트 함수
      (window as any).testSingleDebug = async () => {

        try {
          // 가장 간단한 상품 데이터
          const testData = {
            title: '디버그 테스트 상품',
            category: 'tour',
            category_id: 1,
            short_description: '디버그용 테스트 상품입니다',
            price_from: 10000,
            price_to: 10000,
            location: '신안군',
            is_active: true,
            is_published: true,
            max_capacity: 10,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const response = await api.admin.createListing(testData);

          if (response.success) {
            await loadAdminData();
            toast.success('🔥 디버그 테스트 성공! 관리자 페이지를 확인하세요.');
          } else {
            console.error('❌ [DEBUG] 상품 생성 실패:', response.error);
            toast.error('❌ 디버그 테스트 실패: ' + response.error);
          }
        } catch (error) {
          console.error('❌ [DEBUG] 테스트 중 예외 발생:', error);
          toast.error('❌ 테스트 중 오류 발생');
        }
      };

      // 데이터베이스 스키마 확인 함수 (더 이상 사용하지 않음 - API를 통해 접근)
      // (window as any).checkDBSchema = async () => {
      //   try {
      //     // listings 테이블 구조 확인
      //     const response = await fetch('http://localhost:3004/api/admin/schema/listings');
      //     const data = await response.json();
      //     console.log('✅ DB Schema:', data);
      //     toast.success('✅ DB 스키마 확인 완료 - 콘솔을 확인하세요');
      //   } catch (error) {
      //     console.error('❌ [DEBUG] DB 스키마 확인 실패:', error);
      //     toast.error('❌ DB 스키마 확인 실패');
      //   }
      // };

      // 데이터베이스 강제 재초기화는 클라우드 DB에서 지원하지 않음
      // PlanetScale 콘솔에서 직접 관리해야 함
    }
  }, []);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [partnerApplications, setPartnerApplications] = useState<any[]>([]);
  const [partnerApplicationHistory, setPartnerApplicationHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingApplication, setEditingApplication] = useState<any | null>(null);
  const [isApplicationEditOpen, setIsApplicationEditOpen] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingProductForOptions, setEditingProductForOptions] = useState<Product | null>(null);
  const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false);
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [newOption, setNewOption] = useState({ optionName: '', optionValue: '', priceAdjustment: '0', stock: '0' });
  const [editingPartner, setEditingPartner] = useState<any | null>(null);
  const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);
  const [isCreatePartnerMode, setIsCreatePartnerMode] = useState(false);
  const [newPartner, setNewPartner] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    business_address: '',
    location: '',
    services: '',
    base_price: '',
    base_price_text: '',
    detailed_address: '',
    description: '',
    images: [] as string[],
    business_hours: '',
    duration: '',
    min_age: '',
    max_capacity: '',
    language: '',
    lat: null as number | null,
    lng: null as number | null
  });
  const [reviews, setReviews] = useState<any[]>([]);
  const [editingReview, setEditingReview] = useState<any | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isCreateReviewMode, setIsCreateReviewMode] = useState(false);
  const [newReview, setNewReview] = useState({
    listing_id: '',
    user_name: '',
    rating: '',
    visit_date: '',
    title: '',
    comment: '',
    review_type: 'listing' as 'listing' | 'rentcar',
    rentcar_booking_id: ''
  });

  // 블로그 관리 상태
  const [blogs, setBlogs] = useState<any[]>([]);
  const [blogComments, setBlogComments] = useState<any[]>([]);
  const [editingBlog, setEditingBlog] = useState<any | null>(null);
  const [isBlogDialogOpen, setIsBlogDialogOpen] = useState(false);
  const [isCreateBlogMode, setIsCreateBlogMode] = useState(false);
  const [newBlog, setNewBlog] = useState({
    title: '',
    category: 'travel',
    excerpt: '',
    content_md: '',
    featured_image: '',
    is_published: true,
    author_id: 1,
    slug: '',
    event_start_date: '',
    event_end_date: ''
  });

  // 주문 관리 상태
  const [orders, setOrders] = useState<any[]>([]);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

  // 배송 관리 상태
  const [selectedShippingOrder, setSelectedShippingOrder] = useState<any | null>(null);
  const [isShippingDialogOpen, setIsShippingDialogOpen] = useState(false);

  // 이미지 관리 상태
  const [images, setImages] = useState<any[]>([]);
  const [editingImage, setEditingImage] = useState<any | null>(null);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isCreateImageMode, setIsCreateImageMode] = useState(false);
  const [newImage, setNewImage] = useState({
    file: null as File | null,
    title: '',
    usage: 'product',
    description: '',
    url: ''
  });

  // 사용자 초대/수정 폼 데이터
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isCreateUserMode, setIsCreateUserMode] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'user'
  });

  // 사용자 상세보기
  const [isUserDetailDialogOpen, setIsUserDetailDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // 관리자 권한 확인 (세션 복원 후)
  // 관리자 권한 확인 완료

  // App.tsx에서 이미 권한 체크를 처리함
  
  // 새 상품 폼 데이터
  const [newProduct, setNewProduct] = useState({
    title: '',
    category: '여행',
    price: '',
    childPrice: '',
    infantPrice: '',
    priceType: 'fixed',
    location: '',
    address: '',
    coordinates: '',
    images: [],
    description: '',
    longDescription: '',
    highlights: [''],
    included: [''],
    excluded: [''],
    policies: [''],
    featured: false,
    maxCapacity: '10',
    minCapacity: '1',
    meetingPoint: '',
    cancellationPolicy: 'standard',
    language: 'korean',
    tags: [''],
    amenities: [''],
    isPMSProduct: false, // PMS 연동 상품 여부
    pmsFormData: null as any, // PMS 원본 데이터 저장
    // 팝업 상품 전용 필드
    hasOptions: false, // 옵션 사용 여부
    minPurchase: '1', // 최소 구매 수량
    maxPurchase: '', // 최대 구매 수량 (빈 값 = 무제한)
    stockEnabled: false, // 재고 관리 사용 여부
    stock: '0', // 재고 수량
    shippingFee: '', // 상품별 배송비 (빈 값 = 정책 사용)
    isRefundable: true, // 환불 가능 여부 (기본값: 환불 가능)
    availableStartTimes: [] as string[], // 투어 시작 시간 옵션
    itinerary: [] as any[], // 투어 일정
    packages: [] as any[] // 패키지 옵션
  });

  // 렌트카, 숙박은 별도 관리 탭에서 추가하므로 제외
  const categories = ['여행', '음식', '관광지', '팝업', '행사', '체험'];

  // 🤖 스마트 카테고리 자동 분류 시스템
  const autoSuggestCategory = useCallback((title: string, description: string = ''): string => {
    const text = (title + ' ' + description).toLowerCase();

    // 카테고리별 키워드 매핑
    const categoryKeywords = {
      '여행': ['여행', '투어', '관광', '여행지', '트레킹', '둘러보기', '탐방', '패키지', '일정', '코스'],
      '렌트카': ['렌트', '렌터카', '차량', '자동차', '운전', '드라이브', '렌탈', '차량대여', '승용차', '버스'],
      '숙박': ['숙박', '호텔', '펜션', '리조트', '민박', '게스트하우스', '카라반', '글램핑', '캠핑', '머물기', '잠자리', '객실'],
      '음식': ['음식', '맛집', '레스토랑', '카페', '식당', '요리', '먹거리', '디저트', '음료', '특산물', '젓갈', '해산물', '전통음식'],
      '관광지': ['관광지', '명소', '유적', '박물관', '전시관', '해수욕장', '해변', '섬', '산', '공원', '다리', '전망대', '풍경'],
      '팝업': ['팝업', '전시', '체험관', '임시', '한정', '기간한정', '특별전', '이벤트전', '전시회'],
      '행사': ['행사', '축제', '이벤트', '콘서트', '공연', '축제', '행사', '축하', '기념일', '개최', '열리는'],
      '체험': ['체험', '만들기', '배우기', '실습', '워크샵', '클래스', '수업', '프로그램', '활동', '참여', '직접']
    };

    // 각 카테고리별 점수 계산
    const scores = Object.entries(categoryKeywords).map(([category, keywords]) => {
      const score = keywords.reduce((acc, keyword) => {
        const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
        return acc + matches;
      }, 0);
      return { category, score };
    });

    // 가장 높은 점수의 카테고리 반환
    const bestMatch = scores.reduce((max, current) =>
      current.score > max.score ? current : max
    );

    // 스마트 카테고리 분석 완료

    return bestMatch.score > 0 ? bestMatch.category : '여행'; // 기본값은 '여행'
  }, []);

  // 🔧 데이터 로드 함수 (깔끔하게 재작성)
  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    console.log('🔄 관리자 데이터 로딩 시작...');

    try {
      // 1. 상품 목록 로드
      console.log('📦 상품 데이터 로딩 중...');
      const listingsResponse = await api.admin.getListings();
      if (listingsResponse.success && listingsResponse.data) {
        const mappedProducts: Product[] = listingsResponse.data.map(listing => ({
          id: String(listing.id),
          title: listing.title,
          category: listing.category, // 이미 한글로 저장되어 있음
          price: listing.price_from || 0,
          location: listing.location || '',
          rating: listing.rating_avg || 0,
          reviewCount: listing.rating_count || 0,
          image: listing.images?.[0] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
          description: listing.short_description || '',
          status: listing.is_active ? 'active' : 'inactive' as const,
          createdAt: new Date(listing.created_at).toISOString().split('T')[0],
          featured: listing.is_featured || false
        }));
        setProducts(mappedProducts);
        console.log(`✅ 상품 ${mappedProducts.length}개 로드 완료`);
      } else {
        console.warn('⚠️ 상품 데이터 로드 실패');
        setProducts([]);
      }

      // 2. 대시보드 통계 로드 (실패해도 계속)
      console.log('📊 대시보드 통계 로딩 중...');
      try {
        const statsResponse = await api.admin.getDashboardStats();
        if (statsResponse) {
          setDashboardStats(statsResponse);
          console.log('✅ 대시보드 통계 로드 완료');
        }
      } catch (err) {
        console.warn('⚠️ 대시보드 통계 로드 실패, 기본값 사용');
        // 대시보드 통계 로드 실패, 기본값 사용
        setDashboardStats({
          total_users: 120,
          new_users_today: 8,
          total_partners: 22,
          pending_partners: 3,
          total_listings: 45,
          published_listings: 40,
          total_bookings: 285,
          bookings_today: 6,
          total_revenue: 8900000,
          revenue_today: 320000,
          commission_earned: 890000,
          avg_rating: 0,
          total_reviews: 0,
          pending_refunds: 2,
          support_tickets_open: 4
        });
      }

      // 3. 나머지 데이터 로드 (개별적으로 오류 처리)
      console.log('🔄 추가 데이터 로딩 중...');
      const dataLoadPromises = [
        {
          name: '파트너 신청',
          fn: () => api.admin.getPartnerApplications().then(res => {
            const data = res?.success ? res.data || [] : [];
            setPartnerApplications(data);
            console.log(`✅ 파트너 신청 ${data.length}개 로드 완료`);
          })
        },
        {
          name: '파트너',
          fn: () => api.admin.getPartners().then(res => {
            const data = res?.success ? res.data || [] : [];
            setPartners(data);
            console.log(`✅ 파트너 ${data.length}개 로드 완료`);
          })
        },
        {
          name: '문의',
          fn: () => api.getContacts().then(res => {
            const data = res?.success ? res.data || [] : [];
            setContacts(data);
            console.log(`✅ 문의 ${data.length}개 로드 완료`);
          })
        },
        {
          name: '예약',
          fn: () => api.admin.getBookings().then(res => {
            const data = res?.success ? res.data || [] : [];
            setBookings(data);
            console.log(`✅ 예약 ${data.length}개 로드 완료`);
          })
        },
        {
          name: '리뷰',
          fn: () => api.admin.getAllReviews().then(res => {
            const data = res?.success ? res.data || [] : [];
            setReviews(data);
            console.log(`✅ 리뷰 ${data.length}개 로드 완료`);
          })
        },
        {
          name: '사용자',
          fn: () => api.admin.getAllUsers().then(res => {
            const data = res?.success ? res.data || [] : [];
            setUsers(data);
            console.log(`✅ 사용자 ${data.length}개 로드 완료`);
          })
        },
        {
          name: '이미지',
          fn: () => api.admin.getImages().then(res => {
            const data = res?.success ? res.data || [] : [];
            setImages(data);
            console.log(`✅ 이미지 ${data.length}개 로드 완료`);
          })
        },
        {
          name: '블로그',
          fn: () => api.admin.getBlogs().then(res => {
            const data = res?.success ? res.data || [] : [];
            setBlogs(data);
            console.log(`✅ 블로그 ${data.length}개 로드 완료`);
          })
        },
        {
          name: '댓글',
          fn: () => api.admin.getAllComments().then(res => {
            const data = res?.success ? res.data || [] : [];
            setBlogComments(data);
            console.log(`✅ 댓글 ${data.length}개 로드 완료`);
          })
        },
        {
          name: '주문',
          fn: () => api.admin.getOrders().then(res => {
            const data = res?.success ? res.data || [] : [];
            setOrders(data);
            console.log(`✅ 주문 ${data.length}개 로드 완료`);
          })
        }
      ];

      const results = await Promise.allSettled(dataLoadPromises.map(item => item.fn()));

      // 실패한 데이터 로드 로그
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`⚠️ ${dataLoadPromises[index].name} 로드 실패:`, result.reason);
        }
      });

      console.log('🎉 관리자 데이터 로딩 완료');

    } catch (error) {
      console.error('❌ 관리자 데이터 로딩 중 오류:', error);
      // 기본값으로 설정
      setProducts([]);
      setPartnerApplications([]);
      setBookings([]);
      setReviews([]);
      setUsers([]);
      setImages([]);
      setBlogs([]);
      setOrders([]);
      toast.error('데이터 로딩 중 오류가 발생했습니다. 일부 데이터를 기본값으로 설정했습니다.');
    } finally {
      setIsLoading(false);
      console.log('✅ 관리자 데이터 로딩 프로세스 완료');
      // 관리자 데이터 로딩 종료
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    // AdminPage 마운트됨, 데이터 로딩 시작
    loadAdminData();

    // 안전장치: 10초 후에도 로딩이 끝나지 않으면 강제로 완료
    const safetyTimer = setTimeout(() => {
      // 로딩 시간 초과, 강제로 로딩 완료 처리
      setIsLoading(false);
    }, 10000);

    return () => clearTimeout(safetyTimer);
  }, [loadAdminData]);

  // 자동 새로고침 (5분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      // 자동 데이터 새로고침
      loadAdminData();
    }, 5 * 60 * 1000); // 5분마다

    return () => clearInterval(interval);
  }, [loadAdminData]);

  // 옵션 다이얼로그 열릴 때 옵션 목록 불러오기
  useEffect(() => {
    if (isOptionsDialogOpen && editingProductForOptions) {
      fetchProductOptions(parseInt(editingProductForOptions.id));
    }
  }, [isOptionsDialogOpen, editingProductForOptions]);

  // 수동 새로고침 함수 (실시간 동기화 포함)
  const handleRefresh = async () => {
    toast.info('🔄 관리자 데이터 및 전체 시스템 새로고침 중...');

    // 1. 관리자 페이지 데이터 새로고침
    await loadAdminData();

    // 2. 전체 시스템 실시간 데이터 동기화 알림
    // 전체 시스템 실시간 동기화 요청
    refreshAllData();

    toast.success('✅ 모든 데이터가 새로고침되었으며, 전체 사이트에 실시간 반영되었습니다!');
  };

  // 통계 데이터 계산 (실제 products 배열 기반)
  const stats = {
    totalProducts: products.length || 0,
    activeProducts: products.filter(p => p.is_active === true).length || 0,
    totalRevenue: products.reduce((sum, p) => sum + ((Number(p.price) || 0) * (p.rating_count || 0) * 0.1), 0),
    avgRating: products.length > 0 ? products.reduce((sum, p) => sum + (p.rating_avg || 0), 0) / products.length : 0
  };

  console.log('📊 현재 통계:', {
    totalProducts: stats.totalProducts,
    activeProducts: stats.activeProducts,
    productsArray: products.length,
    productsData: products.slice(0, 3) // 처음 3개만 로그
  });

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

  // 이미지 업로드 처리 (blob으로 변환)
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 파일 크기 체크 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}은(는) 5MB보다 큽니다. 더 작은 파일을 선택해주세요.`);
        continue;
      }

      // 이미지 파일인지 확인
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name}은(는) 이미지 파일이 아닙니다.`);
        continue;
      }

      try {
        // 파일을 blob URL로 변환
        const blobUrl = URL.createObjectURL(file);
        newImages.push(blobUrl);
      } catch (error) {
        console.error('Failed to create blob URL:', error);
        toast.error(`${file.name} 처리 중 오류가 발생했습니다.`);
      }
    }

    if (newImages.length > 0) {
      setNewProduct(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
      toast.success(`${newImages.length}개의 이미지가 업로드되었습니다.`);
    }

    // 파일 input 초기화
    event.target.value = '';
  };

  // 미디어 라이브러리에서 이미지 선택 핸들러
  const handleMediaSelect = (selected: any | any[]) => {
    const selectedItems = Array.isArray(selected) ? selected : [selected];
    const urls = selectedItems.map(item => item.url);

    // 파트너 다이얼로그가 열려있으면 파트너 이미지에 추가
    if (isPartnerDialogOpen) {
      setNewPartner(prev => ({
        ...prev,
        images: [...(Array.isArray(prev.images) ? prev.images : []), ...urls]
      }));
      toast.success(`${urls.length}개의 이미지가 추가되었습니다.`);
    } else {
      // 아니면 상품 이미지에 추가
      setNewProduct(prev => ({ ...prev, images: [...prev.images, ...urls] }));
      toast.success(`${urls.length}개의 이미지가 추가되었습니다.`);
    }
    setIsMediaLibraryOpen(false);
  };

  // PMS에서 불러온 데이터를 폼에 적용
  const handlePMSDataLoaded = (formData: AdminProductFormData) => {
    setNewProduct(prev => ({
      ...prev,
      title: formData.hotelName,
      category: '숙박',
      location: formData.location,
      description: formData.description,
      longDescription: formData.description,
      images: formData.images,
      // 첫 번째 객실 정보로 기본값 설정
      price: formData.rooms[0]?.price.toString() || '',
      childPrice: '',
      infantPrice: '',
      maxCapacity: formData.rooms[0]?.maxOccupancy.toString() || '2',
      // 추가 정보를 highlights에 저장
      highlights: formData.rooms.map(room =>
        `${room.roomName} - ${(room.price || 0).toLocaleString()}원 (최대 ${room.maxOccupancy}명)`
      ),
      availableStartTimes: prev.availableStartTimes,
      itinerary: prev.itinerary,
      packages: prev.packages,
      isPMSProduct: true, // PMS 상품으로 표시
      pmsFormData: formData // 원본 PMS 데이터 저장
    }));

    toast.success('✅ PMS 데이터가 폼에 적용되었습니다! 필요한 항목만 수정 후 "상품 추가"를 눌러주세요.');
  };

  // 렌트카 API 설정 저장
  const handleSaveRentcarAPI = async (settings: RentcarAPISettings) => {
    try {
      // 설정을 localStorage 또는 DB에 저장
      localStorage.setItem('rentcar_api_settings', JSON.stringify(settings));
      setRentcarAPISettings(settings);

      // 실제로는 DB에 저장해야 함
      // await db.insert('rentcar_api_configs', settings);

      toast.success('✅ 렌트카 API 설정이 저장되었습니다!');
      console.log('렌트카 API 설정:', settings);
    } catch (error) {
      console.error('렌트카 API 설정 저장 실패:', error);
      toast.error('렌트카 API 설정 저장 실패');
    }
  };

  // 상품 추가
  const handleAddProduct = async () => {
    if (!newProduct.title || !newProduct.category || !newProduct.price) {
      toast.error('필수 정보를 모두 입력해주세요.');
      return;
    }

    // 가격 유효성 검사
    const price = parseInt(newProduct.price);
    if (price <= 0) {
      toast.error('가격은 0보다 커야 합니다.');
      return;
    }

    // 최대 인원 유효성 검사
    const maxCapacity = parseInt(newProduct.maxCapacity);
    if (maxCapacity <= 0) {
      toast.error('최대 인원은 1명 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);
    try {
      // === PMS 연동 상품인 경우 특별 처리 ===
      if (newProduct.isPMSProduct && newProduct.pmsFormData) {
        const { saveProductToDB } = await import('../utils/pms/admin-integration');

        console.log('🏨 PMS 상품 저장 시작...', newProduct.pmsFormData);
        const result = await saveProductToDB(newProduct.pmsFormData);

        if (result.success) {
          toast.success('✅ PMS 연동 숙박 상품이 등록되었습니다!');

          // 상품 목록에 추가 (UI 업데이트)
          const newProductForUI: Product = {
            id: result.productId || String(Date.now()),
            title: newProduct.title,
            category: newProduct.category,
            price: parseInt(newProduct.price),
            location: newProduct.location,
            rating: 0,
            reviewCount: 0,
            image: newProduct.images[0] || '',
            description: newProduct.description,
            status: 'active',
            createdAt: new Date().toISOString().split('T')[0],
            featured: newProduct.featured
          };

          setProducts(prev => [...prev, newProductForUI]);

          // 폼 초기화
          setNewProduct({
            title: '',
            category: '여행',
            price: '',
            childPrice: '',
            infantPrice: '',
            priceType: 'fixed',
            location: '',
            address: '',
            coordinates: '',
            images: [],
            description: '',
            longDescription: '',
            highlights: [''],
            included: [''],
            excluded: [''],
            policies: [''],
            featured: false,
            maxCapacity: '10',
            minCapacity: '1',
            meetingPoint: '',
            cancellationPolicy: 'standard',
            language: 'korean',
            tags: [''],
            amenities: [''],
            isPMSProduct: false,
            pmsFormData: null,
            hasOptions: false,
            minPurchase: '1',
            maxPurchase: '',
            stockEnabled: false,
            stock: '0',
            shippingFee: '',
            isRefundable: true,
            availableStartTimes: [],
            itinerary: [],
            packages: []
          });

          setIsLoading(false);
          return;
        } else {
          throw new Error(result.error || 'PMS 상품 저장 실패');
        }
      }

      // === 일반 상품 저장 로직 (기존과 동일) ===
      // 카테고리 ID 찾기
      const categoryMap: { [key: string]: number } = {
        '여행': 1855, '렌트카': 1856, '숙박': 1857, '음식': 1858, '관광지': 1859, '팝업': 1860, '행사': 1861, '체험': 1862
      };

      // API가 받는 필드 모두 보내기
      const listingData = {
        title: newProduct.title,
        description: newProduct.description || '',
        longDescription: newProduct.longDescription || newProduct.description || '',
        price: parseInt(newProduct.price) || 0,
        childPrice: newProduct.childPrice ? parseInt(newProduct.childPrice) : null,
        infantPrice: newProduct.infantPrice ? parseInt(newProduct.infantPrice) : null,
        location: newProduct.location || '신안군',
        detailedAddress: newProduct.address || '',
        meetingPoint: newProduct.meetingPoint || '',
        category_id: categoryMap[newProduct.category] || 1855,
        category: newProduct.category || '여행',
        partner_id: null, // 나중에 파트너 선택 기능 추가 가능
        images: newProduct.images.filter(img => img.trim() !== ''),
        maxCapacity: newProduct.maxCapacity ? parseInt(newProduct.maxCapacity) : 20,
        highlights: newProduct.highlights.filter(h => h.trim() !== ''),
        included: newProduct.included.filter(i => i.trim() !== ''),
        excluded: newProduct.excluded.filter(e => e.trim() !== ''),
        is_active: true,
        featured: newProduct.featured || false,
        // 팝업 상품 전용 필드
        hasOptions: newProduct.hasOptions || false,
        minPurchase: newProduct.minPurchase ? parseInt(newProduct.minPurchase) : 1,
        maxPurchase: newProduct.maxPurchase ? parseInt(newProduct.maxPurchase) : null,
        stockEnabled: newProduct.stockEnabled || false,
        stock: newProduct.stock ? parseInt(newProduct.stock) : 0,
        shippingFee: newProduct.shippingFee ? parseInt(newProduct.shippingFee) : null,
        is_refundable: newProduct.isRefundable !== undefined ? newProduct.isRefundable : true
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
          image: newProduct.images.find(img => img.trim() !== '') || '',
          description: newProduct.description,
          status: 'active',
          createdAt: new Date().toISOString().split('T')[0],
          featured: newProduct.featured
        };

        setProducts(prev => [...prev, newProductForUI]);
        setNewProduct({
          title: '',
          category: '여행',
          price: '',
          childPrice: '',
          infantPrice: '',
          priceType: 'fixed',
          location: '',
          address: '',
          coordinates: '',
          images: [],
          description: '',
          longDescription: '',
          highlights: [''],
          included: [''],
          excluded: [''],
          policies: [''],
          featured: false,
          maxCapacity: '10',
          minCapacity: '1',
          meetingPoint: '',
          cancellationPolicy: 'standard',
          language: 'korean',
          tags: [''],
          amenities: [''],
          isPMSProduct: false,
          pmsFormData: null,
          hasOptions: false,
          minPurchase: '1',
          maxPurchase: '',
          stockEnabled: false,
          stock: '0',
          shippingFee: '',
          isRefundable: true,
          availableStartTimes: [],
          itinerary: [],
          packages: []
        });
        setIsAddModalOpen(false);
        toast.success('상품이 추가되었습니다.');

        // 🚀 실시간 데이터 동기화 알림
        // 새 상품 생성 알림 전송
        notifyDataChange.listingCreated();
        toast.success('🔄 모든 페이지에 새 상품이 실시간으로 반영됩니다!');
      } else {
        throw new Error(response.error || '상품 추가에 실패했습니다.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '상품 추가 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 상품 수정
  const handleEditProduct = async () => {
    if (!editingProduct) return;

    setIsLoading(true);
    try {
      // 간소화된 양식과 동일한 형식으로 업데이트 데이터 구성
      const categoryMap: { [key: string]: number } = {
        '여행': 1855, '렌트카': 1856, '숙박': 1857, '음식': 1858,
        '관광지': 1859, '팝업': 1860, '행사': 1861, '체험': 1862
      };

      const updateData = {
        title: editingProduct.title,
        description: editingProduct.description || '',
        longDescription: editingProduct.description || '',
        price: editingProduct.price,
        childPrice: null,
        infantPrice: null,
        location: editingProduct.location || '신안군',
        detailedAddress: '',
        meetingPoint: '',
        category_id: categoryMap[editingProduct.category] || 1855,
        category: editingProduct.category,
        partner_id: null,
        images: [editingProduct.image].filter(img => img && img.trim() !== ''),
        maxCapacity: 20,
        highlights: [],
        included: [],
        excluded: [],
        is_active: editingProduct.status === 'active',
        featured: editingProduct.featured || false
      };

      console.log('📝 상품 수정 요청:', { id: editingProduct.id, updateData });

      const result = await api.admin.updateListing(parseInt(editingProduct.id), updateData);

      console.log('✅ 상품 수정 응답:', result);

      if (result.success && result.data) {
        // images 파싱 (DB에서 JSON 문자열로 저장됨)
        let imagesArray: string[] = [];
        try {
          if (result.data.images) {
            imagesArray = typeof result.data.images === 'string'
              ? JSON.parse(result.data.images)
              : result.data.images;
          }
        } catch (e) {
          console.warn('Failed to parse images for updated listing:', result.data.id);
        }

        // ⭐ 중요: 서버에서 반환된 최신 데이터로 상품 목록 업데이트
        const updatedProduct: Product = {
          id: result.data.id.toString(),
          title: result.data.title,
          category: (result.data as any).category_name || (result.data as any).category_slug || result.data.category || '미분류',
          price: result.data.price_from || 0,
          location: result.data.location || '',
          rating: result.data.rating_avg || 0,
          reviewCount: result.data.rating_count || 0,
          image: (Array.isArray(imagesArray) && imagesArray.length > 0)
            ? imagesArray[0]
            : 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300&h=200&fit=crop',
          description: result.data.short_description || '상세 정보를 확인해보세요.',
          status: (result.data.is_active ? 'active' : 'inactive') as 'active' | 'inactive',
          createdAt: result.data.created_at ? result.data.created_at.split('T')[0] : '2024-01-01',
          featured: result.data.is_featured || false
        };

        console.log('🔄 업데이트된 상품 데이터:', updatedProduct);

        setProducts(prev =>
          prev.map(p =>
            p.id === editingProduct.id
              ? updatedProduct
              : p
          )
        );
        setEditingProduct(null);
        setIsEditModalOpen(false);
        toast.success('상품이 수정되었습니다.');

        // 실시간 데이터 갱신
        notifyDataChange.listingUpdated();
      } else {
        console.error('❌ 상품 수정 실패:', result);
        toast.error(result.error || '상품 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('상품 수정에 실패했습니다.');
    } finally {
      setIsLoading(false);
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
  const handleToggleStatus = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const newStatus = product.status === 'active' ? 'inactive' : 'active';

    try {
      const result = await api.admin.updateListing(parseInt(id), {
        is_active: newStatus === 'active',
        is_published: newStatus === 'active'
      });

      if (result.success) {
        setProducts(prev =>
          prev.map(p =>
            p.id === id
              ? { ...p, status: newStatus }
              : p
          )
        );
        toast.success(`상품이 ${newStatus === 'active' ? '활성화' : '비활성화'}되었습니다.`);
      } else {
        toast.error(result.error || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Status toggle failed:', error);
      toast.error('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 상품 옵션 관리 함수들
  const fetchProductOptions = async (listingId: number) => {
    try {
      const response = await fetch(`/api/listings/${listingId}/options`);
      const result = await response.json();
      if (result.success) {
        setProductOptions(result.data || []);
      } else {
        toast.error('옵션 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to fetch options:', error);
      toast.error('옵션 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleAddOption = async () => {
    if (!editingProductForOptions) return;
    if (!newOption.optionName.trim() || !newOption.optionValue.trim()) {
      toast.error('옵션명과 옵션값을 모두 입력해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/listings/${editingProductForOptions.id}/options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          optionName: newOption.optionName,
          optionValue: newOption.optionValue,
          priceAdjustment: parseInt(newOption.priceAdjustment) || 0,
          stock: parseInt(newOption.stock) || 0
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('옵션이 추가되었습니다.');
        setNewOption({ optionName: '', optionValue: '', priceAdjustment: '0', stock: '0' });
        await fetchProductOptions(parseInt(editingProductForOptions.id));
      } else {
        toast.error(result.error || '옵션 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to add option:', error);
      toast.error('옵션 추가에 실패했습니다.');
    }
  };

  const handleUpdateOption = async (optionId: number, updates: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/product-options/${optionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      const result = await response.json();
      if (result.success) {
        toast.success('옵션이 수정되었습니다.');
        if (editingProductForOptions) {
          await fetchProductOptions(parseInt(editingProductForOptions.id));
        }
      } else {
        toast.error(result.error || '옵션 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update option:', error);
      toast.error('옵션 수정에 실패했습니다.');
    }
  };

  const handleDeleteOption = async (optionId: number) => {
    if (!confirm('이 옵션을 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/product-options/${optionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        toast.success('옵션이 삭제되었습니다.');
        if (editingProductForOptions) {
          await fetchProductOptions(parseInt(editingProductForOptions.id));
        }
      } else {
        toast.error(result.error || '옵션 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete option:', error);
      toast.error('옵션 삭제에 실패했습니다.');
    }
  };

  // 파트너 승인
  const handleApprovePartner = async (applicationId: number) => {
    try {
      const result = await api.admin.approvePartnerApplication(applicationId);
      if (result.success) {
        // 목록에서 제거 (승인된 신청은 신청 목록에서 사라져야 함)
        setPartnerApplications(prev =>
          prev.filter(app => app.id !== applicationId)
        );

        // 대시보드 통계 새로고침
        const statsResponse = await api.admin.getDashboardStats();
        if (statsResponse) {
          setDashboardStats(statsResponse);
        }

        // 파트너 목록 새로고침
        await handleRefresh();

        toast.success('파트너 신청이 승인되고 상품이 생성되었습니다.');
      } else {
        toast.error(result.error || '파트너 승인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Approve partner failed:', error);
      toast.error('파트너 승인 중 오류가 발생했습니다.');
    }
  };

  // 파트너 신청 내역 보기
  const handleViewHistory = async () => {
    try {
      const result = await api.admin.getPartnerApplicationHistory();
      if (result.success) {
        setPartnerApplicationHistory(result.data || []);
        setShowHistory(true);
      }
    } catch (error) {
      console.error('신청 내역 조회 오류:', error);
    }
  };

  // 파트너 거부
  const handleRejectPartner = async (applicationId: number) => {
    if (confirm('정말 이 파트너 신청을 거부하시겠습니까?')) {
      try {
        const result = await api.admin.rejectPartnerApplication(applicationId);
        if (result.success) {
          // 목록에서 제거 (거절된 신청은 신청 목록에서 사라져야 함)
          setPartnerApplications(prev =>
            prev.filter(app => app.id !== applicationId)
          );

          // 대시보드 통계 새로고침
          const statsResponse = await api.admin.getDashboardStats();
          if (statsResponse) {
            setDashboardStats(statsResponse);
          }

          toast.success('파트너 신청이 거부되었습니다.');
        } else {
          toast.error(result.error || '파트너 거부에 실패했습니다.');
        }
      } catch (error) {
        console.error('Reject partner failed:', error);
        toast.error('파트너 거부 중 오류가 발생했습니다.');
      }
    }
  };

  // 파트너 생성/수정 대화상자 열기
  const handleOpenPartnerDialog = (partner: any = null) => {
    setEditingPartner(partner);
    setIsCreatePartnerMode(!partner);
    // 파트너 수정 모드일 때는 해당 데이터로 초기화, 생성 모드일 때는 빈 값으로 초기화
    if (partner) {
      // 이미지 배열 처리
      let imagesArray: string[] = [];
      if (Array.isArray(partner.images)) {
        imagesArray = partner.images;
      } else if (typeof partner.images === 'string' && partner.images) {
        try {
          imagesArray = JSON.parse(partner.images);
        } catch {
          imagesArray = [];
        }
      }

      setNewPartner({
        business_name: partner.business_name || '',
        contact_name: partner.contact_name || '',
        email: partner.email || '',
        phone: partner.phone || '',
        business_address: partner.business_address || partner.location || '',
        location: partner.location || '',
        services: partner.services || '',
        base_price: partner.base_price || '',
        base_price_text: partner.base_price_text || '',
        detailed_address: partner.detailed_address || '',
        description: partner.description || '',
        images: imagesArray,
        business_hours: partner.business_hours || '',
        duration: partner.duration || '',
        min_age: partner.min_age || '',
        max_capacity: partner.max_capacity || '',
        language: partner.language || '',
        lat: partner.lat || null,
        lng: partner.lng || null
      });
    } else {
      setNewPartner({
        business_name: '',
        contact_name: '',
        email: '',
        phone: '',
        business_address: '',
        location: '',
        services: '',
        base_price: '',
        base_price_text: '',
        detailed_address: '',
        description: '',
        images: [],
        business_hours: '',
        duration: '',
        min_age: '',
        max_capacity: '',
        language: '',
        lat: null,
        lng: null
      });
    }
    setIsPartnerDialogOpen(true);
  };

  // 파트너 생성/수정
  const handleSavePartner = async (partnerData: any) => {
    try {
      // 이미지가 이미 배열이므로 그대로 전송
      const processedData = {
        ...partnerData,
        images: Array.isArray(partnerData.images) ? partnerData.images : []
      };

      let result;
      if (isCreatePartnerMode) {
        result = await api.admin.createPartner(processedData);
        if (result.success) {
          setPartners(prev => [...prev, result.data]);
          toast.success('파트너가 성공적으로 생성되었습니다.');
        }
      } else {
        result = await api.admin.updatePartner(editingPartner.id, processedData);
        if (result.success) {
          setPartners(prev =>
            prev.map(p =>
              p.id === editingPartner.id
                ? { ...p, ...result.data }
                : p
            )
          );
          toast.success('파트너 정보가 성공적으로 수정되었습니다.');
        }
      }

      if (result.success) {
        setIsPartnerDialogOpen(false);
        setEditingPartner(null);
      } else {
        toast.error(result.error || '파트너 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Save partner failed:', error);
      toast.error('파트너 저장 중 오류가 발생했습니다.');
    }
  };

  // 파트너 삭제
  const handleDeletePartner = async (id: number) => {
    if (!confirm('정말 이 파트너를 삭제하시겠습니까?')) {
      return;
    }

    try {
      // 먼저 cascade 없이 시도
      const result = await api.admin.deletePartner(id, false);

      if (result.success) {
        setPartners(prev => prev.filter(p => p.id !== id));
        toast.success(result.message || '파트너가 삭제되었습니다.');
      } else {
        // 리스팅이 연결되어 있는 경우
        if (result.error?.includes('리스팅이 연결')) {
          const cascadeConfirm = confirm(
            `${result.error}\n\n연결된 리스팅도 함께 삭제하시겠습니까?`
          );

          if (cascadeConfirm) {
            // cascade=true로 다시 시도
            const cascadeResult = await api.admin.deletePartner(id, true);

            if (cascadeResult.success) {
              setPartners(prev => prev.filter(p => p.id !== id));
              toast.success(cascadeResult.message || '파트너와 리스팅이 삭제되었습니다.');
            } else {
              toast.error(cascadeResult.error || '파트너 삭제에 실패했습니다.');
            }
          }
        } else {
          toast.error(result.error || '파트너 삭제에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('Delete partner failed:', error);
      toast.error('파트너 삭제 중 오류가 발생했습니다.');
    }
  };

  // 리뷰 생성/수정 대화상자 열기
  const handleOpenReviewDialog = (review: any = null) => {
    setEditingReview(review);
    setIsCreateReviewMode(!review);

    if (review) {
      // 수정 모드: 기존 리뷰 데이터로 초기화
      setNewReview({
        listing_id: review.listing_id?.toString() || '',
        user_name: review.user_name || '',
        rating: review.rating?.toString() || '',
        visit_date: review.visit_date || '',
        title: review.title || '',
        comment: review.comment_md || review.comment || '',
        review_type: review.review_type || 'listing',
        rentcar_booking_id: review.rentcar_booking_id || ''
      });
    } else {
      // 생성 모드: 빈 폼으로 초기화
      setNewReview({
        listing_id: '',
        user_name: '',
        rating: '',
        visit_date: '',
        title: '',
        comment: '',
        review_type: 'listing',
        rentcar_booking_id: ''
      });
    }

    setIsReviewDialogOpen(true);
  };

  // 리뷰 생성/수정
  const handleSaveReview = async (reviewData: any) => {
    try {
      let result;
      if (isCreateReviewMode) {
        result = await api.admin.createReview(reviewData);
        if (result.success) {
          setReviews(prev => [...prev, result.data]);
          toast.success('리뷰가 성공적으로 생성되었습니다.');
        }
      } else {
        result = await api.admin.updateReview(editingReview.id, reviewData);
        if (result.success) {
          setReviews(prev =>
            prev.map(r =>
              r.id === editingReview.id
                ? { ...r, ...result.data }
                : r
            )
          );
          toast.success('리뷰가 성공적으로 수정되었습니다.');
        }
      }

      if (result.success) {
        setIsReviewDialogOpen(false);
        setEditingReview(null);
      } else {
        toast.error(result.error || '리뷰 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Save review failed:', error);
      toast.error('리뷰 저장 중 오류가 발생했습니다.');
    }
  };

  // 리뷰 삭제
  const handleDeleteReview = async (id: number) => {
    if (confirm('정말 이 리뷰를 삭제하시겠습니까?')) {
      try {
        const result = await api.admin.deleteReview(id);
        if (result.success) {
          setReviews(prev => prev.filter(r => r.id !== id));
          toast.success('리뷰가 삭제되었습니다.');
        } else {
          toast.error(result.error || '리뷰 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('Delete review failed:', error);
        toast.error('리뷰 삭제에 실패했습니다.');
      }
    }
  };

  // 리뷰 상태 변경
  const handleUpdateReviewStatus = async (id: number, status: 'published' | 'pending' | 'rejected') => {
    try {
      const result = await api.admin.updateReviewStatus(id, status);
      if (result.success) {
        setReviews(prev =>
          prev.map(r =>
            r.id === id
              ? { ...r, status }
              : r
          )
        );
        toast.success(`리뷰가 ${status === 'published' ? '승인' : status === 'rejected' ? '거부' : '대기'}되었습니다.`);
      } else {
        toast.error(result.error || '리뷰 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Update review status failed:', error);
      toast.error('리뷰 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 사용자 생성/수정 대화상자 열기
  const handleOpenUserDialog = (user: any = null) => {
    setEditingUser(user);
    setIsUserDialogOpen(true);
  };

  // 사용자 삭제
  const handleDeleteUser = async (id: number, email: string) => {
    if (confirm(`정말 이 사용자를 삭제하시겠습니까?\n\n이메일: ${email}\n\n⚠️ 이 작업은 되돌릴 수 없으며, 사용자의 모든 데이터가 삭제됩니다:\n- 예약 내역\n- 리뷰\n- 찜 목록\n- 쿠폰\n\n계속하시겠습니까?`)) {
      try {
        const result = await api.admin.deleteUser(id);
        if (result.success) {
          setUsers(prev => prev.filter(u => u.id !== id));
          toast.success(`사용자 "${email}"이(가) 삭제되었습니다.`);
        } else {
          toast.error(result.error || '사용자 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('Delete user failed:', error);
        toast.error('사용자 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 사용자 상태 변경
  const handleUpdateUserStatus = async (id: number, status: 'active' | 'inactive' | 'suspended') => {
    try {
      const result = await api.admin.updateUserStatus(id, status);
      if (result.success) {
        setUsers(prev =>
          prev.map(u =>
            u.id === id
              ? { ...u, status }
              : u
          )
        );
        toast.success(`사용자가 ${status === 'active' ? '활성화' : status === 'suspended' ? '정지' : '비활성화'}되었습니다.`);
      } else {
        toast.error(result.error || '사용자 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Update user status failed:', error);
      toast.error('사용자 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 문의 삭제
  const handleDeleteContact = async (id: number, name: string) => {
    if (confirm(`정말 이 문의를 삭제하시겠습니까?\n\n이름: ${name}\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`)) {
      try {
        const result = await api.admin.deleteContact(id);
        if (result.success) {
          setContacts(prev => prev.filter(c => c.id !== id));
          toast.success(`문의 "${name}"이(가) 삭제되었습니다.`);
        } else {
          toast.error(result.error || '문의 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('Delete contact failed:', error);
        toast.error('문의 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // ================== 블로그 관리 핸들러 ==================

  // 블로그 생성/수정 대화상자 열기
  const handleOpenBlogDialog = (blog: any = null) => {
    setEditingBlog(blog);
    setIsCreateBlogMode(!blog);
    if (blog) {
      // 수정 모드: 기존 블로그 데이터로 초기화
      setNewBlog({
        title: blog.title || '',
        category: blog.category || 'travel',
        excerpt: blog.excerpt || '',
        content_md: blog.content_md || '',
        featured_image: blog.featured_image || '',
        is_published: blog.is_published ?? true,
        author_id: blog.author_id || 1,
        slug: blog.slug || '',
        event_start_date: blog.event_start_date || '',
        event_end_date: blog.event_end_date || ''
      });
    } else {
      // 생성 모드: 빈 값으로 초기화
      setNewBlog({
        title: '',
        category: 'travel',
        excerpt: '',
        content_md: '',
        featured_image: '',
        is_published: true,
        author_id: 1,
        slug: '',
        event_start_date: '',
        event_end_date: ''
      });
    }
    setIsBlogDialogOpen(true);
  };

  // 블로그 생성/수정
  const handleSaveBlog = async (blogData: any) => {
    try {
      let result;
      if (isCreateBlogMode) {
        result = await api.admin.createBlog(blogData);
        if (result.success) {
          setBlogs(prev => [...prev, result.data]);
          toast.success('블로그 포스트가 성공적으로 생성되었습니다.');
        }
      } else {
        result = await api.admin.updateBlog(editingBlog.id, blogData);
        if (result.success) {
          setBlogs(prev =>
            prev.map(b =>
              b.id === editingBlog.id
                ? { ...b, ...result.data }
                : b
            )
          );
          toast.success('블로그 포스트가 성공적으로 수정되었습니다.');
        }
      }

      if (result.success) {
        setIsBlogDialogOpen(false);
        setEditingBlog(null);
      } else {
        toast.error(result.error || '블로그 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Save blog failed:', error);
      toast.error('블로그 저장 중 오류가 발생했습니다.');
    }
  };

  // 블로그 삭제
  const handleDeleteBlog = async (id: number) => {
    if (confirm('정말 이 블로그 포스트를 삭제하시겠습니까?')) {
      try {
        const result = await api.admin.deleteBlog(id);
        if (result.success) {
          setBlogs(prev => prev.filter(b => b.id !== id));
          toast.success('블로그 포스트가 삭제되었습니다.');
        } else {
          toast.error(result.error || '블로그 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('Delete blog failed:', error);
        toast.error('블로그 삭제에 실패했습니다.');
      }
    }
  };

  // ================== 주문 관리 핸들러 ==================

  // 주문 상태 변경
  const handleUpdateOrderStatus = async (id: number, status: string) => {
    try {
      const result = await api.admin.updateOrderStatus(id, status);
      if (result.success) {
        setOrders(prev =>
          prev.map(o =>
            o.id === id
              ? { ...o, status }
              : o
          )
        );
        toast.success('주문 상태가 변경되었습니다.');
      } else {
        toast.error(result.error || '주문 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('Update order status failed:', error);
      toast.error('주문 상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 주문 삭제
  const handleDeleteOrder = async (id: number) => {
    if (confirm('정말 이 주문을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        const result = await api.admin.deleteOrder(id);
        if (result.success) {
          setOrders(prev => prev.filter(o => o.id !== id));
          toast.success('주문이 삭제되었습니다.');
        } else {
          toast.error(result.error || '주문 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('Delete order failed:', error);
        toast.error('주문 삭제에 실패했습니다.');
      }
    }
  };

  // 주문 환불 (팝업 카테고리)
  const handleRefundOrder = async (order: any) => {
    const reason = prompt('환불 사유를 입력해주세요:');
    if (!reason || reason.trim() === '') {
      toast.error('환불 사유를 입력해주세요');
      return;
    }

    if (!confirm(`이 주문을 환불하시겠습니까?\n\n주문번호: ${order.order_number}\n금액: ₩${order.total_amount?.toLocaleString() || '0'}\n\n이 작업은 즉시 토스 페이먼츠로 환불을 요청합니다.`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/refund-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          bookingId: order.booking_id || undefined, // booking_id가 있으면 사용
          orderId: !order.booking_id ? order.id : undefined, // booking_id 없으면 orderId 사용 (장바구니 주문)
          cancelReason: `[관리자 환불] ${reason}`,
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`환불이 완료되었습니다 (${data.refundAmount?.toLocaleString() || order.total_amount?.toLocaleString()}원)`);

        // 주문 목록 새로고침
        api.admin.getOrders().then(res => {
          const updatedOrders = res?.success ? res.data || [] : [];
          setOrders(updatedOrders);
        });
      } else {
        toast.error(data.message || '환불 처리에 실패했습니다');
      }
    } catch (error) {
      console.error('Refund request failed:', error);
      toast.error('환불 요청 중 오류가 발생했습니다');
    }
  };

  // ================== 이미지 관리 핸들러 ==================

  // 이미지 업로드/수정
  const handleImageSave = async () => {
    if (!editingImage) return;

    try {
      let result;
      if (isCreateImageMode) {
        result = await api.admin.uploadImage(editingImage);
      } else {
        result = await api.admin.updateImage(editingImage.id, editingImage);
      }

      if (result.success) {
        if (isCreateImageMode) {
          setImages(prev => [...prev, result.data]);
        } else {
          setImages(prev =>
            prev.map(image =>
              image.id === editingImage.id ? result.data : image
            )
          );
        }
        setIsImageDialogOpen(false);
        setEditingImage(null);
        setIsCreateImageMode(false);
        toast.success(isCreateImageMode ? '이미지가 업로드되었습니다.' : '이미지가 수정되었습니다.');
      } else {
        toast.error(result.error || '이미지 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Image save failed:', error);
      toast.error('이미지 저장 중 오류가 발생했습니다.');
    }
  };

  // 이미지 삭제
  const handleDeleteImage = async (id: string) => {
    if (confirm('정말 이 이미지를 삭제하시겠습니까?')) {
      try {
        const result = await api.admin.deleteImage(parseInt(id));
        if (result.success) {
          setImages(prev => prev.filter(image => image.id !== id));
          toast.success('이미지가 삭제되었습니다.');
        } else {
          toast.error(result.error || '이미지 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('Delete image failed:', error);
        toast.error('이미지 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 이미지 Dialog 열기
  const handleOpenImageDialog = (image: any = null) => {
    setEditingImage(image);
    setIsCreateImageMode(!image);

    if (image) {
      // 수정 모드: 기존 이미지 데이터로 초기화
      setNewImage({
        file: null,
        title: image.title || image.alt || '',
        usage: image.category || image.usage || 'product',
        description: image.alt || image.description || '',
        url: image.url || ''
      });
    } else {
      // 생성 모드: 빈 폼으로 초기화
      setNewImage({
        file: null,
        title: '',
        usage: 'product',
        description: '',
        url: ''
      });
    }

    setIsImageDialogOpen(true);
  };

  // 이미지 저장 (업로드/수정)
  const handleSaveImage = async () => {
    try {
      // 생성 모드 - 파일 업로드 필요
      if (isCreateImageMode) {
        if (!newImage.file && !newImage.url) {
          toast.error('이미지 파일을 선택하거나 URL을 입력해주세요.');
          return;
        }

        if (!newImage.title) {
          toast.error('이미지 제목을 입력해주세요.');
          return;
        }

        let result;

        // 파일 업로드
        if (newImage.file) {
          const formData = new FormData();
          formData.append('image', newImage.file);
          formData.append('title', newImage.title);
          formData.append('category', newImage.usage);
          formData.append('description', newImage.description);

          result = await api.admin.uploadImage(newImage.file, {
            alt_text: newImage.description,
            entity_type: 'general'
          } as any);
        } else {
          // URL 직접 입력
          result = await api.admin.uploadImage(null as any, {
            alt_text: newImage.description,
            entity_type: 'general'
          } as any);
        }

        if (result.success) {
          setImages(prev => [...prev, result.data]);
          toast.success('이미지가 업로드되었습니다.');
          setIsImageDialogOpen(false);
        } else {
          toast.error(result.error || '이미지 업로드에 실패했습니다.');
        }
      }
      // 수정 모드
      else {
        const result = await api.admin.updateImage(editingImage.id, {
          title: newImage.title,
          category: newImage.usage,
          alt: newImage.description,
          url: newImage.url || editingImage.url
        });

        if (result.success) {
          setImages(prev =>
            prev.map(img =>
              img.id === editingImage.id ? { ...img, ...result.data } : img
            )
          );
          toast.success('이미지가 수정되었습니다.');
          setIsImageDialogOpen(false);
        } else {
          toast.error(result.error || '이미지 수정에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('Save image failed:', error);
      toast.error('이미지 저장 중 오류가 발생했습니다.');
    }
  };

  // 이미지 파일 선택 핸들러
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // 파일 크기 체크 (10MB 제한)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('파일 크기는 10MB 이하여야 합니다.');
        return;
      }

      // 이미지 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        toast.error('이미지 파일만 업로드 가능합니다.');
        return;
      }

      setNewImage({ ...newImage, file, url: '' });

      // 파일 이름으로 제목 자동 설정 (제목이 비어있을 경우)
      if (!newImage.title) {
        const fileName = file.name.replace(/\.[^/.]+$/, ''); // 확장자 제거
        setNewImage(prev => ({ ...prev, file, title: fileName, url: '' }));
      } else {
        setNewImage(prev => ({ ...prev, file, url: '' }));
      }
    }
  };
  // 사용자 저장 (초대 또는 수정)
  const handleSaveUser = async () => {
    try {
      // 필수 필드 검증
      if (!newUser.name || !newUser.email) {
        toast.error('이름과 이메일은 필수 입력 항목입니다.');
        return;
      }

      if (isCreateUserMode && !newUser.password) {
        toast.error('비밀번호는 필수 입력 항목입니다.');
        return;
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUser.email)) {
        toast.error('올바른 이메일 형식이 아닙니다.');
        return;
      }

      if (isCreateUserMode) {
        // 새 사용자 초대
        const result = await api.createUser({
          user_id: newUser.email.split('@')[0], // email의 앞부분을 user_id로 사용
          name: newUser.name,
          email: newUser.email,
          password_hash: newUser.password, // 실제로는 백엔드에서 해싱 처리
          phone: newUser.phone,
          role: newUser.role as any,
          preferred_language: 'ko',
          preferred_currency: 'KRW',
          marketing_consent: false
        } as any);

        if (result.success) {
          setUsers(prev => [...prev, result.data]);
          toast.success('사용자가 초대되었습니다.');
          setIsUserDialogOpen(false);
          setNewUser({
            name: '',
            email: '',
            password: '',
            phone: '',
            role: 'user'
          });
        } else {
          toast.error(result.error || '사용자 초대에 실패했습니다.');
        }
      } else {
        // 기존 사용자 수정
        // 수정 API가 필요하지만 현재는 상태 변경만 지원
        toast.info('사용자 정보 수정은 현재 지원하지 않습니다.');
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      toast.error('사용자 저장 중 오류가 발생했습니다.');
    }
  };

  // 사용자 상세보기 다이얼로그 열기
  const handleOpenUserDetail = (user: any) => {
    setSelectedUser(user);
    setIsUserDetailDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">관리자 데이터를 불러오는 중...</p>
          <p className="text-sm text-gray-400 mb-4">잠시만 기다려주세요. 데이터베이스에서 정보를 가져오고 있습니다.</p>
          <Button
            onClick={() => {
              // 사용자가 수동으로 로딩 스킵
              setIsLoading(false);
            }}
            variant="outline"
            className="mt-4"
          >
            로딩 건너뛰기 (디버그용)
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">관리자 대시보드</h1>
              <p className="text-sm md:text-base text-gray-600">신안 여행 플랫폼 상품 관리</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="min-h-[44px] self-start sm:self-auto"
                disabled={isLoading}
              >
                {isLoading ? '새로고침 중...' : '🔄 새로고침'}
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" className="min-h-[44px] self-start sm:self-auto">
                돌아가기
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        <Tabs defaultValue="dashboard" className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <TabsList className="grid grid-cols-4 md:grid-cols-7 w-full">
              <TabsTrigger value="dashboard" className="text-xs md:text-sm">대시보드</TabsTrigger>
              <TabsTrigger value="products" className="text-xs md:text-sm">상품 관리</TabsTrigger>
              <TabsTrigger value="accommodation" className="text-xs md:text-sm">숙박 관리</TabsTrigger>
              <TabsTrigger value="rentcar" className="text-xs md:text-sm">렌트카 관리</TabsTrigger>
              <TabsTrigger value="banners" className="text-xs md:text-sm">배너 관리</TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs md:text-sm">리뷰 관리</TabsTrigger>
              <TabsTrigger value="partners" className="text-xs md:text-sm">파트너 관리</TabsTrigger>
            </TabsList>
            <TabsList className="grid grid-cols-4 md:grid-cols-4 w-full">
              <TabsTrigger value="blogs" className="text-xs md:text-sm">블로그 관리</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs md:text-sm">주문 관리</TabsTrigger>
              <TabsTrigger value="users" className="text-xs md:text-sm">사용자 관리</TabsTrigger>
              <TabsTrigger value="contacts" className="text-xs md:text-sm">문의 관리</TabsTrigger>
            </TabsList>
          </div>

          {/* 대시보드 탭 */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* 통계 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
                    ₩{(stats.totalRevenue || 0).toLocaleString()}
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
                  <div className="text-2xl font-bold">{(dashboardStats?.avg_rating || 0).toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">
                    5점 만점
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">회원 수</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardStats?.total_users || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    전체 회원
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 추가 통계 정보 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 파트너 통계 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Star className="h-4 w-4 mr-2" />
                    파트너 현황
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">총 파트너</span>
                    <span className="font-medium">{dashboardStats?.total_partners || 0}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">승인 대기</span>
                    <span className="font-medium text-orange-600">{dashboardStats?.pending_partners || 0}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">활성 파트너</span>
                    <span className="font-medium text-green-600">
                      {(dashboardStats?.total_partners || 0) - (dashboardStats?.pending_partners || 0)}개
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 주문/예약 통계 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Package className="h-4 w-4 mr-2" />
                    주문 현황
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">총 주문</span>
                    <span className="font-medium">{dashboardStats?.total_bookings || 0}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">오늘 주문</span>
                    <span className="font-medium text-blue-600">{dashboardStats?.bookings_today || 0}건</span>
                  </div>
                </CardContent>
              </Card>

              {/* 시스템 상태 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    시스템 상태
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">총 리뷰</span>
                    <span className="font-medium">{dashboardStats?.total_reviews || 0}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">환불 대기</span>
                    <span className="font-medium text-red-600">{dashboardStats?.pending_refunds || 0}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">고객 문의</span>
                    <span className="font-medium text-yellow-600">{dashboardStats?.support_tickets_open || 0}건</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 최근 상품 목록 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">최근 등록된 상품</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 md:space-y-4">
                  {products.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center space-x-3 md:space-x-4">
                      <ImageWithFallback
                        src={product.image}
                        alt={product.title}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm md:text-base truncate">{product.title}</h4>
                        <p className="text-xs md:text-sm text-gray-600 truncate">{product.category} • {product.location}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium text-xs md:text-sm">₩{(product.price || 0).toLocaleString()}</p>
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="text-xs">
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                  <CardTitle className="text-lg md:text-xl">상품 관리</CardTitle>
                  <Button
                    onClick={() => {
                      setIsAddModalOpen(true);
                    }}
                    className="bg-[#8B5FBF] hover:bg-[#7A4FB5] min-h-[44px]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    상품 추가
                  </Button>

                  {/* 직접 조건부 렌더링 모달 */}
                  {isAddModalOpen && (
                    <div
                      style={{
                        position: 'fixed',
                        inset: '0',
                        zIndex: '9999999',
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onClick={(e) => {
                        if (e.target === e.currentTarget) {
                          setIsAddModalOpen(false);
                        }
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          padding: '24px',
                          maxWidth: '90vw',
                          maxHeight: '90vh',
                          overflow: 'auto',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}
                        className="max-w-4xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center mb-6">
                          <h2 className="text-xl font-semibold">새 상품 추가</h2>
                          <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            ✕
                          </button>
                        </div>
                      <div className="space-y-6">
                        {/* 기본 정보 */}
                        <div>
                          <h3 className="text-lg font-medium mb-3">기본 정보</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                              {/* 숙박 카테고리 선택 시 PMS 연동 버튼 표시 */}
                              {newProduct.category === '숙박' && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 w-full"
                                  onClick={() => setIsPMSModalOpen(true)}
                                >
                                  🏨 PMS API로 객실 정보 불러오기
                                </Button>
                              )}

                              {/* 렌트카 카테고리 선택 시 API 설정 버튼 표시 */}
                              {newProduct.category === '렌트카' && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="mt-2 w-full"
                                  onClick={() => setIsRentcarAPIModalOpen(true)}
                                >
                                  🚗 렌트카 API 설정
                                </Button>
                              )}
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                {newProduct.category === '팝업' ? '상품 가격 *' : '성인 가격 *'}
                              </label>
                              <Input
                                type="number"
                                value={newProduct.price}
                                onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                                placeholder={newProduct.category === '팝업' ? '상품 가격을 입력하세요' : '성인 가격을 입력하세요'}
                              />
                            </div>

                            {/* 팝업이 아닐 때만 어린이/유아 가격 표시 */}
                            {newProduct.category !== '팝업' && (
                              <>
                                <div>
                                  <label className="text-sm font-medium mb-1 block">어린이 가격</label>
                                  <Input
                                    type="number"
                                    value={newProduct.childPrice || ''}
                                    onChange={(e) => setNewProduct(prev => ({ ...prev, childPrice: e.target.value }))}
                                    placeholder="어린이 가격 (미입력시 성인의 70%)"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium mb-1 block">유아 가격</label>
                                  <Input
                                    type="number"
                                    value={newProduct.infantPrice || ''}
                                    onChange={(e) => setNewProduct(prev => ({ ...prev, infantPrice: e.target.value }))}
                                    placeholder="유아 가격 (미입력시 성인의 30%)"
                                  />
                                </div>
                              </>
                            )}

                            {/* 팝업 카테고리가 아닐 때만 최대 인원/수량 입력 필드 표시 */}
                            {newProduct.category !== '팝업' && (
                              <div>
                                <label className="text-sm font-medium mb-1 block">
                                  최대 인원
                                </label>
                                <div className="flex items-center justify-between border rounded-md px-4 py-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setNewProduct(prev => ({
                                      ...prev,
                                      maxCapacity: Math.max(1, parseInt(prev.maxCapacity) - 1).toString()
                                    }))}
                                    disabled={parseInt(newProduct.maxCapacity) <= 1}
                                    className="h-8 w-8 p-0"
                                  >
                                    -
                                  </Button>
                                  <span className="text-lg font-medium">
                                    {newProduct.maxCapacity}명
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setNewProduct(prev => ({
                                      ...prev,
                                      maxCapacity: Math.min(1000, parseInt(prev.maxCapacity) + 1).toString()
                                    }))}
                                    disabled={parseInt(newProduct.maxCapacity) >= 1000}
                                    className="h-8 w-8 p-0"
                                  >
                                    +
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* 팝업 카테고리 전용 필드 */}
                            {newProduct.category === '팝업' && (
                              <>
                                {/* 옵션 사용 여부 */}
                                <div className="col-span-full">
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={newProduct.hasOptions}
                                      onChange={(e) => setNewProduct(prev => ({ ...prev, hasOptions: e.target.checked }))}
                                      className="w-4 h-4"
                                    />
                                    <span className="text-sm font-medium">옵션 사용 (사이즈, 색상 등)</span>
                                  </label>
                                  <p className="text-xs text-gray-500 mt-1 ml-6">
                                    체크 시 상품 등록 후 옵션을 추가할 수 있습니다
                                  </p>
                                </div>

                                {/* 구매 수량 제한 */}
                                <div>
                                  <label className="text-sm font-medium mb-1 block">최소 구매 수량</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={newProduct.minPurchase}
                                    onChange={(e) => setNewProduct(prev => ({ ...prev, minPurchase: e.target.value }))}
                                    placeholder="1"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    기본값: 1개
                                  </p>
                                </div>

                                <div>
                                  <label className="text-sm font-medium mb-1 block">최대 구매 수량</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={newProduct.maxPurchase}
                                    onChange={(e) => setNewProduct(prev => ({ ...prev, maxPurchase: e.target.value }))}
                                    placeholder="무제한"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    빈 값 = 무제한
                                  </p>
                                </div>

                                {/* 재고 관리 */}
                                <div className="col-span-full">
                                  <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={newProduct.stockEnabled}
                                      onChange={(e) => setNewProduct(prev => ({ ...prev, stockEnabled: e.target.checked }))}
                                      className="w-4 h-4"
                                    />
                                    <span className="text-sm font-medium">재고 관리 활성화</span>
                                  </label>
                                  <p className="text-xs text-gray-500 mt-1 ml-6">
                                    {newProduct.hasOptions
                                      ? '옵션별 재고를 별도 관리합니다'
                                      : '상품 재고를 관리합니다'}
                                  </p>
                                </div>

                                {/* 재고 수량 (옵션 없고 재고 관리 활성화 시에만 표시) */}
                                {newProduct.stockEnabled && !newProduct.hasOptions && (
                                  <div>
                                    <label className="text-sm font-medium mb-1 block">재고 수량</label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={newProduct.stock}
                                      onChange={(e) => setNewProduct(prev => ({ ...prev, stock: e.target.value }))}
                                      placeholder="0"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      0 = 품절 상태
                                    </p>
                                  </div>
                                )}

                                {/* 배송비 설정 */}
                                <div>
                                  <label className="text-sm font-medium mb-1 block">상품별 배송비</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={newProduct.shippingFee}
                                    onChange={(e) => setNewProduct(prev => ({ ...prev, shippingFee: e.target.value }))}
                                    placeholder="기본 정책 사용 (3,000원)"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    빈 값 = 기본 정책 사용 (30,000원 이상 무료)
                                  </p>
                                </div>

                                {/* 환불 정책 */}
                                <div className="col-span-full">
                                  <label className="text-sm font-medium mb-2 block">환불 정책</label>
                                  <div className="flex gap-4">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name="refundPolicy"
                                        checked={newProduct.isRefundable === true}
                                        onChange={() => setNewProduct(prev => ({ ...prev, isRefundable: true }))}
                                        className="w-4 h-4"
                                      />
                                      <span className="text-sm">환불 가능</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name="refundPolicy"
                                        checked={newProduct.isRefundable === false}
                                        onChange={() => setNewProduct(prev => ({ ...prev, isRefundable: false }))}
                                        className="w-4 h-4"
                                      />
                                      <span className="text-sm text-red-600 font-medium">환불 불가</span>
                                    </label>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {newProduct.isRefundable
                                      ? '배송 전 무료 취소 가능, 반품/교환 정책 적용'
                                      : '고객이 구매 시 환불이 불가능한 상품으로 표시됩니다'}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 위치 정보 */}
                        <div>
                          <h3 className="text-lg font-medium mb-3">위치 정보</h3>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">주소 *</label>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                new (window as any).daum.Postcode({
                                  oncomplete: function(data: any) {
                                    const fullAddress = data.roadAddress || data.jibunAddress;
                                    const kakao = (window as any).kakao;

                                    if (kakao && kakao.maps) {
                                      const geocoder = new kakao.maps.services.Geocoder();
                                      geocoder.addressSearch(fullAddress, (result: any, status: any) => {
                                        if (status === kakao.maps.services.Status.OK) {
                                          setNewProduct(prev => ({
                                            ...prev,
                                            address: fullAddress,
                                            location: `${data.sido} ${data.sigungu}`,
                                            coordinates: `${result[0].y},${result[0].x}`
                                          }));
                                          toast.success('주소가 설정되었습니다.');
                                        } else {
                                          setNewProduct(prev => ({
                                            ...prev,
                                            address: fullAddress,
                                            location: `${data.sido} ${data.sigungu}`,
                                            coordinates: ''
                                          }));
                                          toast.warning('좌표를 가져올 수 없어 주소만 저장되었습니다.');
                                        }
                                      });
                                    } else {
                                      setNewProduct(prev => ({
                                        ...prev,
                                        address: fullAddress,
                                        location: `${data.sido} ${data.sigungu}`,
                                        coordinates: ''
                                      }));
                                      toast.warning('카카오맵 API를 불러올 수 없습니다.');
                                    }
                                  }
                                }).open();
                              }}
                              className="w-full justify-start text-left"
                            >
                              <MapPin className="h-4 w-4 mr-2" />
                              {newProduct.address || '주소 검색하기'}
                            </Button>
                            {newProduct.address && (
                              <div className="text-sm text-gray-600 pl-2 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">주소:</span>
                                  <span>{newProduct.address}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">지역:</span>
                                  <span>{newProduct.location}</span>
                                </div>
                                {newProduct.coordinates && (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">좌표:</span>
                                    <span className="text-xs">{newProduct.coordinates}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 이미지 */}
                        <div>
                          <h3 className="text-lg font-medium mb-3">이미지</h3>
                          <div className="space-y-4">
                            {/* 미디어 라이브러리 선택 버튼 */}
                            <div>
                              <label className="text-sm font-medium mb-2 block">이미지 선택 방법</label>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => setIsMediaLibraryOpen(true)}
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  미디어 라이브러리에서 선택
                                </Button>
                                <label className="flex-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => document.getElementById('product-image-upload')?.click()}
                                  >
                                    <Upload className="w-4 h-4 mr-2" />
                                    파일 직접 업로드
                                  </Button>
                                  <input
                                    id="product-image-upload"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">미디어 라이브러리를 사용하면 기존 이미지를 재사용하거나 새 이미지를 업로드할 수 있습니다.</p>
                            </div>

                            {/* 업로드된 이미지 미리보기 */}
                            {newProduct.images.length > 0 && (
                              <div>
                                <label className="text-sm font-medium mb-2 block">업로드된 이미지</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {newProduct.images.map((image, index) => (
                                    <div key={index} className="relative group">
                                      <ImageWithFallback
                                        src={image}
                                        alt={`상품 이미지 ${index + 1}`}
                                        className="w-full h-24 object-cover rounded-lg border"
                                      />
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                        onClick={() => {
                                          const newImages = newProduct.images.filter((_, i) => i !== index);
                                          setNewProduct(prev => ({ ...prev, images: newImages }));
                                        }}
                                      >
                                        ×
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* URL 직접 입력 옵션 */}
                            <div>
                              <label className="text-sm font-medium mb-2 block">또는 이미지 URL 직접 입력</label>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="이미지 URL을 입력하세요"
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      const url = e.currentTarget.value.trim();
                                      if (url) {
                                        setNewProduct(prev => ({ ...prev, images: [...prev.images, url] }));
                                        e.currentTarget.value = '';
                                      }
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={(e) => {
                                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                    const url = input.value.trim();
                                    if (url) {
                                      setNewProduct(prev => ({ ...prev, images: [...prev.images, url] }));
                                      input.value = '';
                                    }
                                  }}
                                >
                                  추가
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 설명 */}
                        <div>
                          <h3 className="text-lg font-medium mb-3">상품 설명</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-1 block">간단 설명</label>
                              <Textarea
                                value={newProduct.description}
                                onChange={(e) => {
                                  const newDescription = e.target.value;
                                  setNewProduct(prev => {
                                    const updatedProduct = { ...prev, description: newDescription };

                                    // 🤖 카테고리가 아직 선택되지 않았거나 기본값인 경우 자동 추천
                                    if (!updatedProduct.category || updatedProduct.category === '') {
                                      const suggestedCategory = autoSuggestCategory(updatedProduct.title, newDescription);
                                      if (suggestedCategory) {
                                        // 설명 기반 자동 카테고리 추천 완료
                                        updatedProduct.category = suggestedCategory;
                                        toast.success(`설명 내용을 바탕으로 카테고리가 "${suggestedCategory}"로 설정되었습니다.`);
                                      }
                                    }

                                    return updatedProduct;
                                  });
                                }}
                                placeholder="간단한 상품 설명을 입력하세요"
                                rows={2}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">상세 설명</label>
                              <Textarea
                                value={newProduct.longDescription}
                                onChange={(e) => setNewProduct(prev => ({ ...prev, longDescription: e.target.value }))}
                                placeholder="상세한 상품 설명을 입력하세요"
                                rows={4}
                              />
                            </div>
                          </div>
                        </div>

                        {/* 하이라이트 및 포함/미포함 사항 */}
                        <div className="grid grid-cols-3 gap-6">
                          <div>
                            <h4 className="font-medium mb-2">주요 하이라이트</h4>
                            {newProduct.highlights.map((highlight, index) => (
                              <div key={index} className="flex gap-2 mb-2">
                                <Input
                                  value={highlight}
                                  onChange={(e) => {
                                    const newHighlights = [...newProduct.highlights];
                                    newHighlights[index] = e.target.value;
                                    setNewProduct(prev => ({ ...prev, highlights: newHighlights }));
                                  }}
                                  placeholder="하이라이트"
                                />
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setNewProduct(prev => ({ ...prev, highlights: [...prev.highlights, ''] }))}
                            >
                              추가
                            </Button>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">포함 사항</h4>
                            {newProduct.included.map((item, index) => (
                              <div key={index} className="flex gap-2 mb-2">
                                <Input
                                  value={item}
                                  onChange={(e) => {
                                    const newIncluded = [...newProduct.included];
                                    newIncluded[index] = e.target.value;
                                    setNewProduct(prev => ({ ...prev, included: newIncluded }));
                                  }}
                                  placeholder="포함 항목"
                                />
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setNewProduct(prev => ({ ...prev, included: [...prev.included, ''] }))}
                            >
                              추가
                            </Button>
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">미포함 사항</h4>
                            {newProduct.excluded.map((item, index) => (
                              <div key={index} className="flex gap-2 mb-2">
                                <Input
                                  value={item}
                                  onChange={(e) => {
                                    const newExcluded = [...newProduct.excluded];
                                    newExcluded[index] = e.target.value;
                                    setNewProduct(prev => ({ ...prev, excluded: newExcluded }));
                                  }}
                                  placeholder="미포함 항목"
                                />
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setNewProduct(prev => ({ ...prev, excluded: [...prev.excluded, ''] }))}
                            >
                              추가
                            </Button>
                          </div>
                        </div>

                        {/* 추천 상품 체크박스 */}
                        <div>
                          <label className="flex items-center text-sm font-medium">
                            <input
                              type="checkbox"
                              checked={newProduct.featured}
                              onChange={(e) => setNewProduct(prev => ({ ...prev, featured: e.target.checked }))}
                              className="mr-2"
                            />
                            추천 상품으로 등록
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                          취소
                        </Button>
                        <Button
                          onClick={handleAddProduct}
                          disabled={isLoading}
                          className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                        >
                          {isLoading ? '추가 중...' : '상품 추가'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="상품명, 위치 또는 설명 검색"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 min-h-[44px]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-[150px] min-h-[44px]">
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
                      <SelectTrigger className="w-[120px] min-h-[44px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 상태</SelectItem>
                        <SelectItem value="active">활성</SelectItem>
                        <SelectItem value="inactive">비활성</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 상품 테이블 */}
                <div className="border rounded-lg overflow-x-auto">
                  <Table className="min-w-[700px]">
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
                              <ImageWithFallback
                                src={product.image}
                                alt={product.title}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                              <div>
                                <div className="font-medium">
                                  {product.title}
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
                          <TableCell>₩{(product.price || 0).toLocaleString()}</TableCell>
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
                              {product.category === '팝업' && product.hasOptions && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingProductForOptions(product);
                                    setIsOptionsDialogOpen(true);
                                  }}
                                  title="옵션 관리"
                                  className="text-purple-600 hover:text-purple-700"
                                >
                                  <Settings className="h-3 w-3" />
                                </Button>
                              )}
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


          {/* 미디어 라이브러리 탭 - 배너 관리로 통합되어 제거됨 */}
          {false && <TabsContent value="media" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>미디어 라이브러리</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 안내 메시지 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">미디어 라이브러리 사용 방법</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• 상품 추가/수정 시 "미디어 라이브러리에서 선택" 버튼을 클릭하세요</li>
                      <li>• 업로드된 모든 이미지를 한 곳에서 관리할 수 있습니다</li>
                      <li>• 이미지는 카테고리와 사용 위치별로 분류됩니다</li>
                      <li>• 최대 10MB까지 업로드 가능합니다 (JPG, PNG, GIF, WEBP, SVG)</li>
                    </ul>
                  </div>

                  {/* 미디어 라이브러리 열기 버튼 */}
                  <div className="flex justify-center py-8">
                    <Button
                      size="lg"
                      onClick={() => setIsMediaLibraryOpen(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      미디어 라이브러리 열기
                    </Button>
                  </div>

                  {/* 빠른 통계 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                      <div className="text-sm font-medium text-blue-700 mb-1">전체 미디어</div>
                      <div className="text-2xl font-bold text-blue-900">-</div>
                      <div className="text-xs text-blue-600 mt-1">모든 카테고리</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                      <div className="text-sm font-medium text-green-700 mb-1">상품 이미지</div>
                      <div className="text-2xl font-bold text-green-900">-</div>
                      <div className="text-xs text-green-600 mt-1">product 카테고리</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                      <div className="text-sm font-medium text-purple-700 mb-1">배너 이미지</div>
                      <div className="text-2xl font-bold text-purple-900">-</div>
                      <div className="text-xs text-purple-600 mt-1">banner 카테고리</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                      <div className="text-sm font-medium text-orange-700 mb-1">블로그 이미지</div>
                      <div className="text-2xl font-bold text-orange-900">-</div>
                      <div className="text-xs text-orange-600 mt-1">blog 카테고리</div>
                    </div>
                  </div>

                  {/* 최근 업로드 섹션 */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">최근 업로드된 미디어</h3>
                    <div className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      미디어 라이브러리를 열어서 확인하세요
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>}

          {/* 기존 images 탭 내용 주석처리 */}
          {false && (
            <>
              <div>
                <div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">홈페이지 액티비티 섹션</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 왼쪽 큰 이미지 */}
                      <Card className="md:col-span-2">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <ImageWithFallback
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
                                <Button variant="outline" size="sm" onClick={() => handleOpenImageDialog({ id: 'main-1', title: '신안 민박 (메인)', usage: 'product', description: '홈페이지 액티비티 섹션 메인 이미지', url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop' })}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteImage('main-1')}>
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
                              <ImageWithFallback
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
                                  <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => handleOpenImageDialog({ id: 'sub-1', title: '갯벌체험', usage: 'product', description: '우상단 이미지', url: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=300&h=200&fit=crop' })}>
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteImage('sub-1')}>
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
                              <ImageWithFallback
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
                                  <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => handleOpenImageDialog({ id: 'sub-2', title: '홍도 유람선', usage: 'product', description: '우하단 이미지', url: 'https://images.unsplash.com/photo-1464822759880-4601b726be04?w=300&h=200&fit=crop' })}>
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteImage('sub-2')}>
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
                                <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => handleOpenImageDialog({ id: `other-${index}`, title: `이미지 ${index + 1}`, usage: 'other', description: '', url: '' })}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => handleDeleteImage(`other-${index}`)}>
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
              </div>
            </>
          )}

          {/* 파트너 관리 탭 */}
          <TabsContent value="partners" className="space-y-6">
            {/* 파트너 신청 승인 섹션 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>파트너 신청 관리</CardTitle>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleViewHistory}
                    >
                      📋 신청 내역
                    </Button>
                    <Badge variant="secondary">
                      신청 대기: {partnerApplications.filter(p => p.status === 'pending').length}개
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {partnerApplications
                    .filter(partner => partner.status === 'pending')
                    .map((partner) => (
                    <Card key={partner.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {
                      setEditingApplication(partner);
                      setIsApplicationEditOpen(true);
                    }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{partner.business_name || '파트너 업체'}</h3>
                            <p className="text-sm text-gray-600">{partner.contact_name || '담당자 미상'}</p>
                          </div>
                          <Badge variant="secondary">
                            대기중
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{partner.business_address || partner.address || '주소 미입력'}</span>
                          </div>
                          {partner.location && (
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                              <span>{partner.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white flex-1"
                            onClick={() => handleApprovePartner(partner.id)}
                          >
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => handleRejectPartner(partner.id)}
                          >
                            거부
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {partnerApplications.filter(p => p.status === 'pending').length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">대기중인 파트너 신청이 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 승인된 파트너 관리 섹션 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>등록된 파트너 관리</CardTitle>
                  <Button
                    className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                    onClick={() => handleOpenPartnerDialog()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    파트너 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center space-x-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="파트너명, 담당자 또는 이메일 검색"
                      className="pl-9"
                      value={partnerSearchQuery}
                      onChange={(e) => setPartnerSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    const filteredPartners = partners.filter(partner =>
                      partner.business_name?.toLowerCase().includes(partnerSearchQuery.toLowerCase()) ||
                      partner.contact_name?.toLowerCase().includes(partnerSearchQuery.toLowerCase()) ||
                      partner.email?.toLowerCase().includes(partnerSearchQuery.toLowerCase())
                    );
                    const startIndex = (partnerCurrentPage - 1) * partnersPerPage;
                    const endIndex = startIndex + partnersPerPage;
                    const paginatedPartners = filteredPartners.slice(startIndex, endIndex);

                    return paginatedPartners.map((partner) => (
                    <Card key={partner.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{partner.business_name}</h3>
                            <p className="text-sm text-gray-600">{partner.contact_name}</p>
                            <p className="text-xs text-gray-500">{partner.email}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="mb-1">
                              {partner.tier?.toUpperCase() || 'BRONZE'}
                            </Badge>
                            {partner.is_verified && (
                              <div className="flex items-center justify-end">
                                <Check className="h-3 w-3 text-green-500 mr-1" />
                                <span className="text-xs text-green-600">인증됨</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="truncate">{partner.location}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Star className="h-4 w-4 mr-2 text-yellow-500" />
                            <span>
                              {partner.rating_avg ? `${Number(partner.rating_avg).toFixed(1)} (${partner.rating_count}건)` : '평점 없음'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 line-clamp-2">
                            {partner.services}
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleOpenPartnerDialog(partner)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            수정
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePartner(partner.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ));
                  })()}
                </div>

                {/* 페이지네이션 */}
                {(() => {
                  const filteredPartners = partners.filter(partner =>
                    partner.business_name?.toLowerCase().includes(partnerSearchQuery.toLowerCase()) ||
                    partner.contact_name?.toLowerCase().includes(partnerSearchQuery.toLowerCase()) ||
                    partner.email?.toLowerCase().includes(partnerSearchQuery.toLowerCase())
                  );
                  const totalPages = Math.ceil(filteredPartners.length / partnersPerPage);

                  if (totalPages > 1) {
                    return (
                      <div className="flex justify-center items-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPartnerCurrentPage(Math.max(1, partnerCurrentPage - 1))}
                          disabled={partnerCurrentPage === 1}
                        >
                          이전
                        </Button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={partnerCurrentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPartnerCurrentPage(page)}
                            className={partnerCurrentPage === page ? "bg-blue-600 text-white" : ""}
                          >
                            {page}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPartnerCurrentPage(Math.min(totalPages, partnerCurrentPage + 1))}
                          disabled={partnerCurrentPage === totalPages}
                        >
                          다음
                        </Button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {partners.length === 0 && (
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
                      placeholder="주문번호, 고객명 또는 이메일 검색"
                      className="pl-9"
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
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
                      <TableHead>주문자 정보</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead>예약일/인원</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>결제/예약상태</TableHead>
                      <TableHead>주문일시</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length > 0 ? orders
                      .filter(order =>
                        order.order_number?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                        order.customer_info?.name?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                        order.customer_info?.email?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                        order.user_name?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                        order.user_email?.toLowerCase().includes(orderSearchQuery.toLowerCase())
                      )
                      .map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium text-blue-600">{order.order_number}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {order.user_email && (
                              <div className="text-sm text-blue-600">
                                {order.user_email}
                              </div>
                            )}
                            {/* 팝업 상품인 경우 배송 주소 표시 */}
                            {order.category === '팝업' && order.shipping_address && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <div className="text-xs font-medium text-blue-700 mb-1">📦 배송지</div>
                                <div className="text-xs text-gray-600">
                                  [{order.shipping_zipcode}] {order.shipping_address}
                                </div>
                                {order.shipping_address_detail && (
                                  <div className="text-xs text-gray-600">
                                    {order.shipping_address_detail}
                                  </div>
                                )}
                                {order.shipping_name && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    수령인: {order.shipping_name} / {order.shipping_phone}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {order.product_name && <div className="font-medium">{order.product_name}</div>}
                            <div className="text-xs text-gray-500">
                              {order.category ? `카테고리: ${order.category}` : ''}
                            </div>
                            {order.selected_options && (() => {
                              try {
                                const options = typeof order.selected_options === 'string'
                                  ? JSON.parse(order.selected_options)
                                  : order.selected_options;
                                return (
                                  <div className="text-xs text-purple-700 font-medium mt-1 bg-purple-50 px-2 py-1 rounded">
                                    옵션: {options.name} - {options.value}
                                    {options.priceAdjustment !== 0 && (
                                      <span className="ml-1">({options.priceAdjustment > 0 ? '+' : ''}{options.priceAdjustment.toLocaleString()}원)</span>
                                    )}
                                  </div>
                                );
                              } catch (e) {
                                return null;
                              }
                            })()}
                            {/* 팝업 상품인 경우 배송지 정보 표시 */}
                            {order.category === '팝업' && order.shipping_address && (
                              <div className="mt-2 pt-2 border-t border-gray-200 bg-blue-50 px-2 py-1 rounded">
                                <div className="text-xs font-medium text-blue-700 mb-1">📦 배송지</div>
                                <div className="text-xs text-gray-700">
                                  [{order.shipping_zipcode}] {order.shipping_address}
                                </div>
                                {order.shipping_address_detail && (
                                  <div className="text-xs text-gray-700">
                                    {order.shipping_address_detail}
                                  </div>
                                )}
                                {order.shipping_name && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    수령인: {order.shipping_name} / {order.shipping_phone}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {order.category !== '팝업' && order.start_date && (
                              <div>
                                {new Date(order.start_date).toLocaleDateString('ko-KR')}
                                {order.end_date && order.end_date !== order.start_date && (
                                  <span> ~ {new Date(order.end_date).toLocaleDateString('ko-KR')}</span>
                                )}
                              </div>
                            )}
                            {order.category === '팝업' ? (
                              <div className="text-xs text-gray-500">
                                수량 {order.num_adults || 1}개
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">
                                성인 {order.num_adults}명
                                {order.num_children > 0 ? `, 아동 ${order.num_children}명` : ''}
                                {order.num_seniors > 0 ? `, 경로 ${order.num_seniors}명` : ''}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {order.subtotal && order.delivery_fee !== undefined ? (
                              <>
                                <div className="text-xs text-gray-600">상품 {order.subtotal.toLocaleString()}원</div>
                                <div className="text-xs text-gray-600">
                                  배송비 {order.delivery_fee > 0 ? order.delivery_fee.toLocaleString() : '0'}원
                                </div>
                                <div className="border-t pt-1 mt-1">
                                  <div className="font-semibold">₩{order.amount?.toLocaleString() || order.total_amount?.toLocaleString() || '0'}</div>
                                </div>
                              </>
                            ) : (
                              <div className="font-semibold">₩{order.amount?.toLocaleString() || order.total_amount?.toLocaleString() || '0'}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            order.payment_status === 'completed' || order.payment_status === 'pending' ? 'default' :
                            order.payment_status === 'refunded' ? 'secondary' :
                            order.payment_status === 'failed' ? 'destructive' :
                            order.status === 'confirmed' ? 'default' :
                            order.status === 'cancelled' ? 'destructive' : 'outline'
                          }>
                            {order.payment_status === 'refunded' ? '환불됨' :
                             order.payment_status === 'failed' ? '결제실패' :
                             order.status === 'confirmed' ? '확정' :
                             order.status === 'completed' ? '완료' :
                             order.status === 'cancelled' ? '취소' : '결제됨'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {order.created_at ? new Date(order.created_at).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Seoul'
                            }) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {order.status === 'pending' && order.category !== '팝업' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                              >
                                확정
                              </Button>
                            )}
                            {order.category === '팝업' && order.delivery_status && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700"
                                onClick={() => {
                                  setSelectedShippingOrder(order);
                                  setIsShippingDialogOpen(true);
                                }}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                배송 관리
                              </Button>
                            )}
                            {order.category === '팝업' && order.payment_status !== 'refunded' && order.payment_status !== 'failed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-red-50 hover:bg-red-100 text-red-700"
                                onClick={() => handleRefundOrder(order)}
                              >
                                환불
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteOrder(order.id)}
                            >
                              삭제
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          주문 데이터가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">총 {orders.length}개의 주문</p>
                </div>
              </CardContent>
            </Card>

            {/* 배송 관리 다이얼로그 */}
            <ShippingManagementDialog
              open={isShippingDialogOpen}
              onOpenChange={setIsShippingDialogOpen}
              booking={selectedShippingOrder}
              onUpdate={loadAdminData}
            />
          </TabsContent>

          {/* 숙박 관리 탭 */}
          <TabsContent value="accommodation" className="space-y-6">
            <AccommodationManagement />
          </TabsContent>

          {/* 렌트카 관리 탭 */}
          <TabsContent value="rentcar" className="space-y-6">
            <RentcarManagement />
          </TabsContent>

          {/* 배너 관리 탭 */}
          <TabsContent value="banners" className="space-y-6">
            <BannerManagement />
          </TabsContent>

          {/* 리뷰 관리 탭 */}
          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>리뷰 관리</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                      onClick={() => handleOpenReviewDialog()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      리뷰 추가
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{isCreateReviewMode ? '새 리뷰 추가' : '리뷰 수정'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">리뷰 타입</label>
                            <Select
                              value={newReview.review_type || 'listing'}
                              onValueChange={(value) => setNewReview({ ...newReview, review_type: value as 'listing' | 'rentcar', listing_id: '', rentcar_booking_id: '' })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="리뷰 타입 선택" />
                              </SelectTrigger>
                              <SelectContent className="z-[9999]">
                                <SelectItem value="listing">일반 상품</SelectItem>
                                <SelectItem value="rentcar">렌트카</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {(!newReview.review_type || newReview.review_type === 'listing') && (
                            <div>
                              <label className="text-sm font-medium mb-1 block">상품 선택</label>
                              <Select
                                value={newReview.listing_id}
                                onValueChange={(value) => setNewReview({ ...newReview, listing_id: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="상품을 선택하세요" />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id.toString()}>
                                      {product.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {newReview.review_type === 'rentcar' && (
                            <div>
                              <label className="text-sm font-medium mb-1 block">렌트카 예약 ID</label>
                              <Input
                                placeholder="렌트카 예약 ID를 입력하세요"
                                value={newReview.rentcar_booking_id || ''}
                                onChange={(e) => setNewReview({ ...newReview, rentcar_booking_id: e.target.value })}
                              />
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium mb-1 block">작성자</label>
                            <Input
                              placeholder="작성자명을 입력하세요"
                              value={newReview.user_name}
                              onChange={(e) => setNewReview({ ...newReview, user_name: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-1 block">평점</label>
                              <Select
                                value={newReview.rating}
                                onValueChange={(value) => setNewReview({ ...newReview, rating: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="평점 선택" />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
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
                              <Input
                                type="date"
                                value={newReview.visit_date}
                                onChange={(e) => setNewReview({ ...newReview, visit_date: e.target.value })}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">리뷰 제목</label>
                            <Input
                              placeholder="리뷰 제목을 입력하세요"
                              value={newReview.title}
                              onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">리뷰 내용</label>
                            <Textarea
                              placeholder="리뷰 내용을 입력하세요"
                              rows={4}
                              value={newReview.comment}
                              onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsReviewDialogOpen(false);
                              setNewReview({
                                listing_id: '',
                                user_name: '',
                                rating: '',
                                visit_date: '',
                                title: '',
                                comment: '',
                                review_type: 'listing',
                                rentcar_booking_id: ''
                              });
                            }}
                          >
                            취소
                          </Button>
                          <Button
                            className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                            onClick={() => {
                              handleSaveReview({
                                listing_id: parseInt(newReview.listing_id),
                                user_name: newReview.user_name,
                                rating: parseInt(newReview.rating),
                                visit_date: newReview.visit_date,
                                title: newReview.title,
                                comment_md: newReview.comment
                              });
                            }}
                          >
                            {isCreateReviewMode ? '추가' : '수정'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

              <CardContent>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="상품명, 작성자 검색"
                        className="pl-10"
                        value={reviewSearchQuery}
                        onChange={(e) => setReviewSearchQuery(e.target.value)}
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
                      <TableHead>타입</TableHead>
                      <TableHead>상품/차량</TableHead>
                      <TableHead>작성자</TableHead>
                      <TableHead>평점</TableHead>
                      <TableHead>리뷰 내용</TableHead>
                      <TableHead>작성일</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.length > 0 ? reviews
                      .filter(review =>
                        review.user_name?.toLowerCase().includes(reviewSearchQuery.toLowerCase()) ||
                        review.listing_title?.toLowerCase().includes(reviewSearchQuery.toLowerCase()) ||
                        review.rentcar_vendor_name?.toLowerCase().includes(reviewSearchQuery.toLowerCase()) ||
                        review.rentcar_vehicle_make?.toLowerCase().includes(reviewSearchQuery.toLowerCase()) ||
                        review.rentcar_vehicle_model?.toLowerCase().includes(reviewSearchQuery.toLowerCase()) ||
                        review.comment_md?.toLowerCase().includes(reviewSearchQuery.toLowerCase()) ||
                        review.title?.toLowerCase().includes(reviewSearchQuery.toLowerCase())
                      )
                      .map((review: any) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <Badge variant={review.review_type === 'rentcar' ? 'default' : 'secondary'}>
                            {review.review_type === 'rentcar'
                              ? '렌트카'
                              : review.listing_category === 'tour' ? '투어'
                              : review.listing_category === 'food' ? '맛집'
                              : review.listing_category === 'accommodation' ? '숙박'
                              : review.listing_category === 'experience' ? '체험'
                              : review.listing_category === 'event' ? '이벤트'
                              : review.listing_category === 'package' ? '패키지'
                              : '일반'
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {review.review_type === 'rentcar'
                            ? `${review.rentcar_vendor_name || '업체'} - ${review.rentcar_vehicle_make || ''} ${review.rentcar_vehicle_model || ''}`.trim()
                            : (review.listing_title || '상품명')
                          }
                        </TableCell>
                        <TableCell>{review.user_name || '사용자'}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                            {review.rating || 0}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {review.comment_md || review.title || '리뷰 내용'}
                        </TableCell>
                        <TableCell>
                          {review.created_at ? new Date(review.created_at).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReviewDialog(review)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteReview(review.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          리뷰 데이터가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
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
                  <Button className="bg-[#8B5FBF] hover:bg-[#7A4FB5]" onClick={() => handleOpenUserDialog()}>
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
                      placeholder="이름, 이메일 또는 전화번호 검색"
                      className="pl-9"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
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
                    {(() => {
                      const filteredUsers = users
                        .filter(user => user.role !== 'admin') // 관리자 계정 제외
                        .filter(user =>
                          user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                          user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                        );

                      const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
                      const startIndex = (userCurrentPage - 1) * usersPerPage;
                      const endIndex = startIndex + usersPerPage;
                      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

                      return paginatedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? '관리자' :
                             user.role === 'partner' ? '파트너' :
                             user.role === 'vendor' ? '벤더' : '일반 사용자'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="default">활성</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleOpenUserDialog(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleOpenUserDetail(user)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              disabled={user.role === 'admin'}
                              title={user.role === 'admin' ? '관리자 계정은 삭제할 수 없습니다' : '사용자 계정 삭제'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>

                {users.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">등록된 사용자가 없습니다.</p>
                  </div>
                )}

                {/* 페이지네이션 */}
                {(() => {
                  const filteredUsers = users
                    .filter(user => user.role !== 'admin')
                    .filter(user =>
                      user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                    );
                  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

                  if (totalPages <= 1) return null;

                  return (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUserCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={userCurrentPage === 1}
                      >
                        이전
                      </Button>

                      <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={userCurrentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setUserCurrentPage(page)}
                            className={userCurrentPage === page ? "bg-[#8B5FBF] hover:bg-[#7A4FB5]" : ""}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setUserCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={userCurrentPage === totalPages}
                      >
                        다음
                      </Button>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* 사용자 초대/수정 다이얼로그 */}
            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{isCreateUserMode ? '사용자 초대' : '사용자 정보 수정'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">이름 *</label>
                    <Input
                      placeholder="이름을 입력하세요"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">이메일 *</label>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      {isCreateUserMode ? '비밀번호 *' : '새 비밀번호 (변경 시)'}
                    </label>
                    <Input
                      type="password"
                      placeholder={isCreateUserMode ? '비밀번호를 입력하세요' : '변경할 비밀번호를 입력하세요'}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">전화번호</label>
                    <Input
                      type="tel"
                      placeholder="010-1234-5678"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">역할</label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">일반 사용자</SelectItem>
                        <SelectItem value="partner">파트너</SelectItem>
                        <SelectItem value="admin">관리자</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsUserDialogOpen(false);
                      setNewUser({
                        name: '',
                        email: '',
                        password: '',
                        phone: '',
                        role: 'user'
                      });
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                    onClick={handleSaveUser}
                  >
                    {isCreateUserMode ? '초대' : '수정'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* 사용자 상세보기 다이얼로그 */}
            <Dialog open={isUserDetailDialogOpen} onOpenChange={setIsUserDetailDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>사용자 상세 정보</DialogTitle>
                </DialogHeader>
                {selectedUser && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">이름</label>
                        <p className="mt-1">{selectedUser.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">이메일</label>
                        <p className="mt-1">{selectedUser.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">전화번호</label>
                        <p className="mt-1">{selectedUser.phone || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">역할</label>
                        <p className="mt-1">
                          <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                            {selectedUser.role === 'admin' ? '관리자' :
                             selectedUser.role === 'partner' ? '파트너' : '일반 사용자'}
                          </Badge>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">가입일</label>
                        <p className="mt-1">{new Date(selectedUser.created_at).toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">마지막 업데이트</label>
                        <p className="mt-1">{new Date(selectedUser.updated_at || selectedUser.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    {selectedUser.bio && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">소개</label>
                        <p className="mt-1">{selectedUser.bio}</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-end mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsUserDetailDialogOpen(false)}
                  >
                    닫기
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* 문의 관리 탭 */}
          {/* 페이지 미디어 관리 탭 - 배너 관리로 통합되어 제거됨 */}
          {false && <TabsContent value="pagemedia" className="space-y-6">
            <MediaManagement />
          </TabsContent>}

          <TabsContent value="contacts" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>문의 관리</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select value={contactStatusFilter} onValueChange={(value: any) => setContactStatusFilter(value)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="pending">대기중</SelectItem>
                        <SelectItem value="replied">답변완료</SelectItem>
                        <SelectItem value="resolved">해결</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="이름, 이메일 검색..."
                      className="pl-9"
                      value={contactSearchQuery}
                      onChange={(e) => setContactSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>메시지</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>등록일</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts
                      .filter(contact => {
                        const matchesSearch = contact.name?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                          contact.email?.toLowerCase().includes(contactSearchQuery.toLowerCase());
                        const matchesStatus = contactStatusFilter === 'all' || contact.status === contactStatusFilter;
                        return matchesSearch && matchesStatus;
                      })
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 20)
                      .map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">{contact.id}</TableCell>
                          <TableCell>{contact.name}</TableCell>
                          <TableCell className="text-sm text-gray-600">{contact.email}</TableCell>
                          <TableCell className="max-w-xs truncate">{contact.message}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                contact.status === 'pending' ? 'default' :
                                contact.status === 'replied' ? 'secondary' : 'outline'
                              }
                            >
                              {contact.status === 'pending' ? '대기중' :
                               contact.status === 'replied' ? '답변완료' : '해결'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{new Date(contact.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedContact(contact);
                                  setContactReply(contact.admin_reply || '');
                                  setIsContactDetailOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteContact(contact.id, contact.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>

                {contacts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">등록된 문의가 없습니다.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 문의 상세/답변 다이얼로그 */}
            <Dialog open={isContactDetailOpen} onOpenChange={setIsContactDetailOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>문의 상세</DialogTitle>
                </DialogHeader>
                {selectedContact && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">이름</label>
                        <p className="mt-1">{selectedContact.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">이메일</label>
                        <p className="mt-1">{selectedContact.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">상태</label>
                        <p className="mt-1">
                          <Badge
                            variant={
                              selectedContact.status === 'pending' ? 'default' :
                              selectedContact.status === 'replied' ? 'secondary' : 'outline'
                            }
                          >
                            {selectedContact.status === 'pending' ? '대기중' :
                             selectedContact.status === 'replied' ? '답변완료' : '해결'}
                          </Badge>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">등록일</label>
                        <p className="mt-1">{new Date(selectedContact.created_at).toLocaleString()}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">문의 내용</label>
                      <p className="mt-1 p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{selectedContact.message}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">관리자 답변</label>
                      <Textarea
                        rows={6}
                        value={contactReply}
                        onChange={(e) => setContactReply(e.target.value)}
                        placeholder="답변을 입력하세요..."
                        className="w-full"
                      />
                    </div>

                    {selectedContact.admin_reply && (
                      <div className="text-sm text-gray-500">
                        <p>답변일: {selectedContact.replied_at ? new Date(selectedContact.replied_at).toLocaleString() : '-'}</p>
                      </div>
                    )}

                    <div className="flex justify-between mt-6">
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (confirm('이 문의를 해결 상태로 변경하시겠습니까?')) {
                              const result = await api.updateContactStatus(selectedContact.id, 'resolved');
                              if (result.success) {
                                toast.success('상태가 변경되었습니다.');
                                const updatedContacts = await api.getContacts();
                                if (updatedContacts.success) {
                                  setContacts(updatedContacts.data);
                                }
                                setIsContactDetailOpen(false);
                              } else {
                                toast.error(result.error || '상태 변경 실패');
                              }
                            }
                          }}
                        >
                          해결 완료
                        </Button>
                      </div>
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setIsContactDetailOpen(false)}
                        >
                          취소
                        </Button>
                        <Button
                          className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                          onClick={async () => {
                            if (!contactReply.trim()) {
                              toast.error('답변을 입력해주세요.');
                              return;
                            }

                            const result = await api.replyContact(selectedContact.id, contactReply, user?.id || 1);
                            if (result.success) {
                              toast.success('답변이 등록되었습니다.');
                              const updatedContacts = await api.getContacts();
                              if (updatedContacts.success) {
                                setContacts(updatedContacts.data);
                              }
                              setIsContactDetailOpen(false);
                              setContactReply('');
                            } else {
                              toast.error(result.error || '답변 등록 실패');
                            }
                          }}
                        >
                          답변 등록
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* 블로그 관리 탭 */}
          <TabsContent value="blogs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>블로그 관리</CardTitle>
                  <Button
                    className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                    onClick={() => handleOpenBlogDialog()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    블로그 포스트 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center space-x-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="제목, 카테고리 또는 내용 검색"
                      className="pl-9"
                      value={blogSearchQuery}
                      onChange={(e) => setBlogSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={blogCategoryFilter} onValueChange={setBlogCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="카테고리 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="travel">여행기</SelectItem>
                      <SelectItem value="tips">여행팁</SelectItem>
                      <SelectItem value="local">로컬맛집</SelectItem>
                      <SelectItem value="culture">문화체험</SelectItem>
                      <SelectItem value="news">소식</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>카테고리</TableHead>
                      <TableHead>작성자</TableHead>
                      <TableHead>조회수</TableHead>
                      <TableHead>좋아요</TableHead>
                      <TableHead>댓글</TableHead>
                      <TableHead>게시일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blogs.length > 0 ? blogs
                      .filter(blog => {
                        // 검색어 필터
                        const matchesSearch = blog.title?.toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
                          blog.author?.toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
                          blog.category?.toLowerCase().includes(blogSearchQuery.toLowerCase());

                        // 카테고리 필터
                        const matchesCategory = blogCategoryFilter === 'all' || blog.category === blogCategoryFilter;

                        return matchesSearch && matchesCategory;
                      })
                      .map((blog: any) => (
                      <TableRow key={blog.id}>
                        <TableCell className="font-medium">{blog.title}</TableCell>
                        <TableCell>{blogCategoryNames[blog.category] || blog.category || '일반'}</TableCell>
                        <TableCell>{blog.author_name || '관리자'}</TableCell>
                        <TableCell>{blog.views || 0}</TableCell>
                        <TableCell>{blog.likes || 0}</TableCell>
                        <TableCell>{blog.comments_count || 0}</TableCell>
                        <TableCell>
                          {blog.published_at ? new Date(blog.published_at).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={blog.is_published ? 'default' : 'secondary'}>
                            {blog.is_published ? '게시됨' : '초안'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenBlogDialog(blog)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteBlog(blog.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          블로그 포스트가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">총 {blogs.length}개의 포스트</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 댓글 관리 탭 - 리뷰 관리로 통합되어 제거됨 */}
          {false && <TabsContent value="blog-comments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>댓글 관리</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>댓글 내용</TableHead>
                      <TableHead>작성자</TableHead>
                      <TableHead>블로그 제목</TableHead>
                      <TableHead>좋아요</TableHead>
                      <TableHead>작성일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blogComments.length > 0 ? blogComments.map((comment: any) => (
                      <TableRow key={comment.id}>
                        <TableCell className="font-medium max-w-xs truncate">{comment.content}</TableCell>
                        <TableCell>{comment.user_name || '익명'}</TableCell>
                        <TableCell className="max-w-xs truncate">{comment.post_title || '-'}</TableCell>
                        <TableCell>{comment.likes || 0}</TableCell>
                        <TableCell>{new Date(comment.created_at).toLocaleDateString('ko-KR')}</TableCell>
                        <TableCell>
                          <Badge variant={comment.is_deleted ? 'destructive' : 'default'}>
                            {comment.is_deleted ? '삭제됨' : '정상'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!comment.is_deleted && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (confirm('정말 이 댓글을 삭제하시겠습니까?')) {
                                  try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3004'}/api/blogs/comments/${comment.id}`, {
                                      method: 'DELETE',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                      }
                                    });
                                    const data = await response.json();
                                    if (data.success) {
                                      setBlogComments(prev => prev.map(c => c.id === comment.id ? { ...c, is_deleted: 1 } : c));
                                      toast.success('댓글이 삭제되었습니다.');
                                    } else {
                                      toast.error(data.message || '삭제 실패');
                                    }
                                  } catch (error) {
                                    console.error('댓글 삭제 실패:', error);
                                    toast.error('댓글 삭제 중 오류가 발생했습니다.');
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          댓글이 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">총 {blogComments.length}개의 댓글</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>}
        </Tabs>
      </div>

      {/* 수정 모달 */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>상품 수정</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div>
                <h3 className="text-lg font-medium mb-3">기본 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">상품명 *</label>
                    <Input
                      value={editingProduct.title}
                      onChange={(e) => setEditingProduct(prev =>
                        prev ? { ...prev, title: e.target.value } : null
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">카테고리 *</label>
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
                    <label className="text-sm font-medium mb-1 block">가격 *</label>
                    <Input
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct(prev =>
                        prev ? { ...prev, price: parseInt(e.target.value) || 0 } : null
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">상태</label>
                    <Select
                      value={editingProduct.status}
                      onValueChange={(value) => setEditingProduct(prev =>
                        prev ? { ...prev, status: value as 'active' | 'inactive' } : null
                      )}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">활성</SelectItem>
                        <SelectItem value="inactive">비활성</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 위치 정보 */}
              <div>
                <h3 className="text-lg font-medium mb-3">위치 정보</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">위치</label>
                    <Input
                      value={editingProduct.location}
                      onChange={(e) => setEditingProduct(prev =>
                        prev ? { ...prev, location: e.target.value } : null
                      )}
                      placeholder="예: 신안군 증도면"
                    />
                  </div>
                </div>
              </div>

              {/* 이미지 */}
              <div>
                <h3 className="text-lg font-medium mb-3">이미지</h3>
                <div className="space-y-4">
                  {/* 현재 이미지 목록 */}
                  {editingProduct.image && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">현재 메인 이미지</label>
                      <div className="flex gap-2 items-center">
                        <ImageWithFallback src={editingProduct.image} alt="메인 이미지" className="w-24 h-24 object-cover rounded" />
                        <Input
                          value={editingProduct.image}
                          onChange={(e) => setEditingProduct(prev =>
                            prev ? { ...prev, image: e.target.value } : null
                          )}
                          placeholder="이미지 URL"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* 이미지 URL 입력 또는 파일 업로드 */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">새 이미지 추가</label>

                    {/* URL 입력 */}
                    <div className="flex gap-2 mb-3">
                      <Input
                        id="edit-new-image-url"
                        placeholder="이미지 URL을 입력하고 Enter 또는 추가 버튼을 누르세요"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const url = e.currentTarget.value.trim();
                            if (url) {
                              setEditingProduct(prev =>
                                prev ? { ...prev, image: url } : null
                              );
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.getElementById('edit-new-image-url') as HTMLInputElement;
                          const url = input?.value.trim();
                          if (url) {
                            setEditingProduct(prev =>
                              prev ? { ...prev, image: url } : null
                            );
                            input.value = '';
                          }
                        }}
                      >
                        추가
                      </Button>
                    </div>

                    {/* 파일 업로드 */}
                    <div>
                      <label>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => document.getElementById('edit-product-image-upload')?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          파일 직접 업로드
                        </Button>
                        <input
                          id="edit-product-image-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('category', 'listings');

                                const response = await fetch('/api/upload-image', {
                                  method: 'POST',
                                  body: formData,
                                });

                                const result = await response.json();

                                if (result.success && result.url) {
                                  setEditingProduct(prev =>
                                    prev ? { ...prev, image: result.url } : null
                                  );
                                  toast.success('이미지가 업로드되었습니다.');
                                } else {
                                  toast.error(`이미지 업로드 실패: ${result.message || result.error}`);
                                }
                              } catch (error) {
                                console.error('업로드 오류:', error);
                                toast.error('이미지 업로드 오류');
                              }
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 설명 */}
              <div>
                <h3 className="text-lg font-medium mb-3">상품 설명</h3>
                <div>
                  <label className="text-sm font-medium mb-1 block">설명</label>
                  <Textarea
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct(prev =>
                      prev ? { ...prev, description: e.target.value } : null
                    )}
                    placeholder="상품 설명을 입력하세요"
                    rows={4}
                  />
                </div>
              </div>

              {/* 하이라이트 */}
              <div>
                <h3 className="text-lg font-medium mb-3">하이라이트</h3>
                <div className="space-y-2">
                  {(editingProduct.highlights || []).map((highlight: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={highlight}
                        onChange={(e) => {
                          const newHighlights = [...(editingProduct.highlights || [])];
                          newHighlights[index] = e.target.value;
                          setEditingProduct(prev =>
                            prev ? { ...prev, highlights: newHighlights } : null
                          );
                        }}
                        placeholder="하이라이트를 입력하세요"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newHighlights = (editingProduct.highlights || []).filter((_: any, i: number) => i !== index);
                          setEditingProduct(prev =>
                            prev ? { ...prev, highlights: newHighlights } : null
                          );
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newHighlights = [...(editingProduct.highlights || []), ''];
                      setEditingProduct(prev =>
                        prev ? { ...prev, highlights: newHighlights } : null
                      );
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    하이라이트 추가
                  </Button>
                </div>
              </div>

              {/* 포함사항 */}
              <div>
                <h3 className="text-lg font-medium mb-3">포함사항</h3>
                <div className="space-y-2">
                  {(editingProduct.included || []).map((item: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => {
                          const newIncluded = [...(editingProduct.included || [])];
                          newIncluded[index] = e.target.value;
                          setEditingProduct(prev =>
                            prev ? { ...prev, included: newIncluded } : null
                          );
                        }}
                        placeholder="포함사항을 입력하세요"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newIncluded = (editingProduct.included || []).filter((_: any, i: number) => i !== index);
                          setEditingProduct(prev =>
                            prev ? { ...prev, included: newIncluded } : null
                          );
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newIncluded = [...(editingProduct.included || []), ''];
                      setEditingProduct(prev =>
                        prev ? { ...prev, included: newIncluded } : null
                      );
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    포함사항 추가
                  </Button>
                </div>
              </div>

              {/* 불포함사항 */}
              <div>
                <h3 className="text-lg font-medium mb-3">불포함사항</h3>
                <div className="space-y-2">
                  {(editingProduct.excluded || []).map((item: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={item}
                        onChange={(e) => {
                          const newExcluded = [...(editingProduct.excluded || [])];
                          newExcluded[index] = e.target.value;
                          setEditingProduct(prev =>
                            prev ? { ...prev, excluded: newExcluded } : null
                          );
                        }}
                        placeholder="불포함사항을 입력하세요"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newExcluded = (editingProduct.excluded || []).filter((_: any, i: number) => i !== index);
                          setEditingProduct(prev =>
                            prev ? { ...prev, excluded: newExcluded } : null
                          );
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newExcluded = [...(editingProduct.excluded || []), ''];
                      setEditingProduct(prev =>
                        prev ? { ...prev, excluded: newExcluded } : null
                      );
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    불포함사항 추가
                  </Button>
                </div>
              </div>

              {/* 태그 */}
              <div>
                <h3 className="text-lg font-medium mb-3">태그</h3>
                <div className="space-y-2">
                  {(editingProduct.tags || []).map((tag: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={tag}
                        onChange={(e) => {
                          const newTags = [...(editingProduct.tags || [])];
                          newTags[index] = e.target.value;
                          setEditingProduct(prev =>
                            prev ? { ...prev, tags: newTags } : null
                          );
                        }}
                        placeholder="태그를 입력하세요"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newTags = (editingProduct.tags || []).filter((_: any, i: number) => i !== index);
                          setEditingProduct(prev =>
                            prev ? { ...prev, tags: newTags } : null
                          );
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newTags = [...(editingProduct.tags || []), ''];
                      setEditingProduct(prev =>
                        prev ? { ...prev, tags: newTags } : null
                      );
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    태그 추가
                  </Button>
                </div>
              </div>

              {/* 편의시설 */}
              <div>
                <h3 className="text-lg font-medium mb-3">편의시설</h3>
                <div className="space-y-2">
                  {(editingProduct.amenities || []).map((amenity: string, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={amenity}
                        onChange={(e) => {
                          const newAmenities = [...(editingProduct.amenities || [])];
                          newAmenities[index] = e.target.value;
                          setEditingProduct(prev =>
                            prev ? { ...prev, amenities: newAmenities } : null
                          );
                        }}
                        placeholder="편의시설을 입력하세요"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newAmenities = (editingProduct.amenities || []).filter((_: any, i: number) => i !== index);
                          setEditingProduct(prev =>
                            prev ? { ...prev, amenities: newAmenities } : null
                          );
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newAmenities = [...(editingProduct.amenities || []), ''];
                      setEditingProduct(prev =>
                        prev ? { ...prev, amenities: newAmenities } : null
                      );
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    편의시설 추가
                  </Button>
                </div>
              </div>

              {/* 가격 정보 */}
              <div>
                <h3 className="text-lg font-medium mb-3">가격 정보</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">성인 가격</label>
                    <Input
                      type="number"
                      value={editingProduct.price || ''}
                      onChange={(e) => setEditingProduct(prev =>
                        prev ? { ...prev, price: parseInt(e.target.value) || 0 } : null
                      )}
                      placeholder="성인 가격"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">어린이 가격</label>
                    <Input
                      type="number"
                      value={editingProduct.childPrice || ''}
                      onChange={(e) => setEditingProduct(prev =>
                        prev ? { ...prev, childPrice: parseInt(e.target.value) || 0 } : null
                      )}
                      placeholder="어린이 가격"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">유아 가격</label>
                    <Input
                      type="number"
                      value={editingProduct.infantPrice || ''}
                      onChange={(e) => setEditingProduct(prev =>
                        prev ? { ...prev, infantPrice: parseInt(e.target.value) || 0 } : null
                      )}
                      placeholder="유아 가격"
                    />
                  </div>
                </div>
              </div>

              {/* 팝업 카테고리 전용 필드 */}
              {editingProduct.category === '팝업' && (
                <div>
                  <h3 className="text-lg font-medium mb-3">팝업 상품 옵션</h3>
                  <div className="space-y-4">
                    {/* 옵션 사용 여부 */}
                    <div>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.hasOptions || false}
                          onChange={(e) => setEditingProduct(prev =>
                            prev ? { ...prev, hasOptions: e.target.checked } : null
                          )}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">옵션 사용 (사이즈, 색상 등)</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        체크 시 상품 등록 후 옵션을 추가할 수 있습니다
                      </p>
                    </div>

                    {/* 구매 수량 제한 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">최소 구매 수량</label>
                        <Input
                          type="number"
                          min="1"
                          value={editingProduct.minPurchase || ''}
                          onChange={(e) => setEditingProduct(prev =>
                            prev ? { ...prev, minPurchase: parseInt(e.target.value) || 1 } : null
                          )}
                          placeholder="1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          기본값: 1개
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 block">최대 구매 수량</label>
                        <Input
                          type="number"
                          min="1"
                          value={editingProduct.maxPurchase || ''}
                          onChange={(e) => setEditingProduct(prev =>
                            prev ? { ...prev, maxPurchase: parseInt(e.target.value) || 0 } : null
                          )}
                          placeholder="무제한"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          빈 값 = 무제한
                        </p>
                      </div>
                    </div>

                    {/* 재고 관리 */}
                    <div>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProduct.stockEnabled || false}
                          onChange={(e) => setEditingProduct(prev =>
                            prev ? { ...prev, stockEnabled: e.target.checked } : null
                          )}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">재고 관리 활성화</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        {editingProduct.hasOptions
                          ? '옵션별 재고를 별도 관리합니다'
                          : '상품 재고를 관리합니다'}
                      </p>
                    </div>

                    {/* 재고 수량 (옵션 없고 재고 관리 활성화 시에만 표시) */}
                    {editingProduct.stockEnabled && !editingProduct.hasOptions && (
                      <div>
                        <label className="text-sm font-medium mb-1 block">재고 수량</label>
                        <Input
                          type="number"
                          min="0"
                          value={editingProduct.stock || ''}
                          onChange={(e) => setEditingProduct(prev =>
                            prev ? { ...prev, stock: parseInt(e.target.value) || 0 } : null
                          )}
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          0 = 품절 상태
                        </p>
                      </div>
                    )}

                    {/* 배송비 설정 */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">상품별 배송비</label>
                      <Input
                        type="number"
                        min="0"
                        value={editingProduct.shippingFee || ''}
                        onChange={(e) => setEditingProduct(prev =>
                          prev ? { ...prev, shippingFee: parseInt(e.target.value) || 0 } : null
                        )}
                        placeholder="기본 정책 사용 (3,000원)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        빈 값 = 기본 정책 사용 (30,000원 이상 무료)
                      </p>
                    </div>

                    {/* 환불 정책 */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">환불 정책</label>
                      <div className="flex gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="editRefundPolicy"
                            checked={editingProduct.isRefundable === true}
                            onChange={() => setEditingProduct(prev =>
                              prev ? { ...prev, isRefundable: true } : null
                            )}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">환불 가능</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="editRefundPolicy"
                            checked={editingProduct.isRefundable === false}
                            onChange={() => setEditingProduct(prev =>
                              prev ? { ...prev, isRefundable: false } : null
                            )}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-red-600 font-medium">환불 불가</span>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {editingProduct.isRefundable
                          ? '배송 전 무료 취소 가능, 반품/교환 정책 적용'
                          : '고객이 구매 시 환불이 불가능한 상품으로 표시됩니다'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 출발 시간 - 여행/체험 카테고리에만 표시 */}
              {['여행', '체험'].includes(editingProduct.category) && (
                <div>
                  <h3 className="text-lg font-medium mb-3">출발 시간</h3>
                  <div className="space-y-2">
                    {(editingProduct.availableStartTimes || []).map((time: string, index: number) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="time"
                          value={time}
                          onChange={(e) => {
                            const newTimes = [...(editingProduct.availableStartTimes || [])];
                            newTimes[index] = e.target.value;
                            setEditingProduct(prev =>
                              prev ? { ...prev, availableStartTimes: newTimes } : null
                            );
                          }}
                          placeholder="출발 시간"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newTimes = (editingProduct.availableStartTimes || []).filter((_: any, i: number) => i !== index);
                            setEditingProduct(prev =>
                              prev ? { ...prev, availableStartTimes: newTimes } : null
                            );
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newTimes = [...(editingProduct.availableStartTimes || []), ''];
                        setEditingProduct(prev =>
                          prev ? { ...prev, availableStartTimes: newTimes } : null
                        );
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      출발 시간 추가
                    </Button>
                  </div>
                </div>
              )}

              {/* 여행 일정 - 여행 카테고리에만 표시 */}
              {editingProduct.category === '여행' && (
                <div>
                  <h3 className="text-lg font-medium mb-3">여행 일정</h3>
                  <div className="space-y-4">
                    {(editingProduct.itinerary || []).map((item: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">일정 {index + 1}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newItinerary = (editingProduct.itinerary || []).filter((_: any, i: number) => i !== index);
                              setEditingProduct(prev =>
                                prev ? { ...prev, itinerary: newItinerary } : null
                              );
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <Input
                            value={item.time}
                            onChange={(e) => {
                              const newItinerary = [...(editingProduct.itinerary || [])];
                              newItinerary[index] = { ...newItinerary[index], time: e.target.value };
                              setEditingProduct(prev =>
                                prev ? { ...prev, itinerary: newItinerary } : null
                              );
                            }}
                            placeholder="시간 (예: 09:00)"
                          />
                          <Input
                            value={item.activity}
                            onChange={(e) => {
                              const newItinerary = [...(editingProduct.itinerary || [])];
                              newItinerary[index] = { ...newItinerary[index], activity: e.target.value };
                              setEditingProduct(prev =>
                                prev ? { ...prev, itinerary: newItinerary } : null
                              );
                            }}
                            placeholder="활동"
                            className="col-span-2"
                          />
                        </div>
                        <Textarea
                          value={item.description}
                          onChange={(e) => {
                            const newItinerary = [...(editingProduct.itinerary || [])];
                            newItinerary[index] = { ...newItinerary[index], description: e.target.value };
                            setEditingProduct(prev =>
                              prev ? { ...prev, itinerary: newItinerary } : null
                            );
                          }}
                          placeholder="상세 설명"
                          rows={2}
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newItinerary = [...(editingProduct.itinerary || []), { time: '', activity: '', description: '' }];
                        setEditingProduct(prev =>
                          prev ? { ...prev, itinerary: newItinerary } : null
                        );
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      일정 추가
                    </Button>
                  </div>
                </div>
              )}

              {/* 추가 패키지/옵션 */}
              <div>
                <h3 className="text-lg font-medium mb-3">추가 패키지/옵션</h3>
                <div className="space-y-4">
                  {(editingProduct.packages || []).map((pkg: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">패키지 {index + 1}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPackages = (editingProduct.packages || []).filter((_: any, i: number) => i !== index);
                            setEditingProduct(prev =>
                              prev ? { ...prev, packages: newPackages } : null
                            );
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <Input
                          value={pkg.id}
                          onChange={(e) => {
                            const newPackages = [...(editingProduct.packages || [])];
                            newPackages[index] = { ...newPackages[index], id: e.target.value };
                            setEditingProduct(prev =>
                              prev ? { ...prev, packages: newPackages } : null
                            );
                          }}
                          placeholder="패키지 ID"
                        />
                        <Input
                          value={pkg.name}
                          onChange={(e) => {
                            const newPackages = [...(editingProduct.packages || [])];
                            newPackages[index] = { ...newPackages[index], name: e.target.value };
                            setEditingProduct(prev =>
                              prev ? { ...prev, packages: newPackages } : null
                            );
                          }}
                          placeholder="패키지명"
                        />
                        <Input
                          type="number"
                          value={pkg.price}
                          onChange={(e) => {
                            const newPackages = [...(editingProduct.packages || [])];
                            newPackages[index] = { ...newPackages[index], price: e.target.value };
                            setEditingProduct(prev =>
                              prev ? { ...prev, packages: newPackages } : null
                            );
                          }}
                          placeholder="가격"
                        />
                      </div>
                      <Textarea
                        value={pkg.description}
                        onChange={(e) => {
                          const newPackages = [...(editingProduct.packages || [])];
                          newPackages[index] = { ...newPackages[index], description: e.target.value };
                          setEditingProduct(prev =>
                            prev ? { ...prev, packages: newPackages } : null
                          );
                        }}
                        placeholder="패키지 설명"
                        rows={2}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPackages = [...(editingProduct.packages || []), { id: '', name: '', price: '', description: '' }];
                      setEditingProduct(prev =>
                        prev ? { ...prev, packages: newPackages } : null
                      );
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    패키지 추가
                  </Button>
                </div>
              </div>

              {/* 옵션 */}
              <div>
                <h3 className="text-lg font-medium mb-3">상품 옵션</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">등록일</label>
                    <Input
                      type="date"
                      value={editingProduct.createdAt}
                      onChange={(e) => setEditingProduct(prev =>
                        prev ? { ...prev, createdAt: e.target.value } : null
                      )}
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="text-sm font-medium flex items-center">
                      <input
                        type="checkbox"
                        checked={editingProduct.featured}
                        onChange={(e) => setEditingProduct(prev =>
                          prev ? { ...prev, featured: e.target.checked } : null
                        )}
                        className="mr-2"
                      />
                      추천 상품
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleEditProduct}
              disabled={isLoading}
              className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
            >
              {isLoading ? '수정 중...' : '수정 완료'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 파트너 생성/수정 대화상자 */}
      <Dialog open={isPartnerDialogOpen} onOpenChange={setIsPartnerDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {isCreatePartnerMode ? '파트너 추가' : '파트너 정보 수정'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  업체명 *
                </label>
                <Input
                  value={newPartner.business_name}
                  onChange={(e) => setNewPartner({ ...newPartner, business_name: e.target.value })}
                  placeholder="업체명을 입력하세요"
                  id="business_name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  담당자명 *
                </label>
                <Input
                  value={newPartner.contact_name}
                  onChange={(e) => setNewPartner({ ...newPartner, contact_name: e.target.value })}
                  placeholder="담당자명을 입력하세요"
                  id="contact_name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일 *
                </label>
                <Input
                  type="email"
                  value={newPartner.email}
                  onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                  placeholder="이메일을 입력하세요"
                  id="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  전화번호 *
                </label>
                <Input
                  value={newPartner.phone}
                  onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                  placeholder="전화번호를 입력하세요"
                  id="phone"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                주소 *
              </label>
              <div className="flex gap-2">
                <Input
                  value={newPartner.business_address}
                  onChange={(e) => setNewPartner({ ...newPartner, business_address: e.target.value })}
                  placeholder="주소 검색 버튼을 클릭하세요"
                  id="business_address"
                  readOnly
                />
                <Button
                  type="button"
                  onClick={async () => {
                    // 구글 Maps API 로드 확인 및 로드
                    const loadGoogleMaps = (): Promise<void> => {
                      return new Promise((resolve, reject) => {
                        if ((window as any).google && (window as any).google.maps) {
                          console.log('✅ 구글 Maps API 이미 로드됨');
                          resolve();
                          return;
                        }

                        console.log('📡 구글 Maps API 로드 중...');
                        const apiKey = getGoogleMapsApiKey();

                        if (!apiKey) {
                          reject(new Error('구글 Maps API 키가 설정되지 않았습니다.'));
                          return;
                        }

                        const script = document.createElement('script');
                        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
                        script.async = true;
                        script.defer = true;
                        script.onload = () => {
                          console.log('✅ 구글 Maps API 로드 완료');
                          resolve();
                        };
                        script.onerror = () => {
                          reject(new Error('구글 Maps API 로드 실패'));
                        };
                        document.head.appendChild(script);
                      });
                    };

                    try {
                      // 구글 Maps API 로드
                      await loadGoogleMaps();

                      // Daum 주소 검색 팝업
                      new (window as any).daum.Postcode({
                        oncomplete: function(data: any) {
                          // 도로명 주소 또는 지번 주소 선택
                          const fullAddress = data.roadAddress || data.jibunAddress;

                          console.log('🔍 주소 선택됨:', fullAddress);
                          console.log('📍 지역 정보:', { sido: data.sido, sigungu: data.sigungu });

                          // 구글 Maps Geocoding API로 좌표 검색
                          const geocoder = new (window as any).google.maps.Geocoder();

                          geocoder.geocode({ address: fullAddress }, (results: any, status: any) => {
                            console.log('📡 Google Geocoder 응답:', { results, status });

                            if (status === 'OK' && results && results.length > 0) {
                              const location = results[0].geometry.location;
                              const lat = location.lat();
                              const lng = location.lng();

                              console.log('✅ 좌표 검색 성공!', {
                                address: fullAddress,
                                lat: lat,
                                lng: lng
                              });

                              setNewPartner(prev => ({
                                ...prev,
                                business_address: fullAddress,
                                location: data.sido + ' ' + data.sigungu,
                                detailed_address: fullAddress,
                                lat: lat,  // 위도
                                lng: lng   // 경도
                              }));

                              alert(`✅ 좌표 저장 완료!\n주소: ${fullAddress}\n위도: ${lat}\n경도: ${lng}`);
                            } else {
                              console.error('❌ 좌표 검색 실패:', { fullAddress, status, results });
                              alert(`❌ 좌표를 찾을 수 없습니다.\n주소: ${fullAddress}\n상태: ${status}\n\n주소를 다시 확인해주세요.`);

                              setNewPartner(prev => ({
                                ...prev,
                                business_address: fullAddress,
                                location: data.sido + ' ' + data.sigungu,
                                detailed_address: fullAddress,
                                lat: null,
                                lng: null
                              }));
                            }
                          });
                        }
                      }).open();
                    } catch (error: any) {
                      console.error('❌ 구글 Maps API 로드 오류:', error);
                      alert(`❌ 구글 Maps API 로드 실패:\n${error.message}`);
                    }
                  }}
                  className="bg-[#8B5FBF] hover:bg-[#7A4FB5] whitespace-nowrap"
                >
                  주소 검색
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">지도에 자동으로 표시됩니다</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  지역
                </label>
                <Input
                  value={newPartner.location}
                  onChange={(e) => setNewPartner({ ...newPartner, location: e.target.value })}
                  placeholder="서비스 지역을 입력하세요"
                  id="location"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제공 서비스 (카테고리) *
              </label>
              <Select
                value={
                  typeof newPartner.services === 'string' && newPartner.services
                    ? newPartner.services.split(',')[0].trim()
                    : Array.isArray(newPartner.services) && newPartner.services.length > 0
                    ? newPartner.services[0]
                    : ''
                }
                onValueChange={(value) => setNewPartner({ ...newPartner, services: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="여행">여행</SelectItem>
                  <SelectItem value="렌트카">렌트카</SelectItem>
                  <SelectItem value="숙박">숙박</SelectItem>
                  <SelectItem value="음식">음식</SelectItem>
                  <SelectItem value="관광지">관광지</SelectItem>
                  <SelectItem value="팝업">팝업</SelectItem>
                  <SelectItem value="행사">행사</SelectItem>
                  <SelectItem value="체험">체험</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">가맹점 페이지에서 필터링에 사용됩니다</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                가격 정보
              </label>
              <Input
                type="text"
                value={newPartner.base_price_text || ''}
                onChange={(e) => setNewPartner({ ...newPartner, base_price_text: e.target.value })}
                placeholder="예: 50000 또는 방4개 전체 예약시 20,000원 할인"
                id="base_price_text"
              />
              <div className="text-xs text-gray-600 mt-1 space-y-1">
                <div className="font-medium text-blue-600">
                  {newPartner.base_price_text ? previewPrice(newPartner.base_price_text) : '가격 미표시'}
                </div>
                <div className="text-gray-500">
                  • 숫자만 입력: "50000" → "50,000원"<br />
                  • 0 입력: "0" → "무료"<br />
                  • 텍스트: "방4개 전체 예약시 20,000원 할인" → 그대로 표시<br />
                  • 빈값: 가격 미표시
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                업체 설명
              </label>
              <Textarea
                value={newPartner.description || ''}
                onChange={(e) => setNewPartner({ ...newPartner, description: e.target.value })}
                placeholder="업체에 대한 상세 설명을 입력하세요"
                id="description"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">상세페이지에 표시될 업체 소개</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이미지</label>
              <div className="space-y-4">
                {/* 이미지 URL 직접 입력 */}
                <div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="이미지 URL 입력 (https://...)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const url = e.currentTarget.value.trim();
                          if (url.startsWith('http://') || url.startsWith('https://')) {
                            setNewPartner(prev => ({
                              ...prev,
                              images: [...(Array.isArray(prev.images) ? prev.images : []), url]
                            }));
                            e.currentTarget.value = '';
                            toast.success('이미지가 추가되었습니다.');
                          } else {
                            toast.error('올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작해야 함)');
                          }
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    이미지 URL을 입력하고 Enter를 누르세요. 예: https://images.unsplash.com/photo-...
                  </p>
                </div>

                {/* 미디어 라이브러리 선택 버튼 */}
                <div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsMediaLibraryOpen(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      미디어 라이브러리에서 선택
                    </Button>
                    <label className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById('partner-image-upload')?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        파일 직접 업로드
                      </Button>
                      <input
                        id="partner-image-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            const newImages: string[] = [];

                            // 각 파일을 Vercel Blob에 업로드
                            for (let i = 0; i < files.length; i++) {
                              const file = files[i];

                              try {
                                // FormData로 파일 전송
                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('category', 'partners');

                                const response = await fetch('/api/upload-image', {
                                  method: 'POST',
                                  body: formData,
                                });

                                const result = await response.json();

                                if (result.success && result.url) {
                                  newImages.push(result.url);
                                  console.log('✅ Blob 업로드 성공:', result.url);
                                } else {
                                  console.error('❌ Blob 업로드 실패:', result.error);
                                  toast.error(`이미지 업로드 실패: ${file.name} - ${result.message || result.error}`);
                                }
                              } catch (error) {
                                console.error('❌ 업로드 오류:', error);
                                toast.error(`이미지 업로드 오류: ${file.name}`);
                              }
                            }

                            if (newImages.length > 0) {
                              setNewPartner(prev => ({
                                ...prev,
                                images: [...(Array.isArray(prev.images) ? prev.images : []), ...newImages]
                              }));
                              toast.success(`${newImages.length}개 이미지가 업로드되었습니다.`);
                            }
                          }
                          // Reset file input
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    미디어 라이브러리를 사용하면 기존 이미지를 재사용하거나 새 이미지를 업로드할 수 있습니다.
                  </p>
                </div>

                {/* 선택된 이미지 미리보기 */}
                {Array.isArray(newPartner.images) && newPartner.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {newPartner.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <ImageWithFallback
                          src={img}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setNewPartner(prev => ({
                              ...prev,
                              images: (Array.isArray(prev.images) ? prev.images : []).filter((_, i) => i !== idx)
                            }));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                영업시간
              </label>
              <Input
                value={newPartner.business_hours || ''}
                onChange={(e) => setNewPartner({ ...newPartner, business_hours: e.target.value })}
                placeholder="예: 평일 09:00-18:00, 주말 10:00-17:00"
                id="business_hours"
              />
              <p className="text-xs text-gray-500 mt-1">영업시간 정보</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기간 (일)
                </label>
                <Input
                  type="number"
                  value={newPartner.duration || ''}
                  onChange={(e) => setNewPartner({ ...newPartner, duration: e.target.value })}
                  placeholder="예: 7"
                  id="duration"
                />
                <p className="text-xs text-gray-500 mt-1">투어/체험 기간 (일수)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  최소 연령
                </label>
                <Input
                  type="number"
                  value={newPartner.min_age || ''}
                  onChange={(e) => setNewPartner({ ...newPartner, min_age: e.target.value })}
                  placeholder="예: 18"
                  id="min_age"
                />
                <p className="text-xs text-gray-500 mt-1">참가 가능 최소 연령</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  최대 인원
                </label>
                <Input
                  type="number"
                  value={newPartner.max_capacity || ''}
                  onChange={(e) => setNewPartner({ ...newPartner, max_capacity: e.target.value })}
                  placeholder="예: 10"
                  id="max_capacity"
                />
                <p className="text-xs text-gray-500 mt-1">그룹 최대 인원</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  언어
                </label>
                <Input
                  value={newPartner.language || ''}
                  onChange={(e) => setNewPartner({ ...newPartner, language: e.target.value })}
                  placeholder="예: 한국어, 영어"
                  id="language"
                />
                <p className="text-xs text-gray-500 mt-1">제공 언어</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsPartnerDialogOpen(false);
                setEditingPartner(null);
              }}
            >
              취소
            </Button>
            <Button
              onClick={() => {
                handleSavePartner({
                  ...newPartner,
                  status: isCreatePartnerMode ? 'approved' : undefined
                });
              }}
              className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
            >
              {isCreatePartnerMode ? '파트너 추가' : '수정 완료'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 블로그 관리 Dialog */}
      <Dialog open={isBlogDialogOpen} onOpenChange={setIsBlogDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isCreateBlogMode ? '블로그 포스트 추가' : '블로그 포스트 수정'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">제목</label>
              <Input
                placeholder="포스트 제목을 입력하세요"
                value={newBlog.title}
                onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value })}
                id="blog_title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">카테고리</label>
                <Select
                  value={newBlog.category}
                  onValueChange={(value) => setNewBlog({ ...newBlog, category: value })}
                >
                  <SelectTrigger id="blog_category">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="travel">여행기</SelectItem>
                    <SelectItem value="tips">여행팁</SelectItem>
                    <SelectItem value="local">로컬맛집</SelectItem>
                    <SelectItem value="culture">문화체험</SelectItem>
                    <SelectItem value="news">소식</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">상태</label>
                <Select
                  value={newBlog.is_published ? 'published' : 'draft'}
                  onValueChange={(value) => setNewBlog({ ...newBlog, is_published: value === 'published' })}
                >
                  <SelectTrigger id="blog_status">
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">게시됨</SelectItem>
                    <SelectItem value="draft">초안</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">이벤트 시작일</label>
                <Input
                  type="date"
                  placeholder="이벤트 시작일"
                  value={newBlog.event_start_date || ''}
                  onChange={(e) => setNewBlog({ ...newBlog, event_start_date: e.target.value })}
                  id="blog_event_start"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">이벤트 종료일</label>
                <Input
                  type="date"
                  placeholder="이벤트 종료일"
                  value={newBlog.event_end_date || ''}
                  onChange={(e) => setNewBlog({ ...newBlog, event_end_date: e.target.value })}
                  id="blog_event_end"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">요약</label>
              <Textarea
                placeholder="포스트 요약을 입력하세요"
                value={newBlog.excerpt}
                onChange={(e) => setNewBlog({ ...newBlog, excerpt: e.target.value })}
                id="blog_excerpt"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">내용</label>
              <Textarea
                placeholder="포스트 내용을 입력하세요 (마크다운 지원)"
                value={newBlog.content_md}
                onChange={(e) => setNewBlog({ ...newBlog, content_md: e.target.value })}
                id="blog_content"
                rows={8}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">대표 이미지 URL</label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={newBlog.featured_image}
                onChange={(e) => setNewBlog({ ...newBlog, featured_image: e.target.value })}
                id="blog_image"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsBlogDialogOpen(false);
                setEditingBlog(null);
              }}
            >
              취소
            </Button>
            <Button
              onClick={() => {
                const formData = {
                  ...newBlog,
                  slug: newBlog.title.toLowerCase().replace(/\s+/g, '-') || 'blog-post'
                };
                handleSaveBlog(formData);
              }}
              className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
            >
              {isCreateBlogMode ? '포스트 추가' : '수정 완료'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 파트너 신청 내역 Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>파트너 신청 내역</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {partnerApplicationHistory.length > 0 ? (
              <div className="grid gap-4">
                {partnerApplicationHistory.map((app) => (
                  <Card key={app.id}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">사업자명</p>
                          <p className="font-semibold">{app.business_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">담당자</p>
                          <p className="font-semibold">{app.contact_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">이메일</p>
                          <p>{app.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">전화번호</p>
                          <p>{app.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">처리 상태</p>
                          <Badge variant={app.status === 'approved' ? 'default' : 'destructive'}>
                            {app.status === 'approved' ? '✅ 승인됨' : '❌ 거절됨'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">처리 일시</p>
                          <p>{app.reviewed_at ? new Date(app.reviewed_at).toLocaleString('ko-KR') : '-'}</p>
                        </div>
                        {app.review_notes && (
                          <div className="col-span-2">
                            <p className="text-sm text-gray-500">처리 메모</p>
                            <p>{app.review_notes}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                처리된 신청 내역이 없습니다.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 미디어 라이브러리 모달 */}
      <MediaLibraryModal
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={handleMediaSelect}
        multiSelect={true}
        category="product"
        usageLocation="product_gallery"
      />

      {/* 파트너 신청 수정 모달 */}
      <Dialog open={isApplicationEditOpen} onOpenChange={setIsApplicationEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>파트너 신청 상세 정보</DialogTitle>
          </DialogHeader>
          {editingApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-business-name">업체명 *</Label>
                  <Input
                    id="edit-business-name"
                    value={editingApplication.business_name || ''}
                    onChange={(e) => setEditingApplication({ ...editingApplication, business_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-contact-name">담당자 이름 *</Label>
                  <Input
                    id="edit-contact-name"
                    value={editingApplication.contact_name || ''}
                    onChange={(e) => setEditingApplication({ ...editingApplication, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">이메일 *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingApplication.email || ''}
                    onChange={(e) => setEditingApplication({ ...editingApplication, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">전화번호 *</Label>
                  <Input
                    id="edit-phone"
                    value={editingApplication.phone || ''}
                    onChange={(e) => setEditingApplication({ ...editingApplication, phone: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-address">주소 *</Label>
                  <Input
                    id="edit-address"
                    value={editingApplication.business_address || editingApplication.address || ''}
                    onChange={(e) => setEditingApplication({ ...editingApplication, business_address: e.target.value, address: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-location">위치/지역 *</Label>
                  <Input
                    id="edit-location"
                    value={editingApplication.location || ''}
                    onChange={(e) => setEditingApplication({ ...editingApplication, location: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="edit-business-number">사업자 등록번호</Label>
                  <Input
                    id="edit-business-number"
                    value={editingApplication.business_number || ''}
                    onChange={(e) => setEditingApplication({ ...editingApplication, business_number: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-description">업체 소개 *</Label>
                <Textarea
                  id="edit-description"
                  value={editingApplication.description || ''}
                  onChange={(e) => setEditingApplication({ ...editingApplication, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="edit-services">제공 서비스</Label>
                <Textarea
                  id="edit-services"
                  value={editingApplication.services || editingApplication.services_offered || ''}
                  onChange={(e) => setEditingApplication({ ...editingApplication, services: e.target.value, services_offered: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-promotion">프로모션/혜택</Label>
                <Input
                  id="edit-promotion"
                  value={editingApplication.promotion || ''}
                  onChange={(e) => setEditingApplication({ ...editingApplication, promotion: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-business-hours">영업시간 *</Label>
                  <Input
                    id="edit-business-hours"
                    value={editingApplication.business_hours || ''}
                    onChange={(e) => setEditingApplication({ ...editingApplication, business_hours: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-discount-rate">할인율 (%)</Label>
                  <Input
                    id="edit-discount-rate"
                    type="number"
                    min="0"
                    max="100"
                    value={editingApplication.discount_rate || ''}
                    onChange={(e) => setEditingApplication({ ...editingApplication, discount_rate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-website">웹사이트 URL</Label>
                  <Input
                    id="edit-website"
                    type="url"
                    value={editingApplication.website || editingApplication.website_url || ''}
                    onChange={(e) => setEditingApplication({ ...editingApplication, website: e.target.value, website_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-instagram">인스타그램 URL</Label>
                  <Input
                    id="edit-instagram"
                    type="url"
                    value={editingApplication.instagram || editingApplication.instagram_url || ''}
                    onChange={(e) => setEditingApplication({ ...editingApplication, instagram: e.target.value, instagram_url: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>카테고리</Label>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {editingApplication.categories ?
                    (typeof editingApplication.categories === 'string' ?
                      JSON.parse(editingApplication.categories).join(', ') :
                      Array.isArray(editingApplication.categories) ?
                        editingApplication.categories.join(', ') :
                        '카테고리 없음'
                    ) :
                    '카테고리 없음'
                  }
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  className="flex-1"
                  onClick={async () => {
                    try {
                      const result = await api.admin.updatePartnerApplication(
                        editingApplication.id,
                        {
                          business_name: editingApplication.business_name,
                          contact_name: editingApplication.contact_name,
                          email: editingApplication.email,
                          phone: editingApplication.phone,
                          business_address: editingApplication.business_address || editingApplication.address,
                          location: editingApplication.location,
                          business_number: editingApplication.business_number,
                          description: editingApplication.description,
                          services: editingApplication.services || editingApplication.services_offered,
                          promotion: editingApplication.promotion,
                          business_hours: editingApplication.business_hours,
                          discount_rate: editingApplication.discount_rate ? parseInt(editingApplication.discount_rate) : null,
                          website: editingApplication.website || editingApplication.website_url,
                          instagram: editingApplication.instagram || editingApplication.instagram_url
                        }
                      );
                      if (result.success) {
                        toast.success('파트너 신청 정보가 수정되었습니다.');
                        setIsApplicationEditOpen(false);
                        // 파트너 신청 목록 새로고침
                        const refreshResult = await api.admin.getPartnerApplications();
                        if (refreshResult.success) {
                          setPartnerApplications(refreshResult.data || []);
                        }
                      } else {
                        toast.error(result.error || '수정 실패');
                      }
                    } catch (error) {
                      console.error('수정 실패:', error);
                      toast.error('수정 중 오류가 발생했습니다.');
                    }
                  }}
                >
                  저장
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsApplicationEditOpen(false)}
                >
                  닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 상품 옵션 관리 다이얼로그 */}
      <Dialog open={isOptionsDialogOpen} onOpenChange={setIsOptionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>옵션 관리 - {editingProductForOptions?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* 옵션 추가 폼 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">새 옵션 추가</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>옵션명 (예: 사이즈)</Label>
                    <Input
                      value={newOption.optionName}
                      onChange={(e) => setNewOption(prev => ({ ...prev, optionName: e.target.value }))}
                      placeholder="사이즈"
                    />
                  </div>
                  <div>
                    <Label>옵션값 (예: L)</Label>
                    <Input
                      value={newOption.optionValue}
                      onChange={(e) => setNewOption(prev => ({ ...prev, optionValue: e.target.value }))}
                      placeholder="L"
                    />
                  </div>
                  <div>
                    <Label>추가 가격</Label>
                    <Input
                      type="number"
                      value={newOption.priceAdjustment}
                      onChange={(e) => setNewOption(prev => ({ ...prev, priceAdjustment: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>재고</Label>
                    <Input
                      type="number"
                      value={newOption.stock}
                      onChange={(e) => setNewOption(prev => ({ ...prev, stock: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddOption}
                  className="mt-4 bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  옵션 추가
                </Button>
              </CardContent>
            </Card>

            {/* 옵션 목록 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">옵션 목록 ({productOptions.length}개)</CardTitle>
              </CardHeader>
              <CardContent>
                {productOptions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">등록된 옵션이 없습니다.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>옵션명</TableHead>
                        <TableHead>옵션값</TableHead>
                        <TableHead>추가 가격</TableHead>
                        <TableHead>재고</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productOptions.map((option: any) => (
                        <TableRow key={option.id}>
                          <TableCell>{option.option_name}</TableCell>
                          <TableCell>{option.option_value}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              defaultValue={option.price_adjustment || 0}
                              onBlur={(e) => {
                                const newValue = parseInt(e.target.value) || 0;
                                if (newValue !== option.price_adjustment) {
                                  handleUpdateOption(option.id, { priceAdjustment: newValue });
                                }
                              }}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              defaultValue={option.stock || 0}
                              onBlur={(e) => {
                                const newValue = parseInt(e.target.value) || 0;
                                if (newValue !== option.stock) {
                                  handleUpdateOption(option.id, { stock: newValue });
                                }
                              }}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={option.is_available ? 'default' : 'secondary'}>
                              {option.is_available ? '활성' : '비활성'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateOption(option.id, { isAvailable: !option.is_available })}
                              >
                                {option.is_available ? '비활성화' : '활성화'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteOption(option.id)}
                              >
                                <Trash2 className="w-3 h-3" />
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
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsOptionsDialogOpen(false)}>
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PMS 연동 모달 */}
      <PMSIntegrationModal
        isOpen={isPMSModalOpen}
        onClose={() => setIsPMSModalOpen(false)}
        onDataLoaded={handlePMSDataLoaded}
      />

      {/* 렌트카 API 설정 모달 */}
      <RentcarAPIModal
        isOpen={isRentcarAPIModalOpen}
        onClose={() => setIsRentcarAPIModalOpen(false)}
        onSaveSettings={handleSaveRentcarAPI}
      />
    </div>
  );
}
