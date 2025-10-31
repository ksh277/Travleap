import React from 'react';
import Link from 'next/link';
import { MapPin, Star, Clock, Phone, Car, Utensils } from 'lucide-react';

interface RestaurantCardProps {
  restaurant: {
    id: number;
    name: string;
    description?: string;
    cuisine_type: string;
    address?: string;
    phone?: string;
    city?: string;
    admission_fee_adult?: number;
    parking_available?: boolean;
    accepts_reservations?: boolean;
    accepts_takeout?: boolean;
    accepts_delivery?: boolean;
    thumbnail_url?: string;
    images?: string[];
    rating_avg?: number;
    rating_count?: number;
    total_orders?: number;
  };
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant }) => {
  const getCuisineLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      '한식': '🇰🇷 한식',
      '중식': '🇨🇳 중식',
      '일식': '🇯🇵 일식',
      '양식': '🍴 양식',
      '카페': '☕ 카페',
      '분식': '🍜 분식',
      '치킨': '🍗 치킨',
      '피자': '🍕 피자',
      '패스트푸드': '🍔 패스트푸드'
    };
    return typeMap[type] || type;
  };

  return (
    <Link href={`/food/${restaurant.id}`}>
      <a className="restaurant-card">
        <div className="restaurant-image">
          <img
            src={restaurant.thumbnail_url || (restaurant.images && restaurant.images.length > 0 ? restaurant.images[0] : '/placeholder-restaurant.jpg')}
            alt={restaurant.name}
          />
          <div className="cuisine-badge">{getCuisineLabel(restaurant.cuisine_type)}</div>
        </div>

        <div className="restaurant-content">
          <div className="restaurant-header">
            <h3 className="restaurant-name">{restaurant.name}</h3>
            {restaurant.rating_avg && restaurant.rating_avg > 0 && (
              <div className="rating">
                <Star size={14} fill="#fbbf24" color="#fbbf24" />
                <span>{restaurant.rating_avg.toFixed(1)}</span>
                {restaurant.rating_count && (
                  <span className="rating-count">({restaurant.rating_count})</span>
                )}
              </div>
            )}
          </div>

          {restaurant.description && (
            <p className="restaurant-description">{restaurant.description}</p>
          )}

          <div className="restaurant-info">
            {restaurant.city && (
              <div className="info-item">
                <MapPin size={14} />
                <span>{restaurant.city}</span>
              </div>
            )}
            {restaurant.phone && (
              <div className="info-item">
                <Phone size={14} />
                <span>{restaurant.phone}</span>
              </div>
            )}
          </div>

          <div className="service-badges">
            {restaurant.accepts_reservations && (
              <span className="badge">예약</span>
            )}
            {restaurant.accepts_takeout && (
              <span className="badge">포장</span>
            )}
            {restaurant.accepts_delivery && (
              <span className="badge">배달</span>
            )}
            {restaurant.parking_available && (
              <span className="badge">
                <Car size={12} /> 주차
              </span>
            )}
          </div>

          {restaurant.total_orders && restaurant.total_orders > 0 && (
            <div className="order-count">
              <Utensils size={14} />
              <span>주문 {restaurant.total_orders}건</span>
            </div>
          )}
        </div>

        <style jsx>{`
          .restaurant-card {
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

          .restaurant-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          }

          .restaurant-image {
            position: relative;
            width: 100%;
            height: 200px;
            overflow: hidden;
            background: #f3f4f6;
          }

          .restaurant-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
          }

          .restaurant-card:hover .restaurant-image img {
            transform: scale(1.05);
          }

          .cuisine-badge {
            position: absolute;
            top: 12px;
            left: 12px;
            background: rgba(255, 255, 255, 0.95);
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
          }

          .restaurant-content {
            padding: 16px;
          }

          .restaurant-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            gap: 8px;
          }

          .restaurant-name {
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

          .restaurant-description {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 12px;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .restaurant-info {
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

          .service-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 8px;
          }

          .badge {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            background: #eff6ff;
            color: #1e40af;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }

          .order-count {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: #6b7280;
            margin-top: 8px;
          }

          @media (max-width: 768px) {
            .restaurant-name {
              font-size: 16px;
            }
          }
        `}</style>
      </a>
    </Link>
  );
};

export default RestaurantCard;
