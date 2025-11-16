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
                <li>여행</li>
                <li>렌트카</li>
                <li>숙박</li>
                <li>음식</li>
                <li>관광지</li>
                <li>팝업 스토어 상품</li>
                <li>행사</li>
                <li>체험</li>
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
                  상품 유형별 취소·환불 상세 기준은 제3조~제8조에 따릅니다.
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

            {/* 제3조 여행상품 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제3조 (여행상품 취소·환불 기준 — 국내 여행)</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">구분</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">취소 수수료</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">여행 개시 3일 전까지 취소</td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-green-700">전액 환불</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">여행 개시 2일 전 취소</td>
                      <td className="border border-gray-300 px-4 py-2">요금의 10% 공제</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">여행 개시 1일 전 취소</td>
                      <td className="border border-gray-300 px-4 py-2">요금의 20% 공제</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">여행 당일 취소 또는 No-show</td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-red-700">요금의 30% 공제</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                ※ 교통·숙박 등 제3자 비용이 발생한 경우, 실제 발생한 실비는 추가로 공제될 수 있습니다.<br />
                ※ 해외여행 상품은 별도 약관 적용.
              </p>
            </section>

            {/* 제4조 렌트카 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제4조 (렌트카 취소·환불 기준 — 렌터카 표준약관 적용)</h2>

              <h3 className="text-lg font-semibold text-gray-800 mb-3">1. 예약 취소</h3>
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">구분</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">취소 수수료</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">차량 인수 24시간 전까지 취소</td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-green-700">전액 환불</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">차량 인수 24시간 이내 취소</td>
                      <td className="border border-gray-300 px-4 py-2">요금의 10% 공제</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">인수 시간 경과 후 취소 또는 No-show</td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-red-700">요금의 20% 공제(또는 업체 규정에 따름)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">2. 대여 개시 후</h3>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                <li>고객 귀책 사유로 인한 중도 환불은 불가합니다.</li>
                <li>차량 하자 또는 업체 귀책으로 정상 이용이 불가능한 경우<br />
                  → 동급 차량 교체 또는 미이용 기간 비례 환불.
                </li>
              </ul>
            </section>

            {/* 제5조 숙박 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제5조 (숙박 취소·환불 기준 — 숙소 규정 우선)</h2>
              <p className="text-gray-700 mb-3">
                숙박 업종(호텔·리조트·펜션·게스트하우스 등)은 <strong>각 숙소의 취소 규정이 우선 적용</strong>됩니다.<br />
                별도 규정이 없는 경우 아래 기준을 준용합니다.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">구분</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">취소 수수료 (기본 기준)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">체크인 5일 전까지 취소</td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-green-700">전액 환불</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">체크인 4~3일 전 취소</td>
                      <td className="border border-gray-300 px-4 py-2">요금의 10% 공제</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">체크인 2~1일 전 취소</td>
                      <td className="border border-gray-300 px-4 py-2">요금의 20% 공제</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">체크인 당일 취소 또는 No-show</td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-red-700">요금의 30% 또는 숙소 규정에 따름</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                ※ 연휴·성수기·특가상품은 환불 불가 또는 별도 조건이 적용될 수 있습니다.
              </p>
            </section>

            {/* 제6조 음식 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제6조 (음식/식당 예약 및 바우처 환불 기준)</h2>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">1. 방문 예약형 (좌석 예약)</h3>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700 mb-4">
                <li><strong>이용일 1일 전까지 취소:</strong> 전액 환불</li>
                <li><strong>이용일 당일 취소 또는 No-show:</strong><br />
                  → 예약금 또는 상품금액의 10~30% 공제(업체 정책에 따름)
                </li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">2. 선불 바우처형 (식사권·쿠폰 등)</h3>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                <li><strong>유효기간 전 취소:</strong> 전액 환불</li>
                <li><strong>유효기간 내 미사용:</strong> 환불 불가 또는 일부 환불</li>
                <li><strong>사용 개시 후:</strong> 사용된 금액은 환불 불가</li>
              </ul>
            </section>

            {/* 제7조 관광지·행사·체험 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제7조 (관광지·행사·체험 상품 취소·환불 기준)</h2>
              <p className="text-gray-700 mb-3">
                관광지 입장권, 활동/체험, 이벤트, 원데이 클래스 등에 공통 적용됩니다.<br />
                다만 각 운영사의 정책이 존재할 경우 해당 약관이 우선합니다.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 text-sm">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">구분</th>
                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">취소 수수료</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">이용일 3일 전까지 취소</td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-green-700">전액 환불</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">이용일 2~1일 전 취소</td>
                      <td className="border border-gray-300 px-4 py-2">요금의 10% 공제</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">이용일 당일 취소 또는 No-show</td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold text-red-700">요금의 20~30% 공제 또는 환불 불가</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                ※ 공연·행사 등 좌석형 티켓의 경우, 발권 이후 취소 시 별도 수수료가 발생할 수 있습니다.
              </p>
            </section>

            {/* 제8조 팝업 스토어 */}
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
