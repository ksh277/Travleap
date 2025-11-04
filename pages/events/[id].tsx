import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  MapPin,
  Calendar,
  Clock,
  Star,
  Ticket,
  Phone,
  Globe,
  Accessibility,
  Car,
  ChevronLeft,
  ChevronRight,
  Loader,
  Plus,
  Minus,
  ShoppingCart,
  Users,
  AlertCircle
} from 'lucide-react';

interface Event {
  id: number;
  event_code: string;
  name: string;
  description: string;
  event_type: string;
  category: string;
  venue: string;
  venue_address: string;
  start_datetime: string;
  end_datetime: string;
  doors_open_time: string;
  ticket_types: TicketType[];
  total_capacity: number;
  age_restriction: string;
  duration_minutes: number;
  organizer: string;
  organizer_contact: string;
  website: string;
  parking_available: boolean;
  parking_info: string;
  wheelchair_accessible: boolean;
  facilities: string[];
  thumbnail_url: string;
  images: string[];
  refund_policy: string;
  location: string;
  rating_avg: number;
  rating_count: number;
  total_tickets_sold: number;
}

interface TicketType {
  name: string;
  price_krw: number;
  description?: string;
  available_quantity?: number;
}

interface TicketQuantities {
  [key: string]: number;
}

const EventDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantities, setQuantities] = useState<TicketQuantities>({});
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/events/list?id=${id}`);
      const data = await response.json();

      if (data.success && data.event) {
        setEvent(data.event);
      }
    } catch (error) {
      console.error('이벤트 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (ticketName: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [ticketName]: Math.max(0, (prev[ticketName] || 0) + delta)
    }));
  };

  const getTotalTickets = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    if (!event) return 0;
    return Object.entries(quantities).reduce((total, [ticketName, qty]) => {
      const ticketType = event.ticket_types.find(t => t.name === ticketName);
      if (ticketType) {
        return total + (ticketType.price_krw * qty);
      }
      return total;
    }, 0);
  };

  const handlePurchase = async () => {
    if (!event) return;

    const totalTickets = getTotalTickets();
    if (totalTickets === 0) {
      alert('티켓을 선택해주세요.');
      return;
    }

    // 사용자 정보 가져오기
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!currentUser?.id) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    setPurchasing(true);

    try {
      const ticketPromises = [];

      // 각 티켓 타입별로 한 번씩만 API 호출 (quantity 사용)
      for (const [ticketName, qty] of Object.entries(quantities)) {
        if (qty > 0) {
          const ticketType = event.ticket_types.find(t => t.name === ticketName);
          if (ticketType) {
            const totalAmount = ticketType.price_krw * qty;

            ticketPromises.push(
              fetch('/api/events/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event_id: event.id,
                  user_id: currentUser.id,
                  ticket_type: ticketName,
                  quantity: qty,
                  total_amount: totalAmount
                })
              })
            );
          }
        }
      }

      const results = await Promise.all(ticketPromises);

      // 모든 응답을 JSON으로 변환
      const jsonResults = await Promise.all(results.map(res => res.json()));

      // 모든 티켓이 성공적으로 생성되었는지 확인
      const allSuccessful = jsonResults.every(data => data.success);

      if (allSuccessful) {
        alert(`${totalTickets}장의 티켓을 구매했습니다!`);
        setQuantities({});
        router.push('/my/tickets');
      } else {
        const errorMsg = jsonResults.find(data => !data.success)?.message || jsonResults.find(data => !data.success)?.error;
        alert(errorMsg || '일부 티켓 구매에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('티켓 구매 실패:', error);
      alert('티켓 구매에 실패했습니다.');
    } finally {
      setPurchasing(false);
    }
  };

  const nextImage = () => {
    if (!event) return;
    setCurrentImageIndex((prev) =>
      prev === event.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    if (!event) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? event.images.length - 1 : prev - 1
    );
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      '콘서트': '🎵 콘서트',
      '페스티벌': '🎪 페스티벌',
      '전시회': '🎨 전시회',
      '스포츠': '⚽ 스포츠',
      '컨퍼런스': '💼 컨퍼런스',
      '공연': '🎭 공연',
      '뮤지컬': '🎬 뮤지컬',
      '연극': '🎪 연극',
      '세미나': '📚 세미나'
    };
    return typeMap[type] || type;
  };

  const formatDateTime = (datetime: string) => {
    const date = new Date(datetime);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

    return `${year}.${month}.${day} (${dayOfWeek}) ${hour}:${minute}`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader className="spinner" size={48} />
        <p>이벤트 정보를 불러오는 중...</p>
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
            color: #9333ea;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="error-container">
        <p>이벤트를 찾을 수 없습니다.</p>
        <button onClick={() => router.push('/events')}>목록으로 돌아가기</button>
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
            background: #9333ea;
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

  const images = event.images && event.images.length > 0
    ? event.images
    : [event.thumbnail_url || '/placeholder-event.jpg'];

  return (
    <>
      <Head>
        <title>{event.name} - Travleap</title>
        <meta name="description" content={event.description} />
      </Head>

      <div className="event-detail-page">
        {/* Image Gallery */}
        <div className="image-gallery">
          <div className="main-image">
            <img src={images[currentImageIndex]} alt={event.name} />
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
                  <img src={img} alt={`${event.name} ${idx + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="content-container">
          <div className="main-content">
            {/* Header */}
            <div className="event-header">
              <div className="type-badge">{getTypeLabel(event.event_type)}</div>
              <h1>{event.name}</h1>
              {event.rating_avg > 0 && (
                <div className="rating">
                  <Star size={20} fill="#9333ea" color="#9333ea" />
                  <span className="rating-value">{event.rating_avg.toFixed(1)}</span>
                  <span className="rating-count">({event.rating_count}개 리뷰)</span>
                </div>
              )}
            </div>

            {/* Quick Info */}
            <div className="quick-info">
              <div className="info-item">
                <Calendar size={18} />
                <span>{formatDateTime(event.start_datetime)}</span>
              </div>
              {event.end_datetime && (
                <div className="info-item">
                  <Clock size={18} />
                  <span>종료: {formatDateTime(event.end_datetime)}</span>
                </div>
              )}
              <div className="info-item">
                <MapPin size={18} />
                <span>{event.venue}</span>
              </div>
              {event.total_tickets_sold > 0 && (
                <div className="info-item">
                  <Users size={18} />
                  <span>{event.total_tickets_sold.toLocaleString()}명 예매</span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="features">
              {event.wheelchair_accessible && (
                <span className="feature">
                  <Accessibility size={16} /> 휠체어 가능
                </span>
              )}
              {event.parking_available && (
                <span className="feature">
                  <Car size={16} /> 주차 가능
                </span>
              )}
              {event.age_restriction && (
                <span className="feature">
                  🔞 {event.age_restriction}
                </span>
              )}
              {event.duration_minutes && (
                <span className="feature">
                  ⏱️ {Math.floor(event.duration_minutes / 60)}시간 소요
                </span>
              )}
            </div>

            {/* Description */}
            <section className="section">
              <h2>소개</h2>
              <p className="description">{event.description}</p>
            </section>

            {/* Facilities */}
            {event.facilities && event.facilities.length > 0 && (
              <section className="section">
                <h2>편의시설</h2>
                <ul className="facilities-list">
                  {event.facilities.map((facility, idx) => (
                    <li key={idx}>{facility}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Venue Info */}
            <section className="section">
              <h2>장소 정보</h2>
              <div className="venue-info">
                <div className="venue-item">
                  <MapPin size={18} />
                  <div>
                    <div className="venue-name">{event.venue}</div>
                    {event.venue_address && (
                      <div className="venue-address">{event.venue_address}</div>
                    )}
                  </div>
                </div>
                {event.doors_open_time && (
                  <div className="venue-item">
                    <Clock size={18} />
                    <span>입장 시작: {event.doors_open_time}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Contact Info */}
            {(event.organizer || event.organizer_contact || event.website) && (
              <section className="section">
                <h2>주최자 정보</h2>
                <div className="contact-info">
                  {event.organizer && (
                    <div className="contact-item">
                      <Users size={18} />
                      <span>{event.organizer}</span>
                    </div>
                  )}
                  {event.organizer_contact && (
                    <div className="contact-item">
                      <Phone size={18} />
                      <a href={`tel:${event.organizer_contact}`}>{event.organizer_contact}</a>
                    </div>
                  )}
                  {event.website && (
                    <div className="contact-item">
                      <Globe size={18} />
                      <a href={event.website} target="_blank" rel="noopener noreferrer">
                        공식 웹사이트
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Parking Info */}
            {event.parking_available && event.parking_info && (
              <section className="section">
                <h2>주차 안내</h2>
                <p>{event.parking_info}</p>
              </section>
            )}

            {/* Refund Policy */}
            {event.refund_policy && (
              <section className="section">
                <h2>환불 정책</h2>
                <div className="refund-policy">
                  <AlertCircle size={18} />
                  <p>{event.refund_policy}</p>
                </div>
              </section>
            )}
          </div>

          {/* Ticket Purchase Sidebar */}
          <div className="sidebar">
            <div className="ticket-card">
              <h3>티켓 구매</h3>

              {/* Event Date Display */}
              <div className="event-date">
                <Calendar size={16} />
                <div>
                  <div className="date-main">{formatDateTime(event.start_datetime)}</div>
                  {event.end_datetime && (
                    <div className="date-sub">~ {formatDateTime(event.end_datetime)}</div>
                  )}
                </div>
              </div>

              {/* Ticket Types */}
              <div className="ticket-types">
                {event.ticket_types && event.ticket_types.length > 0 ? (
                  event.ticket_types.map((ticketType, idx) => (
                    <div key={idx} className="ticket-type">
                      <div className="ticket-info">
                        <span className="ticket-label">{ticketType.name}</span>
                        {ticketType.description && (
                          <span className="ticket-desc">{ticketType.description}</span>
                        )}
                        <span className="ticket-price">
                          {ticketType.price_krw.toLocaleString()}원
                        </span>
                      </div>
                      <div className="quantity-control">
                        <button
                          onClick={() => updateQuantity(ticketType.name, -1)}
                          disabled={!quantities[ticketType.name]}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="quantity">{quantities[ticketType.name] || 0}</span>
                        <button onClick={() => updateQuantity(ticketType.name, 1)}>
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-tickets">티켓 정보가 없습니다.</div>
                )}
              </div>

              {/* Capacity Info */}
              {event.total_capacity && (
                <div className="capacity-info">
                  총 좌석: {event.total_capacity.toLocaleString()}석
                  {event.total_tickets_sold > 0 && (
                    <span> (예매 {event.total_tickets_sold.toLocaleString()})</span>
                  )}
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
                    티켓 예매하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .event-detail-page {
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
            border-color: #9333ea;
          }

          .thumbnail.active {
            border-color: #9333ea;
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
          .event-header {
            margin-bottom: 24px;
          }

          .type-badge {
            display: inline-block;
            background: #f3e8ff;
            color: #7e22ce;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
          }

          .event-header h1 {
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
            color: #9333ea;
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
            background: #f3e8ff;
            color: #7e22ce;
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

          .facilities-list {
            list-style: none;
            padding: 0;
          }

          .facilities-list li {
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
            font-size: 15px;
            color: #374151;
          }

          .facilities-list li:last-child {
            border-bottom: none;
          }

          .facilities-list li::before {
            content: "✓ ";
            color: #9333ea;
            font-weight: 700;
            margin-right: 8px;
          }

          /* Venue Info */
          .venue-info {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .venue-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            font-size: 15px;
            color: #374151;
          }

          .venue-item :global(svg) {
            color: #9333ea;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .venue-name {
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
          }

          .venue-address {
            font-size: 14px;
            color: #6b7280;
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
            color: #9333ea;
            text-decoration: none;
          }

          .contact-item a:hover {
            text-decoration: underline;
          }

          .refund-policy {
            display: flex;
            gap: 12px;
            padding: 16px;
            background: #fef3c7;
            border-radius: 8px;
          }

          .refund-policy :global(svg) {
            color: #92400e;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .refund-policy p {
            font-size: 14px;
            color: #92400e;
            line-height: 1.6;
            margin: 0;
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

          .event-date {
            display: flex;
            gap: 12px;
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
            margin-bottom: 20px;
          }

          .event-date :global(svg) {
            color: #9333ea;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .date-main {
            font-size: 15px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 4px;
          }

          .date-sub {
            font-size: 13px;
            color: #6b7280;
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
            flex: 1;
          }

          .ticket-label {
            font-size: 15px;
            font-weight: 600;
            color: #374151;
          }

          .ticket-desc {
            font-size: 12px;
            color: #6b7280;
          }

          .ticket-price {
            font-size: 16px;
            font-weight: 700;
            color: #9333ea;
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
            border-color: #9333ea;
            background: #f3e8ff;
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

          .no-tickets {
            text-align: center;
            padding: 24px;
            color: #6b7280;
            font-size: 14px;
          }

          .capacity-info {
            padding: 12px;
            background: #f3e8ff;
            border-radius: 6px;
            font-size: 13px;
            color: #7e22ce;
            margin-bottom: 16px;
            text-align: center;
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
            color: #9333ea;
            font-size: 24px;
          }

          .purchase-button {
            width: 100%;
            padding: 16px;
            background: #9333ea;
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
            background: #7e22ce;
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

            .event-header h1 {
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

export default EventDetailPage;
