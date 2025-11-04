import React from 'react';
import Head from 'next/head';

export default function MarketingConsent() {
  return (
    <>
      <Head>
        <title>마케팅 정보 수신 동의 - Travleap</title>
        <meta name="description" content="Travleap 마케팅 정보 수신 동의" />
      </Head>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '40px', textAlign: 'center' }}>마케팅 정보 수신 동의 (선택)</h1>

        <div style={{ backgroundColor: '#f0f9ff', padding: '20px', borderRadius: '8px', marginBottom: '40px' }}>
          <p style={{ lineHeight: '1.8', fontSize: '16px' }}>
            본 동의는 <strong>선택사항</strong>이며, 동의하지 않으셔도 Travleap의 모든 서비스를 이용하실 수 있습니다.
          </p>
        </div>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제1조 (목적)</h2>
          <p style={{ lineHeight: '1.8', marginBottom: '16px' }}>
            Travleap(이하 "회사")는 회원에게 다양한 혜택과 유용한 정보를 제공하기 위하여 마케팅 정보 수신 동의를 받고 있습니다.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제2조 (제공하는 정보)</h2>
          <p style={{ lineHeight: '1.8', marginBottom: '16px' }}>회사가 제공하는 마케팅 정보는 다음과 같습니다:</p>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>신규 상품 및 서비스 안내</li>
            <li>할인 쿠폰 및 프로모션 정보</li>
            <li>이벤트 및 경품 당첨 안내</li>
            <li>여행지 추천 및 여행 팁</li>
            <li>포인트 적립 및 사용 안내</li>
            <li>시즌별 특가 상품 정보</li>
            <li>맞춤형 여행 상품 추천</li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제3조 (수신 방법)</h2>
          <p style={{ lineHeight: '1.8', marginBottom: '16px' }}>마케팅 정보는 다음의 방법으로 전송됩니다:</p>
          <ul style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li><strong>이메일:</strong> 회원가입 시 입력한 이메일 주소로 발송</li>
            <li><strong>SMS/카카오톡:</strong> 회원가입 시 입력한 휴대전화번호로 발송 (주요 정보만)</li>
            <li><strong>앱 푸시 알림:</strong> 모바일 앱 설치 시 (향후 제공 예정)</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제4조 (개인정보의 이용)</h2>
          <p style={{ lineHeight: '1.8', marginBottom: '16px' }}>마케팅 정보 발송을 위해 다음의 개인정보를 이용합니다:</p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', marginBottom: '16px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>이용 항목</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>이용 목적</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>보유 기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>이메일, 이름</td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>이메일을 통한 마케팅 정보 발송</td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>동의 철회 시 또는 회원 탈퇴 시까지</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>휴대전화번호</td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>SMS/카카오톡을 통한 중요 정보 발송</td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>동의 철회 시 또는 회원 탈퇴 시까지</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>서비스 이용 기록</td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>맞춤형 상품 추천</td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>동의 철회 시 또는 회원 탈퇴 시까지</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제5조 (동의 철회)</h2>
          <p style={{ lineHeight: '1.8', marginBottom: '16px' }}>회원은 언제든지 다음의 방법으로 마케팅 정보 수신 동의를 철회할 수 있습니다:</p>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li><strong>웹사이트:</strong> 마이페이지 {'>'} 계정설정 {'>'} 마케팅 수신 동의 해제</li>
            <li><strong>이메일:</strong> 수신한 이메일 하단의 '수신거부' 링크 클릭</li>
            <li><strong>SMS:</strong> 수신한 SMS에 '수신거부' 또는 '거부' 회신</li>
            <li><strong>고객센터:</strong> support@travleap.com으로 수신 거부 요청</li>
          </ol>

          <div style={{ backgroundColor: '#fff3cd', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
            <p style={{ lineHeight: '1.8', fontSize: '14px', margin: '0' }}>
              <strong>참고:</strong> 마케팅 정보 수신을 거부하시더라도 다음의 정보는 계속 발송됩니다:
            </p>
            <ul style={{ paddingLeft: '24px', lineHeight: '1.8', marginTop: '8px', marginBottom: '0' }}>
              <li>예약 확인, 결제 정보, 환불 안내 등 거래 관련 필수 정보</li>
              <li>서비스 이용약관, 개인정보처리방침 변경 안내 등 법적 의무 사항</li>
              <li>고객 문의에 대한 답변</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제6조 (야간 발송 제한)</h2>
          <p style={{ lineHeight: '1.8', marginBottom: '16px' }}>
            정보통신망법 제50조에 따라 오후 9시부터 다음 날 오전 8시까지는 마케팅 목적의 광고성 정보를 전송하지 않습니다.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제7조 (혜택)</h2>
          <div style={{ backgroundColor: '#f0f9ff', padding: '20px', borderRadius: '8px' }}>
            <p style={{ lineHeight: '1.8', marginBottom: '12px', fontWeight: 'bold' }}>마케팅 정보 수신에 동의하시면 다음의 혜택을 받으실 수 있습니다:</p>
            <ul style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
              <li>📧 신규 회원 전용 할인 쿠폰 (최대 10,000원)</li>
              <li>🎁 생일 축하 쿠폰 및 특별 혜택</li>
              <li>⚡ 타임딜 및 플래시 세일 사전 안내</li>
              <li>🎯 맞춤형 여행지 추천 및 특가 상품 알림</li>
              <li>💰 더블 포인트 적립 이벤트 우선 안내</li>
            </ul>
          </div>
        </section>

        <div style={{ marginTop: '60px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>본 동의서는 2025년 1월 1일부터 시행됩니다.</p>
          <p style={{ fontSize: '14px', color: '#666' }}>문의: support@travleap.com</p>
        </div>
      </div>
    </>
  );
}
