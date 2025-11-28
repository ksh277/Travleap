import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, AlertTriangle } from 'lucide-react';
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

        <h1 className="text-3xl font-bold text-gray-900 mb-2">트래블AP 통합 취소·환불 정책</h1>
        <p className="text-gray-600 mb-2">개별 업체 정책 우선 적용</p>
        <p className="text-gray-600 mb-8">시행일: 2025년 11월 28일</p>

        <Card>
          <CardContent className="p-8 space-y-8">
            {/* 제1조 목적 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">제1조 (목적)</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                본 정책은 「전자상거래 등에서의 소비자보호에 관한 법률」, 「소비자분쟁해결기준」, 「여객자동차운수사업법」 등 관련 법령 및 각 업종 표준약관을 반영하여, 트래블AP 플랫폼을 통해 제공되는 아래 상품·서비스의 취소·변경·환불 기준을 정함을 목적으로 합니다.
              </p>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">대상 카테고리</h3>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                <li>여행</li>
                <li>렌트카</li>
                <li>숙박</li>
                <li>음식(식당)</li>
                <li>관광지</li>
                <li>팝업스토어 굿즈/배송상품</li>
                <li>행사</li>
                <li>체험</li>
              </ul>

              {/* 중요 원칙 */}
              <div className="mt-6 bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-800 text-lg mb-2">※ 가장 중요한 원칙</p>
                    <p className="text-red-700">
                      각 상품 상세페이지나 업체(운영사/호텔/렌트카/판매자)가 별도의 취소·환불 정책을 명시한 경우,
                      해당 <strong>'업체 정책'</strong>이 본 정책보다 <strong>우선하여 적용</strong>됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 제2조 청약철회 일반 원칙 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">제2조 (청약철회 및 취소·환불의 기본 원칙)</h2>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>
                  트래블AP의 대부분 상품은 예약형·재고제한 상품이므로 「전자상거래법」상 단순 변심 7일 이내 청약철회는 제한될 수 있습니다.
                </p>
                <p className="font-semibold text-gray-900">
                  업체가 개별 취소 규정을 고지한 경우, 업체의 규정이 최우선입니다.
                </p>
                <p>
                  업체 규정이 없을 경우에만 아래 트래블AP 기본 기준이 적용됩니다.
                </p>
                <p>
                  취소·환불 신청은 <strong>마이페이지 &gt; 주문/예약내역</strong>에서 진행할 수 있습니다.
                </p>
              </div>
            </section>

            {/* 구분선 - 카테고리별 정책 */}
            <div className="border-t-2 border-blue-600 pt-6">
              <h2 className="text-2xl font-bold text-blue-600 mb-6">카테고리별 취소·환불 정책</h2>
            </div>

            {/* 제3조 여행상품 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제3조 (여행상품 — 기본 취소·환불 기준)</h2>
              <p className="text-sm text-orange-600 font-medium mb-3">※ 개별 여행사 약관이 있는 경우 여행사 약관 우선</p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 p-3 text-left">구분</th>
                      <th className="border border-gray-300 p-3 text-left">취소 수수료 (기본 기준)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3">여행 개시 3일 전까지</td>
                      <td className="border border-gray-300 p-3 text-green-600 font-medium">전액 환불</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3">여행 개시 2일 전</td>
                      <td className="border border-gray-300 p-3">요금의 10%</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3">여행 개시 1일 전</td>
                      <td className="border border-gray-300 p-3">요금의 20%</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3">여행 당일 또는 No-show</td>
                      <td className="border border-gray-300 p-3 text-red-600">요금의 30%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                ※ 항공권/숙박 등 제3자 비용이 포함된 경우 실제 실비가 추가 공제될 수 있습니다.<br />
                ※ 해외여행 상품은 별도 약관 적용.
              </p>
            </section>

            {/* 제4조 렌트카 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제4조 (렌트카 — 업체 정책 우선 / 표준약관 준용)</h2>
              <p className="text-sm text-orange-600 font-medium mb-3">※ 렌터카 업체별 규정이 우선 적용됨</p>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">기본 취소 기준(업체 고지 없을 경우)</h3>
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 p-3 text-left">구분</th>
                      <th className="border border-gray-300 p-3 text-left">취소 수수료</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3">인수 24시간 전까지</td>
                      <td className="border border-gray-300 p-3 text-green-600 font-medium">전액 환불</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3">인수 24시간 이내</td>
                      <td className="border border-gray-300 p-3">요금의 10%</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3">인수시간 이후 / No-show</td>
                      <td className="border border-gray-300 p-3 text-red-600">요금의 20% 또는 업체 규정</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">대여 진행 중</h3>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                <li>고객 사유 중도 환불 → <strong className="text-red-600">불가</strong></li>
                <li>차량 하자/업체 귀책 → 동급차 교환 또는 미이용기간 환불</li>
              </ul>
            </section>

            {/* 제5조 숙박 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제5조 (숙박 — 숙소 정책 우선 적용)</h2>
              <p className="text-sm text-orange-600 font-medium mb-3">※ 호텔/리조트/펜션 등은 각 숙소 정책이 최우선</p>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">숙소 규정이 없는 경우 트래블AP 기본 기준:</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 p-3 text-left">구분</th>
                      <th className="border border-gray-300 p-3 text-left">기본 취소 수수료</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3">체크인 5일 전까지</td>
                      <td className="border border-gray-300 p-3 text-green-600 font-medium">전액 환불</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3">체크인 4~3일 전</td>
                      <td className="border border-gray-300 p-3">10%</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3">체크인 2~1일 전</td>
                      <td className="border border-gray-300 p-3">20%</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3">체크인 당일/No-show</td>
                      <td className="border border-gray-300 p-3 text-red-600">30% 또는 숙소 규정</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                ※ 연휴·성수기·특가상품은 환불 불가 또는 별도 규정 적용 가능
              </p>
            </section>

            {/* 제6조 음식/식당 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제6조 (음식/식당 예약 및 식사 바우처)</h2>
              <p className="text-sm text-orange-600 font-medium mb-3">※ 식당별 정책이 있을 경우 식당 규정 우선</p>

              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">1) 좌석 예약형</h3>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                    <li>이용일 1일 전까지 취소 → <span className="text-green-600 font-medium">전액 환불</span></li>
                    <li>당일 취소/No-show → 10~30% 공제</li>
                  </ul>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">2) 선불 바우처형</h3>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                    <li>유효기간 전 취소 → <span className="text-green-600 font-medium">전액 환불</span></li>
                    <li>기간 내 미사용 → 환불 불가 또는 일부 환불</li>
                    <li>사용 후 취소 → <span className="text-red-600">불가</span></li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제7조 관광지·체험·행사·클래스 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제7조 (관광지·체험·행사·클래스)</h2>
              <p className="text-sm text-orange-600 font-medium mb-3">※ 운영사의 정책이 있으면 해당 규정 우선</p>

              <h3 className="text-lg font-semibold text-gray-800 mb-2">기본 기준:</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 p-3 text-left">구분</th>
                      <th className="border border-gray-300 p-3 text-left">취소 수수료</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-3">이용일 3일 전까지</td>
                      <td className="border border-gray-300 p-3 text-green-600 font-medium">전액 환불</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-3">이용일 2~1일 전</td>
                      <td className="border border-gray-300 p-3">10%</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-3">이용일 당일</td>
                      <td className="border border-gray-300 p-3 text-red-600">20~30% 또는 환불 불가</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                ※ 좌석형 공연/행사는 발권 후 별도 수수료 발생 가능
              </p>
            </section>

            {/* 제8조 팝업스토어 굿즈 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제8조 (팝업 스토어 굿즈 및 배송상품 환불 기준)</h2>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
                <p><strong>1) 배송 전:</strong> <span className="text-green-600 font-medium">전액 환불</span></p>
                <p><strong>2) 배송 진행 중:</strong> 왕복 배송비 + 반송 실비 공제 후 환불</p>
                <p><strong>3) 배송완료 후 7일 이내(미개봉):</strong> 고객 변심 가능, 왕복 배송비 부담</p>
                <p><strong>4) 하자/오배송:</strong> 판매자 부담으로 교환/환불</p>
              </div>

              <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">5) 청약철회 불가 항목</h3>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                <li>사용/훼손</li>
                <li>시간 경과</li>
                <li>포장 훼손</li>
                <li>위생 제품</li>
                <li>맞춤 제작</li>
                <li>디지털 콘텐츠 제공 후</li>
              </ul>
            </section>

            {/* 구분선 - 공통 규정 */}
            <div className="border-t-2 border-blue-600 pt-6">
              <h2 className="text-2xl font-bold text-blue-600 mb-6">공통 규정 (모든 카테고리 적용)</h2>
            </div>

            {/* 제9조 환불 절차 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제9조 (환불 절차 및 처리)</h2>
              <div className="space-y-4 text-gray-700">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold mb-2">1) 절차</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>고객 신청</li>
                    <li>검토 (3영업일 이내)</li>
                    <li>승인 후 환불 진행</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold mb-2">2) 처리 기간</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li><strong>카드/간편결제:</strong> 3~7영업일</li>
                    <li><strong>계좌:</strong> 3영업일</li>
                    <li><strong>포인트:</strong> 즉시</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold mb-2">3) 원칙</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>동일수단 환불</li>
                    <li>실제 발생 비용(위약금/배송비/수수료) 차감 가능</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제10조 지연배상금 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제10조 (환불 지연 배상)</h2>
              <p className="text-gray-700 leading-relaxed">
                회사 귀책으로 환불 지연 시 <strong className="text-red-600">연 15%</strong> 지연 배상금 지급<br />
                (단 PG/금융사/운영사 사유는 제외)
              </p>
            </section>

            {/* 제11조 증빙 제출 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제11조 (증빙 제출 및 책임 제한)</h2>
              <p className="text-gray-700 mb-3">
                고객은 <strong>이용일/수령일 기준 7일 이내</strong> 증빙 제출해야 함.
              </p>
              <p className="text-gray-700 mb-2">회사는 아래 사유에 대해 책임지지 않음:</p>
              <ul className="list-disc list-inside ml-4 space-y-1 text-gray-700">
                <li>천재지변, 자연재해</li>
                <li>항공/선박 결항</li>
                <li>고객 정보 오입력</li>
                <li>운영사·PG 장애 등</li>
              </ul>
            </section>

            {/* 제12조 미성년자 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제12조 (미성년자 계약취소)</h2>
              <p className="text-gray-700 leading-relaxed">
                법정대리인 동의 없는 계약은 취소 요청 가능.
              </p>
            </section>

            {/* 제13조 분쟁 해결 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제13조 (분쟁해결)</h2>
              <div className="space-y-2 text-gray-700">
                <p><strong>1)</strong> 고객센터 상담</p>
                <p><strong>2)</strong> 조정 불가 시 외부 분쟁기관</p>
                <ul className="list-disc list-inside ml-8 space-y-1">
                  <li>한국소비자원</li>
                  <li>전자거래분쟁조정위원회</li>
                  <li>여행분쟁조정위원회</li>
                </ul>
                <p><strong>3)</strong> 관할법원은 민사소송법에 따름</p>
              </div>
            </section>

            {/* 제14조 정책 변경 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제14조 (정책 변경)</h2>
              <p className="text-gray-700 leading-relaxed">
                법령 변경 및 운영 정책에 따라 조정될 수 있으며,<br />
                변경 시 최소 7일 전 공지합니다.
              </p>
            </section>

            {/* 고객센터 */}
            <section className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">고객센터 안내</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">전화</p>
                    <p className="text-2xl font-bold text-blue-600">0504-0811-1330</p>
                    <p className="text-sm text-gray-600">영업시간: 평일 09:00~18:00</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">이메일</p>
                    <p className="text-lg font-semibold text-blue-600">awesomeplan4606@naver.com</p>
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
                  본 정책은 <strong>2025년 11월 28일</strong>부터 시행됩니다.
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
