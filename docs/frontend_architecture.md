# 스마트 쿠폰 시스템 - Frontend Architecture
## Day 4: 프론트엔드 아키텍처 설계

---

## 📁 Directory Structure

```
pages/
├── campaigns/
│   ├── index.tsx                    # 캠페인 목록 페이지
│   └── [campaignCode].tsx          # 캠페인 상세 + 쿠폰 발급
│
├── my-coupons/
│   ├── index.tsx                    # 내 쿠폰 목록
│   └── [couponCode].tsx            # 쿠폰 상세 (QR 표시)
│
├── api/
│   ├── campaigns/
│   │   └── index.js                 # GET /api/campaigns
│   │
│   ├── smart-coupons/
│   │   ├── issue.js                 # POST /api/smart-coupons/issue
│   │   ├── my.js                    # GET /api/smart-coupons/my
│   │   ├── [couponCode].js          # GET /api/smart-coupons/:couponCode
│   │   └── reviews.js               # POST /api/smart-coupons/reviews
│   │
│   ├── partner/
│   │   ├── coupon-validate.js       # POST /api/partner/coupon-validate
│   │   └── coupon-use.js            # POST /api/partner/coupon-use
│   │
│   ├── auth/
│   │   └── kakao/
│   │       └── callback.js          # GET /api/auth/kakao/callback
│   │
│   └── admin/
│       ├── campaigns/
│       │   ├── index.js             # POST /api/admin/campaigns
│       │   └── [id].js              # PUT /api/admin/campaigns/:id
│       └── settlements.js           # GET /api/admin/settlements
│
└── admin/
    ├── campaigns/
    │   ├── index.tsx                # 캠페인 관리 목록
    │   ├── new.tsx                  # 캠페인 생성
    │   └── [id]/edit.tsx            # 캠페인 수정
    └── settlements.tsx              # 정산 관리

components/
├── campaigns/
│   ├── CampaignCard.tsx             # 캠페인 카드 컴포넌트
│   ├── CampaignDetail.tsx           # 캠페인 상세 정보
│   ├── MerchantList.tsx             # 가맹점 목록 표시
│   └── IssueCouponButton.tsx        # 쿠폰 발급 버튼
│
├── coupons/
│   ├── CouponCard.tsx               # 쿠폰 카드 (목록용)
│   ├── QRCodeDisplay.tsx            # QR 코드 표시 컴포넌트
│   ├── CouponStatus.tsx             # 쿠폰 상태 배지
│   └── ReviewForm.tsx               # 리뷰 작성 폼
│
├── partner/
│   ├── QRScanner.tsx                # QR 스캔 컴포넌트
│   ├── CouponValidator.tsx          # 쿠폰 검증 UI
│   └── UsageConfirmation.tsx        # 사용 확인 모달
│
└── admin/
    ├── CampaignForm.tsx             # 캠페인 생성/수정 폼
    ├── MerchantSelector.tsx         # 가맹점 선택 컴포넌트
    └── SettlementTable.tsx          # 정산 테이블

lib/
├── smartCoupon/
│   ├── api.ts                       # API 클라이언트 함수들
│   ├── types.ts                     # TypeScript 타입 정의
│   └── utils.ts                     # 유틸리티 함수들
│
└── kakao/
    ├── oauth.ts                     # Kakao OAuth 헬퍼
    └── messages.ts                  # Kakao 메시지 전송 헬퍼
```

---

## 🎯 Page Routes & Flow

### 1. 공개 캠페인 페이지

