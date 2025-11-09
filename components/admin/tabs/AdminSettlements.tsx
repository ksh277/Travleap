import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Badge } from '../../ui/badge';
import {
  DollarSign,
  Download,
  RefreshCw,
  Calendar,
  TrendingUp,
  Users,
  ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';

interface Settlement {
  partner_id: number;
  business_name: string;
  partner_type: string;
  email: string;
  total_orders: number;
  total_sales: number;
  total_refunded: number;
  net_sales: number;
  commission_rate: number;
  commission_amount: number;
  settlement_amount: number;
  first_order_date: string;
  last_order_date: string;
  status: string;
}

interface Stats {
  total_partners: number;
  total_orders: number;
  total_sales: number;
  total_refunded: number;
  total_net_sales: number;
  total_commission: number;
  total_settlement: number;
}

export function AdminSettlements() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');

  // 정산 데이터 로드
  const loadSettlements = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedPartnerId) params.append('partner_id', selectedPartnerId);

      const response = await fetch(`/api/admin/settlements?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setSettlements(data.data);
        setStats(data.stats);
        toast.success(`${data.data.length}개 파트너 정산 내역 로드 완료`);
      } else {
        toast.error('정산 내역 로드 실패: ' + data.error);
      }
    } catch (error) {
      console.error('정산 내역 로드 오류:', error);
      toast.error('정산 내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettlements();
  }, []);

  // CSV 다운로드
  const downloadCSV = () => {
    if (settlements.length === 0) {
      toast.error('다운로드할 데이터가 없습니다.');
      return;
    }

    const headers = [
      '파트너명',
      '파트너 타입',
      '이메일',
      '주문 건수',
      '총 매출',
      '총 환불',
      '순 매출',
      '수수료율(%)',
      '수수료',
      '정산 금액',
      '첫 주문일',
      '마지막 주문일'
    ];

    const rows = settlements.map(s => [
      s.business_name,
      s.partner_type,
      s.email || 'N/A',
      s.total_orders,
      s.total_sales.toFixed(2),
      s.total_refunded.toFixed(2),
      s.net_sales.toFixed(2),
      s.commission_rate,
      s.commission_amount.toFixed(2),
      s.settlement_amount.toFixed(2),
      s.first_order_date ? new Date(s.first_order_date).toLocaleDateString('ko-KR') : 'N/A',
      s.last_order_date ? new Date(s.last_order_date).toLocaleDateString('ko-KR') : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `settlements_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('CSV 파일 다운로드 완료');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
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
            정산 관리
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            파트너별 매출, 수수료, 정산 금액 관리
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

      {/* 필터 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>시작일</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>종료일</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label>파트너 ID</Label>
              <Input
                type="number"
                placeholder="파트너 ID"
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadSettlements} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                조회
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">파트너 수</p>
                  <p className="text-2xl font-bold">{stats.total_partners}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">총 주문 건수</p>
                  <p className="text-2xl font-bold">{stats.total_orders}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">순 매출</p>
                  <p className="text-2xl font-bold">₩{stats.total_net_sales.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">총 정산 금액</p>
                  <p className="text-2xl font-bold text-green-600">₩{stats.total_settlement.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 정산 내역 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>정산 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">파트너</th>
                  <th className="text-left p-3">타입</th>
                  <th className="text-right p-3">주문 건수</th>
                  <th className="text-right p-3">총 매출</th>
                  <th className="text-right p-3">환불</th>
                  <th className="text-right p-3">순 매출</th>
                  <th className="text-right p-3">수수료율</th>
                  <th className="text-right p-3">수수료</th>
                  <th className="text-right p-3">정산 금액</th>
                  <th className="text-center p-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {settlements.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-500">
                      정산 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  settlements.map((settlement) => (
                    <tr key={settlement.partner_id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{settlement.business_name}</p>
                          <p className="text-xs text-gray-500">{settlement.email || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{settlement.partner_type}</Badge>
                      </td>
                      <td className="text-right p-3">{settlement.total_orders}</td>
                      <td className="text-right p-3">₩{settlement.total_sales.toLocaleString()}</td>
                      <td className="text-right p-3 text-red-500">
                        {settlement.total_refunded > 0 ? `-₩${settlement.total_refunded.toLocaleString()}` : '-'}
                      </td>
                      <td className="text-right p-3 font-medium">₩{settlement.net_sales.toLocaleString()}</td>
                      <td className="text-right p-3">{settlement.commission_rate}%</td>
                      <td className="text-right p-3 text-orange-600">
                        ₩{settlement.commission_amount.toLocaleString()}
                      </td>
                      <td className="text-right p-3 font-bold text-green-600">
                        ₩{settlement.settlement_amount.toLocaleString()}
                      </td>
                      <td className="text-center p-3">
                        <Badge className="bg-yellow-100 text-yellow-800">대기</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
