import React from 'react';
import Link from 'next/link';
import { MapPin, Calendar, Clock, Ticket, Star, Users, Accessibility } from 'lucide-react';

interface EventCardProps {
  event: {
    id: number;
    name: string;
    description?: string;
    event_type: string;
    category?: string;
    venue: string;
    venue_address?: string;
    start_datetime: string;
    end_datetime?: string;
    ticket_types?: any[];
    total_capacity?: number;
    age_restriction?: string;
    parking_available?: boolean;
    wheelchair_accessible?: boolean;
    thumbnail_url?: string;
    images?: string[];
    location?: string;
    rating_avg?: number;
    rating_count?: number;
    total_tickets_sold?: number;
  };
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
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
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes().toString().padStart(2, '0');
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

    return {
      date: `${month}월 ${day}일 (${dayOfWeek})`,
      time: `${hour}:${minute}`
    };
  };

  const getMinPrice = () => {
    if (!event.ticket_types || event.ticket_types.length === 0) return null;
    const prices = event.ticket_types.map((t: any) => t.price_krw).filter((p: number) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  const startTime = formatDateTime(event.start_datetime);
  const minPrice = getMinPrice();

  return (
    <Link href={`/events/${event.id}`}>
      <a className="event-card">
        <div className="event-image">
          <img
            src={event.thumbnail_url || (event.images && event.images.length > 0 ? event.images[0] : '/placeholder-event.jpg')}
            alt={event.name}
          />
          <div className="type-badge">{getTypeLabel(event.event_type)}</div>
          <div className="date-badge">
            <div className="date-month">{startTime.date.split(' ')[0]}</div>
            <div className="date-day">{startTime.date.split(' ')[1]}</div>
          </div>
        </div>

        <div className="event-content">
          <div className="event-header">
            <h3 className="event-name">{event.name}</h3>
            {event.rating_avg && event.rating_avg > 0 && (
              <div className="rating">
                <Star size={14} fill="#9333ea" color="#9333ea" />
                <span>{event.rating_avg.toFixed(1)}</span>
                {event.rating_count && (
                  <span className="rating-count">({event.rating_count})</span>
                )}
              </div>
            )}
          </div>

          {event.description && (
            <p className="event-description">{event.description}</p>
          )}

          <div className="event-info">
            <div className="info-item">
              <Calendar size={14} />
              <span>{startTime.date}</span>
            </div>
            <div className="info-item">
              <Clock size={14} />
              <span>{startTime.time}</span>
            </div>
            <div className="info-item">
              <MapPin size={14} />
              <span>{event.venue}</span>
            </div>
          </div>

          <div className="features">
            {event.wheelchair_accessible && (
              <span className="feature">
                <Accessibility size={14} /> 휠체어 가능
              </span>
            )}
            {event.parking_available && (
              <span className="feature">🅿️ 주차 가능</span>
            )}
            {event.age_restriction && (
              <span className="feature">🔞 {event.age_restriction}</span>
            )}
          </div>

          <div className="event-footer">
            <div className="price">
              {minPrice !== null ? (
                <>
                  <span className="price-label">티켓</span>
                  <span className="price-value">
                    {minPrice.toLocaleString()}원~
                  </span>
                </>
              ) : (
                <span className="price-label">가격 미정</span>
              )}
            </div>
            {event.total_tickets_sold && event.total_tickets_sold > 0 && (
              <div className="ticket-count">
                <Users size={14} />
                <span>{event.total_tickets_sold}명 예매</span>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .event-card {
            display: block;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
          }

          .event-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          }

          .event-image {
            position: relative;
            width: 100%;
            height: 200px;
            overflow: hidden;
            background: #f3f4f6;
          }

          .event-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
          }

          .event-card:hover .event-image img {
            transform: scale(1.05);
          }

          .type-badge {
            position: absolute;
            top: 12px;
            left: 12px;
            background: rgba(255, 255, 255, 0.95);
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
          }

          .date-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            background: #9333ea;
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            text-align: center;
            line-height: 1.2;
          }

          .date-month {
            font-size: 11px;
            font-weight: 500;
            opacity: 0.9;
          }

          .date-day {
            font-size: 14px;
            font-weight: 700;
          }

          .event-content {
            padding: 16px;
          }

          .event-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            gap: 8px;
          }

          .event-name {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            margin: 0;
            flex: 1;
          }

          .rating {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            flex-shrink: 0;
          }

          .rating-count {
            font-size: 12px;
            color: #6b7280;
            font-weight: 400;
          }

          .event-description {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 12px;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .event-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
          }

          .info-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: #374151;
          }

          .info-item :global(svg) {
            color: #9333ea;
            flex-shrink: 0;
          }

          .features {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 12px;
          }

          .feature {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            background: #f3e8ff;
            color: #7e22ce;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }

          .event-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }

          .price {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .price-label {
            font-size: 12px;
            color: #6b7280;
          }

          .price-value {
            font-size: 18px;
            font-weight: 700;
            color: #9333ea;
          }

          .ticket-count {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #6b7280;
          }

          @media (max-width: 768px) {
            .event-name {
              font-size: 16px;
            }

            .price-value {
              font-size: 16px;
            }
          }
        `}</style>
      </a>
    </Link>
  );
};

export default EventCard;
