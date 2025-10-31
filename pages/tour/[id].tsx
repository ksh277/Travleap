import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Calendar, Users, Clock, MapPin, Star, CheckCircle, XCircle, Info } from 'lucide-react';

interface TourPackage {
  id: number;
  package_name: string;
  description: string;
  duration_days: number;
  duration_nights: number;
  price_adult_krw: number;
  price_child_krw: number;
  price_infant_krw: number;
  thumbnail_url: string;
  images: string[];
  itinerary: Array<{
    day: number;
    title: string;
    activities: string[];
  }>;
  included: string[];
  excluded: string[];
  meeting_point: string;
  meeting_time: string;
  min_participants: number;
  max_participants: number;
  difficulty: string;
  tags: string[];
  location: string;
  rating_avg: number;
  rating_count: number;
  available_schedules: number;
}

interface Schedule {
  id: number;
  departure_date: string;
  departure_time: string;
  max_participants: number;
  current_participants: number;
  available_seats: number;
  is_available: boolean;
  is_almost_full: boolean;
  price_adult_krw: number;
  price_child_krw: number;
  guide_name: string;
}

const TourDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [tour, setTour] = useState<TourPackage | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    if (id) {
      loadTourDetail();
      loadSchedules();
    }
  }, [id]);

  const loadTourDetail = async () => {
    try {
      const response = await fetch(`/api/tour/packages?id=${id}`);
      const data = await response.json();

      if (data.success) {
        setTour(data.package);
      }
    } catch (error) {
      console.error('투어 상세 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      const response = await fetch(`/api/tour/schedules?package_id=${id}`);
      const data = await response.json();

      if (data.success) {
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('일정 로드 실패:', error);
    }
  };

  const handleBooking = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    // TODO: 예약 모달 열기
    alert('예약 기능은 곧 추가됩니다!');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>투어 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="error-container">
        <h2>투어를 찾을 수 없습니다</h2>
        <button onClick={() => router.push('/tour')}>목록으로 돌아가기</button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{tour.package_name} - Travleap</title>
        <meta name="description" content={tour.description} />
      </Head>

      <div className="tour-detail-page">
        {/* 이미지 갤러리 */}
        <div className="image-gallery">
          <img
            src={tour.thumbnail_url || tour.images[0] || '/placeholder-tour.jpg'}
            alt={tour.package_name}
            className="main-image"
          />
        </div>

        <div className="container">
          <div className="detail-layout">
            {/* 왼쪽: 투어 정보 */}
            <div className="tour-info">
              {/* 헤더 */}
              <div className="tour-header">
                <div className="location-badge">
                  <MapPin size={16} />
                  {tour.location}
                </div>
                <h1>{tour.package_name}</h1>
                <div className="tour-meta">
                  {tour.rating_avg > 0 && (
                    <div className="rating">
                      <Star size={18} fill="#fbbf24" color="#fbbf24" />
                      <span>{tour.rating_avg.toFixed(1)}</span>
                      <span className="review-count">({tour.rating_count} 리뷰)</span>
                    </div>
                  )}
                  <div className="duration">
                    <Clock size={16} />
                    {tour.duration_days}일 {tour.duration_nights}박
                  </div>
                  <div className="difficulty">
                    난이도: {tour.difficulty === 'easy' ? '쉬움' : tour.difficulty === 'moderate' ? '보통' : '어려움'}
                  </div>
                </div>
                {tour.tags && tour.tags.length > 0 && (
                  <div className="tags">
                    {tour.tags.map((tag, index) => (
                      <span key={index} className="tag">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* 설명 */}
              <section className="section">
                <h2>투어 소개</h2>
                <p className="description">{tour.description}</p>
              </section>

              {/* 일정표 */}
              {tour.itinerary && tour.itinerary.length > 0 && (
                <section className="section">
                  <h2>일정표</h2>
                  <div className="itinerary">
                    {tour.itinerary.map((day, index) => (
                      <div key={index} className="day-item">
                        <div className="day-number">Day {day.day}</div>
                        <div className="day-content">
                          <h3>{day.title}</h3>
                          <ul>
                            {day.activities.map((activity, actIndex) => (
                              <li key={actIndex}>{activity}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 포함/불포함 사항 */}
              <section className="section">
                <div className="inclusion-grid">
                  {tour.included && tour.included.length > 0 && (
                    <div className="inclusion-box">
                      <h3>
                        <CheckCircle size={20} color="#10b981" />
                        포함 사항
                      </h3>
                      <ul>
                        {tour.included.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {tour.excluded && tour.excluded.length > 0 && (
                    <div className="inclusion-box">
                      <h3>
                        <XCircle size={20} color="#ef4444" />
                        불포함 사항
                      </h3>
                      <ul>
                        {tour.excluded.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>

              {/* 미팅 포인트 */}
              {tour.meeting_point && (
                <section className="section">
                  <h2>집합 장소</h2>
                  <div className="meeting-info">
                    <Info size={18} />
                    <div>
                      <p><strong>장소:</strong> {tour.meeting_point}</p>
                      {tour.meeting_time && <p><strong>시간:</strong> {tour.meeting_time}</p>}
                    </div>
                  </div>
                </section>
              )}

              {/* 출발 일정 */}
              <section className="section">
                <h2>출발 일정 선택</h2>
                {schedules.length === 0 ? (
                  <div className="no-schedules">
                    <p>현재 예약 가능한 일정이 없습니다.</p>
                  </div>
                ) : (
                  <div className="schedules-list">
                    {schedules.map((schedule) => (
                      <div key={schedule.id} className="schedule-card">
                        <div className="schedule-info">
                          <div className="schedule-date">
                            <Calendar size={20} />
                            <div>
                              <strong>{schedule.departure_date}</strong>
                              <span>{schedule.departure_time}</span>
                            </div>
                          </div>
                          {schedule.guide_name && (
                            <div className="schedule-guide">
                              가이드: {schedule.guide_name}
                            </div>
                          )}
                          <div className="schedule-seats">
                            <Users size={16} />
                            <span>잔여 {schedule.available_seats}석 / {schedule.max_participants}석</span>
                            {schedule.is_almost_full && (
                              <span className="almost-full-badge">마감 임박</span>
                            )}
                          </div>
                        </div>
                        <div className="schedule-action">
                          <div className="schedule-price">
                            <span className="price-label">성인 1인</span>
                            <span className="price-value">
                              {(schedule.price_adult_krw || tour.price_adult_krw).toLocaleString()}원
                            </span>
                          </div>
                          <button
                            className="book-button"
                            onClick={() => handleBooking(schedule)}
                            disabled={!schedule.is_available}
                          >
                            {schedule.is_available ? '예약하기' : '예약 불가'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* 오른쪽: 가격 요약 (sticky) */}
            <div className="price-summary">
              <div className="price-card">
                <h3>가격 정보</h3>
                <div className="price-list">
                  <div className="price-item">
                    <span>성인 (1인)</span>
                    <strong>{tour.price_adult_krw.toLocaleString()}원</strong>
                  </div>
                  {tour.price_child_krw && (
                    <div className="price-item">
                      <span>아동 (1인)</span>
                      <strong>{tour.price_child_krw.toLocaleString()}원</strong>
                    </div>
                  )}
                  {tour.price_infant_krw && (
                    <div className="price-item">
                      <span>유아 (1인)</span>
                      <strong>{tour.price_infant_krw.toLocaleString()}원</strong>
                    </div>
                  )}
                </div>
                <div className="participants-info">
                  <Users size={18} />
                  <span>{tour.min_participants}명 ~ {tour.max_participants}명</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .tour-detail-page {
            min-height: 100vh;
            background: #f9fafb;
          }

          .loading-container,
          .error-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 20px;
          }

          .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .image-gallery {
            width: 100%;
            height: 500px;
            overflow: hidden;
          }

          .main-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .container {
            max-width: 1200px;
            margin: -80px auto 0;
            padding: 0 20px 60px;
            position: relative;
          }

          .detail-layout {
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 30px;
          }

          .tour-info {
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .tour-header {
            margin-bottom: 32px;
          }

          .location-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #dbeafe;
            color: #1e40af;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
          }

          .tour-header h1 {
            font-size: 32px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 16px;
            line-height: 1.3;
          }

          .tour-meta {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-bottom: 16px;
            font-size: 15px;
          }

          .rating {
            display: flex;
            align-items: center;
            gap: 6px;
            font-weight: 600;
          }

          .review-count {
            color: #6b7280;
            font-weight: 400;
          }

          .duration,
          .difficulty {
            display: flex;
            align-items: center;
            gap: 6px;
            color: #374151;
          }

          .tags {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .tag {
            background: #f3f4f6;
            color: #6b7280;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 13px;
          }

          .section {
            margin-top: 40px;
            padding-top: 40px;
            border-top: 1px solid #e5e7eb;
          }

          .section:first-of-type {
            margin-top: 0;
            padding-top: 0;
            border-top: none;
          }

          .section h2 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 20px;
          }

          .description {
            font-size: 16px;
            line-height: 1.7;
            color: #374151;
          }

          .itinerary {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .day-item {
            display: flex;
            gap: 20px;
          }

          .day-number {
            flex-shrink: 0;
            width: 60px;
            height: 60px;
            background: #3b82f6;
            color: white;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
          }

          .day-content h3 {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 12px;
          }

          .day-content ul {
            list-style: none;
            padding: 0;
          }

          .day-content li {
            padding: 8px 0;
            padding-left: 24px;
            position: relative;
            color: #374151;
          }

          .day-content li::before {
            content: '•';
            position: absolute;
            left: 8px;
            color: #3b82f6;
          }

          .inclusion-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
          }

          .inclusion-box {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
          }

          .inclusion-box h3 {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 12px;
          }

          .inclusion-box ul {
            list-style: none;
            padding: 0;
          }

          .inclusion-box li {
            padding: 6px 0;
            color: #374151;
          }

          .meeting-info {
            display: flex;
            gap: 12px;
            background: #eff6ff;
            padding: 16px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
          }

          .meeting-info p {
            margin: 4px 0;
            color: #374151;
          }

          .no-schedules {
            text-align: center;
            padding: 40px;
            background: #f9fafb;
            border-radius: 8px;
            color: #6b7280;
          }

          .schedules-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .schedule-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
            border: 2px solid transparent;
            transition: all 0.2s;
          }

          .schedule-card:hover {
            border-color: #3b82f6;
            background: white;
          }

          .schedule-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .schedule-date {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .schedule-date strong {
            font-size: 16px;
            color: #111827;
          }

          .schedule-date span {
            font-size: 14px;
            color: #6b7280;
          }

          .schedule-guide {
            font-size: 14px;
            color: #6b7280;
          }

          .schedule-seats {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #374151;
          }

          .almost-full-badge {
            background: #fef3c7;
            color: #92400e;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
          }

          .schedule-action {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 12px;
          }

          .schedule-price {
            text-align: right;
          }

          .price-label {
            display: block;
            font-size: 12px;
            color: #6b7280;
          }

          .price-value {
            display: block;
            font-size: 20px;
            font-weight: 700;
            color: #3b82f6;
          }

          .book-button {
            padding: 10px 24px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .book-button:hover:not(:disabled) {
            background: #2563eb;
          }

          .book-button:disabled {
            background: #d1d5db;
            cursor: not-allowed;
          }

          .price-summary {
            position: sticky;
            top: 20px;
            height: fit-content;
          }

          .price-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .price-card h3 {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 16px;
          }

          .price-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e5e7eb;
          }

          .price-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .price-item span {
            color: #6b7280;
          }

          .price-item strong {
            color: #111827;
            font-size: 18px;
          }

          .participants-info {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #6b7280;
            font-size: 14px;
          }

          @media (max-width: 968px) {
            .detail-layout {
              grid-template-columns: 1fr;
            }

            .price-summary {
              position: static;
            }

            .schedule-card {
              flex-direction: column;
              align-items: flex-start;
            }

            .schedule-action {
              width: 100%;
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default TourDetailPage;
