import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Badge } from '../../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import {
  Users,
  UserPlus,
  Shield,
  Store,
  Car,
  Loader2,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Account {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  partner_id?: number;
  vendor_id?: number;
  vendor_type?: string;
  is_active: boolean;
  created_at: string;
}

export function AdminSettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<string>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // 계정 생성 폼
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'admin',
    // 파트너 전용
    business_name: '',
    business_address: '',
    services: '',
    // 벤더 전용
    vendor_type: 'rentcar',
    contact_email: '',
    contact_phone: ''
  });

  // 계정 목록 로드
  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token');

      const response = await fetch('/api/admin/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setAccounts(data.data || []);
      } else {
        // API가 없으면 빈 배열
        setAccounts([]);
      }
    } catch (error) {
      console.error('계정 목록 로드 오류:', error);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  // 비밀번호 자동 생성
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
    setFormData({ ...formData, password });
    return password;
  };

  // 클립보드 복사
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('클립보드에 복사되었습니다');
    setTimeout(() => setCopied(false), 2000);
  };

  // 계정 생성
  const handleCreateAccount = async () => {
    try {
      if (!formData.username || !formData.email || !formData.password || !formData.name) {
        toast.error('필수 항목을 모두 입력해주세요');
        return;
      }

      const token = localStorage.getItem('auth_token');

      const payload: any = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        role: formData.role
      };

      // 파트너 계정인 경우 추가 정보
      if (formData.role === 'partner') {
        payload.business_name = formData.business_name;
        payload.business_address = formData.business_address;
        payload.services = formData.services;
      }

      // 벤더 계정인 경우 추가 정보
      if (formData.role === 'vendor') {
        payload.vendor_type = formData.vendor_type;
        payload.contact_email = formData.contact_email || formData.email;
        payload.contact_phone = formData.contact_phone || formData.phone;
        payload.business_name = formData.business_name;
      }

      const response = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('계정이 생성되었습니다');
        setShowCreateDialog(false);
        resetForm();
        loadAccounts();
      } else {
        toast.error(data.message || '계정 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('계정 생성 오류:', error);
      toast.error('계정 생성 중 오류가 발생했습니다');
    }
  };

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      name: '',
      phone: '',
      role: 'admin',
      business_name: '',
      business_address: '',
      services: '',
      vendor_type: 'rentcar',
      contact_email: '',
      contact_phone: ''
    });
    setGeneratedPassword('');
  };

  // 계정 삭제
  const handleDeleteAccount = async (accountId: number) => {
    if (!confirm('정말 이 계정을 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`/api/admin/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('계정이 삭제되었습니다');
        loadAccounts();
      } else {
        toast.error(data.message || '계정 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('계정 삭제 오류:', error);
      toast.error('계정 삭제 중 오류가 발생했습니다');
    }
  };

  // 역할별 배지 색상
  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      super_admin: { label: '최고관리자', variant: 'destructive' },
      admin: { label: '관리자', variant: 'destructive' },
      md_admin: { label: 'MD관리자', variant: 'secondary' },
      partner: { label: '파트너', variant: 'default' },
      vendor: { label: '벤더', variant: 'outline' },
      user: { label: '일반회원', variant: 'outline' }
    };

    const config = roleConfig[role] || { label: role, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 계정 유형별 필터링
  const getFilteredAccounts = (type: string) => {
    if (type === 'all') return accounts;
    if (type === 'admin') return accounts.filter(a => ['super_admin', 'admin', 'md_admin'].includes(a.role));
    return accounts.filter(a => a.role === type);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                설정
              </CardTitle>
              <CardDescription>
                계정 관리 및 시스템 설정
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadAccounts}>
                <RefreshCw className="h-4 w-4 mr-2" />
                새로고침
              </Button>
              <Button onClick={() => {
                resetForm();
                setShowCreateDialog(true);
              }}>
                <UserPlus className="h-4 w-4 mr-2" />
                계정 생성
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="admin">관리자</TabsTrigger>
              <TabsTrigger value="partner">파트너</TabsTrigger>
              <TabsTrigger value="vendor">벤더</TabsTrigger>
            </TabsList>

            {['all', 'admin', 'partner', 'vendor'].map(tabValue => (
              <TabsContent key={tabValue} value={tabValue}>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>아이디</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>역할</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>생성일</TableHead>
                        <TableHead className="text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredAccounts(tabValue).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            등록된 계정이 없습니다
                          </TableCell>
                        </TableRow>
                      ) : (
                        getFilteredAccounts(tabValue).map((account) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">{account.username}</TableCell>
                            <TableCell>{account.name}</TableCell>
                            <TableCell>{account.email}</TableCell>
                            <TableCell>
                              {getRoleBadge(account.role)}
                              {account.vendor_type && (
                                <Badge variant="outline" className="ml-1">
                                  {account.vendor_type}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={account.is_active ? 'default' : 'secondary'}>
                                {account.is_active ? '활성' : '비활성'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(account.created_at).toLocaleDateString('ko-KR')}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAccount(account.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 계정 생성 다이얼로그 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 계정 생성</DialogTitle>
            <DialogDescription>
              관리자, MD, 파트너, 벤더 계정을 생성합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* 계정 유형 선택 */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'super_admin', label: '최고관리자', icon: Shield, color: 'bg-red-100 border-red-500' },
                { value: 'md_admin', label: 'MD관리자', icon: Users, color: 'bg-blue-100 border-blue-500' },
                { value: 'partner', label: '파트너', icon: Store, color: 'bg-green-100 border-green-500' },
                { value: 'vendor', label: '벤더', icon: Car, color: 'bg-purple-100 border-purple-500' },
              ].map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: value })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.role === value ? color : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Icon className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">{label}</p>
                </button>
              ))}
            </div>

            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">기본 정보</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>아이디 *</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="영문, 숫자, 언더스코어"
                  />
                </div>
                <div>
                  <Label>이름 *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="홍길동"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>이메일 *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label>전화번호</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="010-1234-5678"
                  />
                </div>
              </div>

              <div>
                <Label>비밀번호 *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="비밀번호"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    자동 생성
                  </Button>
                  {formData.password && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => copyToClipboard(formData.password)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                {generatedPassword && (
                  <p className="text-xs text-green-600 mt-1">
                    생성된 비밀번호: {generatedPassword}
                  </p>
                )}
              </div>
            </div>

            {/* 파트너 추가 정보 */}
            {formData.role === 'partner' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium text-gray-900">파트너 정보</h3>

                <div>
                  <Label>상호명 *</Label>
                  <Input
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="가맹점 이름"
                  />
                </div>

                <div>
                  <Label>사업장 주소</Label>
                  <Input
                    value={formData.business_address}
                    onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                    placeholder="주소"
                  />
                </div>

                <div>
                  <Label>서비스 카테고리</Label>
                  <Input
                    value={formData.services}
                    onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                    placeholder="음식, 숙박, 관광지 등"
                  />
                </div>
              </div>
            )}

            {/* 벤더 추가 정보 */}
            {formData.role === 'vendor' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-medium text-gray-900">벤더 정보</h3>

                <div>
                  <Label>벤더 유형 *</Label>
                  <Select
                    value={formData.vendor_type}
                    onValueChange={(value) => setFormData({ ...formData, vendor_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rentcar">렌트카</SelectItem>
                      <SelectItem value="accommodation">숙박</SelectItem>
                      <SelectItem value="tour">투어</SelectItem>
                      <SelectItem value="food">음식</SelectItem>
                      <SelectItem value="attractions">관광지</SelectItem>
                      <SelectItem value="events">행사</SelectItem>
                      <SelectItem value="experience">체험</SelectItem>
                      <SelectItem value="popup">팝업</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>업체명 *</Label>
                  <Input
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    placeholder="업체 이름"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>담당자 이메일</Label>
                    <Input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="담당자 이메일"
                    />
                  </div>
                  <div>
                    <Label>담당자 전화번호</Label>
                    <Input
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="담당자 연락처"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              취소
            </Button>
            <Button onClick={handleCreateAccount}>
              계정 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
