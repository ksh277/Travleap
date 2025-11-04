import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  MapPin,
  Calendar,
  Clock,
  Star,
  Users,
  Phone,
  Globe,
  ChevronLeft,
  ChevronRight,
  Loader,
  Plus,
  Minus,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  Check
} from 'lucide-react';

interface Experience {
  id: number;
  experience_code: string;
  name: string;
  description: string;
  experience_type: string;
  category: string;
  location: string;
  address: string;
  duration_minutes: number;
  min_participants: number;
  max_participants: number;
  price_per_person_krw: number;
  child_price_krw: number;
  time_slots: string[];
  language: string;
  difficulty_level: string;
  age_restriction: string;
  included_items: string[];
  excluded_items: string[];
  requirements: string[];
  what_to_bring: string;
  meeting_point: string;
  cancellation_policy: string;
  thumbnail_url: string;
  images: string[];
  instructor_name: string;
  instructor_bio: string;
  city: string;
  rating_avg: number;
  rating_count: number;
  total_bookings: number;
}

const ExperienceDetailPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [numAdults, setNumAdults] = useState(1);
  const [numChildren, setNumChildren] = useState(0);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (id) {
      loadExperience();
    }
  }, [id]);

  useEffect(() => {
    // Set default booking date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const loadExperience = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/experience/list?id=${id}`);
      const data = await response.json();

      if (data.success && data.experience) {
        setExperience(data.experience);
        // Set default time slot
        if (data.experience.time_slots && data.experience.time_slots.length > 0) {
          setBookingTime(data.experience.time_slots[0]);
        }
      }
    } catch (error) {
      console.error('체험 정보 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalParticipants = () => {
    return numAdults + numChildren;
  };

  const getTotalPrice = () => {
    if (!experience) return 0;
    const adultPrice = experience.price_per_person_krw * numAdults;
    const childPrice = (experience.child_price_krw || experience.price_per_person_krw) * numChildren;
    return adultPrice + childPrice;
  };

  const handleBooking = async () => {
    if (!experience) return;

    const totalParticipants = getTotalParticipants();

    if (totalParticipants < experience.min_participants) {
      alert(`최소 ${experience.min_participants}명 이상 예약해야 합니다.`);
      return;
    }

    if (!bookingDate || !bookingTime) {
      alert('날짜와 시간을 선택해주세요.');
      return;
    }

    // 사용자 정보 가져오기
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!currentUser?.id) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    setBooking(true);

    try {
      const response = await fetch('/api/experience/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience_id: experience.id,
          user_id: currentUser.id,
          experience_date: bookingDate,
          experience_time: bookingTime,
          num_adults: numAdults,
          num_children: numChildren,
          total_krw: getTotalPrice()
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`예약이 완료되었습니다! 예약번호: ${data.booking_number}`);
        router.push('/my/bookings');
      } else {
        alert(data.error || '예약에 실패했습니다.');
      }
    } catch (error) {
      console.error('예약 실패:', error);
      alert('예약에 실패했습니다.');
    } finally {
      setBooking(false);
    }
  };

  const nextImage = () => {
    if (!experience) return;
    setCurrentImageIndex((prev) =>
      prev === experience.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    if (!experience) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? experience.images.length - 1 : prev - 1
    );
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      '쿠킹클래스': '👨‍🍳 쿠킹클래스',
      '공예': '🎨 공예',
      '스포츠': '⚽ 스포츠',
      '문화': '🎭 문화',
      '자연': '🌿 자연',
      '액티비티': '🏄 액티비티',
      '웰니스': '🧘 웰니스',
      '교육': '📚 교육',
      '투어': '🚶 투어'
    };
    return typeMap[type] || type;
  };

  const getDifficultyColor = (level: string) => {
    const colorMap: Record<string, string> = {
      '초급': '#10b981',
      '중급': '#f59e0b',
      '고급': '#ef4444'
    };
    return colorMap[level] || '#6b7280';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Loader className="spinner" size={48} />
        <p>체험 정보를 불러오는 중...</p>
        <style jsx>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            gap: 16px;
          }
          .spinner {
            animation: spin 1s linear infinite;
            color: #f59e0b;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="error-container">
        <p>체험을 찾을 수 없습니다.</p>
        <button onClick={() => router.push('/experience')}>목록으로 돌아가기</button>
        <style jsx>{`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            gap: 16px;
          }
          button {
            padding: 12px 24px;
            background: #f59e0b;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
          }
        `}</style>
      </div>
    );
  }

  const images = experience.images && experience.images.length > 0
    ? experience.images
    : [experience.thumbnail_url || '/placeholder-experience.jpg'];

  return (
    <>
      <Head>
        <title>{experience.name} - Travleap</title>
        <meta name="description" content={experience.description} />
      </Head>

      <div className="experience-detail-page">
        {/* Image Gallery */}
        <div className="image-gallery">
          <div className="main-image">
            <img src={images[currentImageIndex]} alt={experience.name} />
            {images.length > 1 && (
              <>
                <button className="nav-button prev" onClick={prevImage}>
                  <ChevronLeft size={24} />
                </button>
                <button className="nav-button next" onClick={nextImage}>
                  <ChevronRight size={24} />
                </button>
                <div className="image-indicator">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="thumbnail-list">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`thumbnail ${idx === currentImageIndex ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(idx)}
                >
                  <img src={img} alt={`${experience.name} ${idx + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="content-container">
          <div className="main-content">
            {/* Header */}
            <div className="experience-header">
              <div className="badges">
                <div className="type-badge">{getTypeLabel(experience.experience_type)}</div>
                {experience.difficulty_level && (
                  <div
                    className="difficulty-badge"
                    style={{ background: getDifficultyColor(experience.difficulty_level) }}
                  >
                    {experience.difficulty_level}
                  </div>
                )}
              </div>
              <h1>{experience.name}</h1>
              {experience.rating_avg > 0 && (
                <div className="rating">
                  <Star size={20} fill="#f59e0b" color="#f59e0b" />
                  <span className="rating-value">{experience.rating_avg.toFixed(1)}</span>
                  <span className="rating-count">({experience.rating_count}개 리뷰)</span>
                </div>
              )}
            </div>

            {/* Quick Info */}
            <div className="quick-info">
              <div className="info-item">
                <Clock size={18} />
                <span>{formatDuration(experience.duration_minutes)}</span>
              </div>
              {experience.location && (
                <div className="info-item">
                  <MapPin size={18} />
                  <span>{experience.location}</span>
                </div>
              )}
              <div className="info-item">
                <Users size={18} />
                <span>
                  {experience.min_participants}~
                  {experience.max_participants || '∞'}명
                </span>
              </div>
              {experience.total_bookings > 0 && (
                <div className="info-item">
                  <TrendingUp size={18} />
                  <span>{experience.total_bookings}명 예약</span>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="features">
              {experience.language && (
                <span className="feature">🌐 {experience.language}</span>
              )}
              {experience.age_restriction && (
                <span className="feature">🔞 {experience.age_restriction}</span>
              )}
            </div>

            {/* Description */}
            <section className="section">
              <h2>체험 소개</h2>
              <p className="description">{experience.description}</p>
            </section>

            {/* Included Items */}
            {experience.included_items && experience.included_items.length > 0 && (
              <section className="section">
                <h2>포함 사항</h2>
                <ul className="items-list included">
                  {experience.included_items.map((item, idx) => (
                    <li key={idx}>
                      <Check size={16} />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Excluded Items */}
            {experience.excluded_items && experience.excluded_items.length > 0 && (
              <section className="section">
                <h2>불포함 사항</h2>
                <ul className="items-list excluded">
                  {experience.excluded_items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Requirements */}
            {experience.requirements && experience.requirements.length > 0 && (
              <section className="section">
                <h2>참가 요구사항</h2>
                <ul className="items-list">
                  {experience.requirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* What to Bring */}
            {experience.what_to_bring && (
              <section className="section">
                <h2>준비물</h2>
                <p>{experience.what_to_bring}</p>
              </section>
            )}

            {/* Meeting Point */}
            {experience.meeting_point && (
              <section className="section">
                <h2>만남 장소</h2>
                <div className="meeting-point">
                  <MapPin size={18} />
                  <p>{experience.meeting_point}</p>
                </div>
              </section>
            )}

            {/* Instructor */}
            {experience.instructor_name && (
              <section className="section">
                <h2>강사 소개</h2>
                <div className="instructor">
                  <h3>{experience.instructor_name}</h3>
                  {experience.instructor_bio && <p>{experience.instructor_bio}</p>}
                </div>
              </section>
            )}

            {/* Cancellation Policy */}
            {experience.cancellation_policy && (
              <section className="section">
                <h2>취소 정책</h2>
                <div className="cancellation-policy">
                  <AlertCircle size={18} />
                  <p>{experience.cancellation_policy}</p>
                </div>
              </section>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="sidebar">
            <div className="booking-card">
              <h3>예약하기</h3>

              {/* Date Selection */}
              <div className="form-group">
                <label>
                  <Calendar size={16} />
                  날짜
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Time Selection */}
              {experience.time_slots && experience.time_slots.length > 0 && (
                <div className="form-group">
                  <label>
                    <Clock size={16} />
                    시간
                  </label>
                  <select value={bookingTime} onChange={(e) => setBookingTime(e.target.value)}>
                    {experience.time_slots.map((slot, idx) => (
                      <option key={idx} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Participants */}
              <div className="participants">
                <div className="participant-type">
                  <div className="participant-info">
                    <span className="participant-label">성인</span>
                    <span className="participant-price">
                      {experience.price_per_person_krw.toLocaleString()}원
                    </span>
                  </div>
                  <div className="quantity-control">
                    <button onClick={() => setNumAdults(Math.max(0, numAdults - 1))}>
                      <Minus size={16} />
                    </button>
                    <span className="quantity">{numAdults}</span>
                    <button onClick={() => setNumAdults(numAdults + 1)}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {experience.child_price_krw && (
                  <div className="participant-type">
                    <div className="participant-info">
                      <span className="participant-label">어린이</span>
                      <span className="participant-price">
                        {experience.child_price_krw.toLocaleString()}원
                      </span>
                    </div>
                    <div className="quantity-control">
                      <button onClick={() => setNumChildren(Math.max(0, numChildren - 1))}>
                        <Minus size={16} />
                      </button>
                      <span className="quantity">{numChildren}</span>
                      <button onClick={() => setNumChildren(numChildren + 1)}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Participant Info */}
              <div className="participant-info-box">
                <div className="info-row">
                  <span>최소 인원</span>
                  <span>{experience.min_participants}명</span>
                </div>
                {experience.max_participants && (
                  <div className="info-row">
                    <span>최대 인원</span>
                    <span>{experience.max_participants}명</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="booking-total">
                <div className="total-row">
                  <span>총 인원</span>
                  <span>{getTotalParticipants()}명</span>
                </div>
                <div className="total-row price">
                  <span>총 금액</span>
                  <span className="total-price">{getTotalPrice().toLocaleString()}원</span>
                </div>
              </div>

              {/* Booking Button */}
              <button
                className="booking-button"
                onClick={handleBooking}
                disabled={getTotalParticipants() === 0 || booking}
              >
                {booking ? (
                  <>
                    <Loader className="spinner" size={18} />
                    예약 중...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    예약하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .experience-detail-page {
            min-height: 100vh;
            background: #f9fafb;
          }

          /* Image Gallery */
          .image-gallery {
            background: #111827;
          }

          .main-image {
            position: relative;
            width: 100%;
            height: 500px;
            overflow: hidden;
          }

          .main-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .nav-button {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.9);
            border: none;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .nav-button:hover {
            background: white;
            transform: translateY(-50%) scale(1.1);
          }

          .nav-button.prev {
            left: 20px;
          }

          .nav-button.next {
            right: 20px;
          }

          .image-indicator {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
          }

          .thumbnail-list {
            display: flex;
            gap: 8px;
            padding: 16px;
            overflow-x: auto;
            background: #1f2937;
          }

          .thumbnail {
            width: 100px;
            height: 70px;
            flex-shrink: 0;
            border-radius: 6px;
            overflow: hidden;
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.2s;
          }

          .thumbnail:hover {
            border-color: #f59e0b;
          }

          .thumbnail.active {
            border-color: #f59e0b;
          }

          .thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          /* Content */
          .content-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 40px;
          }

          .main-content {
            min-width: 0;
          }

          /* Header */
          .experience-header {
            margin-bottom: 24px;
          }

          .badges {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
          }

          .type-badge {
            display: inline-block;
            background: #fef3c7;
            color: #92400e;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
          }

          .difficulty-badge {
            display: inline-block;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
          }

          .experience-header h1 {
            font-size: 36px;
            font-weight: 800;
            color: #111827;
            margin-bottom: 12px;
          }

          .rating {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .rating-value {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
          }

          .rating-count {
            font-size: 15px;
            color: #6b7280;
          }

          /* Quick Info */
          .quick-info {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            padding: 20px 0;
            border-top: 1px solid #e5e7eb;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 24px;
          }

          .info-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 15px;
            color: #374151;
          }

          .info-item :global(svg) {
            color: #f59e0b;
          }

          /* Features */
          .features {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 32px;
          }

          .feature {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: #fef3c7;
            color: #92400e;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
          }

          /* Sections */
          .section {
            margin-bottom: 40px;
          }

          .section h2 {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 16px;
          }

          .description {
            font-size: 16px;
            line-height: 1.7;
            color: #374151;
          }

          .items-list {
            list-style: none;
            padding: 0;
          }

          .items-list li {
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
            font-size: 15px;
            color: #374151;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .items-list li:last-child {
            border-bottom: none;
          }

          .items-list.included li {
            color: #059669;
          }

          .items-list.included li :global(svg) {
            color: #059669;
          }

          .items-list.excluded li::before {
            content: "× ";
            color: #dc2626;
            font-weight: 700;
            margin-right: 8px;
          }

          .meeting-point {
            display: flex;
            gap: 12px;
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
          }

          .meeting-point :global(svg) {
            color: #f59e0b;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .meeting-point p {
            margin: 0;
            font-size: 15px;
            color: #374151;
          }

          .instructor h3 {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
          }

          .instructor p {
            font-size: 15px;
            line-height: 1.6;
            color: #374151;
          }

          .cancellation-policy {
            display: flex;
            gap: 12px;
            padding: 16px;
            background: #fef3c7;
            border-radius: 8px;
          }

          .cancellation-policy :global(svg) {
            color: #92400e;
            flex-shrink: 0;
            margin-top: 2px;
          }

          .cancellation-policy p {
            font-size: 14px;
            color: #92400e;
            line-height: 1.6;
            margin: 0;
          }

          /* Sidebar */
          .sidebar {
            position: relative;
          }

          .booking-card {
            position: sticky;
            top: 20px;
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          }

          .booking-card h3 {
            font-size: 20px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 20px;
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-group label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
          }

          .form-group input[type="date"],
          .form-group select {
            width: 100%;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 15px;
          }

          .form-group input[type="date"]:focus,
          .form-group select:focus {
            outline: none;
            border-color: #f59e0b;
          }

          .participants {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 20px;
          }

          .participant-type {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            background: #f9fafb;
            border-radius: 8px;
          }

          .participant-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .participant-label {
            font-size: 15px;
            font-weight: 600;
            color: #374151;
          }

          .participant-price {
            font-size: 14px;
            font-weight: 700;
            color: #f59e0b;
          }

          .quantity-control {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .quantity-control button {
            width: 32px;
            height: 32px;
            border: 1px solid #e5e7eb;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .quantity-control button:hover {
            border-color: #f59e0b;
            background: #fef3c7;
          }

          .quantity {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            min-width: 30px;
            text-align: center;
          }

          .participant-info-box {
            padding: 12px;
            background: #f9fafb;
            border-radius: 6px;
            margin-bottom: 16px;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 14px;
            color: #374151;
          }

          .booking-total {
            padding-top: 16px;
            margin-bottom: 16px;
            border-top: 1px solid #e5e7eb;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 15px;
            color: #374151;
          }

          .total-row.price {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
          }

          .total-price {
            color: #f59e0b;
            font-size: 24px;
          }

          .booking-button {
            width: 100%;
            padding: 16px;
            background: #f59e0b;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
          }

          .booking-button:hover:not(:disabled) {
            background: #d97706;
          }

          .booking-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .booking-button .spinner {
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          /* Responsive */
          @media (max-width: 1024px) {
            .content-container {
              grid-template-columns: 1fr;
            }

            .sidebar {
              order: -1;
            }

            .booking-card {
              position: static;
            }
          }

          @media (max-width: 768px) {
            .main-image {
              height: 300px;
            }

            .experience-header h1 {
              font-size: 24px;
            }

            .quick-info {
              flex-direction: column;
              gap: 12px;
            }

            .thumbnail-list {
              display: none;
            }
          }
        `}</style>
      </div>
    </>
  );
};

export default ExperienceDetailPage;
