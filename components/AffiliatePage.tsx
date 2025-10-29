import React from 'react';
import { ComingSoonPage } from './ComingSoonPage';

interface AffiliatePageProps {
  onBack?: () => void;
}

export function AffiliatePage({ onBack }: AffiliatePageProps) {
  return (
    <ComingSoonPage
      title="제휴 문의"
      description="어썸플랜과 함께 성장할 파트너를 찾고 있습니다."
      onBack={onBack}
    />
  );
}
