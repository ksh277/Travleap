import React from 'react';
import Head from 'next/head';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>개인정보처리방침 - Travleap</title>
        <meta name="description" content="Travleap 개인정보처리방침" />
      </Head>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '40px', textAlign: 'center' }}>개인정보처리방침</h1>

        <section style={{ marginBottom: '40px' }}>
          <p style={{ lineHeight: '1.8', marginBottom: '16px', backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '8px' }}>
            Travleap(이하 "회사")는 정보통신망 이용촉진 및 정보보호 등에 관한 법률, 개인정보보호법 등 관련 법령상의 개인정보보호 규정을 준수하며, 관련 법령에 의거한 개인정보처리방침을 정하여 이용자 권익 보호에 최선을 다하고 있습니다.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제1조 (개인정보의 수집 및 이용목적)</h2>
          <p style={{ lineHeight: '1.8', marginBottom: '12px' }}>회사는 다음의 목적을 위하여 개인정보를 처리합니다:</p>

          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>1. 회원 가입 및 관리</h3>
          <ul style={{ paddingLeft: '24px', lineHeight: '1.8', marginBottom: '16px' }}>
            <li>회원 가입의사 확인, 회원자격 유지·관리, 본인확인, 부정이용 방지</li>
            <li>만 14세 미만 아동의 개인정보 처리 시 법정대리인 동의여부 확인</li>
            <li>각종 고지·통지, 고충처리</li>
          </ul>

          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>2. 재화 또는 서비스 제공</h3>
          <ul style={{ paddingLeft: '24px', lineHeight: '1.8', marginBottom: '16px' }}>
            <li>서비스 제공, 콘텐츠 제공, 맞춤 서비스 제공</li>
            <li>물품배송, 청구서 발송, 본인인증, 연령인증</li>
            <li>요금결제·정산, 채권추심</li>
          </ul>

          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>3. 고충처리</h3>
          <ul style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지</li>
            <li>처리결과 통보</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제2조 (수집하는 개인정보의 항목)</h2>

          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>1. 회원가입 시 수집 항목</h3>
          <ul style={{ paddingLeft: '24px', lineHeight: '1.8', marginBottom: '16px' }}>
            <li><strong>필수항목:</strong> 이메일, 비밀번호, 이름, 휴대전화번호</li>
            <li><strong>선택항목:</strong> 프로필 사진, 생년월일</li>
          </ul>

          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>2. 소셜 로그인 시 수집 항목</h3>
          <ul style={{ paddingLeft: '24px', lineHeight: '1.8', marginBottom: '16px' }}>
            <li><strong>구글:</strong> 이메일, 이름, 프로필 사진</li>
            <li><strong>카카오:</strong> 이메일, 닉네임, 프로필 사진</li>
            <li><strong>네이버:</strong> 이메일, 이름, 프로필 사진, 휴대전화번호</li>
          </ul>

          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>3. 서비스 이용 시 수집 항목</h3>
          <ul style={{ paddingLeft: '24px', lineHeight: '1.8', marginBottom: '16px' }}>
            <li><strong>예약/결제 시:</strong> 주문자 정보, 배송지 정보, 결제 정보</li>
            <li><strong>배송지 정보:</strong> 수령인 이름, 휴대전화번호, 주소, 우편번호</li>
            <li><strong>결제 정보:</strong> 신용카드 정보, 계좌 정보 (결제대행사를 통해 처리)</li>
          </ul>

          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>4. 자동 수집 항목</h3>
          <ul style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>IP 주소, 쿠키, 서비스 이용 기록, 접속 로그, 기기정보</li>
          </ul>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제3조 (개인정보의 보유 및 이용기간)</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>회원 탈퇴 시까지 보유하며, 탈퇴 시 지체없이 파기합니다.</li>
            <li>다만, 다음의 정보는 아래의 이유로 명시한 기간 동안 보존합니다:
              <ul style={{ paddingLeft: '20px', marginTop: '12px', marginBottom: '12px' }}>
                <li><strong>전자상거래법에 따른 보관</strong>
                  <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                    <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
                    <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
                    <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
                    <li>표시·광고에 관한 기록: 6개월</li>
                  </ul>
                </li>
                <li><strong>통신비밀보호법에 따른 보관</strong>
                  <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                    <li>웹사이트 방문 기록: 3개월</li>
                  </ul>
                </li>
              </ul>
            </li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제4조 (개인정보의 제3자 제공)</h2>
          <p style={{ lineHeight: '1.8', marginBottom: '16px' }}>
            회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다:
          </p>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            <li>서비스 제공에 따른 요금정산을 위하여 필요한 경우</li>
          </ol>

          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '20px', marginBottom: '12px' }}>제공받는 자 및 목적</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>제공받는 자</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>제공 목적</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>제공 항목</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>예약 파트너</td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>예약 확인 및 서비스 제공</td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>이름, 휴대전화번호, 예약 정보</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>택배사</td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>상품 배송</td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>수령인 이름, 휴대전화번호, 배송지 주소</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제5조 (개인정보처리의 위탁)</h2>
          <p style={{ lineHeight: '1.8', marginBottom: '16px' }}>
            회사는 서비스 향상을 위해서 아래와 같이 개인정보를 위탁하고 있으며, 관계 법령에 따라 위탁계약 시 개인정보가 안전하게 관리될 수 있도록 규정하고 있습니다.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>수탁업체</th>
                <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>위탁업무 내용</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>토스페이먼츠</td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>전자결제 대행</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>Vercel</td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>웹사이트 호스팅 및 운영</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>PlanetScale, Neon</td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>데이터베이스 관리</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제6조 (정보주체의 권리·의무 및 행사방법)</h2>
          <p style={{ lineHeight: '1.8', marginBottom: '16px' }}>이용자는 다음과 같은 권리를 행사할 수 있습니다:</p>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>개인정보 열람 요구</li>
            <li>개인정보 오류 정정 요구</li>
            <li>개인정보 삭제 요구</li>
            <li>개인정보 처리정지 요구</li>
          </ol>
          <p style={{ lineHeight: '1.8', marginTop: '16px' }}>
            위 권리 행사는 서비스 내 '마이페이지'에서 직접 하시거나, 개인정보보호책임자에게 서면, 전화, 이메일로 연락하시면 지체 없이 조치하겠습니다.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제7조 (개인정보의 파기)</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.</li>
            <li>파기 절차 및 방법:
              <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
                <li><strong>전자적 파일 형태:</strong> 복구 및 재생이 불가능한 방법으로 영구 삭제</li>
                <li><strong>종이 문서:</strong> 분쇄기로 분쇄하거나 소각</li>
              </ul>
            </li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제8조 (개인정보 보호책임자)</h2>
          <p style={{ lineHeight: '1.8', marginBottom: '16px' }}>
            회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>

          <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginTop: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>개인정보 보호책임자</h3>
            <ul style={{ lineHeight: '1.8', listStyle: 'none', paddingLeft: '0' }}>
              <li>이메일: privacy@travleap.com</li>
              <li>고객센터: support@travleap.com</li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제9조 (개인정보 처리방침의 변경)</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>이 개인정보 처리방침은 2025년 1월 1일부터 적용됩니다.</li>
            <li>이전의 개인정보 처리방침은 아래에서 확인할 수 있습니다.</li>
          </ol>
        </section>

        <div style={{ marginTop: '60px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>공고일자: 2025년 1월 1일</p>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>시행일자: 2025년 1월 1일</p>
          <p style={{ fontSize: '14px', color: '#666' }}>문의: privacy@travleap.com</p>
        </div>
      </div>
    </>
  );
}
