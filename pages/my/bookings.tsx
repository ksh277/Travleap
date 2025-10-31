import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Calendar, MapPin, Users, Clock, CreditCard, CheckCircle, XCircle, AlertCircle, Car, Fuel, Settings, Bed, Coffee } from 'lucide-react';

interface TourBooking {
  id: number;
  booking_number: string;
  package_name: string;
  thumbnail_url: string;
  duration_days: number;
  duration_nights: number;
  departure_date: string;
  departure_time: string;
  location: string;
  guide_name: string;
  adult_count: number;
  child_count: number;
  infant_count: number;
  total_price_krw: number;
  status: string;
  payment_status: string;
  voucher_code: string;
  created_at: string;
}

interface RentcarBooking {
  id: number;
  booking_number: string;
  confirmation_code: string;
  vehicle: {
    brand: string;
    model: string;
    display_name: string;
    vehicle_class: string;
    thumbnail_url: string;
    seating_capacity: number;
    transmission: string;
    fuel_type: string;
  };
  vendor_name: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  total_days: number;
  daily_rate_krw: number;
  insurance_fee_krw: number;
  additional_fees_krw: number;
  total_price_krw: number;
  status: string;
  payment_status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  created_at: string;
}

interface AccommodationBooking {
  id: number;
  booking_number: string;
  listing: {
    id: number;
    name: string;
    room_type: string;
    bed_type: string;
    thumbnail_url: string;
    images: string[];
    city: string;
    address: string;
    capacity: number;
    wifi_available: boolean;
    breakfast_included: boolean;
  };
  vendor_name: string;
  vendor_logo: string;
  checkin_date: string;
  checkout_date: string;
  check_in_time: string;
  check_out_time: string;
  nights: number;
  guest_count: number;
  total_price: number;
  status: string;
  payment_status: string;
  special_requests: string;
  customer_info: any;
  created_at: string;
}

