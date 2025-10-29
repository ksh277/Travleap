import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Search, RefreshCw, DollarSign, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Order {
  id: number;
  user_name: string;
  user_email: string;
  product_title: string;
  listing_id: number;
  amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  start_date: string;
  end_date: string;
  guests: number;
}

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/orders');
      const data = await response.json();
      if (data.success) {
        setOrders(data.orders || []);
        setFilteredOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('주문 목록을 불러오는데 실패했습니다');
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefund = async (order: Order) => {
    if (!confirm(`이 주문을 환불하시겠습니까?\n\n주문번호: #${order.id}\n고객: ${order.user_name}\n금액: ₩${order.amount.toLocaleString()}\n\n이 작업은 즉시 토스 페이먼츠로 환불을 요청합니다.`)) {
      return;
    }

    // 환불 사유 입력
    const reason = prompt('환불 사유를 입력해주세요:');
    if (!reason || reason.trim() === '') {
      toast.error('환불 사유를 입력해주세요');
      return;
    }

    try {
      // booking_id로 payment_key 조회 (서버에서 처리)
      const response = await fetch('/api/admin/refund-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          bookingId: order.id,
          cancelReason: `[관리자 환불] ${reason}`,
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`환불이 완료되었습니다 (${data.refundAmount?.toLocaleString() || order.amount.toLocaleString()}원)`);
        loadOrders();
      } else {
        toast.error(data.message || '환불 처리에 실패했습니다');
      }
    } catch (error) {
      console.error('Refund request failed:', error);
      toast.error('환불 요청 중 오류가 발생했습니다');
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    let filtered = orders;

    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.product_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, orders]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: '대기중', variant: 'secondary' },
      confirmed: { label: '확정', variant: 'default' },
      completed: { label: '완료', variant: 'outline' },
      cancelled: { label: '취소', variant: 'destructive' },
      refund_requested: { label: '환불대기', variant: 'destructive' }
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">주문 관리</h2>
          <p className="text-gray-600">총 {orders.length}개의 주문</p>
        </div>
        <Button onClick={loadOrders} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="주문번호, 고객명 또는 이메일 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="confirmed">확정</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
                <SelectItem value="refund_requested">환불대기</SelectItem>
                <SelectItem value="cancelled">취소</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-600 mt-2">주문을 불러오는 중...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">주문번호</th>
                    <th className="text-left py-3 px-4">주문자 정보</th>
                    <th className="text-left py-3 px-4">상품명</th>
                    <th className="text-left py-3 px-4">예약일/인원</th>
                    <th className="text-left py-3 px-4">금액</th>
                    <th className="text-left py-3 px-4">결제/예약상태</th>
                    <th className="text-left py-3 px-4">주문일시</th>
                    <th className="text-right py-3 px-4">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">#{order.id}</td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          <div className="font-medium">{order.user_name || '테스트 사용자'}</div>
                          <div className="text-gray-500 text-xs">{order.user_email || 'test@example.com'}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="max-w-xs truncate">{order.product_title}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {order.start_date && order.end_date ? (
                            <>
                              <div>{new Date(order.start_date).toLocaleDateString('ko-KR')}</div>
                              <div className="text-xs text-gray-500">
                                ~ {new Date(order.end_date).toLocaleDateString('ko-KR')}
                              </div>
                            </>
                          ) : (
                            <div className="text-gray-400">-</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            {order.guests ? `성인 ${order.guests}명` : '-'}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        ₩{order.amount?.toLocaleString() || '0'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {getStatusBadge(order.status)}
                          <div className="text-xs text-gray-500">
                            {order.payment_status === 'paid' ? '대기' :
                             order.payment_status === 'pending' ? '미결제' :
                             order.payment_status === 'refunded' ? '환불완료' : order.payment_status}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {order.created_at ? new Date(order.created_at).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        }).replace(/\. /g, '. ').replace(/\.$/, '') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/detail/${order.listing_id}`, '_blank')}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            확인
                          </Button>
                          {order.status !== 'refund_requested' && order.status !== 'cancelled' && order.payment_status === 'paid' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRefund(order)}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              환불
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">
                {searchQuery || statusFilter !== 'all'
                  ? '검색 결과가 없습니다'
                  : '주문이 없습니다'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
