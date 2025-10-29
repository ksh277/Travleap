import React from 'react';
import { ComingSoonPage } from './ComingSoonPage';

interface CareersPageProps {
  onBack?: () => void;
}

export function CareersPage({ onBack }: CareersPageProps) {
  return (
    <ComingSoonPage
      title="함께 일하기"
      description="어썸플랜과 함께 성장할 인재를 찾고 있습니다."
      onBack={onBack}
    />
  );
}