#### `/campaigns` - 캠페인 목록
```tsx
// pages/campaigns/index.tsx
import { GetServerSideProps } from 'next';
import CampaignCard from '@/components/campaigns/CampaignCard';

interface Campaign {
  id: number;
  name: string;
  campaign_code: string;
  description: string;
  image_url: string;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  valid_from: string;
  valid_until: string;
  total_issued: number;
  max_issuance: number;
}

export default function CampaignsPage({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">진행 중인 캠페인</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map(campaign => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/campaigns?status=ACTIVE`);
  const campaigns = await res.json();
  return { props: { campaigns } };
};
```

#### `/campaigns/[campaignCode]` - 캠페인 상세 + 쿠폰 발급
```tsx
// pages/campaigns/[campaignCode].tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import CampaignDetail from '@/components/campaigns/CampaignDetail';
import MerchantList from '@/components/campaigns/MerchantList';
import IssueCouponButton from '@/components/campaigns/IssueCouponButton';

export default function CampaignDetailPage({ campaign, merchants }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isIssuing, setIsIssuing] = useState(false);

  const handleIssueCoupon = async () => {
    // 로그인 체크
    if (!session) {
      // Kakao OAuth 로그인 리다이렉트
      const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY}&redirect_uri=${process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI}&response_type=code&state=${campaign.campaign_code}`;
      window.location.href = kakaoAuthUrl;
      return;
    }

    setIsIssuing(true);
    try {
      const res = await fetch('/api/smart-coupons/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_code: campaign.campaign_code })
      });

      if (res.ok) {
        const { coupon_code } = await res.json();
        router.push(`/my-coupons/${coupon_code}`);
      } else {
        const error = await res.json();
        alert(error.message);
      }
    } catch (error) {
      alert('쿠폰 발급에 실패했습니다.');
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <CampaignDetail campaign={campaign} />
      <MerchantList merchants={merchants} />
      <IssueCouponButton
        onIssue={handleIssueCoupon}
        isLoading={isIssuing}
        disabled={campaign.status !== 'ACTIVE'}
      />
    </div>
  );
}
```

### 2. 내 쿠폰 페이지 (로그인 필요)

#### `/my-coupons` - 내 쿠폰 목록
```tsx
// pages/my-coupons/index.tsx
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import CouponCard from '@/components/coupons/CouponCard';

export default function MyCouponsPage({ coupons }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">내 쿠폰</h1>

      {/* 사용 가능한 쿠폰 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">사용 가능</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coupons.filter(c => c.status === 'ACTIVE').map(coupon => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </div>
      </section>

      {/* 사용 완료 쿠폰 */}
      <section>
        <h2 className="text-xl font-semibold mb-4">사용 완료</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coupons.filter(c => c.status === 'USED').map(coupon => (
            <CouponCard key={coupon.id} coupon={coupon} showReviewButton />
          ))}
        </div>
      </section>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/smart-coupons/my`, {
    headers: { 'Authorization': `Bearer ${session.accessToken}` }
  });
  const coupons = await res.json();

  return { props: { coupons } };
};
```

#### `/my-coupons/[couponCode]` - QR 코드 표시
```tsx
// pages/my-coupons/[couponCode].tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import QRCodeDisplay from '@/components/coupons/QRCodeDisplay';
import CouponStatus from '@/components/coupons/CouponStatus';
import ReviewForm from '@/components/coupons/ReviewForm';

