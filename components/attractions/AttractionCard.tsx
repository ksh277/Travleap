import React from 'react';
import Link from 'next/link';
import { MapPin, Star, Clock, Ticket, Accessibility } from 'lucide-react';

interface AttractionCardProps {
  attraction: {
    id: number;
    name: string;
    description?: string;
    type: string;
    category?: string;
    address?: string;
    city?: string;
    admission_fee_adult: number;
    admission_fee_child?: number;
    parking_available?: boolean;
    wheelchair_accessible?: boolean;
    estimated_visit_duration_minutes?: number;
    thumbnail_url?: string;
    images?: string[];
    rating_avg?: number;
    rating_count?: number;
    total_tickets_sold?: number;
  };
}

const AttractionCard: React.FC<AttractionCardProps> = ({ attraction }) => {
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

  return (
    <Link href={`/attractions/${attraction.id}`}>
      <a className="attraction-card">
        <div className="attraction-image">
          <img
            src={attraction.thumbnail_url || (attraction.images && attraction.images.length > 0 ? attraction.images[0] : '/placeholder-attraction.jpg')}
            alt={attraction.name}
          />
          <div className="type-badge">{getTypeLabel(attraction.type)}</div>
        </div>

        <div className="attraction-content">
          <div className="attraction-header">
            <h3 className="attraction-name">{attraction.name}</h3>
            {attraction.rating_avg && attraction.rating_avg > 0 && (
              <div className="rating">
                <Star size={14} fill="#10b981" color="#10b981" />
                <span>{attraction.rating_avg.toFixed(1)}</span>
                {attraction.rating_count && (
                  <span className="rating-count">({attraction.rating_count})</span>
                )}
              </div>
            )}
          </div>

          {attraction.description && (
            <p className="attraction-description">{attraction.description}</p>
          )}

          <div className="attraction-info">
            {attraction.city && (
              <div className="info-item">
                <MapPin size={14} />
                <span>{attraction.city}</span>
              </div>
            )}
            {attraction.estimated_visit_duration_minutes && (
              <div className="info-item">
                <Clock size={14} />
                <span>약 {Math.floor(attraction.estimated_visit_duration_minutes / 60)}시간</span>
              </div>
            )}
          </div>

          <div className="features">
            {attraction.wheelchair_accessible && (
              <span className="feature">
                <Accessibility size={14} /> 휠체어 가능
              </span>
            )}
            {attraction.parking_available && (
              <span className="feature">🅿️ 주차 가능</span>
            )}
          </div>

          <div className="attraction-footer">
            <div className="price">
              <span className="price-label">입장료</span>
              <span className="price-value">
                {attraction.admission_fee_adult.toLocaleString()}원
              </span>
              {attraction.admission_fee_child && (
                <span className="child-price">
                  어린이 {attraction.admission_fee_child.toLocaleString()}원
                </span>
              )}
            </div>
            {attraction.total_tickets_sold && attraction.total_tickets_sold > 0 && (
              <div className="ticket-count">
                <Ticket size={14} />
                <span>{attraction.total_tickets_sold}명 방문</span>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .attraction-card {
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

          .attraction-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          }

          .attraction-image {
            position: relative;
            width: 100%;
            height: 200px;
            overflow: hidden;
            background: #f3f4f6;
          }

          .attraction-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
          }

          .attraction-card:hover .attraction-image img {
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

          .attraction-content {
            padding: 16px;
          }

          .attraction-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            gap: 8px;
          }

          .attraction-name {
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

          .attraction-description {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 12px;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .attraction-info {
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
            color: #6b7280;
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
            background: #ecfdf5;
            color: #059669;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }

          .attraction-footer {
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
            color: #10b981;
          }

          .child-price {
            font-size: 11px;
            color: #6b7280;
          }

          .ticket-count {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #6b7280;
          }

          @media (max-width: 768px) {
            .attraction-name {
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

export default AttractionCard;
