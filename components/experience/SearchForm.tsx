import React, { useState } from 'react';
import { Search, MapPin, Filter } from 'lucide-react';

interface SearchFormProps {
  onSearch: (filters: SearchFilters) => void;
}

interface SearchFilters {
  keyword?: string;
  city?: string;
  experience_type?: string;
  category?: string;
  difficulty_level?: string;
  language?: string;
  min_price?: string;
  max_price?: string;
  sort_by?: string;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch }) => {
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [experienceType, setExperienceType] = useState('');
  const [category, setCategory] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState('');
  const [language, setLanguage] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    const filters: SearchFilters = {
      sort_by: sortBy
    };

    if (keyword) filters.keyword = keyword;
    if (city) filters.city = city;
    if (experienceType) filters.experience_type = experienceType;
    if (category) filters.category = category;
    if (difficultyLevel) filters.difficulty_level = difficultyLevel;
    if (language) filters.language = language;
    if (minPrice) filters.min_price = minPrice;
    if (maxPrice) filters.max_price = maxPrice;

    onSearch(filters);
  };

  const handleReset = () => {
    setKeyword('');
    setCity('');
    setExperienceType('');
    setCategory('');
    setDifficultyLevel('');
    setLanguage('');
    setMinPrice('');
    setMaxPrice('');
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
            placeholder="체험명, 지역 검색..."
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
                <label>체험 유형</label>
                <select value={experienceType} onChange={(e) => setExperienceType(e.target.value)}>
                  <option value="">전체</option>
                  <option value="쿠킹클래스">쿠킹클래스</option>
                  <option value="공예">공예</option>
                  <option value="스포츠">스포츠</option>
                  <option value="문화">문화</option>
                  <option value="자연">자연</option>
                  <option value="액티비티">액티비티</option>
                  <option value="웰니스">웰니스</option>
                  <option value="교육">교육</option>
                  <option value="투어">투어</option>
                </select>
              </div>

              <div className="filter-group">
                <label>카테고리</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">전체</option>
                  <option value="음식">음식</option>
                  <option value="예술">예술</option>
                  <option value="스포츠">스포츠</option>
                  <option value="자연">자연</option>
                  <option value="힐링">힐링</option>
                </select>
              </div>

              <div className="filter-group">
                <label>정렬</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="popular">인기순</option>
                  <option value="rating">평점순</option>
                  <option value="price_low">가격 낮은순</option>
                  <option value="price_high">가격 높은순</option>
                  <option value="newest">최신순</option>
                </select>
              </div>
            </div>
          </div>

          <div className="filter-section">
            <h4>상세 조건</h4>
            <div className="filter-row">
              <div className="filter-group">
                <label>난이도</label>
                <select value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value)}>
                  <option value="">전체</option>
                  <option value="초급">초급</option>
                  <option value="중급">중급</option>
                  <option value="고급">고급</option>
                </select>
              </div>

              <div className="filter-group">
                <label>언어</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="">전체</option>
                  <option value="한국어">한국어</option>
                  <option value="영어">영어</option>
                  <option value="중국어">중국어</option>
                  <option value="일본어">일본어</option>
                </select>
              </div>

              <div className="filter-group">
                <label>최소 가격</label>
                <input
                  type="number"
                  placeholder="최소 가격"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>최대 가격</label>
                <input
                  type="number"
                  placeholder="최대 가격"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
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

        .filter-group select,
        .filter-group input[type="number"] {
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
        }

        .filter-group select:focus,
        .filter-group input[type="number"]:focus {
          outline: none;
          border-color: #f59e0b;
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