export default function CouponDetailPage() {
  const router = useRouter();
  const { couponCode } = router.query;
  const [coupon, setCoupon] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (couponCode) {
      fetch(`/api/smart-coupons/${couponCode}`)
        .then(res => res.json())
        .then(data => setCoupon(data));
    }
  }, [couponCode]);

  if (!coupon) return <div>Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        {/* 캠페인 정보 */}
        <h1 className="text-2xl font-bold mb-2">{coupon.campaign_name}</h1>
        <CouponStatus status={coupon.status} />

        {/* QR 코드 (사용 가능한 경우에만) */}
        {coupon.status === 'ACTIVE' && (
          <QRCodeDisplay
            qrData={coupon.qr_image}
            couponCode={coupon.coupon_code}
          />
        )}

        {/* 쿠폰 정보 */}
        <div className="mt-6 space-y-2 text-sm">
          <p><strong>쿠폰 코드:</strong> {coupon.coupon_code}</p>
          <p><strong>발급일:</strong> {new Date(coupon.issued_at).toLocaleDateString()}</p>
          <p><strong>유효기간:</strong> {new Date(coupon.valid_until).toLocaleDateString()}까지</p>

          {coupon.status === 'USED' && (
            <>
              <p><strong>사용일:</strong> {new Date(coupon.used_at).toLocaleDateString()}</p>
              <p><strong>사용처:</strong> {coupon.merchant_name}</p>
            </>
          )}
        </div>

        {/* 리뷰 작성 버튼 (사용 완료 + 리뷰 미작성) */}
        {coupon.status === 'USED' && !coupon.has_review && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold"
          >
            리뷰 작성하고 포인트 받기
          </button>
        )}

        {/* 리뷰 폼 모달 */}
        {showReviewForm && (
          <ReviewForm
            couponCode={coupon.coupon_code}
            onClose={() => setShowReviewForm(false)}
            onSuccess={() => {
              setShowReviewForm(false);
              setCoupon({ ...coupon, has_review: true });
            }}
          />
        )}
      </div>
    </div>
  );
}
```

### 3. 파트너 대시보드 (가맹점용)

#### Partner QR Scanner Page
```tsx
// pages/partner/scan.tsx
import { useState } from 'react';
import QRScanner from '@/components/partner/QRScanner';
import CouponValidator from '@/components/partner/CouponValidator';
import UsageConfirmation from '@/components/partner/UsageConfirmation';

export default function PartnerScanPage() {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  const handleScan = async (code: string) => {
    setScannedCode(code);

    // 쿠폰 유효성 검증
    const res = await fetch('/api/partner/coupon-validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coupon_code: code })
    });

    const result = await res.json();
    setValidationResult(result);
  };

  const handleConfirmUse = async () => {
    const res = await fetch('/api/partner/coupon-use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coupon_code: scannedCode })
    });

    if (res.ok) {
      alert('쿠폰이 사용 처리되었습니다.');
      setScannedCode(null);
      setValidationResult(null);
    } else {
      alert('쿠폰 사용 처리에 실패했습니다.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">쿠폰 스캔</h1>

      {!scannedCode && <QRScanner onScan={handleScan} />}

      {validationResult && (
        validationResult.valid ? (
          <CouponValidator
            coupon={validationResult.coupon}
            onConfirm={handleConfirmUse}
            onCancel={() => {
              setScannedCode(null);
              setValidationResult(null);
            }}
          />
        ) : (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {validationResult.message}
          </div>
        )
      )}
    </div>
  );
}
```

### 4. 관리자 페이지

#### `/admin/campaigns` - 캠페인 관리
```tsx
// pages/admin/campaigns/index.tsx
import Link from 'next/link';
import { GetServerSideProps } from 'next';

