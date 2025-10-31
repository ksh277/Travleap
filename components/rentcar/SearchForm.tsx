import React, { useState } from 'react';
import { Search, MapPin, Calendar, DollarSign, Filter, Car, Users } from 'lucide-react';

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
}

interface SearchFilters {
  keyword?: string;
  vehicle_class?: string;
  fuel_type?: string;
  transmission?: string;
  seating_capacity?: number;
  brand?: string;
  min_price?: number;
  max_price?: number;
  pickup_date?: string;
  dropoff_date?: string;
  sort_by?: string;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const [keyword, setKeyword] = useState('');
  const [vehicleClass, setVehicleClass] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [transmission, setTransmission] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState('');
  const [brand, setBrand] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    const filters: SearchFilters = {
      sort_by: sortBy
    };

    if (keyword) filters.keyword = keyword;
    if (vehicleClass) filters.vehicle_class = vehicleClass;
    if (fuelType) filters.fuel_type = fuelType;
    if (transmission) filters.transmission = transmission;
    if (seatingCapacity) filters.seating_capacity = parseInt(seatingCapacity);
    if (brand) filters.brand = brand;
    if (minPrice) filters.min_price = parseInt(minPrice);
    if (maxPrice) filters.max_price = parseInt(maxPrice);
    if (pickupDate) filters.pickup_date = pickupDate;
    if (dropoffDate) filters.dropoff_date = dropoffDate;

    onSearch(filters);
  };

  const handleReset = () => {
    setKeyword('');
    setVehicleClass('');
    setFuelType('');
    setTransmission('');
    setSeatingCapacity('');
    setBrand('');
    setMinPrice('');
    setMaxPrice('');
    setPickupDate('');
    setDropoffDate('');
    setSortBy('popular');
    onSearch({ sort_by: 'popular' });
  };

  return (
    <div className="search-form">
      <div className="search-main">
        <div className="search-input-group">
          <Search size={20} className="input-icon" />
          <input
            type="text"
            placeholder="차종, 브랜드, 키워드 검색..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
          <Filter size={18} />
          상세 필터
        </button>

        <button className="search-button" onClick={handleSearch}>
          검색
        </button>
      </div>

      {showFilters && (
        <div className="search-filters">
          <div className="filter-section">
            <h4>대여 기간</h4>
            <div className="date-row">
              <div className="date-group">
                <label>
                  <Calendar size={16} />
                  대여일
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </div>
              <div className="date-group">
                <label>
                  <Calendar size={16} />
                  반납일
                </label>
                <input
                  type="date"
                  value={dropoffDate}
                  onChange={(e) => setDropoffDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4>차량 조건</h4>
            <div className="filter-row">
              <div className="filter-group">
                <label>
                  <Car size={16} />
                  차량 등급
                </label>
                <select value={vehicleClass} onChange={(e) => setVehicleClass(e.target.value)}>
                  <option value="">전체</option>
                  <option value="economy">경차</option>
                  <option value="compact">소형</option>
                  <option value="midsize">중형</option>
                  <option value="fullsize">대형</option>
                  <option value="suv">SUV</option>
                  <option value="van">승합</option>
                  <option value="luxury">럭셔리</option>
                  <option value="sports">스포츠</option>
                </select>
              </div>

              <div className="filter-group">
                <label>브랜드</label>
                <select value={brand} onChange={(e) => setBrand(e.target.value)}>
                  <option value="">전체</option>
                  <option value="현대">현대</option>
                  <option value="기아">기아</option>
                  <option value="쉐보레">쉐보레</option>
                  <option value="르노삼성">르노삼성</option>
                  <option value="쌍용">쌍용</option>
                  <option value="벤츠">벤츠</option>
                  <option value="BMW">BMW</option>
                  <option value="아우디">아우디</option>
                  <option value="렉서스">렉서스</option>
                  <option value="테슬라">테슬라</option>
                </select>
              </div>

              <div className="filter-group">
                <label>
                  <Users size={16} />
                  최소 인승
                </label>
                <select value={seatingCapacity} onChange={(e) => setSeatingCapacity(e.target.value)}>
                  <option value="">전체</option>
                  <option value="4">4인승 이상</option>
                  <option value="5">5인승 이상</option>
                  <option value="7">7인승 이상</option>
                  <option value="9">9인승 이상</option>
                </select>
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label>연료 타입</label>
                <select value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                  <option value="">전체</option>
                  <option value="gasoline">휘발유</option>
                  <option value="diesel">경유</option>
                  <option value="hybrid">하이브리드</option>
                  <option value="electric">전기</option>
                  <option value="lpg">LPG</option>
                </select>
              </div>

              <div className="filter-group">
                <label>변속기</label>
                <select value={transmission} onChange={(e) => setTransmission(e.target.value)}>
                  <option value="">전체</option>
                  <option value="automatic">자동</option>
                  <option value="manual">수동</option>
                </select>
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4>가격 및 정렬</h4>
            <div className="filter-row">
              <div className="filter-group">
                <label>
                  <DollarSign size={16} />
                  가격 (1일)
                </label>
                <div className="price-inputs">
                  <input
                    type="number"
                    placeholder="최소"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <span>~</span>
                  <input
                    type="number"
                    placeholder="최대"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-group">
                <label>정렬</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="popular">인기순</option>
                  <option value="price_low">가격 낮은순</option>
                  <option value="price_high">가격 높은순</option>
                  <option value="newest">최신순</option>
                </select>
              </div>
            </div>
          </div>

          <div className="filter-actions">
            <button className="reset-button" onClick={handleReset}>
              초기화
            </button>
            <button className="apply-button" onClick={handleSearch}>
              적용
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .search-form {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }

        .search-main {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .search-input-group {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 16px;
          color: #9ca3af;
          pointer-events: none;
        }

        .search-input-group input {
          width: 100%;
          padding: 12px 16px 12px 48px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 15px;
          transition: all 0.2s;
        }

        .search-input-group input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .filter-toggle {
          padding: 12px 20px;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .filter-toggle:hover {
          background: #e5e7eb;
        }

        .search-button {
          padding: 12px 32px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .search-button:hover {
          background: #2563eb;
        }

        .search-filters {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .filter-section {
          margin-bottom: 24px;
        }

        .filter-section:last-of-type {
          margin-bottom: 16px;
        }

        .filter-section h4 {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 12px;
        }

        .date-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .date-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .date-group label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .date-group input[type="date"] {
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
        }

        .date-group input[type="date"]:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .filter-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .filter-row:last-child {
          margin-bottom: 0;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-group label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .filter-group select,
        .filter-group input {
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
        }

        .filter-group select:focus,
        .filter-group input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .price-inputs {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .price-inputs input {
          flex: 1;
        }

        .price-inputs span {
          color: #9ca3af;
        }

        .filter-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .reset-button,
        .apply-button {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .reset-button {
          background: #f3f4f6;
          color: #374151;
        }

        .reset-button:hover {
          background: #e5e7eb;
        }

        .apply-button {
          background: #3b82f6;
          color: white;
        }

        .apply-button:hover {
          background: #2563eb;
        }

        @media (max-width: 768px) {
          .search-main {
            flex-direction: column;
          }

          .filter-row,
          .date-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default SearchForm;
