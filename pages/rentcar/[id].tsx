import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Car, Users, Fuel, Settings, Calendar, MapPin,
  Star, Shield, Check, X, Loader, ChevronLeft, ChevronRight
} from 'lucide-react';

interface Vehicle {
  id: number;
  brand: string;
  model: string;
  year: number;
  display_name: string;
  vehicle_class: string;
  fuel_type: string;
  transmission: string;
  seating_capacity: number;
  door_count: number;
  large_bags: number;
  small_bags: number;
  images: string[];
  fuel_efficiency_kmpl: number;
  unlimited_mileage: boolean;
  deposit_amount_krw: number;
  standard_features: string[];
  optional_features: string[];
  description: string;
  vendor_name: string;
  vendor_rating: number;
  total_bookings: number;
}

const RentcarDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 예약 폼 상태
  const [pickupDate, setPickupDate] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [selectedInsurance, setSelectedInsurance] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // TODO: 실제 사용자 ID는 인증 컨텍스트에서 가져와야 함
  const userId = 1;

  useEffect(() => {
    if (id) {
      loadVehicle();
    }
  }, [id]);

  const loadVehicle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rentcar/vehicles?id=${id}`);
      const data = await response.json();

      if (data.success) {
        setVehicle(data.vehicle);
      }
    } catch (error) {
      console.error('차량 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVehicleClassLabel = (vehicleClass: string) => {
    const classMap: Record<string, string> = {
      'economy': '경차',
      'compact': '소형',
      'midsize': '중형',
      'fullsize': '대형',
      'suv': 'SUV',
      'van': '승합',
      'luxury': '럭셔리',
      'sports': '스포츠'
    };
    return classMap[vehicleClass] || vehicleClass;
  };

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

  const calculateDays = () => {
    if (!pickupDate || !dropoffDate) return 0;
    const pickup = new Date(pickupDate);
    const dropoff = new Date(dropoffDate);
    const days = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const calculateTotalPrice = () => {
    const days = calculateDays();
    if (days === 0) return 0;
    const dailyRate = vehicle?.deposit_amount_krw || 50000;
    return dailyRate * days;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pickupDate || !dropoffDate) {
      alert('대여일과 반납일을 선택해주세요.');
      return;
    }

    if (calculateDays() <= 0) {
      alert('반납일은 대여일보다 이후여야 합니다.');
      return;
    }

    if (!customerName || !customerEmail || !customerPhone || !driverLicense) {
      alert('모든 필수 정보를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/rentcar/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          vehicle_id: vehicle?.id,
          pickup_datetime: `${pickupDate}T10:00:00`,
          dropoff_datetime: `${dropoffDate}T10:00:00`,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_driver_license: driverLicense,
          selected_insurance_ids: selectedInsurance,
          special_requests: specialRequests
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`예약이 완료되었습니다!\n예약번호: ${data.booking.booking_number}\n확인코드: ${data.booking.confirmation_code}`);
        router.push('/my/bookings');
      } else {
        alert(`예약 실패: ${data.error}`);
      }
    } catch (error) {
      console.error('예약 실패:', error);
      alert('예약 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const nextImage = () => {
    if (vehicle && vehicle.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % vehicle.images.length);
    }
  };

  const prevImage = () => {
    if (vehicle && vehicle.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + vehicle.images.length) % vehicle.images.length);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader className="spinner" size={48} />
        <p>차량 정보를 불러오는 중...</p>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
          }
          .spinner {
            animation: spin 1s linear infinite;
            color: #3b82f6;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="error-container">
        <p>차량을 찾을 수 없습니다.</p>
        <button onClick={() => router.push('/rentcar')}>목록으로 돌아가기</button>
        <style jsx>{`
          .error-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
            padding: 20px;
          }
          button {
            padding: 12px 32px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  const vehicleName = vehicle.display_name || `${vehicle.brand} ${vehicle.model}`;
  const days = calculateDays();
  const totalPrice = calculateTotalPrice();

  return (
    <>
      <Head>
        <title>{vehicleName} - Travleap 렌트카</title>
        <meta name="description" content={vehicle.description} />
      </Head>

      <div className="vehicle-detail-page">
        <div className="container">
          <div className="main-content">
            {/* 이미지 갤러리 */}
            <div className="image-gallery">
              {vehicle.images && vehicle.images.length > 0 ? (
                <>
                  <div className="main-image">
                    <img src={vehicle.images[currentImageIndex]} alt={vehicleName} />
                    {vehicle.images.length > 1 && (
                      <>
                        <button className="nav-button prev" onClick={prevImage}>
                          <ChevronLeft size={24} />
                        </button>
                        <button className="nav-button next" onClick={nextImage}>
                          <ChevronRight size={24} />
                        </button>
                      </>
                    )}
                  </div>
                  {vehicle.images.length > 1 && (
                    <div className="thumbnail-list">
                      {vehicle.images.map((img, index) => (
                        <img
                          key={index}
                          src={img}
                          alt={`${vehicleName} ${index + 1}`}
                          className={index === currentImageIndex ? 'active' : ''}
                          onClick={() => setCurrentImageIndex(index)}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="main-image">
                  <img src={vehicle.thumbnail_url || '/placeholder-car.jpg'} alt={vehicleName} />
                </div>
              )}
            </div>

            {/* 차량 정보 */}
            <div className="vehicle-info">
              <div className="info-header">
                <div>
                  <span className="vehicle-class">{getVehicleClassLabel(vehicle.vehicle_class)}</span>
                  <h1>{vehicleName}</h1>
                  {vehicle.year && <p className="year">{vehicle.year}년형</p>}
                  {vehicle.vendor_name && (
                    <div className="vendor-info">
                      <span>{vehicle.vendor_name}</span>
                      {vehicle.vendor_rating && (
                        <div className="rating">
                          <Star size={16} fill="#fbbf24" color="#fbbf24" />
                          <span>{vehicle.vendor_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {vehicle.description && (
                <div className="description">
                  <p>{vehicle.description}</p>
                </div>
              )}

              {/* 차량 스펙 */}
              <div className="specs-section">
                <h3>차량 사양</h3>
                <div className="specs-grid">
                  <div className="spec-item">
                    <Users size={20} />
                    <div>
                      <span className="spec-label">승차 인원</span>
                      <span className="spec-value">{vehicle.seating_capacity}인승</span>
                    </div>
                  </div>
                  <div className="spec-item">
                    <Fuel size={20} />
                    <div>
                      <span className="spec-label">연료</span>
                      <span className="spec-value">{getFuelTypeLabel(vehicle.fuel_type)}</span>
                    </div>
                  </div>
                  <div className="spec-item">
                    <Settings size={20} />
                    <div>
                      <span className="spec-label">변속기</span>
                      <span className="spec-value">{getTransmissionLabel(vehicle.transmission)}</span>
                    </div>
                  </div>
                  <div className="spec-item">
                    <Car size={20} />
                    <div>
                      <span className="spec-label">문 개수</span>
                      <span className="spec-value">{vehicle.door_count}도어</span>
                    </div>
                  </div>
                </div>

                <div className="additional-specs">
                  {vehicle.fuel_efficiency_kmpl && (
                    <div className="spec-badge">
                      연비: {vehicle.fuel_efficiency_kmpl}km/L
                    </div>
                  )}
                  {vehicle.unlimited_mileage && (
                    <div className="spec-badge highlight">
                      무제한 주행
                    </div>
                  )}
                  {vehicle.large_bags > 0 && (
                    <div className="spec-badge">
                      큰 가방 {vehicle.large_bags}개
                    </div>
                  )}
                  {vehicle.small_bags > 0 && (
                    <div className="spec-badge">
                      작은 가방 {vehicle.small_bags}개
                    </div>
                  )}
                </div>
              </div>

              {/* 기본 포함 사항 */}
              {vehicle.standard_features && vehicle.standard_features.length > 0 && (
                <div className="features-section">
                  <h3>기본 포함 사항</h3>
                  <div className="features-list">
                    {vehicle.standard_features.map((feature, index) => (
                      <div key={index} className="feature-item">
                        <Check size={18} color="#10b981" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 옵션 사항 */}
              {vehicle.optional_features && vehicle.optional_features.length > 0 && (
                <div className="features-section">
                  <h3>선택 가능 옵션</h3>
                  <div className="features-list">
                    {vehicle.optional_features.map((feature, index) => (
                      <div key={index} className="feature-item optional">
                        <Shield size={18} color="#3b82f6" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 예약 사이드바 */}
          <div className="booking-sidebar">
            <div className="price-box">
              <div className="price-row">
                <span className="price-label">1일 기본 요금</span>
                <span className="price-value">
                  {vehicle.deposit_amount_krw.toLocaleString()}원
                </span>
              </div>
              {vehicle.total_bookings > 0 && (
                <p className="booking-count">누적 예약 {vehicle.total_bookings}건</p>
              )}
            </div>

            <form onSubmit={handleBooking} className="booking-form">
              <h3>예약하기</h3>

              <div className="form-group">
                <label>대여일 *</label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>반납일 *</label>
                <input
                  type="date"
                  value={dropoffDate}
                  onChange={(e) => setDropoffDate(e.target.value)}
                  required
                  min={pickupDate || new Date().toISOString().split('T')[0]}
                />
              </div>

              {days > 0 && (
                <div className="rental-summary">
                  <div className="summary-row">
                    <span>대여 기간</span>
                    <span>{days}일</span>
                  </div>
                  <div className="summary-row">
                    <span>1일 요금</span>
                    <span>{vehicle.deposit_amount_krw.toLocaleString()}원</span>
                  </div>
                  <div className="summary-row total">
                    <span>총 금액</span>
                    <span>{totalPrice.toLocaleString()}원</span>
                  </div>
                </div>
              )}

              <div className="divider"></div>

              <div className="form-group">
                <label>이름 *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="예약자 이름"
                  required
                />
              </div>

              <div className="form-group">
                <label>이메일 *</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>전화번호 *</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  required
                />
              </div>

              <div className="form-group">
                <label>운전면허번호 *</label>
                <input
                  type="text"
                  value={driverLicense}
                  onChange={(e) => setDriverLicense(e.target.value)}
                  placeholder="12-34-567890-12"
                  required
                />
              </div>

              <div className="form-group">
                <label>특별 요청 사항</label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="추가 요청사항을 입력하세요"
                  rows={3}
                />
              </div>

              <button type="submit" className="submit-button" disabled={submitting || days === 0}>
                {submitting ? '예약 중...' : `${totalPrice.toLocaleString()}원 예약하기`}
              </button>
            </form>
          </div>
        </div>

        <style jsx>{`
          .vehicle-detail-page {
            min-height: 100vh;
            background: #f9fafb;
            padding: 40px 20px;
          }

          .container {
            max-width: 1400px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 32px;
          }

          .main-content {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .image-gallery {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .main-image {
            position: relative;
            width: 100%;
            height: 500px;
            background: #f3f4f6;
          }

          .main-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .nav-button {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.9);
            border: none;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
          }

          .nav-button:hover {
            background: white;
          }

          .nav-button.prev {
            left: 16px;
          }

          .nav-button.next {
            right: 16px;
          }

          .thumbnail-list {
            display: flex;
            gap: 8px;
            padding: 16px;
            overflow-x: auto;
          }

          .thumbnail-list img {
            width: 100px;
            height: 80px;
            object-fit: cover;
            border-radius: 8px;
            cursor: pointer;
            opacity: 0.6;
            transition: opacity 0.2s;
          }

          .thumbnail-list img:hover,
          .thumbnail-list img.active {
            opacity: 1;
          }

          .vehicle-info {
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .info-header {
            margin-bottom: 24px;
          }

          .vehicle-class {
            display: inline-block;
            background: #eff6ff;
            color: #1e40af;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 12px;
          }

          .vehicle-info h1 {
            font-size: 32px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 8px;
          }

          .year {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 12px;
          }

          .vendor-info {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            color: #6b7280;
          }

          .rating {
            display: flex;
            align-items: center;
            gap: 4px;
            font-weight: 600;
            color: #111827;
          }

          .description {
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
            margin-bottom: 24px;
          }

          .description p {
            line-height: 1.6;
            color: #374151;
          }

          .specs-section,
          .features-section {
            margin-bottom: 32px;
            padding-bottom: 32px;
            border-bottom: 1px solid #e5e7eb;
          }

          .specs-section:last-child,
          .features-section:last-child {
            border-bottom: none;
          }

          h3 {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 16px;
          }

          .specs-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 16px;
          }

          .spec-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
          }

          .spec-item :global(svg) {
            color: #3b82f6;
            flex-shrink: 0;
          }

          .spec-item div {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .spec-label {
            font-size: 12px;
            color: #6b7280;
          }

          .spec-value {
            font-size: 15px;
            font-weight: 600;
            color: #111827;
          }

          .additional-specs {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .spec-badge {
            padding: 8px 16px;
            background: #f3f4f6;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            color: #374151;
          }

          .spec-badge.highlight {
            background: #dbeafe;
            color: #1e40af;
          }

          .features-list {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .feature-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #374151;
          }

          .booking-sidebar {
            position: sticky;
            top: 20px;
            height: fit-content;
          }

          .price-box {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            margin-bottom: 16px;
          }

          .price-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .price-label {
            font-size: 14px;
            color: #6b7280;
          }

          .price-value {
            font-size: 24px;
            font-weight: 700;
            color: #3b82f6;
          }

          .booking-count {
            margin-top: 8px;
            font-size: 13px;
            color: #6b7280;
          }

          .booking-form {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .booking-form h3 {
            margin-bottom: 20px;
          }

          .form-group {
            margin-bottom: 16px;
          }

          .form-group label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
          }

          .form-group input,
          .form-group textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 14px;
          }

          .form-group input:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: #3b82f6;
          }

          .rental-summary {
            background: #f9fafb;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
          }

          .summary-row:last-child {
            margin-bottom: 0;
          }

          .summary-row.total {
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
            font-size: 16px;
            font-weight: 700;
            color: #111827;
          }

          .divider {
            height: 1px;
            background: #e5e7eb;
            margin: 20px 0;
          }

          .submit-button {
            width: 100%;
            padding: 14px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .submit-button:hover:not(:disabled) {
            background: #2563eb;
          }

          .submit-button:disabled {
            background: #9ca3af;
            cursor: not-allowed;
          }

          @media (max-width: 1200px) {
            .container {
              grid-template-columns: 1fr;
            }

            .booking-sidebar {
              position: static;
            }

            .specs-grid {
              grid-template-columns: 1fr;
            }

            .features-list {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 768px) {
            .vehicle-info h1 {
              font-size: 24px;
            }

            .main-image {
              height: 300px;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default RentcarDetailPage;
