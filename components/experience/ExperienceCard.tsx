import React from 'react';
import Link from 'next/link';
import { MapPin, Clock, Star, Users, TrendingUp } from 'lucide-react';

interface ExperienceCardProps {
  experience: {
    id: number;
    name: string;
    description?: string;
    experience_type: string;
    category?: string;
    location?: string;
    city?: string;
    duration_minutes: number;
    min_participants: number;
    max_participants?: number;
    price_per_person_krw: number;
    child_price_krw?: number;
    language?: string;
    difficulty_level?: string;
    age_restriction?: string;
    thumbnail_url?: string;
    images?: string[];
    rating_avg?: number;
    rating_count?: number;
    total_bookings?: number;
  };
}

const ExperienceCard: React.FC<ExperienceCardProps> = ({ experience }) => {
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

  const getDifficultyLabel = (level?: string) => {
    if (!level) return null;
    const levelMap: Record<string, { label: string; color: string }> = {
      '초급': { label: '★ 초급', color: '#10b981' },
      '중급': { label: '★★ 중급', color: '#f59e0b' },
      '고급': { label: '★★★ 고급', color: '#ef4444' }
    };
    return levelMap[level] || { label: level, color: '#6b7280' };
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
  };

  const difficultyInfo = getDifficultyLabel(experience.difficulty_level);

  return (
    <Link href={`/experience/${experience.id}`}>
      <a className="experience-card">
        <div className="experience-image">
          <img
            src={experience.thumbnail_url || (experience.images && experience.images.length > 0 ? experience.images[0] : '/placeholder-experience.jpg')}
            alt={experience.name}
          />
          <div className="type-badge">{getTypeLabel(experience.experience_type)}</div>
          {difficultyInfo && (
            <div className="difficulty-badge" style={{ background: difficultyInfo.color }}>
              {difficultyInfo.label}
            </div>
          )}
        </div>

        <div className="experience-content">
          <div className="experience-header">
            <h3 className="experience-name">{experience.name}</h3>
            {experience.rating_avg && experience.rating_avg > 0 && (
              <div className="rating">
                <Star size={14} fill="#f59e0b" color="#f59e0b" />
                <span>{experience.rating_avg.toFixed(1)}</span>
                {experience.rating_count && (
                  <span className="rating-count">({experience.rating_count})</span>
                )}
              </div>
            )}
          </div>

          {experience.description && (
            <p className="experience-description">{experience.description}</p>
          )}

          <div className="experience-info">
            {experience.location && (
              <div className="info-item">
                <MapPin size={14} />
                <span>{experience.location}</span>
              </div>
            )}
            <div className="info-item">
              <Clock size={14} />
              <span>{formatDuration(experience.duration_minutes)}</span>
            </div>
            <div className="info-item">
              <Users size={14} />
              <span>
                {experience.min_participants}명
                {experience.max_participants && ` ~ ${experience.max_participants}명`}
              </span>
            </div>
          </div>

          <div className="features">
            {experience.language && (
              <span className="feature">🌐 {experience.language}</span>
            )}
            {experience.age_restriction && (
              <span className="feature">🔞 {experience.age_restriction}</span>
            )}
          </div>

          <div className="experience-footer">
            <div className="price">
              <span className="price-label">1인</span>
              <span className="price-value">
                {experience.price_per_person_krw.toLocaleString()}원
              </span>
              {experience.child_price_krw && experience.child_price_krw !== experience.price_per_person_krw && (
                <span className="child-price">
                  어린이 {experience.child_price_krw.toLocaleString()}원
                </span>
              )}
            </div>
            {experience.total_bookings && experience.total_bookings > 0 && (
              <div className="booking-count">
                <TrendingUp size={14} />
                <span>{experience.total_bookings}명 예약</span>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .experience-card {
            display: block;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
          }

          .experience-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          }

          .experience-image {
            position: relative;
            width: 100%;
            height: 200px;
            overflow: hidden;
            background: #f3f4f6;
          }

          .experience-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
          }

          .experience-card:hover .experience-image img {
            transform: scale(1.05);
          }

          .type-badge {
            position: absolute;
            top: 12px;
            left: 12px;
            background: rgba(255, 255, 255, 0.95);
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
          }

          .difficulty-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
          }

          .experience-content {
            padding: 16px;
          }

          .experience-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            gap: 8px;
          }

          .experience-name {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
            margin: 0;
            flex: 1;
          }

          .rating {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 14px;
            font-weight: 600;
            color: #111827;
            flex-shrink: 0;
          }

          .rating-count {
            font-size: 12px;
            color: #6b7280;
            font-weight: 400;
          }

          .experience-description {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 12px;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .experience-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
          }

          .info-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: #374151;
          }

          .info-item :global(svg) {
            color: #f59e0b;
            flex-shrink: 0;
          }

          .features {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 12px;
          }

          .feature {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            background: #fef3c7;
            color: #92400e;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }

          .experience-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }

          .price {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .price-label {
            font-size: 12px;
            color: #6b7280;
          }

          .price-value {
            font-size: 18px;
            font-weight: 700;
            color: #f59e0b;
          }

          .child-price {
            font-size: 11px;
            color: #6b7280;
          }

          .booking-count {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: #6b7280;
          }

          @media (max-width: 768px) {
            .experience-name {
              font-size: 16px;
            }

            .price-value {
              font-size: 16px;
            }
          }
        `}</style>
      </a>
    </Link>
  );
};

export default ExperienceCard;
