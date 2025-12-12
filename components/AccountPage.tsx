import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Settings,
  Shield,
  Bell,
  CreditCard,
  Eye,
  EyeOff,
  ChevronLeft,
  Save,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface AccountPageProps {
  onBack: () => void;
}

export function AccountPage({ onBack }: AccountPageProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 사용자 정보 상태
  const [userInfo, setUserInfo] = useState({
    name: '김신안',
    email: 'kim.shinan@email.com',
    phone: '010-1234-5678',
    address: '전남 신안군 지도읍',
    birthdate: '1990-05-15',
    gender: 'male',
    profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
  });

  // 알림 설정 상태
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    marketing: true,
    booking: true,
    events: false
  });

  // 개인정보 설정 상태
  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    contactVisible: false,
    activityVisible: true,
    dataProcessing: true
  });

  const tabs = [
    { id: 'profile', label: '프로필 관리', icon: User },
    { id: 'security', label: '보안 설정', icon: Shield },
    { id: 'notifications', label: '알림 설정', icon: Bell },
    { id: 'privacy', label: '개인정보 설정', icon: Settings },
    { id: 'payment', label: '결제 관리', icon: CreditCard }
  ];

  const handleSave = () => {
    console.log('Saving user settings...');
    // 실제로는 API 호출
  };

  const handleDeleteAccount = () => {
    console.log('Deleting account...');
    setShowDeleteConfirm(false);
    // 실제로는 계정 삭제 API 호출
  };

  const renderProfileTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          프로필 정보
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 프로필 이미지 */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={userInfo.profileImage}
              alt="프로필"
              className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
            />
            <Button
              size="sm"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-purple-600 hover:bg-purple-700"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <h3 className="text-lg font-semibold">{userInfo.name}</h3>
            <p className="text-sm text-gray-600">회원 가입일: 2024년 1월 15일</p>
            <Badge variant="outline" className="mt-1">일반 회원</Badge>
          </div>
        </div>

        <Separator />

        {/* 기본 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              value={userInfo.name}
              onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={userInfo.email}
              onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              value={userInfo.phone}
              onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="birthdate">생년월일</Label>
            <Input
              id="birthdate"
              type="date"
              value={userInfo.birthdate}
              onChange={(e) => setUserInfo(prev => ({ ...prev, birthdate: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="gender">성별</Label>
            <Select value={userInfo.gender} onValueChange={(value) => setUserInfo(prev => ({ ...prev, gender: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">남성</SelectItem>
                <SelectItem value="female">여성</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="address">주소</Label>
            <Input
              id="address"
              value={userInfo.address}
              onChange={(e) => setUserInfo(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
            <Save className="h-4 w-4 mr-2" />
            저장하기
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderSecurityTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          보안 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 비밀번호 변경 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">비밀번호 변경</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-password">현재 비밀번호</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="현재 비밀번호를 입력하세요"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="new-password">새 비밀번호</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="새 비밀번호를 입력하세요"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">비밀번호 확인</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="새 비밀번호를 다시 입력하세요"
              />
            </div>
            <Button className="bg-purple-600 hover:bg-purple-700">
              비밀번호 변경
            </Button>
          </div>
        </div>

        <Separator />

        {/* 2단계 인증 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">2단계 인증</h3>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">SMS 인증</h4>
              <p className="text-sm text-gray-600">로그인 시 SMS로 인증번호를 받습니다</p>
            </div>
            <Switch />
          </div>
        </div>

        <Separator />

        {/* 로그인 기록 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">최근 로그인 기록</h3>
          <div className="space-y-3">
            {[
              { date: '2024-01-20 14:30', device: 'Chrome - Windows', location: '신안군' },
              { date: '2024-01-19 09:15', device: 'Mobile App - iOS', location: '신안군' },
              { date: '2024-01-18 20:45', device: 'Chrome - Windows', location: '목포시' }
            ].map((log, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{log.device}</p>
                  <p className="text-sm text-gray-600">{log.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{log.date}</p>
                  {index === 0 && <Badge variant="outline" className="text-xs">현재 세션</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderNotificationsTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          알림 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries({
          email: { label: '이메일 알림', desc: '예약 확인, 취소 등 중요한 정보를 이메일로 받습니다' },
          sms: { label: 'SMS 알림', desc: '예약 당일 리마인더를 SMS로 받습니다' },
          push: { label: '푸시 알림', desc: '앱에서 실시간 알림을 받습니다' },
          marketing: { label: '마케팅 알림', desc: '할인 혜택, 이벤트 정보를 받습니다' },
          booking: { label: '예약 알림', desc: '예약 관련 모든 상태 변경을 알립니다' },
          events: { label: '이벤트 알림', desc: '신안 지역 축제, 이벤트 정보를 받습니다' }
        }).map(([key, { label, desc }]) => (
          <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">{label}</h4>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
            <Switch
              checked={notifications[key as keyof typeof notifications]}
              onCheckedChange={(checked) =>
                setNotifications(prev => ({ ...prev, [key]: checked }))
              }
            />
          </div>
        ))}

        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
            <Save className="h-4 w-4 mr-2" />
            설정 저장
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPrivacyTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          개인정보 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries({
          profileVisible: { label: '프로필 공개', desc: '다른 사용자에게 프로필을 공개합니다' },
          contactVisible: { label: '연락처 공개', desc: '파트너업체에게 연락처를 공개합니다' },
          activityVisible: { label: '활동 정보 공개', desc: '리뷰, 예약 기록을 공개합니다' },
          dataProcessing: { label: '데이터 활용 동의', desc: '서비스 개선을 위한 데이터 분석에 동의합니다' }
        }).map(([key, { label, desc }]) => (
          <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">{label}</h4>
              <p className="text-sm text-gray-600">{desc}</p>
            </div>
            <Switch
              checked={privacy[key as keyof typeof privacy]}
              onCheckedChange={(checked) =>
                setPrivacy(prev => ({ ...prev, [key]: checked }))
              }
            />
          </div>
        ))}

        <Separator />

        {/* 데이터 다운로드/삭제 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">데이터 관리</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              내 데이터 다운로드
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              계정 삭제
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
            <Save className="h-4 w-4 mr-2" />
            설정 저장
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPaymentTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          결제 관리
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 등록된 카드 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">등록된 결제 수단</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  VISA
                </div>
                <div>
                  <p className="font-medium">**** **** **** 1234</p>
                  <p className="text-sm text-gray-600">만료일: 12/26</p>
                </div>
              </div>
              <Badge>기본 카드</Badge>
            </div>
            <Button variant="outline" className="w-full">
              새 결제 수단 추가
            </Button>
          </div>
        </div>

        <Separator />

        {/* 결제 내역 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">최근 결제 내역</h3>
          <div className="space-y-3">
            {[
              { date: '2024-01-18', item: '퍼플섬 투어', amount: '45,000원', status: '완료' },
              { date: '2024-01-15', item: '임자도 리조트', amount: '180,000원', status: '완료' },
              { date: '2024-01-10', item: '해물탕 예약', amount: '35,000원', status: '완료' }
            ].map((payment, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{payment.item}</p>
                  <p className="text-sm text-gray-600">{payment.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{payment.amount}</p>
                  <Badge variant="outline" className="text-xs">{payment.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* 환불 정책 */}
        <div>
          <h3 className="text-lg font-semibold mb-4">환불 정책</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <ul className="text-sm space-y-2">
              <li>• 투어 시작 24시간 전: 100% 환불</li>
              <li>• 투어 시작 12시간 전: 50% 환불</li>
              <li>• 투어 시작 후: 환불 불가</li>
              <li>• 숙박 예약: 체크인 1일 전까지 무료 취소</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-content mx-auto px-4 md:px-10 lg:px-20 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              뒤로가기
            </Button>
            <h1 className="text-2xl font-bold">계정 관리</h1>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-content mx-auto px-4 md:px-10 lg:px-20 py-8">
        <div className="flex gap-8">
          {/* 사이드 메뉴 */}
          <div className="w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? 'bg-purple-100 text-purple-700'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* 메인 컨텐츠 */}
          <div className="flex-1">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'security' && renderSecurityTab()}
            {activeTab === 'notifications' && renderNotificationsTab()}
            {activeTab === 'privacy' && renderPrivacyTab()}
            {activeTab === 'payment' && renderPaymentTab()}
          </div>
        </div>
      </div>

      {/* 계정 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                계정 삭제 확인
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.
                이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteAccount}
                >
                  삭제
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}