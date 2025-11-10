import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  MapPin, Users, Calendar, Clock, Wifi, Coffee, Car, Tv,
  Wind, Star, Check, X, Loader, ChevronLeft, ChevronRight, Bed
} from 'lucide-react';

interface Accommodation {
  id: number;
  listing_id: number;
  name: string;
  description: string;
  room_type: string;
  bed_type: string;
  bed_count: number;
  size_sqm: number;
  capacity: number;
  base_price_per_night: number;
  weekend_surcharge: number;
  view_type: string;
  has_balcony: boolean;
  breakfast_included: boolean;
  wifi_available: boolean;
  tv_available: boolean;
  minibar_available: boolean;
  air_conditioning: boolean;
  heating: boolean;
  bathroom_type: string;
  city: string;
  address: string;
  images: string[];
  amenities: any;
  min_nights: number;
  max_nights: number;
  vendor_name: string;
  vendor_logo: string;
  check_in_time: string;
  check_out_time: string;
  policies: any;
  total_bookings: number;
}

const AccommodationDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [accommodation, setAccommodation] = useState<Accommodation | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 예약 폼 상태
  const [checkinDate, setCheckinDate] = useState('');
  const [checkoutDate, setCheckoutDate] = useState('');
  const [guestCount, setGuestCount] = useState(2);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadAccommodation();
    }
  }, [id]);

  const loadAccommodation = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/accommodation/listings?id=${id}`);
      const data = await response.json();

      if (data.success) {
        setAccommodation(data.listing);
      }
    } catch (error) {
      console.error('숙박 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoomTypeLabel = (roomType: string) => {
    const typeMap: Record<string, string> = {
      'single': '싱글룸',
      'double': '더블룸',
      'twin': '트윈룸',
      'suite': '스위트룸',
      'family': '패밀리룸',
      'dormitory': '도미토리',
      'camping_site': '캠핑장'
    };
    return typeMap[roomType] || roomType;
  };

  const getBedTypeLabel = (bedType: string) => {
    const typeMap: Record<string, string> = {
      'single': '싱글 베드',
      'double': '더블 베드',
      'queen': '퀸 베드',
      'king': '킹 베드',
      'bunk': '이층 침대',
      'futon': '이불'
    };
    return typeMap[bedType] || bedType;
  };

  const calculateNights = () => {
    if (!checkinDate || !checkoutDate) return 0;
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    const nights = Math.ceil((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 0;
  };

  const calculateTotalPrice = () => {
    const nights = calculateNights();
    if (nights === 0) return 0;
    const basePrice = accommodation?.base_price_per_night || 0;
    // 간단한 가격 계산 (실제로는 주말 할증 등 복잡한 계산 필요)
    return basePrice * nights;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    // 사용자 정보 가져오기
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!currentUser?.id) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    if (!checkinDate || !checkoutDate) {
      alert('체크인/체크아웃 날짜를 선택해주세요.');
      return;
    }

    if (calculateNights() <= 0) {
      alert('체크아웃 날짜는 체크인 날짜보다 이후여야 합니다.');
      return;
    }

    if (!guestName || !guestEmail || !guestPhone) {
      alert('모든 필수 정보를 입력해주세요.');
      return;
    }

    if (accommodation?.min_nights && calculateNights() < accommodation.min_nights) {
      alert(`최소 ${accommodation.min_nights}박 이상 예약 가능합니다.`);
      return;
    }

    if (accommodation?.max_nights && calculateNights() > accommodation.max_nights) {
      alert(`최대 ${accommodation.max_nights}박까지 예약 가능합니다.`);
      return;
    }

    if (guestCount > (accommodation?.capacity || 0)) {
      alert(`최대 ${accommodation?.capacity}명까지 예약 가능합니다.`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/accommodations/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          listing_id: accommodation?.listing_id || accommodation?.id,
          start_date: checkinDate,
          end_date: checkoutDate,
          user_name: guestName,
          user_email: guestEmail,
          user_phone: guestPhone,
          num_adults: guestCount,
          special_requests: specialRequests,
          total_amount: calculateTotalPrice()
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`예약이 완료되었습니다!\n예약번호: ${data.data.booking_number}`);
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
    if (accommodation && accommodation.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % accommodation.images.length);
    }
  };

  const prevImage = () => {
    if (accommodation && accommodation.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + accommodation.images.length) % accommodation.images.length);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader className="spinner" size={48} />
        <p>숙소 정보를 불러오는 중...</p>
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

  if (!accommodation) {
    return (
      <div className="error-container">
        <p>숙소를 찾을 수 없습니다.</p>
        <button onClick={() => router.push('/accommodation')}>목록으로 돌아가기</button>
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

  const nights = calculateNights();
  const totalPrice = calculateTotalPrice();

  return (
    <>
      <Head>
        <title>{accommodation.name} - Travleap 숙박</title>
        <meta name="description" content={accommodation.description} />
      </Head>

      <div className="accommodation-detail-page">
        <div className="container">
          <div className="main-content">
            {/* 이미지 갤러리 */}
            <div className="image-gallery">
              {accommodation.images && accommodation.images.length > 0 ? (
                <>
                  <div className="main-image">
                    <img src={accommodation.images[currentImageIndex]} alt={accommodation.name} />
                    {accommodation.images.length > 1 && (
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
                  {accommodation.images.length > 1 && (
                    <div className="thumbnail-list">
                      {accommodation.images.map((img, index) => (
                        <img
                          key={index}
                          src={img}
                          alt={`${accommodation.name} ${index + 1}`}
                          className={index === currentImageIndex ? 'active' : ''}
                          onClick={() => setCurrentImageIndex(index)}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="main-image">
                  <img src={accommodation.thumbnail_url || '/placeholder-room.jpg'} alt={accommodation.name} />
                </div>
              )}
            </div>

            {/* 숙소 정보 */}
            <div className="accommodation-info">
              <div className="info-header">
                <div>
                  {accommodation.room_type && (
                    <span className="room-type">{getRoomTypeLabel(accommodation.room_type)}</span>
                  )}
                  <h1>{accommodation.name}</h1>
                  {accommodation.vendor_name && (
                    <div className="vendor-info">
                      <span>{accommodation.vendor_name}</span>
                    </div>
                  )}
                  {accommodation.address && (
                    <div className="location-info">
                      <MapPin size={16} />
                      <span>{accommodation.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {accommodation.description && (
                <div className="description">
                  <p>{accommodation.description}</p>
                </div>
              )}

              {/* 객실 스펙 */}
              <div className="specs-section">
                <h3>객실 정보</h3>
                <div className="specs-grid">
                  <div className="spec-item">
                    <Users size={20} />
                    <div>
                      <span className="spec-label">수용 인원</span>
                      <span className="spec-value">최대 {accommodation.capacity}명</span>
                    </div>
                  </div>
                  {accommodation.bed_type && (
                    <div className="spec-item">
                      <Bed size={20} />
                      <div>
                        <span className="spec-label">침대</span>
                        <span className="spec-value">
                          {getBedTypeLabel(accommodation.bed_type)}
                          {accommodation.bed_count > 1 && ` x ${accommodation.bed_count}`}
                        </span>
                      </div>
                    </div>
                  )}
                  {accommodation.size_sqm && (
                    <div className="spec-item">
                      <span>📐</span>
                      <div>
                        <span className="spec-label">객실 크기</span>
                        <span className="spec-value">{accommodation.size_sqm}㎡</span>
                      </div>
                    </div>
                  )}
                  {accommodation.view_type && (
                    <div className="spec-item">
                      <span>🌅</span>
                      <div>
                        <span className="spec-label">전망</span>
                        <span className="spec-value">{accommodation.view_type}</span>
                      </div>
                    </div>
                  )}
                </div>

                {accommodation.bathroom_type && (
                  <div className="additional-info">
                    <strong>욕실:</strong> {accommodation.bathroom_type}
                  </div>
                )}
              </div>

              {/* 편의시설 */}
              <div className="amenities-section">
                <h3>편의시설</h3>
                <div className="amenities-grid">
                  {accommodation.wifi_available && (
                    <div className="amenity-item">
                      <Wifi size={18} />
                      <span>무료 WiFi</span>
                    </div>
                  )}
                  {accommodation.breakfast_included && (
                    <div className="amenity-item">
                      <Coffee size={18} />
                      <span>조식 포함</span>
                    </div>
                  )}
                  {accommodation.tv_available && (
                    <div className="amenity-item">
                      <Tv size={18} />
                      <span>TV</span>
                    </div>
                  )}
                  {accommodation.air_conditioning && (
                    <div className="amenity-item">
                      <Wind size={18} />
                      <span>에어컨</span>
                    </div>
                  )}
                  {accommodation.heating && (
                    <div className="amenity-item">
                      <span>🔥</span>
                      <span>난방</span>
                    </div>
                  )}
                  {accommodation.has_balcony && (
                    <div className="amenity-item">
                      <span>🌅</span>
                      <span>발코니</span>
                    </div>
                  )}
                  {accommodation.minibar_available && (
                    <div className="amenity-item">
                      <span>🍷</span>
                      <span>미니바</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 체크인/체크아웃 정보 */}
              <div className="checkin-section">
                <h3>체크인/체크아웃</h3>
                <div className="time-info">
                  <div className="time-item">
                    <Clock size={18} />
                    <div>
                      <strong>체크인</strong>
                      <span>{accommodation.check_in_time || '15:00'} 이후</span>
                    </div>
                  </div>
                  <div className="time-item">
                    <Clock size={18} />
                    <div>
                      <strong>체크아웃</strong>
                      <span>{accommodation.check_out_time || '11:00'} 이전</span>
                    </div>
                  </div>
                </div>
                {(accommodation.min_nights || accommodation.max_nights) && (
                  <div className="stay-info">
                    {accommodation.min_nights && (
                      <p>• 최소 숙박: {accommodation.min_nights}박</p>
                    )}
                    {accommodation.max_nights && (
                      <p>• 최대 숙박: {accommodation.max_nights}박</p>
                    )}
                  </div>
                )}
              </div>

              {/* 정책 정보 */}
              {accommodation.policies && Object.keys(accommodation.policies).length > 0 && (
                <div className="policies-section">
                  <h3>이용 정책</h3>
                  <div className="policies-content">
                    {accommodation.policies.cancellation && (
                      <div className="policy-item">
                        <strong>취소 정책:</strong>
                        <p>{accommodation.policies.cancellation}</p>
                      </div>
                    )}
                    {accommodation.policies.house_rules && (
                      <div className="policy-item">
                        <strong>하우스 룰:</strong>
                        <p>{accommodation.policies.house_rules}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 예약 사이드바 */}
          <div className="booking-sidebar">
            <div className="price-box">
              <div className="price-row">
                <span className="price-label">1박 기본 요금</span>
                <span className="price-value">
                  {accommodation.base_price_per_night.toLocaleString()}원
                </span>
              </div>
              {accommodation.weekend_surcharge > 0 && (
                <p className="weekend-info">
                  주말 +{accommodation.weekend_surcharge.toLocaleString()}원
                </p>
              )}
              {accommodation.total_bookings > 0 && (
                <p className="booking-count">누적 예약 {accommodation.total_bookings}건</p>
              )}
            </div>

            <form onSubmit={handleBooking} className="booking-form">
              <h3>예약하기</h3>

              <div className="form-group">
                <label>체크인 *</label>
                <input
                  type="date"
                  value={checkinDate}
                  onChange={(e) => setCheckinDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>체크아웃 *</label>
                <input
                  type="date"
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                  required
                  min={checkinDate || new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label>투숙 인원 *</label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(parseInt(e.target.value))}
                  required
                >
                  {[...Array(accommodation.capacity)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}명
                    </option>
                  ))}
                </select>
              </div>

              {nights > 0 && (
                <div className="rental-summary">
                  <div className="summary-row">
                    <span>숙박 기간</span>
                    <span>{nights}박</span>
                  </div>
                  <div className="summary-row">
                    <span>1박 요금</span>
                    <span>{accommodation.base_price_per_night.toLocaleString()}원</span>
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
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="투숙객 이름"
                  required
                />
              </div>

              <div className="form-group">
                <label>이메일 *</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>전화번호 *</label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="010-1234-5678"
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

              <button type="submit" className="submit-button" disabled={submitting || nights === 0}>
                {submitting ? '예약 중...' : `${totalPrice.toLocaleString()}원 예약하기`}
              </button>
            </form>
          </div>
        </div>

        <style jsx>{`
          .accommodation-detail-page {
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

          .accommodation-info {
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .info-header {
            margin-bottom: 24px;
          }

          .room-type {
            display: inline-block;
            background: #eff6ff;
            color: #1e40af;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 12px;
          }

          .accommodation-info h1 {
            font-size: 32px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 12px;
          }

          .vendor-info {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 8px;
          }

          .location-info {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            color: #6b7280;
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
          .amenities-section,
          .checkin-section,
          .policies-section {
            margin-bottom: 32px;
            padding-bottom: 32px;
            border-bottom: 1px solid #e5e7eb;
          }

          .specs-section:last-child,
          .amenities-section:last-child,
          .checkin-section:last-child,
          .policies-section:last-child {
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

          .additional-info {
            font-size: 14px;
            color: #374151;
            padding: 12px;
            background: #f9fafb;
            border-radius: 6px;
          }

          .amenities-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .amenity-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #374151;
          }

          .amenity-item :global(svg) {
            color: #3b82f6;
          }

          .time-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 16px;
          }

          .time-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
          }

          .time-item :global(svg) {
            color: #3b82f6;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .time-item div {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .time-item strong {
            font-size: 14px;
            color: #111827;
          }

          .time-item span {
            font-size: 13px;
            color: #6b7280;
          }

          .stay-info {
            font-size: 13px;
            color: #6b7280;
          }

          .stay-info p {
            margin: 4px 0;
          }

          .policies-content {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .policy-item strong {
            display: block;
            font-size: 14px;
            color: #111827;
            margin-bottom: 8px;
          }

          .policy-item p {
            font-size: 14px;
            color: #374151;
            line-height: 1.6;
            white-space: pre-line;
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

          .weekend-info {
            margin-top: 8px;
            font-size: 12px;
            color: #f59e0b;
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
          .form-group select,
          .form-group textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            font-size: 14px;
          }

          .form-group input:focus,
          .form-group select:focus,
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

            .amenities-grid {
              grid-template-columns: 1fr;
            }

            .time-info {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 768px) {
            .accommodation-info h1 {
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

export default AccommodationDetailPage;
