import React from 'react';
import Head from 'next/head';

export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>이용약관 - Travleap</title>
        <meta name="description" content="Travleap 이용약관" />
      </Head>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '40px', textAlign: 'center' }}>이용약관</h1>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제1조 (목적)</h2>
          <p style={{ lineHeight: '1.8', marginBottom: '16px' }}>
            본 약관은 Travleap(이하 "회사")이 제공하는 여행 상품 및 서비스(이하 "서비스")를 이용함에 있어 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제2조 (정의)</h2>
          <p style={{ lineHeight: '1.8', marginBottom: '8px' }}>본 약관에서 사용하는 용어의 정의는 다음과 같습니다:</p>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>"서비스"란 회사가 제공하는 여행 상품 예약, 팝업스토어 상품 판매, 숙박, 렌트카, 투어, 음식점, 체험 등 모든 서비스를 말합니다.</li>
            <li>"회원"이란 본 약관에 동의하고 회사와 이용계약을 체결한 자를 말합니다.</li>
            <li>"파트너"란 회사와 제휴하여 상품 및 서비스를 제공하는 사업자를 말합니다.</li>
            <li>"포인트"란 서비스 이용 시 적립되는 가상의 화폐 단위를 말합니다.</li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제3조 (약관의 효력 및 변경)</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
            <li>회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경된 약관은 제1항과 같은 방법으로 공지합니다.</li>
            <li>회원은 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제4조 (회원가입)</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>회원가입은 이용자가 본 약관에 동의하고 회사가 정한 절차에 따라 가입신청을 하며, 회사가 이를 승낙함으로써 성립됩니다.</li>
            <li>회사는 다음 각 호에 해당하는 경우 회원가입을 거부하거나 사후에 이용계약을 해지할 수 있습니다:
              <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li>만 14세 미만인 경우</li>
                <li>타인의 명의를 도용한 경우</li>
                <li>허위 정보를 기재한 경우</li>
                <li>사회의 안녕과 질서 또는 미풍양속을 저해할 목적으로 신청한 경우</li>
              </ul>
            </li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제5조 (서비스의 제공 및 변경)</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>회사가 제공하는 서비스는 다음과 같습니다:
              <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li>팝업스토어 상품 판매</li>
                <li>숙박 시설 예약</li>
                <li>렌트카 예약</li>
                <li>투어 및 체험 프로그램 예약</li>
                <li>음식점 예약</li>
                <li>포인트 적립 및 사용</li>
                <li>기타 회사가 추가 개발하거나 제휴계약 등을 통해 제공하는 서비스</li>
              </ul>
            </li>
            <li>회사는 서비스의 내용을 변경할 수 있으며, 이 경우 사전에 공지합니다.</li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제6조 (예약 및 결제)</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>회원은 서비스를 통해 상품 및 서비스를 예약하고 결제할 수 있습니다.</li>
            <li>회사는 다음 각 호의 결제 수단을 제공합니다: 신용카드, 체크카드, 계좌이체, 간편결제(카카오페이, 네이버페이 등)</li>
            <li>결제 완료 후 예약이 확정되며, 파트너가 예약을 승인해야 최종 확정됩니다.</li>
            <li>회원은 결제 시 포인트를 사용할 수 있으며, 포인트 사용 시 해당 금액만큼 결제 금액이 차감됩니다.</li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제7조 (취소 및 환불)</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>회원은 예약 후 환불 정책에 따라 취소 및 환불을 요청할 수 있습니다.</li>
            <li>환불 정책은 상품 및 서비스 종류에 따라 다르며, 예약 시 명시된 정책이 적용됩니다.</li>
            <li>팝업스토어 상품의 경우 다음과 같은 환불 정책이 적용됩니다:
              <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li>배송 전: 전액 환불</li>
                <li>배송 중 또는 배송 완료: 배송비 및 반품비(3,000원) 차감 후 환불</li>
                <li>상품 하자 또는 오배송: 전액 환불 (배송비 포함)</li>
              </ul>
            </li>
            <li>예약 서비스(숙박, 렌트카 등)의 경우 예약일 기준으로 취소 수수료가 부과될 수 있습니다.</li>
            <li>환불 시 적립된 포인트는 회수되며, 사용한 포인트는 반환됩니다.</li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제8조 (포인트)</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>회원은 결제 금액의 2%를 포인트로 적립받습니다 (배송비 제외).</li>
            <li>적립된 포인트는 다음 결제 시 사용할 수 있습니다.</li>
            <li>포인트의 유효기간은 적립일로부터 1년입니다.</li>
            <li>환불 시 적립된 포인트는 회수되며, 이미 사용한 경우 회수되지 않습니다.</li>
            <li>부정한 방법으로 포인트를 획득한 경우 회사는 해당 포인트를 회수하고 이용계약을 해지할 수 있습니다.</li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제9조 (회원의 의무)</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>회원은 다음 행위를 하여서는 안 됩니다:
              <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
                <li>타인의 정보 도용</li>
                <li>회사가 게시한 정보의 변경</li>
                <li>회사가 정한 정보 이외의 정보 등의 송신 또는 게시</li>
                <li>회사 및 제3자의 저작권 등 지적재산권에 대한 침해</li>
                <li>회사 및 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                <li>외설 또는 폭력적인 메시지, 화상, 음성 등을 공개 또는 게시하는 행위</li>
              </ul>
            </li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제10조 (회사의 의무)</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>회사는 관련 법령과 본 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 지속적이고 안정적으로 서비스를 제공하기 위해 최선을 다합니다.</li>
            <li>회사는 회원의 개인정보를 보호하기 위해 개인정보처리방침을 수립하고 준수합니다.</li>
            <li>회사는 서비스 이용과 관련하여 회원으로부터 제기된 의견이나 불만이 정당하다고 인정되는 경우 이를 처리합니다.</li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제11조 (면책)</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
            <li>회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.</li>
            <li>회사는 파트너가 제공하는 상품 및 서비스의 품질에 대해 직접적인 책임을 지지 않으며, 파트너와 회원 간의 분쟁에 대해 중재 역할만 수행합니다.</li>
          </ol>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', borderBottom: '2px solid #333', paddingBottom: '8px' }}>제12조 (분쟁 해결)</h2>
          <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>회사와 회원 간에 발생한 분쟁에 관한 소송은 민사소송법상의 관할법원에 제소합니다.</li>
            <li>회사와 회원 간에 제기된 소송에는 대한민국 법을 적용합니다.</li>
          </ol>
        </section>

        <div style={{ marginTop: '60px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>본 약관은 2025년 1월 1일부터 시행됩니다.</p>
          <p style={{ fontSize: '14px', color: '#666' }}>문의: support@travleap.com</p>
        </div>
      </div>
    </>
  );
}
