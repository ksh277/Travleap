import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import {
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  DollarSign,
  Shield,
  Package,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { rentcarApi } from '../../utils/rentcar-api';
import type {
  RentcarVendor,
  RentcarRatePlan,
  RentcarRatePlanFormData,
  RentcarInsurancePlan,
  RentcarInsurancePlanFormData,
  RentcarExtra,
  RentcarExtraFormData,
  VehicleClass,
  InsuranceType,
  ExtraType,
  ExtraPricingType
} from '../../types/rentcar';

interface RentcarAdvancedFeaturesProps {
  vendors: RentcarVendor[];
  selectedVendorId: number | null;
}

export const RentcarAdvancedFeatures: React.FC<RentcarAdvancedFeaturesProps> = ({
  vendors,
  selectedVendorId
}) => {
  // State for rate plans
  const [ratePlans, setRatePlans] = useState<RentcarRatePlan[]>([]);
  const [selectedRatePlan, setSelectedRatePlan] = useState<RentcarRatePlan | null>(null);
  const [isRatePlanDialogOpen, setIsRatePlanDialogOpen] = useState(false);
  const [ratePlanFormData, setRatePlanFormData] = useState<RentcarRatePlanFormData>({
    plan_name: '',
    plan_code: '',
    start_date: '',
    end_date: '',
    daily_rate_krw: 0
  });

  // State for insurance plans
  const [insurancePlans, setInsurancePlans] = useState<RentcarInsurancePlan[]>([]);
  const [selectedInsurance, setSelectedInsurance] = useState<RentcarInsurancePlan | null>(null);
  const [isInsuranceDialogOpen, setIsInsuranceDialogOpen] = useState(false);
  const [insuranceFormData, setInsuranceFormData] = useState<RentcarInsurancePlanFormData>({
    insurance_code: '',
    insurance_name: '',
    insurance_type: 'cdw',
    daily_price_krw: 0,
    deductible_krw: 0
  });

  // State for extras
  const [extras, setExtras] = useState<RentcarExtra[]>([]);
  const [selectedExtra, setSelectedExtra] = useState<RentcarExtra | null>(null);
  const [isExtraDialogOpen, setIsExtraDialogOpen] = useState(false);
  const [extraFormData, setExtraFormData] = useState<RentcarExtraFormData>({
    extra_code: '',
    extra_name: '',
    extra_type: 'gps',
    pricing_type: 'per_day',
    price_krw: 0
  });

  // Load data when vendor changes
  useEffect(() => {
    if (selectedVendorId) {
      loadRatePlans();
      loadInsurancePlans();
      loadExtras();
    }
  }, [selectedVendorId]);

  // Load rate plans
  const loadRatePlans = async () => {
    if (!selectedVendorId) return;
    const response = await rentcarApi.ratePlans.getByVendor(selectedVendorId);
    if (response.success && response.data) {
      setRatePlans(response.data);
    }
  };

  // Load insurance plans
  const loadInsurancePlans = async () => {
    if (!selectedVendorId) return;
    const response = await rentcarApi.insurance.getByVendor(selectedVendorId);
    if (response.success && response.data) {
      setInsurancePlans(response.data);
    }
  };

  // Load extras
  const loadExtras = async () => {
    if (!selectedVendorId) return;
    const response = await rentcarApi.extras.getByVendor(selectedVendorId);
    if (response.success && response.data) {
      setExtras(response.data);
    }
  };

  // Rate Plan handlers
  const handleOpenRatePlanDialog = (ratePlan?: RentcarRatePlan) => {
    if (ratePlan) {
      setSelectedRatePlan(ratePlan);
      setRatePlanFormData({
        vehicle_id: ratePlan.vehicle_id,
        vehicle_class: ratePlan.vehicle_class,
        plan_name: ratePlan.plan_name,
        plan_code: ratePlan.plan_code,
        description: ratePlan.description,
        start_date: ratePlan.start_date,
        end_date: ratePlan.end_date,
        daily_rate_krw: ratePlan.daily_rate_krw,
        weekly_rate_krw: ratePlan.weekly_rate_krw,
        monthly_rate_krw: ratePlan.monthly_rate_krw,
        min_rental_days: ratePlan.min_rental_days,
        max_rental_days: ratePlan.max_rental_days,
        weekend_surcharge_percent: ratePlan.weekend_surcharge_percent,
        weekday_discount_percent: ratePlan.weekday_discount_percent,
        early_bird_days: ratePlan.early_bird_days,
        early_bird_discount_percent: ratePlan.early_bird_discount_percent,
        long_term_days: ratePlan.long_term_days,
        long_term_discount_percent: ratePlan.long_term_discount_percent,
        priority: ratePlan.priority
      });
    } else {
      setSelectedRatePlan(null);
      setRatePlanFormData({
        plan_name: '',
        plan_code: '',
        start_date: '',
        end_date: '',
        daily_rate_krw: 0
      });
    }
    setIsRatePlanDialogOpen(true);
  };

  const handleSaveRatePlan = async () => {
    if (!selectedVendorId) {
      toast.error('벤더를 먼저 선택해주세요.');
      return;
    }

    try {
      if (selectedRatePlan) {
        const response = await rentcarApi.ratePlans.update(selectedRatePlan.id, ratePlanFormData);
        if (response.success) {
          toast.success('요금제가 수정되었습니다.');
          loadRatePlans();
          setIsRatePlanDialogOpen(false);
        } else {
          toast.error(response.error || '요금제 수정에 실패했습니다.');
        }
      } else {
        const response = await rentcarApi.ratePlans.create(selectedVendorId, ratePlanFormData);
        if (response.success) {
          toast.success('요금제가 등록되었습니다.');
          loadRatePlans();
          setIsRatePlanDialogOpen(false);
        } else {
          toast.error(response.error || '요금제 등록에 실패했습니다.');
        }
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.');
    }
  };

  const handleDeleteRatePlan = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const response = await rentcarApi.ratePlans.delete(id);
    if (response.success) {
      toast.success('요금제가 삭제되었습니다.');
      loadRatePlans();
    } else {
      toast.error(response.error || '요금제 삭제에 실패했습니다.');
    }
  };

  const handleToggleRatePlanActive = async (id: number, isActive: boolean) => {
    const response = await rentcarApi.ratePlans.toggleActive(id, isActive);
    if (response.success) {
      toast.success(isActive ? '요금제가 활성화되었습니다.' : '요금제가 비활성화되었습니다.');
      loadRatePlans();
    } else {
      toast.error(response.error || '상태 변경에 실패했습니다.');
    }
  };

  // Insurance handlers
  const handleOpenInsuranceDialog = (insurance?: RentcarInsurancePlan) => {
    if (insurance) {
      setSelectedInsurance(insurance);
      setInsuranceFormData({
        insurance_code: insurance.insurance_code,
        insurance_name: insurance.insurance_name,
        insurance_type: insurance.insurance_type,
        description: insurance.description,
        daily_price_krw: insurance.daily_price_krw,
        max_coverage_krw: insurance.max_coverage_krw,
        deductible_krw: insurance.deductible_krw,
        min_driver_age: insurance.min_driver_age,
        requires_license_years: insurance.requires_license_years,
        is_recommended: insurance.is_recommended,
        display_order: insurance.display_order
      });
    } else {
      setSelectedInsurance(null);
      setInsuranceFormData({
        insurance_code: '',
        insurance_name: '',
        insurance_type: 'cdw',
        daily_price_krw: 0,
        deductible_krw: 0
      });
    }
    setIsInsuranceDialogOpen(true);
  };

  const handleSaveInsurance = async () => {
    if (!selectedVendorId) {
      toast.error('벤더를 먼저 선택해주세요.');
      return;
    }

    try {
      if (selectedInsurance) {
        const response = await rentcarApi.insurance.update(selectedInsurance.id, insuranceFormData);
        if (response.success) {
          toast.success('보험 상품이 수정되었습니다.');
          loadInsurancePlans();
          setIsInsuranceDialogOpen(false);
        } else {
          toast.error(response.error || '보험 수정에 실패했습니다.');
        }
      } else {
        const response = await rentcarApi.insurance.create(selectedVendorId, insuranceFormData);
        if (response.success) {
          toast.success('보험 상품이 등록되었습니다.');
          loadInsurancePlans();
          setIsInsuranceDialogOpen(false);
        } else {
          toast.error(response.error || '보험 등록에 실패했습니다.');
        }
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.');
    }
  };

  const handleDeleteInsurance = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const response = await rentcarApi.insurance.delete(id);
    if (response.success) {
      toast.success('보험 상품이 삭제되었습니다.');
      loadInsurancePlans();
    } else {
      toast.error(response.error || '보험 삭제에 실패했습니다.');
    }
  };

  const handleToggleInsuranceActive = async (id: number, isActive: boolean) => {
    const response = await rentcarApi.insurance.toggleActive(id, isActive);
    if (response.success) {
      toast.success(isActive ? '보험이 활성화되었습니다.' : '보험이 비활성화되었습니다.');
      loadInsurancePlans();
    } else {
      toast.error(response.error || '상태 변경에 실패했습니다.');
    }
  };

  // Extra handlers
  const handleOpenExtraDialog = (extra?: RentcarExtra) => {
    if (extra) {
      setSelectedExtra(extra);
      setExtraFormData({
        extra_code: extra.extra_code,
        extra_name: extra.extra_name,
        extra_type: extra.extra_type,
        description: extra.description,
        pricing_type: extra.pricing_type,
        price_krw: extra.price_krw,
        max_quantity: extra.max_quantity,
        available_quantity: extra.available_quantity,
        is_mandatory: extra.is_mandatory,
        is_prepaid: extra.is_prepaid,
        icon_url: extra.icon_url,
        image_url: extra.image_url,
        display_order: extra.display_order,
        badge_text: extra.badge_text
      });
    } else {
      setSelectedExtra(null);
      setExtraFormData({
        extra_code: '',
        extra_name: '',
        extra_type: 'gps',
        pricing_type: 'per_day',
        price_krw: 0
      });
    }
    setIsExtraDialogOpen(true);
  };

  const handleSaveExtra = async () => {
    if (!selectedVendorId) {
      toast.error('벤더를 먼저 선택해주세요.');
      return;
    }

    try {
      if (selectedExtra) {
        const response = await rentcarApi.extras.update(selectedExtra.id, extraFormData);
        if (response.success) {
          toast.success('부가 옵션이 수정되었습니다.');
          loadExtras();
          setIsExtraDialogOpen(false);
        } else {
          toast.error(response.error || '부가 옵션 수정에 실패했습니다.');
        }
      } else {
        const response = await rentcarApi.extras.create(selectedVendorId, extraFormData);
        if (response.success) {
          toast.success('부가 옵션이 등록되었습니다.');
          loadExtras();
          setIsExtraDialogOpen(false);
        } else {
          toast.error(response.error || '부가 옵션 등록에 실패했습니다.');
        }
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.');
    }
  };

  const handleDeleteExtra = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const response = await rentcarApi.extras.delete(id);
    if (response.success) {
      toast.success('부가 옵션이 삭제되었습니다.');
      loadExtras();
    } else {
      toast.error(response.error || '부가 옵션 삭제에 실패했습니다.');
    }
  };

  const handleToggleExtraActive = async (id: number, isActive: boolean) => {
    const response = await rentcarApi.extras.toggleActive(id, isActive);
    if (response.success) {
      toast.success(isActive ? '부가 옵션이 활성화되었습니다.' : '부가 옵션이 비활성화되었습니다.');
      loadExtras();
    } else {
      toast.error(response.error || '상태 변경에 실패했습니다.');
    }
  };

  // Get labels
  const getInsuranceTypeLabel = (type: InsuranceType) => {
    const labels: Record<InsuranceType, string> = {
      cdw: 'CDW (자차손해)',
      tp: 'TP (도난)',
      pai: 'PAI (탑승자상해)',
      lli: 'LLI (대인대물)',
      other: '기타'
    };
    return labels[type] || type;
  };

  const getExtraTypeLabel = (type: ExtraType) => {
    const labels: Record<ExtraType, string> = {
      gps: 'GPS',
      child_seat: '카시트',
      wifi: '와이파이',
      additional_driver: '추가 운전자',
      pickup_service: '픽업 서비스',
      equipment: '장비',
      other: '기타'
    };
    return labels[type] || type;
  };

  if (!selectedVendorId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          벤더를 먼저 선택해주세요.
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="rateplans" className="space-y-6">
      <TabsList className="grid grid-cols-3 w-full max-w-2xl">
        <TabsTrigger value="rateplans">
          <DollarSign className="h-4 w-4 mr-2" />
          요금제
        </TabsTrigger>
        <TabsTrigger value="insurance">
          <Shield className="h-4 w-4 mr-2" />
          보험 상품
        </TabsTrigger>
        <TabsTrigger value="extras">
          <Package className="h-4 w-4 mr-2" />
          부가 옵션
        </TabsTrigger>
      </TabsList>

      {/* 요금제 관리 */}
      <TabsContent value="rateplans" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>요금제 관리</CardTitle>
              <Button
                className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                onClick={() => handleOpenRatePlanDialog()}
              >
                <Plus className="h-4 w-4 mr-2" />
                요금제 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>요금제명</TableHead>
                    <TableHead>요금제 코드</TableHead>
                    <TableHead>적용 기간</TableHead>
                    <TableHead>일일 요금</TableHead>
                    <TableHead>주말 할증</TableHead>
                    <TableHead>평일 할인</TableHead>
                    <TableHead>우선순위</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ratePlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.plan_name}</TableCell>
                      <TableCell>{plan.plan_code}</TableCell>
                      <TableCell>
                        {plan.start_date} ~ {plan.end_date}
                      </TableCell>
                      <TableCell>₩{plan.daily_rate_krw.toLocaleString()}</TableCell>
                      <TableCell>{plan.weekend_surcharge_percent}%</TableCell>
                      <TableCell>{plan.weekday_discount_percent}%</TableCell>
                      <TableCell>{plan.priority}</TableCell>
                      <TableCell>
                        <Badge className={plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {plan.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleRatePlanActive(plan.id, !plan.is_active)}
                          >
                            {plan.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRatePlanDialog(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRatePlan(plan.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* 보험 상품 관리 */}
      <TabsContent value="insurance" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>보험 상품 관리</CardTitle>
              <Button
                className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                onClick={() => handleOpenInsuranceDialog()}
              >
                <Plus className="h-4 w-4 mr-2" />
                보험 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>보험명</TableHead>
                    <TableHead>보험 코드</TableHead>
                    <TableHead>타입</TableHead>
                    <TableHead>일일 요금</TableHead>
                    <TableHead>최대 보상액</TableHead>
                    <TableHead>자기부담금</TableHead>
                    <TableHead>추천</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insurancePlans.map((insurance) => (
                    <TableRow key={insurance.id}>
                      <TableCell className="font-medium">{insurance.insurance_name}</TableCell>
                      <TableCell>{insurance.insurance_code}</TableCell>
                      <TableCell>{getInsuranceTypeLabel(insurance.insurance_type)}</TableCell>
                      <TableCell>₩{insurance.daily_price_krw.toLocaleString()}</TableCell>
                      <TableCell>
                        {insurance.max_coverage_krw
                          ? `₩${insurance.max_coverage_krw.toLocaleString()}`
                          : '-'}
                      </TableCell>
                      <TableCell>₩{insurance.deductible_krw.toLocaleString()}</TableCell>
                      <TableCell>
                        {insurance.is_recommended && (
                          <Badge className="bg-blue-100 text-blue-800">추천</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={insurance.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {insurance.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleInsuranceActive(insurance.id, !insurance.is_active)}
                          >
                            {insurance.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenInsuranceDialog(insurance)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteInsurance(insurance.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* 부가 옵션 관리 */}
      <TabsContent value="extras" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>부가 옵션 관리</CardTitle>
              <Button
                className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                onClick={() => handleOpenExtraDialog()}
              >
                <Plus className="h-4 w-4 mr-2" />
                옵션 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>옵션명</TableHead>
                    <TableHead>옵션 코드</TableHead>
                    <TableHead>타입</TableHead>
                    <TableHead>요금 방식</TableHead>
                    <TableHead>가격</TableHead>
                    <TableHead>최대 수량</TableHead>
                    <TableHead>배지</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {extras.map((extra) => (
                    <TableRow key={extra.id}>
                      <TableCell className="font-medium">{extra.extra_name}</TableCell>
                      <TableCell>{extra.extra_code}</TableCell>
                      <TableCell>{getExtraTypeLabel(extra.extra_type)}</TableCell>
                      <TableCell>{extra.pricing_type === 'per_day' ? '일별' : '건별'}</TableCell>
                      <TableCell>₩{extra.price_krw.toLocaleString()}</TableCell>
                      <TableCell>{extra.max_quantity}</TableCell>
                      <TableCell>
                        {extra.badge_text && (
                          <Badge className="bg-purple-100 text-purple-800">{extra.badge_text}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={extra.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {extra.is_active ? '활성' : '비활성'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleExtraActive(extra.id, !extra.is_active)}
                          >
                            {extra.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenExtraDialog(extra)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteExtra(extra.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Rate Plan Dialog */}
      <Dialog open={isRatePlanDialogOpen} onOpenChange={setIsRatePlanDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRatePlan ? '요금제 수정' : '요금제 추가'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>요금제명*</Label>
                <Input
                  value={ratePlanFormData.plan_name}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, plan_name: e.target.value })}
                  placeholder="예: 성수기 주말 요금"
                />
              </div>
              <div>
                <Label>요금제 코드*</Label>
                <Input
                  value={ratePlanFormData.plan_code}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, plan_code: e.target.value })}
                  placeholder="예: HIGH_SEASON_WEEKEND"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>시작일*</Label>
                <Input
                  type="date"
                  value={ratePlanFormData.start_date}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>종료일*</Label>
                <Input
                  type="date"
                  value={ratePlanFormData.end_date}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>일일 요금 (KRW)*</Label>
                <Input
                  type="number"
                  value={ratePlanFormData.daily_rate_krw}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, daily_rate_krw: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>주간 요금 (KRW)</Label>
                <Input
                  type="number"
                  value={ratePlanFormData.weekly_rate_krw || ''}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, weekly_rate_krw: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
              <div>
                <Label>월간 요금 (KRW)</Label>
                <Input
                  type="number"
                  value={ratePlanFormData.monthly_rate_krw || ''}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, monthly_rate_krw: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>주말 할증율 (%)</Label>
                <Input
                  type="number"
                  value={ratePlanFormData.weekend_surcharge_percent || 0}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, weekend_surcharge_percent: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>평일 할인율 (%)</Label>
                <Input
                  type="number"
                  value={ratePlanFormData.weekday_discount_percent || 0}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, weekday_discount_percent: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>설명</Label>
              <Textarea
                value={ratePlanFormData.description || ''}
                onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsRatePlanDialogOpen(false)}>
                취소
              </Button>
              <Button className="bg-[#8B5FBF] hover:bg-[#7A4FB5]" onClick={handleSaveRatePlan}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Insurance Dialog */}
      <Dialog open={isInsuranceDialogOpen} onOpenChange={setIsInsuranceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedInsurance ? '보험 상품 수정' : '보험 상품 추가'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>보험명*</Label>
                <Input
                  value={insuranceFormData.insurance_name}
                  onChange={(e) => setInsuranceFormData({ ...insuranceFormData, insurance_name: e.target.value })}
                  placeholder="예: 기본 자차손해보험"
                />
              </div>
              <div>
                <Label>보험 코드*</Label>
                <Input
                  value={insuranceFormData.insurance_code}
                  onChange={(e) => setInsuranceFormData({ ...insuranceFormData, insurance_code: e.target.value })}
                  placeholder="예: CDW_BASIC"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>보험 타입*</Label>
                <Select
                  value={insuranceFormData.insurance_type}
                  onValueChange={(value) => setInsuranceFormData({ ...insuranceFormData, insurance_type: value as InsuranceType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cdw">CDW (자차손해)</SelectItem>
                    <SelectItem value="tp">TP (도난)</SelectItem>
                    <SelectItem value="pai">PAI (탑승자상해)</SelectItem>
                    <SelectItem value="lli">LLI (대인대물)</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>일일 요금 (KRW)*</Label>
                <Input
                  type="number"
                  value={insuranceFormData.daily_price_krw}
                  onChange={(e) => setInsuranceFormData({ ...insuranceFormData, daily_price_krw: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>최대 보상액 (KRW)</Label>
                <Input
                  type="number"
                  value={insuranceFormData.max_coverage_krw || ''}
                  onChange={(e) => setInsuranceFormData({ ...insuranceFormData, max_coverage_krw: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>
              <div>
                <Label>자기부담금 (KRW)</Label>
                <Input
                  type="number"
                  value={insuranceFormData.deductible_krw}
                  onChange={(e) => setInsuranceFormData({ ...insuranceFormData, deductible_krw: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>설명</Label>
              <Textarea
                value={insuranceFormData.description || ''}
                onChange={(e) => setInsuranceFormData({ ...insuranceFormData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsInsuranceDialogOpen(false)}>
                취소
              </Button>
              <Button className="bg-[#8B5FBF] hover:bg-[#7A4FB5]" onClick={handleSaveInsurance}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extra Dialog */}
      <Dialog open={isExtraDialogOpen} onOpenChange={setIsExtraDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedExtra ? '부가 옵션 수정' : '부가 옵션 추가'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>옵션명*</Label>
                <Input
                  value={extraFormData.extra_name}
                  onChange={(e) => setExtraFormData({ ...extraFormData, extra_name: e.target.value })}
                  placeholder="예: GPS 내비게이션"
                />
              </div>
              <div>
                <Label>옵션 코드*</Label>
                <Input
                  value={extraFormData.extra_code}
                  onChange={(e) => setExtraFormData({ ...extraFormData, extra_code: e.target.value })}
                  placeholder="예: GPS"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>옵션 타입*</Label>
                <Select
                  value={extraFormData.extra_type}
                  onValueChange={(value) => setExtraFormData({ ...extraFormData, extra_type: value as ExtraType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gps">GPS</SelectItem>
                    <SelectItem value="child_seat">카시트</SelectItem>
                    <SelectItem value="wifi">와이파이</SelectItem>
                    <SelectItem value="additional_driver">추가 운전자</SelectItem>
                    <SelectItem value="pickup_service">픽업 서비스</SelectItem>
                    <SelectItem value="equipment">장비</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>요금 방식*</Label>
                <Select
                  value={extraFormData.pricing_type}
                  onValueChange={(value) => setExtraFormData({ ...extraFormData, pricing_type: value as ExtraPricingType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_day">일별</SelectItem>
                    <SelectItem value="per_rental">건별</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>가격 (KRW)*</Label>
                <Input
                  type="number"
                  value={extraFormData.price_krw}
                  onChange={(e) => setExtraFormData({ ...extraFormData, price_krw: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>최대 수량</Label>
                <Input
                  type="number"
                  value={extraFormData.max_quantity || 1}
                  onChange={(e) => setExtraFormData({ ...extraFormData, max_quantity: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>설명</Label>
              <Textarea
                value={extraFormData.description || ''}
                onChange={(e) => setExtraFormData({ ...extraFormData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsExtraDialogOpen(false)}>
                취소
              </Button>
              <Button className="bg-[#8B5FBF] hover:bg-[#7A4FB5]" onClick={handleSaveExtra}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};
