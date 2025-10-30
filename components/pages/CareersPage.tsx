import React, { useState } from 'react';
import {
  Briefcase,
  MapPin,
  Clock,
  Users,
  Heart,
  Zap,
  Target,
  Coffee,
  Laptop,
  Sparkles,
  TrendingUp,
  Award,
  Gift,
  Home,
  Calendar,
  DollarSign,
  GraduationCap,
  ChevronRight,
  Send
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface JobPosition {
  id: number;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  skills: string[];
  description: string;
}

const JOB_POSITIONS: JobPosition[] = [
  {
    id: 1,
    title: '프론트엔드 개발자',
    department: '개발팀',
    location: '목포/원격',
    type: '정규직',
    experience: '3년 이상',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'],
    description: '사용자 경험을 최우선으로 생각하는 웹 서비스를 함께 만들어갈 프론트엔드 개발자를 찾습니다.'
  },
  {
    id: 2,
    title: '백엔드 개발자',
    department: '개발팀',
    location: '목포/원격',
    type: '정규직',
    experience: '3년 이상',
    skills: ['Node.js', 'PostgreSQL', 'AWS', 'Docker'],
    description: '확장 가능한 서버 아키텍처를 설계하고 구현할 백엔드 개발자를 모십니다.'
  },
  {
    id: 3,
    title: 'UI/UX 디자이너',
    department: '디자인팀',
    location: '목포/원격',
    type: '정규직',
    experience: '2년 이상',
    skills: ['Figma', 'Adobe XD', '사용자 조사', '프로토타이핑'],
    description: '여행자의 마음을 이해하고 직관적인 인터페이스를 디자인할 디자이너를 찾습니다.'
  },
  {
    id: 4,
    title: '여행 콘텐츠 기획자',
    department: '콘텐츠팀',
    location: '목포',
    type: '정규직',
    experience: '신입/경력',
    skills: ['콘텐츠 기획', '여행 지식', '글쓰기', 'SNS 마케팅'],
    description: '신안의 매력을 전달할 여행 콘텐츠를 기획하고 제작할 크리에이터를 모십니다.'
  },
  {
    id: 5,
    title: '데이터 분석가',
    department: '비즈니스팀',
    location: '목포/원격',
    type: '정규직',
    experience: '2년 이상',
    skills: ['Python', 'SQL', 'Tableau', '통계 분석'],
    description: '데이터 기반 의사결정을 지원할 분석가를 찾습니다.'
  },
  {
    id: 6,
    title: '마케팅 매니저',
    department: '마케팅팀',
    location: '목포',
    type: '정규직',
    experience: '3년 이상',
    skills: ['디지털 마케팅', 'SEO/SEM', '성과 분석', 'SNS'],
    description: '여행 플랫폼의 성장을 이끌 마케팅 전문가를 모십니다.'
  }
];

const COMPANY_VALUES = [
  {
    icon: <Target className="h-8 w-8" />,
    title: '고객 중심',
    description: '여행자의 행복과 편의를 최우선으로 생각합니다',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    icon: <Zap className="h-8 w-8" />,
    title: '빠른 실행',
    description: '완벽보다 빠른 실행으로 함께 성장합니다',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: '협업과 소통',
    description: '투명한 소통과 수평적 문화를 지향합니다',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    icon: <Sparkles className="h-8 w-8" />,
    title: '혁신과 도전',
    description: '새로운 시도를 장려하고 실패를 배움으로 삼습니다',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  }
];

const BENEFITS = [
  {
    icon: <DollarSign className="h-6 w-6" />,
    title: '경쟁력 있는 연봉',
    description: '업계 최고 수준의 연봉과 성과급'
  },
  {
    icon: <Calendar className="h-6 w-6" />,
    title: '자율 근무제',
    description: '유연한 출퇴근 시간 및 원격 근무 가능'
  },
  {
    icon: <Home className="h-6 w-6" />,
    title: '주거 지원',
    description: '목포 이주 시 주거비 및 이사비 지원'
  },
  {
    icon: <GraduationCap className="h-6 w-6" />,
    title: '교육 지원',
    description: '도서 구매, 강의 수강, 컨퍼런스 참가 전액 지원'
  },
  {
    icon: <Gift className="h-6 w-6" />,
    title: '복지 포인트',
    description: '연 200만원 복지 포인트 및 건강검진'
  },
  {
    icon: <Coffee className="h-6 w-6" />,
    title: '스낵바 & 음료',
    description: '무제한 커피, 간식, 음료 제공'
  },
  {
    icon: <Laptop className="h-6 w-6" />,
    title: '최신 장비',
    description: '맥북 프로, 모니터 등 최신 업무 장비 제공'
  },
  {
    icon: <Award className="h-6 w-6" />,
    title: '여행 지원',
    description: '분기별 팀 워크샵 및 연 1회 해외 연수'
  },
  {
    icon: <Heart className="h-6 w-6" />,
    title: '건강 관리',
    description: '헬스장 멤버십, 심리 상담 지원'
  }
];

const PROCESS_STEPS = [
  { step: 1, title: '서류 전형', duration: '1주' },
  { step: 2, title: '1차 면접', duration: '1주' },
  { step: 3, title: '과제 전형', duration: '1주' },
  { step: 4, title: '최종 면접', duration: '1주' },
  { step: 5, title: '처우 협의', duration: '3일' },
  { step: 6, title: '입사', duration: '-' }
];

export function CareersPage() {
  const [selectedDepartment, setSelectedDepartment] = useState('전체');
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);

  const departments = ['전체', '개발팀', '디자인팀', '콘텐츠팀', '비즈니스팀', '마케팅팀'];

  const filteredJobs = selectedDepartment === '전체'
    ? JOB_POSITIONS
    : JOB_POSITIONS.filter(job => job.department === selectedDepartment);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-gray-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&h=600&fit=crop')] opacity-10 bg-cover bg-center"></div>
        <div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-6 py-2 mb-6">
              <Briefcase className="h-5 w-5" />
              <span className="font-semibold">We're Hiring!</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              함께 성장할<br />여러분을 기다립니다
            </h1>
            <p className="text-lg md:text-xl text-purple-100 mb-8">
              신안의 1004개 섬을 연결하는 여행 플랫폼, Travleap과 함께<br />
              대한민국 여행의 미래를 만들어가세요
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-purple-600 hover:bg-purple-50 text-lg px-8"
                onClick={() => document.getElementById('positions')?.scrollIntoView({ behavior: 'smooth' })}
              >
                채용 공고 보기
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-white text-white hover:bg-white/10 text-lg px-8"
              >
                회사 소개서 다운로드
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Mission</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            "여행을 통해 사람들의 삶을 풍요롭게 만들고,<br />
            지역의 가치를 세상에 알린다"
          </p>
        </div>

        {/* Company Values */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {COMPANY_VALUES.map((value, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md p-8 hover:shadow-lg transition-all border border-gray-100"
            >
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${value.bgColor} ${value.color} mb-4`}>
                {value.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{value.title}</h3>
              <p className="text-gray-600">{value.description}</p>
            </div>
          ))}
        </div>

        {/* Benefits */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Benefits & Perks</h2>
            <p className="text-xl text-gray-600">
              최고의 인재와 함께하기 위한 최고의 복지
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((benefit, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border border-gray-100 flex gap-4"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                    {benefit.icon}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold mb-1">{benefit.title}</h3>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Open Positions */}
        <div id="positions" className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Open Positions</h2>
            <p className="text-xl text-gray-600 mb-8">
              현재 채용 중인 포지션을 확인하세요
            </p>

            {/* Department Filter */}
            <div className="flex flex-wrap gap-2 justify-center">
              {departments.map((dept) => (
                <Button
                  key={dept}
                  variant={selectedDepartment === dept ? 'default' : 'outline'}
                  onClick={() => setSelectedDepartment(dept)}
                  className={selectedDepartment === dept
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300'}
                >
                  {dept}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border border-gray-100 group cursor-pointer"
                onClick={() => {
                  setSelectedJob(job);
                  setShowApplicationForm(true);
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge variant="secondary" className="mb-2">{job.department}</Badge>
                    <h3 className="text-xl font-bold group-hover:text-purple-600 transition-colors">
                      {job.title}
                    </h3>
                  </div>
                  <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                </div>

                <p className="text-gray-600 mb-4">{job.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="h-4 w-4" />
                    {job.type}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    {job.experience}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hiring Process */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">채용 프로세스</h2>
            <p className="text-xl text-gray-600">
              총 4-5주 소요 (포지션별로 다를 수 있습니다)
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 -z-10"></div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {PROCESS_STEPS.map((step) => (
                  <div key={step.step} className="text-center">
                    <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow-lg">
                      {step.step}
                    </div>
                    <h3 className="font-bold mb-1">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.duration}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
              <p className="text-sm text-blue-900">
                <strong>💡 지원 팁:</strong> 포트폴리오나 GitHub 주소가 있다면 함께 제출해 주세요.
                여러분의 열정과 경험을 보여주는 것이 가장 중요합니다!
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-12 text-center text-white">
          <TrendingUp className="h-16 w-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl font-bold mb-4">
            지금 바로 지원하세요!
          </h2>
          <p className="text-purple-100 text-lg mb-8 max-w-2xl mx-auto">
            원하는 포지션이 없더라도 언제든 자유롭게 지원해 주세요.<br />
            여러분의 이야기를 듣고 싶습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-purple-600 hover:bg-purple-50 text-lg px-8"
              onClick={() => setShowApplicationForm(true)}
            >
              <Send className="mr-2 h-5 w-5" />
              지원하기
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/10 text-lg px-8"
            >
              채용 문의하기
            </Button>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {selectedJob ? selectedJob.title : '자유 지원'}
              </h2>
              <button
                onClick={() => {
                  setShowApplicationForm(false);
                  setSelectedJob(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">이름 *</label>
                <Input placeholder="홍길동" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">이메일 *</label>
                <Input type="email" placeholder="email@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">연락처 *</label>
                <Input placeholder="010-1234-5678" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">포트폴리오 / GitHub</label>
                <Input placeholder="https://..." />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">자기소개 *</label>
                <Textarea
                  placeholder="본인을 소개하고, 왜 Travleap에서 함께 일하고 싶은지 자유롭게 작성해 주세요."
                  rows={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">이력서 첨부 *</label>
                <Input type="file" accept=".pdf,.doc,.docx" />
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowApplicationForm(false);
                    setSelectedJob(null);
                  }}
                >
                  취소
                </Button>
                <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                  <Send className="mr-2 h-4 w-4" />
                  지원하기
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
