import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  DollarSign,
  Download,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface Payment {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  product_name: string;
  category: string;
  amount: number;
  payment_date: string;
  payment_status: string;
}

export function AdminSettlements() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const commissionRate = 15; // 플랫폼 수수료율 (나중에 조정 가능)

  // 결제 데이터 로드
  const loadPayments = async () => {
    try {
      setIsLoading(true);

      // 날짜 범위 계산
      const now = new Date();
      let startDate: Date;

      if (period === 'day') {
        // 오늘 00:00:00
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'week') {
        // 일주일 전
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        // 한 달 전
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      }

      const response = await fetch('/api/orders');
      const data = await response.json();

      if (data.success) {
        // payment_status가 'paid'이고 날짜 범위 내인 것만 필터링
        const paidOrders = (data.data || [])
          .filter((order: any) => {
            if (order.payment_status !== 'paid') return false;
            const orderDate = new Date(order.created_at);
            return orderDate >= startDate && orderDate <= now;
          })
          .map((order: any) => ({
            id: order.id,
            order_number: order.order_number,
            customer_name: order.user_name || '정보없음',
            customer_phone: order.user_phone || '정보없음',
            customer_email: order.user_email || '정보없음',
            product_name: order.product_name || order.listing_title || '상품명 없음',
            category: order.category || '일반',
            amount: order.amount || 0,
            payment_date: order.created_at,
            payment_status: order.payment_status
          }));

        setPayments(paidOrders);
        toast.success(`${paidOrders.length}건의 결제 내역 로드 완료`);
      } else {
        toast.error('결제 내역 로드 실패');
      }
    } catch (error) {
      console.error('결제 내역 로드 오류:', error);
      toast.error('결제 내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [period]);

  // CSV 다운로드
  const downloadCSV = () => {
    if (payments.length === 0) {
      toast.error('다운로드할 데이터가 없습니다.');
      return;
    }

    const headers = [
      '주문번호',
      '고객명',
      '전화번호',
      '이메일',
      '상품명',
      '카테고리',
      '금액',
      '결제일',
      '상태'
    ];

    const rows = payments.map(p => [
      p.order_number,
      p.customer_name,
      p.customer_phone,
      p.customer_email,
      p.product_name,
      p.category,
      p.amount,
      new Date(p.payment_date).toLocaleString('ko-KR'),
      p.payment_status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_${new Date().toISOString().split('T')[0]}.csv`);
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

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const settlementAmount = Math.floor(totalAmount * (100 - commissionRate) / 100);

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
            결제 완료 내역 및 정산 금액 확인
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            CSV 다운로드
          </Button>
          <Button onClick={loadPayments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 기간 필터 */}
      <div className="flex gap-2">
        <Button
          onClick={() => setPeriod('day')}
          variant={period === 'day' ? 'default' : 'outline'}
        >
          하루
        </Button>
        <Button
          onClick={() => setPeriod('week')}
          variant={period === 'week' ? 'default' : 'outline'}
        >
          한주
        </Button>
        <Button
          onClick={() => setPeriod('month')}
          variant={period === 'month' ? 'default' : 'outline'}
        >
          한달
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-500">총 결제 건수</p>
              <p className="text-3xl font-bold">{payments.length}건</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-500">총 매출액</p>
              <p className="text-3xl font-bold">₩{totalAmount.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-gray-500">예상 정산액 ({100 - commissionRate}%)</p>
              <p className="text-3xl font-bold text-green-600">₩{settlementAmount.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                플랫폼 수수료 {commissionRate}% (나중에 조정 가능)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 결제 내역 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>결제 완료 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">주문번호</th>
                  <th className="text-left p-3">상품명</th>
                  <th className="text-left p-3">카테고리</th>
                  <th className="text-right p-3">금액</th>
                  <th className="text-left p-3">결제일</th>
                  <th className="text-center p-3">작업</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      결제 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <p className="font-medium">{payment.order_number}</p>
                      </td>
                      <td className="p-3">
                        <p className="text-sm">{payment.product_name}</p>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{payment.category}</Badge>
                      </td>
                      <td className="text-right p-3 font-medium">
                        ₩{payment.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(payment.payment_date).toLocaleString('ko-KR')}
                      </td>
                      <td className="text-center p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          자세히보기
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 자세히보기 모달 */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>결제 상세 정보</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPayment(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">주문번호</p>
                <p className="font-medium">{selectedPayment.order_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">고객명</p>
                <p className="font-medium">{selectedPayment.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">전화번호</p>
                <p className="font-medium">
                  <a href={`tel:${selectedPayment.customer_phone}`} className="text-blue-600 hover:underline">
                    {selectedPayment.customer_phone}
                  </a>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">이메일</p>
                <p className="font-medium">
                  <a href={`mailto:${selectedPayment.customer_email}`} className="text-blue-600 hover:underline">
                    {selectedPayment.customer_email}
                  </a>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">결제일</p>
                <p className="font-medium">{new Date(selectedPayment.payment_date).toLocaleString('ko-KR')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">결제금액</p>
                <p className="text-2xl font-bold text-green-600">₩{selectedPayment.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">정산 예정액 ({100 - commissionRate}%)</p>
                <p className="text-xl font-bold text-blue-600">
                  ₩{Math.floor(selectedPayment.amount * (100 - commissionRate) / 100).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  플랫폼 수수료 {commissionRate}% 차감 후
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
