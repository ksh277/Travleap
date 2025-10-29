/**
 * 이용약관 페이지
 * 전자상거래법 제13조(표시·광고) 및 관련 법령 고지사항 반영
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
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
          <p className="text-sm text-gray-500 mt-2">시행일자: 2025년 10월 28일</p>
        </div>

        <Card>
          <CardContent className="p-8 space-y-6">
            {/* 제1조 목적 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제1조 (목적)</h2>
              <p className="text-gray-700 leading-relaxed">
                본 약관은 ㈜어썸플랜(이하 “회사”)이 운영하는 웹/모바일 서비스(이하 “플랫폼”)에서 제공하는
                전자상거래 관련 서비스(재화·용역의 정보 제공, 주문·결제, 배송/예약 중개 등) 이용과 관련하여
                회사와 이용자 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            {/* 제2조 정의 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제2조 (정의)</h2>
              <ol className="list-decimal list-inside space-y-2 ml-4 text-gray-700">
                <li><strong>“플랫폼”</strong>이란 재화 또는 용역의 거래를 위하여 회사가 제공하는 온라인 서비스 일체를 말합니다.</li>
                <li><strong>“이용자”</strong>란 회원 및 비회원을 말합니다.</li>
                <li><strong>“회원”</strong>이란 플랫폼에 가입하여 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
                <li><strong>“판매자”</strong>란 플랫폼을 통해 상품 또는 서비스를 판매하는 사업자를 말합니다.</li>
                <li><strong>“중개거래”</strong>란 회사가 통신판매중개자로서 거래 시스템만을 제공하고, 개별 상품의 계약 당사자는 판매자와 이용자인 거래를 말합니다.</li>
                <li><strong>“직접판매”</strong>란 회사가 통신판매업자로서 직접 판매하는 거래를 말합니다.</li>
              </ol>
            </section>

            {/* 제3조 약관의 명시와 개정 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제3조 (약관의 명시와 개정)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사는 본 약관, 상호, 영업소 소재지, 대표자, 사업자등록번호 및 연락처 등을 초기화면 또는 연결화면에 게시합니다.</p>
                <p>② 회사는 관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있습니다.</p>
                <p>③ 약관을 개정하는 경우 적용일자 및 개정사유를 명시하여 최소 <strong>7일 전</strong>부터 공지하며, 이용자에게 불리한 변경의 경우 최소 <strong>30일 전</strong> 공지합니다.</p>
                <p>④ 이용자가 개정 약관 시행일까지 거부의사를 표시하지 않으면 동의한 것으로 간주합니다.</p>
              </div>
            </section>

            {/* 제4조 서비스의 제공 및 변경(팝업 우선) */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제4조 (서비스의 제공 및 변경)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사는 다음 각 호의 업무를 제공합니다.</p>
                <ol className="list-decimal list-inside ml-4 space-y-1">
                  <li>팝업 스토어 카테고리 중심의 상품 정보 제공 및 구매계약 체결을 위한 시스템 제공</li>
                  <li>주문·결제 및 배송/교환/반품 처리 지원</li>
                  <li>기타 회사가 정하는 부가 서비스</li>
                </ol>
                <p>② 품절, 사양 변경, 시스템 개선 등의 사유로 제공 내용이 변경될 수 있으며, 이 경우 사전 또는 사후 고지합니다.</p>
              </div>
            </section>

            {/* 제5조 회사의 지위(중개/직접판매 구분) */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제5조 (회사의 지위)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사는 <strong>직접판매</strong>와 <strong>통신판매중개</strong>를 병행합니다.</p>
                <p>② <strong>중개거래</strong>의 경우, 개별 상품·서비스에 대한 계약의 당사자는 판매자와 이용자이며,
                  상품의 주문, 이행, 청약철회, 환불, A/S, 분쟁해결 등에 관한 1차적 책임은 판매자에게 있습니다.
                  회사는 거래 시스템 제공 및 분쟁 조정을 위한 합리적 범위 내에서 지원합니다.</p>
                <p>③ <strong>직접판매</strong>의 경우, 회사가 통신판매업자로서 관련 법령에 따라 책임을 부담합니다.</p>
              </div>
            </section>

            {/* 제6조 회원가입/탈퇴/자격 관리 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제6조 (회원가입, 탈퇴 및 자격 제한)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 가입은 회사가 정한 절차에 따른 동의 및 정보 입력으로 신청합니다.</p>
                <p>② 회사는 허위정보, 타인 명의 사용, 서비스 저해 우려 시 승낙을 거절하거나 사후에 자격을 제한·정지·상실시킬 수 있습니다(사전 통지 및 소명기회 부여).</p>
                <p>③ 회원은 언제든지 탈퇴를 요청할 수 있으며, 회사는 관련 법령에 따라 즉시 처리합니다.</p>
              </div>
            </section>

            {/* 제7조 구매절차 및 고지사항 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제7조 (구매신청 및 고지)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 이용자는 상품 선택, 수령인 정보 입력, 비용(배송비 등) 확인, 약관 동의, 결제수단 선택의 절차로 구매를 신청합니다.</p>
                <p>② 회사는 청약철회 제한 사유, 취소/환불 규정, 배송비 등의 중요사항을 명확히 고지합니다.</p>
              </div>
            </section>

            {/* 제8조 계약의 성립 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제8조 (계약의 성립)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 다음의 사유에 해당하는 경우 회사는 승낙하지 않을 수 있습니다: 허위·누락, 미성년자의 제한상품 구매, 기술상 현저한 지장 등.</p>
                <p>② 주문 완료 및 결제 승인(또는 회사의 승낙)이 이용자에게 도달한 때 계약이 성립합니다.</p>
              </div>
            </section>

            {/* 제9조 대금지급 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제9조 (대금지급)</h2>
              <p className="text-gray-700">
                대금 지급 수단은 신용카드, 간편결제, 계좌이체, 포인트 등 회사가 정한 전자적 지급수단을 사용할 수 있습니다.
              </p>
            </section>

            {/* 제10조 청약철회 및 반품(팝업 연동) */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제10조 (청약철회 등)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 이용자는 「전자상거래법」에 따라 상품 수령일로부터 <strong>7일 이내</strong> 청약철회할 수 있습니다. 단, 법령상 제한 사유가 있는 경우 제외됩니다.</p>
                <p>② 팝업 카테고리의 상세 취소/환불 기준(출고 전 전액 환불, 운송 중 실비 차감, 배송완료 후 7일 내 미개봉 반품 등)은
                  별도 <strong>취소/환불 정책</strong> 및 상품 상세 고지에 따릅니다.</p>
              </div>
            </section>

            {/* 제11조 환급/환불 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제11조 (환급 및 환불)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 품절 등 이행 불가 시 지체 없이 통지하며, 선결제 대금은 통지일로부터 <strong>3영업일 이내</strong> 환급 또는 필요한 조치를 취합니다.</p>
                <p>② 환불은 원칙적으로 결제에 사용된 동일 수단으로 처리되며, PG·카드사 정책에 따라 영업일 기준 <strong>3~5일(최대 7일)</strong> 내 표시됩니다.</p>
              </div>
            </section>

            {/* 제12조 개인정보 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제12조 (개인정보보호)</h2>
              <p className="text-gray-700">
                회사는 서비스 제공을 위한 최소한의 개인정보만을 수집·이용하며, 상세 내용은 별도의
                <span className="whitespace-nowrap"> </span>
                <a href="/privacy" className="text-blue-600 underline">개인정보처리방침</a>
                에 따릅니다. 제3자 제공·처리위탁 시 법령에 따른 고지·동의를 거칩니다.
              </p>
            </section>

            {/* 제13조 지적재산권 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제13조 (지적재산권)</h2>
              <p className="text-gray-700">
                플랫폼에 표시된 상표, 로고, 콘텐츠 등에 대한 권리는 회사 또는 정당한 권리자에게 있습니다.
                이용자는 해당 권리를 침해하는 행위를 해서는 안 됩니다.
              </p>
            </section>

            {/* 제14조 서비스 중단 및 면책 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제14조 (서비스 중단 및 면책)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 회사는 시스템 점검, 천재지변, 통신장애 등 불가피한 사유로 서비스 제공을 일시 중단할 수 있습니다.</p>
                <p>② 회사는 이용자의 귀책사유, 제3자의 전산장애, 불가항력 사유로 인한 손해에 대하여 책임을 지지 않습니다.</p>
                <p>③ <strong>중개거래</strong>의 경우, 상품의 내용·품질·배송 등은 판매자의 책임이며, 회사는 분쟁 조정을 위한 합리적 범위 내에서 지원합니다.</p>
              </div>
            </section>

            {/* 제15조 이용자 의무 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제15조 (이용자의 의무)</h2>
              <ol className="list-decimal list-inside ml-4 space-y-1 text-gray-700">
                <li>가입·주문 시 허위 정보 제공 금지</li>
                <li>타인 정보 도용 금지</li>
                <li>지적재산권 및 제3자 권리 침해 금지</li>
                <li>법령 및 약관, 공서양속에 반하는 행위 금지</li>
              </ol>
            </section>

            {/* 제16조 미성년자 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제16조 (미성년자 보호)</h2>
              <p className="text-gray-700">
                미성년자가 법정대리인의 동의 없이 체결한 계약은 관계 법령에 따라 취소할 수 있습니다.
              </p>
            </section>

            {/* 제17조 분쟁해결 및 관할 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제17조 (분쟁 해결 및 관할)</h2>
              <div className="space-y-2 text-gray-700">
                <p>① 분쟁 발생 시 고객센터 상담을 우선하며, 합의가 어려운 경우 한국소비자원, 전자거래분쟁조정위원회 등에 조정을 신청할 수 있습니다.</p>
                <p>② 소송이 제기되는 경우 관할은 민사소송법에 따릅니다.</p>
              </div>
            </section>

            {/* 부칙 */}
            <section className="border-t pt-6 mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">부칙</h2>
              <p className="text-gray-700">본 약관은 2025년 10월 28일부터 적용됩니다.</p>
            </section>

            {/* 사업자/문의 */}
            <section className="bg-purple-50 p-6 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-2">사업자 정보 및 문의</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p>상호: ㈜어썸플랜</p>
                <p>대표: 함은비</p>
                <p>사업자등록번호: 268-87-01436</p>
                <p>통신판매업신고: 2020-전남목포-0368</p>
                <p>주소: 전라남도 목포시 원산중앙로 44 2층 (58636)</p>
                <p>이메일: awesomeplan4606@naver.com</p>
                <p>전화: 0504-0811-1330</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
