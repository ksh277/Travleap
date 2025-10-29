import React from 'react';
import { ComingSoonPage } from './ComingSoonPage';

interface RewardsPageProps {
  onBack?: () => void;
}

export function RewardsPage({ onBack }: RewardsPageProps) {
  return (
    <ComingSoonPage
      title="포인트 제도"
      description="포인트 적립 및 등급 제도를 준비하고 있습니다."
      onBack={onBack}
    />
  );
}
