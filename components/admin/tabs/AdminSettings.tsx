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
  RefreshCw,
  User,
  Mail,
  Lock,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../hooks/useAuth';

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

interface Listing {
  id: number;
  title: string;
  category: string;
  category_name: string;
  vendor_name?: string;
}

interface Partner {
  id: number;
  business_name: string;
  location: string;
  services: string;
  status: string;
  is_active: boolean;
}

interface UserEditState {
  userId: number | null;
  role: string;
  vendorCategory: string;
  vendorListingId: number | null;
  partnerId: number | null;
}

export function AdminSettings() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<string>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // 내 계정 수정 상태
  const [myAccountData, setMyAccountData] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUpdatingMyAccount, setIsUpdatingMyAccount] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // 사용자 역할 편집 관련 상태
  const [editingUser, setEditingUser] = useState<UserEditState | null>(null);
  const [vendorCategories] = useState([
    { value: 'tour', label: '투어' },
    { value: 'rentcar', label: '렌트카' },
    { value: 'stay', label: '숙박' },
    { value: 'popup', label: '팝업' },
    { value: 'food', label: '음식' },
    { value: 'attractions', label: '관광지' },
    { value: 'events', label: '행사' },
    { value: 'experience', label: '체험' }
  ]);
  const [categoryListings, setCategoryListings] = useState<Listing[]>([]);
  const [partnersList, setPartnersList] = useState<Partner[]>([]);
  const [partnersPage, setPartnersPage] = useState(1);
  const [partnersTotalPages, setPartnersTotalPages] = useState(1);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

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
    // 내 계정 이메일 초기화
    if (user?.email) {
      setMyAccountData(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  // 카테고리별 상품 목록 로드
  const loadCategoryListings = async (category: string) => {
    if (!category) {
      setCategoryListings([]);
      return;
    }
    try {
      setIsLoadingListings(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/user-management-data?type=listings&category=${category}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setCategoryListings(data.data || []);
      }
    } catch (error) {
      console.error('상품 목록 로드 오류:', error);
      setCategoryListings([]);
    } finally {
      setIsLoadingListings(false);
    }
  };

  // 파트너(가맹점) 목록 로드 - 페이지네이션
  const loadPartners = async (page: number = 1) => {
    try {
      setIsLoadingPartners(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/user-management-data?type=partners&page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setPartnersList(data.data || []);
        setPartnersPage(data.pagination?.page || 1);
        setPartnersTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('파트너 목록 로드 오류:', error);
      setPartnersList([]);
    } finally {
      setIsLoadingPartners(false);
    }
  };

  // 사용자 역할 편집 시작
  const startEditingUser = (account: Account) => {
    setEditingUser({
      userId: account.id,
      role: account.role,
      vendorCategory: account.vendor_type || '',
      vendorListingId: account.vendor_id || null,
      partnerId: account.partner_id || null
    });

    // 벤더인 경우 카테고리 상품 로드
    if (account.role === 'vendor' && account.vendor_type) {
      loadCategoryListings(account.vendor_type);
    }

    // 파트너인 경우 가맹점 목록 로드
    if (account.role === 'partner') {
      loadPartners(1);
    }
  };

  // 사용자 역할 저장
  const saveUserRole = async () => {
    if (!editingUser || !editingUser.userId) return;

    try {
      setIsSavingUser(true);
      const token = localStorage.getItem('auth_token');

      const payload: any = {
        userId: editingUser.userId,
        role: editingUser.role
      };

      // 벤더인 경우 추가 정보
      if (editingUser.role === 'vendor') {
        payload.vendorType = editingUser.vendorCategory;
        payload.vendorId = editingUser.vendorListingId;  // listingId -> vendorId
      }

      // 파트너인 경우 추가 정보
      if (editingUser.role === 'partner') {
        payload.partnerId = editingUser.partnerId;
      }

      const response = await fetch('/api/admin/update-user-role', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('사용자 역할이 변경되었습니다');
        setEditingUser(null);
        loadAccounts();
      } else {
        toast.error(data.error || '역할 변경에 실패했습니다');
      }
    } catch (error) {
      console.error('역할 변경 오류:', error);
      toast.error('역할 변경 중 오류가 발생했습니다');
    } finally {
      setIsSavingUser(false);
    }
  };

  // 역할 변경 핸들러
  const handleRoleChange = (role: string) => {
    if (!editingUser) return;

    setEditingUser({
      ...editingUser,
      role,
      vendorCategory: '',
      vendorListingId: null,
      partnerId: null
    });
    setCategoryListings([]);
    setPartnersList([]);

    // 파트너 선택 시 가맹점 목록 로드
    if (role === 'partner') {
      loadPartners(1);
    }
  };

  // 벤더 카테고리 변경 핸들러
  const handleVendorCategoryChange = (category: string) => {
    if (!editingUser) return;

    setEditingUser({
      ...editingUser,
      vendorCategory: category,
      vendorListingId: null
    });

    loadCategoryListings(category);
  };

  // 내 계정 수정
  const handleUpdateMyAccount = async () => {
    try {
      // 비밀번호 변경 시 검증
      if (myAccountData.newPassword) {
        if (myAccountData.newPassword.length < 6) {
          toast.error('새 비밀번호는 6자 이상이어야 합니다');
          return;
        }
        if (myAccountData.newPassword !== myAccountData.confirmPassword) {
          toast.error('새 비밀번호가 일치하지 않습니다');
          return;
        }
        if (!myAccountData.currentPassword) {
          toast.error('현재 비밀번호를 입력해주세요');
          return;
        }
      }

      setIsUpdatingMyAccount(true);
      const token = localStorage.getItem('auth_token');

      const payload: any = {};
      if (myAccountData.email && myAccountData.email !== user?.email) {
        payload.email = myAccountData.email;
      }
      if (myAccountData.newPassword) {
        payload.currentPassword = myAccountData.currentPassword;
        payload.newPassword = myAccountData.newPassword;
      }

      if (Object.keys(payload).length === 0) {
        toast.error('변경할 내용이 없습니다');
        return;
      }

      const response = await fetch('/api/admin/accounts/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('계정 정보가 수정되었습니다');
        // 비밀번호 필드 초기화
        setMyAccountData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        toast.error(data.message || '수정에 실패했습니다');
      }
    } catch (error) {
      console.error('내 계정 수정 오류:', error);
      toast.error('계정 수정 중 오류가 발생했습니다');
    } finally {
      setIsUpdatingMyAccount(false);
    }
  };

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
      {/* 내 계정 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            내 계정
          </CardTitle>
          <CardDescription>
            이메일, 비밀번호 등 내 계정 정보를 수정합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                기본 정보
              </h3>
              <div>
                <Label>아이디</Label>
                <Input value={user?.username || ''} disabled className="bg-gray-50" />
              </div>
              <div>
                <Label>이름</Label>
                <Input value={user?.name || ''} disabled className="bg-gray-50" />
              </div>
              <div>
                <Label>이메일</Label>
                <Input
                  type="email"
                  value={myAccountData.email}
                  onChange={(e) => setMyAccountData({ ...myAccountData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* 비밀번호 변경 */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                비밀번호 변경
              </h3>
              <div>
                <Label>현재 비밀번호</Label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={myAccountData.currentPassword}
                    onChange={(e) => setMyAccountData({ ...myAccountData, currentPassword: e.target.value })}
                    placeholder="현재 비밀번호 입력"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>새 비밀번호</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={myAccountData.newPassword}
                    onChange={(e) => setMyAccountData({ ...myAccountData, newPassword: e.target.value })}
                    placeholder="새 비밀번호 (6자 이상)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>새 비밀번호 확인</Label>
                <Input
                  type="password"
                  value={myAccountData.confirmPassword}
                  onChange={(e) => setMyAccountData({ ...myAccountData, confirmPassword: e.target.value })}
                  placeholder="새 비밀번호 다시 입력"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleUpdateMyAccount} disabled={isUpdatingMyAccount}>
              {isUpdatingMyAccount ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              저장
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 계정 관리 섹션 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                계정 관리
              </CardTitle>
              <CardDescription>
                관리자, MD, 파트너, 벤더 계정을 관리합니다
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
              <TabsTrigger value="user">사용자</TabsTrigger>
            </TabsList>

            {['all', 'admin', 'partner', 'vendor', 'user'].map(tabValue => (
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
                        <TableHead className="min-w-[400px]">역할 설정</TableHead>
                        <TableHead>생성일</TableHead>
                        <TableHead className="text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredAccounts(tabValue).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
                              {editingUser?.userId === account.id ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* 역할 선택 드롭다운 */}
                                  <Select
                                    value={editingUser.role}
                                    onValueChange={handleRoleChange}
                                  >
                                    <SelectTrigger className="w-[120px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">사용자</SelectItem>
                                      <SelectItem value="vendor">벤더</SelectItem>
                                      <SelectItem value="partner">파트너</SelectItem>
                                      <SelectItem value="md_admin">MD관리자</SelectItem>
                                      <SelectItem value="admin">관리자</SelectItem>
                                      <SelectItem value="super_admin">최고관리자</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  {/* 벤더 선택 시: 카테고리 드롭다운 */}
                                  {editingUser.role === 'vendor' && (
                                    <>
                                      <Select
                                        value={editingUser.vendorCategory}
                                        onValueChange={handleVendorCategoryChange}
                                      >
                                        <SelectTrigger className="w-[110px]">
                                          <SelectValue placeholder="카테고리" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {vendorCategories.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                              {cat.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>

                                      {/* 카테고리 선택 후: 상품 드롭다운 */}
                                      {editingUser.vendorCategory && (
                                        <Select
                                          value={editingUser.vendorListingId?.toString() || ''}
                                          onValueChange={(v) => setEditingUser({
                                            ...editingUser,
                                            vendorListingId: parseInt(v, 10)
                                          })}
                                          disabled={isLoadingListings}
                                        >
                                          <SelectTrigger className="w-[150px]">
                                            <SelectValue placeholder={isLoadingListings ? '로딩...' : '상품 선택'} />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {categoryListings.map(listing => (
                                              <SelectItem key={listing.id} value={listing.id.toString()}>
                                                {listing.title}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                    </>
                                  )}

                                  {/* 파트너 선택 시: 가맹점 드롭다운 (페이지네이션) */}
                                  {editingUser.role === 'partner' && (
                                    <div className="flex items-center gap-1">
                                      <Select
                                        value={editingUser.partnerId?.toString() || ''}
                                        onValueChange={(v) => setEditingUser({
                                          ...editingUser,
                                          partnerId: parseInt(v, 10)
                                        })}
                                        disabled={isLoadingPartners}
                                      >
                                        <SelectTrigger className="w-[180px]">
                                          <SelectValue placeholder={isLoadingPartners ? '로딩...' : '가맹점 선택'} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {partnersList.map(partner => (
                                            <SelectItem key={partner.id} value={partner.id.toString()}>
                                              {partner.business_name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {/* 페이지네이션 버튼 */}
                                      <div className="flex items-center gap-1 ml-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          disabled={partnersPage <= 1 || isLoadingPartners}
                                          onClick={() => loadPartners(partnersPage - 1)}
                                        >
                                          &lt;
                                        </Button>
                                        <span className="text-xs text-gray-500 min-w-[40px] text-center">
                                          {partnersPage}/{partnersTotalPages}
                                        </span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          disabled={partnersPage >= partnersTotalPages || isLoadingPartners}
                                          onClick={() => loadPartners(partnersPage + 1)}
                                        >
                                          &gt;
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {/* 저장/취소 버튼 */}
                                  <Button
                                    size="sm"
                                    onClick={saveUserRole}
                                    disabled={isSavingUser}
                                    className="ml-2"
                                  >
                                    {isSavingUser ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingUser(null)}
                                    disabled={isSavingUser}
                                  >
                                    취소
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {getRoleBadge(account.role)}
                                  {account.vendor_type && (
                                    <Badge variant="outline" className="ml-1">
                                      {vendorCategories.find(c => c.value === account.vendor_type)?.label || account.vendor_type}
                                    </Badge>
                                  )}
                                  {account.partner_id && (
                                    <Badge variant="outline" className="ml-1">
                                      가맹점 #{account.partner_id}
                                    </Badge>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditingUser(account)}
                                    className="ml-2"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
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
            <div className="grid grid-cols-5 gap-2">
              {[
                { value: 'super_admin', label: '최고관리자', icon: Shield, color: 'bg-red-100 border-red-500' },
                { value: 'admin', label: '관리자', icon: Shield, color: 'bg-orange-100 border-orange-500' },
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
