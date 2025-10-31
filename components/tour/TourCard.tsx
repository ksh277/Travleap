import React from 'react';
import Link from 'next/link';
import { Calendar, Users, Clock, MapPin, Star } from 'lucide-react';

interface TourCardProps {
  tour: {
    id: number;
    package_name: string;
    description: string;
    duration_days: number;
    duration_nights: number;
    price_adult_krw: number;
    thumbnail_url: string;
    location: string;
    rating_avg: number;
    rating_count: number;
    available_schedules: number;
    nearest_departure: string;
    tags: string[];
  };
}

const TourCard: React.FC<TourCardProps> = ({ tour }) => {
  return (
    <Link href={`/tour/${tour.id}`}>
      <div className="tour-card">
        <div className="tour-image">
          <img
            src={tour.thumbnail_url || '/placeholder-tour.jpg'}
            alt={tour.package_name}
          />
          {tour.available_schedules === 0 && (
            <div className="sold-out-badge">예약 마감</div>
          )}
          <div className="duration-badge">
            {tour.duration_days}일 {tour.duration_nights}박
          </div>
        </div>

        <div className="tour-content">
          <div className="tour-location">
            <MapPin size={14} />
            {tour.location}
          </div>

          <h3 className="tour-title">{tour.package_name}</h3>

          <p className="tour-description">{tour.description}</p>

          <div className="tour-meta">
            {tour.rating_avg > 0 && (
              <div className="rating">
                <Star size={16} fill="#fbbf24" color="#fbbf24" />
                <span>{tour.rating_avg.toFixed(1)}</span>
                <span className="review-count">({tour.rating_count})</span>
              </div>
            )}
            {tour.available_schedules > 0 && (
              <div className="availability">
                <Calendar size={14} />
                {tour.available_schedules}개 일정 가능
              </div>
            )}
          </div>

          {tour.tags && tour.tags.length > 0 && (
            <div className="tour-tags">
              {tour.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="tag">#{tag}</span>
              ))}
            </div>
          )}

          <div className="tour-footer">
            <div className="price">
              <span className="price-label">1인</span>
              <span className="price-value">{tour.price_adult_krw.toLocaleString()}원</span>
            </div>
            {tour.nearest_departure && (
              <div className="next-departure">
                최근 출발: {new Date(tour.nearest_departure).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .tour-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: all 0.3s;
            cursor: pointer;
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .tour-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          }

          .tour-image {
            position: relative;
            width: 100%;
            height: 200px;
            overflow: hidden;
          }

          .tour-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s;
          }

          .tour-card:hover .tour-image img {
            transform: scale(1.05);
          }

          .sold-out-badge {
            position: absolute;
            top: 12px;
            left: 12px;
            background: rgba(239, 68, 68, 0.95);
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }

          .duration-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            background: rgba(59, 130, 246, 0.95);
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }

          .tour-content {
            padding: 16px;
            flex: 1;
            display: flex;
            flex-direction: column;
          }

          .tour-location {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #6b7280;
            font-size: 13px;
            margin-bottom: 8px;
          }

          .tour-title {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .tour-description {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 12px;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            flex: 1;
          }

          .tour-meta {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 12px;
            font-size: 13px;
          }

          .rating {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #111827;
            font-weight: 600;
          }

          .review-count {
            color: #6b7280;
            font-weight: 400;
          }

          .availability {
            display: flex;
            align-items: center;
            gap: 4px;
            color: #059669;
          }

          .tour-tags {
            display: flex;
            gap: 6px;
            margin-bottom: 12px;
            flex-wrap: wrap;
          }

          .tag {
            background: #f3f4f6;
            color: #6b7280;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
          }

          .tour-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
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
            font-size: 20px;
            font-weight: 700;
            color: #3b82f6;
          }

          .next-departure {
            font-size: 12px;
            color: #6b7280;
          }
        `}</style>
      </div>
    </Link>
  );
};

export default TourCard;
