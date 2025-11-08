import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { ArrowLeft, Construction } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
  description?: string;
}

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-purple-100 rounded-full p-6">
              <Construction className="h-16 w-16 text-purple-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-600 mb-2">
            현재 페이지를 준비 중입니다
          </p>
          {description && (
            <p className="text-sm text-gray-500 mb-8">
              {description}
            </p>
          )}

          {/* Additional Info */}
          <div className="bg-purple-50 rounded-lg p-6 mb-8">
            <p className="text-sm text-gray-700 leading-relaxed">
              더 나은 서비스를 제공하기 위해 열심히 준비하고 있습니다.<br />
              곧 만나뵐 수 있도록 최선을 다하겠습니다.
            </p>
          </div>

          {/* Back Button */}
          <Button
            onClick={() => navigate('/')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-5 w-5" />
            홈으로 돌아가기
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          궁금하신 사항은 고객센터로 문의해 주세요
        </p>
      </div>
    </div>
  );
}
