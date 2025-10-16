import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import {
  ChevronLeft,
  Shield,
  FileText,
  Cookie,
  Scale,
  Eye,
  AlertTriangle,
  Mail,
  Phone
} from 'lucide-react';

interface LegalPageProps {
  onBack: () => void;
}

export function LegalPage({ onBack }: LegalPageProps) {
  const [activeTab, setActiveTab] = useState('privacy');

  const lastUpdated = '2024년 3월 1일';

  const renderPrivacyPolicy = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6 text-purple-600" />
        <h2 className="text-2xl font-bold">개인정보 처리방침</h2>
        <Badge variant="outline">최종 업데이트: {lastUpdated}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            1. 개인정보의 처리 목적
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            어썸플랜('트래브립')은 다음의 목적을 위하여 개인정보를 처리하고 있으며,
            다음의 목적 이외의 용도로는 이용하지 않습니다.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>고객 가입의사 확인, 고객에 대한 서비스 제공에 따른 본인 식별·인증</li>
            <li>회원자격 유지·관리, 기존고객 서비스 이용에 따른 정산</li>
            <li>서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산</li>
            <li>고충처리 목적으로 개인정보를 처리합니다</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            2. 개인정보의 처리 및 보유 기간
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            트래브립은 정보주체로부터 개인정보를 수집할 때 동의 받은 개인정보 보유·이용기간
            또는 법령에 따른 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">구체적인 개인정보 처리 및 보유 기간은 다음과 같습니다:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>홈페이지 회원가입 및 관리: 사업자/단체 홈페이지 탈퇴시까지</li>
              <li>재화 또는 서비스 제공: 계약이행완료시까지</li>
              <li>전자상거래에서의 계약·청약철회, 대금결제, 재화 등 공급기록: 5년</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            3. 개인정보의 제3자 제공에 관한 사항
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">
            트래브립은 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에
            해당하는 경우에만 개인정보를 제3자에게 제공합니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            4. 개인정보처리의 위탁에 관한 사항
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            트래브립은 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">위탁업체 정보:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>결제서비스: 토스페이먼츠, 카카오페이 등</li>
              <li>문자발송: CJ올리브네트웍스</li>
              <li>이메일발송: 센드그리드</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTermsOfService = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="h-6 w-6 text-purple-600" />
        <h2 className="text-2xl font-bold">서비스 이용약관</h2>
        <Badge variant="outline">최종 업데이트: {lastUpdated}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>제1조 (목적)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">
            이 약관은 어썸플랜(이하 "회사")이 제공하는 트래브립 서비스(이하 "서비스")의
            이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을
            규정함을 목적으로 합니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>제2조 (정의)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-700 leading-relaxed">이 약관에서 사용하는 용어의 정의는 다음과 같습니다:</p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="font-semibold min-w-[60px]">1.</span>
              <span className="text-gray-700">"서비스"란 회사가 제공하는 신안군 여행 정보 제공 및 예약 서비스를 의미합니다.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold min-w-[60px]">2.</span>
              <span className="text-gray-700">"이용자"란 이 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold min-w-[60px]">3.</span>
              <span className="text-gray-700">"회원"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>제3조 (서비스의 제공)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-700 leading-relaxed">회사는 다음과 같은 서비스를 제공합니다:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>신안군 여행지 정보 제공 서비스</li>
            <li>숙박, 투어, 체험 프로그램 예약 서비스</li>
            <li>여행 상품 추천 및 맞춤형 정보 제공 서비스</li>
            <li>기타 회사가 정하는 서비스</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>제4조 (서비스 이용료)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">
            서비스 이용은 무료가 원칙입니다. 단, 유료 상품의 예약 및 구매 시에는 해당 상품의
            이용료가 부과되며, 요금 체계는 각 상품 페이지에서 확인할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderCookiePolicy = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Cookie className="h-6 w-6 text-purple-600" />
        <h2 className="text-2xl font-bold">쿠키 정책</h2>
        <Badge variant="outline">최종 업데이트: {lastUpdated}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>쿠키란 무엇인가요?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">
            쿠키(Cookie)는 웹사이트를 방문할 때 사용자의 컴퓨터에 저장되는 작은 텍스트 파일입니다.
            트래브립은 서비스 개선과 사용자 경험 향상을 위해 쿠키를 사용합니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>우리가 사용하는 쿠키의 유형</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-blue-700">필수 쿠키</h4>
              <p className="text-sm text-gray-600">웹사이트의 기본 기능을 제공하기 위해 필요한 쿠키입니다.</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-green-700">성능 쿠키</h4>
              <p className="text-sm text-gray-600">웹사이트 사용 현황을 분석하여 서비스 개선에 활용합니다.</p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-semibold text-yellow-700">기능 쿠키</h4>
              <p className="text-sm text-gray-600">사용자의 선택사항을 기억하여 개인화된 서비스를 제공합니다.</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold text-purple-700">마케팅 쿠키</h4>
              <p className="text-sm text-gray-600">사용자 관심사에 맞는 광고를 제공하기 위해 사용됩니다.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>쿠키 관리 방법</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-700 leading-relaxed">
            대부분의 브라우저에서는 쿠키 설정을 관리할 수 있습니다:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Chrome: 설정 → 개인정보 및 보안 → 쿠키 및 기타 사이트 데이터</li>
            <li>Firefox: 설정 → 개인정보 및 보안 → 쿠키 및 사이트 데이터</li>
            <li>Safari: 환경설정 → 개인정보 → 쿠키 및 웹사이트 데이터</li>
            <li>Edge: 설정 → 쿠키 및 사이트 권한</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );

  const renderDataProcessing = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Scale className="h-6 w-6 text-purple-600" />
        <h2 className="text-2xl font-bold">데이터 처리 방침</h2>
        <Badge variant="outline">최종 업데이트: {lastUpdated}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>데이터 수집 및 사용</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700 leading-relaxed">
            트래브립은 서비스 제공을 위해 최소한의 개인정보만을 수집하며,
            수집된 정보는 다음과 같은 목적으로만 사용됩니다:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-700 mb-2">필수 정보</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 이메일 주소</li>
                <li>• 이름</li>
                <li>• 전화번호</li>
              </ul>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-700 mb-2">선택 정보</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 생년월일</li>
                <li>• 성별</li>
                <li>• 주소</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>데이터 보안</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-700 leading-relaxed">
            트래브립은 고객의 개인정보를 안전하게 보호하기 위해 다음과 같은 보안 조치를 시행하고 있습니다:
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>SSL 암호화를 통한 데이터 전송 보호</li>
            <li>정기적인 보안 점검 및 취약점 분석</li>
            <li>개인정보 접근 권한 제한 및 관리</li>
            <li>개인정보 처리시스템 접근기록 보관 및 점검</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>사용자 권리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-700 leading-relaxed">
            개인정보주체는 언제든지 다음과 같은 권리를 행사할 수 있습니다:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="text-sm">개인정보 열람 요구</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-sm">정정·삭제 요구</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Shield className="h-4 w-4 text-yellow-600" />
              <span className="text-sm">처리정지 요구</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm">손해배상 청구</span>
            </div>
          </div>
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
            <h1 className="text-2xl font-bold">법적 고지사항</h1>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="text-gray-600 leading-relaxed">
            트래브립 서비스 이용과 관련된 법적 정보를 확인하실 수 있습니다.
            서비스 이용 전 반드시 숙지해 주시기 바랍니다.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="privacy" className="text-sm">
              개인정보 처리방침
            </TabsTrigger>
            <TabsTrigger value="terms" className="text-sm">
              서비스 이용약관
            </TabsTrigger>
            <TabsTrigger value="cookies" className="text-sm">
              쿠키 정책
            </TabsTrigger>
            <TabsTrigger value="data" className="text-sm">
              데이터 처리 방침
            </TabsTrigger>
          </TabsList>

          <TabsContent value="privacy" className="mt-6">
            {renderPrivacyPolicy()}
          </TabsContent>

          <TabsContent value="terms" className="mt-6">
            {renderTermsOfService()}
          </TabsContent>

          <TabsContent value="cookies" className="mt-6">
            {renderCookiePolicy()}
          </TabsContent>

          <TabsContent value="data" className="mt-6">
            {renderDataProcessing()}
          </TabsContent>
        </Tabs>

        {/* 연락처 정보 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              문의사항
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">개인정보보호 담당자</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>awesomeplan4606@naver.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>010-4617-1303</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">회사 정보</h4>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>어썸플랜</p>
                  <p>대표: 함은비</p>
                  <p>주소: 전남 목포시 원산중앙로 44, 2층</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}