export default function AdminCampaignsPage({ campaigns }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">캠페인 관리</h1>
        <Link href="/admin/campaigns/new">
          <a className="bg-blue-600 text-white px-4 py-2 rounded">새 캠페인 만들기</a>
        </Link>
      </div>

      <table className="w-full bg-white shadow-md rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2">캠페인명</th>
            <th className="px-4 py-2">코드</th>
            <th className="px-4 py-2">상태</th>
            <th className="px-4 py-2">발급/최대</th>
            <th className="px-4 py-2">사용/발급</th>
            <th className="px-4 py-2">액션</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map(campaign => (
            <tr key={campaign.id}>
              <td className="px-4 py-2">{campaign.name}</td>
              <td className="px-4 py-2">{campaign.campaign_code}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  campaign.status === 'ACTIVE' ? 'bg-green-200' : 'bg-gray-200'
                }`}>
                  {campaign.status}
                </span>
              </td>
              <td className="px-4 py-2">{campaign.total_issued} / {campaign.max_issuance}</td>
              <td className="px-4 py-2">{campaign.total_used} / {campaign.total_issued}</td>
              <td className="px-4 py-2">
                <Link href={`/admin/campaigns/${campaign.id}/edit`}>
                  <a className="text-blue-600 hover:underline">수정</a>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🔧 Core Components

### QRCodeDisplay Component
```tsx
// components/coupons/QRCodeDisplay.tsx
import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  qrData: string;  // Base64 이미지 또는 쿠폰 코드
  couponCode: string;
}

export default function QRCodeDisplay({ qrData, couponCode }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && couponCode) {
      QRCode.toCanvas(canvasRef.current, couponCode, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    }
  }, [couponCode]);

  return (
    <div className="flex flex-col items-center my-6">
      {qrData ? (
        <img src={qrData} alt="QR Code" className="w-64 h-64" />
      ) : (
        <canvas ref={canvasRef} className="border-4 border-gray-200 rounded-lg" />
      )}
      <p className="mt-4 text-sm text-gray-600">가맹점에서 스캔해주세요</p>
    </div>
  );
}
```

### QRScanner Component (Partner)
```tsx
// components/partner/QRScanner.tsx
import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (code: string) => void;
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: 250 },
      false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear();
      },
      (error) => {
        console.warn('QR Scan error:', error);
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner.clear();
    };
  }, [onScan]);

  return (
    <div>
      <div id="qr-reader" className="w-full max-w-md mx-auto"></div>
    </div>
  );
}
```

### ReviewForm Component
```tsx
// components/coupons/ReviewForm.tsx
import { useState } from 'react';

