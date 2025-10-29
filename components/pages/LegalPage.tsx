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
        <p className="text-gray-600 mb-8">시행일: 2025년 10월 28일</p>

        <Card>
          <CardContent className="p-8 space-y-6">
            {/* 제1조 목적 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제1조 (목적)</h2>
              <p className="text-gray-700 leading-relaxed">
                본 약관은 ㈜어썸플랜(이하 “회사”)이 제공하는 전자금융거래 서비스를 이용함에 있어
                회사와 이용자의 권리·의무 및 책임, 이용절차 등 필요한 사항을 정함을 목적으로 합니다.
                본 약관은 「전자금융거래법」, 「여신전문금융업법」, 「전자상거래 등에서의 소비자보호에 관한 법률」 등
                관련 법령을 준수합니다.
              </p>
            </section>

            {/* 제2조 정의 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제2조 (정의)</h2>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                <li><strong>전자금융거래</strong>: 전자적 장치를 통하여 금융서비스를 비대면·자동화 방식으로 이용하는 거래</li>
                <li><strong>전자적 장치</strong>: PC, 모바일 단말, 서버, 네트워크 등을 포함한 정보처리 시스템</li>
                <li><strong>이용자</strong>: 회사와 전자금융거래 이용계약을 체결하고 서비스를 이용하는 자</li>
                <li><strong>접근매체</strong>: 이용자 식별·거래지시에 사용되는 수단(아이디, 비밀번호, OTP, 인증토큰 등)</li>
                <li><strong>거래지시</strong>: 전자금융거래의 처리를 요구하는 의사표시</li>
                <li><strong>오류</strong>: 거래지시가 정확히 반영되지 않거나 그 처리에 착오가 발생한 경우</li>
              </ul>
            </section>

            {/* 제3조 약관의 명시·변경 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제3조 (약관의 명시 및 변경)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사는 본 약관을 서비스 초기화면 등에 게시하여 이용자가 알 수 있도록 합니다.</p>
                <p>② 회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경내용·사유·적용일을
                  적용일 <strong>7일 전</strong>부터 공지합니다. 이용자에게 불리한 변경은 최소 <strong>30일 전</strong> 공지합니다.</p>
                <p>③ 이용자가 변경 적용일 이후 서비스를 계속 이용하는 경우 변경 약관에 동의한 것으로 봅니다.</p>
              </div>
            </section>

            {/* 제4조 서비스의 종류 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제4조 (전자금융거래 서비스의 종류)</h2>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                <li>전자지급결제대행(PG) 서비스</li>
                <li>신용/체크카드, 계좌이체, 가상계좌 등 지급결제 서비스</li>
                <li>간편결제(토스페이 등) 연동 서비스</li>
                <li>주문·취소·환불 처리 및 거래내역 제공 서비스</li>
                <li>에스크로(구매안전) 등 관련 부가 서비스</li>
              </ul>
            </section>

            {/* 제5조 이용시간 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제5조 (이용시간)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 서비스 이용시간은 연중무휴 24시간을 원칙으로 합니다.</p>
                <p>② 정기점검, 천재지변, PG사·금융기관 사정 등으로 서비스가 일시 중단될 수 있으며,
                  회사는 사전 또는 사후 지체 없이 공지합니다.</p>
              </div>
            </section>

            {/* 제6조 접근매체의 관리 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제6조 (접근매체의 관리 및 책임)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 이용자는 접근매체를 제3자에게 대여·양도·담보 제공하거나 누설·방치해서는 안 됩니다.</p>
                <p>② 접근매체의 분실·도난·위조·변조 사실을 알게 된 때에는 지체 없이 회사에 통지하여야 합니다.</p>
                <p>③ 이용자의 고의 또는 중대한 과실로 인한 손해는 관련 법령이 정하는 범위 내에서 이용자가 부담합니다.</p>
              </div>
            </section>

            {/* 제7조 거래내역 확인 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제7조 (거래내역의 확인)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사는 이용자가 전자금융거래 내역을 추적·검색할 수 있도록 기록을 생성·보존합니다.</p>
                <p>② 이용자는 마이페이지 &gt; 주문/예약 내역 등에서 거래내역을 확인할 수 있습니다.</p>
                <p>③ 이용자가 서면, 전자문서 등으로 거래내역 제공을 요청하면 회사는 <strong>2주 이내</strong> 제공합니다.</p>
              </div>
            </section>

            {/* 제8조 오류의 정정 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제8조 (오류의 정정 등)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 이용자는 거래에 오류가 있음을 안 때 회사에 정정을 요구할 수 있습니다.</p>
                <p>② 회사는 정정 요구를 받은 날부터 지체 없이 조사·처리하고, <strong>2주 이내</strong> 결과를 통지합니다.</p>
                <p>③ 과오납 등이 확인되면 회사 또는 PG사는 지체 없이 해당 금액을 환급하거나 환급에 필요한 조치를 합니다.</p>
              </div>
            </section>

            {/* 제9조 기록의 생성·보존 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제9조 (전자금융거래 기록의 생성 및 보존)</h2>
              <p className="text-gray-700">회사는 관련 법령에 따라 거래 관련 주요 기록을 <strong>5년</strong>간(표시·광고는 6개월) 보존합니다.</p>
            </section>

            {/* 제10조 거래지시 효력/철회 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제10조 (거래지시의 효력 및 철회)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사가 전자적 장치로 거래지시를 수신한 때 그 효력이 발생합니다.</p>
                <p>② 이용자는 지급의 효력이 발생하기 전까지 거래지시를 철회할 수 있습니다. 다만, 재화·용역의 제공이 개시되었거나
                  거래 특성상 철회가 불가능한 경우에는 관련 법령 및 개별 약관에 따릅니다.</p>
              </div>
            </section>

            {/* 제11조 PG사(토스) */}
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                제11조 (전자지급결제대행 서비스)
              </h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사는 전자지급결제대행을 위하여 <strong>토스페이먼츠㈜</strong>(PG사)와 계약을 체결하고 있으며,
                  카드/계좌이체/가상계좌/간편결제는 PG사 시스템을 통해 처리됩니다.</p>
                <p>② 결제 처리에 필요한 최소정보(성명, 연락처, 결제 식별정보 등)가 PG사에 제공됩니다.
                  PG사의 개인정보 처리에 관한 사항은 PG사 정책을 따릅니다.</p>
                <p className="text-sm bg-white p-3 rounded border border-blue-300 mt-2">
                  PG 고객센터: 1544-7772 / 업무: 결제 승인·취소·환불 정산 및 오류 처리
                </p>
              </div>
            </section>

            {/* 제12조 수수료·환불·과오금 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제12조 (수수료, 환불 및 과오금)</h2>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                <li>결제 수수료 등 비용부담은 별도 고지된 바에 따릅니다.</li>
                <li>주문 취소·환불은 플랫폼의 취소/환불 정책 및 관계 법령에 따릅니다.</li>
                <li>과오납이 발생한 경우 회사 또는 PG사는 지체 없이 환급하거나 환급에 필요한 조치를 합니다.</li>
              </ul>
            </section>

            {/* 제13조 정보 제공 금지 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제13조 (전자금융거래정보의 제공 금지)</h2>
              <p className="text-gray-700">
                회사는 전자금융거래 수행 중 알게 된 이용자의 인적사항, 계좌·접근매체 정보, 거래내역 등을
                이용자의 동의 없이 제3자에게 제공·누설하거나 목적 외로 사용하지 않습니다(법령상 요구 제외).
              </p>
            </section>

            {/* 제14조 분쟁처리/조정 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제14조 (분쟁처리 및 분쟁조정)</h2>
              <div className="space-y-3 text-gray-700">
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <p className="font-semibold">분쟁처리 책임자</p>
                  <p className="mt-1">소속: 고객지원팀 / 직책: 팀장</p>
                  <p>연락처: 0504-0811-1330</p>
                  <p>이메일: dispute@awesomeplan.co.kr</p>
                </div>
                <p>이용자는 금융감독원(1332), 한국소비자원(1372) 등 기관을 통해 분쟁조정을 신청할 수 있습니다.</p>
              </div>
            </section>

            {/* 제15조 안전성 확보 의무 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제15조 (회사의 안전성 확보 의무)</h2>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                <li>전송구간 암호화(HTTPS), 저장암호화(중요정보), 접근통제·권한관리</li>
                <li>침입차단·모니터링, 악성코드 방지, 정기 보안점검 및 로그 감사</li>
                <li>접근매체 위·변조 방지 및 이상거래 감지</li>
              </ul>
            </section>

            {/* 제16조 준칙·관할 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제16조 (약관 외 준칙 및 관할)</h2>
              <p className="text-gray-700">
                본 약관에서 정하지 아니한 사항은 관련 법령 및 회사의 이용약관·개인정보처리방침을 따르며,
                분쟁의 관할은 민사소송법에 따릅니다.
              </p>
            </section>

            {/* 부칙 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">부칙</h2>
              <p className="text-gray-700">본 약관은 2025년 10월 28일부터 시행합니다.</p>
            </section>

            {/* 고객센터 */}
            <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">고객센터 안내</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">전화 상담</p>
                    <p className="text-lg font-bold text-blue-600">0504-0811-1330</p>
                    <p className="text-sm text-gray-600">평일 09:00 - 18:00 (주말/공휴일 휴무)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">이메일 상담</p>
                    <p className="text-blue-600">support@awesomeplan.co.kr</p>
                    <p className="text-sm text-gray-600">전자금융 분쟁: dispute@awesomeplan.co.kr</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 회사 정보 */}
            <section className="text-sm text-gray-500 pt-4 border-t border-gray-200">
              <p>㈜어썸플랜</p>
              <p className="mt-2">
                대표: 함은비 | 사업자등록번호: 268-87-01436<br />
                주소: 전라남도 목포시 원산중앙로 44, 2층 (58636)<br />
                통신판매업신고: 2020-전남목포-0368<br />
                개인정보보호책임자: 함은비 (awesomeplan4606@naver.com)
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
