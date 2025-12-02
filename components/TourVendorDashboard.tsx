import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, DollarSign, MapPin, Info, RefreshCw, Download, ArrowUp, ArrowDown, ArrowUpDown, Eye, X, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { exportToCSV, generateCSVFilename } from '../utils/csv-export';
import RefundPolicySettings from './vendor/RefundPolicySettings';
import AccountSettings from './vendor/AccountSettings';
import ListingOptionsManager from './vendor/ListingOptionsManager';
import TimeSlotManager from './vendor/TimeSlotManager';

interface TourPackage {
  id: number;
  package_name: string;
  thumbnail_url: string;
  duration_days: number;
  duration_nights: number;
  price_adult_krw: number;
  is_active: boolean;
  schedule_count: number;
  total_bookings: number;
}

interface TourSchedule {
  id: number;
  package_id: number;
  package_name: string;
  departure_date: string;
  departure_time: string;
  max_participants: number;
  current_participants: number;
  status: string;
  guide_name?: string;
  booking_count: number;
}

interface TourBooking {
  id: number;
  booking_number?: string;
  package_name: string;
  departure_date: string;
  departure_time: string;
  adult_count: number;
  child_count: number;
  infant_count: number;
  total_price_krw: number;
  points_used?: number;
  insurance?: {
    name: string;
    price: number;
  };
  status: string;
  payment_status?: string;
  payment_key?: string;
  username: string;
  user_email: string;
  user_phone: string;
  created_at: string;
}

interface ListingWithStock {
  id: number;
  title: string;
  category: string;
  stock: number | null;
  stock_enabled: boolean;
}

