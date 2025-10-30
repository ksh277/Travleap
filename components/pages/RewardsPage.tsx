import React, { useState } from 'react';
import {
  Star,
  Award,
  Gift,
  Zap,
  TrendingUp,
  Crown,
  Sparkles,
  ShoppingBag,
  Plane,
  Hotel,
  Car,
  Coffee,
  ChevronRight,
  CheckCircle2,
  Info
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface Tier {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  requirement: string;
  benefits: string[];
  pointBonus: string;
  specialPerks: string[];
}

const TIERS: Tier[] = [
  {
    name: '일반',
    icon: <Star className="h-8 w-8" />,
    color: 'text-gray-600',
    bgGradient: 'from-gray-100 to-gray-200',
    requirement: '가입 시 자동 부여',
    benefits: [
      '기본 포인트 적립 1%',
      '생일 축하 포인트 5,000P',
      '신규 가입 웰컴 쿠폰 10,000원'
    ],
    pointBonus: '1%',
    specialPerks: []
  },
  {
    name: '실버',
    icon: <Award className="h-8 w-8" />,
    color: 'text-gray-500',
    bgGradient: 'from-gray-300 to-gray-400',
    requirement: '연간 30만원 이상 결제',
    benefits: [
      '포인트 적립 1.5%',
      '매월 쿠폰 지급',
      '우선 예약 서비스',
      '생일 축하 포인트 10,000P'
    ],
    pointBonus: '1.5%',
    specialPerks: ['월 1회 무료 취소']
  },
  {
    name: '골드',
    icon: <Sparkles className="h-8 w-8" />,
    color: 'text-yellow-600',
    bgGradient: 'from-yellow-400 to-yellow-600',
    requirement: '연간 100만원 이상 결제',
    benefits: [
      '포인트 적립 2%',
      '전용 할인 쿠폰 매월 지급',
      '무료 업그레이드 기회',
      '우선 고객센터 상담',
      '생일 축하 포인트 20,000P'
    ],
    pointBonus: '2%',
    specialPerks: ['월 2회 무료 취소', '특별 이벤트 우선 초대']
  },
  {
    name: '플래티넘',
    icon: <Crown className="h-8 w-8" />,
    color: 'text-purple-600',
    bgGradient: 'from-purple-500 to-purple-700',
    requirement: '연간 300만원 이상 결제',
    benefits: [
      '포인트 적립 3%',
      '프리미엄 전용 쿠폰',
      '무료 공항 라운지 이용',
      '전담 컨시어지 서비스',
      '최우선 예약 보장',
      '생일 축하 포인트 50,000P'
    ],
    pointBonus: '3%',
    specialPerks: ['무제한 무료 취소', '럭셔리 패키지 특가', '연 1회 무료 숙박권']
  },
  {
    name: 'VIP',
    icon: <Zap className="h-8 w-8" />,
    color: 'text-rose-600',
    bgGradient: 'from-rose-500 via-pink-600 to-purple-700',
    requirement: '연간 1,000만원 이상 결제',
    benefits: [
      '포인트 적립 5%',
      'VIP 전용 특별 혜택',
      '프라이빗 투어 우선 배정',
      '24시간 전담 컨시어지',
      '무료 프리미엄 업그레이드',
      '연간 리워드 100만P',
      '생일 축하 포인트 100,000P'
    ],
    pointBonus: '5%',
    specialPerks: [
      '무제한 무료 취소',
      '전 상품 최대 할인 보장',
      '연 3회 무료 숙박권',
      'VIP 라운지 무제한 이용',
      '개인 맞춤형 여행 기획'
    ]
  }
];

const EARNING_METHODS = [
  {
    icon: <ShoppingBag className="h-6 w-6" />,
    title: '상품 구매',
    description: '모든 예약 시 등급별 포인트 적립',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    icon: <Plane className="h-6 w-6" />,
    title: '투어 참여',
    description: '투어 완료 시 추가 보너스 포인트',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    icon: <Hotel className="h-6 w-6" />,
    title: '숙박 이용',
    description: '체크아웃 후 자동 적립',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    icon: <Star className="h-6 w-6" />,
    title: '리뷰 작성',
    description: '이용 후기 작성 시 최대 5,000P',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  {
    icon: <Gift className="h-6 w-6" />,
    title: '친구 추천',
    description: '친구 1명당 10,000P 지급',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50'
  },
  {
    icon: <Car className="h-6 w-6" />,
    title: '렌터카 대여',
    description: '렌터카 반납 완료 시 적립',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  }
];

const USAGE_OPTIONS = [
  {
    title: '즉시 할인',
    description: '예약 시 1P = 1원으로 즉시 사용',
    minPoints: '1,000P'
  },
  {
    title: '쿠폰 교환',
    description: '다양한 할인 쿠폰으로 교환',
    minPoints: '5,000P'
  },
  {
    title: '무료 업그레이드',
    description: '객실/차량 업그레이드 교환',
    minPoints: '20,000P'
  },
  {
    title: '기프트카드',
    description: '상품권으로 전환 가능',
    minPoints: '10,000P'
  }
];

const FAQ_ITEMS = [
  {
    question: '포인트는 언제 적립되나요?',
    answer: '상품 이용 완료 후 7일 이내에 자동으로 적립됩니다. 숙박의 경우 체크아웃 기준, 투어는 참여 완료 기준입니다.'
  },
  {
    question: '포인트 유효기간이 있나요?',
    answer: '포인트는 적립일로부터 2년간 유효합니다. 유효기간 만료 30일 전 알림을 발송해 드립니다.'
  },
  {
    question: '등급은 어떻게 올리나요?',
    answer: '연간 결제 금액을 기준으로 매년 1월 1일 자동으로 등급이 갱신됩니다. 기준 금액 달성 시 즉시 등급 상향됩니다.'
  },
  {
    question: '취소 시 포인트는 어떻게 되나요?',
    answer: '결제 취소 시 사용한 포인트는 즉시 환원됩니다. 적립 예정이던 포인트는 취소됩니다.'
  },
  {
    question: '포인트를 선물할 수 있나요?',
    answer: '네, 최소 1,000P부터 다른 회원에게 포인트를 선물할 수 있습니다. 마이페이지에서 이용 가능합니다.'
  }
];

export function RewardsPage() {
  const [selectedTier, setSelectedTier] = useState<number>(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-2 mb-6">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">Travleap 리워드 프로그램</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              여행할수록 더 많은 혜택
            </h1>
            <p className="text-lg md:text-xl text-purple-100">
              5단계 등급제로 여행의 가치를 높이세요. 사용할수록 커지는 리워드!
            </p>
          </div>
        </div>
      </div>

      {/* Tier Overview */}
      <div className="max-w-7xl mx-auto px-6 -mt-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-16">
          {TIERS.map((tier, index) => (
            <div
              key={tier.name}
              onClick={() => setSelectedTier(index)}
              className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 ${
                selectedTier === index ? 'ring-2 ring-purple-600 shadow-2xl' : ''
              }`}
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br ${tier.bgGradient} ${tier.color} mb-4`}>
                {tier.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
              <div className="text-sm text-gray-600 mb-3">적립률</div>
              <div className="text-2xl font-bold text-purple-600">{tier.pointBonus}</div>
            </div>
          ))}
        </div>

        {/* Selected Tier Details */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-16 border border-gray-100">
          <div className="flex items-start gap-6 mb-8">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${TIERS[selectedTier].bgGradient} ${TIERS[selectedTier].color}`}>
              {TIERS[selectedTier].icon}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">{TIERS[selectedTier].name} 등급</h2>
              <p className="text-gray-600 text-lg mb-4">{TIERS[selectedTier].requirement}</p>
              <Badge className="bg-purple-600 text-white text-base px-4 py-1">
                포인트 적립 {TIERS[selectedTier].pointBonus}
              </Badge>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                기본 혜택
              </h3>
              <ul className="space-y-3">
                {TIERS[selectedTier].benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <ChevronRight className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {TIERS[selectedTier].specialPerks.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  특별 혜택
                </h3>
                <ul className="space-y-3">
                  {TIERS[selectedTier].specialPerks.map((perk, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 font-medium">{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {selectedTier < TIERS.length - 1 && (
            <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  다음 등급까지
                </span>
                <span className="text-sm font-bold text-purple-600">
                  {TIERS[selectedTier + 1].name}
                </span>
              </div>
              <Progress value={45} className="h-3 mb-2" />
              <p className="text-xs text-gray-600">
                연간 결제 금액 기준으로 자동 승급됩니다
              </p>
            </div>
          )}
        </div>

        {/* How to Earn Points */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">포인트 적립 방법</h2>
            <p className="text-gray-600 text-lg">
              다양한 방법으로 포인트를 모으고 혜택을 누리세요
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EARNING_METHODS.map((method, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border border-gray-100"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${method.bgColor} ${method.color} mb-4`}>
                  {method.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{method.title}</h3>
                <p className="text-gray-600 text-sm">{method.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How to Use Points */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">포인트 사용처</h2>
            <p className="text-gray-600 text-lg">
              모은 포인트를 다양하게 활용하세요
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {USAGE_OPTIONS.map((option, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-md p-6 hover:shadow-lg transition-all border border-purple-100"
              >
                <h3 className="text-lg font-bold mb-2">{option.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{option.description}</p>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  최소 {option.minPoints}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-12 text-center text-white mb-16">
          <TrendingUp className="h-16 w-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl font-bold mb-4">
            지금 바로 포인트 쌓기 시작하세요!
          </h2>
          <p className="text-purple-100 text-lg mb-8 max-w-2xl mx-auto">
            신규 가입 시 10,000원 할인 쿠폰과 웰컴 포인트를 드립니다
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50 text-lg px-8">
              회원가입하고 혜택 받기
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 text-lg px-8">
              나의 등급 확인
            </Button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">자주 묻는 질문</h2>
            <p className="text-gray-600 text-lg">
              포인트 제도에 대해 궁금한 점을 확인하세요
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {FAQ_ITEMS.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <ChevronRight
                    className={`h-5 w-5 text-gray-400 transition-transform ${
                      expandedFaq === index ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {expandedFaq === index && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-16">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">알아두세요</p>
              <ul className="space-y-1 text-blue-800">
                <li>• 등급은 연간 결제 금액 기준으로 매년 1월 1일 갱신됩니다</li>
                <li>• 포인트는 적립일로부터 2년간 유효하며, 만료 전 알림을 드립니다</li>
                <li>• 부정한 방법으로 포인트를 획득한 경우 회원 자격이 정지될 수 있습니다</li>
                <li>• 포인트 제도는 회사 사정에 따라 변경될 수 있으며, 변경 시 사전 공지합니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
