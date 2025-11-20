import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

export function RefundPolicyPage() {
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

        <h1 className="text-3xl font-bold text-gray-900 mb-2">트래블AP 취소·환불 정책</h1>
        <p className="text-gray-600 mb-8">시행일: 2025년 10월 28일</p>

        <Card>
          <CardContent className="p-8 space-y-8">
            {/* 제1조 목적 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">제1조 (목적)</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                본 정책은 「전자상거래 등에서의 소비자보호에 관한 법률」, 「소비자분쟁해결기준」, 「여객자동차운수사업법」 등 관련 법령과 표준약관에 따라
                트래블AP 플랫폼을 통해 제공되는 다음 카테고리 상품 및 서비스의 취소·변경·환불 기준을 정함을 목적으로 합니다.
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                <li>팝업 스토어 상품</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                ※ 개별 상품 상세페이지에 별도 취소·환불 정책이 기재된 경우, 해당 정책이 본 문서보다 우선 적용됩니다.
              </p>
            </section>

            {/* 제2조 청약철회 일반 원칙 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">제2조 (청약철회 및 예약취소의 일반 원칙)</h2>
              <div className="space-y-2 text-gray-700 leading-relaxed">
                <p>
                  트래블AP에서 제공되는 상품·서비스는 날짜·시간·좌석·재고·배정 등이 제한된 예약상품이므로,
                  「전자상거래법」상의 '단순 변심 7일 이내 청약철회'가 제한될 수 있습니다.
                </p>
                <p>
                  법령 또는 소비자분쟁해결기준에서 정한 별도 기준이 있는 경우 해당 기준이 우선하며,
                  상품 유형별 취소·환불 상세 기준은 제8조에 따릅니다.
                </p>
                <p>
                  취소·환불 신청은 <strong>마이페이지 &gt; 주문/예약 내역</strong>에서 가능합니다.
                </p>
              </div>
            </section>

            {/* 구분선 */}
            <div className="border-t-2 border-blue-600 pt-6">
              <h2 className="text-2xl font-bold text-blue-600 mb-6">카테고리별 취소·환불 정책</h2>
            </div>
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제8조 (팝업 스토어 상품 — 굿즈/배송상품 환불 기준)</h2>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
                <p><strong>1) 배송 전(출고 전):</strong> 전액 환불</p>
                <p><strong>2) 출고 후 ~ 배송완료 전:</strong> 실제 발생한 왕복 배송비 및 포장·반송 실비 공제 후 환불</p>
                <p><strong>3) 배송완료 후 7일 이내(미개봉):</strong> 고객 변심 반품 가능 (왕복 배송비 고객 부담)</p>
                <p><strong>4) 상품 하자·오배송:</strong> 판매자 부담으로 무료 교환 또는 환불</p>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">5) 청약철회가 불가한 경우</h3>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                <li>고객의 책임 있는 사유로 멸실·훼손된 경우</li>
                <li>사용 또는 일부 소비로 가치가 감소한 경우</li>
                <li>시간 경과로 재판매가 어려울 정도로 가치가 감소한 경우</li>
                <li>복제가 가능한 재화의 포장 훼손</li>
                <li>위생·맞춤제작 상품(사전 고지된 경우)</li>
                <li>디지털 콘텐츠 제공 개시 후</li>
              </ul>
            </section>

            {/* 구분선 */}
            <div className="border-t-2 border-blue-600 pt-6">
              <h2 className="text-2xl font-bold text-blue-600 mb-6">공통 규정 (모든 카테고리 적용)</h2>
            </div>

            {/* 제9조 환불 절차 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제9조 (환불 절차 및 방법)</h2>
              <div className="space-y-3 text-gray-700">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold mb-2">환불 절차</p>
                  <p className="text-sm">
                    <strong>1) 신청:</strong> 마이페이지 &gt; 주문/예약 내역에서 취소·환불 요청<br />
                    <strong>2) 심사:</strong> 접수 후 3영업일 이내 승인 여부 안내<br />
                    <strong>3) 처리:</strong> 승인 시 환불 진행
                  </p>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mt-4">처리 방식</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>카드/간편결제:</strong> 영업일 3~7일 내</li>
                  <li><strong>계좌이체:</strong> 3영업일 내</li>
                  <li><strong>포인트/크레딧:</strong> 즉시 복구</li>
                </ul>

                <h3 className="text-lg font-semibold text-gray-800 mt-4">환불 원칙</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>동일수단 원칙:</strong> 결제에 사용한 동일 수단으로 환불</li>
                  <li><strong>부분 환불:</strong> 운영사 위약금, 왕복 배송비, 제3자 취소 수수료 등 실제 발생 비용 차감 후 환불</li>
                </ul>
              </div>
            </section>

            {/* 제10조 지연배상금 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제10조 (환불 지연 시 지연배상금)</h2>
              <p className="text-gray-700 leading-relaxed">
                회사의 귀책으로 환불이 지연될 경우 관련 법령에 따라 <strong>연 15%</strong> 지연배상금을 지급합니다.<br />
                (단, 금융기관·PG·운영사 사유 등 회사 책임이 아닌 경우 제외)
              </p>
            </section>

            {/* 제11조 증빙 제출 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제11조 (증빙 제출 및 책임 제한)</h2>
              <p className="text-gray-700 mb-3">
                고객은 하자·오배송·서비스 미제공 등의 사유로 환불을 요구할 경우
                <strong>수령일 또는 이용일로부터 7일 이내</strong> 사진·영상·증빙자료를 제출해야 합니다.
              </p>
              <p className="text-gray-700 mb-2">아래 사유로 인한 지연·변경·취소는 회사 책임이 아닙니다.</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                <li>천재지변·자연재해·전쟁·대규모 통제</li>
                <li>교통/항공/선박 등의 결항</li>
                <li>고객 정보 오류</li>
                <li>제3자(PG·금융기관·운영사) 시스템 장애</li>
              </ul>
            </section>

            {/* 제12조 미성년자 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제12조 (미성년자 계약취소)</h2>
              <p className="text-gray-700 leading-relaxed">
                미성년자가 법정대리인의 동의 없이 체결한 구매·예약 계약은
                관련 법령에 따라 취소할 수 있습니다.
              </p>
            </section>

            {/* 제13조 분쟁 해결 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제13조 (분쟁 해결)</h2>
              <div className="space-y-2 text-gray-700">
                <p><strong>1)</strong> 고객센터를 통한 1차 상담 및 중재</p>
                <p><strong>2)</strong> 조정 불가 시</p>
                <ul className="list-disc list-inside ml-8 space-y-1">
                  <li>한국소비자원</li>
                  <li>전자거래분쟁조정위원회</li>
                  <li>여행분쟁조정위원회</li>
                  <li>등 외부 분쟁조정 신청 가능</li>
                </ul>
                <p><strong>3)</strong> 관할법원은 민사소송법에 따릅니다.</p>
              </div>
            </section>

            {/* 제14조 정책 변경 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제14조 (정책 변경)</h2>
              <p className="text-gray-700 leading-relaxed">
                본 정책은 법령 및 회사 운영정책에 따라 변경될 수 있으며,
                변경 시 최소 7일 전 공지합니다.<br />
                긴급한 법령 개정 시 즉시 적용될 수 있습니다.
              </p>
            </section>

            {/* 고객센터 */}
            <section className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">고객센터 안내</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">📞 전화 상담</p>
                    <p className="text-2xl font-bold text-blue-600">0504-0811-1330</p>
                    <p className="text-sm text-gray-600">평일 09:00 ~ 18:00 (주말·공휴일 휴무)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">📧 이메일 상담</p>
                    <p className="text-lg font-semibold text-blue-600">awesomeplan4606@naver.com</p>
                    <p className="text-sm text-gray-600">24시간 접수 (영업일 기준 24시간 내 답변)</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 회사 정보 */}
            <section className="text-sm text-gray-500 pt-6 border-t-2 border-gray-300">
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="font-bold text-gray-900 mb-2">㈜어썸플랜</p>
                <p>대표: 함은비</p>
                <p>사업자등록번호: 268-87-01436</p>
                <p>주소: 전라남도 목포시 원산중앙로44 2층</p>
                <p>통신판매업신고: 2020-전남목포-0368</p>
                <p className="mt-3 text-xs text-gray-600">
                  본 정책은 <strong>2025년 10월 28일</strong>부터 시행됩니다.
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
