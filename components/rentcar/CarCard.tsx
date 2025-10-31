import React from 'react';
import Link from 'next/link';
import { Users, Fuel, Settings, Star, Shield } from 'lucide-react';

interface CarCardProps {
  car: {
    id: number;
    vehicle_code?: string;
    brand: string;
    model: string;
    year?: number;
    display_name?: string;
    vehicle_class: string;
    fuel_type: string;
    transmission: string;
    seating_capacity: number;
    door_count?: number;
    large_bags?: number;
    small_bags?: number;
    thumbnail_url?: string;
    fuel_efficiency_kmpl?: number;
    unlimited_mileage?: boolean;
    deposit_amount_krw: number;
    vendor_name?: string;
    vendor_rating?: number;
    total_bookings?: number;
    is_available?: boolean;
  };
}

const CarCard: React.FC<CarCardProps> = ({ car }) => {
  // 차량 클래스 한글 변환
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

  // 연료 타입 한글 변환
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

  // 변속기 타입 한글 변환
  const getTransmissionLabel = (transmission: string) => {
    const transMap: Record<string, string> = {
      'automatic': '자동',
      'manual': '수동'
    };
    return transMap[transmission] || transmission;
  };

  const carName = car.display_name || `${car.brand} ${car.model}`;
  const dailyRate = car.deposit_amount_krw || 50000; // 임시로 deposit_amount를 일일 요금으로 사용

  return (
    <Link href={`/rentcar/${car.id}`}>
      <a className="car-card">
        <div className="car-image">
          <img
            src={car.thumbnail_url || '/placeholder-car.jpg'}
            alt={carName}
          />
          {!car.is_available && (
            <div className="unavailable-badge">예약불가</div>
          )}
          {car.unlimited_mileage && (
            <div className="feature-badge">무제한 주행</div>
          )}
        </div>

        <div className="car-content">
          <div className="car-header">
            <div className="car-class">{getVehicleClassLabel(car.vehicle_class)}</div>
            {car.vendor_rating && (
              <div className="rating">
                <Star size={14} fill="#fbbf24" color="#fbbf24" />
                <span>{car.vendor_rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <h3 className="car-name">{carName}</h3>

          {car.vendor_name && (
            <p className="vendor-name">{car.vendor_name}</p>
          )}

          <div className="car-specs">
            <div className="spec-item">
              <Users size={16} />
              <span>{car.seating_capacity}인승</span>
            </div>
            <div className="spec-item">
              <Fuel size={16} />
              <span>{getFuelTypeLabel(car.fuel_type)}</span>
            </div>
            <div className="spec-item">
              <Settings size={16} />
              <span>{getTransmissionLabel(car.transmission)}</span>
            </div>
          </div>

          {(car.large_bags || car.small_bags) && (
            <div className="luggage-info">
              {car.large_bags && car.large_bags > 0 && (
                <span>큰 가방 {car.large_bags}개</span>
              )}
              {car.small_bags && car.small_bags > 0 && (
                <span>작은 가방 {car.small_bags}개</span>
              )}
            </div>
          )}

          {car.fuel_efficiency_kmpl && (
            <div className="efficiency">
              연비: {car.fuel_efficiency_kmpl}km/L
            </div>
          )}

          <div className="car-footer">
            <div className="price">
              <span className="price-label">1일</span>
              <span className="price-value">
                {dailyRate.toLocaleString()}원
              </span>
            </div>
            {car.total_bookings && car.total_bookings > 0 && (
              <div className="booking-count">
                예약 {car.total_bookings}건
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .car-card {
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

          .car-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          }

          .car-image {
            position: relative;
            width: 100%;
            height: 200px;
            overflow: hidden;
            background: #f3f4f6;
          }

          .car-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
          }

          .car-card:hover .car-image img {
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

          .car-content {
            padding: 16px;
          }

          .car-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .car-class {
            display: inline-block;
            background: #eff6ff;
            color: #1e40af;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }

          .rating {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 14px;
            font-weight: 600;
            color: #111827;
          }

          .car-name {
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
            margin-bottom: 12px;
          }

          .car-specs {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
          }

          .spec-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: #374151;
          }

          .spec-item :global(svg) {
            color: #6b7280;
          }

          .luggage-info {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
          }

          .efficiency {
            font-size: 12px;
            color: #10b981;
            font-weight: 600;
            margin-bottom: 12px;
          }

          .car-footer {
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

          .booking-count {
            font-size: 12px;
            color: #6b7280;
          }

          @media (max-width: 768px) {
            .car-name {
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

export default CarCard;
