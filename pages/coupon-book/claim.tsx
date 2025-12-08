import React from 'react';
import Head from 'next/head';
import { CouponBookClaimPage } from '../../components/CouponBookClaimPage';

export default function CouponBookClaimPageRoute() {
  return (
    <>
      <Head>
        <title>무료 쿠폰 받기 | Travleap</title>
        <meta name="description" content="QR 코드를 스캔하고 무료 쿠폰을 받으세요" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <CouponBookClaimPage />
    </>
  );
}
