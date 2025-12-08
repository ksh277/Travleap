import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Badge } from '../../ui/badge';
import {
  QrCode,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Check,
  X,
  Calendar,
  Users,
  Download,
  Copy,
  ExternalLink,
  MapPin,
  Ticket
} from 'lucide-react';
import { toast } from 'sonner';

interface Campaign {
  id: number;
  name: string;
  description: string;
  coupon_id: number;
  coupon_code: string;
  coupon_name: string;
  discount_type: string;
  discount_value: number;
  target_islands: string | null;
  max_claims: number | null;
  current_claims: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  qr_code_url: string;
  claim_url: string;
  created_at: string;
}

interface Coupon {
  id: number;
  code: string;
  name: string;
  discount_type: string;
  discount_value: number;
}

const ISLANDS = [
  { code: 'gaudo', name: '가우도', region: '강진' },
  { code: 'jangdo', name: '장도', region: '보성' },
  { code: 'nangdo', name: '낭도', region: '여수' },
  { code: 'songdo', name: '송도', region: '송도' }
];

export function AdminCouponBookCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coupon_id: '',
    target_islands: [] as string[],
    max_claims: '',
    valid_from: '',
    valid_until: '',
    is_active: true
  });

  useEffect(() => {
    fetchCampaigns();
    fetchCoupons();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/coupon-book-campaigns', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setCampaigns(data.data || []);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('캠페인 조회 오류:', error);
      toast.error('캠페인 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/coupons', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        // 쿠폰북 유형이거나 활성 상태인 쿠폰만 필터
        setCoupons((data.data || []).filter((c: any) => c.is_active));
      }
    } catch (error) {
      console.error('쿠폰 조회 오류:', error);
    }
  };

  const handleCreate = async () => {
    try {
      if (!formData.name || !formData.coupon_id) {
        toast.error('캠페인명과 쿠폰을 선택해주세요');
        return;
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/coupon-book-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          coupon_id: parseInt(formData.coupon_id),
          max_claims: formData.max_claims ? parseInt(formData.max_claims) : null,
          valid_from: formData.valid_from || null,
          valid_until: formData.valid_until || null
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('캠페인이 생성되었습니다');
        setIsCreateDialogOpen(false);
        resetForm();
        fetchCampaigns();
      } else {
        toast.error(data.message || '캠페인 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('캠페인 생성 오류:', error);
      toast.error('캠페인 생성 중 오류가 발생했습니다');
    }
  };

  const handleEdit = async () => {
    try {
      if (!selectedCampaign) return;

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/coupon-book-campaigns', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: selectedCampaign.id,
          ...formData,
          coupon_id: parseInt(formData.coupon_id),
          max_claims: formData.max_claims ? parseInt(formData.max_claims) : null,
          valid_from: formData.valid_from || null,
          valid_until: formData.valid_until || null
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('캠페인이 수정되었습니다');
        setIsEditDialogOpen(false);
        setSelectedCampaign(null);
        resetForm();
        fetchCampaigns();
      } else {
        toast.error(data.message || '캠페인 수정에 실패했습니다');
      }
    } catch (error) {
      console.error('캠페인 수정 오류:', error);
      toast.error('캠페인 수정 중 오류가 발생했습니다');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 캠페인을 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/coupon-book-campaigns?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        fetchCampaigns();
      } else {
        toast.error(data.message || '캠페인 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('캠페인 삭제 오류:', error);
      toast.error('캠페인 삭제 중 오류가 발생했습니다');
    }
  };

  const openEditDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    let parsedIslands: string[] = [];
    try {
      if (campaign.target_islands) {
        parsedIslands = typeof campaign.target_islands === 'string'
          ? JSON.parse(campaign.target_islands)
          : campaign.target_islands;
      }
    } catch {
      parsedIslands = [];
    }

    setFormData({
      name: campaign.name || '',
      description: campaign.description || '',
      coupon_id: String(campaign.coupon_id),
      target_islands: parsedIslands,
      max_claims: campaign.max_claims ? String(campaign.max_claims) : '',
      valid_from: campaign.valid_from ? campaign.valid_from.slice(0, 16) : '',
      valid_until: campaign.valid_until ? campaign.valid_until.slice(0, 16) : '',
      is_active: campaign.is_active
    });
    setIsEditDialogOpen(true);
  };

  const openQRDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsQRDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      coupon_id: '',
      target_islands: [],
      max_claims: '',
      valid_from: '',
      valid_until: '',
      is_active: true
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('클립보드에 복사되었습니다');
  };

  const downloadQRCode = async (campaign: Campaign) => {
    try {
      const response = await fetch(campaign.qr_code_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr_${campaign.name.replace(/\s/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('QR 코드가 다운로드되었습니다');
    } catch (error) {
      toast.error('QR 코드 다운로드에 실패했습니다');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getIslandNames = (islands: string | null) => {
    if (!islands) return '전체';
    try {
      const parsed = typeof islands === 'string' ? JSON.parse(islands) : islands;
      if (!parsed || parsed.length === 0) return '전체';
      return parsed.map((code: string) => {
        const island = ISLANDS.find(i => i.code === code);
        return island ? island.name : code;
      }).join(', ');
    } catch {
      return '전체';
    }
  };

  const toggleIsland = (code: string) => {
    const current = formData.target_islands || [];
    if (current.includes(code)) {
      setFormData({
        ...formData,
        target_islands: current.filter(c => c !== code)
      });
    } else {
      setFormData({
        ...formData,
        target_islands: [...current, code]
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              쿠폰북 캠페인 관리
            </CardTitle>
            <CardDescription>
              QR 포스터 스캔으로 무료 쿠폰을 발급하는 캠페인을 관리합니다
            </CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            새 캠페인
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <span className="ml-2">캠페인을 불러오는 중...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">등록된 캠페인이 없습니다</p>
              <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }} className="mt-4">
                첫 캠페인 만들기
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="border-2 hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold">{campaign.name}</h3>
                          {campaign.is_active ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              활성
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500 text-xs">
                              <X className="w-3 h-3 mr-1" />
                              비활성
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{campaign.description || '설명 없음'}</p>
                      </div>
                    </div>

                    {/* 쿠폰 정보 */}
                    <div className="bg-purple-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Ticket className="w-4 h-4 text-purple-600" />
                        <span className="font-medium">{campaign.coupon_name || campaign.coupon_code}</span>
                      </div>
                      <p className="text-purple-700 font-bold mt-1">
                        {campaign.discount_type === 'percentage'
                          ? `${campaign.discount_value}% 할인`
                          : `${campaign.discount_value?.toLocaleString()}원 할인`}
                      </p>
                    </div>

                    {/* 상태 정보 */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          대상 섬
                        </span>
                        <span className="font-medium">{getIslandNames(campaign.target_islands)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          발급 현황
                        </span>
                        <span className="font-medium">
                          {campaign.current_claims || 0}
                          {campaign.max_claims ? ` / ${campaign.max_claims}` : ' (무제한)'}
                        </span>
                      </div>
                      {(campaign.valid_from || campaign.valid_until) && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            기간
                          </span>
                          <span className="font-medium text-xs">
                            {formatDate(campaign.valid_from)} ~ {formatDate(campaign.valid_until)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openQRDialog(campaign)}
                      >
                        <QrCode className="w-4 h-4 mr-1" />
                        QR
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(campaign)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(campaign.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 캠페인 생성/수정 다이얼로그 */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedCampaign(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? '캠페인 수정' : '새 캠페인 생성'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>캠페인명 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="2025 여름 신안 쿠폰북 캠페인"
              />
            </div>

            <div>
              <Label>설명</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="포스터 QR 스캔 시 발급되는 무료 쿠폰 캠페인입니다."
                rows={2}
              />
            </div>

            <div>
              <Label>발급할 쿠폰 *</Label>
              <Select
                value={formData.coupon_id}
                onValueChange={(value) => setFormData({ ...formData, coupon_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="쿠폰 선택" />
                </SelectTrigger>
                <SelectContent>
                  {coupons.map((coupon) => (
                    <SelectItem key={coupon.id} value={String(coupon.id)}>
                      {coupon.code} - {coupon.name} (
                      {coupon.discount_type === 'percentage'
                        ? `${coupon.discount_value}%`
                        : `${coupon.discount_value?.toLocaleString()}원`}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                쿠폰 관리에서 먼저 쿠폰을 생성해주세요
              </p>
            </div>

            <div>
              <Label className="mb-2 block">대상 섬 (복수 선택 가능)</Label>
              <div className="flex flex-wrap gap-2">
                {ISLANDS.map((island) => (
                  <button
                    key={island.code}
                    type="button"
                    onClick={() => toggleIsland(island.code)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      formData.target_islands.includes(island.code)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {island.name} ({island.region})
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                선택하지 않으면 모든 섬에서 발급 가능
              </p>
            </div>

            <div>
              <Label>최대 발급 수량</Label>
              <Input
                type="number"
                value={formData.max_claims}
                onChange={(e) => setFormData({ ...formData, max_claims: e.target.value })}
                placeholder="무제한"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>시작일</Label>
                <Input
                  type="datetime-local"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>
              <div>
                <Label>종료일</Label>
                <Input
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active">활성 상태</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              setSelectedCampaign(null);
              resetForm();
            }}>
              취소
            </Button>
            <Button onClick={isEditDialogOpen ? handleEdit : handleCreate}>
              {isEditDialogOpen ? '저장' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR 코드 다이얼로그 */}
      <Dialog open={isQRDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsQRDialogOpen(false);
          setSelectedCampaign(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR 코드 - {selectedCampaign?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4 py-4">
              {/* QR 코드 이미지 */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg shadow-lg">
                  <img
                    src={selectedCampaign.qr_code_url}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>
              </div>

              {/* 쿠폰 정보 */}
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">이 QR 코드를 스캔하면</p>
                <p className="text-lg font-bold text-purple-700 mt-1">
                  {selectedCampaign.coupon_name || selectedCampaign.coupon_code}
                </p>
                <p className="text-purple-600">
                  {selectedCampaign.discount_type === 'percentage'
                    ? `${selectedCampaign.discount_value}% 할인`
                    : `${selectedCampaign.discount_value?.toLocaleString()}원 할인`}
                  {' '}쿠폰을 받을 수 있습니다
                </p>
              </div>

              {/* URL 정보 */}
              <div className="space-y-2">
                <Label>발급 페이지 URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={selectedCampaign.claim_url}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(selectedCampaign.claim_url)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedCampaign.claim_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 다운로드 버튼 */}
              <Button
                className="w-full"
                onClick={() => downloadQRCode(selectedCampaign)}
              >
                <Download className="w-4 h-4 mr-2" />
                QR 코드 이미지 다운로드
              </Button>

              <p className="text-xs text-gray-500 text-center">
                이 QR 코드를 포스터에 인쇄하여 배포하세요
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
