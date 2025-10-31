import React from 'react';
import Link from 'next/link';
import { MapPin, Users, Star, Wifi, Coffee, Car, Tv } from 'lucide-react';

interface AccommodationCardProps {
  accommodation: {
    id: number;
    listing_id?: number;
    name: string;
    description?: string;
    room_type?: string;
    bed_type?: string;
    bed_count?: number;
    size_sqm?: number;
    capacity: number;
    base_price_per_night: number;
    weekend_surcharge?: number;
    view_type?: string;
    has_balcony?: boolean;
    breakfast_included?: boolean;
    wifi_available?: boolean;
    tv_available?: boolean;
    air_conditioning?: boolean;
    city?: string;
    address?: string;
    thumbnail_url?: string;
    images?: string[];
    amenities?: any;
    vendor_name?: string;
    check_in_time?: string;
    check_out_time?: string;
    total_bookings?: number;
    is_available?: boolean;
  };
}

const AccommodationCard: React.FC<AccommodationCardProps> = ({ accommodation }) => {
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

  return (
    <Link href={`/accommodation/${accommodation.id}`}>
      <a className="accommodation-card">
        <div className="accommodation-image">
          <img
            src={accommodation.thumbnail_url || (accommodation.images && accommodation.images.length > 0 ? accommodation.images[0] : '/placeholder-room.jpg')}
            alt={accommodation.name}
          />
          {!accommodation.is_available && (
            <div className="unavailable-badge">예약마감</div>
          )}
          {accommodation.breakfast_included && (
            <div className="feature-badge">조식 포함</div>
          )}
        </div>

        <div className="accommodation-content">
          <div className="accommodation-header">
            <div>
              {accommodation.room_type && (
                <span className="room-type">{getRoomTypeLabel(accommodation.room_type)}</span>
              )}
              <h3 className="accommodation-name">{accommodation.name}</h3>
              {accommodation.vendor_name && (
                <p className="vendor-name">{accommodation.vendor_name}</p>
              )}
            </div>
          </div>

          <div className="accommodation-info">
            {accommodation.city && (
              <div className="info-item">
                <MapPin size={14} />
                <span>{accommodation.city}</span>
              </div>
            )}
            <div className="info-item">
              <Users size={14} />
              <span>최대 {accommodation.capacity}명</span>
            </div>
            {accommodation.bed_type && (
              <div className="info-item">
                <span>{getBedTypeLabel(accommodation.bed_type)}</span>
                {accommodation.bed_count > 1 && <span> x {accommodation.bed_count}</span>}
              </div>
            )}
            {accommodation.size_sqm && (
              <div className="info-item">
                <span>{accommodation.size_sqm}㎡</span>
              </div>
            )}
          </div>

          <div className="amenities">
            {accommodation.wifi_available && (
              <div className="amenity-icon" title="WiFi">
                <Wifi size={16} />
              </div>
            )}
            {accommodation.breakfast_included && (
              <div className="amenity-icon" title="조식">
                <Coffee size={16} />
              </div>
            )}
            {accommodation.has_balcony && (
              <div className="amenity-icon" title="발코니">
                <span>🌅</span>
              </div>
            )}
            {accommodation.tv_available && (
              <div className="amenity-icon" title="TV">
                <Tv size={16} />
              </div>
            )}
            {accommodation.air_conditioning && (
              <div className="amenity-icon" title="에어컨">
                <span>❄️</span>
              </div>
            )}
          </div>

          <div className="accommodation-footer">
            <div className="price">
              <span className="price-label">1박</span>
              <span className="price-value">
                {accommodation.base_price_per_night.toLocaleString()}원
              </span>
              {accommodation.weekend_surcharge && accommodation.weekend_surcharge > 0 && (
                <span className="weekend-info">
                  주말 +{accommodation.weekend_surcharge.toLocaleString()}원
                </span>
              )}
            </div>
            {accommodation.total_bookings && accommodation.total_bookings > 0 && (
              <div className="booking-count">
                예약 {accommodation.total_bookings}건
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .accommodation-card {
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

          .accommodation-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          }

          .accommodation-image {
            position: relative;
            width: 100%;
            height: 200px;
            overflow: hidden;
            background: #f3f4f6;
          }

          .accommodation-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
          }

          .accommodation-card:hover .accommodation-image img {
            transform: scale(1.05);
          }

          .unavailable-badge {
            position: absolute;
            top: 12px;
            left: 12px;
            background: rgba(239, 68, 68, 0.95);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
          }

          .feature-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            background: rgba(59, 130, 246, 0.95);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
          }

          .accommodation-content {
            padding: 16px;
          }

          .accommodation-header {
            margin-bottom: 12px;
          }

          .room-type {
            display: inline-block;
            background: #eff6ff;
            color: #1e40af;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 8px;
          }

          .accommodation-name {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .vendor-name {
            font-size: 13px;
            color: #6b7280;
          }

          .accommodation-info {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
          }

          .info-item {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 13px;
            color: #374151;
          }

          .info-item :global(svg) {
            color: #6b7280;
          }

          .amenities {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
          }

          .amenity-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: #f3f4f6;
            border-radius: 6px;
            color: #6b7280;
          }

          .accommodation-footer {
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
            font-size: 20px;
            font-weight: 700;
            color: #3b82f6;
          }

          .weekend-info {
            font-size: 11px;
            color: #f59e0b;
          }

          .booking-count {
            font-size: 12px;
            color: #6b7280;
          }

          @media (max-width: 768px) {
            .accommodation-name {
              font-size: 16px;
            }

            .price-value {
              font-size: 18px;
            }
          }
        `}</style>
      </a>
    </Link>
  );
};

export default AccommodationCard;
