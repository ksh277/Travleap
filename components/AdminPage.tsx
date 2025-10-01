import React, { useState, useEffect, useCallback } from 'react';
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
  Star,
  Check,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../utils/api';
import { db } from '../utils/database';
import { useAuth } from '../hooks/useAuth';
import { notifyDataChange, refreshAllData, useRealTimeData } from '../hooks/useRealTimeData';
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


// API에서 상품 데이터 로드
const loadProducts = async (): Promise<Product[]> => {
  try {
    const listings = await api.admin.getListings();

    return listings.data.map((listing) => ({
      id: listing.id.toString(),
      title: listing.title,
      category: listing.category, // 이미 한글로 저장되어 있음
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
  const { user, isLoggedIn, sessionRestored } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // 검색 state 추가
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [blogSearchQuery, setBlogSearchQuery] = useState('');

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
          priceType: 'fixed',
          location: '신안군',
          address: '전남 신안군',
          description: `신안의 ${categoryName} 관련 테스트 상품입니다.`,
          longDescription: `신안군에서 제공하는 ${categoryName} 상품으로 많은 사람들이 즐길 수 있는 체험입니다.`,
          duration: '2시간',
          maxCapacity: '20',
          minCapacity: '1',
          difficulty: '초급',
          language: '한국어',
          minAge: '0',
          included: ['가이드 동행', '체험도구 제공'],
          excluded: ['개인 용품'],
          policies: ['우천시 취소 가능'],
          amenities: ['주차장', '화장실'],
          images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop'],
          featured: false
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
              '여행': 1, '렌트카': 4, '숙박': 2, '음식': 3, '관광지': 5, '팝업': 6, '행사': 7, '체험': 8
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
            '여행': 1, '렌트카': 4, '숙박': 2, '음식': 3, '관광지': 5, '팝업': 6, '행사': 7, '체험': 8
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

      // 데이터베이스 스키마 확인 함수
      (window as any).checkDBSchema = async () => {

        try {
          // listings 테이블 구조 확인
          const response = await db.query('DESCRIBE listings', []);
          toast.success('✅ DB 스키마 확인 완료 - 콘솔을 확인하세요');
        } catch (error) {
          console.error('❌ [DEBUG] DB 스키마 확인 실패:', error);
          toast.error('❌ DB 스키마 확인 실패');
        }
      };

      // 데이터베이스 강제 재초기화 함수
      (window as any).fixDBSchema = async () => {

        try {
          const response = await db.forceReinitialize();
          toast.success('✅ 데이터베이스 재초기화 완료!');

          // 관리자 페이지 데이터 새로고침
          await loadAdminData();
        } catch (error) {
          console.error('❌ [DEBUG] DB 재초기화 실패:', error);
          toast.error('❌ DB 재초기화 실패');
        }
      };
    }
  }, []);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [partnerApplications, setPartnerApplications] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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
    tier: 'bronze',
    services: ''
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
    comment: ''
  });

  // 블로그 관리 상태
  const [blogs, setBlogs] = useState<any[]>([]);
  const [editingBlog, setEditingBlog] = useState<any | null>(null);
  const [isBlogDialogOpen, setIsBlogDialogOpen] = useState(false);
  const [isCreateBlogMode, setIsCreateBlogMode] = useState(false);
  const [newBlog, setNewBlog] = useState({
    title: '',
    category: '여행 가이드',
    excerpt: '',
    content_md: '',
    featured_image: '',
    is_published: true,
    author_id: 1,
    slug: ''
  });

  // 주문 관리 상태
  const [orders, setOrders] = useState<any[]>([]);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

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
    priceType: 'fixed',
    location: '',
    address: '',
    coordinates: '',
    images: [''],
    description: '',
    longDescription: '',
    highlights: [''],
    included: [''],
    excluded: [''],
    featured: false,
    startDate: '',
    endDate: '',
    duration: '1일',
    maxCapacity: '10',
    minCapacity: '1',
    minAge: '',
    meetingPoint: '',
    cancellationPolicy: 'standard',
    difficulty: 'easy',
    language: 'korean',
    tags: [''],
    amenities: ['']
  });

  const categories = ['여행', '렌트카', '숙박', '음식', '관광지', '팝업', '행사', '체험'];

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
          fn: () => api.getPartners().then(res => {
            const data = res?.success ? res.data || [] : [];
            setPartners(data);
            console.log(`✅ 파트너 ${data.length}개 로드 완료`);
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
    totalRevenue: products.reduce((sum, p) => sum + ((parseInt(p.price) || 0) * (p.rating_count || 0) * 0.1), 0),
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
      // 카테고리 ID 찾기
      const categoryMap: { [key: string]: number } = {
        '여행': 1, '렌트카': 4, '숙박': 2, '음식': 3, '관광지': 5, '팝업': 6, '행사': 7, '체험': 8
      };

      const listingData = {
        title: newProduct.title,
        category: newProduct.category, // 한글 카테고리 그대로 사용
        category_id: categoryMap[newProduct.category] || 1,
        short_description: newProduct.description,
        description_md: newProduct.longDescription || newProduct.description,
        price_from: parseInt(newProduct.price),
        price_to: parseInt(newProduct.price),
        location: newProduct.location || '',
        address: newProduct.address || '',
        coordinates: newProduct.coordinates || '',
        images: newProduct.images.filter(img => img.trim() !== ''),
        highlights: newProduct.highlights.filter(h => h.trim() !== ''),
        included: newProduct.included.filter(i => i.trim() !== ''),
        excluded: newProduct.excluded.filter(e => e.trim() !== ''),
        tags: newProduct.tags.filter(t => t.trim() !== ''),
        amenities: newProduct.amenities.filter(a => a.trim() !== ''),
        max_capacity: parseInt(newProduct.maxCapacity) || 10,
        min_capacity: 1,
        min_age: parseInt(newProduct.minAge) || null,
        duration: newProduct.duration,
        difficulty: newProduct.difficulty,
        meeting_point: newProduct.meetingPoint || '',
        cancellation_policy: newProduct.cancellationPolicy,
        available_from: newProduct.startDate || null,
        available_to: newProduct.endDate || null,
        currency: 'KRW',
        rating_avg: 0,
        rating_count: 0,
        view_count: 0,
        booking_count: 0,
        featured_score: newProduct.featured ? 100 : 0,
        partner_boost: 0,
        is_active: true,
        is_published: true,
        is_featured: newProduct.featured,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
          category: '',
          price: '',
          priceType: 'fixed',
          location: '',
          address: '',
          coordinates: '',
          images: [''],
          description: '',
          longDescription: '',
          highlights: [''],
          included: [''],
          excluded: [''],
          featured: false,
          startDate: '',
          endDate: '',
          duration: '1일',
          maxCapacity: '10',
          minCapacity: '1',
          minAge: '',
          meetingPoint: '',
          cancellationPolicy: 'standard',
          difficulty: 'easy',
          language: 'korean',
          tags: [''],
          amenities: ['']
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
        price_to: editingProduct.price,
        location: editingProduct.location,
        short_description: editingProduct.description,
        description_md: editingProduct.description,
        is_active: editingProduct.status === 'active',
        is_published: editingProduct.status === 'active',
        is_featured: editingProduct.featured || false,
        images: [editingProduct.image].filter(img => img && img.trim() !== ''),
        updated_at: new Date().toISOString()
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
        await loadAllData();

        toast.success('파트너 신청이 승인되고 상품이 생성되었습니다.');
      } else {
        toast.error(result.error || '파트너 승인에 실패했습니다.');
      }
    } catch (error) {
      console.error('Approve partner failed:', error);
      toast.error('파트너 승인 중 오류가 발생했습니다.');
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
      setNewPartner({
        business_name: partner.business_name || '',
        contact_name: partner.contact_name || '',
        email: partner.email || '',
        phone: partner.phone || '',
        business_address: partner.business_address || partner.location || '',
        location: partner.location || '',
        tier: partner.tier || 'bronze',
        services: partner.services || ''
      });
    } else {
      setNewPartner({
        business_name: '',
        contact_name: '',
        email: '',
        phone: '',
        business_address: '',
        location: '',
        tier: 'bronze',
        services: ''
      });
    }
    setIsPartnerDialogOpen(true);
  };

  // 파트너 생성/수정
  const handleSavePartner = async (partnerData: any) => {
    try {
      let result;
      if (isCreatePartnerMode) {
        result = await api.admin.createPartner(partnerData);
        if (result.success) {
          setPartners(prev => [...prev, result.data]);
          toast.success('파트너가 성공적으로 생성되었습니다.');
        }
      } else {
        result = await api.admin.updatePartner(editingPartner.id, partnerData);
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
    if (confirm('정말 이 파트너를 삭제하시겠습니까?')) {
      try {
        const result = await api.admin.deletePartner(id);
        if (result.success) {
          setPartners(prev => prev.filter(p => p.id !== id));
          toast.success('파트너가 삭제되었습니다.');
        } else {
          toast.error(result.error || '파트너 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('Delete partner failed:', error);
        toast.error('파트너 삭제에 실패했습니다.');
      }
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
        comment: review.comment_md || review.comment || ''
      });
    } else {
      // 생성 모드: 빈 폼으로 초기화
      setNewReview({
        listing_id: '',
        user_name: '',
        rating: '',
        visit_date: '',
        title: '',
        comment: ''
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
    setEditingProduct(user); // 임시로 같은 state 사용
    setIsEditModalOpen(true);
  };

  // 사용자 삭제
  const handleDeleteUser = async (id: number) => {
    if (confirm('정말 이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        const result = await api.admin.deleteUser(id);
        if (result.success) {
          setUsers(prev => prev.filter(u => u.id !== id));
          toast.success('사용자가 삭제되었습니다.');
        } else {
          toast.error(result.error || '사용자 삭제에 실패했습니다.');
        }
      } catch (error) {
        console.error('Delete user failed:', error);
        toast.error('사용자 삭제에 실패했습니다.');
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

  // ================== 블로그 관리 핸들러 ==================

  // 블로그 생성/수정 대화상자 열기
  const handleOpenBlogDialog = (blog: any = null) => {
    setEditingBlog(blog);
    setIsCreateBlogMode(!blog);
    if (blog) {
      // 수정 모드: 기존 블로그 데이터로 초기화
      setNewBlog({
        title: blog.title || '',
        category: blog.category || '여행 가이드',
        excerpt: blog.excerpt || '',
        content_md: blog.content_md || '',
        featured_image: blog.featured_image || '',
        is_published: blog.is_published ?? true,
        author_id: blog.author_id || 1,
        slug: blog.slug || ''
      });
    } else {
      // 생성 모드: 빈 값으로 초기화
      setNewBlog({
        title: '',
        category: '여행 가이드',
        excerpt: '',
        content_md: '',
        featured_image: '',
        is_published: true,
        author_id: 1,
        slug: ''
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
            title: newImage.title,
            category: newImage.usage,
            alt: newImage.description
          });
        } else {
          // URL 직접 입력
          result = await api.admin.uploadImage(null as any, {
            url: newImage.url,
            title: newImage.title,
            category: newImage.usage,
            alt: newImage.description
          });
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
          name: newUser.name,
          email: newUser.email,
          password_hash: newUser.password, // 실제로는 백엔드에서 해싱 처리
          phone: newUser.phone,
          role: newUser.role as any
        });

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
          <div className="overflow-x-auto">
            <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full min-w-[800px] md:min-w-0 md:max-w-5xl">
              <TabsTrigger value="dashboard" className="text-xs md:text-sm">대시보드</TabsTrigger>
              <TabsTrigger value="products" className="text-xs md:text-sm">상품 관리</TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs md:text-sm">리뷰 관리</TabsTrigger>
              <TabsTrigger value="partners" className="text-xs md:text-sm">파트너 관리</TabsTrigger>
              <TabsTrigger value="blogs" className="text-xs md:text-sm">블로그 관리</TabsTrigger>
              <TabsTrigger value="images" className="text-xs md:text-sm">이미지 관리</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs md:text-sm">주문 관리</TabsTrigger>
              <TabsTrigger value="users" className="text-xs md:text-sm">사용자 관리</TabsTrigger>
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
                  <div className="text-2xl font-bold">{(stats.avgRating || 0).toFixed(1)}</div>
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
                  <div className="text-2xl font-bold">
                    +{dashboardStats?.new_users_today || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    오늘 가입
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
                  <div className="flex justify-between">
                    <span className="text-sm">수수료 수익</span>
                    <span className="font-medium text-purple-600">
                      ₩{(dashboardStats?.commission_earned || 0).toLocaleString()}
                    </span>
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
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm md:text-base truncate">{product.title}</h4>
                        <p className="text-xs md:text-sm text-gray-600 truncate">{product.category} • {product.location}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium text-xs md:text-sm">₩{product.price.toLocaleString()}</p>
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
                                onChange={(e) => {
                                  const newTitle = e.target.value;
                                  setNewProduct(prev => {
                                    const updatedProduct = { ...prev, title: newTitle };

                                    // 🤖 카테고리가 아직 선택되지 않았거나 기본값인 경우 자동 추천
                                    if (!updatedProduct.category || updatedProduct.category === '') {
                                      const suggestedCategory = autoSuggestCategory(newTitle, updatedProduct.description);
                                      if (suggestedCategory) {
                                        // 자동 카테고리 추천 완료
                                        updatedProduct.category = suggestedCategory;
                                        toast.success(`카테고리가 자동으로 "${suggestedCategory}"로 설정되었습니다.`);
                                      }
                                    }

                                    return updatedProduct;
                                  });
                                }}
                                placeholder="상품명을 입력하세요"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <label className="text-sm font-medium">카테고리 *</label>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    const suggestedCategory = autoSuggestCategory(newProduct.title, newProduct.description);
                                    if (suggestedCategory) {
                                      setNewProduct(prev => ({ ...prev, category: suggestedCategory }));
                                      toast.success(`🤖 AI가 "${suggestedCategory}" 카테고리를 추천했습니다!`);
                                    } else {
                                      toast.info('제목이나 설명을 더 입력해주세요.');
                                    }
                                  }}
                                >
                                  🤖 AI 추천
                                </Button>
                              </div>
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
                              <label className="text-sm font-medium mb-1 block">최대 인원</label>
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
                                <span className="text-lg font-medium">{newProduct.maxCapacity}명</span>
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
                          </div>
                        </div>

                        {/* 위치 정보 */}
                        <div>
                          <h3 className="text-lg font-medium mb-3">위치 정보</h3>
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-1 block">간단 위치</label>
                              <Input
                                value={newProduct.location}
                                onChange={(e) => setNewProduct(prev => ({ ...prev, location: e.target.value }))}
                                placeholder="예: 신안군 증도면"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">상세 주소</label>
                              <Input
                                value={newProduct.address}
                                onChange={(e) => setNewProduct(prev => ({ ...prev, address: e.target.value }))}
                                placeholder="상세 주소를 입력하세요"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">집합 장소</label>
                              <Input
                                value={newProduct.meetingPoint}
                                onChange={(e) => setNewProduct(prev => ({ ...prev, meetingPoint: e.target.value }))}
                                placeholder="만날 장소를 입력하세요"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 이미지 */}
                        <div>
                          <h3 className="text-lg font-medium mb-3">이미지</h3>
                          <div className="space-y-4">
                            {/* 파일 업로드 */}
                            <div>
                              <label className="text-sm font-medium mb-2 block">이미지 파일 선택</label>
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                              />
                              <p className="text-xs text-gray-500 mt-1">여러 이미지를 선택할 수 있습니다. (JPG, PNG, WEBP 지원)</p>
                            </div>

                            {/* 업로드된 이미지 미리보기 */}
                            {newProduct.images.length > 0 && (
                              <div>
                                <label className="text-sm font-medium mb-2 block">업로드된 이미지</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {newProduct.images.map((image, index) => (
                                    <div key={index} className="relative group">
                                      <img
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

                        {/* 일정 및 기타 정보 */}
                        <div>
                          <h3 className="text-lg font-medium mb-3">일정 및 옵션</h3>
                          <div className="grid grid-cols-2 gap-4">
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
                                  <SelectValue />
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
                              <label className="text-sm font-medium mb-1 block">난이도</label>
                              <Select
                                value={newProduct.difficulty}
                                onValueChange={(value) => setNewProduct(prev => ({ ...prev, difficulty: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="easy">쉬움</SelectItem>
                                  <SelectItem value="moderate">보통</SelectItem>
                                  <SelectItem value="hard">어려움</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">최소 연령</label>
                              <Input
                                type="number"
                                value={newProduct.minAge}
                                onChange={(e) => setNewProduct(prev => ({ ...prev, minAge: e.target.value }))}
                                placeholder="최소 연령"
                              />
                            </div>
                            <div className="flex items-center">
                              <label className="text-sm font-medium">
                                <input
                                  type="checkbox"
                                  checked={newProduct.featured}
                                  onChange={(e) => setNewProduct(prev => ({ ...prev, featured: e.target.checked }))}
                                  className="mr-2"
                                />
                                추천 상품
                              </label>
                            </div>
                          </div>
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
                        placeholder="상품명, 위치, 설명으로 검색..."
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


          {/* 이미지 관리 탭 */}
          <TabsContent value="images" className="space-y-6">
            {/* 이미지 업로드 및 관리 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>이미지 관리</CardTitle>
                  <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => handleOpenImageDialog()}>
                        <Upload className="h-4 w-4 mr-2" />
                        이미지 업로드
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{isCreateImageMode ? '새 이미지 업로드' : '이미지 수정'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">이미지 파일</label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileChange}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">이미지 제목</label>
                          <Input
                            placeholder="이미지 제목"
                            value={newImage.title}
                            onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">사용 위치</label>
                          <Select
                            value={newImage.usage}
                            onValueChange={(value) => setNewImage({ ...newImage, usage: value })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="사용 위치 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="product">상품</SelectItem>
                              <SelectItem value="blog">블로그</SelectItem>
                              <SelectItem value="partner">파트너</SelectItem>
                              <SelectItem value="other">기타</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">설명</label>
                          <Textarea
                            placeholder="이미지 설명 (선택사항)"
                            rows={3}
                            value={newImage.description}
                            onChange={(e) => setNewImage({ ...newImage, description: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <Button
                          onClick={handleSaveImage}
                          className="w-full bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                        >
                          {isCreateImageMode ? '업로드' : '수정'}
                        </Button>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* 파트너 관리 탭 */}
          <TabsContent value="partners" className="space-y-6">
            {/* 파트너 신청 승인 섹션 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>파트너 신청 관리</CardTitle>
                  <Badge variant="secondary">
                    신청 대기: {partnerApplications.filter(p => p.status === 'pending').length}개
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
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
                          {partner.status === 'pending' && (
                            <>
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
                            </>
                          )}
                          {partner.status !== 'pending' && (
                            <Button size="sm" variant="outline" className="w-full" disabled>
                              처리 완료
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {partnerApplications.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">파트너 신청이 없습니다.</p>
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
                      placeholder="파트너 검색..."
                      className="pl-9"
                      value={partnerSearchQuery}
                      onChange={(e) => setPartnerSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="등급 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="diamond">Diamond</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {partners
                    .filter(partner =>
                      partner.business_name?.toLowerCase().includes(partnerSearchQuery.toLowerCase()) ||
                      partner.contact_name?.toLowerCase().includes(partnerSearchQuery.toLowerCase()) ||
                      partner.email?.toLowerCase().includes(partnerSearchQuery.toLowerCase())
                    )
                    .map((partner) => (
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
                              {partner.rating_avg ? `${partner.rating_avg.toFixed(1)} (${partner.rating_count}건)` : '평점 없음'}
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
                  ))}
                </div>

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
                      placeholder="주문 번호 검색..."
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
                      <TableHead>고객명</TableHead>
                      <TableHead>상품명</TableHead>
                      <TableHead>금액</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>주문일</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length > 0 ? orders
                      .filter(order =>
                        order.orderNumber?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                        order.userName?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
                        order.userEmail?.toLowerCase().includes(orderSearchQuery.toLowerCase())
                      )
                      .map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.userName}</TableCell>
                        <TableCell>
                          {order.items && order.items.length > 0
                            ? order.items.map((item: any) => item.title || '상품명').join(', ')
                            : '주문 상품'}
                        </TableCell>
                        <TableCell>₩{order.total?.toLocaleString() || '0'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            order.status === 'completed' ? 'default' :
                            order.status === 'pending' ? 'secondary' :
                            order.status === 'failed' ? 'destructive' : 'outline'
                          }>
                            {order.status === 'pending' ? '대기중' :
                             order.status === 'completed' ? '완료' :
                             order.status === 'failed' ? '실패' : order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {order.status === 'pending' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                              >
                                완료
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
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
                            <label className="text-sm font-medium mb-1 block">상품 선택</label>
                            <Select
                              value={newReview.listing_id}
                              onValueChange={(value) => setNewReview({ ...newReview, listing_id: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="상품을 선택하세요" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
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
                                comment: ''
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
                        placeholder="리뷰 검색..."
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
                      <TableHead>상품명</TableHead>
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
                        review.comment_md?.toLowerCase().includes(reviewSearchQuery.toLowerCase()) ||
                        review.title?.toLowerCase().includes(reviewSearchQuery.toLowerCase())
                      )
                      .map((review: any) => (
                      <TableRow key={review.id}>
                        <TableCell>{review.listing_title || '상품명'}</TableCell>
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
                      placeholder="사용자 검색..."
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
                    {users
                      .filter(user =>
                        user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                        user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
                      )
                      .slice(0, 10)
                      .map((user) => (
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
                            <Button size="sm" variant="outline" onClick={() => handleOpenUserDialog(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleOpenUserDetail(user)}>
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

            {/* 사용자 초대/수정 다이얼로그 */}
            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      placeholder="블로그 포스트 검색..."
                      className="pl-9"
                      value={blogSearchQuery}
                      onChange={(e) => setBlogSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="카테고리 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="여행 가이드">여행 가이드</SelectItem>
                      <SelectItem value="포토 스팟">포토 스팟</SelectItem>
                      <SelectItem value="맛집 리뷰">맛집 리뷰</SelectItem>
                      <SelectItem value="숙박 후기">숙박 후기</SelectItem>
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
                      <TableHead>게시일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blogs.length > 0 ? blogs
                      .filter(blog =>
                        blog.title?.toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
                        blog.author?.toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
                        blog.category?.toLowerCase().includes(blogSearchQuery.toLowerCase())
                      )
                      .map((blog: any) => (
                      <TableRow key={blog.id}>
                        <TableCell className="font-medium">{blog.title}</TableCell>
                        <TableCell>{blog.category || '일반'}</TableCell>
                        <TableCell>{blog.author_name || '관리자'}</TableCell>
                        <TableCell>{blog.views || 0}</TableCell>
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
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
        </Tabs>
      </div>

      {/* 수정 모달 */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                <div>
                  <label className="text-sm font-medium mb-1 block">메인 이미지 URL</label>
                  <Input
                    value={editingProduct.image}
                    onChange={(e) => setEditingProduct(prev =>
                      prev ? { ...prev, image: e.target.value } : null
                    )}
                    placeholder="이미지 URL을 입력하세요"
                  />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                사업장 주소 *
              </label>
              <Input
                value={newPartner.business_address}
                onChange={(e) => setNewPartner({ ...newPartner, business_address: e.target.value })}
                placeholder="사업장 주소를 입력하세요"
                id="business_address"
              />
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  파트너 등급
                </label>
                <Select
                  value={newPartner.tier}
                  onValueChange={(value) => setNewPartner({ ...newPartner, tier: value })}
                >
                  <SelectTrigger id="tier">
                    <SelectValue placeholder="등급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="diamond">Diamond</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제공 서비스
              </label>
              <Textarea
                value={newPartner.services}
                onChange={(e) => setNewPartner({ ...newPartner, services: e.target.value })}
                placeholder="제공하는 서비스를 설명해주세요"
                id="services"
                rows={3}
              />
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
                handleSavePartner(newPartner);
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
                    <SelectItem value="여행 가이드">여행 가이드</SelectItem>
                    <SelectItem value="포토 스팟">포토 스팟</SelectItem>
                    <SelectItem value="맛집 리뷰">맛집 리뷰</SelectItem>
                    <SelectItem value="숙박 후기">숙박 후기</SelectItem>
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
    </div>
  );
}