const MyBookingsPage = () => {
  const [categoryTab, setCategoryTab] = useState<'tour' | 'rentcar' | 'accommodation'>('tour');
  const [tourBookings, setTourBookings] = useState<TourBooking[]>([]);
  const [rentcarBookings, setRentcarBookings] = useState<RentcarBooking[]>([]);
  const [accommodationBookings, setAccommodationBookings] = useState<AccommodationBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // TODO: 실제 사용자 ID는 인증 컨텍스트에서 가져와야 함
  const userId = 1; // 임시

  useEffect(() => {
    loadAllBookings();
  }, []);

  const loadAllBookings = async () => {
    setLoading(true);
    try {
      // 투어 예약 로드
      const tourResponse = await fetch(`/api/tour/bookings?user_id=${userId}`);
      const tourData = await tourResponse.json();
      if (tourData.success) {
        setTourBookings(tourData.bookings || []);
      }

      // 렌트카 예약 로드
      const rentcarResponse = await fetch(`/api/rentcar/bookings?user_id=${userId}`);
      const rentcarData = await rentcarResponse.json();
      if (rentcarData.success) {
        setRentcarBookings(rentcarData.bookings || []);
      }

      // 숙박 예약 로드
      const accommodationResponse = await fetch(`/api/accommodation/bookings?user_id=${userId}`);
      const accommodationData = await accommodationResponse.json();
      if (accommodationData.success) {
        setAccommodationBookings(accommodationData.bookings || []);
      }
    } catch (error) {
      console.error('예약 내역 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      pending: { label: '대기중', color: '#f59e0b', icon: AlertCircle },
      confirmed: { label: '확정', color: '#10b981', icon: CheckCircle },
      completed: { label: '완료', color: '#6b7280', icon: CheckCircle },
      canceled: { label: '취소', color: '#ef4444', icon: XCircle },
      no_show: { label: '노쇼', color: '#ef4444', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className="status-badge" style={{ color: config.color, borderColor: config.color }}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const currentBookings = categoryTab === 'tour' ? tourBookings : categoryTab === 'rentcar' ? rentcarBookings : accommodationBookings;
  const filteredBookings = currentBookings.filter(booking => {
    if (filterStatus === 'all') return true;
    return booking.status === filterStatus;
  });

  const getFuelTypeLabel = (fuelType: string) => {
    const fuelMap: Record<string, string> = {
      'gasoline': '휘발유',
      'diesel': '경유',
      'hybrid': '하이브리드',
      'electric': '전기',
      'lpg': 'LPG'
    };
    return fuelMap[fuelType] || fuelType;
  };

  const getTransmissionLabel = (transmission: string) => {
    return transmission === 'automatic' ? '자동' : '수동';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>예약 내역을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>내 예약 - Travleap</title>
        <meta name="description" content="내 예약 내역" />
      </Head>

      <div className="bookings-page">
        <div className="container">
          <div className="page-header">
            <h1>내 예약</h1>
            <p>예약 내역을 확인하세요</p>
          </div>

          {/* 카테고리 탭 */}
          <div className="category-tabs">
            <button
              className={`category-tab ${categoryTab === 'tour' ? 'active' : ''}`}
              onClick={() => { setCategoryTab('tour'); setFilterStatus('all'); }}
            >
              투어 ({tourBookings.length})
            </button>
            <button
              className={`category-tab ${categoryTab === 'rentcar' ? 'active' : ''}`}
              onClick={() => { setCategoryTab('rentcar'); setFilterStatus('all'); }}
            >
              렌트카 ({rentcarBookings.length})
            </button>
            <button
              className={`category-tab ${categoryTab === 'accommodation' ? 'active' : ''}`}
              onClick={() => { setCategoryTab('accommodation'); setFilterStatus('all'); }}
            >
              숙박 ({accommodationBookings.length})
            </button>
          </div>

          {/* 상태 필터 탭 */}
          <div className="filter-tabs">
            <button
              className={`tab ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              전체 ({currentBookings.length})
            </button>
            <button
              className={`tab ${filterStatus === 'confirmed' ? 'active' : ''}`}
              onClick={() => setFilterStatus('confirmed')}
            >
              확정 ({currentBookings.filter(b => b.status === 'confirmed').length})
            </button>
            <button
              className={`tab ${filterStatus === 'pending' ? 'active' : ''}`}
              onClick={() => setFilterStatus('pending')}
            >
              대기 ({currentBookings.filter(b => b.status === 'pending').length})
            </button>
            <button
              className={`tab ${filterStatus === 'canceled' ? 'active' : ''}`}
              onClick={() => setFilterStatus('canceled')}
            >
              취소 ({currentBookings.filter(b => b.status === 'canceled').length})
            </button>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="empty-state">
              <p>예약 내역이 없습니다.</p>
              <Link href={categoryTab === 'tour' ? '/tour' : categoryTab === 'rentcar' ? '/rentcar' : '/accommodation'}>
                <a className="browse-button">
                  {categoryTab === 'tour' ? '투어 둘러보기' : categoryTab === 'rentcar' ? '렌트카 둘러보기' : '숙박 둘러보기'}
                </a>
              </Link>
            </div>
          ) : (
            <div className="bookings-list">
              {categoryTab === 'tour' && filteredBookings.map((booking: any) => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-header">
                    <div className="booking-number">
                      예약번호: {booking.booking_number}
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="booking-content">
                    <div className="booking-image">
                      <img
                        src={booking.thumbnail_url || '/placeholder-tour.jpg'}
                        alt={booking.package_name}
                      />
                      <div className="duration-badge">
                        {booking.duration_days}일 {booking.duration_nights}박
                      </div>
                    </div>

                    <div className="booking-info">
                      <h3>{booking.package_name}</h3>

                      <div className="info-grid">
                        <div className="info-item">
                          <MapPin size={16} />
                          <span>{booking.location}</span>
                        </div>
                        <div className="info-item">
                          <Calendar size={16} />
                          <span>{booking.departure_date} {booking.departure_time}</span>
                        </div>
                        <div className="info-item">
                          <Users size={16} />
                          <span>
                            성인 {booking.adult_count}명
                            {booking.child_count > 0 && `, 아동 ${booking.child_count}명`}
                            {booking.infant_count > 0 && `, 유아 ${booking.infant_count}명`}
                          </span>
                        </div>
                        {booking.guide_name && (
                          <div className="info-item">
                            <span>가이드: {booking.guide_name}</span>
                          </div>
                        )}
                      </div>

                      {booking.voucher_code && (
                        <div className="voucher-box">
                          <strong>바우처 코드:</strong>
                          <code>{booking.voucher_code}</code>
                        </div>
                      )}
                    </div>

                    <div className="booking-actions">
                      <div className="price-box">
                        <span className="price-label">총 결제금액</span>
                        <span className="price-value">
                          {booking.total_price_krw.toLocaleString()}원
                        </span>
                        <span className={`payment-status ${booking.payment_status}`}>
                          {booking.payment_status === 'paid' ? '결제완료' :
                           booking.payment_status === 'refunded' ? '환불완료' : '결제대기'}
                        </span>
                      </div>

                      {booking.status === 'confirmed' && (
                        <div className="action-buttons">
                          <button className="btn-secondary">예약 변경</button>
                          <button className="btn-danger">예약 취소</button>
                        </div>
                      )}

                      {booking.status === 'completed' && (
                        <button className="btn-primary">리뷰 작성</button>
                      )}
                    </div>
                  </div>

                  <div className="booking-footer">
                    <span className="booking-date">
                      예약일: {new Date(booking.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}

              {categoryTab === 'rentcar' && filteredBookings.map((booking: any) => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-header">
                    <div className="booking-number">
                      예약번호: {booking.booking_number}
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="booking-content">
                    <div className="booking-image">
                      <img
                        src={booking.vehicle.thumbnail_url || '/placeholder-car.jpg'}
                        alt={booking.vehicle.display_name}
                      />
                      <div className="duration-badge">
                        {booking.total_days}일
                      </div>
                    </div>

                    <div className="booking-info">
                      <h3>{booking.vehicle.display_name || `${booking.vehicle.brand} ${booking.vehicle.model}`}</h3>
                      {booking.vendor_name && (
                        <p className="vendor-name">{booking.vendor_name}</p>
                      )}

                      <div className="info-grid">
                        <div className="info-item">
                          <Car size={16} />
                          <span>{booking.vehicle.vehicle_class}</span>
                        </div>
                        <div className="info-item">
                          <Users size={16} />
                          <span>{booking.vehicle.seating_capacity}인승</span>
                        </div>
                        <div className="info-item">
                          <Fuel size={16} />
                          <span>{getFuelTypeLabel(booking.vehicle.fuel_type)}</span>
                        </div>
                        <div className="info-item">
                          <Settings size={16} />
                          <span>{getTransmissionLabel(booking.vehicle.transmission)}</span>
                        </div>
                        <div className="info-item">
                          <Calendar size={16} />
                          <span>대여: {new Date(booking.pickup_datetime).toLocaleDateString()}</span>
                        </div>
                        <div className="info-item">
                          <Calendar size={16} />
                          <span>반납: {new Date(booking.dropoff_datetime).toLocaleDateString()}</span>
                        </div>
                        {booking.pickup_location && (
                          <div className="info-item">
                            <MapPin size={16} />
                            <span>픽업: {booking.pickup_location}</span>
                          </div>
                        )}
                        {booking.dropoff_location && (
                          <div className="info-item">
                            <MapPin size={16} />
                            <span>반납: {booking.dropoff_location}</span>
                          </div>
                        )}
                      </div>

                      {booking.confirmation_code && (
                        <div className="voucher-box">
                          <strong>확인 코드:</strong>
                          <code>{booking.confirmation_code}</code>
                        </div>
                      )}
                    </div>

                    <div className="booking-actions">
                      <div className="price-box">
                        <span className="price-label">총 결제금액</span>
                        <span className="price-value">
                          {booking.total_price_krw.toLocaleString()}원
                        </span>
                        <div className="price-breakdown">
                          <span>기본: {(booking.daily_rate_krw * booking.total_days).toLocaleString()}원</span>
                          {booking.insurance_fee_krw > 0 && (
                            <span>보험: {booking.insurance_fee_krw.toLocaleString()}원</span>
                          )}
                        </div>
                        <span className={`payment-status ${booking.payment_status}`}>
                          {booking.payment_status === 'paid' ? '결제완료' :
                           booking.payment_status === 'refunded' ? '환불완료' : '결제대기'}
                        </span>
                      </div>

                      {booking.status === 'confirmed' && (
                        <div className="action-buttons">
                          <button className="btn-secondary">예약 변경</button>
                          <button className="btn-danger">예약 취소</button>
                        </div>
                      )}

                      {booking.status === 'completed' && (
                        <button className="btn-primary">리뷰 작성</button>
                      )}
                    </div>
                  </div>

                  <div className="booking-footer">
                    <span className="booking-date">
                      예약일: {new Date(booking.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}

              {categoryTab === 'accommodation' && filteredBookings.map((booking: any) => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-header">
                    <div className="booking-number">
                      예약번호: {booking.booking_number}
                    </div>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="booking-content">
                    <div className="booking-image">
                      <img
                        src={booking.listing.thumbnail_url || (booking.listing.images && booking.listing.images[0]) || '/placeholder-room.jpg'}
                        alt={booking.listing.name}
                      />
                      <div className="duration-badge">
                        {booking.nights}박
                      </div>
                    </div>

                    <div className="booking-info">
                      <h3>{booking.listing.name}</h3>
                      {booking.vendor_name && (
                        <p className="vendor-name">{booking.vendor_name}</p>
                      )}

                      <div className="info-grid">
                        {booking.listing.room_type && (
                          <div className="info-item">
                            <Bed size={16} />
                            <span>{booking.listing.room_type}</span>
                          </div>
                        )}
                        {booking.listing.bed_type && (
                          <div className="info-item">
                            <span>{booking.listing.bed_type}</span>
                          </div>
                        )}
                        <div className="info-item">
                          <Users size={16} />
                          <span>투숙 {booking.guest_count}명</span>
                        </div>
                        <div className="info-item">
                          <Calendar size={16} />
                          <span>체크인: {new Date(booking.checkin_date).toLocaleDateString()}</span>
                        </div>
                        <div className="info-item">
                          <Calendar size={16} />
                          <span>체크아웃: {new Date(booking.checkout_date).toLocaleDateString()}</span>
                        </div>
                        {booking.check_in_time && (
                          <div className="info-item">
                            <Clock size={16} />
                            <span>체크인: {booking.check_in_time}</span>
                          </div>
                        )}
                        {booking.check_out_time && (
                          <div className="info-item">
                            <Clock size={16} />
                            <span>체크아웃: {booking.check_out_time}</span>
                          </div>
                        )}
                        {booking.listing.city && (
                          <div className="info-item">
                            <MapPin size={16} />
                            <span>{booking.listing.city}</span>
                          </div>
                        )}
                        {booking.listing.wifi_available && (
                          <div className="info-item">
                            <span>📶 WiFi</span>
                          </div>
                        )}
                        {booking.listing.breakfast_included && (
                          <div className="info-item">
                            <Coffee size={16} />
                            <span>조식 포함</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="booking-actions">
                      <div className="price-box">
                        <span className="price-label">총 결제금액</span>
                        <span className="price-value">
                          {booking.total_price.toLocaleString()}원
                        </span>
                        <div className="price-breakdown">
                          <span>{booking.nights}박</span>
                        </div>
                        <span className={`payment-status ${booking.payment_status}`}>
                          {booking.payment_status === 'paid' ? '결제완료' :
                           booking.payment_status === 'refunded' ? '환불완료' : '결제대기'}
                        </span>
                      </div>

                      {booking.status === 'confirmed' && (
                        <div className="action-buttons">
                          <button className="btn-secondary">예약 변경</button>
                          <button className="btn-danger">예약 취소</button>
                        </div>
                      )}

                      {booking.status === 'completed' && (
                        <button className="btn-primary">리뷰 작성</button>
                      )}
                    </div>
                  </div>

                  <div className="booking-footer">
                    <span className="booking-date">
                      예약일: {new Date(booking.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <style jsx>{`
          .bookings-page {
            min-height: 100vh;
            background: #f9fafb;
            padding: 40px 20px;
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
          }

          .loading-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
          }

          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .page-header {
            margin-bottom: 24px;
          }

          .page-header h1 {
            font-size: 32px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 8px;
          }

          .page-header p {
            font-size: 16px;
            color: #6b7280;
          }

          .category-tabs {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
          }

          .category-tab {
            padding: 12px 24px;
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.2s;
          }

          .category-tab:hover {
            border-color: #3b82f6;
            color: #3b82f6;
          }

          .category-tab.active {
            background: #3b82f6;
            border-color: #3b82f6;
            color: white;
          }

          .filter-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
          }

          .tab {
            padding: 10px 20px;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            font-size: 15px;
            font-weight: 600;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.2s;
          }

          .tab:hover {
            color: #3b82f6;
          }

          .tab.active {
            color: #3b82f6;
            border-bottom-color: #3b82f6;
          }

          .empty-state {
            text-align: center;
            padding: 80px 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .empty-state p {
            font-size: 18px;
            color: #6b7280;
            margin-bottom: 24px;
          }

          .browse-button {
            display: inline-block;
            padding: 12px 32px;
            background: #3b82f6;
            color: white;
            border-radius: 8px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s;
          }

          .browse-button:hover {
            background: #2563eb;
          }

          .bookings-list {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .booking-card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }

          .booking-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: #f9fafb;
            border-bottom: 1px solid #e5e7eb;
          }

          .booking-number {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
          }

          .status-badge {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            border: 1.5px solid;
          }

          .booking-content {
            display: grid;
            grid-template-columns: 200px 1fr auto;
            gap: 20px;
            padding: 20px;
          }

          .booking-image {
            position: relative;
            width: 200px;
            height: 150px;
            border-radius: 8px;
            overflow: hidden;
          }

          .booking-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .duration-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(59, 130, 246, 0.95);
            color: white;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }

          .booking-info {
            flex: 1;
          }

          .booking-info h3 {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
          }

          .vendor-name {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 12px;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin-bottom: 16px;
          }

          .info-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #374151;
          }

          .voucher-box {
            background: #eff6ff;
            padding: 12px;
            border-radius: 6px;
            border-left: 4px solid #3b82f6;
          }

          .voucher-box strong {
            display: block;
            font-size: 13px;
            color: #374151;
            margin-bottom: 4px;
          }

          .voucher-box code {
            display: block;
            font-size: 20px;
            font-weight: 700;
            color: #1e40af;
            letter-spacing: 2px;
          }

          .booking-actions {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: flex-end;
            gap: 16px;
          }

          .price-box {
            text-align: right;
          }

          .price-label {
            display: block;
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 4px;
          }

          .price-value {
            display: block;
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
          }

          .price-breakdown {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 8px;
            font-size: 12px;
            color: #6b7280;
          }

          .payment-status {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }

          .payment-status.paid {
            background: #dcfce7;
            color: #166534;
          }

          .payment-status.pending {
            background: #fef3c7;
            color: #92400e;
          }

          .payment-status.refunded {
            background: #f3f4f6;
            color: #6b7280;
          }

          .action-buttons {
            display: flex;
            gap: 8px;
          }

          .btn-primary,
          .btn-secondary,
          .btn-danger {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .btn-primary {
            background: #3b82f6;
            color: white;
          }

          .btn-primary:hover {
            background: #2563eb;
          }

          .btn-secondary {
            background: #f3f4f6;
            color: #374151;
          }

          .btn-secondary:hover {
            background: #e5e7eb;
          }

          .btn-danger {
            background: #fee2e2;
            color: #991b1b;
          }

          .btn-danger:hover {
            background: #fecaca;
          }

          .booking-footer {
            padding: 12px 20px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
          }

          .booking-date {
            font-size: 13px;
            color: #6b7280;
          }

          @media (max-width: 968px) {
            .booking-content {
              grid-template-columns: 1fr;
            }

            .booking-image {
              width: 100%;
            }

            .booking-actions {
              align-items: stretch;
            }

            .price-box {
              text-align: left;
            }

            .action-buttons {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default MyBookingsPage;
