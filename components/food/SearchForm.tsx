import React, { useState } from 'react';
import { Search, MapPin, Filter } from 'lucide-react';

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
}

interface SearchFilters {
  keyword?: string;
  city?: string;
  cuisine_type?: string;
  accepts_reservations?: string;
  accepts_takeout?: string;
  accepts_delivery?: string;
  parking_available?: string;
  sort_by?: string;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [acceptsReservations, setAcceptsReservations] = useState(false);
  const [acceptsTakeout, setAcceptsTakeout] = useState(false);
  const [acceptsDelivery, setAcceptsDelivery] = useState(false);
  const [parkingAvailable, setParkingAvailable] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    const filters: SearchFilters = {
      sort_by: sortBy
    };

    if (keyword) filters.keyword = keyword;
    if (city) filters.city = city;
    if (cuisineType) filters.cuisine_type = cuisineType;
    if (acceptsReservations) filters.accepts_reservations = 'true';
    if (acceptsTakeout) filters.accepts_takeout = 'true';
    if (acceptsDelivery) filters.accepts_delivery = 'true';
    if (parkingAvailable) filters.parking_available = 'true';

    onSearch(filters);
  };

  const handleReset = () => {
    setKeyword('');
    setCity('');
    setCuisineType('');
    setAcceptsReservations(false);
    setAcceptsTakeout(false);
    setAcceptsDelivery(false);
    setParkingAvailable(false);
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
            placeholder="식당명, 음식 종류 검색..."
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
            <h4>기본 정보</h4>
            <div className="filter-row">
              <div className="filter-group">
                <label>
                  <MapPin size={16} />
                  지역
                </label>
                <select value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">전체</option>
                  <option value="서울">서울</option>
                  <option value="부산">부산</option>
                  <option value="제주">제주</option>
                  <option value="강릉">강릉</option>
                  <option value="전주">전주</option>
                  <option value="경주">경주</option>
                  <option value="속초">속초</option>
                  <option value="여수">여수</option>
                </select>
              </div>

              <div className="filter-group">
                <label>음식 종류</label>
                <select value={cuisineType} onChange={(e) => setCuisineType(e.target.value)}>
                  <option value="">전체</option>
                  <option value="한식">한식</option>
                  <option value="중식">중식</option>
                  <option value="일식">일식</option>
                  <option value="양식">양식</option>
                  <option value="카페">카페</option>
                  <option value="분식">분식</option>
                  <option value="치킨">치킨</option>
                  <option value="피자">피자</option>
                  <option value="패스트푸드">패스트푸드</option>
                </select>
              </div>

              <div className="filter-group">
                <label>정렬</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="popular">인기순</option>
                  <option value="rating">평점순</option>
                  <option value="newest">최신순</option>
                </select>
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4>서비스</h4>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={acceptsReservations}
                  onChange={(e) => setAcceptsReservations(e.target.checked)}
                />
                <span>예약 가능</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={acceptsTakeout}
                  onChange={(e) => setAcceptsTakeout(e.target.checked)}
                />
                <span>포장 가능</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={acceptsDelivery}
                  onChange={(e) => setAcceptsDelivery(e.target.checked)}
                />
                <span>배달 가능</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={parkingAvailable}
                  onChange={(e) => setParkingAvailable(e.target.checked)}
                />
                <span>주차 가능</span>
              </label>
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
          border-color: #f59e0b;
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
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .search-button:hover {
          background: #d97706;
        }

        .search-filters {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .filter-section {
          margin-bottom: 20px;
        }

        .filter-section h4 {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 12px;
        }

        .filter-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
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

        .filter-group select {
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
        }

        .filter-group select:focus {
          outline: none;
          border-color: #f59e0b;
        }

        .checkbox-group {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          cursor: pointer;
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
          background: #f59e0b;
          color: white;
        }

        .apply-button:hover {
          background: #d97706;
        }

        @media (max-width: 768px) {
          .search-main {
            flex-direction: column;
          }

          .filter-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default SearchForm;