interface ReviewFormProps {
  couponCode: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewForm({ couponCode, onClose, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/smart-coupons/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupon_code: couponCode,
          rating,
          comment
        })
      });

      if (res.ok) {
        const { points_awarded } = await res.json();
        alert(`리뷰가 등록되었습니다! ${points_awarded} 포인트가 적립되었습니다.`);
        onSuccess();
      } else {
        alert('리뷰 등록에 실패했습니다.');
      }
    } catch (error) {
      alert('오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">리뷰 작성</h2>

        <form onSubmit={handleSubmit}>
          {/* 별점 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">별점</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-3xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* 코멘트 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">리뷰 내용</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border rounded px-3 py-2 min-h-[100px]"
              placeholder="쿠폰 사용 경험을 공유해주세요"
              required
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-2 rounded disabled:bg-blue-300"
            >
              {isSubmitting ? '등록 중...' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 🔐 Authentication Flow

### Kakao OAuth Integration

```tsx
// pages/api/auth/kakao/callback.js
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { query } from '@/lib/db';

export default async function handler(req, res) {
  const { code, state } = req.query; // state = campaign_code

  try {
    // 1. Kakao 액세스 토큰 획득
    const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_REST_API_KEY,
        code: code,
        redirect_uri: process.env.KAKAO_REDIRECT_URI
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token } = tokenResponse.data;

    // 2. Kakao 사용자 정보 획득
    const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const kakaoUser = userResponse.data;
    const kakaoId = kakaoUser.id;
    const email = kakaoUser.kakao_account?.email;
    const name = kakaoUser.properties?.nickname;

    // 3. 기존 사용자 확인
    const existingKakaoUser = await query(
      'SELECT user_id FROM kakao_users WHERE kakao_id = ?',
      [kakaoId]
    );

    let userId;

    if (existingKakaoUser.length > 0) {
      // 기존 사용자
      userId = existingKakaoUser[0].user_id;
    } else {
      // 신규 사용자 - 자동 가입
      const userResult = await query(
        'INSERT INTO users (email, name, role, auth_provider) VALUES (?, ?, ?, ?)',
        [email, name, 'user', 'kakao']
      );
      userId = userResult.insertId;

      // kakao_users 테이블에 연결
      await query(
        'INSERT INTO kakao_users (user_id, kakao_id, kakao_email, kakao_access_token) VALUES (?, ?, ?, ?)',
        [userId, kakaoId, email, access_token]
      );
    }

    // 4. JWT 토큰 생성
    const jwtToken = jwt.sign(
      { userId, email, name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. 캠페인 페이지로 리다이렉트 (토큰 포함)
    const redirectUrl = state
      ? `/campaigns/${state}?token=${jwtToken}`
      : `/my-coupons?token=${jwtToken}`;

    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Kakao OAuth error:', error);
    res.redirect('/login?error=oauth_failed');
  }
}
```

### Client-side Auth Hook
```tsx
// lib/hooks/useAuth.ts
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export function useAuth() {
  const router = useRouter();

  useEffect(() => {
    // URL에서 토큰 추출하여 localStorage에 저장
    const { token } = router.query;
    if (token) {
      localStorage.setItem('auth_token', token as string);
      // URL에서 토큰 제거
      router.replace(router.pathname, undefined, { shallow: true });
    }
  }, [router.query]);

  const getToken = () => {
    return localStorage.getItem('auth_token');
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    router.push('/');
  };

  return { getToken, logout };
}
```

---

## 📦 State Management

### API Client Library
```typescript
// lib/smartCoupon/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiOptions {
  method?: string;
  body?: any;
  requireAuth?: boolean;
}

async function apiCall(endpoint: string, options: ApiOptions = {}) {
  const { method = 'GET', body, requireAuth = true } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API call failed');
  }

  return response.json();
}

// 캠페인 API
export const campaignApi = {
  list: (status?: string) =>
    apiCall(`/api/campaigns${status ? `?status=${status}` : ''}`, { requireAuth: false }),

  detail: (campaignCode: string) =>
    apiCall(`/api/campaigns/${campaignCode}`, { requireAuth: false }),
};

// 쿠폰 API
export const couponApi = {
  issue: (campaign_code: string) =>
    apiCall('/api/smart-coupons/issue', { method: 'POST', body: { campaign_code } }),

  my: () =>
    apiCall('/api/smart-coupons/my'),

  detail: (coupon_code: string) =>
    apiCall(`/api/smart-coupons/${coupon_code}`),

  review: (coupon_code: string, rating: number, comment: string) =>
    apiCall('/api/smart-coupons/reviews', {
      method: 'POST',
      body: { coupon_code, rating, comment }
    }),
};

// 파트너 API
export const partnerApi = {
  validate: (coupon_code: string) =>
    apiCall('/api/partner/coupon-validate', { method: 'POST', body: { coupon_code } }),

  use: (coupon_code: string) =>
    apiCall('/api/partner/coupon-use', { method: 'POST', body: { coupon_code } }),
};

// 관리자 API
export const adminApi = {
  createCampaign: (data: any) =>
    apiCall('/api/admin/campaigns', { method: 'POST', body: data }),

  updateCampaign: (id: number, data: any) =>
    apiCall(`/api/admin/campaigns/${id}`, { method: 'PUT', body: data }),

  settlements: (startDate?: string, endDate?: string) =>
    apiCall(`/api/admin/settlements?start_date=${startDate}&end_date=${endDate}`),
};
```

---

## 🎨 UI/UX Considerations

### 1. Mobile-First Design
- 모든 페이지는 모바일 우선 설계
- QR 코드 스캔은 주로 모바일에서 발생
- 터치 친화적인 버튼 크기 (최소 44x44px)

### 2. QR Code Best Practices
- QR 코드는 최소 250x250px 크기로 표시
- 높은 대비 (검정/흰색)
- Error correction level: M (15% 복원 가능)

### 3. Loading States
- 쿠폰 발급 중: 스피너 + "쿠폰 발급 중..." 메시지
- QR 스캔 중: 카메라 뷰 + 가이드 박스
- 리뷰 제출 중: 버튼 비활성화 + 로딩 인디케이터

### 4. Error Handling
- 네트워크 오류: 재시도 버튼 제공
- 권한 오류: 로그인 페이지로 리다이렉트
- 쿠폰 발급 한도 초과: 명확한 안내 메시지

### 5. Accessibility
- ARIA 레이블 적용
- 키보드 네비게이션 지원
- 색맹 사용자를 위한 텍스트 레이블 병기

---

## 🔗 Integration Points

### Backend API Dependencies
```typescript
// lib/smartCoupon/types.ts
export interface Campaign {
  id: number;
  name: string;
  campaign_code: string;
  description: string;
  image_url: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
  discount_type: 'PERCENTAGE' | 'FIXED' | 'FREE';
  discount_value: number;
  valid_from: string;
  valid_until: string;
  max_issuance: number;
  total_issued: number;
  total_used: number;
}

export interface UserCoupon {
  id: number;
  user_id: number;
  campaign_id: number;
  coupon_code: string;
  qr_url: string | null;
  qr_image: string | null;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
  issued_at: string;
  used_at: string | null;
  valid_until: string;
  campaign_name: string;
  merchant_name: string | null;
  has_review: boolean;
}

export interface Merchant {
  merchant_id: number;
  merchant_name: string;
  business_number: string;
  discount_rate: number;
}

export interface CouponReview {
  id: number;
  user_coupon_id: number;
  rating: number;
  comment: string;
  points_awarded: number;
  created_at: string;
}
```

### External Dependencies
```json
// package.json additions
{
  "dependencies": {
    "qrcode": "^1.5.3",
    "html5-qrcode": "^2.3.8",
    "jsonwebtoken": "^9.0.2",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5",
    "@types/jsonwebtoken": "^9.0.5"
  }
}
```

---

## 🚀 Performance Optimization

### 1. Code Splitting
- Dynamic imports for QR scanner (only load on partner pages)
- Lazy load review form modal

### 2. Image Optimization
- Use Next.js `<Image>` component for campaign images
- Store QR codes as base64 in DB for immediate display

### 3. Caching Strategy
- Cache campaign list for 5 minutes (ISR)
- Cache user coupons with SWR (stale-while-revalidate)

### 4. API Response Optimization
- Return only necessary fields in list endpoints
- Paginate admin settlement reports

---

## ✅ Testing Strategy

### Unit Tests
- QRCodeDisplay rendering
- ReviewForm validation
- API client error handling

### Integration Tests
- Coupon issuance flow
- OAuth callback flow
- Partner validation flow

### E2E Tests
- Complete user journey: Campaign view → Login → Issue → Use → Review
- Partner journey: Scan → Validate → Approve

---

## 📋 Implementation Checklist

### Phase 1: Core Pages (Day 6-10)
- [ ] Campaign list page
- [ ] Campaign detail page
- [ ] My coupons list page
- [ ] Coupon detail with QR

### Phase 2: Interactive Features (Day 11-15)
- [ ] Kakao OAuth integration
- [ ] Coupon issuance flow
- [ ] QR code generation
- [ ] Review submission

### Phase 3: Partner & Admin (Day 16-25)
- [ ] Partner QR scanner
- [ ] Partner validation UI
- [ ] Admin campaign management
- [ ] Admin settlement reports

### Phase 4: Polish & Testing (Day 26-35)
- [ ] Mobile responsive design
- [ ] Error handling
- [ ] Loading states
- [ ] E2E testing
- [ ] Performance optimization

---

## 🎯 Next Steps

Day 5에서는 위 frontend architecture와 기존 backend API specifications를 통합하여 최종 리뷰를 진행합니다.

**확인 사항:**
1. Backend API와 Frontend 데이터 타입 일치 여부
2. Kakao OAuth 설정 (환경변수, 리다이렉트 URI)
3. 기존 users 테이블 수정 필요성 (auth_provider, total_points)
4. QR 라이브러리 선택 확정
5. 배포 환경 설정 (Vercel 환경변수)
