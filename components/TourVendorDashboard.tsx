import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, DollarSign, MapPin, Info } from 'lucide-react';

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
  status: string;
  payment_status?: string;
  payment_key?: string;
  username: string;
  user_email: string;
  user_phone: string;
  created_at: string;
}

const TourVendorDashboard = ({ vendorId }: { vendorId: number }) => {
  const [activeTab, setActiveTab] = useState<'packages' | 'schedules' | 'bookings'>('packages');
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [schedules, setSchedules] = useState<TourSchedule[]>([]);
  const [bookings, setBookings] = useState<TourBooking[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (activeTab === 'packages') loadPackages();
    else if (activeTab === 'schedules') loadSchedules();
    else if (activeTab === 'bookings') loadBookings();
  }, [activeTab, vendorId]);

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
      <div className="dashboard-header">
        <h2>투어 관리</h2>
        <p className="text-gray-600">내 투어 패키지와 예약을 관리하세요</p>
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
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>투어명</th>
                          <th>출발일시</th>
                          <th>예약자</th>
                          <th>인원</th>
                          <th>금액</th>
                          <th>상태</th>
                          <th>액션</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((booking) => (
                          <tr key={booking.id}>
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
                            <td>{booking.total_price_krw.toLocaleString()}원</td>
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
                  </div>
                )}
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
      `}</style>
    </div>
  );
};

export default TourVendorDashboard;
