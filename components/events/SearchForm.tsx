import React, { useState } from 'react';
import { Search, MapPin, Filter, Calendar } from 'lucide-react';

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
}

interface SearchFilters {
  keyword?: string;
  city?: string;
  event_type?: string;
  category?: string;
  from_date?: string;
  to_date?: string;
  wheelchair_accessible?: string;
  parking_available?: string;
  sort_by?: string;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [eventType, setEventType] = useState('');
  const [category, setCategory] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [parkingAvailable, setParkingAvailable] = useState(false);
  const [sortBy, setSortBy] = useState('start_date');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    const filters: SearchFilters = {
      sort_by: sortBy
    };

    if (keyword) filters.keyword = keyword;
    if (city) filters.city = city;
    if (eventType) filters.event_type = eventType;
    if (category) filters.category = category;
    if (fromDate) filters.from_date = fromDate;
    if (toDate) filters.to_date = toDate;
    if (wheelchairAccessible) filters.wheelchair_accessible = 'true';
    if (parkingAvailable) filters.parking_available = 'true';

    onSearch(filters);
  };

  const handleReset = () => {
    setKeyword('');
    setCity('');
    setEventType('');
    setCategory('');
    setFromDate('');
    setToDate('');
    setWheelchairAccessible(false);
    setParkingAvailable(false);
    setSortBy('start_date');
    onSearch({ sort_by: 'start_date' });
  };

  return (
    <div className="search-form">
      <div className="search-main">
        <div className="search-input-group">
          <Search size={20} className="input-icon" />
          <input
            type="text"
            placeholder="이벤트명, 장소 검색..."
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
                  <option value="대구">대구</option>
                  <option value="인천">인천</option>
                  <option value="광주">광주</option>
                  <option value="대전">대전</option>
                  <option value="울산">울산</option>
                  <option value="세종">세종</option>
                </select>
              </div>

              <div className="filter-group">
                <label>이벤트 유형</label>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                  <option value="">전체</option>
                  <option value="콘서트">콘서트</option>
                  <option value="페스티벌">페스티벌</option>
                  <option value="전시회">전시회</option>
                  <option value="스포츠">스포츠</option>
                  <option value="컨퍼런스">컨퍼런스</option>
                  <option value="공연">공연</option>
                  <option value="뮤지컬">뮤지컬</option>
                  <option value="연극">연극</option>
                  <option value="세미나">세미나</option>
                </select>
              </div>

              <div className="filter-group">
                <label>카테고리</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">전체</option>
                  <option value="음악">음악</option>
                  <option value="예술">예술</option>
                  <option value="스포츠">스포츠</option>
                  <option value="교육">교육</option>
                  <option value="비즈니스">비즈니스</option>
                </select>
              </div>

              <div className="filter-group">
                <label>정렬</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="start_date">날짜순</option>
                  <option value="popular">인기순</option>
                  <option value="rating">평점순</option>
                  <option value="newest">최신순</option>
                </select>
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4>날짜 필터</h4>
            <div className="filter-row">
              <div className="filter-group">
                <label>
                  <Calendar size={16} />
                  시작일
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>
                  <Calendar size={16} />
                  종료일
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4>편의시설</h4>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={wheelchairAccessible}
                  onChange={(e) => setWheelchairAccessible(e.target.checked)}
                />
                <span>휠체어 가능</span>
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
          border-color: #9333ea;
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
          background: #9333ea;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .search-button:hover {
          background: #7e22ce;
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

        .filter-group select,
        .filter-group input[type="date"] {
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
        }

        .filter-group select:focus,
        .filter-group input[type="date"]:focus {
          outline: none;
          border-color: #9333ea;
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
          background: #9333ea;
          color: white;
        }

        .apply-button:hover {
          background: #7e22ce;
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
