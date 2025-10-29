import React from 'react';
import { Construction } from 'lucide-react';
import { Button } from './ui/button';

interface ComingSoonPageProps {
  title?: string;
  description?: string;
  onBack?: () => void;
}

export function ComingSoonPage({
  title = "준비중입니다",
  description = "더 나은 서비스로 찾아뵙겠습니다.",
  onBack
}: ComingSoonPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <Construction className="w-24 h-24 mx-auto text-purple-600 mb-6 animate-bounce" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-lg text-gray-600 mb-2">{description}</p>
          <p className="text-sm text-gray-500">
            빠른 시일 내에 준비하여 찾아뵙겠습니다.
          </p>
        </div>

        {onBack && (
          <Button
            onClick={onBack}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
          >
            홈으로 돌아가기
          </Button>
        )}
      </div>
    </div>
  );
}
