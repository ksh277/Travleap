/**
 * 렌트카 API 설정 모달
 * Rentalcars.com API 또는 다른 렌트카 제공업체 API 키 입력
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RentcarAPIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSettings: (settings: RentcarAPISettings) => void;
}

export interface RentcarAPISettings {
  provider: 'rentalcars' | 'kayak' | 'custom';
  apiKey: string;
  apiSecret?: string;
  baseURL?: string;
  affiliateId?: string;
  enabled: boolean;
}

export function RentcarAPIModal({ isOpen, onClose, onSaveSettings }: RentcarAPIModalProps) {
  const [provider, setProvider] = useState<'rentalcars' | 'kayak' | 'custom'>('rentalcars');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [affiliateId, setAffiliateId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    if (!apiKey) {
      toast.error('API Key를 입력해주세요');
      return;
    }

    setIsLoading(true);
    setTestResult(null);

    try {
      // 실제 API 테스트 로직
      // const response = await testRentcarAPI({ provider, apiKey, apiSecret, baseURL });

      // Mock 테스트 (개발용)
      await new Promise(resolve => setTimeout(resolve, 1500));
      const success = apiKey.length > 10; // 임시 검증

      if (success) {
        setTestResult({
          success: true,
          message: 'API 연결 성공! 렌트카 검색이 활성화됩니다.'
        });
        toast.success('API 연결 테스트 성공');
      } else {
        setTestResult({
          success: false,
          message: 'API 연결 실패. API Key를 확인해주세요.'
        });
        toast.error('API 연결 테스트 실패');
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'API 연결 중 오류 발생'
      });
      toast.error('API 테스트 실패');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!apiKey) {
      toast.error('API Key를 입력해주세요');
      return;
    }

    const settings: RentcarAPISettings = {
      provider,
      apiKey,
      apiSecret,
      baseURL: baseURL || getDefaultBaseURL(provider),
      affiliateId,
      enabled: true
    };

    onSaveSettings(settings);
    toast.success('렌트카 API 설정이 저장되었습니다');
    onClose();
  };

  const getDefaultBaseURL = (provider: string) => {
    switch (provider) {
      case 'rentalcars':
        return 'https://api.rentalcars.com/v2';
      case 'kayak':
        return 'https://api.kayak.com/cars';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>렌트카 API 설정</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 제공업체 선택 */}
          <div className="space-y-2">
            <Label htmlFor="provider">API 제공업체</Label>
            <Select value={provider} onValueChange={(value: any) => setProvider(value)}>
              <SelectTrigger>
                <SelectValue placeholder="제공업체 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rentalcars">Rentalcars.com</SelectItem>
                <SelectItem value="kayak">Kayak</SelectItem>
                <SelectItem value="custom">Custom API</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              {provider === 'rentalcars' && '전 세계 렌트카 검색 및 예약 (추천)'}
              {provider === 'kayak' && 'Kayak 통합 렌트카 검색'}
              {provider === 'custom' && '사용자 정의 API 엔드포인트'}
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key 입력"
            />
          </div>

          {/* API Secret (선택사항) */}
          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret (선택사항)</Label>
            <Input
              id="apiSecret"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="API Secret 입력"
            />
          </div>

          {/* Affiliate ID (선택사항) */}
          <div className="space-y-2">
            <Label htmlFor="affiliateId">Affiliate ID (선택사항)</Label>
            <Input
              id="affiliateId"
              value={affiliateId}
              onChange={(e) => setAffiliateId(e.target.value)}
              placeholder="제휴 ID 입력"
            />
            <p className="text-sm text-gray-500">
              제휴 수수료를 받으려면 Affiliate ID를 입력하세요
            </p>
          </div>

          {/* Custom Base URL */}
          {provider === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="baseURL">Base URL *</Label>
              <Input
                id="baseURL"
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://api.example.com"
              />
            </div>
          )}

          {/* 연결 테스트 버튼 */}
          <div className="space-y-2">
            <Button
              onClick={handleTestConnection}
              disabled={isLoading || !apiKey}
              variant="outline"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  연결 테스트 중...
                </>
              ) : (
                'API 연결 테스트'
              )}
            </Button>

            {/* 테스트 결과 */}
            {testResult && (
              <Alert variant={testResult.success ? 'default' : 'destructive'}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* 안내 메시지 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">API Key 발급 방법:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Rentalcars.com: <a href="https://www.rentalcars.com/affiliates" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">제휴 프로그램 가입</a></li>
                  <li>무료 테스트 API도 제공됩니다</li>
                  <li>API 사용량에 따라 과금될 수 있습니다</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* 액션 버튼 */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={!apiKey || (testResult && !testResult.success)}
            >
              설정 저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
