import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { MapPin, Phone, Mail, Users, Target, Award } from 'lucide-react';
import { usePageBanner } from '../hooks/usePageBanner';

export function AboutPage() {
  const bannerImage = usePageBanner('about');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 히어로 섹션 */}
      <div className="relative h-[500px] overflow-hidden">
        {/* 배경 이미지 */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bannerImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 to-blue-900/60"></div>
        </div>

        {/* 컨텐츠 */}
        <div className="relative max-w-content mx-auto px-4 md:px-10 lg:px-20 h-full flex items-center">
          <div className="max-w-4xl text-white">
            <h1 className="text-5xl font-bold mb-6">트래블립 (TRAVLEAP)</h1>
            <p className="text-xl mb-8 leading-relaxed">
              신안의 아름다운 자연과 문화를 전 세계에 알리는 여행 플랫폼 기업입니다.
              우리는 특별한 여행 경험을 통해 고객들에게 잊지 못할 추억을 선사합니다.
            </p>
            <Button size="lg" variant="secondary" className="bg-white text-purple-600 hover:bg-gray-100">
              연락하기
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-content mx-auto px-4 md:px-10 lg:px-20 py-16">
        {/* 회사 소개 */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">회사 소개</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                트래블립(TRAVLEAP)은 신안군의 천혜의 자연과 독특한 문화를 전 세계에 소개하는
                여행 플랫폼 기업입니다. Travel과 Leap의 합성어로, 여행을 통한 도약과 성장을 의미합니다.
              </p>
              <p className="text-gray-600 mb-6 leading-relaxed">
                1004개의 섬으로 이루어진 신안의 아름다움을 전 세계 여행객들에게 알리고,
                지역 경제 활성화에 기여하는 것이 우리의 사명입니다.
              </p>
              <p className="text-gray-600 leading-relaxed">
                우리는 단순한 여행 상품이 아닌, 신안의 진정한 매력을 경험할 수 있는
                특별한 여행 프로그램을 기획하고 운영하는 온라인 플랫폼을 제공합니다.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg h-64 flex items-center justify-center mb-6">
                <div className="text-center">
                  <h3 className="text-4xl font-bold text-purple-600 mb-2">TRAVLEAP</h3>
                  <p className="text-gray-700">Travel + Leap</p>
                  <p className="text-sm text-gray-600 mt-2">여행을 통한 도약</p>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">우리의 플랫폼</h3>
              <p className="text-gray-600">
                신안의 숙박, 체험, 관광지를 한 곳에서 예약할 수 있는
                통합 여행 플랫폼을 제공합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 회사 정보 카드 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">회사 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="p-8">
                <Target className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-4">우리의 비전</h3>
                <p className="text-gray-600">
                  신안을 대한민국 최고의 섬 관광지로 만들어
                  지속 가능한 관광 생태계를 구축합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-8">
                <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-4">우리의 미션</h3>
                <p className="text-gray-600">
                  고객 맞춤형 여행 서비스를 통해
                  특별한 추억과 감동을 선사합니다.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-8">
                <Award className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-4">우리의 가치</h3>
                <p className="text-gray-600">
                  지역 문화 보존과 친환경 관광을 통해
                  지속 가능한 발전을 추구합니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 회사 상세 정보 */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">회사 개요</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">회사명</h4>
                      <p className="text-gray-600">트래블립 (TRAVLEAP)</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">대표자명</h4>
                      <p className="text-gray-600">함은비</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Target className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">사업분야</h4>
                      <p className="text-gray-600">여행 플랫폼 운영, 관광 서비스</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Award className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">설립</h4>
                      <p className="text-gray-600">2024년</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">연락처 정보</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <MapPin className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">주소</h4>
                      <p className="text-gray-600">전남 목포시 원산중앙로 44, 2층</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Phone className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">전화번호</h4>
                      <p className="text-gray-600">0504-0811-1330</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Mail className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">이메일</h4>
                      <p className="text-gray-600">awesomeplan4606@naver.com</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA 섹션 */}
        <section className="text-center bg-white rounded-lg shadow-lg p-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            신안의 특별한 여행을 시작해보세요
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            어썸플랜과 함께 신안의 숨겨진 보석 같은 장소들을 발견하고,
            평생 잊지 못할 추억을 만들어보세요.
          </p>
          <div className="space-x-4">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
              여행 상품 보기
            </Button>
            <Button size="lg" variant="outline">
              문의하기
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}