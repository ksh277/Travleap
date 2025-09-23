import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  ChevronLeft,
  Users,
  DollarSign,
  TrendingUp,
  Gift,
  Share2,
  BarChart3,
  Star,
  Target,
  Zap,
  Calendar,
  Award,
  CheckCircle,
  ArrowRight,
  Copy,
  ExternalLink
} from 'lucide-react';

interface AffiliatePageProps {
  onBack: () => void;
}

export function AffiliatePage({ onBack }: AffiliatePageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isApplied, setIsApplied] = useState(false);
  const [applicationData, setApplicationData] = useState({
    name: '',
    email: '',
    website: '',
    socialMedia: '',
    experience: '',
    motivation: ''
  });

  // 가상의 어필리에이트 통계 데이터
  const affiliateStats = {
    totalEarnings: 1245000,
    monthlyEarnings: 156000,
    referrals: 42,
    conversionRate: 12.5,
    level: 'Gold',
    nextLevelProgress: 75
  };

  const commissionTiers = [
    { level: 'Bronze', referrals: '1-10', commission: '5%', color: 'bg-orange-500' },
    { level: 'Silver', referrals: '11-25', commission: '7%', color: 'bg-gray-400' },
    { level: 'Gold', referrals: '26-50', commission: '10%', color: 'bg-yellow-500' },
    { level: 'Platinum', referrals: '51+', commission: '15%', color: 'bg-purple-500' }
  ];

  const handleApplicationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsApplied(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setApplicationData(prev => ({ ...prev, [field]: value }));
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* 헤로 섹션 */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-8 text-white">
        <div className="max-w-4xl">
          <h2 className="text-3xl font-bold mb-4">트래브립과 함께 수익을 창출하세요!</h2>
          <p className="text-lg mb-6 opacity-90">
            신안군의 아름다운 여행 상품을 추천하고 매출의 일정 비율을 커미션으로 받아보세요.
            블로거, 인플루언서, 여행 관련 콘텐츠 크리에이터에게 최적화된 제휴 프로그램입니다.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <span>최대 15% 커미션</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>무료 가입</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              <span>추가 보너스 제공</span>
            </div>
          </div>
        </div>
      </div>

      {/* 주요 혜택 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">높은 커미션율</h3>
            <p className="text-gray-600 text-sm">
              판매 실적에 따라 5%부터 최대 15%까지 커미션을 받을 수 있습니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">실시간 분석</h3>
            <p className="text-gray-600 text-sm">
              클릭, 전환, 수익에 대한 상세한 실시간 리포트를 제공합니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Share2 className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">마케팅 지원</h3>
            <p className="text-gray-600 text-sm">
              배너, 링크, 콘텐츠 등 다양한 마케팅 자료를 무료로 제공합니다.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 커미션 단계 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            커미션 단계별 혜택
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commissionTiers.map((tier, index) => (
              <div key={tier.level} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded-full ${tier.color}`}></div>
                  <div>
                    <h4 className="font-semibold">{tier.level}</h4>
                    <p className="text-sm text-gray-600">월 추천 {tier.referrals}건</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-600">{tier.commission}</div>
                  <div className="text-xs text-gray-500">커미션율</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 추천 상품 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            인기 추천 상품
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: '퍼플섬 투어', price: '45,000원', commission: '4,500원' },
              { name: '임자도 리조트', price: '180,000원', commission: '18,000원' },
              { name: '신안 섬 호핑', price: '120,000원', commission: '12,000원' }
            ].map((product, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">{product.name}</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">상품가격: {product.price}</span>
                  <span className="text-purple-600 font-semibold">커미션: {product.commission}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* 성과 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 수익</p>
                <p className="text-2xl font-bold">₩{affiliateStats.totalEarnings.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">이번달 수익</p>
                <p className="text-2xl font-bold">₩{affiliateStats.monthlyEarnings.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 추천 수</p>
                <p className="text-2xl font-bold">{affiliateStats.referrals}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전환율</p>
                <p className="text-2xl font-bold">{affiliateStats.conversionRate}%</p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 현재 레벨 및 진행상황 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            현재 레벨: {affiliateStats.level}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>다음 레벨까지</span>
                <span>{affiliateStats.nextLevelProgress}%</span>
              </div>
              <Progress value={affiliateStats.nextLevelProgress} className="h-2" />
            </div>
            <p className="text-sm text-gray-600">
              Platinum 레벨까지 8건의 추가 추천이 필요합니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 추천 링크 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            나의 추천 링크
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value="https://travleap.com/ref/USER123"
                readOnly
                className="flex-1"
              />
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                복사
              </Button>
            </div>
            <p className="text-sm text-gray-600">
              이 링크를 통해 들어온 방문자가 구매하면 커미션을 받을 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 최근 활동 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            최근 활동
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { date: '2024-03-20', action: '퍼플섬 투어 예약 완료', commission: '+4,500원' },
              { date: '2024-03-19', action: '임자도 리조트 예약 완료', commission: '+18,000원' },
              { date: '2024-03-18', action: '신안 섬 호핑 예약 완료', commission: '+12,000원' },
              { date: '2024-03-17', action: '새로운 방문자 유입', commission: '대기중' }
            ].map((activity, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <div>
                  <p className="font-medium">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.date}</p>
                </div>
                <Badge variant={activity.commission.includes('+') ? 'default' : 'secondary'}>
                  {activity.commission}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderApplication = () => (
    <div className="max-w-2xl mx-auto">
      {isApplied ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">신청이 완료되었습니다!</h2>
            <p className="text-gray-600 mb-6">
              제휴 프로그램 신청을 성공적으로 제출했습니다.
              영업일 기준 2-3일 내에 검토 결과를 이메일로 안내드리겠습니다.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg text-left">
              <h3 className="font-semibold mb-2">다음 단계:</h3>
              <ul className="text-sm space-y-1">
                <li>• 신청서 검토 (1-2일)</li>
                <li>• 승인 및 계정 활성화</li>
                <li>• 추천 링크 및 마케팅 자료 제공</li>
                <li>• 오리엔테이션 세션 참여</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-center">제휴 프로그램 신청</CardTitle>
            <p className="text-center text-gray-600">
              아래 정보를 입력하여 제휴 프로그램에 신청하세요.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApplicationSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    value={applicationData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">이메일 *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={applicationData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="website">웹사이트/블로그 URL</Label>
                <Input
                  id="website"
                  value={applicationData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://"
                />
              </div>

              <div>
                <Label htmlFor="socialMedia">소셜미디어 계정</Label>
                <Input
                  id="socialMedia"
                  value={applicationData.socialMedia}
                  onChange={(e) => handleInputChange('socialMedia', e.target.value)}
                  placeholder="Instagram, YouTube, 블로그 등"
                />
              </div>

              <div>
                <Label htmlFor="experience">마케팅 경험</Label>
                <Textarea
                  id="experience"
                  value={applicationData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  placeholder="어필리에이트 마케팅, 콘텐츠 제작, 여행 관련 경험 등을 설명해주세요."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="motivation">지원 동기</Label>
                <Textarea
                  id="motivation"
                  value={applicationData.motivation}
                  onChange={(e) => handleInputChange('motivation', e.target.value)}
                  placeholder="트래브립 제휴 프로그램에 지원하는 이유와 목표를 알려주세요."
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                제휴 프로그램 신청하기
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderResources = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            마케팅 자료
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">배너 이미지</h4>
              <p className="text-sm text-gray-600 mb-3">
                다양한 크기의 배너 이미지를 제공합니다.
              </p>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                다운로드
              </Button>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">상품 이미지</h4>
              <p className="text-sm text-gray-600 mb-3">
                고품질 여행 상품 이미지 팩입니다.
              </p>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                다운로드
              </Button>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">텍스트 링크</h4>
              <p className="text-sm text-gray-600 mb-3">
                복사해서 사용할 수 있는 텍스트 링크들입니다.
              </p>
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                복사
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>가이드라인</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">허용되는 마케팅 방법</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>블로그 포스팅 및 리뷰</li>
              <li>소셜미디어 게시물</li>
              <li>YouTube 영상 콘텐츠</li>
              <li>이메일 뉴스레터</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-red-600">금지되는 마케팅 방법</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>스팸 이메일 발송</li>
              <li>허위 광고 또는 과장된 표현</li>
              <li>타 브랜드 명칭 도용</li>
              <li>성인 콘텐츠와 연관된 마케팅</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              q: '커미션은 언제 지급되나요?',
              a: '매월 말일 기준으로 정산하며, 다음 달 15일에 지급됩니다.'
            },
            {
              q: '최소 지급 금액이 있나요?',
              a: '최소 지급 금액은 50,000원입니다. 이 금액 미만은 다음 달로 이월됩니다.'
            },
            {
              q: '추천 링크의 유효 기간은?',
              a: '쿠키 유효 기간은 30일입니다. 30일 내에 구매하면 커미션이 적용됩니다.'
            },
            {
              q: '자료 사용에 제한이 있나요?',
              a: '제공된 마케팅 자료는 자유롭게 사용 가능하지만, 수정은 금지됩니다.'
            }
          ].map((item, index) => (
            <div key={index} className="border-b last:border-b-0 pb-3 last:pb-0">
              <h4 className="font-semibold mb-1">{item.q}</h4>
              <p className="text-sm text-gray-600">{item.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              뒤로가기
            </Button>
            <h1 className="text-2xl font-bold">제휴 프로그램</h1>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">프로그램 소개</TabsTrigger>
            <TabsTrigger value="dashboard">대시보드</TabsTrigger>
            <TabsTrigger value="apply">신청하기</TabsTrigger>
            <TabsTrigger value="resources">자료실</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6">
            {renderDashboard()}
          </TabsContent>

          <TabsContent value="apply" className="mt-6">
            {renderApplication()}
          </TabsContent>

          <TabsContent value="resources" className="mt-6">
            {renderResources()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}