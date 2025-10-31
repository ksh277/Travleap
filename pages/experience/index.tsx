import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import SearchForm from '../../components/experience/SearchForm';
import ExperienceCard from '../../components/experience/ExperienceCard';
import { Loader } from 'lucide-react';

interface Experience {
  id: number;
  experience_code: string;
  name: string;
  description: string;
  experience_type: string;
  category: string;
  location: string;
  city: string;
  duration_minutes: number;
  min_participants: number;
  max_participants: number;
  price_per_person_krw: number;
  child_price_krw: number;
  language: string;
  difficulty_level: string;
  age_restriction: string;
  thumbnail_url: string;
  images: string[];
  rating_avg: number;
  rating_count: number;
  total_bookings: number;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

const ExperienceListPage = () => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false
  });
  const [filters, setFilters] = useState<any>({});

  const loadExperiences = async (newFilters: any = {}, offset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...newFilters,
        limit: '20',
        offset: offset.toString()
      });

      const response = await fetch(`/api/experience/list?${params}`);
      const data = await response.json();

      if (data.success) {
        setExperiences(data.experiences || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('체험 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExperiences();
  }, []);

  const handleSearch = (newFilters: any) => {
    setFilters(newFilters);
    loadExperiences(newFilters, 0);
  };

  const handleLoadMore = () => {
    const newOffset = pagination.offset + pagination.limit;
    loadExperiences(filters, newOffset);
  };

  return (
    <>
      <Head>
        <title>체험 검색 - Travleap</title>
        <meta name="description" content="특별한 체험 활동을 찾아보세요" />
      </Head>

      <div className="experience-list-page">
        <div className="hero-section">
          <h1>새로운 체험을 시작하다</h1>
          <p>다양한 체험 활동과 클래스를 만나보세요</p>
        </div>

        <div className="container">
          <SearchForm onSearch={handleSearch} />

          {loading && experiences.length === 0 ? (
            <div className="loading-state">
              <Loader className="spinner" size={48} />
              <p>체험을 불러오는 중...</p>
            </div>
          ) : experiences.length === 0 ? (
            <div className="empty-state">
              <p>검색 결과가 없습니다.</p>
              <p className="empty-hint">다른 검색어나 필터를 시도해보세요.</p>
            </div>
          ) : (
            <>
              <div className="results-header">
                <h2>체험 목록</h2>
                <span className="result-count">총 {pagination.total}개</span>
              </div>

              <div className="experience-grid">
                {experiences.map((experience) => (
                  <ExperienceCard key={experience.id} experience={experience} />
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
          .experience-list-page {
            min-height: 100vh;
            background: #f9fafb;
          }

          .hero-section {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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
            color: #f59e0b;
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

          .experience-grid {
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
            border-color: #f59e0b;
            color: #f59e0b;
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

            .experience-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default ExperienceListPage;
