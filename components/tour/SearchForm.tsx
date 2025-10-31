import React, { useState } from 'react';
import { Search, MapPin, Calendar, DollarSign, Filter } from 'lucide-react';

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
}

interface SearchFilters {
  keyword?: string;
  location?: string;
  min_price?: number;
  max_price?: number;
  duration_days?: number;
  sort_by?: string;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    const filters: SearchFilters = {
      sort_by: sortBy
    };

    if (keyword) filters.keyword = keyword;
    if (location) filters.location = location;
    if (minPrice) filters.min_price = parseInt(minPrice);
    if (maxPrice) filters.max_price = parseInt(maxPrice);
    if (duration) filters.duration_days = parseInt(duration);

    onSearch(filters);
  };

  const handleReset = () => {
    setKeyword('');
    setLocation('');
    setMinPrice('');
    setMaxPrice('');
    setDuration('');
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
            placeholder="투어명, 지역, 키워드 검색..."
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
          <div className="filter-row">
            <div className="filter-group">
              <label>
                <MapPin size={16} />
                지역
              </label>
              <select value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="">전체</option>
                <option value="제주">제주</option>
                <option value="서울">서울</option>
                <option value="부산">부산</option>
                <option value="강릉">강릉</option>
                <option value="전주">전주</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <Calendar size={16} />
                기간
              </label>
              <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="">전체</option>
                <option value="1">당일</option>
                <option value="2">1박 2일</option>
                <option value="3">2박 3일</option>
                <option value="4">3박 4일</option>
                <option value="5">4박 5일 이상</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <DollarSign size={16} />
                가격 (1인)
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

        .filter-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
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

          .filter-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default SearchForm;
