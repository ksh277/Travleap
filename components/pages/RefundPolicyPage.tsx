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

        <h1 className="text-3xl font-bold text-gray-900 mb-2">취소/환불 정책</h1>
        <p className="text-gray-600 mb-8">시행일: 2025년 10월 28일</p>

        <Card>
          <CardContent className="p-8 space-y-6">
            {/* 제1조 목적 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제1조 (목적)</h2>
              <p className="text-gray-700 leading-relaxed">
                본 정책은 전자상거래 등에서의 소비자보호에 관한 법률, 약관의 규제에 관한 법률,
                전자문서 및 전자거래기본법, 전자금융거래법, 소비자기본법 등 관련 법령에 따라
                어썸플랜 서비스의 상품 구매 취소 및 환불 절차를 규정함을 목적으로 합니다.
              </p>
            </section>

            {/* 제2조 청약철회권 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제2조 (청약철회권)</h2>
              <div className="space-y-3 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1. 일반 원칙</strong><br />
                  회원은 상품을 배송받은 날로부터 7일 이내에 청약철회를 할 수 있습니다.
                  다만, 청약철회에 관하여 「전자상거래 등에서의 소비자보호에 관한 법률」에
                  달리 정함이 있는 경우에는 동 법 규정에 따릅니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2. 청약철회 불가 사항</strong><br />
                  다음 각 호의 경우에는 청약철회가 제한됩니다:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>회원의 책임 있는 사유로 재화 등이 멸실되거나 훼손된 경우</li>
                  <li>회원의 사용 또는 일부 소비로 재화의 가치가 현저히 감소한 경우</li>
                  <li>시간의 경과로 재판매가 곤란할 정도로 가치가 현저히 감소한 경우</li>
                  <li>복제가 가능한 재화 등의 포장을 훼손한 경우</li>
                  <li>맞춤제작 상품(이니셜·사이즈 맞춤 등)으로서 사전에 해당 사실을 고지한 경우</li>
                  <li>위생·소모성 상품을 개봉한 경우(사전 고지 시)</li>
                  <li>용역 또는 「문화산업진흥기본법」 제2조제5호의 디지털콘텐츠 제공이 개시된 경우</li>
                </ul>
              </div>
            </section>

            {/* 제3조 카테고리별 정책 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제3조 (카테고리별 취소/환불 정책)</h2>

              <div className="space-y-4">
                {/* 일반 상품 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">1. 일반 상품</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li><strong>• 배송 전:</strong> 무료 취소 가능</li>
                    <li><strong>• 출고 후~배송완료 전:</strong> 판매자에게 실제 발생한 <strong>왕복 배송비 및 포장/반송 실비</strong>를 차감 후 환불됩니다(택배사 정산 내역 등 객관적 증빙 기준).</li>
                    <li><strong>• 배송 완료 후 7일 이내:</strong> 상품 미개봉 시 반품 가능 (왕복 배송비 고객 부담)</li>
                    <li><strong>• 상품 하자:</strong> 무료 교환 또는 환불 (배송비 판매자 부담)</li>
                    <li><strong>• 오배송:</strong> 무료 교환 또는 환불 (배송비 판매자 부담)</li>
                  </ul>
                </div>

                {/* 팝업 스토어 */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">2. 팝업 스토어 상품</h3>
                  <p className="text-sm text-gray-700 mb-2">
                    팝업 스토어 상품은 개별 상품의 특성에 따라 취소/환불 정책이 다를 수 있습니다.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li><strong>• 배송 전:</strong> 무료 취소 가능 (별도 정책이 없는 경우)</li>
                    <li><strong>• 출고 후~배송완료 전:</strong> 왕복 배송비 및 포장/반송 실비 차감 후 환불</li>
                    <li><strong>• 배송 후:</strong> 상품 페이지의 개별 취소/환불 정책 참조</li>
                    <li><strong>• 한정판/특별 상품:</strong> 취소/환불 불가할 수 있음 (사전 고지)</li>
                    <li><strong>• 상품 하자:</strong> 무료 교환 또는 환불 (배송비 판매자 부담)</li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-2">
                    ※ 개별 상품 상세페이지에 별도의 취소·환불 정책이 표시된 경우, 해당 정책이 본 문서보다 우선 적용됩니다.
                  </p>
                </div>

                {/* 여행 */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">3. 여행 상품</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li><strong>• 출발 7일 전:</strong> 전액 환불 (수수료 없음)</li>
                    <li><strong>• 출발 3-7일 전:</strong> 50% 환불 (수수료 50%)</li>
                    <li><strong>• 출발 3일 이내:</strong> 환불 불가</li>
                    <li><strong>• 여행 시작 후:</strong> 환불 불가 (단, 회사의 귀책사유로 여행이 취소된 경우 전액 환불)</li>
                    <li><strong>• 천재지변 등 불가항력:</strong> 약관 및 관련 법령에 따라 처리</li>
                  </ul>
                </div>

                {/* 숙박 */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 mb-2">4. 숙박 상품</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li><strong>• 체크인 7일 전:</strong> 전액 환불 (수수료 없음)</li>
                    <li><strong>• 체크인 3-7일 전:</strong> 50% 환불 (수수료 50%)</li>
                    <li><strong>• 체크인 3일 이내:</strong> 환불 불가</li>
                    <li><strong>• 노쇼 (No-show):</strong> 환불 불가</li>
                    <li><strong>• 시설 하자:</strong> 전액 환불 또는 대체 숙소 제공</li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-2">
                    * 개별 숙박 업체의 정책이 우선 적용될 수 있으며, 성수기/비수기에 따라 취소 수수료가 달라질 수 있습니다.
                  </p>
                </div>

                {/* 렌트카 */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">5. 렌트카 상품</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li><strong>• 픽업 7일 전:</strong> 전액 환불 (수수료 없음)</li>
                    <li><strong>• 픽업 3-7일 전:</strong> 50% 환불 (수수료 50%)</li>
                    <li><strong>• 픽업 3일 이내:</strong> 환불 불가</li>
                    <li><strong>• 노쇼 (No-show):</strong> 환불 불가</li>
                    <li><strong>• 차량 하자:</strong> 전액 환불 또는 대체 차량 제공</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제4조 환불 절차/방법 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제4조 (환불 절차 및 방법)</h2>
              <div className="space-y-3 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1. 환불 신청</strong><br />
                  회원은 마이페이지 &gt; 주문/예약 내역에서 환불을 신청할 수 있습니다.
                  환불 사유를 명확히 기재하고 필요시 증빙 자료를 첨부해야 합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2. 환불 승인</strong><br />
                  회사는 환불 신청을 접수한 날로부터 3영업일 이내에 환불 가능 여부를 심사하고
                  그 결과를 회원에게 통지합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>3. 환불 처리</strong><br />
                  환불이 승인된 경우, 회사는 다음의 기간 내에 환불을 처리합니다:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>신용카드/간편결제: 카드사·PG사 정책에 따라 영업일 기준 3~5일(최대 7일) 내 표시</li>
                  <li>계좌이체: 승인 후 3영업일 이내</li>
                  <li>포인트: 승인 즉시 복구</li>
                </ul>
                <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                  <li><strong>동일 수단 원칙:</strong> 환불은 원칙적으로 결제에 사용한 동일 결제수단으로 처리됩니다.</li>
                  <li><strong>포인트/쿠폰:</strong> 승인 취소 시 사용 포인트는 복구되며, 유효기간이 경과한 쿠폰은 재발급되지 않습니다.</li>
                </ul>
                <p className="leading-relaxed">
                  <strong>4. 부분 환불</strong><br />
                  취소 수수료가 발생하는 경우, 결제 금액에서 해당 수수료를 차감한 금액이 환불됩니다.
                  환불 금액 계산 내역은 회원에게 사전 통지됩니다.
                </p>
              </div>
            </section>

            {/* 제5조 반품 배송비 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제5조 (반품 배송비)</h2>
              <div className="space-y-2 text-gray-700">
                <p className="leading-relaxed"><strong>1. 고객 변심:</strong> 왕복 배송비(통상 6,000원) 고객 부담</p>
                <p className="leading-relaxed"><strong>2. 상품 하자/오배송:</strong> 배송비 전액 판매자 부담</p>
                <p className="leading-relaxed"><strong>3. 수취거부·주소 오기재·장기 부재로 인한 반송:</strong> 왕복 배송비 고객 부담</p>
                <p className="leading-relaxed"><strong>4. 교환 시:</strong> 추가 배송비 발생 (편도 3,000원, 도서산간/제주 추가 운임 적용)</p>
                <p className="leading-relaxed text-sm">
                  * 도서산간 지역은 택배사 고지 요금 기준으로 추가 배송비가 발생할 수 있습니다.
                </p>
              </div>
            </section>

            {/* 제6조 지연배상금 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제6조 (환불 지연 시 지연배상금)</h2>
              <p className="text-gray-700 leading-relaxed">
                「전자상거래 등에서의 소비자보호에 관한 법률」 및 표준약관에 따라 회사는 환불이 지연되는 경우
                지연기간에 대하여 연 15%의 지연배상금을 지급합니다. 다만, 회사의 귀책사유가 없는 경우에는 그러하지 아니합니다.
              </p>
            </section>

            {/* 제7조 면책 + 증빙 안내 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제7조 (면책 사항)</h2>
              <div className="space-y-2 text-gray-700">
                <p className="leading-relaxed">회사는 다음의 경우 책임을 지지 않습니다:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>천재지변, 전쟁, 파업 등 불가항력적인 사유로 인한 취소/환불 지연</li>
                  <li>회원이 제공한 정보의 오류로 인한 환불 지연</li>
                  <li>금융기관의 전산 장애 등 제3자의 귀책사유로 인한 환불 지연</li>
                  <li>파트너 업체의 폐업/도산 등으로 인한 서비스 불이행 (이 경우 회사는 대체 서비스 제공 또는 환불을 위해 최선을 다합니다)</li>
                </ul>
                <p className="text-sm text-gray-600">
                  하자 또는 오배송 주장 시에는 수령일로부터 7일 이내에 외관·내용물 확인 사진/영상 등 증빙 자료를 제출해 주세요.
                </p>
              </div>
            </section>

            {/* (선택) 미성년자 조항 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제8조 (미성년자 계약취소)</h2>
              <p className="text-gray-700 leading-relaxed">
                미성년자가 법정대리인의 동의 없이 체결한 구매계약은 「민법」 등 관계 법령에 따라 취소할 수 있습니다.
              </p>
            </section>

            {/* 제9조 분쟁 해결 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제9조 (분쟁 해결)</h2>
              <div className="space-y-2 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1. 소비자 상담</strong><br />
                  취소/환불 관련 분쟁이 발생한 경우, 회원은 먼저 고객센터를 통해 상담을 신청할 수 있습니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2. 제3자 중재</strong><br />
                  회사와 회원 간 합의가 이루어지지 않는 경우, 공정거래위원회, 한국소비자원,
                  전자거래분쟁조정위원회 등에 분쟁조정을 신청할 수 있습니다.
                </p>
                <p className="leading-relaxed">
                  <strong>3. 관할 법원</strong><br />
                  본 정책과 관련한 소송은 민사소송법에 따른 관할 법원에 제기합니다.
                </p>
              </div>
            </section>

            {/* 제10조 정책 변경 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제10조 (정책 변경)</h2>
              <p className="text-gray-700 leading-relaxed">
                본 정책은 관련 법령 및 회사 정책에 따라 변경될 수 있으며,
                변경 시 최소 7일 전에 공지사항을 통해 고지합니다.
                다만, 법령 개정 등으로 긴급하게 변경할 필요가 있는 경우에는 즉시 고지할 수 있습니다.
              </p>
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
                    <p className="text-sm text-gray-600">평일 09:00 - 18:00 (주말 및 공휴일 휴무)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">이메일 상담</p>
                    <p className="text-blue-600">awesomeplan4606@naver.com</p>
                    <p className="text-sm text-gray-600">24시간 접수 가능 (영업일 기준 24시간 내 답변)</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 회사정보 & 우선적용 안내 */}
            <section className="text-sm text-gray-500 pt-4 border-t border-gray-200">
              <p>본 취소/환불 정책은 2025년 10월 28일부터 시행됩니다.</p>
              <p className="mt-2">
                ㈜어썸플랜<br />
                대표: 함은비 | 사업자등록번호: 268-87-01436<br />
                주소: 전라남도 목포시 원산중앙로44 2층<br />
                통신판매업신고: 2020-전남목포-0368
              </p>
              <p className="mt-2 text-xs text-gray-600">
                ※ 개별 상품 상세페이지에 별도의 취소·환불 정책이 표시된 경우, 해당 정책이 본 문서보다 우선 적용됩니다.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
