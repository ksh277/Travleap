import React from 'react';
import { ComingSoonPage } from './ComingSoonPage';

interface CommunityBlogPageProps {
  onBack?: () => void;
}

export function CommunityBlogPage({ onBack }: CommunityBlogPageProps) {
  return (
    <ComingSoonPage
      title="커뮤니티 블로그"
      description="여행 경험과 정보를 공유하는 커뮤니티를 준비하고 있습니다."
      onBack={onBack}
    />
  );
}
