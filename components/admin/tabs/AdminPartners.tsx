import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import { Switch } from '../../ui/switch';
import {
  Store,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Check,
  X,
  MapPin,
  Phone,
  Ticket,
  Percent,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface Partner {
  id: number;
  user_id: number;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  mobile_phone: string;
  business_address: string;
  location: string;
  services: string;
  base_price: number;
  base_price_text: string;
  detailed_address: string;
  description: string;
  business_hours: string;
  duration: string;
  min_age: number;
  max_capacity: number;
  language: string;
  tier: string;
  partner_type: string;
  is_verified: boolean;
  is_featured: boolean;
  is_active: boolean;
  status: string;
  lat: number;
  lng: number;
  images: string;
  created_at: string;
  updated_at: string;
  // 쿠폰 관련 필드
  is_coupon_partner: boolean;
  coupon_discount_type: 'percent' | 'fixed' | null;
  coupon_discount_value: number | null;
  coupon_max_discount: number | null;
  total_coupon_usage: number;
  total_discount_given: number;
}

export function AdminPartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    phone: '',
    mobile_phone: '',
    business_address: '',
    location: '',
    services: '',
    base_price: 0,
    base_price_text: '',
    detailed_address: '',
    description: '',
    business_hours: '',
    duration: '',
    min_age: 0,
    max_capacity: 0,
    language: '',
    lat: 0,
    lng: 0,
    status: 'approved',
    is_active: true,
    // 쿠폰 설정
    is_coupon_partner: false,
    coupon_discount_type: 'percent' as 'percent' | 'fixed',
    coupon_discount_value: 10,
    coupon_max_discount: 10000
  });

  const [couponSettings, setCouponSettings] = useState({
    is_coupon_partner: false,
    coupon_discount_type: 'percent' as 'percent' | 'fixed',
    coupon_discount_value: 10,
    coupon_max_discount: 10000
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/partners', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        setPartners(data.data || []);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('파트너 조회 오류:', error);
      toast.error('파트너 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.business_name || !formData.email) {
        toast.error('필수 항목을 입력해주세요');
        return;
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('파트너가 생성되었습니다');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchPartners();
      } else {
        toast.error(data.message || '파트너 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('파트너 생성 오류:', error);
      toast.error('파트너 생성 중 오류가 발생했습니다');
    }
  };

  const handleEdit = async () => {
    try {
      if (!selectedPartner) return;

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/partners', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: selectedPartner.id,
          ...formData
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('파트너가 수정되었습니다');
        setIsEditDialogOpen(false);
        setSelectedPartner(null);
        resetForm();
        fetchPartners();
      } else {
        toast.error(data.message || '파트너 수정에 실패했습니다');
      }
    } catch (error) {
      console.error('파트너 수정 오류:', error);
      toast.error('파트너 수정 중 오류가 발생했습니다');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 파트너를 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/partners?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('파트너가 삭제되었습니다');
        fetchPartners();
      } else {
        toast.error(data.message || '파트너 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('파트너 삭제 오류:', error);
      toast.error('파트너 삭제 중 오류가 발생했습니다');
    }
  };

  const handleCouponToggle = async () => {
    if (!selectedPartner) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/partners', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: selectedPartner.id,
          ...couponSettings
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setIsCouponDialogOpen(false);
        setSelectedPartner(null);
        fetchPartners();
      } else {
        toast.error(data.message || '쿠폰 설정 변경에 실패했습니다');
      }
    } catch (error) {
      console.error('쿠폰 설정 오류:', error);
      toast.error('쿠폰 설정 변경 중 오류가 발생했습니다');
    }
  };

  const openEditDialog = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData({
      business_name: partner.business_name || '',
      contact_name: partner.contact_name || '',
      email: partner.email || '',
      phone: partner.phone || '',
      mobile_phone: partner.mobile_phone || '',
      business_address: partner.business_address || '',
      location: partner.location || '',
      services: partner.services || '',
      base_price: partner.base_price || 0,
      base_price_text: partner.base_price_text || '',
      detailed_address: partner.detailed_address || '',
      description: partner.description || '',
      business_hours: partner.business_hours || '',
      duration: partner.duration || '',
      min_age: partner.min_age || 0,
      max_capacity: partner.max_capacity || 0,
      language: partner.language || '',
      lat: partner.lat || 0,
      lng: partner.lng || 0,
      status: partner.status || 'approved',
      is_active: partner.is_active,
      // 쿠폰 설정
      is_coupon_partner: partner.is_coupon_partner || false,
      coupon_discount_type: partner.coupon_discount_type || 'percent',
      coupon_discount_value: partner.coupon_discount_value || 10,
      coupon_max_discount: partner.coupon_max_discount || 10000
    });
    setIsEditDialogOpen(true);
  };

  const openCouponDialog = (partner: Partner) => {
    setSelectedPartner(partner);
    setCouponSettings({
      is_coupon_partner: partner.is_coupon_partner || false,
      coupon_discount_type: partner.coupon_discount_type || 'percent',
      coupon_discount_value: partner.coupon_discount_value || 10,
      coupon_max_discount: partner.coupon_max_discount || 10000
    });
    setIsCouponDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      business_name: '',
      contact_name: '',
      email: '',
      phone: '',
      mobile_phone: '',
      business_address: '',
      location: '',
      services: '',
      base_price: 0,
      base_price_text: '',
      detailed_address: '',
      description: '',
      business_hours: '',
      duration: '',
      min_age: 0,
      max_capacity: 0,
      language: '',
      lat: 0,
      lng: 0,
      status: 'approved',
      is_active: true,
      // 쿠폰 설정
      is_coupon_partner: false,
      coupon_discount_type: 'percent',
      coupon_discount_value: 10,
      coupon_max_discount: 10000
    });
  };

  const couponPartnerCount = partners.filter(p => p.is_coupon_partner).length;

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Store className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">전체 가맹점</p>
                <p className="text-2xl font-bold">{partners.length}개</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Ticket className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">쿠폰 참여 가맹점</p>
                <p className="text-2xl font-bold">{couponPartnerCount}개</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Check className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">승인된 가맹점</p>
                <p className="text-2xl font-bold">{partners.filter(p => p.status === 'approved').length}개</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            가맹점 관리
          </CardTitle>
          <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            가맹점 추가
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <span className="ml-2">가맹점을 불러오는 중...</span>
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-12">
              <Store className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">등록된 가맹점이 없습니다</p>
              <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }} className="mt-4">
                첫 가맹점 등록하기
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold">{partner.business_name}</h3>
                        <Badge variant={partner.status === 'approved' ? 'default' : 'secondary'}>
                          {partner.status === 'approved' ? '승인됨' : partner.status}
                        </Badge>
                        {partner.is_coupon_partner && (
                          <Badge className="bg-green-100 text-green-800">
                            <Ticket className="w-3 h-3 mr-1" />
                            쿠폰 ON
                          </Badge>
                        )}
                        {!partner.is_active && (
                          <Badge variant="outline" className="text-gray-500">
                            <X className="w-3 h-3 mr-1" />
                            비활성
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-2">
                        {partner.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {partner.location}
                          </span>
                        )}
                        {partner.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {partner.phone}
                          </span>
                        )}
                        {partner.services && (
                          <Badge variant="outline">{partner.services}</Badge>
                        )}
                      </div>

                      {partner.is_coupon_partner && (
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center gap-1">
                            <Percent className="w-3 h-3" />
                            {partner.coupon_discount_type === 'percent'
                              ? `${partner.coupon_discount_value}% 할인`
                              : `${partner.coupon_discount_value?.toLocaleString()}원 할인`}
                          </span>
                          {partner.coupon_max_discount && partner.coupon_discount_type === 'percent' && (
                            <span className="bg-gray-100 px-2 py-1 rounded">
                              최대 {partner.coupon_max_discount.toLocaleString()}원
                            </span>
                          )}
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            사용: {partner.total_coupon_usage || 0}건
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCouponDialog(partner)}
                        className={partner.is_coupon_partner ? 'border-green-500 text-green-600' : ''}
                      >
                        <Ticket className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(partner)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(partner.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 가맹점 생성 다이얼로그 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 가맹점 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <PartnerForm formData={formData} setFormData={setFormData} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 가맹점 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>가맹점 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <PartnerForm formData={formData} setFormData={setFormData} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 쿠폰 설정 다이얼로그 */}
      <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              쿠폰 설정 - {selectedPartner?.business_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">쿠폰 참여</p>
                <p className="text-sm text-gray-500">이 가맹점에서 쿠폰 사용 허용</p>
              </div>
              <Switch
                checked={couponSettings.is_coupon_partner}
                onCheckedChange={(checked) => setCouponSettings({ ...couponSettings, is_coupon_partner: checked })}
              />
            </div>

            {couponSettings.is_coupon_partner && (
              <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-700 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  할인 설정
                </h4>

                <div>
                  <Label>할인 타입</Label>
                  <Select
                    value={couponSettings.coupon_discount_type}
                    onValueChange={(value: 'percent' | 'fixed') => setCouponSettings({ ...couponSettings, coupon_discount_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">퍼센트 할인 (%)</SelectItem>
                      <SelectItem value="fixed">정액 할인 (원)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>
                    {couponSettings.coupon_discount_type === 'percent' ? '할인율 (%)' : '할인 금액 (원)'}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={couponSettings.coupon_discount_value || ''}
                      onChange={(e) => setCouponSettings({ ...couponSettings, coupon_discount_value: parseInt(e.target.value) || 0 })}
                      placeholder={couponSettings.coupon_discount_type === 'percent' ? '10' : '5000'}
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {couponSettings.coupon_discount_type === 'percent' ? '%' : '원'}
                    </span>
                  </div>
                </div>

                {couponSettings.coupon_discount_type === 'percent' && (
                  <div>
                    <Label>최대 할인 금액 (원)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={couponSettings.coupon_max_discount || ''}
                        onChange={(e) => setCouponSettings({ ...couponSettings, coupon_max_discount: parseInt(e.target.value) || 0 })}
                        placeholder="10000"
                        className="pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">원</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">퍼센트 할인 시 최대 할인 금액 제한</p>
                  </div>
                )}

                {/* 미리보기 */}
                <div className="p-3 bg-white rounded border">
                  <p className="text-sm text-gray-600 mb-1">할인 미리보기:</p>
                  <p className="font-bold text-purple-700">
                    {couponSettings.coupon_discount_type === 'percent'
                      ? `${couponSettings.coupon_discount_value}% 할인 (최대 ${(couponSettings.coupon_max_discount || 0).toLocaleString()}원)`
                      : `${(couponSettings.coupon_discount_value || 0).toLocaleString()}원 할인`
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCouponDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleCouponToggle}
              className={couponSettings.is_coupon_partner ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {couponSettings.is_coupon_partner ? '쿠폰 활성화 저장' : '쿠폰 비활성화'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PartnerForm({ formData, setFormData }: any) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <Label>상호명 *</Label>
        <Input
          value={formData.business_name}
          onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
          placeholder="가맹점 상호명"
        />
      </div>

      <div>
        <Label>담당자명</Label>
        <Input
          value={formData.contact_name}
          onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
          placeholder="담당자 이름"
        />
      </div>

      <div>
        <Label>이메일 *</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="partner@example.com"
        />
      </div>

      <div>
        <Label>전화번호</Label>
        <Input
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="02-1234-5678"
        />
      </div>

      <div>
        <Label>휴대폰</Label>
        <Input
          value={formData.mobile_phone}
          onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value })}
          placeholder="010-1234-5678"
        />
      </div>

      <div className="col-span-2">
        <Label>주소</Label>
        <Input
          value={formData.business_address}
          onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
          placeholder="사업장 주소"
        />
      </div>

      <div>
        <Label>지역</Label>
        <Input
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="신안군"
        />
      </div>

      <div>
        <Label>서비스 카테고리</Label>
        <Input
          value={formData.services}
          onChange={(e) => setFormData({ ...formData, services: e.target.value })}
          placeholder="식당, 카페, 숙박 등"
        />
      </div>

      <div className="col-span-2">
        <Label>설명</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="가맹점 소개"
          rows={3}
        />
      </div>

      <div>
        <Label>영업시간</Label>
        <Input
          value={formData.business_hours}
          onChange={(e) => setFormData({ ...formData, business_hours: e.target.value })}
          placeholder="09:00 - 18:00"
        />
      </div>

      <div>
        <Label>상태</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">대기</SelectItem>
            <SelectItem value="approved">승인</SelectItem>
            <SelectItem value="rejected">거절</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-2 flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="w-4 h-4"
        />
        <Label htmlFor="is_active">활성 상태</Label>
      </div>

      {/* 쿠폰 설정 섹션 */}
      <div className="col-span-2 border-t pt-4 mt-2">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="is_coupon_partner"
            checked={formData.is_coupon_partner}
            onChange={(e) => setFormData({ ...formData, is_coupon_partner: e.target.checked })}
            className="w-4 h-4"
          />
          <Label htmlFor="is_coupon_partner" className="font-medium text-purple-700">
            쿠폰 참여 가맹점
          </Label>
        </div>

        {formData.is_coupon_partner && (
          <div className="bg-purple-50 rounded-lg p-4 space-y-4 border border-purple-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>할인 타입</Label>
                <Select
                  value={formData.coupon_discount_type}
                  onValueChange={(value: 'percent' | 'fixed') => setFormData({ ...formData, coupon_discount_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">퍼센트 할인 (%)</SelectItem>
                    <SelectItem value="fixed">정액 할인 (원)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  {formData.coupon_discount_type === 'percent' ? '할인율 (%)' : '할인 금액 (원)'}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.coupon_discount_value || ''}
                    onChange={(e) => setFormData({ ...formData, coupon_discount_value: parseInt(e.target.value) || 0 })}
                    placeholder={formData.coupon_discount_type === 'percent' ? '10' : '5000'}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {formData.coupon_discount_type === 'percent' ? '%' : '원'}
                  </span>
                </div>
              </div>
            </div>

            {formData.coupon_discount_type === 'percent' && (
              <div>
                <Label>최대 할인 금액 (원)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.coupon_max_discount || ''}
                    onChange={(e) => setFormData({ ...formData, coupon_max_discount: parseInt(e.target.value) || 0 })}
                    placeholder="10000"
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">원</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">퍼센트 할인 시 최대 할인 금액 제한</p>
              </div>
            )}

            {/* 미리보기 */}
            <div className="p-3 bg-white rounded border">
              <p className="text-sm text-gray-600 mb-1">할인 미리보기:</p>
              <p className="font-bold text-purple-700">
                {formData.coupon_discount_type === 'percent'
                  ? `${formData.coupon_discount_value}% 할인 (최대 ${(formData.coupon_max_discount || 0).toLocaleString()}원)`
                  : `${(formData.coupon_discount_value || 0).toLocaleString()}원 할인`
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
