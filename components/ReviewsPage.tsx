import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Star, User, Calendar, ThumbsUp, Filter, ArrowLeft, MapPin } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { api } from '../utils/api';
import type { ReviewWithDetails } from '../types/database';

// 임시 리뷰 데이터 (실제로는 DB에서 가져와야 함)
const mockReviews = [
  {
    id: 1,
    listing_id: 1,
    user_id: 1,
    rating: 5,
    title: '정말 최고의 체험이었습니다!',
    comment_md: '증도 천일염 체험이 정말 좋았어요! 아이들과 함께 체험하기에 완벽했습니다. 가이드님도 친절하시고 기념품까지 받아서 만족스러웠어요. 소금 만드는 과정을 직접 보고 참여할 수 있어서 교육적이기도 했고, 무엇보다 재미있었습니다.',
    visit_date: '2024.03.15',
    helpful_count: 12,
    is_verified: true,
    created_at: '2024-03-16T10:30:00Z',
    user: {
      id: 1,
      name: '김민지',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b641?w=100&h=100&fit=crop&crop=face'
    },
    listing: {
      id: 1,
      title: '증도 천일염 체험',
      location: '신안군 증도면',
      images: ['https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop']
    }
  },
  {
    id: 2,
    listing_id: 2,
    user_id: 2,
    rating: 4,
    title: '맛있는 홍어삼합!',
    comment_md: '흑산도 홍어 삼합 맛집 투어 다녀왔는데 정말 맛있었습니다. 현지 분들이 추천해주신 맛집들이 모두 훌륭했어요. 다음에 또 오고 싶어요. 다만 홍어 냄새에 익숙하지 않은 분들은 조금 힘들 수도 있을 것 같습니다.',
    visit_date: '2024.03.12',
    helpful_count: 8,
    is_verified: true,
    created_at: '2024-03-13T14:20:00Z',
    user: {
      id: 2,
      name: '박정훈',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
    },
    listing: {
      id: 2,
      title: '흑산도 홍어 삼합 투어',
      location: '신안군 흑산면',
      images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop']
    }
  },
  {
    id: 3,
    listing_id: 3,
    user_id: 3,
    rating: 5,
    title: '환상적인 섬 호핑!',
    comment_md: '신안 섬 호핑 투어는 정말 환상적이었어요! 각 섬마다 다른 매력이 있고, 특히 해넘이 장관은 잊을 수 없을 것 같아요. 강력 추천합니다! 가이드님이 각 섬의 역사와 특징을 자세히 설명해주셔서 더욱 의미있는 여행이었습니다.',
    visit_date: '2024.03.10',
    helpful_count: 15,
    is_verified: true,
    created_at: '2024-03-11T16:45:00Z',
    user: {
      id: 3,
      name: '이수연',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
    },
    listing: {
      id: 3,
      title: '신안 섬 호핑 투어',
      location: '신안군 일대',
      images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop']
    }
  },
  {
    id: 4,
    listing_id: 4,
    user_id: 4,
    rating: 4,
    title: '가족여행으로 딱!',
    comment_md: '자은도 해수욕장에서의 하루가 정말 좋았습니다. 물이 깨끗하고 모래가 부드러워서 아이들이 너무 좋아했어요. 가족 여행으로 딱입니다. 해변가 펜션도 깨끗하고 바다뷰가 정말 예쁘더라구요. 다만 여름철에는 사람이 많을 것 같아요.',
    visit_date: '2024.03.08',
    helpful_count: 6,
    is_verified: true,
    created_at: '2024-03-09T09:15:00Z',
    user: {
      id: 4,
      name: '최동하',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
    },
    listing: {
      id: 4,
      title: '자은도 해수욕장 투어',
      location: '신안군 자은면',
      images: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop']
    }
  },
  {
    id: 5,
    listing_id: 1,
    user_id: 5,
    rating: 5,
    title: '아이들 교육에 좋아요',
    comment_md: '천일염이 만들어지는 과정을 아이들과 함께 보면서 배울 수 있어서 정말 좋았습니다. 직접 소금을 만져보고 맛도 보고, 염전 체험도 할 수 있어서 아이들이 무척 즐거워했어요. 교육적 가치가 높은 체험입니다.',
    visit_date: '2024.03.05',
    helpful_count: 9,
    is_verified: true,
    created_at: '2024-03-06T11:30:00Z',
    user: {
      id: 5,
      name: '정유진',
      avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop&crop=face'
    },
    listing: {
      id: 1,
      title: '증도 천일염 체험',
      location: '신안군 증도면',
      images: ['https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop']
    }
  },
  {
    id: 6,
    listing_id: 2,
    user_id: 6,
    rating: 3,
    title: '호불호가 갈릴 수 있어요',
    comment_md: '홍어의 독특한 맛과 향이 있어서 호불호가 갈릴 수 있을 것 같아요. 저는 처음 먹어봤는데 생각보다 괜찮았습니다. 현지 음식을 체험해보고 싶은 분들에게는 추천해요. 가이드분이 홍어의 역사와 조리법을 자세히 설명해주셔서 유익했습니다.',
    visit_date: '2024.03.03',
    helpful_count: 4,
    is_verified: true,
    created_at: '2024-03-04T13:45:00Z',
    user: {
      id: 6,
      name: '한지민',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face'
    },
    listing: {
      id: 2,
      title: '흑산도 홍어 삼합 투어',
      location: '신안군 흑산면',
      images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop']
    }
  }
] as any[];

