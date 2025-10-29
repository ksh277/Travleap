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

        <h1 className="text-3xl font-bold text-gray-900 mb-2">취소/환불 정책 (팝업 스토어 상품 전용)</h1>
        <p className="text-gray-600 mb-8">시행일: 2025년 10월 28일</p>

        <Card>
          <CardContent className="p-8 space-y-6">
            {/* 제1조 목적 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제1조 (목적)</h2>
              <p className="text-gray-700 leading-relaxed">
                본 정책은 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령에 따라
                ㈜어썸플랜이 판매하는 <strong>팝업 스토어 카테고리 상품</strong>의 취소 및 환불 기준을 정함을 목적으로 합니다.
              </p>
            </section>

            {/* 제2조 청약철회권 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제2조 (청약철회권)</h2>
              <div className="space-y-3 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1. 일반 원칙</strong><br />
                  상품을 <strong>배송받은 날로부터 7일 이내</strong> 청약철회가 가능합니다. 법령에 달리 정함이 있는 경우 해당 규정이 우선합니다.
                </p>
                <p className="leading-relaxed">
                  <strong>2. 청약철회 불가</strong><br />
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>고객의 책임 있는 사유로 재화가 멸실·훼손된 경우</li>
                  <li>사용·일부 소비로 가치가 현저히 감소한 경우</li>
                  <li>시간 경과로 재판매가 곤란할 정도로 가치가 감소한 경우</li>
                  <li>복제가 가능한 재화의 포장을 훼손한 경우</li>
                  <li>맞춤제작·위생상품으로 사전 고지한 경우</li>
                  <li>디지털콘텐츠 제공이 개시된 경우</li>
                </ul>
              </div>
            </section>

            {/* 제3조 팝업 스토어 환불 규정 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제3조 (팝업 스토어 상품 취소/환불)</h2>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li><strong>• 배송 전(출고 전):</strong> 전액 환불</li>
                  <li>
                    <strong>• 출고 후 ~ 배송완료 전(운송 중):</strong>{' '}
                    실제 발생한 <strong>왕복 배송비</strong> 및 <strong>포장·반송 실비</strong>를 차감 후 환불
                    <span className="text-xs text-gray-600"> (택배사 정산내역 등 객관적 증빙 기준)</span>
                  </li>
                  <li><strong>• 배송완료 후 7일 이내(미개봉):</strong> 고객 변심 반품 가능(왕복 배송비 고객 부담)</li>
                  <li><strong>• 상품 하자·오배송:</strong> 무료 교환 또는 환불(배송비 판매자 부담)</li>
                  <li><strong>• 한정판·특별 상품:</strong> 상품 상세에 사전 고지된 경우 취소/환불이 제한될 수 있음</li>
                </ul>
                <p className="text-xs text-gray-600 mt-2">
                  ※ 개별 상품 상세페이지의 별도 정책이 본 문서보다 우선 적용됩니다.
                </p>
              </div>
            </section>

            {/* 제4조 환불 절차/방법 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제4조 (환불 절차 및 방법)</h2>
              <div className="space-y-3 text-gray-700">
                <p className="leading-relaxed">
                  <strong>1) 신청:</strong> 마이페이지 &gt; 주문 내역에서 환불 신청(사유·증빙 첨부) →
                  <strong> 2) 심사:</strong> 접수 후 <strong>3영업일 이내</strong> 승인 여부 통지 →
                  <strong> 3) 처리:</strong> 승인 시 즉시 진행
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>신용카드/간편결제: PG·카드사 정책에 따라 영업일 <strong>3~5일(최대 7일)</strong> 내 표시</li>
                  <li>계좌이체: 승인 후 <strong>3영업일 이내</strong></li>
                  <li>포인트: 승인 즉시 복구</li>
                </ul>
                <ul className="list-disc list-inside ml-4 space-y-1 mt-1">
                  <li><strong>동일수단 원칙:</strong> 원칙적으로 결제에 사용한 동일 결제수단으로 환불</li>
                  <li><strong>부분 환불:</strong> 발생 수수료·왕복 배송비·반송 실비 차감 후 환불(사전 고지)</li>
                </ul>
              </div>
            </section>

            {/* 제5조 반품 배송비 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제5조 (반품 배송비)</h2>
              <div className="space-y-2 text-gray-700">
                <p><strong>1) 고객 변심:</strong> 왕복 배송비 고객 부담(통상 6,000원, 도서산간·제주 추가)</p>
                <p><strong>2) 하자·오배송:</strong> 배송비 전액 판매자 부담</p>
                <p><strong>3) 수취거부·주소 오기재·장기 부재로 반송:</strong> 왕복 배송비 고객 부담</p>
              </div>
            </section>

            {/* 제6조 지연배상금 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제6조 (환불 지연 시 지연배상금)</h2>
              <p className="text-gray-700 leading-relaxed">
                회사 귀책으로 환불이 지연되는 경우, 관련 법령 및 표준약관에 따라
                지연기간에 대해 <strong>연 15%</strong>의 지연배상금을 지급합니다.
                (회사 귀책이 없는 경우 제외)
              </p>
            </section>

            {/* 제7조 면책 & 증빙 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제7조 (면책 및 증빙)</h2>
              <div className="space-y-2 text-gray-700">
                <p>다음의 경우 회사는 책임을 지지 않습니다.</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>천재지변·전쟁·파업 등 불가항력으로 인한 지연</li>
                  <li>회원이 제공한 정보 오류로 인한 지연</li>
                  <li>금융기관·PG사의 전산 장애 등 제3자 귀책</li>
                </ul>
                <p className="text-sm text-gray-600">
                  하자·오배송 주장 시 수령일로부터 7일 내 외관·내용물 확인 사진/영상 등 증빙을 제출해 주세요.
                </p>
              </div>
            </section>

            {/* 제8조 미성년자 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제8조 (미성년자 계약취소)</h2>
              <p className="text-gray-700 leading-relaxed">
                미성년자가 법정대리인 동의 없이 체결한 구매계약은 관계 법령에 따라 취소할 수 있습니다.
              </p>
            </section>

            {/* 제9조 분쟁 해결 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제9조 (분쟁 해결)</h2>
              <div className="space-y-2 text-gray-700">
                <p><strong>1)</strong> 고객센터를 통한 상담/중재를 우선 진행합니다.</p>
                <p><strong>2)</strong> 합의가 어려운 경우 한국소비자원·전자거래분쟁조정위원회 등에 분쟁조정을 신청할 수 있습니다.</p>
                <p><strong>3)</strong> 관할은 민사소송법에 따릅니다.</p>
              </div>
            </section>

            {/* 제10조 정책 변경 */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">제10조 (정책 변경)</h2>
              <p className="text-gray-700 leading-relaxed">
                본 정책은 법령 및 회사 정책에 따라 변경될 수 있으며, 변경 시 최소 7일 전에 공지합니다.
                (긴급한 법령 개정 시 즉시 적용 가능)
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
                    <p className="text-sm text-gray-600">24시간 접수 (영업일 기준 24시간 내 답변)</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 회사정보 & 우선적용 */}
            <section className="text-sm text-gray-500 pt-4 border-t border-gray-200">
              <p>본 정책은 2025년 10월 28일부터 시행됩니다.</p>
              <p className="mt-2">
                ㈜어썸플랜<br />
                대표: 함은비 | 사업자등록번호: 268-87-01436<br />
                주소: 전라남도 목포시 원산중앙로44 2층<br />
                통신판매업신고: 2020-전남목포-0368
              </p>
              <p className="mt-2 text-xs text-gray-600">
                ※ 개별 상품 상세페이지의 <strong>별도 취소·환불 정책</strong>이 본 문서보다 우선 적용됩니다.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
