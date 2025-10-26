/**
 * 이용약관 페이지
 * 전자상거래법 제13조에 따른 필수 고지사항
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="h-5 w-5" />
            뒤로가기
          </button>
          <h1 className="text-3xl font-bold text-gray-900">이용약관</h1>
          <p className="text-sm text-gray-500 mt-2">시행일자: 2024년 1월 1일</p>
        </div>

        <Card>
          <CardContent className="p-8 space-y-6">

            {/* 제1조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제1조 (목적)</h2>
              <p className="text-gray-700 leading-relaxed">
                본 약관은 어썸플랜(이하 "회사")이 운영하는 웹사이트 및 모바일 애플리케이션(이하 "플랫폼")에서 제공하는
                전자상거래 관련 서비스 및 기타 부가 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항,
                기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            {/* 제2조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제2조 (정의)</h2>
              <div className="space-y-2 text-gray-700">
                <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다:</p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  <li><strong>"플랫폼"</strong>이란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 또는 용역을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.</li>
                  <li><strong>"이용자"</strong>란 플랫폼에 접속하여 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li>
                  <li><strong>"회원"</strong>이란 플랫폼에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며, 플랫폼이 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
                  <li><strong>"비회원"</strong>이란 회원에 가입하지 않고 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
                  <li><strong>"판매자"</strong>란 플랫폼을 통해 상품 또는 서비스를 판매하는 사업자를 말합니다.</li>
                </ol>
              </div>
            </section>

            {/* 제3조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제3조 (약관의 명시와 개정)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사는 이 약관의 내용과 상호, 영업소 소재지, 대표자의 성명, 사업자등록번호, 연락처 등을 이용자가 알 수 있도록 플랫폼의 초기 화면에 게시합니다.</p>
                <p>② 회사는 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」, 「전자문서 및 전자거래기본법」, 「전자금융거래법」, 「전자서명법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」, 「소비자기본법」 등 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</p>
                <p>③ 회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 플랫폼의 초기화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다. 다만, 이용자에게 불리하게 약관내용을 변경하는 경우에는 최소한 30일 이상의 사전 유예기간을 두고 공지합니다.</p>
              </div>
            </section>

            {/* 제4조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제4조 (서비스의 제공 및 변경)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사는 다음과 같은 업무를 수행합니다:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>재화 또는 용역에 대한 정보 제공 및 구매계약의 체결</li>
                  <li>구매계약이 체결된 재화 또는 용역의 배송 중개</li>
                  <li>기타 회사가 정하는 업무</li>
                </ol>
                <p>② 회사는 재화 또는 용역의 품절 또는 기술적 사양의 변경 등의 경우에는 장차 체결되는 계약에 의해 제공할 재화 또는 용역의 내용을 변경할 수 있습니다.</p>
              </div>
            </section>

            {/* 제5조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제5조 (회원가입)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.</p>
                <p>② 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
                  <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                  <li>기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우</li>
                </ol>
              </div>
            </section>

            {/* 제6조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제6조 (회원 탈퇴 및 자격 상실)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회원은 회사에 언제든지 탈퇴를 요청할 수 있으며 회사는 즉시 회원탈퇴를 처리합니다.</p>
                <p>② 회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킨 후 소명 기회를 부여할 수 있으며, 이후에도 위반행위가 시정되지 않거나 재발할 경우 회원자격을 상실시킬 수 있습니다:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>가입 신청 시에 허위 내용을 등록한 경우</li>
                  <li>다른 사람의 플랫폼 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우</li>
                  <li>플랫폼을 이용하여 법령 또는 이 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우</li>
                </ol>
              </div>
            </section>

            {/* 제7조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제7조 (구매신청 및 개인정보 제공 동의 등)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 플랫폼 이용자는 다음 또는 이와 유사한 방법에 의하여 구매를 신청하며, 회사는 이용자가 구매신청을 함에 있어서 다음의 각 내용을 알기 쉽게 제공하여야 합니다:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>재화 또는 용역의 검색 및 선택</li>
                  <li>받는 사람의 성명, 주소, 전화번호, 전자우편주소 등의 입력</li>
                  <li>약관내용, 청약철회권이 제한되는 서비스, 배송료·설치비 등의 비용부담과 관련한 내용에 대한 확인</li>
                  <li>이 약관에 동의하고 위 3호의 사항을 확인하거나 거부하는 표시</li>
                  <li>재화 또는 용역의 구매신청 및 이에 관한 확인 또는 회사의 확인에 대한 동의</li>
                  <li>결제방법의 선택</li>
                </ol>
              </div>
            </section>

            {/* 제8조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제8조 (계약의 성립)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사는 제7조와 같은 구매신청에 대하여 다음 각 호에 해당하면 승낙하지 않을 수 있습니다:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>신청 내용에 허위, 기재누락, 오기가 있는 경우</li>
                  <li>미성년자가 담배, 주류 등 청소년보호법에서 금지하는 재화 및 용역을 구매하는 경우</li>
                  <li>기타 구매신청에 승낙하는 것이 회사 기술상 현저히 지장이 있다고 판단하는 경우</li>
                </ol>
                <p>② 회사의 승낙이 이용자에게 도달한 시점에 계약이 성립한 것으로 봅니다.</p>
              </div>
            </section>

            {/* 제9조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제9조 (지급방법)</h2>
              <div className="space-y-2 text-gray-700">
                <p>플랫폼에서 구매한 재화 또는 용역에 대한 대금지급방법은 다음 각 호의 방법 중 가용한 방법으로 할 수 있습니다:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>계좌이체</li>
                  <li>신용카드 결제</li>
                  <li>온라인무통장입금</li>
                  <li>전자화폐에 의한 결제</li>
                  <li>포인트에 의한 결제</li>
                  <li>기타 전자적 지급 방법에 의한 대금 지급 등</li>
                </ol>
              </div>
            </section>

            {/* 제10조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제10조 (청약철회 등)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사와 재화 또는 용역의 구매에 관한 계약을 체결한 이용자는 「전자상거래 등에서의 소비자보호에 관한 법률」 제13조 제2항에 따른 계약내용에 관한 서면을 받은 날(그 서면을 받은 때보다 재화 등의 공급이 늦게 이루어진 경우에는 재화 등을 공급받거나 재화 등의 공급이 시작된 날을 말합니다)부터 7일 이내에는 청약의 철회를 할 수 있습니다.</p>
                <p>② 이용자는 다음 각 호의 경우에는 회사의 의사에 반하여 제1항에 따른 청약철회 등을 할 수 없습니다:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>이용자에게 책임 있는 사유로 재화 등이 멸실 또는 훼손된 경우</li>
                  <li>이용자의 사용 또는 일부 소비에 의하여 재화 등의 가치가 현저히 감소한 경우</li>
                  <li>시간의 경과에 의하여 재판매가 곤란할 정도로 재화 등의 가치가 현저히 감소한 경우</li>
                  <li>같은 성능을 지닌 재화 등으로 복제가 가능한 경우 그 원본인 재화 등의 포장을 훼손한 경우</li>
                  <li>여행, 숙박, 렌트카 등 날짜가 정해진 용역의 경우 해당 시점이 지난 경우</li>
                </ol>
              </div>
            </section>

            {/* 제11조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제11조 (환급)</h2>
              <div className="space-y-2 text-gray-700">
                <p>회사는 이용자가 구매신청한 재화 또는 용역이 품절 등의 사유로 인도 또는 제공을 할 수 없을 때에는 지체 없이 그 사유를 이용자에게 통지하고 사전에 재화 등의 대금을 받은 경우에는 대금을 받은 날부터 3영업일 이내에 환급하거나 환급에 필요한 조치를 취합니다.</p>
              </div>
            </section>

            {/* 제12조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제12조 (개인정보보호)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사는 이용자의 개인정보 수집시 서비스제공을 위하여 필요한 범위에서 최소한의 개인정보를 수집합니다.</p>
                <p>② 회사는 개인정보의 수집·이용목적, 제3자 제공 관련 사항에 대해 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」에 따라 동의를 받습니다.</p>
                <p>③ 회사는 이용자의 개인정보를 제3자에게 제공할 필요가 있는 경우 1) 제3자의 신원, 2) 제3자의 개인정보 이용목적, 3) 제3자에게 제공되는 개인정보의 항목을 이용자에게 알리고 동의를 받습니다.</p>
              </div>
            </section>

            {/* 제13조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제13조 (회사의 의무)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사는 법령과 이 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며 이 약관이 정하는 바에 따라 지속적이고, 안정적으로 재화·용역을 제공하는데 최선을 다하여야 합니다.</p>
                <p>② 회사는 이용자가 안전하게 인터넷 서비스를 이용할 수 있도록 이용자의 개인정보(신용정보 포함)보호를 위한 보안 시스템을 갖추어야 합니다.</p>
              </div>
            </section>

            {/* 제14조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제14조 (이용자의 의무)</h2>
              <div className="space-y-2 text-gray-700">
                <p>이용자는 다음 행위를 하여서는 안 됩니다:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>신청 또는 변경 시 허위 내용의 등록</li>
                  <li>타인의 정보 도용</li>
                  <li>회사에 게시된 정보의 변경</li>
                  <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                  <li>회사 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                  <li>회사 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                  <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 플랫폼에 공개 또는 게시하는 행위</li>
                </ol>
              </div>
            </section>

            {/* 제15조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제15조 (면책조항)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</p>
                <p>② 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</p>
                <p>③ 회사는 판매자가 제공하는 재화 또는 용역의 내용, 품질, 배송 등에 관하여 책임을 지지 않습니다.</p>
              </div>
            </section>

            {/* 부칙 */}
            <section className="border-t pt-6 mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">부칙</h2>
              <p className="text-gray-700">
                본 약관은 2024년 1월 1일부터 적용됩니다.
              </p>
            </section>

            {/* 문의처 */}
            <section className="bg-purple-50 p-6 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">문의처</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p>상호: 어썸플랜</p>
                <p>대표: 함은비</p>
                <p>이메일: awesomeplan4606@naver.com</p>
                <p>전화: 0504-0811-1330</p>
                <p>주소: 전라남도 목포시 원산중앙로 44 2층 (58636)</p>
              </div>
            </section>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
