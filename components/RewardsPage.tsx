import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Gift, Star, Award, Trophy, Coins, Calendar, User, ArrowLeft, Crown, LogIn } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '../hooks/useAuth';

interface RewardsPageProps {
  onBack?: () => void;
}

export function RewardsPage({ onBack }: RewardsPageProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [userPoints, setUserPoints] = useState(0);
  const [userTier, setUserTier] = useState('브론즈');
  const [loading, setLoading] = useState(true);

  const rewardTiers = [
    {
      name: '브론즈',
      icon: Award,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      minPoints: 0,
      benefits: ['5% 할인', '생일 쿠폰', '기본 적립']
    },
    {
      name: '실버',
      icon: Award,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      minPoints: 1000,
      benefits: ['10% 할인', '생일 쿠폰', '우선 예약', '1.5배 적립']
    },
    {
      name: '골드',
      icon: Crown,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      minPoints: 2000,
      benefits: ['15% 할인', '생일 쿠폰', '우선 예약', '2배 적립', '전용 상담']
    },
    {
      name: '플래티넘',
      icon: Trophy,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      minPoints: 5000,
      benefits: ['20% 할인', '생일 쿠폰', '우선 예약', '3배 적립', '전용 상담', 'VIP 라운지']
    }
  ];

  const rewardItems = [
    {
      id: 1,
      name: '증도 천일염 체험 10% 할인',
      points: 500,
      category: '체험',
      image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&h=150&fit=crop',
      description: '증도 천일염전 체험 프로그램 10% 할인 쿠폰',
      validity: '90일'
    },
    {
      id: 2,
      name: '신안 섬 호핑 투어 15% 할인',
      points: 750,
      category: '투어',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop',
      description: '인기 섬 호핑 투어 15% 할인 혜택',
      validity: '60일'
    },
    {
      id: 3,
      name: '흑산도 맛집 투어 무료 업그레이드',
      points: 1000,
      category: '음식',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=200&h=150&fit=crop',
      description: '흑산도 홍어삼합 맛집 투어 프리미엄 코스 무료 업그레이드',
      validity: '30일'
    },
    {
      id: 4,
      name: '신안 특산품 선물세트',
      points: 1500,
      category: '선물',
      image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=200&h=150&fit=crop',
      description: '천일염, 김, 새우젓 등 신안 특산품 세트',
      validity: '무제한'
    },
    {
      id: 5,
      name: '자은도 리조트 1박 무료 숙박',
      points: 2000,
      category: '숙박',
      image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=200&h=150&fit=crop',
      description: '자은도 오션뷰 리조트 스탠다드룸 1박 무료',
      validity: '180일'
    },
    {
      id: 6,
      name: 'VIP 전용 가이드 투어',
      points: 3000,
      category: 'VIP',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=150&fit=crop',
      description: '전문 가이드와 함께하는 맞춤형 신안 투어',
      validity: '365일'
    }
  ];

  const pointHistory = [
    {
      date: '2024.03.20',
      description: '증도 천일염 체험 예약',
      points: +150,
      type: '적립'
    },
    {
      date: '2024.03.18',
      description: '신안 섬 호핑 투어 후기 작성',
      points: +100,
      type: '적립'
    },
    {
      date: '2024.03.15',
      description: '할인 쿠폰 사용',
      points: -500,
      type: '사용'
    },
    {
      date: '2024.03.12',
      description: '자은도 해수욕장 투어 예약',
      points: +200,
      type: '적립'
    },
    {
      date: '2024.03.10',
      description: '회원가입 보너스',
      points: +500,
      type: '적립'
    }
  ];

  const getCurrentTierInfo = () => {
    return rewardTiers.find(tier => tier.name === userTier);
  };

  const getNextTierInfo = () => {
    const currentIndex = rewardTiers.findIndex(tier => tier.name === userTier);
    return currentIndex < rewardTiers.length - 1 ? rewardTiers[currentIndex + 1] : null;
  };

  const nextTier = getNextTierInfo();
  const currentTier = getCurrentTierInfo();

  // 로그인 시 사용자 포인트 정보 로드
  useEffect(() => {
    const loadUserRewards = async () => {
      if (isAuthenticated && user) {
        try {
          // TODO: 실제 API 연동
          // const response = await fetch('/api/user/rewards');
          // const data = await response.json();
          // setUserPoints(data.points);
          // setUserTier(data.tier);

          // 임시: 로그인한 사용자에게는 기본 포인트 부여
          setUserPoints(0);
          setUserTier('브론즈');
        } catch (error) {
          console.error('포인트 정보 로드 실패:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUserRewards();
  }, [isAuthenticated, user]);

  // 비로그인 사용자 처리
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="p-12">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 mb-6">
                <Gift className="h-10 w-10 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">리워드 프로그램</h2>
              <p className="text-gray-600 mb-8">
                로그인하고 여행할수록 더 많은 혜택을 받으세요!
              </p>
              <div className="space-y-4">
                <ul className="text-left text-gray-600 space-y-2 mb-6">
                  <li className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 mr-2" />
                    예약 시 포인트 적립
                  </li>
                  <li className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 mr-2" />
                    등급별 할인 혜택
                  </li>
                  <li className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 mr-2" />
                    포인트로 상품 교환
                  </li>
                  <li className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 mr-2" />
                    VIP 전용 서비스
                  </li>
                </ul>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => navigate('/login')}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  로그인하고 혜택 받기
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/')}
                >
                  홈으로 돌아가기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 mobile-safe-bottom">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white mobile-safe-top">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-4 mb-6">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                뒤로가기
              </Button>
            )}
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">리워드 프로그램</h1>
            <p className="text-xl opacity-90">여행할수록 더 많은 혜택을 받으세요</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* 사용자 포인트 및 등급 */}
        <section className="mb-12">
          <Card className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">내 포인트</h2>
                  <div className="text-4xl font-bold mb-4">{userPoints.toLocaleString()}P</div>
                  <div className="flex items-center space-x-2">
                    {currentTier && (
                      <>
                        <currentTier.icon className="h-6 w-6" />
                        <span className="text-xl font-semibold">{userTier} 회원</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Gift className="h-16 w-16 opacity-50 mb-4" />
                  {nextTier && (
                    <div className="text-sm opacity-90">
                      {nextTier.name} 등급까지 {nextTier.minPoints - userPoints}P 남음
                    </div>
                  )}
                </div>
              </div>

              {/* 진행률 바 */}
              {nextTier && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>{currentTier?.name}</span>
                    <span>{nextTier.name}</span>
                  </div>
                  <div className="w-full bg-white/30 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          ((userPoints - (currentTier?.minPoints || 0)) /
                            (nextTier.minPoints - (currentTier?.minPoints || 0))) *
                            100,
                          100
                        )}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 등급별 혜택 */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">등급별 혜택</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rewardTiers.map((tier) => {
              const IconComponent = tier.icon;
              const isCurrentTier = tier.name === userTier;

              return (
                <Card
                  key={tier.name}
                  className={`text-center ${isCurrentTier ? 'ring-2 ring-purple-500 shadow-lg' : ''}`}
                >
                  <CardContent className="p-6">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${tier.bgColor} mb-4`}>
                      <IconComponent className={`h-8 w-8 ${tier.color}`} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {tier.name}
                      {isCurrentTier && <span className="text-purple-600 ml-2">(현재)</span>}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {tier.minPoints.toLocaleString()}P 이상
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {tier.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-center justify-center">
                          <Star className="h-3 w-3 text-yellow-400 mr-1" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* 리워드 상품 */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">포인트로 교환하기</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewardItems.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs">
                      {item.category}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="bg-white text-purple-600 px-2 py-1 rounded text-xs font-bold">
                      {item.points}P
                    </span>
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>유효기간: {item.validity}</span>
                  </div>
                  <Button
                    className="w-full"
                    variant={userPoints >= item.points ? "default" : "outline"}
                    disabled={userPoints < item.points}
                  >
                    {userPoints >= item.points ? "교환하기" : "포인트 부족"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 포인트 내역 */}
        <section>
          <h2 className="text-3xl font-bold text-gray-800 mb-8">포인트 내역</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {pointHistory.map((history, index) => (
                  <div key={index} className="flex items-center justify-between p-6">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        history.type === '적립' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <Coins className={`h-4 w-4 ${
                          history.type === '적립' ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{history.description}</p>
                        <p className="text-sm text-gray-500">{history.date}</p>
                      </div>
                    </div>
                    <div className={`font-bold ${
                      history.type === '적립' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {history.points > 0 ? '+' : ''}{history.points}P
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <Button variant="outline">더 많은 내역 보기</Button>
          </div>
        </section>
      </div>
    </div>
  );
}