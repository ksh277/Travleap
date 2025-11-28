/**
 * 관리자 쿠폰 정산 탭
 * 가맹점별 쿠폰 사용 내역 및 정산 관리
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  DollarSign,
  Download,
  RefreshCw,
  Store,
  Receipt,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface CouponSettlement {
  partner_id: number;
  business_name: string;
  category: string;
  email: string;
  phone: string;
  usage_count: number;
  total_order_amount: number;
  total_discount: number;
  total_final_amount: number;
  first_usage_date: string;
  last_usage_date: string;
}

interface SettlementStats {
  total_partners: number;
  total_usage_count: number;
  total_order_amount: number;
  total_discount: number;
  total_final_amount: number;
}

export function AdminCouponSettlements() {
  const [settlements, setSettlements] = useState<CouponSettlement[]>([]);
  const [stats, setStats] = useState<SettlementStats>({
    total_partners: 0,
    total_usage_count: 0,
    total_order_amount: 0,
    total_discount: 0,
    total_final_amount: 0
  });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadSettlements();
  }, []);

  const loadSettlements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/admin/coupon-settlements?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSettlements(data.data || []);
        setStats(data.stats || {
          total_partners: 0,
          total_usage_count: 0,
          total_order_amount: 0,
          total_discount: 0,
          total_final_amount: 0
        });
      } else {
        toast.error(data.message || '정산 내역을 불러오는데 실패했습니다');
      }
    } catch (error) {
      console.error('쿠폰 정산 조회 오류:', error);
      toast.error('정산 내역 조회 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (settlements.length === 0) {
      toast.error('다운로드할 데이터가 없습니다');
      return;
    }

    const headers = [
      '가맹점명',
      '카테고리',
      '이메일',
      '연락처',
      '사용건수',
      '총주문금액',
      '총할인금액',
      '총결제금액',
      '첫사용일',
      '마지막사용일'
    ];

    const rows = settlements.map(s => [
      s.business_name,
      s.category,
      s.email,
      s.phone,
      s.usage_count,
      s.total_order_amount,
      s.total_discount,
      s.total_final_amount,
      s.first_usage_date ? new Date(s.first_usage_date).toLocaleDateString('ko-KR') : '-',
      s.last_usage_date ? new Date(s.last_usage_date).toLocaleDateString('ko-KR') : '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `coupon_settlements_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success('CSV 파일 다운로드 완료');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-2">정산 내역을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            쿠폰 정산 관리
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            가맹점별 쿠폰 사용 내역 및 할인 제공액
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            CSV 다운로드
          </Button>
          <Button onClick={loadSettlements}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 날짜 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <Button onClick={loadSettlements}>
              <Calendar className="h-4 w-4 mr-2" />
              조회
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                loadSettlements();
              }}
            >
              초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">참여 가맹점</p>
                <p className="text-2xl font-bold">{stats.total_partners}개</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">총 사용 건수</p>
                <p className="text-2xl font-bold">{stats.total_usage_count}건</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-500">총 주문 금액</p>
              <p className="text-2xl font-bold">₩{stats.total_order_amount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-500">총 할인 제공액</p>
              <p className="text-2xl font-bold text-purple-600">₩{stats.total_discount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-500">총 실결제 금액</p>
              <p className="text-2xl font-bold text-green-600">₩{stats.total_final_amount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 정산 내역 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>가맹점별 쿠폰 사용 내역</CardTitle>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Receipt className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p>쿠폰 사용 내역이 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">가맹점</th>
                    <th className="text-left p-3">카테고리</th>
                    <th className="text-right p-3">사용 건수</th>
                    <th className="text-right p-3">총 주문금액</th>
                    <th className="text-right p-3">총 할인금액</th>
                    <th className="text-right p-3">총 결제금액</th>
                    <th className="text-left p-3">기간</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((settlement) => (
                    <tr key={settlement.partner_id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{settlement.business_name}</p>
                          <p className="text-xs text-gray-500">{settlement.email}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{settlement.category}</Badge>
                      </td>
                      <td className="text-right p-3 font-medium">
                        {settlement.usage_count}건
                      </td>
                      <td className="text-right p-3">
                        ₩{settlement.total_order_amount.toLocaleString()}
                      </td>
                      <td className="text-right p-3 text-purple-600 font-medium">
                        -₩{settlement.total_discount.toLocaleString()}
                      </td>
                      <td className="text-right p-3 text-green-600 font-bold">
                        ₩{settlement.total_final_amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {settlement.first_usage_date && (
                          <>
                            {new Date(settlement.first_usage_date).toLocaleDateString('ko-KR')}
                            {' ~ '}
                            {new Date(settlement.last_usage_date).toLocaleDateString('ko-KR')}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
