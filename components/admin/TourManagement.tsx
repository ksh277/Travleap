import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, DollarSign, MapPin, Info, Search, Filter, Plus, Edit, Trash2, Check, X } from 'lucide-react';

interface TourPackage {
  id: number;
  package_name: string;
  package_code: string;
  vendor_id: number;
  thumbnail_url: string;
  duration_days: number;
  duration_nights: number;
  price_adult_krw: number;
  is_active: boolean;
  schedule_count: number;
  total_bookings: number;
  listing_title: string;
  location: string;
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
  package_name: string;
  departure_date: string;
  departure_time: string;
  adult_count: number;
  child_count: number;
  infant_count: number;
  total_price_krw: number;
  status: string;
  username: string;
  user_email: string;
  user_phone: string;
  created_at: string;
}

const TourManagement = () => {
  const [activeTab, setActiveTab] = useState<'packages' | 'schedules' | 'bookings'>('packages');
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [schedules, setSchedules] = useState<TourSchedule[]>([]);
  const [bookings, setBookings] = useState<TourBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 패키지 목록 로드
  const loadPackages = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tour/packages');
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

  // 일정 목록 로드
  const loadSchedules = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tour/schedules');
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

  // 예약 목록 로드
  const loadBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tour/bookings');
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

  // 패키지 활성화/비활성화
  const togglePackageActive = async (packageId: number, isActive: boolean) => {
    try {
      const response = await fetch('/api/admin/tour/packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_id: packageId,
          is_active: !isActive
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(isActive ? '패키지가 비활성화되었습니다.' : '패키지가 활성화되었습니다.');
        loadPackages();
      }
    } catch (error) {
      console.error('패키지 상태 변경 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 패키지 삭제
  const deletePackage = async (packageId: number) => {
    if (!confirm('정말 이 투어 패키지를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/tour/packages?package_id=${packageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        alert('패키지가 삭제되었습니다.');
        loadPackages();
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('패키지 삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  // 일정 삭제
  const deleteSchedule = async (scheduleId: number) => {
    if (!confirm('정말 이 일정을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/admin/tour/schedules?schedule_id=${scheduleId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        alert('일정이 삭제되었습니다.');
        loadSchedules();
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('일정 삭제 실패:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  // 예약 상태 변경
  const updateBookingStatus = async (bookingId: number, status: string) => {
    try {
      const response = await fetch('/api/admin/tour/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          status
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('예약 상태가 변경되었습니다.');
        loadBookings();
      }
    } catch (error) {
      console.error('예약 상태 변경 실패:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 예약 취소
  const cancelBooking = async (bookingId: number) => {
    const reason = prompt('취소 사유를 입력하세요:');
    if (!reason) return;

    try {
      const response = await fetch(`/api/admin/tour/bookings?booking_id=${bookingId}&refund_reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        alert(`예약이 취소되었습니다. 환불 금액: ${data.refund_amount.toLocaleString()}원`);
        loadBookings();
      }
    } catch (error) {
      console.error('예약 취소 실패:', error);
      alert('취소에 실패했습니다.');
    }
  };

  useEffect(() => {
    if (activeTab === 'packages') loadPackages();
    else if (activeTab === 'schedules') loadSchedules();
    else if (activeTab === 'bookings') loadBookings();
  }, [activeTab]);

  // 필터링된 데이터
  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.package_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && pkg.is_active) ||
                         (statusFilter === 'inactive' && !pkg.is_active);
    return matchesSearch && matchesStatus;
  });

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.package_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.package_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 통계 계산
  const stats = {
    totalPackages: packages.length,
    activePackages: packages.filter(p => p.is_active).length,
    totalSchedules: schedules.length,
    upcomingSchedules: schedules.filter(s => s.status === 'scheduled').length,
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    totalRevenue: bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.total_price_krw, 0)
  };

  return (
    <div className="tour-management">
      <div className="management-header">
        <h2>투어 관리</h2>
        <p className="text-gray-600">전체 투어 패키지, 일정, 예약을 관리하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="stats-grid">
        <div className="stat-card">
          <MapPin className="stat-icon" />
          <div>
            <div className="stat-value">{stats.totalPackages}</div>
            <div className="stat-label">전체 패키지</div>
            <div className="stat-sub">{stats.activePackages}개 활성</div>
          </div>
        </div>
        <div className="stat-card">
          <Calendar className="stat-icon" />
          <div>
            <div className="stat-value">{stats.totalSchedules}</div>
            <div className="stat-label">전체 일정</div>
            <div className="stat-sub">{stats.upcomingSchedules}개 예정</div>
          </div>
        </div>
        <div className="stat-card">
          <Users className="stat-icon" />
          <div>
            <div className="stat-value">{stats.totalBookings}</div>
            <div className="stat-label">전체 예약</div>
            <div className="stat-sub">{stats.confirmedBookings}개 확정</div>
          </div>
        </div>
        <div className="stat-card">
          <DollarSign className="stat-icon" />
          <div>
            <div className="stat-value">{(stats.totalRevenue / 1000000).toFixed(1)}M</div>
            <div className="stat-label">총 매출</div>
            <div className="stat-sub">{stats.totalRevenue.toLocaleString()}원</div>
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
          패키지 관리 ({packages.length})
        </button>
        <button
          className={`tab ${activeTab === 'schedules' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedules')}
        >
          <Calendar size={18} />
          일정 관리 ({schedules.length})
        </button>
        <button
          className={`tab ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          <Users size={18} />
          예약 관리 ({bookings.length})
        </button>
      </div>

      {/* 필터 */}
      <div className="filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-box">
          <Filter size={20} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">전체</option>
            {activeTab === 'packages' && (
              <>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </>
            )}
            {activeTab === 'schedules' && (
              <>
                <option value="scheduled">예정</option>
                <option value="confirmed">확정</option>
                <option value="completed">완료</option>
                <option value="canceled">취소</option>
              </>
            )}
            {activeTab === 'bookings' && (
              <>
                <option value="pending">대기</option>
                <option value="confirmed">확정</option>
                <option value="completed">완료</option>
                <option value="canceled">취소</option>
              </>
            )}
          </select>
        </div>
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
                {filteredPackages.length === 0 ? (
                  <div className="empty-state">
                    <Info size={48} />
                    <p>패키지가 없습니다.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>코드</th>
                          <th>패키지명</th>
                          <th>위치</th>
                          <th>기간</th>
                          <th>가격</th>
                          <th>일정/예약</th>
                          <th>상태</th>
                          <th>작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPackages.map((pkg) => (
                          <tr key={pkg.id}>
                            <td className="text-sm font-mono">{pkg.package_code}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                <img
                                  src={pkg.thumbnail_url || '/placeholder-tour.jpg'}
                                  alt={pkg.package_name}
                                  className="thumbnail"
                                />
                                <div>
                                  <div className="font-semibold">{pkg.package_name}</div>
                                  <div className="text-sm text-gray-500">{pkg.listing_title}</div>
                                </div>
                              </div>
                            </td>
                            <td>{pkg.location}</td>
                            <td>
                              {pkg.duration_days}일 {pkg.duration_nights}박
                            </td>
                            <td>{pkg.price_adult_krw.toLocaleString()}원</td>
                            <td>
                              {pkg.schedule_count}개 / {pkg.total_bookings || 0}명
                            </td>
                            <td>
                              {pkg.is_active ? (
                                <span className="badge badge-success">활성</span>
                              ) : (
                                <span className="badge badge-inactive">비활성</span>
                              )}
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  onClick={() => togglePackageActive(pkg.id, pkg.is_active)}
                                  className="btn-icon"
                                  title={pkg.is_active ? '비활성화' : '활성화'}
                                >
                                  {pkg.is_active ? <X size={16} /> : <Check size={16} />}
                                </button>
                                <button
                                  onClick={() => deletePackage(pkg.id)}
                                  className="btn-icon btn-danger"
                                  title="삭제"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 일정 관리 탭 */}
            {activeTab === 'schedules' && (
              <div className="schedules-list">
                {filteredSchedules.length === 0 ? (
                  <div className="empty-state">
                    <Info size={48} />
                    <p>일정이 없습니다.</p>
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
                          <th>작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSchedules.map((schedule) => (
                          <tr key={schedule.id}>
                            <td>{schedule.package_name}</td>
                            <td>
                              {schedule.departure_date} {schedule.departure_time}
                            </td>
                            <td>{schedule.guide_name || '-'}</td>
                            <td>
                              <span className={schedule.current_participants >= schedule.max_participants ? 'text-red-600 font-bold' : ''}>
                                {schedule.current_participants}
                              </span>
                              {' / '}
                              {schedule.max_participants}
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
                            <td>
                              <div className="action-buttons">
                                <button
                                  onClick={() => deleteSchedule(schedule.id)}
                                  className="btn-icon btn-danger"
                                  title="삭제"
                                  disabled={schedule.current_participants > 0}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
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
                {filteredBookings.length === 0 ? (
                  <div className="empty-state">
                    <Info size={48} />
                    <p>예약이 없습니다.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>투어명</th>
                          <th>출발일시</th>
                          <th>예약자</th>
                          <th>인원</th>
                          <th>금액</th>
                          <th>예약일</th>
                          <th>상태</th>
                          <th>작업</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.map((booking) => (
                          <tr key={booking.id}>
                            <td>{booking.package_name}</td>
                            <td>
                              {booking.departure_date} {booking.departure_time}
                            </td>
                            <td>
                              <div>
                                <div className="font-semibold">{booking.username}</div>
                                <div className="text-xs text-gray-500">{booking.user_email}</div>
                                <div className="text-xs text-gray-500">{booking.user_phone}</div>
                              </div>
                            </td>
                            <td>
                              성인 {booking.adult_count}
                              {booking.child_count > 0 && `, 아동 ${booking.child_count}`}
                              {booking.infant_count > 0 && `, 유아 ${booking.infant_count}`}
                            </td>
                            <td className="font-semibold">
                              {booking.total_price_krw.toLocaleString()}원
                            </td>
                            <td className="text-sm">
                              {new Date(booking.created_at).toLocaleDateString()}
                            </td>
                            <td>
                              {booking.status === 'pending' && (
                                <span className="badge badge-warning">대기</span>
                              )}
                              {booking.status === 'confirmed' && (
                                <span className="badge badge-success">확정</span>
                              )}
                              {booking.status === 'completed' && (
                                <span className="badge badge-secondary">완료</span>
                              )}
                              {booking.status === 'canceled' && (
                                <span className="badge badge-danger">취소</span>
                              )}
                            </td>
                            <td>
                              <div className="action-buttons">
                                {booking.status === 'pending' && (
                                  <button
                                    onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                    className="btn-sm btn-success"
                                  >
                                    확정
                                  </button>
                                )}
                                {booking.status === 'confirmed' && (
                                  <button
                                    onClick={() => cancelBooking(booking.id)}
                                    className="btn-sm btn-danger"
                                  >
                                    취소
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .tour-management {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .management-header {
          margin-bottom: 30px;
        }

        .management-header h2 {
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

        .stat-sub {
          font-size: 12px;
          color: #9ca3af;
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

        .filters {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .search-box, .filter-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          padding: 10px 16px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .search-box {
          flex: 1;
        }

        .search-box input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
        }

        .filter-box select {
          border: none;
          outline: none;
          font-size: 14px;
          cursor: pointer;
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
          font-size: 14px;
        }

        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }

        .data-table tr:hover {
          background: #f9fafb;
        }

        .thumbnail {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 6px;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          background: #f3f4f6;
          border: none;
          padding: 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: #e5e7eb;
        }

        .btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn-danger:hover {
          background: #fecaca;
        }

        .btn-sm {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-success {
          background: #dcfce7;
          color: #166534;
        }

        .btn-success:hover {
          background: #bbf7d0;
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

        .text-xs {
          font-size: 11px;
        }

        .text-gray-500 {
          color: #6b7280;
        }

        .text-gray-600 {
          color: #4b5563;
        }

        .text-red-600 {
          color: #dc2626;
        }

        .font-semibold {
          font-weight: 600;
        }

        .font-bold {
          font-weight: 700;
        }

        .font-mono {
          font-family: monospace;
        }

        .flex {
          display: flex;
        }

        .items-center {
          align-items: center;
        }

        .gap-2 {
          gap: 8px;
        }
      `}</style>
    </div>
  );
};

export default TourManagement;
