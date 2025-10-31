import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import SearchForm from '../../components/attractions/SearchForm';
import AttractionCard from '../../components/attractions/AttractionCard';
import { Loader } from 'lucide-react';

interface Attraction {
  id: number;
  attraction_code: string;
  name: string;
  description: string;
  type: string;
  category: string;
  address: string;
  phone: string;
  operating_hours: any;
  admission_fee_adult: number;
  admission_fee_child: number;
  parking_available: boolean;
  wheelchair_accessible: boolean;
  thumbnail_url: string;
  images: string[];
  estimated_visit_duration_minutes: number;
  city: string;
  rating_avg: number;
  rating_count: number;
  total_tickets_sold: number;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

const AttractionsListPage = () => {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false
  });
  const [filters, setFilters] = useState<any>({});

  const loadAttractions = async (newFilters: any = {}, offset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...newFilters,
        limit: '20',
        offset: offset.toString()
      });

      const response = await fetch(`/api/attractions/list?${params}`);
      const data = await response.json();

      if (data.success) {
        setAttractions(data.attractions || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('관광지 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttractions();
  }, []);

  const handleSearch = (newFilters: any) => {
    setFilters(newFilters);
    loadAttractions(newFilters, 0);
  };

  const handleLoadMore = () => {
    const newOffset = pagination.offset + pagination.limit;
    loadAttractions(filters, newOffset);
  };

  return (
    <>
      <Head>
        <title>관광지 검색 - Travleap</title>
        <meta name="description" content="전국의 다양한 관광지를 검색하고 입장권을 구매하세요" />
      </Head>

      <div className="attractions-list-page">
        <div className="hero-section">
          <h1>특별한 순간을 만나다</h1>
          <p>전국의 멋진 관광지를 둘러보세요</p>
        </div>

        <div className="container">
          <SearchForm onSearch={handleSearch} />

          {loading && attractions.length === 0 ? (
            <div className="loading-state">
              <Loader className="spinner" size={48} />
              <p>관광지를 불러오는 중...</p>
            </div>
          ) : attractions.length === 0 ? (
            <div className="empty-state">
              <p>검색 결과가 없습니다.</p>
              <p className="empty-hint">다른 검색어나 필터를 시도해보세요.</p>
            </div>
          ) : (
            <>
              <div className="results-header">
                <h2>관광지 목록</h2>
                <span className="result-count">총 {pagination.total}개</span>
              </div>

              <div className="attraction-grid">
                {attractions.map((attraction) => (
                  <AttractionCard key={attraction.id} attraction={attraction} />
                ))}
              </div>

              {pagination.has_more && (
                <div className="load-more">
                  <button onClick={handleLoadMore} disabled={loading}>
                    {loading ? '로딩 중...' : '더 보기'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <style jsx>{`
          .attractions-list-page {
            min-height: 100vh;
            background: #f9fafb;
          }

          .hero-section {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 80px 20px 60px;
            text-align: center;
          }

          .hero-section h1 {
            font-size: 48px;
            font-weight: 800;
            margin-bottom: 16px;
          }

          .hero-section p {
            font-size: 20px;
            opacity: 0.95;
          }

          .container {
            max-width: 1200px;
            margin: -40px auto 0;
            padding: 0 20px 60px;
          }

          .loading-state {
            text-align: center;
            padding: 80px 20px;
          }

          .spinner {
            animation: spin 1s linear infinite;
            color: #10b981;
            margin-bottom: 16px;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          .loading-state p {
            color: #6b7280;
            font-size: 16px;
          }

          .empty-state {
            text-align: center;
            padding: 80px 20px;
          }

          .empty-state p {
            font-size: 18px;
            color: #6b7280;
            margin-bottom: 8px;
          }

          .empty-hint {
            font-size: 14px;
            color: #9ca3af;
          }

          .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }

          .results-header h2 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
          }

          .result-count {
            font-size: 15px;
            color: #6b7280;
          }

          .attraction-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 24px;
            margin-bottom: 40px;
          }

          .load-more {
            text-align: center;
          }

          .load-more button {
            padding: 14px 48px;
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            color: #374151;
            cursor: pointer;
            transition: all 0.2s;
          }

          .load-more button:hover:not(:disabled) {
            border-color: #10b981;
            color: #10b981;
          }

          .load-more button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          @media (max-width: 768px) {
            .hero-section h1 {
              font-size: 32px;
            }

            .hero-section p {
              font-size: 16px;
            }

            .attraction-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default AttractionsListPage;
