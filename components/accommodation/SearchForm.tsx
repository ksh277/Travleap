import React, { useState } from 'react';
import { Search, MapPin, Calendar, Users, DollarSign, Filter } from 'lucide-react';

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
}

interface SearchFilters {
  keyword?: string;
  city?: string;
  room_type?: string;
  min_price?: number;
  max_price?: number;
  checkin_date?: string;
  checkout_date?: string;
  guests?: number;
  amenities?: string;
  sort_by?: string;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [roomType, setRoomType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [checkinDate, setCheckinDate] = useState('');
  const [checkoutDate, setCheckoutDate] = useState('');
  const [guests, setGuests] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    const filters: SearchFilters = {
      sort_by: sortBy
    };

    if (keyword) filters.keyword = keyword;
    if (city) filters.city = city;
    if (roomType) filters.room_type = roomType;
    if (minPrice) filters.min_price = parseInt(minPrice);
    if (maxPrice) filters.max_price = parseInt(maxPrice);
    if (checkinDate) filters.checkin_date = checkinDate;
    if (checkoutDate) filters.checkout_date = checkoutDate;
    if (guests) filters.guests = parseInt(guests);
    if (amenities.length > 0) filters.amenities = amenities.join(',');

    onSearch(filters);
  };

  const handleReset = () => {
    setKeyword('');
    setCity('');
    setRoomType('');
    setMinPrice('');
    setMaxPrice('');
    setCheckinDate('');
    setCheckoutDate('');
    setGuests('');
    setAmenities([]);
    setSortBy('popular');
    onSearch({ sort_by: 'popular' });
  };

  const toggleAmenity = (amenity: string) => {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter(a => a !== amenity));
    } else {
      setAmenities([...amenities, amenity]);
    }
  };

  return (
    <div className="search-form">
      <div className="search-main">
        <div className="search-input-group">
          <Search size={20} className="input-icon" />
          <input
            type="text"
            placeholder="숙소명, 지역, 키워드 검색..."
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
            <h4>체크인/체크아웃</h4>
            <div className="date-row">
              <div className="date-group">
                <label>
                  <Calendar size={16} />
                  체크인
                </label>
                <input
                  type="date"
                  value={checkinDate}
                  onChange={(e) => setCheckinDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="date-group">
                <label>
                  <Calendar size={16} />
                  체크아웃
                </label>
                <input
                  type="date"
                  value={checkoutDate}
                  onChange={(e) => setCheckoutDate(e.target.value)}
                  min={checkinDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4>숙소 조건</h4>
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
                <label>객실 타입</label>
                <select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                  <option value="">전체</option>
                  <option value="single">싱글룸</option>
                  <option value="double">더블룸</option>
                  <option value="twin">트윈룸</option>
                  <option value="suite">스위트룸</option>
                  <option value="family">패밀리룸</option>
                  <option value="dormitory">도미토리</option>
                </select>
              </div>

              <div className="filter-group">
                <label>
                  <Users size={16} />
                  투숙 인원
                </label>
                <select value={guests} onChange={(e) => setGuests(e.target.value)}>
                  <option value="">전체</option>
                  <option value="1">1명</option>
                  <option value="2">2명</option>
                  <option value="3">3명</option>
                  <option value="4">4명</option>
                  <option value="5">5명 이상</option>
                </select>
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4>편의시설</h4>
            <div className="amenity-checkboxes">
              <label className="amenity-checkbox">
                <input
                  type="checkbox"
                  checked={amenities.includes('wifi')}
                  onChange={() => toggleAmenity('wifi')}
                />
                <span>WiFi</span>
              </label>
              <label className="amenity-checkbox">
                <input
                  type="checkbox"
                  checked={amenities.includes('breakfast')}
                  onChange={() => toggleAmenity('breakfast')}
                />
                <span>조식 포함</span>
              </label>
              <label className="amenity-checkbox">
                <input
                  type="checkbox"
                  checked={amenities.includes('balcony')}
                  onChange={() => toggleAmenity('balcony')}
                />
                <span>발코니</span>
              </label>
              <label className="amenity-checkbox">
                <input
                  type="checkbox"
                  checked={amenities.includes('tv')}
                  onChange={() => toggleAmenity('tv')}
                />
                <span>TV</span>
              </label>
              <label className="amenity-checkbox">
                <input
                  type="checkbox"
                  checked={amenities.includes('ac')}
                  onChange={() => toggleAmenity('ac')}
                />
                <span>에어컨</span>
              </label>
            </div>
          </div>

          <div className="filter-section">
            <h4>가격 및 정렬</h4>
            <div className="filter-row">
              <div className="filter-group">
                <label>
                  <DollarSign size={16} />
                  가격 (1박)
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
                  <option value="rating">평점순</option>
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

        .amenity-checkboxes {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .amenity-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .amenity-checkbox:hover {
          background: #f3f4f6;
        }

        .amenity-checkbox input[type="checkbox"] {
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

          .amenity-checkboxes {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default SearchForm;
