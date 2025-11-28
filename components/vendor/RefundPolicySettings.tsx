/**
 * 벤더 환불 정책 설정 컴포넌트
 *
 * 모든 벤더 대시보드에서 재사용 가능한 환불 정책 설정 UI
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Info,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface RefundRule {
  days_before: number;
  fee_rate: number;
  description: string;
}

interface CancellationRules {
  rules: RefundRule[];
  is_refundable: boolean;
  notes?: string[];
}

interface Props {
  partnerId?: number;
  onSave?: (rules: CancellationRules | null) => void;
}

// 기본 환불 정책 템플릿
const DEFAULT_RULES: RefundRule[] = [
  { days_before: 7, fee_rate: 0, description: '7일 전 무료 취소' },
  { days_before: 3, fee_rate: 0.2, description: '3~6일 전 20% 수수료' },
  { days_before: 1, fee_rate: 0.5, description: '1~2일 전 50% 수수료' },
  { days_before: 0, fee_rate: 1, description: '당일 환불 불가' }
];

export function RefundPolicySettings({ partnerId, onSave }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasCustomPolicy, setHasCustomPolicy] = useState(false);
  const [isRefundable, setIsRefundable] = useState(true);
  const [rules, setRules] = useState<RefundRule[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 설정 로드
  useEffect(() => {
    loadSettings();
  }, [partnerId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const url = partnerId
        ? `/api/vendor/settings?partnerId=${partnerId}`
        : '/api/vendor/settings';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success && data.data) {
        const { cancellation_rules, has_custom_policy } = data.data;
        setHasCustomPolicy(has_custom_policy);

        if (cancellation_rules && cancellation_rules.rules) {
          setRules(cancellation_rules.rules);
          setIsRefundable(cancellation_rules.is_refundable !== false);
          setNotes(cancellation_rules.notes?.join('\n') || '');
        } else {
          // 커스텀 정책이 없으면 빈 배열
          setRules([]);
          setIsRefundable(true);
          setNotes('');
        }
      }
    } catch (error) {
      console.error('설정 로드 실패:', error);
      setMessage({ type: 'error', text: '설정을 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  // 기본 템플릿 적용
  const applyDefaultTemplate = () => {
    setRules([...DEFAULT_RULES]);
    setIsRefundable(true);
    setHasCustomPolicy(true);
    setMessage({ type: 'success', text: '기본 템플릿이 적용되었습니다. 저장 버튼을 눌러주세요.' });
  };

  // 규칙 추가
  const addRule = () => {
    const lastRule = rules[rules.length - 1];
    const newDaysBefore = lastRule ? Math.max(0, lastRule.days_before - 1) : 7;

    setRules([
      ...rules,
      { days_before: newDaysBefore, fee_rate: 0, description: '' }
    ]);
  };

  // 규칙 삭제
  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  // 규칙 수정
  const updateRule = (index: number, field: keyof RefundRule, value: number | string) => {
    const newRules = [...rules];
    if (field === 'fee_rate' && typeof value === 'number') {
      // 0~100 입력을 0~1로 변환
      newRules[index][field] = value / 100;
    } else {
      (newRules[index] as any)[field] = value;
    }
    setRules(newRules);
  };

  // 저장
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      // 규칙 정렬 (days_before 내림차순)
      const sortedRules = [...rules].sort((a, b) => b.days_before - a.days_before);

      const cancellation_rules: CancellationRules | null = sortedRules.length > 0
        ? {
            rules: sortedRules,
            is_refundable: isRefundable,
            notes: notes.split('\n').filter(n => n.trim())
          }
        : null;

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/vendor/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cancellation_rules })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: '환불 정책이 저장되었습니다.' });
        setHasCustomPolicy(!!cancellation_rules);
        onSave?.(cancellation_rules);
      } else {
        setMessage({ type: 'error', text: data.message || '저장에 실패했습니다.' });
      }
    } catch (error) {
      console.error('저장 실패:', error);
      setMessage({ type: 'error', text: '저장 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  // 초기화 (플랫폼 기본 정책 사용)
  const resetToDefault = async () => {
    if (!confirm('환불 정책을 초기화하면 TravelAP 기본 정책이 적용됩니다. 계속하시겠습니까?')) {
      return;
    }

    setRules([]);
    setIsRefundable(true);
    setNotes('');
    setHasCustomPolicy(false);

    // 서버에 null로 저장
    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      await fetch('/api/vendor/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ cancellation_rules: null })
      });

      setMessage({ type: 'success', text: 'TravelAP 기본 정책으로 초기화되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: '초기화 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">환불 정책 로딩 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>환불 정책 설정</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  고객에게 적용될 환불 정책을 설정합니다
                </p>
              </div>
            </div>
            <Badge variant={hasCustomPolicy ? 'default' : 'secondary'}>
              {hasCustomPolicy ? '커스텀 정책' : 'TravelAP 기본 정책'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* 메시지 */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      {/* 안내 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">환불 정책 우선순위</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-600">
                <li>개별 상품에 설정된 정책</li>
                <li>업체(파트너)가 설정한 정책 (이 화면)</li>
                <li>카테고리별 기본 정책</li>
                <li>TravelAP 플랫폼 기본 정책</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 환불 가능 여부 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">환불 가능 여부</Label>
              <p className="text-sm text-gray-500">상품 환불 가능 여부를 설정합니다</p>
            </div>
            <Button
              variant={isRefundable ? 'default' : 'destructive'}
              onClick={() => setIsRefundable(!isRefundable)}
            >
              {isRefundable ? '환불 가능' : '환불 불가'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 환불 규칙 */}
      {isRefundable && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">환불 규칙</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={applyDefaultTemplate}>
                  기본 템플릿 적용
                </Button>
                <Button variant="outline" size="sm" onClick={addRule}>
                  <Plus className="h-4 w-4 mr-1" />
                  규칙 추가
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>설정된 환불 규칙이 없습니다.</p>
                <p className="text-sm">TravelAP 기본 정책이 적용됩니다.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={applyDefaultTemplate}
                >
                  기본 템플릿으로 시작하기
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 헤더 */}
                <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-500 px-2">
                  <div className="col-span-3">취소 시점</div>
                  <div className="col-span-3">수수료율</div>
                  <div className="col-span-5">설명</div>
                  <div className="col-span-1"></div>
                </div>

                {/* 규칙 목록 */}
                {rules.map((rule, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          value={rule.days_before}
                          onChange={(e) => updateRule(index, 'days_before', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-sm text-gray-500">일 전</span>
                      </div>
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={Math.round(rule.fee_rate * 100)}
                          onChange={(e) => updateRule(index, 'fee_rate', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>
                    <div className="col-span-5">
                      <Input
                        type="text"
                        placeholder="설명 (예: 7일 전 무료 취소)"
                        value={rule.description}
                        onChange={(e) => updateRule(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRule(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* 규칙 설명 */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  <p><strong>수수료율 안내:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>0% = 무료 취소 (전액 환불)</li>
                    <li>50% = 결제금액의 50%를 수수료로 차감</li>
                    <li>100% = 환불 불가 (전액 수수료)</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 추가 안내사항 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">추가 안내사항 (선택)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full p-3 border rounded-lg text-sm"
            rows={3}
            placeholder="고객에게 안내할 추가 사항을 입력하세요 (줄바꿈으로 구분)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={resetToDefault} disabled={saving}>
          기본 정책으로 초기화
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              환불 정책 저장
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default RefundPolicySettings;
