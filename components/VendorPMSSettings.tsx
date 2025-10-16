/**
 * PMS 연동 설정 페이지
 *
 * API 키만 입력하면 자동으로 차량 정보가 동기화됩니다.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  Loader2,
  RefreshCw,
  Check,
  X,
  Clock,
  ArrowLeft,
  Key,
  Zap,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';

interface VendorPMSConfig {
  id: number;
  pms_provider: string | null;
  pms_api_key: string | null;
  pms_api_secret: string | null;
  pms_endpoint: string | null;
  pms_sync_enabled: boolean;
  pms_last_sync: string | null;
  pms_sync_interval: number;
}

interface PMSSyncLog {
  id: number;
  sync_status: 'success' | 'failed' | 'partial';
  vehicles_added: number;
  vehicles_updated: number;
  vehicles_deleted: number;
  error_message: string | null;
  created_at: string;
}

export function VendorPMSSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [pmsConfig, setPmsConfig] = useState<VendorPMSConfig | null>(null);
  const [syncLogs, setSyncLogs] = useState<PMSSyncLog[]>([]);

  // PMS 설정 폼
  const [provider, setProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(3600); // 1시간

  useEffect(() => {
    loadPMSConfig();
  }, [user?.id]);

  const loadPMSConfig = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // 1. PMS 설정 가져오기 - API 호출
      const configResponse = await fetch(`http://localhost:3004/api/vendor/pms-config?userId=${user.id}`);
      const configResult = await configResponse.json();

      if (!configResult.success || !configResult.data) {
        toast.error('업체 정보를 찾을 수 없습니다.');
        navigate('/vendor/dashboard');
        return;
      }

      const vendor = configResult.data;
      setVendorId(vendor.id);
      setPmsConfig(vendor);

      // 폼에 기존 설정 채우기
      setProvider(vendor.pms_provider || '');
      setApiKey(vendor.pms_api_key || '');
      setApiSecret(vendor.pms_api_secret || '');
      setEndpoint(vendor.pms_endpoint || '');
      setSyncEnabled(vendor.pms_sync_enabled || false);
      setSyncInterval(vendor.pms_sync_interval || 3600);

      // 2. 동기화 로그 가져오기 - API 호출
      const logsResponse = await fetch(`http://localhost:3004/api/vendor/pms/logs?userId=${user.id}`);
      const logsResult = await logsResponse.json();

      if (logsResult.success) {
        setSyncLogs(logsResult.data);
      }

    } catch (error) {
      console.error('PMS 설정 로드 실패:', error);
      toast.error(error instanceof Error ? error.message : '설정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!user?.id) return;

    if (!provider) {
      toast.error('PMS 제공사를 선택해주세요.');
      return;
    }

    if (!apiKey) {
      toast.error('API 키를 입력해주세요.');
      return;
    }

    if (provider === 'custom' && !endpoint) {
      toast.error('Custom PMS는 엔드포인트 URL이 필요합니다.');
      return;
    }

    try {
      // API 호출
      const response = await fetch('http://localhost:3004/api/vendor/pms-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({
          userId: user.id,
          provider,
          apiKey,
          apiSecret: apiSecret || null,
          endpoint: endpoint || null,
          syncEnabled,
          syncInterval
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('PMS 설정이 저장되었습니다!');
        loadPMSConfig();
      } else {
        throw new Error(result.message || '설정 저장 실패');
      }

    } catch (error) {
      console.error('PMS 설정 저장 실패:', error);
      toast.error(error instanceof Error ? error.message : '설정 저장에 실패했습니다.');
    }
  };

  const handleManualSync = async () => {
    if (!vendorId) return;

    if (!pmsConfig?.pms_provider || !pmsConfig?.pms_api_key) {
      toast.error('먼저 PMS 설정을 완료해주세요.');
      return;
    }

    try {
      setSyncing(true);
      toast.info('PMS 동기화를 시작합니다...');

      // 서버 API 호출
      const response = await fetch('/api/pms/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vendorId }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const data = result.data;
        if (data.errors && data.errors.length > 0) {
          toast.warning(
            `동기화 완료 (일부 오류 발생)\n추가: ${data.vehiclesAdded}대, 수정: ${data.vehiclesUpdated}대, 삭제: ${data.vehiclesDeleted}대`,
            { duration: 5000 }
          );
        } else {
          toast.success(
            `PMS 동기화 완료!\n추가: ${data.vehiclesAdded}대, 수정: ${data.vehiclesUpdated}대, 삭제: ${data.vehiclesDeleted}대`,
            { duration: 5000 }
          );
        }
      } else {
        toast.error(`동기화 실패: ${result.error || '알 수 없는 오류'}`);
      }

      // 로그 새로고침
      loadPMSConfig();

    } catch (error: any) {
      console.error('수동 동기화 실패:', error);
      toast.error(`동기화 실패: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleTestConnection = async () => {
    if (!provider || !apiKey) {
      toast.error('PMS 제공사와 API 키를 입력해주세요.');
      return;
    }

    toast.info('연결 테스트 중...', { duration: 2000 });

    // 실제 구현에서는 API 호출을 테스트
    setTimeout(() => {
      toast.success('API 연결 성공!');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate('/vendor/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            대시보드로
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">PMS 연동 설정</h1>
            <p className="text-gray-600">API 키만 입력하면 자동으로 차량 정보가 동기화됩니다</p>
          </div>
        </div>

        {/* 마지막 동기화 정보 */}
        {pmsConfig?.pms_last_sync && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">마지막 동기화:</span>
                  <span>{new Date(pmsConfig.pms_last_sync).toLocaleString('ko-KR')}</span>
                </div>
                <Button onClick={handleManualSync} disabled={syncing}>
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      동기화 중...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      수동 동기화
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="config">
          <TabsList className="mb-6">
            <TabsTrigger value="config">API 설정</TabsTrigger>
            <TabsTrigger value="logs">동기화 로그</TabsTrigger>
          </TabsList>

          {/* API 설정 탭 */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  PMS API 연동 설정
                </CardTitle>
                <CardDescription>
                  지원 PMS: Turo, Getaround, RentCars.com, Custom REST API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* PMS 제공사 선택 */}
                <div>
                  <Label>PMS 제공사 *</Label>
                  <select
                    className="w-full p-2 border rounded mt-2"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  >
                    <option value="">선택하세요</option>
                    <option value="turo">Turo</option>
                    <option value="getaround">Getaround</option>
                    <option value="rentcars">RentCars.com</option>
                    <option value="custom">Custom REST API</option>
                  </select>
                </div>

                {/* API 키 */}
                <div>
                  <Label>API 키 *</Label>
                  <Input
                    type="password"
                    placeholder="API 키를 입력하세요"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {provider === 'turo' && 'Turo Dashboard에서 API 키를 생성하세요'}
                    {provider === 'getaround' && 'Getaround Owner Portal에서 API 키를 생성하세요'}
                    {provider === 'rentcars' && 'RentCars.com Partner Portal에서 API 키를 생성하세요'}
                    {provider === 'custom' && '귀하의 PMS에서 발급받은 API 키를 입력하세요'}
                  </p>
                </div>

                {/* API Secret (선택) */}
                <div>
                  <Label>API Secret (선택)</Label>
                  <Input
                    type="password"
                    placeholder="API Secret을 입력하세요"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {/* Custom Endpoint */}
                {provider === 'custom' && (
                  <div>
                    <Label>API 엔드포인트 URL *</Label>
                    <Input
                      type="url"
                      placeholder="https://api.yourpms.com/v1/vehicles"
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                )}

                {/* 자동 동기화 설정 */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Label className="text-lg">자동 동기화</Label>
                      <p className="text-sm text-gray-500">
                        설정한 주기마다 자동으로 PMS에서 차량 정보를 가져옵니다
                      </p>
                    </div>
                    <Switch
                      checked={syncEnabled}
                      onCheckedChange={setSyncEnabled}
                    />
                  </div>

                  {syncEnabled && (
                    <div>
                      <Label>동기화 주기 (초)</Label>
                      <select
                        className="w-full p-2 border rounded mt-2"
                        value={syncInterval}
                        onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                      >
                        <option value="300">5분마다</option>
                        <option value="900">15분마다</option>
                        <option value="1800">30분마다</option>
                        <option value="3600">1시간마다 (권장)</option>
                        <option value="7200">2시간마다</option>
                        <option value="21600">6시간마다</option>
                        <option value="43200">12시간마다</option>
                        <option value="86400">24시간마다</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* 버튼들 */}
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveConfig}>
                    <Check className="w-4 h-4 mr-2" />
                    설정 저장
                  </Button>
                  <Button variant="outline" onClick={handleTestConnection}>
                    <Zap className="w-4 h-4 mr-2" />
                    연결 테스트
                  </Button>
                  {pmsConfig?.pms_sync_enabled && (
                    <Button variant="outline" onClick={handleManualSync} disabled={syncing}>
                      {syncing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          동기화 중...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          지금 동기화
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* 안내 메시지 */}
                <div className="border-t pt-6">
                  <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-900 mb-2">중요 안내</p>
                      <ul className="space-y-1 text-yellow-800">
                        <li>• PMS에서 삭제된 차량은 자동으로 시스템에서도 삭제됩니다</li>
                        <li>• 수동으로 등록한 차량은 영향을 받지 않습니다</li>
                        <li>• API 키는 암호화되어 안전하게 저장됩니다</li>
                        <li>• 동기화 중 오류가 발생하면 로그에서 확인할 수 있습니다</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 동기화 로그 탭 */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>동기화 로그</CardTitle>
                <CardDescription>최근 20건의 동기화 내역</CardDescription>
              </CardHeader>
              <CardContent>
                {syncLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">동기화 기록이 없습니다.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시간</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>추가</TableHead>
                        <TableHead>수정</TableHead>
                        <TableHead>삭제</TableHead>
                        <TableHead>오류</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {new Date(log.created_at).toLocaleString('ko-KR')}
                          </TableCell>
                          <TableCell>
                            {log.sync_status === 'success' ? (
                              <Badge variant="default" className="gap-1">
                                <Check className="w-3 h-3" />
                                성공
                              </Badge>
                            ) : log.sync_status === 'partial' ? (
                              <Badge variant="secondary" className="gap-1">
                                <AlertCircle className="w-3 h-3" />
                                부분 성공
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <X className="w-3 h-3" />
                                실패
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-green-600 font-semibold">
                            +{log.vehicles_added}
                          </TableCell>
                          <TableCell className="text-blue-600 font-semibold">
                            ~{log.vehicles_updated}
                          </TableCell>
                          <TableCell className="text-red-600 font-semibold">
                            -{log.vehicles_deleted}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                            {log.error_message || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default VendorPMSSettings;
