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
  Package,
  Calendar,
  RefreshCw,
  History,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  AccommodationVendor,
  AccommodationRatePlan,
  AccommodationRatePlanFormData,
  AccommodationSyncLog
} from '../../types/accommodation';

interface AccommodationAdvancedFeaturesProps {
  vendors: AccommodationVendor[];
  selectedVendorId: number | null;
}

export const AccommodationAdvancedFeatures: React.FC<AccommodationAdvancedFeaturesProps> = ({
  vendors,
  selectedVendorId
}) => {
  // State for rate plans
  const [ratePlans, setRatePlans] = useState<AccommodationRatePlan[]>([]);
  const [selectedRatePlan, setSelectedRatePlan] = useState<AccommodationRatePlan | null>(null);
  const [isRatePlanDialogOpen, setIsRatePlanDialogOpen] = useState(false);
  const [ratePlanFormData, setRatePlanFormData] = useState<AccommodationRatePlanFormData>({
    plan_name: '',
    plan_code: '',
    start_date: '',
    end_date: '',
    base_price: 0,
    weekend_surcharge: 0,
    weekday_discount: 0,
    long_stay_discount: 0
  });


  // State for PMS Integration
  const [pmsProvider, setPmsProvider] = useState<string>('cloudbeds');
  const [pmsApiKey, setPmsApiKey] = useState('');
  const [pmsPropertyId, setPmsPropertyId] = useState('');
  const [pmsSyncEnabled, setPmsSyncEnabled] = useState(false);
  const [pmsSyncInterval, setPmsSyncInterval] = useState(60); // minutes
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<AccommodationSyncLog[]>([]);

  const [activeTab, setActiveTab] = useState('rateplans');

  // Load data when vendor is selected
  useEffect(() => {
    if (selectedVendorId) {
      loadRatePlans();
      loadPmsSettings();
      loadSyncLogs();
    }
  }, [selectedVendorId]);

  const loadRatePlans = async () => {
    if (!selectedVendorId) return;
    try {
      const response = await fetch(`/api/admin/accommodation-vendors/${selectedVendorId}/rate-plans`);
      const result = await response.json();
      if (result.success && result.data) {
        setRatePlans(result.data);
      }
    } catch (error) {
      console.error('Failed to load rate plans:', error);
    }
  };


  const loadPmsSettings = async () => {
    if (!selectedVendorId) return;
    try {
      const response = await fetch(`/api/admin/accommodation-vendors/${selectedVendorId}`);
      const result = await response.json();
      if (result.success && result.data) {
        const vendor = result.data;
        setPmsProvider(vendor.pms_provider || 'cloudbeds');
        setPmsApiKey(vendor.pms_api_key || '');
        setPmsPropertyId(vendor.pms_property_id || '');
        setPmsSyncEnabled(vendor.pms_sync_enabled || false);
        setPmsSyncInterval(vendor.pms_sync_interval || 60);
        setLastSyncTime(vendor.last_sync_at);
      }
    } catch (error) {
      console.error('Failed to load PMS settings:', error);
    }
  };

  const loadSyncLogs = async () => {
    if (!selectedVendorId) return;
    try {
      const response = await fetch(`/api/admin/accommodation-vendors/${selectedVendorId}/sync-logs`);
      const result = await response.json();
      if (result.success && result.data) {
        setSyncLogs(result.data);
      }
    } catch (error) {
      console.error('Failed to load sync logs:', error);
    }
  };

  const handleSaveRatePlan = async () => {
    if (!selectedVendorId) {
      toast.error('업체를 먼저 선택해주세요.');
      return;
    }

    try {
      const url = selectedRatePlan
        ? `/api/admin/accommodation-vendors/${selectedVendorId}/rate-plans/${selectedRatePlan.id}`
        : `/api/admin/accommodation-vendors/${selectedVendorId}/rate-plans`;

      const method = selectedRatePlan ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ratePlanFormData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(selectedRatePlan ? '요금제가 수정되었습니다.' : '요금제가 추가되었습니다.');
        setIsRatePlanDialogOpen(false);
        loadRatePlans();
        resetRatePlanForm();
      } else {
        toast.error(result.error || '요금제 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save rate plan:', error);
      toast.error('요금제 저장 중 오류가 발생했습니다.');
    }
  };


  const handleManualSync = async () => {
    if (!selectedVendorId) {
      toast.error('업체를 먼저 선택해주세요.');
      return;
    }

    setIsSyncing(true);
    const loadingToast = toast.loading('PMS 동기화 중...');

    try {
      const response = await fetch(`/api/admin/accommodation/sync/${selectedVendorId}`, {
        method: 'POST'
      });

      const result = await response.json();
      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success('PMS 동기화가 완료되었습니다.');
        setLastSyncTime(new Date().toISOString());
        loadSyncLogs();
      } else {
        toast.error(result.error || 'PMS 동기화에 실패했습니다.');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Failed to sync:', error);
      toast.error('PMS 동기화 중 오류가 발생했습니다.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSavePmsSettings = async () => {
    if (!selectedVendorId) {
      toast.error('업체를 먼저 선택해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/admin/accommodation-vendors/${selectedVendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pms_provider: pmsProvider,
          pms_api_key: pmsApiKey,
          pms_property_id: pmsPropertyId,
          pms_sync_enabled: pmsSyncEnabled,
          pms_sync_interval: pmsSyncInterval
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('PMS 설정이 저장되었습니다.');
      } else {
        toast.error(result.error || 'PMS 설정 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to save PMS settings:', error);
      toast.error('PMS 설정 저장 중 오류가 발생했습니다.');
    }
  };

  const resetRatePlanForm = () => {
    setSelectedRatePlan(null);
    setRatePlanFormData({
      plan_name: '',
      plan_code: '',
      start_date: '',
      end_date: '',
      base_price: 0,
      weekend_surcharge: 0,
      weekday_discount: 0,
      long_stay_discount: 0
    });
  };


  const handleDeleteRatePlan = async (planId: number, planName: string) => {
    if (!selectedVendorId) {
      toast.error('업체를 먼저 선택해주세요.');
      return;
    }

    if (!confirm(`정말로 "${planName}" 요금제를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/accommodation-vendors/${selectedVendorId}/rate-plans/${planId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('요금제가 삭제되었습니다.');
        loadRatePlans();
      } else {
        toast.error(result.error || '요금제 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete rate plan:', error);
      toast.error('요금제 삭제 중 오류가 발생했습니다.');
    }
  };


  const openRatePlanDialog = (ratePlan?: any) => {
    if (ratePlan) {
      setSelectedRatePlan(ratePlan);
      setRatePlanFormData({
        plan_name: ratePlan.plan_name,
        plan_code: ratePlan.plan_code,
        start_date: ratePlan.start_date,
        end_date: ratePlan.end_date,
        base_price: ratePlan.base_price,
        weekend_surcharge: ratePlan.weekend_surcharge || 0,
        weekday_discount: ratePlan.weekday_discount || 0,
        long_stay_discount: ratePlan.long_stay_discount || 0
      });
    } else {
      resetRatePlanForm();
    }
    setIsRatePlanDialogOpen(true);
  };


  if (!selectedVendorId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>업체를 먼저 선택해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid grid-cols-2 w-full max-w-xl">
        <TabsTrigger value="rateplans">요금제 관리</TabsTrigger>
        <TabsTrigger value="pms">PMS 연동</TabsTrigger>
      </TabsList>

      {/* 요금제 관리 */}
      <TabsContent value="rateplans">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>계절별/기간별 요금제</CardTitle>
              <Button
                className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                onClick={() => openRatePlanDialog()}
              >
                <Plus className="h-4 w-4 mr-2" />
                요금제 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>요금제명</TableHead>
                  <TableHead>요금제 코드</TableHead>
                  <TableHead>시작일</TableHead>
                  <TableHead>종료일</TableHead>
                  <TableHead>기본 요금</TableHead>
                  <TableHead>주말 할증</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ratePlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      등록된 요금제가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  ratePlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>{plan.plan_name}</TableCell>
                      <TableCell>{plan.plan_code}</TableCell>
                      <TableCell>{plan.start_date}</TableCell>
                      <TableCell>{plan.end_date}</TableCell>
                      <TableCell>₩{plan.base_price?.toLocaleString()}</TableCell>
                      <TableCell>{plan.weekend_surcharge || 0}%</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRatePlanDialog(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRatePlan(plan.id, plan.plan_name)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>


      {/* PMS 연동 */}
      <TabsContent value="pms">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>PMS 연동 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>PMS 제공업체</Label>
                  <Select value={pmsProvider} onValueChange={setPmsProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cloudbeds">CloudBeds</SelectItem>
                      <SelectItem value="opera">Oracle Opera</SelectItem>
                      <SelectItem value="mews">Mews</SelectItem>
                      <SelectItem value="ezee">eZee</SelectItem>
                      <SelectItem value="custom">커스텀 API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Property ID</Label>
                  <Input
                    value={pmsPropertyId}
                    onChange={(e) => setPmsPropertyId(e.target.value)}
                    placeholder="숙소 고유 ID"
                  />
                </div>

                <div className="col-span-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={pmsApiKey}
                    onChange={(e) => setPmsApiKey(e.target.value)}
                    placeholder="PMS API 인증 키"
                  />
                </div>

                <div>
                  <Label>자동 동기화</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={pmsSyncEnabled}
                      onChange={(e) => setPmsSyncEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">활성화</span>
                  </div>
                </div>

                <div>
                  <Label>동기화 주기 (분)</Label>
                  <Select
                    value={pmsSyncInterval.toString()}
                    onValueChange={(value) => setPmsSyncInterval(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15분</SelectItem>
                      <SelectItem value="30">30분</SelectItem>
                      <SelectItem value="60">1시간</SelectItem>
                      <SelectItem value="120">2시간</SelectItem>
                      <SelectItem value="360">6시간</SelectItem>
                      <SelectItem value="1440">24시간</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  수동 동기화
                </Button>
                <Button
                  className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                  onClick={handleSavePmsSettings}
                >
                  설정 저장
                </Button>
              </div>

              {lastSyncTime && (
                <p className="text-sm text-gray-500">
                  마지막 동기화: {new Date(lastSyncTime).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>동기화 이력</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시간</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>추가</TableHead>
                    <TableHead>수정</TableHead>
                    <TableHead>메시지</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        동기화 이력이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          {log.status === 'success' ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              성공
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              실패
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{log.rooms_added || 0}</TableCell>
                        <TableCell>{log.rooms_updated || 0}</TableCell>
                        <TableCell className="text-sm">{log.message}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* 요금제 추가/수정 Dialog */}
      <Dialog open={isRatePlanDialogOpen} onOpenChange={setIsRatePlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedRatePlan ? '요금제 수정' : '요금제 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>요금제명 *</Label>
                <Input
                  value={ratePlanFormData.plan_name}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, plan_name: e.target.value })}
                  placeholder="예: 성수기 요금"
                />
              </div>
              <div>
                <Label>요금제 코드 *</Label>
                <Input
                  value={ratePlanFormData.plan_code}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, plan_code: e.target.value })}
                  placeholder="예: SUMMER2024"
                />
              </div>
              <div>
                <Label>시작일 *</Label>
                <Input
                  type="date"
                  value={ratePlanFormData.start_date}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>종료일 *</Label>
                <Input
                  type="date"
                  value={ratePlanFormData.end_date}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, end_date: e.target.value })}
                />
              </div>
              <div>
                <Label>기본 요금 (원) *</Label>
                <Input
                  type="number"
                  value={ratePlanFormData.base_price}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, base_price: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>주말 할증 (%)</Label>
                <Input
                  type="number"
                  value={ratePlanFormData.weekend_surcharge}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, weekend_surcharge: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>평일 할인 (%)</Label>
                <Input
                  type="number"
                  value={ratePlanFormData.weekday_discount}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, weekday_discount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>장기 투숙 할인 (%)</Label>
                <Input
                  type="number"
                  value={ratePlanFormData.long_stay_discount}
                  onChange={(e) => setRatePlanFormData({ ...ratePlanFormData, long_stay_discount: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsRatePlanDialogOpen(false)}>
                취소
              </Button>
              <Button
                className="bg-[#8B5FBF] hover:bg-[#7A4FB5]"
                onClick={handleSaveRatePlan}
                disabled={!ratePlanFormData.plan_name || !ratePlanFormData.plan_code}
              >
                {selectedRatePlan ? '수정' : '추가'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </Tabs>
  );
};