const TourVendorDashboard = ({ vendorId }: { vendorId: number }) => {
  const [activeTab, setActiveTab] = useState<'packages' | 'schedules' | 'bookings' | 'stock' | 'options' | 'settings'>('packages');
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [schedules, setSchedules] = useState<TourSchedule[]>([]);
  const [bookings, setBookings] = useState<TourBooking[]>([]);
  const [listings, setListings] = useState<ListingWithStock[]>([]);
  const [loading, setLoading] = useState(false);

  // 정렬 상태
  const [sortField, setSortField] = useState<'booking_number' | 'tour_name' | 'customer_name' | 'total_amount' | 'payment_status' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 예약 상세보기 모달
  const [selectedBooking, setSelectedBooking] = useState<TourBooking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 패키지 목록 로드 (JWT에서 vendorId 자동 추출)
  const loadPackages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/vendor/tour/packages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setPackages(data.packages || []);
      }
    } catch (error) {
      console.error('패키지 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 일정 목록 로드 (JWT에서 vendorId 자동 추출)
  const loadSchedules = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/vendor/tour/schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('일정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 예약 목록 로드 (JWT에서 vendorId 자동 추출)
  const loadBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/vendor/tour/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('예약 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 재고 관리 함수
  const fetchListingsForStock = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/vendor/listings?category=tour&include_stock=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        setListings(result.data);
      } else {
        alert(result.message || '상품 목록을 불러오는데 실패했습니다.');
      }
    } catch (error: any) {
      alert(error.message || '서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const updateListingStock = async (listingId: number, newStock: number) => {
    if (newStock < 0) {
      alert('재고는 0 이상이어야 합니다.');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
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
        alert('재고가 업데이트되었습니다.');
        fetchListingsForStock(); // 재로드
      } else {
        alert(result.message || '재고 업데이트에 실패했습니다.');
      }
    } catch (error: any) {
      alert(error.message || '서버 오류가 발생했습니다.');
    }
  };

  // 환불 처리
  const handleRefund = async (booking: TourBooking) => {
    if (!booking.payment_key) {
      alert('결제 정보를 찾을 수 없습니다.');
      return;
    }

    if (!confirm(`${booking.package_name} 예약을 환불하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentKey: booking.payment_key,
          cancelReason: '벤더 요청 환불',
          skipPolicy: true
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('환불이 완료되었습니다.');
        loadBookings();
      } else {
        alert(result.message || '환불에 실패했습니다.');
      }
    } catch (error) {
      console.error('환불 오류:', error);
      alert('환불 처리 중 오류가 발생했습니다.');
    }
  };

  // 예약 상태 변경
  const handleUpdateStatus = async (booking: TourBooking, newStatus: string) => {
    const statusMessages = {
      confirmed: '확정',
      canceled: '취소',
      completed: '완료'
    };

    const message = statusMessages[newStatus as keyof typeof statusMessages] || newStatus;

    if (!confirm(`${booking.package_name} 예약을 ${message}하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/vendor/tour/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_id: booking.id,
          status: newStatus
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`예약이 ${message}되었습니다.`);
        loadBookings();
      } else {
        alert(result.message || `${message} 처리에 실패했습니다.`);
      }
    } catch (error) {
      console.error('상태 변경 오류:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  // 정렬 처리
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

  // CSV 내보내기
  const handleExportCSV = () => {
    const exportData = sortedBookings.map(booking => ({
      '예약번호': booking.booking_number || '-',
      '투어명': booking.package_name,
      '고객명': booking.username,
      '전화번호': booking.user_phone,
      '이메일': booking.user_email,
      '투어일시': `${booking.departure_date} ${booking.departure_time}`,
      '성인': booking.adult_count,
      '아동': booking.child_count,
      '유아': booking.infant_count,
      '총인원': booking.adult_count + booking.child_count + booking.infant_count,
      '금액': booking.total_price_krw,
      '결제상태': booking.payment_status === 'paid' ? '결제완료' : booking.payment_status === 'refunded' ? '환불완료' : booking.payment_status === 'pending' ? '대기중' : booking.payment_status || '-',
      '예약상태': booking.status === 'pending' ? '대기' : booking.status === 'confirmed' ? '확정' : booking.status === 'completed' ? '완료' : booking.status === 'canceled' ? '취소' : booking.status,
      '예약일시': booking.created_at ? new Date(booking.created_at).toLocaleString('ko-KR') : '-'
    }));

    const filename = generateCSVFilename('tour_bookings');
    exportToCSV(exportData, filename);
  };

  // 새로고침 처리
  const handleRefresh = () => {
    if (activeTab === 'packages') loadPackages();
    else if (activeTab === 'schedules') loadSchedules();
    else if (activeTab === 'bookings') loadBookings();
  };

  useEffect(() => {
    if (activeTab === 'packages') loadPackages();
    else if (activeTab === 'schedules') loadSchedules();
    else if (activeTab === 'bookings') loadBookings();
  }, [activeTab, vendorId]);

  // 정렬된 예약 목록
  const sortedBookings = [...bookings].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'booking_number':
        aValue = a.booking_number || '';
        bValue = b.booking_number || '';
        break;
      case 'tour_name':
        aValue = a.package_name || '';
        bValue = b.package_name || '';
        break;
      case 'customer_name':
        aValue = a.username || '';
        bValue = b.username || '';
        break;
      case 'total_amount':
        aValue = a.total_price_krw || 0;
        bValue = b.total_price_krw || 0;
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

  // 통계 계산
  const stats = {
    totalPackages: packages.length,
    activePackages: packages.filter(p => p.is_active).length,
    totalSchedules: schedules.length,
    upcomingSchedules: schedules.filter(s => s.status === 'scheduled').length,
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
  };

  return (
    <div className="tour-vendor-dashboard">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>투어 관리</h2>
          <p className="text-gray-600">내 투어 패키지와 예약을 관리하세요</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="stats-grid">
        <div className="stat-card">
          <MapPin className="stat-icon" />
          <div>
            <div className="stat-value">{stats.totalPackages}</div>
            <div className="stat-label">전체 패키지</div>
          </div>
        </div>
        <div className="stat-card">
          <Calendar className="stat-icon" />
          <div>
            <div className="stat-value">{stats.upcomingSchedules}</div>
            <div className="stat-label">예정된 일정</div>
          </div>
        </div>
        <div className="stat-card">
          <Users className="stat-icon" />
          <div>
            <div className="stat-value">{stats.confirmedBookings}</div>
            <div className="stat-label">확정 예약</div>
          </div>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'packages' ? 'active' : ''}`}
          onClick={() => setActiveTab('packages')}
        >
          <MapPin size={18} />
          패키지 관리
        </button>
        <button
          className={`tab ${activeTab === 'schedules' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedules')}
        >
          <Calendar size={18} />
          일정 관리
        </button>
        <button
          className={`tab ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          <Users size={18} />
          예약 관리
        </button>
        <button
          className={`tab ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          📦 재고 관리
        </button>
        <button
          className={`tab ${activeTab === 'options' ? 'active' : ''}`}
          onClick={() => setActiveTab('options')}
        >
          <Clock size={18} />
          옵션 관리
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={18} />
          설정
        </button>
      </div>

      {/* 컨텐츠 */}
      <div className="tab-content">
        {loading ? (
          <div className="loading">로딩 중...</div>
        ) : (
          <>
            {/* 패키지 관리 탭 */}
            {activeTab === 'packages' && (
              <div className="packages-list">
                {packages.length === 0 ? (
                  <div className="empty-state">
                    <Info size={48} />
                    <p>등록된 투어 패키지가 없습니다.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {packages.map((pkg) => (
                      <div key={pkg.id} className="package-card">
                        <img
                          src={pkg.thumbnail_url || '/placeholder-tour.jpg'}
                          alt={pkg.package_name}
                          className="package-thumbnail"
                        />
                        <div className="package-info">
                          <h3>{pkg.package_name}</h3>
                          <div className="package-meta">
                            <span>
                              <Clock size={16} />
                              {pkg.duration_days}일 {pkg.duration_nights}박
                            </span>
                            <span>
                              <DollarSign size={16} />
                              {pkg.price_adult_krw.toLocaleString()}원
                            </span>
                            <span>
                              <Calendar size={16} />
                              {pkg.schedule_count}개 일정
                            </span>
                            <span>
                              <Users size={16} />
                              {pkg.total_bookings || 0}명 예약
                            </span>
                          </div>
                          <div className="package-status">
                            {pkg.is_active ? (
                              <span className="badge badge-success">활성</span>
                            ) : (
                              <span className="badge badge-inactive">비활성</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 일정 관리 탭 */}
            {activeTab === 'schedules' && (
              <div className="schedules-list">
                {schedules.length === 0 ? (
                  <div className="empty-state">
                    <Info size={48} />
                    <p>등록된 일정이 없습니다.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>패키지명</th>
                          <th>출발일시</th>
                          <th>가이드</th>
                          <th>정원/현재</th>
                          <th>예약 수</th>
                          <th>상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedules.map((schedule) => (
                          <tr key={schedule.id}>
                            <td>{schedule.package_name}</td>
                            <td>
                              {schedule.departure_date} {schedule.departure_time}
                            </td>
                            <td>{schedule.guide_name || '-'}</td>
                            <td>
                              {schedule.current_participants} / {schedule.max_participants}
                            </td>
                            <td>{schedule.booking_count}</td>
                            <td>
                              {schedule.status === 'scheduled' && (
                                <span className="badge badge-primary">예정</span>
                              )}
                              {schedule.status === 'confirmed' && (
                                <span className="badge badge-success">확정</span>
                              )}
                              {schedule.status === 'completed' && (
                                <span className="badge badge-secondary">완료</span>
                              )}
                              {schedule.status === 'canceled' && (
                                <span className="badge badge-danger">취소</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 예약 관리 탭 */}
            {activeTab === 'bookings' && (
              <div className="bookings-list">
                {bookings.length === 0 ? (
                  <div className="empty-state">
                    <Info size={48} />
                    <p>예약 내역이 없습니다.</p>
                  </div>
                ) : (
                  <>
                    <div className="table-actions" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="outline"
                        onClick={handleExportCSV}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        CSV 내보내기
                      </Button>
                    </div>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th
                              role="button"
                              tabIndex={0}
                              aria-sort={getAriaSort('booking_number')}
                              aria-label="예약번호로 정렬"
                              className="sortable-header"
                              onClick={() => handleSort('booking_number')}
                              onKeyDown={(e) => handleSortKeyDown(e, 'booking_number')}
                            >
                              예약번호 {getSortIcon('booking_number')}
                            </th>
                            <th
                              role="button"
                              tabIndex={0}
                              aria-sort={getAriaSort('tour_name')}
                              aria-label="투어명으로 정렬"
                              className="sortable-header"
                              onClick={() => handleSort('tour_name')}
                              onKeyDown={(e) => handleSortKeyDown(e, 'tour_name')}
                            >
                              투어명 {getSortIcon('tour_name')}
                            </th>
                            <th>출발일시</th>
                            <th
                              role="button"
                              tabIndex={0}
                              aria-sort={getAriaSort('customer_name')}
                              aria-label="예약자로 정렬"
                              className="sortable-header"
                              onClick={() => handleSort('customer_name')}
                              onKeyDown={(e) => handleSortKeyDown(e, 'customer_name')}
                            >
                              예약자 {getSortIcon('customer_name')}
                            </th>
                            <th>인원</th>
                            <th
                              role="button"
                              tabIndex={0}
                              aria-sort={getAriaSort('total_amount')}
                              aria-label="금액으로 정렬"
                              className="sortable-header"
                              onClick={() => handleSort('total_amount')}
                              onKeyDown={(e) => handleSortKeyDown(e, 'total_amount')}
                            >
                              금액 {getSortIcon('total_amount')}
                            </th>
                            <th
                              role="button"
                              tabIndex={0}
                              aria-sort={getAriaSort('payment_status')}
                              aria-label="결제상태로 정렬"
                              className="sortable-header"
                              onClick={() => handleSort('payment_status')}
                              onKeyDown={(e) => handleSortKeyDown(e, 'payment_status')}
                            >
                              결제상태 {getSortIcon('payment_status')}
                            </th>
                            <th
                              role="button"
                              tabIndex={0}
                              aria-sort={getAriaSort('created_at')}
                              aria-label="예약일시로 정렬"
                              className="sortable-header"
                              onClick={() => handleSort('created_at')}
                              onKeyDown={(e) => handleSortKeyDown(e, 'created_at')}
                            >
                              예약일시 {getSortIcon('created_at')}
                            </th>
                            <th>액션</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedBookings.map((booking) => (
                          <tr key={booking.id}>
                            <td className="font-medium text-blue-600">{booking.booking_number || '-'}</td>
                            <td>{booking.package_name}</td>
                            <td>
                              {booking.departure_date} {booking.departure_time}
                            </td>
                            <td>
                              <div className="space-y-1">
                                <div className="font-medium">{booking.username}</div>
                                <div className="text-sm text-gray-500">
                                  <a href={`mailto:${booking.user_email}`} className="text-blue-600 hover:underline">
                                    {booking.user_email}
                                  </a>
                                </div>
                                <div className="text-sm text-gray-500">
                                  <a href={`tel:${booking.user_phone}`} className="text-blue-600 hover:underline">
                                    {booking.user_phone}
                                  </a>
                                </div>
                              </div>
                            </td>
                            <td>
                              성인 {booking.adult_count}
                              {booking.child_count > 0 && `, 아동 ${booking.child_count}`}
                              {booking.infant_count > 0 && `, 유아 ${booking.infant_count}`}
                            </td>
                            <td>
                              <div>
                                {booking.total_price_krw.toLocaleString()}원
                                {booking.insurance && booking.insurance.price > 0 && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    보험: {booking.insurance.name} +₩{booking.insurance.price.toLocaleString()}
                                  </div>
                                )}
                                {booking.points_used && booking.points_used > 0 && (
                                  <div className="text-xs text-red-600 mt-1">
                                    포인트 사용 -₩{booking.points_used.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>
                              {booking.payment_status === 'paid' && (
                                <span className="badge badge-success">결제완료</span>
                              )}
                              {booking.payment_status === 'refunded' && (
                                <span className="badge badge-danger">환불완료</span>
                              )}
                              {booking.payment_status === 'pending' && (
                                <span className="badge badge-warning">대기중</span>
                              )}
                              {!booking.payment_status && (
                                <span className="badge badge-secondary">-</span>
                              )}
                            </td>
                            <td>
                              <div className="text-sm">
                                {booking.created_at ? new Date(booking.created_at).toLocaleDateString('ko-KR') : '-'}
                              </div>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="status-btn"
                                  style={{ backgroundColor: '#6b7280', marginBottom: '4px' }}
                                >
                                  <Eye className="h-4 w-4" style={{ display: 'inline', marginRight: '4px' }} />
                                  상세보기
                                </button>
                                {booking.status === 'pending' && (
                                  <button
                                    onClick={() => handleUpdateStatus(booking, 'confirmed')}
                                    className="status-btn confirm-btn"
                                  >
                                    확정
                                  </button>
                                )}
                                {booking.status === 'confirmed' && (
                                  <button
                                    onClick={() => handleUpdateStatus(booking, 'completed')}
                                    className="status-btn complete-btn"
                                  >
                                    완료
                                  </button>
                                )}
                                {booking.status !== 'canceled' &&
                                 booking.status !== 'completed' && (
                                  <button
                                    onClick={() => handleUpdateStatus(booking, 'canceled')}
                                    className="status-btn cancel-btn"
                                  >
                                    취소
                                  </button>
                                )}
                                {booking.payment_status === 'paid' &&
                                 booking.status !== 'canceled' &&
                                 booking.status !== 'completed' && (
                                  <button
                                    onClick={() => handleRefund(booking)}
                                    className="refund-btn"
                                  >
                                    환불
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* 페이지네이션 */}
                    <div className="pagination-container">
                      <div className="text-center mb-4">
                        <p className="text-sm text-gray-500">
                          총 {sortedBookings.length}개의 예약
                        </p>
                      </div>

                      {totalPages > 1 && (
                        <div className="pagination-controls">
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
                  </div>
                </>
                )}
              </div>
            )}

            {/* 재고 관리 탭 */}
            {activeTab === 'stock' && (
              <div className="stock-management">
                <div className="section-header">
                  <h2>📦 투어 재고 관리</h2>
                  <Button onClick={fetchListingsForStock} disabled={loading}>
                    <RefreshCw size={16} style={{ marginRight: '8px' }} />
                    새로고침
                  </Button>
                </div>

                {listings.length === 0 ? (
                  <div className="empty-state">
                    <Info size={48} />
                    <p>등록된 투어 상품이 없습니다.</p>
                    <Button onClick={fetchListingsForStock} variant="outline">
                      재고 정보 불러오기
                    </Button>
                  </div>
                ) : (
                  <div className="stock-table-container">
                    <table className="stock-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>상품명</th>
                          <th>카테고리</th>
                          <th>현재 재고</th>
                          <th>재고 수정</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listings.map((listing) => (
                          <tr key={listing.id}>
                            <td>#{listing.id}</td>
                            <td>{listing.title}</td>
                            <td><span className="category-badge">{listing.category}</span></td>
                            <td>
                              <span className="stock-badge">
                                {listing.stock !== null ? `${listing.stock}개` : '무제한'}
                              </span>
                            </td>
                            <td>
                              <div className="stock-controls">
                                <input
                                  type="number"
                                  min="0"
                                  defaultValue={listing.stock || 0}
                                  className="stock-input"
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="help-box">
                      <h4>💡 재고 관리 안내</h4>
                      <ul>
                        <li>• 각 투어 상품별로 보유하고 있는 재고를 설정할 수 있습니다.</li>
                        <li>• 예약 시 해당 기간에 재고가 부족하면 예약이 불가능합니다.</li>
                        <li>• 재고는 0 이상의 숫자로 입력해주세요.</li>
                        <li>• 변경 후 반드시 "저장" 버튼을 클릭해야 적용됩니다.</li>
                        <li>• 예약 만료 시 자동으로 재고가 복구됩니다.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 옵션 관리 탭 */}
            {activeTab === 'options' && (
              <div className="options-tab space-y-6">
                <TimeSlotManager
                  listings={packages.map(p => ({ id: p.id, title: p.package_name, category: 'tour' }))}
                  categoryLabel="투어 시간대"
                  defaultCapacity={10}
                />
                <ListingOptionsManager
                  listings={packages.map(p => ({ id: p.id, title: p.package_name, category: 'tour' }))}
                  defaultOptionType="package"
                  categoryLabel="패키지/추가옵션"
                />
              </div>
            )}

            {/* 설정 탭 */}
            {activeTab === 'settings' && (
              <div className="settings-tab space-y-6">
                {/* 내 계정 설정 */}
                <AccountSettings />
                {/* 환불 정책 설정 */}
                <RefundPolicySettings />
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .tour-vendor-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .dashboard-header {
          margin-bottom: 30px;
        }

        .dashboard-header h2 {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          color: #3b82f6;
          flex-shrink: 0;
        }

        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #1f2937;
        }

        .stat-label {
          font-size: 14px;
          color: #6b7280;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s;
        }

        .tab:hover {
          color: #3b82f6;
        }

        .tab.active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .tab-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          min-height: 400px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .loading {
          text-align: center;
          padding: 60px;
          color: #6b7280;
        }

        .empty-state {
          text-align: center;
          padding: 60px;
          color: #9ca3af;
        }

        .empty-state p {
          margin-top: 16px;
          font-size: 16px;
        }

        .package-card {
          display: flex;
          gap: 16px;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .package-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .package-thumbnail {
          width: 120px;
          height: 120px;
          object-fit: cover;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .package-info {
          flex: 1;
        }

        .package-info h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .package-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 12px;
          font-size: 14px;
          color: #6b7280;
        }

        .package-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .table-container {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          background: #f9fafb;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }

        .sortable-header {
          cursor: pointer;
          user-select: none;
          transition: all 0.2s;
        }

        .sortable-header:hover {
          background: #f3f4f6;
        }

        .sortable-header:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .data-table tr:hover {
          background: #f9fafb;
        }

        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge-success {
          background: #dcfce7;
          color: #166534;
        }

        .badge-inactive {
          background: #f3f4f6;
          color: #6b7280;
        }

        .badge-primary {
          background: #dbeafe;
          color: #1e40af;
        }

        .badge-secondary {
          background: #f3f4f6;
          color: #4b5563;
        }

        .badge-warning {
          background: #fef3c7;
          color: #92400e;
        }

        .badge-danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .text-sm {
          font-size: 12px;
        }

        .text-gray-500 {
          color: #6b7280;
        }

        .text-gray-600 {
          color: #4b5563;
        }

        .action-buttons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .status-btn {
          padding: 5px 10px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .confirm-btn {
          background: #3b82f6;
          color: white;
        }

        .confirm-btn:hover {
          background: #2563eb;
        }

        .complete-btn {
          background: #10b981;
          color: white;
        }

        .complete-btn:hover {
          background: #059669;
        }

        .cancel-btn {
          background: #f59e0b;
          color: white;
        }

        .cancel-btn:hover {
          background: #d97706;
        }

        .refund-btn {
          padding: 5px 10px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refund-btn:hover {
          background: #dc2626;
        }

        .status-btn:active,
        .refund-btn:active {
          transform: scale(0.95);
        }

        .pagination-container {
          margin-top: 24px;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .font-medium {
          font-weight: 500;
        }

        .space-y-1 > * + * {
          margin-top: 0.25rem;
        }

        /* 재고 관리 스타일 */
        .stock-management {
          background: white;
          border-radius: 8px;
          padding: 24px;
        }

        .stock-table-container {
          overflow-x: auto;
        }

        .stock-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
        }

        .stock-table th {
          background: #f9fafb;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }

        .stock-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .category-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #f3f4f6;
          border-radius: 12px;
          font-size: 14px;
          color: #374151;
        }

        .stock-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 12px;
          font-weight: 500;
          font-size: 14px;
        }

        .stock-controls {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: center;
        }

        .stock-input {
          width: 80px;
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          text-align: center;
          font-size: 14px;
        }

        .stock-input:focus {
          outline: none;
          border-color: #3b82f6;
          ring: 2px;
          ring-color: #93c5fd;
        }

        .help-box {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 16px;
          margin-top: 24px;
        }

        .help-box h4 {
          font-weight: 600;
          color: #1e3a8a;
          margin-bottom: 8px;
        }

        .help-box ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .help-box li {
          font-size: 14px;
          color: #1e40af;
          margin-top: 4px;
        }
      `}</style>

      {/* 예약 상세보기 모달 */}
      {isDetailModalOpen && selectedBooking && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              position: 'sticky',
              top: 0,
              backgroundColor: 'white',
              borderBottom: '1px solid #e5e7eb',
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>예약 상세 정보</h2>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedBooking(null);
                }}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '9999px'
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* 투어 기본 정보 */}
              <div style={{ backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '16px' }}>
                <h3 style={{ fontWeight: '600', color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar style={{ width: '20px', height: '20px', color: '#2563eb' }} />
                  투어 기본 정보
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>예약번호:</span>
                    <span style={{ marginLeft: '8px', color: '#111827', fontFamily: 'monospace' }}>{selectedBooking.booking_number || '-'}</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>투어명:</span>
                    <span style={{ marginLeft: '8px', color: '#111827' }}>{selectedBooking.package_name}</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>출발일시:</span>
                    <span style={{ marginLeft: '8px', color: '#111827' }}>
                      {selectedBooking.departure_date} {selectedBooking.departure_time}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>상태:</span>
                    <span style={{ marginLeft: '8px' }}>
                      {selectedBooking.status === 'pending' && <span className="badge badge-warning">대기중</span>}
                      {selectedBooking.status === 'confirmed' && <span className="badge badge-success">확정</span>}
                      {selectedBooking.status === 'completed' && <span className="badge badge-secondary">완료</span>}
                      {selectedBooking.status === 'canceled' && <span className="badge badge-danger">취소</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* 고객 정보 */}
              <div style={{ backgroundColor: '#dbeafe', borderRadius: '8px', padding: '16px' }}>
                <h3 style={{ fontWeight: '600', color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users style={{ width: '20px', height: '20px', color: '#2563eb' }} />
                  고객 정보
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>이름:</span>
                    <span style={{ marginLeft: '8px', color: '#111827' }}>{selectedBooking.username}</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>이메일:</span>
                    <a
                      href={`mailto:${selectedBooking.user_email}`}
                      style={{ marginLeft: '8px', color: '#2563eb', textDecoration: 'underline' }}
                    >
                      {selectedBooking.user_email}
                    </a>
                  </div>
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>전화번호:</span>
                    <a
                      href={`tel:${selectedBooking.user_phone}`}
                      style={{ marginLeft: '8px', color: '#2563eb', textDecoration: 'underline' }}
                    >
                      {selectedBooking.user_phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* 인원 정보 */}
              <div style={{ backgroundColor: '#fef3c7', borderRadius: '8px', padding: '16px' }}>
                <h3 style={{ fontWeight: '600', color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
                  인원 정보
                </h3>
                <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>성인:</span>
                    <span style={{ marginLeft: '8px', color: '#111827', fontWeight: '600' }}>{selectedBooking.adult_count}명</span>
                  </div>
                  {selectedBooking.child_count > 0 && (
                    <div>
                      <span style={{ fontWeight: '500', color: '#374151' }}>아동:</span>
                      <span style={{ marginLeft: '8px', color: '#111827', fontWeight: '600' }}>{selectedBooking.child_count}명</span>
                    </div>
                  )}
                  {selectedBooking.infant_count > 0 && (
                    <div>
                      <span style={{ fontWeight: '500', color: '#374151' }}>유아:</span>
                      <span style={{ marginLeft: '8px', color: '#111827', fontWeight: '600' }}>{selectedBooking.infant_count}명</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 결제 정보 */}
              <div style={{ backgroundColor: '#d1fae5', borderRadius: '8px', padding: '16px' }}>
                <h3 style={{ fontWeight: '600', color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign style={{ width: '20px', height: '20px', color: '#10b981' }} />
                  결제 정보
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '500', color: '#374151' }}>총 금액:</span>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                      {selectedBooking.total_price_krw.toLocaleString()}원
                    </span>
                  </div>
                  <div>
                    <span style={{ fontWeight: '500', color: '#374151' }}>결제 상태:</span>
                    <span style={{ marginLeft: '8px' }}>
                      {selectedBooking.payment_status === 'paid' && <span className="badge badge-success">결제완료</span>}
                      {selectedBooking.payment_status === 'refunded' && <span className="badge badge-danger">환불완료</span>}
                      {selectedBooking.payment_status === 'pending' && <span className="badge badge-warning">대기중</span>}
                      {!selectedBooking.payment_status && <span className="badge badge-secondary">-</span>}
                    </span>
                  </div>
                  {selectedBooking.payment_key && (
                    <div>
                      <span style={{ fontWeight: '500', color: '#374151' }}>결제 키:</span>
                      <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '12px', fontFamily: 'monospace' }}>
                        {selectedBooking.payment_key}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 등록일시 */}
              <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                등록일시: {selectedBooking.created_at ? new Date(selectedBooking.created_at).toLocaleString('ko-KR') : '-'}
              </div>
            </div>

            <div style={{
              position: 'sticky',
              bottom: 0,
              backgroundColor: '#f9fafb',
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <Button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedBooking(null);
                }}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourVendorDashboard;