export function ReviewsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listingId') ? Number(searchParams.get('listingId')) : undefined;
  const listingTitle = searchParams.get('listingTitle') || undefined;

  const [reviews, setReviews] = useState<any[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [filterRating, setFilterRating] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // DB에서 리뷰 데이터 로드
  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);

        // API에서 리뷰 데이터 가져오기
        const allReviews = await api.getRecentReviews(100);

        let reviewsToShow = [];

        // API에서 데이터가 정상적으로 왔는지 확인
        if (allReviews && Array.isArray(allReviews) && allReviews.length > 0) {
          reviewsToShow = allReviews;

          // 특정 상품의 리뷰만 보기
          if (listingId) {
            reviewsToShow = allReviews.filter(review => review.listing_id === listingId);
          }
        } else {
          // API 데이터가 없으면 빈 배열
          reviewsToShow = [];
        }

        setReviews(reviewsToShow);
        setFilteredReviews(reviewsToShow);
      } catch (error) {
        console.error('Failed to load reviews:', error);
        // 에러 시 빈 배열
        setReviews([]);
        setFilteredReviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [listingId]);

  // 필터링 및 정렬 적용
  useEffect(() => {
    let filtered = listingId
      ? reviews.filter(review => review.listing_id === listingId)
      : reviews;

    // 평점 필터
    if (filterRating !== 'all') {
      const rating = parseInt(filterRating);
      filtered = filtered.filter(review => review.rating === rating);
    }

    // 카테고리 필터
    if (filterCategory !== 'all') {
      filtered = filtered.filter(review =>
        review.listing?.category === filterCategory ||
        review.category === filterCategory
      );
    }

    // 정렬
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
        break;
      case 'highest':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'lowest':
        filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
      case 'helpful':
        filtered.sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
        break;
      default:
        break;
    }

    setFilteredReviews(filtered);
    setCurrentPage(1); // 필터 변경시 첫 페이지로 이동
  }, [reviews, sortBy, filterRating, filterCategory, listingId]);

  const calculateAverageRating = () => {
    if (filteredReviews.length === 0) return '0';
    const sum = filteredReviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return (sum / filteredReviews.length).toFixed(1);
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    filteredReviews.forEach(review => {
      const rating = review.rating || 0;
      if (rating >= 1 && rating <= 5) {
        distribution[rating as keyof typeof distribution]++;
      }
    });
    return distribution;
  };

  const ratingDistribution = getRatingDistribution();
  const totalReviews = filteredReviews.length;

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReviews = filteredReviews.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>뒤로가기</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {listingTitle ? `${listingTitle} 리뷰` : '모든 리뷰'}
              </h1>
              <p className="text-gray-600 mt-2">
                {totalReviews}개의 리뷰 · 평균 {calculateAverageRating()}점
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 사이드바 - 평점 요약 */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">평점 요약</h3>

                {/* 전체 평점 */}
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-gray-800 mb-2">
                    {calculateAverageRating()}
                  </div>
                  <div className="flex items-center justify-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(parseFloat(calculateAverageRating()))
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-gray-600">{totalReviews}개 리뷰</div>
                </div>

                {/* 평점 분포 */}
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 w-12">
                        <span className="text-sm">{rating}</span>
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: totalReviews > 0 ? `${(ratingDistribution[rating as keyof typeof ratingDistribution] / totalReviews) * 100}%` : '0%'
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-8">
                        {ratingDistribution[rating as keyof typeof ratingDistribution]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 메인 컨텐츠 */}
          <div className="lg:col-span-3">
            {/* 필터 및 정렬 */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">평점:</span>
                <Select value={filterRating} onValueChange={setFilterRating}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="5">5점</SelectItem>
                    <SelectItem value="4">4점</SelectItem>
                    <SelectItem value="3">3점</SelectItem>
                    <SelectItem value="2">2점</SelectItem>
                    <SelectItem value="1">1점</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!listingId && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">카테고리:</span>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="자연">자연</SelectItem>
                      <SelectItem value="문화">문화</SelectItem>
                      <SelectItem value="음식">음식</SelectItem>
                      <SelectItem value="체험">체험</SelectItem>
                      <SelectItem value="휴양">휴양</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">정렬:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">최신순</SelectItem>
                    <SelectItem value="oldest">오래된순</SelectItem>
                    <SelectItem value="highest">높은 평점순</SelectItem>
                    <SelectItem value="lowest">낮은 평점순</SelectItem>
                    <SelectItem value="helpful">도움순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 로딩 상태 */}
            {loading && (
              <div className="space-y-6">
                {[...Array(3)].map((_, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="animate-pulse">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                            <div>
                              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-32"></div>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className="w-4 h-4 bg-gray-200 rounded"></div>
                            ))}
                          </div>
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* 리뷰 목록 */}
            {!loading && currentReviews.length > 0 && (
              <div className="space-y-6">
                {currentReviews.map((review) => (
                <Card key={review.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* 상품 정보 (전체 리뷰 보기일 때만) */}
                      {!listingId && review.listing && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-16 h-16 rounded-lg overflow-hidden">
                            <ImageWithFallback
                              src={review.listing.images?.[0] || 'https://via.placeholder.com/64x64'}
                              alt={review.listing.title || review.listing_title || '상품'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-800">{review.listing.title || review.listing_title || '상품명'}</h4>
                            <div className="flex items-center text-gray-600 text-sm">
                              <MapPin className="h-3 w-3 mr-1" />
                              {review.listing.location || '위치 정보 없음'}
                            </div>
                          </div>
                        </div>
                      )}
                      {/* 상품 정보가 없을 때 대체 표시 */}
                      {!listingId && !review.listing && review.listing_title && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-800">{review.listing_title}</h4>
                            <div className="flex items-center text-gray-600 text-sm">
                              <MapPin className="h-3 w-3 mr-1" />
                              위치 정보 없음
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 리뷰 헤더 */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden">
                            <ImageWithFallback
                              src={review.user?.avatar || review.images?.[0] || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'}
                              alt={review.user?.name || review.user_name || '사용자'}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-800">{review.user?.name || review.user_name || '익명'}</h4>
                              {review.is_verified && (
                                <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs">
                                  인증된 리뷰
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>방문일: {review.visit_date || new Date(review.created_at).toLocaleDateString()}</span>
                              </div>
                              <span>작성일: {new Date(review.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* 평점 */}
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="ml-2 font-medium text-gray-700">{review.rating}.0</span>
                        </div>
                      </div>

                      {/* 리뷰 제목 */}
                      {review.title && (
                        <h3 className="text-lg font-semibold text-gray-800">{review.title}</h3>
                      )}

                      {/* 리뷰 내용 */}
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {review.comment_md || review.review_text || review.content || '리뷰 내용이 없습니다.'}
                      </p>

                      {/* 도움이 됨 버튼 */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>{review.helpful_count || 0}명이 이 리뷰가 도움이 된다고 했습니다</span>
                        </div>
                        <Button variant="outline" size="sm">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          도움이 됨
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            )}

            {/* 페이지네이션 */}
            {!loading && filteredReviews.length > 0 && totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="text-[#8B5FBF] border-[#8B5FBF] hover:bg-[#8B5FBF] hover:text-white disabled:opacity-50"
                >
                  이전
                </Button>

                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  const isCurrentPage = page === currentPage;

                  // 페이지가 많을 때는 현재 페이지 주변만 표시
                  if (totalPages > 7) {
                    if (page === 1 || page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)) {
                      return (
                        <Button
                          key={page}
                          variant={isCurrentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className={isCurrentPage
                            ? "bg-[#8B5FBF] hover:bg-[#8B5FBF]"
                            : "text-[#8B5FBF] border-[#8B5FBF] hover:bg-[#8B5FBF] hover:text-white"
                          }
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 3 || page === currentPage + 3) {
                      return <span key={page} className="text-gray-400">...</span>;
                    }
                    return null;
                  } else {
                    return (
                      <Button
                        key={page}
                        variant={isCurrentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className={isCurrentPage
                          ? "bg-[#8B5FBF] hover:bg-[#8B5FBF]"
                          : "text-[#8B5FBF] border-[#8B5FBF] hover:bg-[#8B5FBF] hover:text-white"
                        }
                      >
                        {page}
                      </Button>
                    );
                  }
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="text-[#8B5FBF] border-[#8B5FBF] hover:bg-[#8B5FBF] hover:text-white disabled:opacity-50"
                >
                  다음
                </Button>
              </div>
            )}

            {!loading && filteredReviews.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <User className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  {filterRating !== 'all' && filterCategory !== 'all'
                    ? '해당 조건의 리뷰가 없습니다'
                    : filterRating !== 'all'
                    ? '해당 평점의 리뷰가 없습니다'
                    : filterCategory !== 'all'
                    ? `${filterCategory} 카테고리의 리뷰가 없습니다`
                    : '아직 리뷰가 없습니다'
                  }
                </h3>
                <p className="text-gray-600">
                  {filterRating !== 'all' || filterCategory !== 'all'
                    ? '다른 조건으로 검색해보시거나 필터를 초기화해보세요.'
                    : listingTitle
                    ? '이 상품의 첫 번째 리뷰를 작성해보세요!'
                    : '첫 번째 리뷰를 작성해보세요!'
                  }
                </p>

                {(filterRating !== 'all' || filterCategory !== 'all') && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilterRating('all');
                        setFilterCategory('all');
                      }}
                      className="text-[#8B5FBF] border-[#8B5FBF] hover:bg-[#8B5FBF] hover:text-white"
                    >
                      필터 초기화
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}