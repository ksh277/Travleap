/**
 * 토스페이먼츠 결제 연동
 * https://docs.tosspayments.com/
 */

interface TossPaymentRequest {
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  customerEmail: string;
  customerMobilePhone?: string;
  successUrl: string;
  failUrl: string;
}

interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  status: 'READY' | 'IN_PROGRESS' | 'WAITING_FOR_DEPOSIT' | 'DONE' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED' | 'EXPIRED';
  totalAmount: number;
  method: string;
  approvedAt?: string;
}

/**
 * 토스페이먼츠 결제 요청
 */
export async function requestTossPayment(data: TossPaymentRequest): Promise<void> {
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;

  if (!clientKey) {
    throw new Error('토스페이먼츠 클라이언트 키가 설정되지 않았습니다. .env에 VITE_TOSS_CLIENT_KEY를 추가하세요.');
  }

  // 토스페이먼츠 SDK 로드
  const tossPayments = await loadTossPayments(clientKey);

  // 결제 요청
  await tossPayments.requestPayment('카드', {
    amount: data.amount,
    orderId: data.orderId,
    orderName: data.orderName,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerMobilePhone: data.customerMobilePhone,
    successUrl: data.successUrl,
    failUrl: data.failUrl
  });
}

/**
 * 토스페이먼츠 SDK 로드
 */
function loadTossPayments(clientKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // 이미 로드되어 있으면 바로 반환
    if ((window as any).TossPayments) {
      resolve((window as any).TossPayments(clientKey));
      return;
    }

    // 스크립트 로드
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment';
    script.async = true;

    script.onload = () => {
      resolve((window as any).TossPayments(clientKey));
    };

    script.onerror = () => {
      reject(new Error('토스페이먼츠 SDK 로드 실패'));
    };

    document.body.appendChild(script);
  });
}

/**
 * 결제 승인 (서버에서 호출)
 */
export async function approveTossPayment(
  paymentKey: string,
  orderId: string,
  amount: number
): Promise<TossPaymentResponse> {
  const secretKey = import.meta.env.VITE_TOSS_SECRET_KEY;

  if (!secretKey) {
    throw new Error('토스페이먼츠 시크릿 키가 설정되지 않았습니다.');
  }

  const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(secretKey + ':')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '결제 승인 실패');
  }

  return await response.json();
}

/**
 * 결제 취소 (환불)
 */
export async function cancelTossPayment(
  paymentKey: string,
  cancelReason: string,
  cancelAmount?: number
): Promise<TossPaymentResponse> {
  const secretKey = import.meta.env.VITE_TOSS_SECRET_KEY;

  if (!secretKey) {
    throw new Error('토스페이먼츠 시크릿 키가 설정되지 않았습니다.');
  }

  const body: any = {
    cancelReason
  };

  if (cancelAmount) {
    body.cancelAmount = cancelAmount;
  }

  const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(secretKey + ':')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '결제 취소 실패');
  }

  return await response.json();
}

/**
 * 결제 정보 조회
 */
export async function getTossPayment(paymentKey: string): Promise<TossPaymentResponse> {
  const secretKey = import.meta.env.VITE_TOSS_SECRET_KEY;

  if (!secretKey) {
    throw new Error('토스페이먼츠 시크릿 키가 설정되지 않았습니다.');
  }

  const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${btoa(secretKey + ':')}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '결제 정보 조회 실패');
  }

  return await response.json();
}

/**
 * 주문 ID 생성 (유니크)
 */
export function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `ORDER_${timestamp}_${random}`;
}

/**
 * 렌트카 예약 결제 요청 헬퍼
 */
export async function requestRentcarPayment(booking: {
  bookingId: number;
  vehicleName: string;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}): Promise<void> {
  const orderId = generateOrderId();
  const baseUrl = window.location.origin;

  await requestTossPayment({
    amount: booking.totalAmount,
    orderId: orderId,
    orderName: `${booking.vehicleName} 렌트`,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerMobilePhone: booking.customerPhone,
    successUrl: `${baseUrl}/payment/success?bookingId=${booking.bookingId}`,
    failUrl: `${baseUrl}/payment/fail?bookingId=${booking.bookingId}`
  });
}
