import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  MapPin,
  Clock,
  Star,
  Ticket,
  Calendar,
  Phone,
  Globe,
  Accessibility,
  Car,
  Baby,
  Dog,
  ChevronLeft,
  ChevronRight,
  Loader,
  Plus,
  Minus,
  ShoppingCart
} from 'lucide-react';

interface Attraction {
  id: number;
  attraction_code: string;
  name: string;
  description: string;
  type: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  operating_hours: {
    [key: string]: { open: string; close: string };
  };
  last_entry_time: string;
  admission_fee_adult: number;
  admission_fee_child: number;
  admission_fee_senior: number;
  admission_fee_infant: number;
  free_entry_days: string[];
  parking_available: boolean;
  parking_fee: number;
  parking_info: string;
  wheelchair_accessible: boolean;
  stroller_friendly: boolean;
  pet_allowed: boolean;
  thumbnail_url: string;
  images: string[];
  estimated_visit_duration_minutes: number;
  highlights: string[];
  city: string;
  rating_avg: number;
  rating_count: number;
  total_tickets_sold: number;
}

interface TicketQuantity {
  adult: number;
  child: number;
  senior: number;
  infant: number;
}

const AttractionDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [attraction, setAttraction] = useState<Attraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [visitDate, setVisitDate] = useState('');
  const [quantities, setQuantities] = useState<TicketQuantity>({
    adult: 0,
    child: 0,
    senior: 0,
    infant: 0
  });
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (id) {
      loadAttraction();
    }
  }, [id]);

  useEffect(() => {
    // Set default visit date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setVisitDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const loadAttraction = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/attractions/list?id=${id}`);
      const data = await response.json();

      if (data.success && data.attractions && data.attractions.length > 0) {
        setAttraction(data.attractions[0]);
      }
    } catch (error) {
      console.error('관광지 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (type: keyof TicketQuantity, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [type]: Math.max(0, prev[type] + delta)
    }));
  };

  const getTotalTickets = () => {
    return quantities.adult + quantities.child + quantities.senior + quantities.infant;
  };

  const getTotalPrice = () => {
    if (!attraction) return 0;
    return (
      quantities.adult * attraction.admission_fee_adult +
      quantities.child * (attraction.admission_fee_child || 0) +
      quantities.senior * (attraction.admission_fee_senior || 0) +
      quantities.infant * (attraction.admission_fee_infant || 0)
    );
  };

  const handlePurchase = async () => {
    if (!attraction) return;

    const totalTickets = getTotalTickets();
    if (totalTickets === 0) {
      alert('티켓을 선택해주세요.');
      return;
    }

    if (!visitDate) {
      alert('방문 날짜를 선택해주세요.');
      return;
    }

    setPurchasing(true);

    try {
      // Create tickets for each type
      const ticketPromises = [];

      if (quantities.adult > 0) {
        for (let i = 0; i < quantities.adult; i++) {
          ticketPromises.push(
            fetch('/api/attractions/tickets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                attraction_id: attraction.id,
                user_id: 1, // TODO: Replace with actual user ID
                ticket_type: 'adult',
                price_krw: attraction.admission_fee_adult,
                valid_date: visitDate
              })
            })
          );
        }
      }

      if (quantities.child > 0) {
        for (let i = 0; i < quantities.child; i++) {
          ticketPromises.push(
            fetch('/api/attractions/tickets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                attraction_id: attraction.id,
                user_id: 1, // TODO: Replace with actual user ID
                ticket_type: 'child',
                price_krw: attraction.admission_fee_child,
                valid_date: visitDate
              })
            })
          );
        }
      }

      if (quantities.senior > 0) {
        for (let i = 0; i < quantities.senior; i++) {
          ticketPromises.push(
            fetch('/api/attractions/tickets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                attraction_id: attraction.id,
                user_id: 1, // TODO: Replace with actual user ID
                ticket_type: 'senior',
                price_krw: attraction.admission_fee_senior,
                valid_date: visitDate
              })
            })
          );
        }
      }

      if (quantities.infant > 0) {
        for (let i = 0; i < quantities.infant; i++) {
          ticketPromises.push(
            fetch('/api/attractions/tickets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                attraction_id: attraction.id,
                user_id: 1, // TODO: Replace with actual user ID
                ticket_type: 'infant',
                price_krw: attraction.admission_fee_infant || 0,
                valid_date: visitDate
              })
            })
          );
        }
      }

      const results = await Promise.all(ticketPromises);
      const allSuccessful = results.every(async (res) => {
        const data = await res.json();
        return data.success;
      });

      if (allSuccessful) {
        alert(`${totalTickets}장의 티켓을 구매했습니다!`);
        // Reset quantities
        setQuantities({ adult: 0, child: 0, senior: 0, infant: 0 });
        // Navigate to tickets page or show confirmation
        router.push('/my/tickets');
      } else {
        alert('일부 티켓 구매에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('티켓 구매 실패:', error);
      alert('티켓 구매에 실패했습니다.');
    } finally {
      setPurchasing(false);
    }
  };

  const nextImage = () => {
    if (!attraction) return;
    setCurrentImageIndex((prev) =>
      prev === attraction.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    if (!attraction) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? attraction.images.length - 1 : prev - 1
    );
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      '박물관': '🏛️ 박물관',
      '유적지': '🏛️ 유적지',
      '테마파크': '🎢 테마파크',
      '전시관': '🎨 전시관',
      '동물원': '🦁 동물원',
      '수족관': '🐠 수족관',
      '공원': '🌳 공원',
      '전망대': '🗼 전망대'
    };
    return typeMap[type] || type;
  };

  const getDayOfWeek = (dateString: string) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const date = new Date(dateString);
    return days[date.getDay()];
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader className="spinner" size={48} />
        <p>관광지 정보를 불러오는 중...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            gap: 16px;
          }
          .spinner {
            animation: spin 1s linear infinite;
            color: #10b981;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!attraction) {
    return (
      <div className="error-container">
        <p>관광지를 찾을 수 없습니다.</p>
        <button onClick={() => router.push('/attractions')}>목록으로 돌아가기</button>
        <style jsx>{`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            gap: 16px;
          }
          button {
            padding: 12px 24px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
          }
        `}</style>
      </div>
    );
  }

  const images = attraction.images && attraction.images.length > 0
    ? attraction.images
    : [attraction.thumbnail_url || '/placeholder-attraction.jpg'];

  return (
    <>
      <Head>
        <title>{attraction.name} - Travleap</title>
        <meta name="description" content={attraction.description} />
      </Head>

      <div className="attraction-detail-page">
        {/* Image Gallery */}
        <div className="image-gallery">
          <div className="main-image">
            <img src={images[currentImageIndex]} alt={attraction.name} />
            {images.length > 1 && (
              <>
                <button className="nav-button prev" onClick={prevImage}>
                  <ChevronLeft size={24} />
                </button>
                <button className="nav-button next" onClick={nextImage}>
                  <ChevronRight size={24} />
                </button>
                <div className="image-indicator">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="thumbnail-list">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`thumbnail ${idx === currentImageIndex ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(idx)}
                >
                  <img src={img} alt={`${attraction.name} ${idx + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="content-container">
          <div className="main-content">
            {/* Header */}
            <div className="attraction-header">
              <div className="type-badge">{getTypeLabel(attraction.type)}</div>
              <h1>{attraction.name}</h1>
              {attraction.rating_avg > 0 && (
                <div className="rating">
                  <Star size={20} fill="#10b981" color="#10b981" />
                  <span className="rating-value">{attraction.rating_avg.toFixed(1)}</span>
                  <span className="rating-count">({attraction.rating_count}개 리뷰)</span>
                </div>
              )}
            </div>

            {/* Quick Info */}
            <div className="quick-info">
              {attraction.city && (
                <div className="info-item">
                  <MapPin size={18} />
                  <span>{attraction.city}</span>
                </div>
              )}
              {attraction.estimated_visit_duration_minutes && (
                <div className="info-item">
                  <Clock size={18} />
                  <span>약 {Math.floor(attraction.estimated_visit_duration_minutes / 60)}시간 소요</span>
                </div>
              )}
              {attraction.total_tickets_sold > 0 && (
                <div className="info-item">
                  <Ticket size={18} />
                  <span>{attraction.total_tickets_sold.toLocaleString()}명 방문</span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="features">
              {attraction.wheelchair_accessible && (
                <span className="feature">
                  <Accessibility size={16} /> 휠체어 가능
                </span>
              )}
              {attraction.stroller_friendly && (
                <span className="feature">
                  <Baby size={16} /> 유모차 가능
                </span>
              )}
              {attraction.parking_available && (
                <span className="feature">
                  <Car size={16} /> 주차 가능
                  {attraction.parking_fee > 0 && ` (${attraction.parking_fee.toLocaleString()}원)`}
                </span>
              )}
              {attraction.pet_allowed && (
                <span className="feature">
                  <Dog size={16} /> 반려동물 동반 가능
                </span>
              )}
            </div>

            {/* Description */}
            <section className="section">
              <h2>소개</h2>
              <p className="description">{attraction.description}</p>
            </section>

            {/* Highlights */}
            {attraction.highlights && attraction.highlights.length > 0 && (
              <section className="section">
                <h2>주요 특징</h2>
                <ul className="highlights-list">
                  {attraction.highlights.map((highlight, idx) => (
                    <li key={idx}>{highlight}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Operating Hours */}
            {attraction.operating_hours && Object.keys(attraction.operating_hours).length > 0 && (
              <section className="section">
                <h2>운영 시간</h2>
                <div className="operating-hours">
                  {Object.entries(attraction.operating_hours).map(([day, hours]: [string, any]) => (
                    <div key={day} className="hours-row">
                      <span className="day">{day}</span>
                      <span className="hours">
                        {hours.open && hours.close
                          ? `${hours.open} - ${hours.close}`
                          : '휴무'}
                      </span>
                    </div>
                  ))}
                  {attraction.last_entry_time && (
                    <div className="last-entry">
                      마지막 입장: {attraction.last_entry_time}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Contact Info */}
            <section className="section">
              <h2>연락처 및 위치</h2>
              <div className="contact-info">
                {attraction.address && (
                  <div className="contact-item">
                    <MapPin size={18} />
                    <span>{attraction.address}</span>
                  </div>
                )}
                {attraction.phone && (
                  <div className="contact-item">
                    <Phone size={18} />
                    <a href={`tel:${attraction.phone}`}>{attraction.phone}</a>
                  </div>
                )}
                {attraction.website && (
                  <div className="contact-item">
                    <Globe size={18} />
                    <a href={attraction.website} target="_blank" rel="noopener noreferrer">
                      공식 웹사이트
                    </a>
                  </div>
                )}
              </div>
            </section>

            {/* Parking Info */}
            {attraction.parking_available && attraction.parking_info && (
              <section className="section">
                <h2>주차 안내</h2>
                <p>{attraction.parking_info}</p>
              </section>
            )}
          </div>

          {/* Ticket Purchase Sidebar */}
          <div className="sidebar">
            <div className="ticket-card">
              <h3>티켓 구매</h3>

              {/* Visit Date */}
              <div className="form-group">
                <label>
                  <Calendar size={16} />
                  방문 날짜
                </label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                {visitDate && (
                  <div className="date-info">
                    {getDayOfWeek(visitDate)}요일
                  </div>
                )}
              </div>

              {/* Ticket Types */}
              <div className="ticket-types">
                {/* Adult */}
                {attraction.admission_fee_adult > 0 && (
                  <div className="ticket-type">
                    <div className="ticket-info">
                      <span className="ticket-label">성인</span>
                      <span className="ticket-price">
                        {attraction.admission_fee_adult.toLocaleString()}원
                      </span>
                    </div>
                    <div className="quantity-control">
                      <button onClick={() => updateQuantity('adult', -1)} disabled={quantities.adult === 0}>
                        <Minus size={16} />
                      </button>
                      <span className="quantity">{quantities.adult}</span>
                      <button onClick={() => updateQuantity('adult', 1)}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Child */}
                {attraction.admission_fee_child > 0 && (
                  <div className="ticket-type">
                    <div className="ticket-info">
                      <span className="ticket-label">어린이</span>
                      <span className="ticket-price">
                        {attraction.admission_fee_child.toLocaleString()}원
                      </span>
                    </div>
                    <div className="quantity-control">
                      <button onClick={() => updateQuantity('child', -1)} disabled={quantities.child === 0}>
                        <Minus size={16} />
                      </button>
                      <span className="quantity">{quantities.child}</span>
                      <button onClick={() => updateQuantity('child', 1)}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Senior */}
                {attraction.admission_fee_senior > 0 && (
                  <div className="ticket-type">
                    <div className="ticket-info">
                      <span className="ticket-label">경로</span>
                      <span className="ticket-price">
                        {attraction.admission_fee_senior.toLocaleString()}원
                      </span>
                    </div>
                    <div className="quantity-control">
                      <button onClick={() => updateQuantity('senior', -1)} disabled={quantities.senior === 0}>
                        <Minus size={16} />
                      </button>
                      <span className="quantity">{quantities.senior}</span>
                      <button onClick={() => updateQuantity('senior', 1)}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Infant */}
                {attraction.admission_fee_infant !== undefined && (
                  <div className="ticket-type">
                    <div className="ticket-info">
                      <span className="ticket-label">유아</span>
                      <span className="ticket-price">
                        {attraction.admission_fee_infant === 0 ? '무료' : `${attraction.admission_fee_infant.toLocaleString()}원`}
                      </span>
                    </div>
                    <div className="quantity-control">
                      <button onClick={() => updateQuantity('infant', -1)} disabled={quantities.infant === 0}>
                        <Minus size={16} />
                      </button>
                      <span className="quantity">{quantities.infant}</span>
                      <button onClick={() => updateQuantity('infant', 1)}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Free Entry Days */}
              {attraction.free_entry_days && attraction.free_entry_days.length > 0 && (
                <div className="free-entry-info">
                  무료 입장일: {attraction.free_entry_days.join(', ')}
                </div>
              )}

              {/* Total */}
              <div className="ticket-total">
                <div className="total-row">
                  <span>총 티켓</span>
                  <span>{getTotalTickets()}장</span>
                </div>
                <div className="total-row price">
                  <span>총 금액</span>
                  <span className="total-price">{getTotalPrice().toLocaleString()}원</span>
                </div>
              </div>

              {/* Purchase Button */}
              <button
                className="purchase-button"
                onClick={handlePurchase}
                disabled={getTotalTickets() === 0 || purchasing}
              >
                {purchasing ? (
                  <>
                    <Loader className="spinner" size={18} />
                    구매 중...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    티켓 구매하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .attraction-detail-page {
            min-height: 100vh;
            background: #f9fafb;
          }

          /* Image Gallery */
          .image-gallery {
            background: #111827;
          }

          .main-image {
            position: relative;
            width: 100%;
            height: 500px;
            overflow: hidden;
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
            width: 48px;
            height: 48px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .nav-button:hover {
            background: white;
            transform: translateY(-50%) scale(1.1);
          }

          .nav-button.prev {
            left: 20px;
          }

          .nav-button.next {
            right: 20px;
          }

          .image-indicator {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
          }

          .thumbnail-list {
            display: flex;
            gap: 8px;
            padding: 16px;
            overflow-x: auto;
            background: #1f2937;
          }

          .thumbnail {
            width: 100px;
            height: 70px;
            flex-shrink: 0;
            border-radius: 6px;
            overflow: hidden;
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.2s;
          }

          .thumbnail:hover {
            border-color: #10b981;
          }

          .thumbnail.active {
            border-color: #10b981;
          }

          .thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          /* Content */
          .content-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 40px;
          }

          .main-content {
            min-width: 0;
          }

          /* Header */
          .attraction-header {
            margin-bottom: 24px;
          }

          .type-badge {
            display: inline-block;
            background: #ecfdf5;
            color: #059669;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
          }

          .attraction-header h1 {
            font-size: 36px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 12px;
          }

          .rating {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .rating-value {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
          }

          .rating-count {
            font-size: 15px;
            color: #6b7280;
          }

          /* Quick Info */
          .quick-info {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            padding: 20px 0;
            border-top: 1px solid #e5e7eb;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 24px;
          }

          .info-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 15px;
            color: #374151;
          }

          .info-item :global(svg) {
            color: #10b981;
          }

          /* Features */
          .features {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 32px;
          }

          .feature {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: #ecfdf5;
            color: #059669;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
          }

          /* Sections */
          .section {
            margin-bottom: 40px;
          }

          .section h2 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 16px;
          }

          .description {
            font-size: 16px;
            line-height: 1.7;
            color: #374151;
          }

          .highlights-list {
            list-style: none;
            padding: 0;
          }

          .highlights-list li {
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
            font-size: 15px;
            color: #374151;
          }

          .highlights-list li:last-child {
            border-bottom: none;
          }

          .highlights-list li::before {
            content: "✓ ";
            color: #10b981;
            font-weight: 700;
            margin-right: 8px;
          }

          /* Operating Hours */
          .operating-hours {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
          }

          .hours-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #f3f4f6;
          }

          .hours-row:last-child {
            border-bottom: none;
          }

          .day {
            font-weight: 600;
            color: #374151;
          }

          .hours {
            color: #6b7280;
          }

          .last-entry {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #10b981;
            font-weight: 500;
          }

          /* Contact Info */
          .contact-info {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .contact-item {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 15px;
            color: #374151;
          }

          .contact-item :global(svg) {
            color: #6b7280;
            flex-shrink: 0;
          }

          .contact-item a {
            color: #10b981;
            text-decoration: none;
          }

          .contact-item a:hover {
            text-decoration: underline;
          }

          /* Sidebar */
          .sidebar {
            position: relative;
          }

          .ticket-card {
            position: sticky;
            top: 20px;
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          }

          .ticket-card h3 {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 20px;
          }

          .form-group {
            margin-bottom: 24px;
          }

          .form-group label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
          }

          .form-group input[type="date"] {
            width: 100%;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 15px;
          }

          .form-group input[type="date"]:focus {
            outline: none;
            border-color: #10b981;
          }

          .date-info {
            margin-top: 6px;
            font-size: 13px;
            color: #10b981;
            font-weight: 500;
          }

          .ticket-types {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 24px;
          }

          .ticket-type {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
          }

          .ticket-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .ticket-label {
            font-size: 15px;
            font-weight: 600;
            color: #374151;
          }

          .ticket-price {
            font-size: 16px;
            font-weight: 700;
            color: #10b981;
          }

          .quantity-control {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .quantity-control button {
            width: 32px;
            height: 32px;
            border: 1px solid #e5e7eb;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .quantity-control button:hover:not(:disabled) {
            border-color: #10b981;
            background: #ecfdf5;
          }

          .quantity-control button:disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }

          .quantity {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            min-width: 30px;
            text-align: center;
          }

          .free-entry-info {
            padding: 12px;
            background: #fef3c7;
            border-radius: 6px;
            font-size: 13px;
            color: #92400e;
            margin-bottom: 16px;
          }

          .ticket-total {
            padding-top: 16px;
            margin-bottom: 16px;
            border-top: 1px solid #e5e7eb;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 15px;
            color: #374151;
          }

          .total-row.price {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
          }

          .total-price {
            color: #10b981;
            font-size: 24px;
          }

          .purchase-button {
            width: 100%;
            padding: 16px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
          }

          .purchase-button:hover:not(:disabled) {
            background: #059669;
          }

          .purchase-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .purchase-button .spinner {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          /* Responsive */
          @media (max-width: 1024px) {
            .content-container {
              grid-template-columns: 1fr;
            }

            .sidebar {
              order: -1;
            }

            .ticket-card {
              position: static;
            }
          }

          @media (max-width: 768px) {
            .main-image {
              height: 300px;
            }

            .attraction-header h1 {
              font-size: 24px;
            }

            .quick-info {
              flex-direction: column;
              gap: 12px;
            }

            .thumbnail-list {
              display: none;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default AttractionDetailPage;
