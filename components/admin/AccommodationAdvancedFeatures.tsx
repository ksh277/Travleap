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
  // State for PMS Integration
  const [pmsProvider, setPmsProvider] = useState<string>('cloudbeds');
  const [pmsApiKey, setPmsApiKey] = useState('');
  const [pmsPropertyId, setPmsPropertyId] = useState('');
  const [pmsSyncEnabled, setPmsSyncEnabled] = useState(false);
  const [pmsSyncInterval, setPmsSyncInterval] = useState(60); // minutes
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<AccommodationSyncLog[]>([]);

  // Load data when vendor is selected
  useEffect(() => {
    if (selectedVendorId) {
      loadPmsSettings();
      loadSyncLogs();
    }
  }, [selectedVendorId]);


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
    <div className="space-y-6">
      {/* PMS 연동 */}
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
    </div>
  );
};
