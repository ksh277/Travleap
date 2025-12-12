/**
 * QR 코드 생성기 페이지
 * URL을 입력하면 QR 코드 생성 및 다운로드 가능
 */

import React, { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Download, Link as LinkIcon, Home, User, ShoppingBag, Ticket, BookOpen } from 'lucide-react';

interface PresetURL {
  name: string;
  url: string;
  icon: React.ReactNode;
}

export function QRGeneratorPage() {
  const [url, setUrl] = useState('https://travleap.com');
  const [qrSize, setQrSize] = useState(256);
  const qrRef = useRef<HTMLCanvasElement>(null);

  // 쿠폰북 캠페인 목록 (DB에서 가져올 수도 있음)
  const couponBookCampaigns = [
    {
      id: 1,
      name: '가고싶은섬 쿠폰북',
      code: 'COUPON-MIY0WN0FOYWV',
      discount: '10%'
    }
  ];

  // 사전 정의된 URL 목록
  const presetURLs: PresetURL[] = [
    {
      name: '메인 페이지',
      url: 'https://travleap.com',
      icon: <Home className="w-4 h-4" />
    },
    {
      name: '쿠폰북 페이지',
      url: 'https://travleap.com/coupon-book',
      icon: <BookOpen className="w-4 h-4" />
    },
    {
      name: '마이페이지',
      url: 'https://travleap.com/mypage',
      icon: <User className="w-4 h-4" />
    },
    {
      name: '팝업 카테고리',
      url: 'https://travleap.com/category/popup',
      icon: <ShoppingBag className="w-4 h-4" />
    },
    {
      name: '여행 카테고리',
      url: 'https://travleap.com/category/tour',
      icon: <ShoppingBag className="w-4 h-4" />
    },
    {
      name: '숙박 카테고리',
      url: 'https://travleap.com/category/stay',
      icon: <ShoppingBag className="w-4 h-4" />
    },
    {
      name: '음식 카테고리',
      url: 'https://travleap.com/category/food',
      icon: <ShoppingBag className="w-4 h-4" />
    },
    {
      name: '파트너 신청',
      url: 'https://travleap.com/partner-apply',
      icon: <LinkIcon className="w-4 h-4" />
    },
    {
      name: '쿠폰 가맹점',
      url: 'https://travleap.com/partner?coupon=true',
      icon: <Ticket className="w-4 h-4" />
    }
  ];

  // QR 코드 다운로드
  const downloadQRCode = () => {
    const canvas = qrRef.current;
    if (!canvas) return;

    // Canvas를 이미지로 변환
    const pngUrl = canvas
      .toDataURL('image/png')
      .replace('image/png', 'image/octet-stream');

    // 다운로드 링크 생성
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `qr-code-${Date.now()}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">QR 코드 생성기</h1>
          <p className="text-gray-600">URL을 입력하거나 사전 정의된 페이지를 선택하여 QR 코드를 생성하세요</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 왼쪽: QR 코드 미리보기 */}
          <Card>
            <CardHeader>
              <CardTitle>QR 코드 미리보기</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR 코드 표시 */}
              <div className="flex items-center justify-center p-8 bg-white border-2 border-dashed border-gray-300 rounded-lg">
                <QRCodeCanvas
                  ref={qrRef}
                  value={url}
                  size={qrSize}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* 크기 조절 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  QR 코드 크기: {qrSize}px
                </label>
                <input
                  type="range"
                  min="128"
                  max="512"
                  step="64"
                  value={qrSize}
                  onChange={(e) => setQrSize(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>128px</span>
                  <span>256px</span>
                  <span>512px</span>
                </div>
              </div>

              {/* 다운로드 버튼 */}
              <Button
                onClick={downloadQRCode}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Download className="w-5 h-5 mr-2" />
                QR 코드 다운로드
              </Button>

              {/* 현재 URL 표시 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">현재 URL:</p>
                <p className="text-sm font-mono text-gray-900 break-all">{url}</p>
              </div>
            </CardContent>
          </Card>

          {/* 오른쪽: URL 입력 및 프리셋 */}
          <div className="space-y-6">
            {/* URL 직접 입력 */}
            <Card>
              <CardHeader>
                <CardTitle>URL 입력</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    URL 주소
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    QR 코드로 변환할 URL을 입력하세요
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 사전 정의된 URL */}
            <Card>
              <CardHeader>
                <CardTitle>빠른 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {presetURLs.map((preset) => (
                    <button
                      key={preset.url}
                      onClick={() => setUrl(preset.url)}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        url === preset.url
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        url === preset.url ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {preset.icon}
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium text-sm">{preset.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {preset.url.replace('https://travleap.com', '')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 쿠폰북 QR 생성 */}
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <BookOpen className="w-5 h-5" />
                  쿠폰북 QR 생성
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {couponBookCampaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      onClick={() => setUrl(`https://travleap.com/coupon-book?campaign=${campaign.id}`)}
                      className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        url === `https://travleap.com/coupon-book?campaign=${campaign.id}`
                          ? 'border-purple-600 bg-purple-100 text-purple-900'
                          : 'border-purple-200 hover:border-purple-300 bg-white'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        url === `https://travleap.com/coupon-book?campaign=${campaign.id}` ? 'bg-purple-200' : 'bg-purple-100'
                      }`}>
                        <Ticket className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium text-sm">{campaign.name}</p>
                        <p className="text-xs text-purple-600 font-bold">{campaign.discount} 할인</p>
                        <p className="text-xs text-gray-500 mt-1">{campaign.code}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-purple-700 mt-3">
                  이 QR을 스캔하면 로그인 후 쿠폰이 자동 발급됩니다
                </p>
              </CardContent>
            </Card>

            {/* 사용 팁 */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-blue-900 mb-2">사용 팁</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>• QR 코드는 PNG 이미지로 다운로드됩니다</li>
                  <li>• 크기는 128px ~ 512px 사이에서 조절 가능합니다</li>
                  <li>• 인쇄물에는 256px 이상 권장합니다</li>
                  <li>• 포스터나 배너에는 512px 사용을 권장합니다</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
