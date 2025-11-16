/**
 * 숙박업체 전용 대시보드
 *
 * 기능:
 * - 자기 업체 숙소만 조회
 * - 객실 및 요금 관리
 * - 예약 현황 조회
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { VendorDashboardSkeleton } from './VendorDashboardSkeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import {
  Hotel,
  Plus,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  Loader2,
  LogOut,
  Building2,
  X,
  Upload,
  Download,
  Link as LinkIcon,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { PMSIntegrationManager } from '../utils/pms-integrations';
import { exportToCSV, generateCSVFilename } from '../utils/csv-export';

interface Lodging {
  id: number;
  vendor_id: number;
  name: string;
  type: string;
  city: string;
  address?: string;
  description?: string;
  phone?: string;
  email?: string;
  checkin_time?: string;
  checkout_time?: string;
  is_active: boolean;
  room_count?: number;
}

interface VendorInfo {
  id: number;
  name: string;
  contact_email: string;
  contact_phone: string;
  is_verified: boolean;
}

interface Booking {
  id: number;
  listing_id: number;
  lodging_name: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  guest_count: number;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: string;
  order_number?: string;
}

interface ListingWithStock {
  id: number;
  title: string;
  category: string;
  stock: number | null;
  stock_enabled: boolean;
}

export function VendorLodgingDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null);
  const [lodgings, setLodgings] = useState<Lodging[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<ListingWithStock[]>([]);
  const [activeTab, setActiveTab] = useState('lodgings');

  // 정렬 상태
  const [sortField, setSortField] = useState<'booking_number' | 'lodging_name' | 'customer_name' | 'total_amount' | 'payment_status' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 날짜 필터 상태
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 예약 상세보기 모달
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingDetailOpen, setIsBookingDetailOpen] = useState(false);

  // 숙소 추가/수정 Dialog
  const [isLodgingDialogOpen, setIsLodgingDialogOpen] = useState(false);
  const [editingLodging, setEditingLodging] = useState<Lodging | null>(null);
  const [lodgingForm, setLodgingForm] = useState({
    name: '',
    type: 'hotel',
    city: '신안군',
    address: '',
    description: '',
    phone: '',
    email: '',
    checkin_time: '15:00',
    checkout_time: '11:00',
    is_active: true
  });

  // CSV 업로드
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);

  // PMS 연동
  const [isPmsDialogOpen, setIsPmsDialogOpen] = useState(false);
  const [pmsConfig, setPmsConfig] = useState({
    provider: '',
    api_key: '',
    api_secret: '',
    property_id: ''
  });

  useEffect(() => {
    loadVendorData();
  }, [user?.id]);

  const loadVendorData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // 1. 업체 정보 조회 API (JWT에서 partnerId 자동 추출)
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      const vendorResponse = await fetch(`/api/vendor/lodging/info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const vendorData = await vendorResponse.json();

      if (!vendorData.success || !vendorData.data) {
        toast.error('업체 정보를 찾을 수 없습니다.');
        navigate('/login');
        return;
      }

      const vendor = vendorData.data;
      setVendorInfo(vendor);

      // 2. 숙소 목록 조회 API (JWT에서 partnerId 자동 추출)
      const lodgingsResponse = await fetch(`/api/vendor/lodgings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const lodgingsData = await lodgingsResponse.json();

      if (lodgingsData.success && lodgingsData.data) {
        setLodgings(lodgingsData.data);
      } else {
        setLodgings([]);
      }

      // 3. 예약 목록 조회 API (JWT에서 partnerId 자동 추출)
      const bookingsResponse = await fetch(`/api/vendor/lodging/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const bookingsData = await bookingsResponse.json();

      if (bookingsData.success && bookingsData.data) {
        setBookings(bookingsData.data);
      } else {
        setBookings([]);
      }

      console.log(`✅ 숙박 업체 데이터 로드 완료: ${vendor.name}`);
      console.log(`   숙소: ${lodgingsData.data?.length || 0}개`);
      console.log(`   예약: ${bookingsData.data?.length || 0}건`);

    } catch (error) {
      console.error('업체 데이터 로드 실패:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 재고 관리 함수
  const fetchListingsForStock = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      const response = await fetch('/api/vendor/listings?category=lodging&include_stock=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        setListings(result.data);
      } else {
        toast.error(result.message || '상품 목록을 불러오는데 실패했습니다.');
      }
    } catch (error: any) {
      toast.error(error.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const updateListingStock = async (listingId: number, newStock: number) => {
    if (newStock < 0) {
      toast.error('재고는 0 이상이어야 합니다.');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      const response = await fetch('/api/vendor/stock', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          listing_id: listingId,
          stock: newStock
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('재고가 업데이트되었습니다.');
        fetchListingsForStock(); // 재로드
      } else {
        toast.error(result.message || '재고 업데이트에 실패했습니다.');
      }
    } catch (error: any) {
      toast.error(error.message || '서버 오류가 발생했습니다.');
    }
  };

  const openAddLodgingDialog = () => {
    setEditingLodging(null);
    setLodgingForm({
      name: '',
      type: 'hotel',
      city: '신안군',
      address: '',
      description: '',
      phone: '',
      email: '',
      checkin_time: '15:00',
      checkout_time: '11:00',
      is_active: true
    });
    setIsLodgingDialogOpen(true);
  };

  const openEditLodgingDialog = (lodging: Lodging) => {
    setEditingLodging(lodging);
    setLodgingForm({
      name: lodging.name,
      type: lodging.type,
      city: lodging.city,
      address: lodging.address || '',
      description: lodging.description || '',
      phone: lodging.phone || '',
      email: lodging.email || '',
      checkin_time: lodging.checkin_time || '15:00',
      checkout_time: lodging.checkout_time || '11:00',
      is_active: lodging.is_active
    });
    setIsLodgingDialogOpen(true);
  };

  const handleSaveLodging = async () => {
    if (!lodgingForm.name.trim()) {
      toast.error('숙소 이름을 입력해주세요.');
      return;
    }

    if (!user?.id) return;

    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];

      if (editingLodging) {
        // 수정 - PUT API (JWT에서 partnerId 자동 추출)
        const response = await fetch(`/api/vendor/lodgings/${editingLodging.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...lodgingForm
          })
        });

        const result = await response.json();
        if (result.success) {
          toast.success('숙소 정보가 수정되었습니다.');
        } else {
          toast.error(result.message || '숙소 수정에 실패했습니다.');
          return;
        }
      } else {
        // 추가 - POST API (JWT에서 partnerId 자동 추출)
        const response = await fetch('/api/vendor/lodgings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...lodgingForm
          })
        });

        const result = await response.json();
        if (result.success) {
          toast.success('숙소가 등록되었습니다.');
        } else {
          toast.error(result.message || '숙소 등록에 실패했습니다.');
          return;
        }
      }

      setIsLodgingDialogOpen(false);
      loadVendorData();
    } catch (error) {
      console.error('숙소 저장 실패:', error);
      toast.error('숙소 저장에 실패했습니다.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('로그아웃되었습니다.');
  };

  // 정렬 함수
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      // 같은 필드를 클릭하면 방향 토글
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 필드를 클릭하면 해당 필드로 변경하고 기본 내림차순
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-30" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 inline text-blue-600" />
      : <ArrowDown className="h-3 w-3 ml-1 inline text-blue-600" />;
  };

  const getAriaSort = (field: typeof sortField): 'ascending' | 'descending' | 'none' => {
    if (sortField !== field) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  };

  const handleSortKeyDown = (e: React.KeyboardEvent, field: typeof sortField) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSort(field);
    }
  };

  // CSV Export 함수
  const handleExportCSV = () => {
    const exportData = paginatedBookings.map(booking => ({
      '예약번호': booking.order_number || `#${booking.id}`,
      '숙소명': booking.lodging_name,
      '고객명': booking.guest_name,
      '고객전화': booking.guest_phone,
      '고객이메일': booking.guest_email,
      '체크인': booking.checkin_date ? new Date(booking.checkin_date).toLocaleDateString('ko-KR') : '-',
      '체크아웃': booking.checkout_date ? new Date(booking.checkout_date).toLocaleDateString('ko-KR') : '-',
      '숙박일수': `${booking.nights}박`,
      '인원': `${booking.guest_count}명`,
      '총금액': booking.total_price,
      '결제상태': booking.payment_status === 'paid' || booking.payment_status === 'captured' ? '결제완료' :
                   booking.payment_status === 'pending' ? '대기중' :
                   booking.payment_status === 'refunded' ? '환불' :
                   booking.payment_status,
      '예약상태': booking.status === 'confirmed' || booking.status === 'CONFIRMED' ? '확정' :
                  booking.status === 'completed' || booking.status === 'COMPLETED' ? '완료' :
                  booking.status === 'pending' || booking.status === 'PENDING' ? '대기' :
                  booking.status === 'cancelled' || booking.status === 'CANCELLED' ? '취소' :
                  booking.status,
      '예약일시': booking.created_at ? new Date(booking.created_at).toLocaleString('ko-KR') : '-'
    }));

    const filename = generateCSVFilename('lodging_bookings');
    exportToCSV(exportData, filename);
    toast.success('CSV 파일이 다운로드되었습니다.');
  };

  const handleDeleteLodging = async (lodgingId: number) => {
    if (!confirm('정말 이 숙소를 삭제하시겠습니까? 모든 객실 정보도 함께 삭제됩니다.')) return;

    if (!user?.id) return;

    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      const response = await fetch(`/api/vendor/lodgings/${lodgingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        toast.success('숙소가 삭제되었습니다.');
        loadVendorData();
      } else {
        toast.error(result.message || '숙소 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('숙소 삭제 실패:', error);
      toast.error('숙소 삭제에 실패했습니다.');
    }
  };

  // 체크인 처리
  const handleCheckIn = async (bookingId: number) => {
    if (!confirm('체크인 처리하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      const response = await fetch('/api/vendor/lodging/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_id: bookingId,
          room_condition: 'good',
          notes: '',
          actual_guests_count: null
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('체크인이 완료되었습니다.');
        loadVendorData();
      } else {
        toast.error(result.error || '체크인 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('체크인 처리 실패:', error);
      toast.error('체크인 처리 중 오류가 발생했습니다.');
    }
  };

  // 체크아웃 처리
  const handleCheckOut = async (bookingId: number) => {
    if (!confirm('체크아웃 처리하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      const response = await fetch('/api/vendor/lodging/check-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_id: bookingId,
          room_condition: 'good',
          notes: ''
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('체크아웃이 완료되었습니다.');
        loadVendorData();
      } else {
        toast.error(result.error || '체크아웃 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('체크아웃 처리 실패:', error);
      toast.error('체크아웃 처리 중 오류가 발생했습니다.');
    }
  };

  // 예약 확정
  const handleConfirmBooking = async (bookingId: number) => {
    if (!confirm('예약을 확정하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      const response = await fetch('/api/vendor/lodging/confirm-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ booking_id: bookingId })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('예약이 확정되었습니다.');
        loadVendorData();
      } else {
        toast.error(result.error || '예약 확정에 실패했습니다.');
      }
    } catch (error) {
      console.error('예약 확정 실패:', error);
      toast.error('예약 확정 중 오류가 발생했습니다.');
    }
  };

  // 예약 취소
  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('예약을 취소하시겠습니까? 취소 후 환불 처리가 진행됩니다.')) return;

    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      const response = await fetch('/api/vendor/lodging/cancel-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ booking_id: bookingId })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('예약이 취소되었습니다.');
        loadVendorData();
      } else {
        toast.error(result.error || '예약 취소에 실패했습니다.');
      }
    } catch (error) {
      console.error('예약 취소 실패:', error);
      toast.error('예약 취소 중 오류가 발생했습니다.');
    }
  };

  // CSV 파일 선택
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').map(row => row.split(','));
      const headers = rows[0];
      const data = rows.slice(1).filter(row => row.length > 1).map(row => {
        const obj: any = {};
        headers.forEach((header, i) => {
          obj[header.trim()] = row[i]?.trim() || '';
        });
        return obj;
      });
      setCsvPreview(data);
    };
    reader.readAsText(file);
  };

  // CSV 템플릿 다운로드
  const downloadCsvTemplate = () => {
    const template = `name,type,city,address,description,phone,email,checkin_time,checkout_time,room_name,room_type,base_price,max_occupancy,bed_type,room_size_sqm,amenities,images
신안 그랜드 호텔,hotel,신안군,전라남도 신안군 압해읍 중앙로 123,신안의 중심에 위치한 프리미엄 비즈니스 호텔,061-240-1000,info@sinangrand.com,15:00,11:00,디럭스 더블룸,deluxe,120000,2,더블,32,WiFi|에어컨|냉장고|TV|금고|미니바,https://example.com/hotel1.jpg
바다뷰 펜션,pension,신안군,전라남도 신안군 증도면 해안로 456,증도 앞바다가 한눈에 보이는 오션뷰 펜션,061-275-2000,contact@oceanview.com,14:00,11:00,오션뷰 스탠다드,standard,80000,2,더블,28,WiFi|에어컨|냉장고|TV|발코니,https://example.com/pension1.jpg`;

    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lodging_template.csv';
    link.click();
    toast.success('CSV 템플릿이 다운로드되었습니다.');
  };

  // CSV 업로드 실행
  const handleCsvUpload = async () => {
    if (!vendorInfo?.id || !user?.id) return;
    if (csvPreview.length === 0) {
      toast.error('업로드할 데이터가 없습니다.');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;
      const lodgingMap = new Map<string, number>(); // 숙소명 -> lodging_id

      for (const row of csvPreview) {
        try {
          // 1. 숙소가 이미 있는지 확인 (같은 이름) - API 호출
          let lodgingId = lodgingMap.get(row.name);

          if (!lodgingId) {
            // 기존 숙소 확인 API (JWT에서 partnerId 자동 추출)
            const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
            const checkResponse = await fetch(`/api/vendor/lodgings/check?name=${encodeURIComponent(row.name)}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            const checkData = await checkResponse.json();

            if (checkData.success && checkData.exists) {
              lodgingId = checkData.lodgingId;
            } else {
              // 새 숙소 생성 API (JWT에서 partnerId 자동 추출)
              const createLodgingResponse = await fetch('/api/vendor/lodgings', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  name: row.name,
                  type: row.type || 'hotel',
                  city: row.city || '신안군',
                  address: row.address || '',
                  description: row.description || '',
                  phone: row.phone || '',
                  email: row.email || '',
                  checkin_time: row.checkin_time || '15:00',
                  checkout_time: row.checkout_time || '11:00',
                  is_active: true
                })
              });

              const createLodgingData = await createLodgingResponse.json();
              if (createLodgingData.success) {
                // Refetch to get the ID (or modify API to return the ID)
                const refetchResponse = await fetch(`/api/vendor/lodgings/check?name=${encodeURIComponent(row.name)}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                const refetchData = await refetchResponse.json();
                lodgingId = refetchData.lodgingId;
              }
            }

            if (lodgingId) {
              lodgingMap.set(row.name, lodgingId);
            }
          }

          // 2. 객실 생성 API (JWT에서 partnerId 자동 추출)
          if (lodgingId) {
            const createRoomResponse = await fetch('/api/vendor/rooms', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                lodging_id: lodgingId,
                title: row.room_name || '객실',
                room_type: row.room_type || 'standard',
                price_from: row.base_price || 50000,
                max_occupancy: row.max_occupancy || 2,
                bed_type: row.bed_type || '더블',
                room_size_sqm: row.room_size_sqm || 20,
                amenities: row.amenities || '',
                images: row.images || ''
              })
            });

            const createRoomData = await createRoomResponse.json();
            if (createRoomData.success) {
              successCount++;
            } else {
              errorCount++;
            }
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error('Row upload error:', error);
          errorCount++;
        }
      }

      toast.success(`업로드 완료: 성공 ${successCount}개, 실패 ${errorCount}개`);
      setIsCsvDialogOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      loadVendorData();
    } catch (error) {
      console.error('CSV 업로드 실패:', error);
      toast.error('CSV 업로드 중 오류가 발생했습니다.');
    }
  };

  // PMS 연동 및 동기화
  const handlePmsConnect = async () => {
    if (!pmsConfig.provider || !pmsConfig.api_key) {
      toast.error('PMS 제공자와 API 키를 입력해주세요.');
      return;
    }

    if (!pmsConfig.property_id) {
      toast.error('Property ID를 입력해주세요.');
      return;
    }

    if (!user?.id || !vendorInfo?.id) return;

    try {
      toast.info('PMS 연동을 시작합니다...');

      // 1. 벤더 정보에 PMS 설정 저장 - API 호출 (JWT에서 partnerId 자동 추출)
      const token = localStorage.getItem('auth_token') || document.cookie.split('auth_token=')[1]?.split(';')[0];
      const response = await fetch('/api/vendor/pms-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pms_provider: pmsConfig.provider,
          pms_api_key: pmsConfig.api_key,
          pms_property_id: pmsConfig.property_id
        })
      });

      const saveResult = await response.json();
      if (!saveResult.success) {
        toast.error('PMS 설정 저장에 실패했습니다.');
        return;
      }

      // 2. PMS Integration Manager 생성
      const pmsManager = new PMSIntegrationManager({
        provider: pmsConfig.provider,
        api_key: pmsConfig.api_key,
        api_secret: pmsConfig.api_secret,
        property_id: pmsConfig.property_id
      });

      // 3. PMS에서 데이터 가져와서 동기화
      toast.info('PMS에서 데이터를 가져오는 중...');
      const result = await pmsManager.syncLodgingData(vendorInfo.id);

      if (result.success) {
        toast.success(`✅ ${result.message}`);
        setIsPmsDialogOpen(false);

        // 데이터 새로고침
        setTimeout(() => {
          loadVendorData();
        }, 1000);
      } else {
        toast.error(`❌ ${result.message}`);
        if (result.errors && result.errors.length > 0) {
          console.error('PMS 동기화 오류:', result.errors);
        }
      }
    } catch (error: any) {
      console.error('PMS 연동 실패:', error);
      toast.error(`PMS 연동에 실패했습니다: ${error.message}`);
    }
  };

  // 날짜 필터링된 예약 목록
  const filteredBookings = bookings.filter(booking => {
    if (!startDate && !endDate) return true;

    const bookingDate = new Date(booking.created_at);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && bookingDate < start) return false;
    if (end && bookingDate > end) return false;

    return true;
  });

  // 정렬된 예약 목록
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'booking_number':
        aValue = a.order_number || `#${a.id}`;
        bValue = b.order_number || `#${b.id}`;
        break;
      case 'lodging_name':
        aValue = a.lodging_name || '';
        bValue = b.lodging_name || '';
        break;
      case 'customer_name':
        aValue = a.guest_name || '';
        bValue = b.guest_name || '';
        break;
      case 'total_amount':
        aValue = a.total_price || 0;
        bValue = b.total_price || 0;
        break;
      case 'payment_status':
        aValue = a.payment_status || '';
        bValue = b.payment_status || '';
        break;
      case 'created_at':
        aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
        bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
        break;
      default:
        return 0;
    }

    // 문자열 또는 숫자 비교
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue, 'ko-KR');
      return sortDirection === 'asc' ? comparison : -comparison;
    } else {
      const comparison = aValue - bValue;
      return sortDirection === 'asc' ? comparison : -comparison;
    }
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(sortedBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBookings = sortedBookings.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return <VendorDashboardSkeleton />;
  }

  if (!vendorInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>업체 정보 없음</CardTitle>
            <CardDescription>업체 정보를 찾을 수 없습니다.</CardDescription>
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
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
              <Hotel className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{vendorInfo.name}</h1>
              <p className="text-gray-600 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                숙박업체 대시보드
                {vendorInfo.is_verified && (
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                등록 숙소
              </CardTitle>
              <Hotel className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{lodgings.length}개</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                총 객실
              </CardTitle>
              <Calendar className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {lodgings.reduce((sum, l) => sum + (l.room_count || 0), 0)}개
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                총 예약
              </CardTitle>
              <DollarSign className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{bookings.length}건</div>
              <p className="text-xs text-gray-500 mt-1">
                확정: {bookings.filter(b => b.status === 'confirmed' || b.status === 'CONFIRMED').length}건
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                총 매출
              </CardTitle>
              <DollarSign className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {bookings
                  .filter(b => b.payment_status === 'paid' || b.payment_status === 'captured')
                  .reduce((sum, b) => sum + (b.total_price || 0), 0)
                  .toLocaleString()}원
              </div>
              <p className="text-xs text-gray-500 mt-1">
                결제완료 기준
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 탭 메뉴 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="lodgings">숙소 관리</TabsTrigger>
            <TabsTrigger value="bookings">예약 관리</TabsTrigger>
            <TabsTrigger value="stock">재고 관리</TabsTrigger>
          </TabsList>

          {/* 숙소 관리 */}
          <TabsContent value="lodgings">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>숙소 목록</CardTitle>
                  <CardDescription>등록된 숙소 {lodgings.length}개</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsPmsDialogOpen(true)}>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    PMS 연동
                  </Button>
                  <Button variant="outline" onClick={() => setIsCsvDialogOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    CSV 업로드
                  </Button>
                  <Button onClick={openAddLodgingDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    숙소 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {lodgings.length === 0 ? (
                  <div className="text-center py-12">
                    <Hotel className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">등록된 숙소가 없습니다.</p>
                    <Button onClick={openAddLodgingDialog}>
                      <Plus className="w-4 h-4 mr-2" />
                      첫 숙소 등록하기
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>숙소명</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead>위치</TableHead>
                        <TableHead>객실 수</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lodgings.map((lodging) => (
                        <TableRow key={lodging.id}>
                          <TableCell className="font-medium">
                            {lodging.name}
                          </TableCell>
                          <TableCell>{lodging.type}</TableCell>
                          <TableCell>{lodging.city}</TableCell>
                          <TableCell>{lodging.room_count || 0}개</TableCell>
                          <TableCell>
                            <Badge variant={lodging.is_active ? 'default' : 'secondary'}>
                              {lodging.is_active ? '운영중' : '휴업'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditLodgingDialog(lodging)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteLodging(lodging.id)}
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>예약 목록</CardTitle>
                    <CardDescription>등록된 예약 {bookings.length}건</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportCSV}
                      className="gap-2"
                      disabled={bookings.length === 0}
                    >
                      <Download className="h-4 w-4" />
                      CSV 내보내기
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadVendorData}
                      disabled={loading}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      새로고침
                    </Button>
                  </div>
                </div>
                {/* 날짜 범위 필터 */}
                <div className="flex items-center gap-4 mt-4 px-6">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="start-date" className="whitespace-nowrap">시작일:</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setCurrentPage(1); // 필터 변경 시 첫 페이지로
                      }}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="end-date" className="whitespace-nowrap">종료일:</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-40"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setCurrentPage(1);
                    }}
                    disabled={!startDate && !endDate}
                  >
                    필터 초기화
                  </Button>
                  <div className="text-sm text-gray-600 ml-auto">
                    {filteredBookings.length !== bookings.length && (
                      <span>필터링됨: {filteredBookings.length}건 / 전체: {bookings.length}건</span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">아직 예약이 없습니다.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          role="button"
                          tabIndex={0}
                          aria-sort={getAriaSort('booking_number')}
                          aria-label="예약번호로 정렬"
                          className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          onClick={() => handleSort('booking_number')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'booking_number')}
                        >
                          예약번호 {getSortIcon('booking_number')}
                        </TableHead>
                        <TableHead
                          role="button"
                          tabIndex={0}
                          aria-sort={getAriaSort('lodging_name')}
                          aria-label="숙소명으로 정렬"
                          className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          onClick={() => handleSort('lodging_name')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'lodging_name')}
                        >
                          숙소/객실 {getSortIcon('lodging_name')}
                        </TableHead>
                        <TableHead
                          role="button"
                          tabIndex={0}
                          aria-sort={getAriaSort('customer_name')}
                          aria-label="고객명으로 정렬"
                          className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          onClick={() => handleSort('customer_name')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'customer_name')}
                        >
                          투숙객 {getSortIcon('customer_name')}
                        </TableHead>
                        <TableHead>체크인/아웃</TableHead>
                        <TableHead
                          role="button"
                          tabIndex={0}
                          aria-sort={getAriaSort('total_amount')}
                          aria-label="금액으로 정렬"
                          className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          onClick={() => handleSort('total_amount')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'total_amount')}
                        >
                          금액 {getSortIcon('total_amount')}
                        </TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead
                          role="button"
                          tabIndex={0}
                          aria-sort={getAriaSort('payment_status')}
                          aria-label="결제상태로 정렬"
                          className="cursor-pointer hover:bg-gray-50 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2"
                          onClick={() => handleSort('payment_status')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'payment_status')}
                        >
                          결제 {getSortIcon('payment_status')}
                        </TableHead>
                        <TableHead>관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-mono text-sm">
                            {booking.order_number || `#${booking.id}`}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{booking.lodging_name}</div>
                            <div className="text-sm text-gray-500">
                              {booking.guest_count || '-'}명
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{booking.guest_name}</div>
                            <div className="text-sm text-gray-500">
                              <a href={`tel:${booking.guest_phone}`} className="text-blue-600 hover:underline">
                                {booking.guest_phone}
                              </a>
                            </div>
                            {booking.guest_email && (
                              <div className="text-sm text-gray-500">
                                <a href={`mailto:${booking.guest_email}`} className="text-blue-600 hover:underline">
                                  {booking.guest_email}
                                </a>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(booking.checkin_date).toLocaleDateString('ko-KR')}
                            </div>
                            <div className="text-sm text-gray-500">
                              ~ {new Date(booking.checkout_date).toLocaleDateString('ko-KR')}
                            </div>
                            <div className="text-xs text-gray-400">{booking.nights}박</div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {booking.total_price.toLocaleString()}원
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                (booking.status === 'confirmed' || booking.status === 'CONFIRMED') ? 'default' :
                                (booking.status === 'completed' || booking.status === 'COMPLETED') ? 'default' :
                                (booking.status === 'pending' || booking.status === 'PENDING') ? 'secondary' :
                                (booking.status === 'cancelled' || booking.status === 'CANCELLED') ? 'destructive' :
                                'outline'
                              }
                            >
                              {booking.status === 'confirmed' ? '확정' :
                               booking.status === 'completed' ? '완료' :
                               booking.status === 'pending' ? '대기' :
                               booking.status === 'cancelled' ? '취소' :
                               booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                (booking.payment_status === 'paid' || booking.payment_status === 'captured') ? 'default' :
                                booking.payment_status === 'pending' ? 'secondary' :
                                booking.payment_status === 'refunded' ? 'destructive' :
                                'outline'
                              }
                            >
                              {booking.payment_status === 'paid' ? '결제완료' :
                               booking.payment_status === 'captured' ? '결제완료' :
                               booking.payment_status === 'pending' ? '대기' :
                               booking.payment_status === 'refunded' ? '환불' :
                               booking.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {/* Pending 상태: 확정/취소 버튼 */}
                              {(booking.status === 'pending' || booking.status === 'PENDING') &&
                               (booking.payment_status === 'paid' || booking.payment_status === 'captured') && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleConfirmBooking(booking.id)}
                                  >
                                    확정
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleCancelBooking(booking.id)}
                                  >
                                    취소
                                  </Button>
                                </>
                              )}
                              {/* Confirmed 상태: 체크인 / 취소 버튼 */}
                              {(booking.status === 'confirmed' || booking.status === 'CONFIRMED') &&
                               (booking.payment_status === 'paid' || booking.payment_status === 'captured') && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCheckIn(booking.id)}
                                  >
                                    체크인
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => handleCancelBooking(booking.id)}
                                  >
                                    취소
                                  </Button>
                                </>
                              )}
                              {/* In Use 상태: 체크아웃 버튼 */}
                              {(booking.status === 'in_use' || booking.status === 'IN_USE') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCheckOut(booking.id)}
                                >
                                  체크아웃
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* 페이지네이션 */}
                {bookings.length > 0 && (
                  <div className="mt-6">
                    <div className="text-center mb-4">
                      <p className="text-sm text-gray-500">
                        총 {bookings.length}개의 예약
                      </p>
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          이전
                        </Button>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-600">
                            페이지 {currentPage} / {totalPages}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          다음
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 재고 관리 */}
          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>📦 숙소 재고 관리</CardTitle>
                    <CardDescription>숙소별 재고를 확인하고 관리할 수 있습니다.</CardDescription>
                  </div>
                  <Button
                    onClick={fetchListingsForStock}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    새로고침
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    <p className="mt-4 text-gray-600">로딩 중...</p>
                  </div>
                ) : listings.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">등록된 숙소 상품이 없습니다.</p>
                    <Button
                      onClick={fetchListingsForStock}
                      variant="outline"
                      className="mt-4"
                    >
                      재고 정보 불러오기
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">ID</TableHead>
                            <TableHead>상품명</TableHead>
                            <TableHead className="w-32">카테고리</TableHead>
                            <TableHead className="w-32 text-center">현재 재고</TableHead>
                            <TableHead className="w-48 text-center">재고 수정</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {listings.map((listing) => (
                            <TableRow key={listing.id}>
                              <TableCell className="font-medium">#{listing.id}</TableCell>
                              <TableCell>
                                <div className="font-medium text-gray-900">{listing.title}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{listing.category}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                  {listing.stock !== null ? `${listing.stock}개` : '무제한'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    defaultValue={listing.stock || 0}
                                    className="w-24 text-center"
                                    id={`stock-${listing.id}`}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const input = document.getElementById(`stock-${listing.id}`) as HTMLInputElement;
                                      const newStock = parseInt(input.value);
                                      if (!isNaN(newStock)) {
                                        updateListingStock(listing.id, newStock);
                                      }
                                    }}
                                  >
                                    저장
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* 도움말 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                      <h4 className="font-semibold text-blue-900 mb-2">💡 재고 관리 안내</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• 각 숙소 상품별로 보유하고 있는 재고를 설정할 수 있습니다.</li>
                        <li>• 예약 시 해당 기간에 재고가 부족하면 예약이 불가능합니다.</li>
                        <li>• 재고는 0 이상의 숫자로 입력해주세요.</li>
                        <li>• 변경 후 반드시 "저장" 버튼을 클릭해야 적용됩니다.</li>
                        <li>• 예약 만료 시 자동으로 재고가 복구됩니다.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 숙소 추가/수정 Dialog */}
        <Dialog open={isLodgingDialogOpen} onOpenChange={setIsLodgingDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLodging ? '숙소 정보 수정' : '새 숙소 등록'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">숙소명 *</Label>
                  <Input
                    id="name"
                    value={lodgingForm.name}
                    onChange={(e) => setLodgingForm({ ...lodgingForm, name: e.target.value })}
                    placeholder="예: 신안 오션뷰 펜션"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">숙소 유형</Label>
                  <Select
                    value={lodgingForm.type}
                    onValueChange={(value) => setLodgingForm({ ...lodgingForm, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hotel">호텔</SelectItem>
                      <SelectItem value="motel">모텔</SelectItem>
                      <SelectItem value="pension">펜션</SelectItem>
                      <SelectItem value="guesthouse">게스트하우스</SelectItem>
                      <SelectItem value="resort">리조트</SelectItem>
                      <SelectItem value="camping">캠핑장</SelectItem>
                      <SelectItem value="hostel">호스텔</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">도시</Label>
                  <Input
                    id="city"
                    value={lodgingForm.city}
                    onChange={(e) => setLodgingForm({ ...lodgingForm, city: e.target.value })}
                    placeholder="신안군"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input
                    id="phone"
                    value={lodgingForm.phone}
                    onChange={(e) => setLodgingForm({ ...lodgingForm, phone: e.target.value })}
                    placeholder="061-123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">주소</Label>
                <Input
                  id="address"
                  value={lodgingForm.address}
                  onChange={(e) => setLodgingForm({ ...lodgingForm, address: e.target.value })}
                  placeholder="전라남도 신안군..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={lodgingForm.email}
                  onChange={(e) => setLodgingForm({ ...lodgingForm, email: e.target.value })}
                  placeholder="info@lodging.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">소개</Label>
                <Textarea
                  id="description"
                  value={lodgingForm.description}
                  onChange={(e) => setLodgingForm({ ...lodgingForm, description: e.target.value })}
                  placeholder="숙소에 대한 간단한 소개를 입력하세요..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkin_time">체크인 시간</Label>
                  <Input
                    id="checkin_time"
                    type="time"
                    value={lodgingForm.checkin_time}
                    onChange={(e) => setLodgingForm({ ...lodgingForm, checkin_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkout_time">체크아웃 시간</Label>
                  <Input
                    id="checkout_time"
                    type="time"
                    value={lodgingForm.checkout_time}
                    onChange={(e) => setLodgingForm({ ...lodgingForm, checkout_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={lodgingForm.is_active}
                  onChange={(e) => setLodgingForm({ ...lodgingForm, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active">운영 중</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsLodgingDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSaveLodging}>
                {editingLodging ? '수정' : '등록'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* CSV 업로드 Dialog */}
        <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>CSV 파일로 숙소/객실 대량 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadCsvTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  템플릿 다운로드
                </Button>
                <div>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="max-w-xs"
                  />
                </div>
              </div>

              {csvPreview.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">미리보기 ({csvPreview.length}개 행)</h4>
                  <div className="max-h-96 overflow-auto border rounded">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>숙소명</TableHead>
                          <TableHead>유형</TableHead>
                          <TableHead>객실명</TableHead>
                          <TableHead>가격</TableHead>
                          <TableHead>인원</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvPreview.slice(0, 10).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>{row.type}</TableCell>
                            <TableCell>{row.room_name}</TableCell>
                            <TableCell>{parseInt(row.base_price).toLocaleString()}원</TableCell>
                            <TableCell>{row.max_occupancy}명</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {csvPreview.length > 10 && (
                      <p className="text-sm text-gray-500 p-2">
                        ... 외 {csvPreview.length - 10}개 행
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsCsvDialogOpen(false);
                setCsvFile(null);
                setCsvPreview([]);
              }}>
                취소
              </Button>
              <Button onClick={handleCsvUpload} disabled={csvPreview.length === 0}>
                <Upload className="w-4 h-4 mr-2" />
                업로드 ({csvPreview.length}개)
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* PMS 연동 Dialog */}
        <Dialog open={isPmsDialogOpen} onOpenChange={setIsPmsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>PMS (Property Management System) 연동</DialogTitle>
              <CardDescription>
                기존 PMS 시스템의 API 키를 등록하면 자동으로 숙소/객실 정보를 가져옵니다.
              </CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pms_provider">PMS 제공자</Label>
                <Select
                  value={pmsConfig.provider}
                  onValueChange={(value) => setPmsConfig({ ...pmsConfig, provider: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="PMS 시스템 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eZee">eZee Absolute</SelectItem>
                    <SelectItem value="Opera">Oracle Opera</SelectItem>
                    <SelectItem value="Cloudbeds">Cloudbeds</SelectItem>
                    <SelectItem value="Mews">Mews Systems</SelectItem>
                    <SelectItem value="RMS">RMS Cloud</SelectItem>
                    <SelectItem value="SiteMinder">SiteMinder</SelectItem>
                    <SelectItem value="Amadeus">Amadeus Hospitality</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={pmsConfig.api_key}
                  onChange={(e) => setPmsConfig({ ...pmsConfig, api_key: e.target.value })}
                  placeholder="PMS에서 발급받은 API 키를 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_secret">API Secret (선택)</Label>
                <Input
                  id="api_secret"
                  type="password"
                  value={pmsConfig.api_secret}
                  onChange={(e) => setPmsConfig({ ...pmsConfig, api_secret: e.target.value })}
                  placeholder="API Secret이 있는 경우 입력하세요"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_id">Property ID</Label>
                <Input
                  id="property_id"
                  value={pmsConfig.property_id}
                  onChange={(e) => setPmsConfig({ ...pmsConfig, property_id: e.target.value })}
                  placeholder="PMS에서 부여한 Property ID"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h4 className="font-medium text-blue-900 mb-2">🔒 지원되는 PMS 시스템</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• eZee Absolute - 전 세계 5,000+ 호텔 사용</li>
                  <li>• Oracle Opera - 글로벌 체인 호텔 표준</li>
                  <li>• Cloudbeds - 클라우드 기반 올인원 솔루션</li>
                  <li>• Mews Systems - 유럽 최대 PMS</li>
                  <li>• RMS Cloud - 아시아/태평양 지역 선호</li>
                </ul>
                <p className="text-xs text-blue-700 mt-2">
                  * 현재는 설정만 저장되며, 실제 API 연동은 개발 중입니다. CSV 업로드를 이용해주세요.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPmsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handlePmsConnect}>
                <LinkIcon className="w-4 h-4 mr-2" />
                연동 설정 저장
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default VendorLodgingDashboard;
