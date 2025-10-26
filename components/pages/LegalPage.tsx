import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Shield } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

export function LegalPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">전자금융거래 이용약관</h1>
        <p className="text-gray-600 mb-8">시행일: 2024년 1월 1일</p>

        <Card>
          <CardContent className="p-8 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제1조 (목적)</h2>
              <p className="text-gray-700 leading-relaxed">
                본 약관은 ㈜어썸플랜(이하 "회사")이 제공하는 전자금융거래 서비스를 이용함에 있어
                회사와 이용자의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                본 약관은 「전자금융거래법」 및 동법 시행령, 「여신전문금융업법」 등 관련 법령에 따라
                작성되었습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제2조 (용어의 정의)</h2>
              <div className="space-y-2 text-gray-700">
                <p className="leading-relaxed">
                  본 약관에서 사용하는 용어의 정의는 다음과 같습니다:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>전자금융거래:</strong> 회사가 전자적 장치를 통하여 제공하는 금융상품 및 서비스를 이용자가 전자적 장치를 통하여 비대면·자동화된 방식으로 직접 이용하는 거래</li>
                  <li><strong>이용자:</strong> 회사와 전자금융거래 이용 계약을 체결하고 회사가 제공하는 전자금융거래 서비스를 이용하는 자</li>
                  <li><strong>접근매체:</strong> 전자금융거래에 있어서 거래지시를 하거나 이용자 및 거래내용의 진실성과 정확성을 확보하기 위하여 사용되는 수단 또는 정보 (이용자번호, 비밀번호, OTP, 공인인증서 등)</li>
                  <li><strong>거래지시:</strong> 이용자가 전자금융거래 계약에 따라 회사에 대하여 전자금융거래의 처리를 지시하는 것</li>
                  <li><strong>오류:</strong> 전자금융거래에 있어 이용자의 거래지시가 회사의 전산시스템에 정확하게 반영되지 않았거나 회사의 전산시스템이 거래지시에 따라 정확하게 처리하지 못한 경우</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제3조 (약관의 명시 및 변경)</h2>
              <div className="space-y-3 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1.</strong> 회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기화면에 게시합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2.</strong> 회사는 관련 법령에 위배되지 않는 범위 내에서 본 약관을 변경할 수 있으며,
                  변경된 약관은 서비스 화면에 공지하고, 공지 후 7일이 경과한 시점부터 효력이 발생합니다.
                  다만, 이용자의 권리 또는 의무에 중요한 변경이 있는 경우 최소 30일 전에 공지합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>3.</strong> 이용자가 변경된 약관에 동의하지 않는 경우, 서비스 이용을 중단하고
                  이용계약을 해지할 수 있습니다. 변경된 약관의 효력 발생일 이후 서비스를 계속 이용하는 경우
                  약관 변경에 동의한 것으로 간주합니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제4조 (전자금융거래 서비스의 종류)</h2>
              <div className="space-y-2 text-gray-700">
                <p className="leading-relaxed">
                  회사가 제공하는 전자금융거래 서비스는 다음과 같습니다:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>상품 및 서비스 구매에 대한 전자지급결제대행 서비스</li>
                  <li>신용카드, 체크카드, 계좌이체, 가상계좌 등을 이용한 결제 서비스</li>
                  <li>간편결제(토스페이, 카카오페이 등) 서비스</li>
                  <li>포인트 적립 및 사용 서비스</li>
                  <li>구매안전(에스크로) 서비스</li>
                  <li>기타 회사가 정하는 전자금융거래 서비스</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제5조 (이용시간)</h2>
              <div className="space-y-2 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1.</strong> 전자금융거래 서비스의 이용시간은 연중무휴 1일 24시간을 원칙으로 합니다.
                  다만, 정기 점검 및 시스템 업그레이드 등 불가피한 사유가 있는 경우 서비스 이용을
                  일시적으로 중단할 수 있습니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2.</strong> 회사는 서비스 중단이 예상되는 경우 사전에 이용자에게 통지합니다.
                  다만, 시스템 장애 복구 등 긴급한 경우에는 사후에 통지할 수 있습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제6조 (접근매체의 관리 및 책임)</h2>
              <div className="space-y-3 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1. 회사의 책임</strong><br />
                  회사는 접근매체의 발급 주체가 아니며, 다만 전자금융거래의 안전성과 신뢰성을 확보할 수 있도록
                  전자금융거래 시스템을 구축·운영하고 관리할 책임이 있습니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2. 이용자의 책임</strong><br />
                  이용자는 접근매체를 제3자에게 대여하거나 사용을 위임하거나 양도 또는 담보 목적으로 제공할 수 없습니다.
                  이용자는 자신의 접근매체를 제3자에게 누설 또는 노출하거나 방치하여서는 안 되며,
                  접근매체의 도용이나 위조 또는 변조를 방지하기 위하여 충분한 주의를 기울여야 합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>3. 분실·도난 신고</strong><br />
                  이용자는 접근매체의 분실·도난·위조·변조·훼손 또는 제3자 사용을 알게 된 경우,
                  지체 없이 회사에 그 사실을 통지하여야 합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>4. 손해배상 책임</strong><br />
                  이용자가 접근매체를 제3자에게 대여하거나 사용을 위임하거나 양도 또는 담보 목적으로 제공한 경우,
                  또는 이용자의 고의 또는 중대한 과실로 인하여 제3자가 이용자의 접근매체를 이용하여 전자금융거래를
                  할 수 있었음이 명백한 경우 회사는 그로 인한 손해를 배상할 책임이 없습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제7조 (거래내역의 확인)</h2>
              <div className="space-y-2 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1.</strong> 회사는 이용자가 전자금융거래의 내용을 추적·검색하거나 그 내용에 오류가 있는지를
                  확인할 수 있는 기록을 생성하여 보존합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2.</strong> 이용자는 마이페이지 &gt; 주문/예약 내역에서 자신의 거래내역을 확인할 수 있습니다.
                </p>
                <p className="leading-relaxed">
                  <strong>3.</strong> 회사는 이용자의 거래내역을 전자적 장치를 통하여 즉시 제공하거나,
                  이용자의 요청이 있는 경우 2주 이내에 모사전송, 전자우편 또는 서면 등의 방법으로 제공합니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제8조 (오류의 정정 등)</h2>
              <div className="space-y-3 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1. 오류의 통지</strong><br />
                  이용자는 전자금융거래에 오류가 있음을 알게 된 때에는 즉시 회사에 그 정정을 요구할 수 있습니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2. 오류의 조사 및 처리</strong><br />
                  회사는 오류의 정정요구를 받은 때에는 이를 즉시 조사하여 처리한 후 정정요구를 받은 날부터
                  2주 이내에 그 결과를 이용자에게 알려 드립니다.
                </p>
                <p className="leading-relaxed">
                  <strong>3. 잠정조치</strong><br />
                  회사는 오류의 원인규명이 곤란한 경우 완료될 때까지 이용자의 요청에 따라
                  해당 금액을 잠정적으로 복원시킬 수 있습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제9조 (전자금융거래 기록의 생성 및 보존)</h2>
              <div className="space-y-2 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1.</strong> 회사는 이용자가 전자금융거래의 내용을 추적·검색하거나 그 내용에 오류가 있는지
                  확인할 수 있는 기록을 생성하여 5년간 보존합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2.</strong> 제1항의 규정에 의하여 생성·보존하는 기록은 전자문서 형태로 보존하며,
                  이용자가 열람을 요청하는 경우 지체 없이 이를 제공하거나 열람하게 합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>3.</strong> 전자금융거래 기록에는 다음 각 호의 사항이 포함됩니다:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>거래일시 및 거래금액</li>
                  <li>전자지급수단의 종류 및 내역</li>
                  <li>거래상대방을 나타내는 정보 (판매자 정보)</li>
                  <li>전자적 장치의 종류 및 접속 기록</li>
                  <li>이용자가 전자금융거래와 관련하여 회사에 요청한 사항과 그에 대한 처리결과</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제10조 (전자지급거래계약의 효력)</h2>
              <div className="space-y-2 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1.</strong> 회사는 이용자의 거래지시가 전자적 장치를 통하여 수신된 것으로 확인된 경우
                  이용자의 진정한 의사에 의한 것으로 간주합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2.</strong> 회사는 거래지시의 수신 후 그 내용을 확인할 수 있는 방법으로 이용자에게 통지합니다.
                  이용자는 통지된 거래내용이 거래지시 내용과 일치하는지 여부를 즉시 확인하여야 합니다.
                </p>
              </div>
            </section>

            <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                제11조 (결제대행서비스 - 토스페이먼츠)
              </h2>
              <div className="space-y-3 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1. 서비스 제공자</strong><br />
                  회사는 전자지급결제대행 서비스를 제공하기 위하여 (주)토스페이먼츠(이하 "PG사")와
                  전자지급결제대행 계약을 체결하고 있습니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2. 결제 처리</strong><br />
                  이용자가 신용카드, 체크카드, 계좌이체, 가상계좌 등을 이용하여 결제하는 경우,
                  PG사의 전자지급결제대행 시스템을 통하여 처리됩니다.
                </p>
                <p className="leading-relaxed">
                  <strong>3. 개인정보 제공</strong><br />
                  결제 처리를 위하여 필요한 최소한의 개인정보(이름, 전화번호, 이메일, 결제정보 등)가
                  PG사에 제공됩니다. PG사의 개인정보 처리에 관한 사항은 PG사의 개인정보처리방침을 따릅니다.
                </p>
                <p className="leading-relaxed">
                  <strong>4. 책임의 범위</strong><br />
                  회사는 PG사가 제공하는 전자지급결제대행 서비스의 장애나 오류로 인하여 발생하는 손해에 대하여
                  회사의 고의 또는 과실이 없는 한 책임을 지지 않습니다.
                </p>
                <p className="text-sm bg-white p-3 rounded border border-blue-300 mt-3">
                  <strong>PG사 정보</strong><br />
                  상호: (주)토스페이먼츠<br />
                  대표: 이승건<br />
                  사업자등록번호: 731-88-01352<br />
                  통신판매업 신고번호: 2021-서울강남-01233<br />
                  주소: 서울특별시 강남구 테헤란로 133, 18층(역삼동, 한국타이어빌딩)<br />
                  고객센터: 1544-7772
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제12조 (거래지시의 철회 제한)</h2>
              <div className="space-y-2 text-gray-700">
                <p className="leading-relaxed">
                  이용자는 전자지급거래에 관한 거래지시의 경우 지급의 효력이 발생하기 전까지 거래지시를 철회할 수 있습니다.
                  다만, 다음 각 호의 경우에는 거래지시를 철회할 수 없습니다:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>이용자가 전자상거래 등에서 재화 등의 구매에 관한 의사표시를 한 경우</li>
                  <li>기타 전자금융거래의 특성상 철회가 불가능한 경우</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제13조 (전자금융거래정보의 제공금지)</h2>
              <p className="text-gray-700 leading-relaxed">
                회사는 전자금융거래 서비스를 제공함에 있어서 취득한 이용자의 인적사항,
                이용자의 계좌·접근매체 및 전자금융거래의 내용과 실적에 관한 정보 또는 자료를
                이용자의 동의를 얻지 아니하고 제3자에게 제공·누설하거나 업무상 목적 외에 사용하지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제14조 (분쟁처리 및 분쟁조정)</h2>
              <div className="space-y-3 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1. 분쟁처리 책임자</strong><br />
                  회사는 전자금융거래와 관련한 분쟁처리 및 이용자의 불만처리를 위하여
                  다음과 같이 분쟁처리 책임자를 지정하고 있습니다:
                </p>
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <p className="font-semibold">분쟁처리 책임자</p>
                  <p className="mt-1">소속: 고객지원팀</p>
                  <p>직책: 팀장</p>
                  <p>연락처: 0504-0811-1330</p>
                  <p>이메일: dispute@awesomeplan.co.kr</p>
                </div>
                <p className="leading-relaxed">
                  <strong>2. 금융감독원 전자금융거래 분쟁조정</strong><br />
                  이용자는 전자금융거래와 관련하여 분쟁이 있는 경우 금융감독원의
                  금융분쟁조정위원회(국번없이 1332, www.fcsc.kr)에 분쟁조정을 신청할 수 있습니다.
                </p>
                <p className="leading-relaxed">
                  <strong>3. 소비자보호기관</strong><br />
                  그 밖에 전자금융거래 분쟁의 조정을 위하여 다음의 기관을 이용할 수 있습니다:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>금융감독원 금융소비자보호센터: 국번없이 1332 (www.fss.or.kr)</li>
                  <li>한국소비자원 전자거래분쟁조정위원회: 국번없이 1372 (www.ccn.go.kr)</li>
                  <li>경찰청 사이버안전국: 국번없이 182 (ecrm.cyber.go.kr)</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제15조 (회사의 안전성 확보 의무)</h2>
              <div className="space-y-2 text-gray-700">
                <p className="leading-relaxed">
                  회사는 전자금융거래의 안전성과 신뢰성을 확보할 수 있도록 다음 각 호의 조치를 취합니다:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>전자금융거래 정보의 위조·변조 방지를 위한 보안 시스템 구축</li>
                  <li>전자금융거래의 안전성 확보를 위한 보안 프로그램 설치 및 갱신</li>
                  <li>해킹 등 전자적 침해행위 방지를 위한 보안시스템 구축</li>
                  <li>전자금융거래 정보의 암호화 처리</li>
                  <li>접근매체의 위조·변조 방지 조치</li>
                  <li>그 밖에 전자금융거래의 안전성과 신뢰성 확보를 위한 기술적·물리적 대책 마련</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제16조 (약관 외 준칙 및 관할)</h2>
              <div className="space-y-2 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1.</strong> 본 약관에서 정하지 아니한 사항에 대하여는 전자금융거래법,
                  전자상거래 등에서의 소비자보호에 관한 법률, 여신전문금융업법 등 관련 법령 및
                  회사의 이용약관에 따릅니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2.</strong> 본 약관과 관련한 소송의 관할은 민사소송법에 따릅니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">부칙</h2>
              <p className="text-gray-700 leading-relaxed">
                본 약관은 2024년 1월 1일부터 시행됩니다.
              </p>
            </section>

            <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">고객센터 안내</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">전화 상담</p>
                    <p className="text-lg font-bold text-blue-600">0504-0811-1330</p>
                    <p className="text-sm text-gray-600">평일 09:00 - 18:00 (주말 및 공휴일 휴무)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">이메일 상담</p>
                    <p className="text-blue-600">support@awesomeplan.co.kr</p>
                    <p className="text-sm text-gray-600">전자금융거래 분쟁: dispute@awesomeplan.co.kr</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="text-sm text-gray-500 pt-4 border-t border-gray-200">
              <p>본 약관은 2024년 1월 1일부터 시행됩니다.</p>
              <p className="mt-2">
                ㈜어썸플랜<br />
                대표: 홍길동 | 사업자등록번호: 123-45-67890<br />
                주소: 전라남도 신안군 안좌면 예술길 10<br />
                통신판매업신고: 2024-전남신안-0001<br />
                개인정보보호책임자: 김철수 (privacy@awesomeplan.co.kr)
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
