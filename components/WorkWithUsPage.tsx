import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { MapPin, Clock, Users, Briefcase, Heart, Star, ArrowLeft, Mail, Phone } from 'lucide-react';

interface WorkWithUsPageProps {
  onBack?: () => void;
}

export function WorkWithUsPage({ onBack }: WorkWithUsPageProps) {
  const [selectedJob, setSelectedJob] = useState<number | null>(null);
  const [applicationForm, setApplicationForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    experience: '',
    motivation: '',
    resume: null as File | null
  });

  const jobPositions = [
    {
      id: 1,
      title: '여행 상품 기획자',
      department: '상품기획팀',
      type: '정규직',
      location: '목포 본사',
      experience: '경력 2-5년',
      salary: '연봉 3,000-4,500만원',
      description: '신안 지역의 독특한 관광 자원을 활용한 여행 상품을 기획하고 개발하는 업무를 담당합니다.',
      requirements: [
        '관광학, 경영학 관련 전공 우대',
        '여행업계 경력 2년 이상',
        '신안 지역에 대한 이해도',
        '창의적 사고와 기획력',
        '원활한 커뮤니케이션 능력'
      ],
      benefits: [
        '4대보험 완비',
        '연차 15일 이상',
        '교육비 지원',
        '신안 여행 혜택',
        '성과급 지급'
      ],
      tags: ['기획', '여행', '신안', '관광']
    },
    {
      id: 2,
      title: '마케팅 전문가',
      department: '마케팅팀',
      type: '정규직',
      location: '목포 본사',
      experience: '경력 3-7년',
      salary: '연봉 3,500-5,000만원',
      description: '디지털 마케팅을 통해 어썸플랜의 브랜드 가치를 높이고 고객 유치를 담당합니다.',
      requirements: [
        '마케팅, 광고홍보 관련 전공',
        '디지털 마케팅 경력 3년 이상',
        'SNS 마케팅 경험',
        '데이터 분석 능력',
        '트렌드 감각'
      ],
      benefits: [
        '4대보험 완비',
        '연차 15일 이상',
        '마케팅 도구 지원',
        '교육 및 세미나 참석비 지원',
        '성과 인센티브'
      ],
      tags: ['마케팅', 'SNS', '디지털', '브랜딩']
    },
    {
      id: 3,
      title: '현지 가이드',
      department: '운영팀',
      type: '정규직/계약직',
      location: '신안군 각 지역',
      experience: '신입/경력무관',
      salary: '시급 15,000-25,000원',
      description: '신안 각 지역의 관광지를 안내하고 고객에게 최고의 여행 경험을 제공합니다.',
      requirements: [
        '신안 지역 거주자 우대',
        '관광통역안내사 자격증 우대',
        '외국어 가능자 우대',
        '서비스 마인드',
        '체력 및 활동성'
      ],
      benefits: [
        '4대보험 완비',
        '교통비 지원',
        '숙박비 지원',
        '가이드 교육 제공',
        '성과급 지급'
      ],
      tags: ['가이드', '현지', '관광', '서비스']
    },
    {
      id: 4,
      title: '고객지원 담당자',
      department: '고객서비스팀',
      type: '정규직',
      location: '목포 본사',
      experience: '신입/경력 1-3년',
      salary: '연봉 2,800-3,800만원',
      description: '고객 문의 응답, 예약 관리, 고객 만족도 향상을 위한 업무를 담당합니다.',
      requirements: [
        '서비스업 경험 우대',
        '친화적 성격',
        '문제 해결 능력',
        '컴퓨터 활용 능력',
        '책임감'
      ],
      benefits: [
        '4대보험 완비',
        '연차 15일 이상',
        '고객서비스 교육',
        '우수사원 포상',
        '복리후생'
      ],
      tags: ['고객서비스', '상담', '예약', '관리']
    },
    {
      id: 5,
      title: '웹 개발자',
      department: 'IT팀',
      type: '정규직',
      location: '목포 본사/재택',
      experience: '경력 2-5년',
      salary: '연봉 3,800-5,500만원',
      description: '여행 플랫폼 웹사이트 개발 및 유지보수, 새로운 기능 개발을 담당합니다.',
      requirements: [
        'React, TypeScript 경험',
        '웹 개발 경력 2년 이상',
        '반응형 웹 개발 경험',
        'Git 사용 경험',
        '새로운 기술 학습 의지'
      ],
      benefits: [
        '4대보험 완비',
        '재택근무 가능',
        '최신 개발 장비 지원',
        '교육비 전액 지원',
        '개발도서 구입비 지원'
      ],
      tags: ['개발', 'React', '웹', 'IT']
    }
  ];

  const companyValues = [
    {
      icon: Heart,
      title: '열정',
      description: '신안의 아름다움을 세상에 알리는 열정'
    },
    {
      icon: Users,
      title: '협력',
      description: '함께 성장하는 팀워크와 소통'
    },
    {
      icon: Star,
      title: '혁신',
      description: '새로운 여행 경험을 창조하는 혁신'
    },
    {
      icon: Briefcase,
      title: '전문성',
      description: '각 분야의 전문성을 바탕으로 한 서비스'
    }
  ];

  const handleApplicationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 지원서 제출 로직
    console.log('Application submitted:', applicationForm);
    alert('지원서가 성공적으로 제출되었습니다!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 py-12">
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

          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold mb-6">함께 일해요</h1>
            <p className="text-xl mb-8 leading-relaxed">
              신안의 아름다운 자연과 문화를 세상에 알리는 일에 함께할 동료를 찾습니다.
              어썸플랜에서 당신의 꿈을 펼쳐보세요.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* 회사 가치 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">우리의 가치</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {companyValues.map((value, index) => {
              const IconComponent = value.icon;
              return (
                <Card key={index} className="text-center">
                  <CardContent className="p-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                      <IconComponent className="h-8 w-8 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{value.title}</h3>
                    <p className="text-gray-600">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* 채용 공고 */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">채용 공고</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {jobPositions.map((job) => (
              <Card
                key={job.id}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedJob === job.id ? 'ring-2 ring-purple-500 shadow-lg' : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">{job.title}</h3>
                      <p className="text-gray-600">{job.department}</p>
                    </div>
                    <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm font-medium">
                      {job.type}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-600 text-sm">
                      <MapPin className="h-4 w-4 mr-2" />
                      {job.location}
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <Briefcase className="h-4 w-4 mr-2" />
                      {job.experience}
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <Clock className="h-4 w-4 mr-2" />
                      {job.salary}
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4">{job.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.tags.map((tag) => (
                      <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {selectedJob === job.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3">지원 자격</h4>
                          <ul className="space-y-1 text-sm text-gray-600">
                            {job.requirements.map((req, index) => (
                              <li key={index} className="flex items-center">
                                <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-3">복리후생</h4>
                          <ul className="space-y-1 text-sm text-gray-600">
                            {job.benefits.map((benefit, index) => (
                              <li key={index} className="flex items-center">
                                <span className="w-1 h-1 bg-green-400 rounded-full mr-2"></span>
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-6">
                        <Button
                          className="w-full bg-purple-600 hover:bg-purple-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setApplicationForm({ ...applicationForm, position: job.title });
                            document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          이 포지션에 지원하기
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 지원서 양식 */}
        <section id="application-form" className="mb-16">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-8">지원서 작성</h2>

              <form onSubmit={handleApplicationSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이름 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={applicationForm.name}
                      onChange={(e) => setApplicationForm({ ...applicationForm, name: e.target.value })}
                      placeholder="이름을 입력하세요"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      이메일 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      value={applicationForm.email}
                      onChange={(e) => setApplicationForm({ ...applicationForm, email: e.target.value })}
                      placeholder="이메일을 입력하세요"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      연락처 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="tel"
                      value={applicationForm.phone}
                      onChange={(e) => setApplicationForm({ ...applicationForm, phone: e.target.value })}
                      placeholder="연락처를 입력하세요"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      지원 포지션 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={applicationForm.position}
                      onChange={(e) => setApplicationForm({ ...applicationForm, position: e.target.value })}
                      placeholder="지원하고자 하는 포지션"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    경력사항
                  </label>
                  <Textarea
                    value={applicationForm.experience}
                    onChange={(e) => setApplicationForm({ ...applicationForm, experience: e.target.value })}
                    placeholder="관련 경력이나 경험을 간단히 작성해주세요"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    지원동기 <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={applicationForm.motivation}
                    onChange={(e) => setApplicationForm({ ...applicationForm, motivation: e.target.value })}
                    placeholder="지원동기와 포부를 작성해주세요"
                    rows={6}
                    required
                  />
                </div>

                <div className="flex justify-center">
                  <Button type="submit" size="lg" className="bg-purple-600 hover:bg-purple-700 px-12">
                    지원서 제출하기
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* 연락처 정보 */}
        <section>
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">채용 문의</h2>
              <p className="text-gray-600 mb-6">
                채용과 관련하여 궁금한 사항이 있으시면 언제든 연락주세요.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-8">
                <div className="flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-purple-600" />
                  <span className="text-gray-700">ham0149@naver.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-5 w-5 text-purple-600" />
                  <span className="text-gray-700">010-4617-1303</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}