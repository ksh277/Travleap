/**
 * 개인정보처리방침 페이지
 * 개인정보보호법 제30조 및 전자상거래법 관련 고지사항 반영
 */

import React from 'react';
import { Card, CardContent } from '../ui/card';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900">개인정보처리방침</h1>
          <p className="text-sm text-gray-500 mt-2">시행일자: 2025년 10월 28일</p>
        </div>

        <Card>
          <CardContent className="p-8 space-y-6">
            {/* 전문 */}
            <section>
              <p className="text-gray-700 leading-relaxed">
                ㈜어썸플랜(이하 “회사”)은 이용자의 개인정보를 소중히 여기며
                「개인정보보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」,
                「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령을 준수합니다.
                본 방침은 회사가 어떤 정보를 어떤 목적으로 수집·이용하고, 어떻게 보호·파기하는지 설명합니다.
              </p>
            </section>

            {/* 제1조 수집 항목/방법 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제1조 (수집하는 개인정보의 항목 및 방법)</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <p className="font-semibold mb-2">1. 수집 항목</p>
                  <div className="ml-4 space-y-2">
                    <p><strong>가. 회원가입/소셜로그인</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>일반 가입: 이름, 이메일, 비밀번호, 휴대전화번호</li>
                      <li>소셜 로그인(카카오) 시 제공받는 항목:
                        <ul className="list-none ml-4 mt-1">
                          <li>- 필수: 이름, 카카오계정(전화번호)</li>
                          <li>- 선택: 성별, 연령대, 생일, 배송지(주소)</li>
                        </ul>
                        <p className="text-sm text-gray-600 mt-1">※ 카카오 계정 기반 간편가입 및 회원 연동을 위해 제공받은 정보를 이용합니다.</p>
                      </li>
                    </ul>
                    <p className="mt-2"><strong>나. 주문/결제 및 배송</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>수령인 정보: 이름, 주소, 휴대전화번호</li>
                      <li>결제 정보: 결제수단 식별자, 승인/거래키, 결제금액(※ 카드번호 등 민감 정보는 결제대행사에서 처리·보관)</li>
                    </ul>
                    <p className="mt-2"><strong>다. 서비스 이용 과정에서 자동 수집</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>접속기록(접속 일시/IP), 기기정보(OS/브라우저/화면크기), 쿠키/유사기술, 서비스 이용기록, 오류로그</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2">2. 수집 방법</p>
                  <ul className="list-disc list-inside ml-4">
                    <li>회원가입/로그인, 주문/결제, 고객센터 문의, 이벤트 응모</li>
                    <li>제휴사(소셜로그인, 결제/배송 등)를 통한 제공</li>
                    <li>자동 생성 정보(쿠키·로그 등)의 수집</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제2조 이용 목적 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제2조 (개인정보의 이용 목적)</h2>
              <ol className="list-decimal list-inside space-y-2 ml-4 text-gray-700">
                <li><strong>계약의 이행 및 요금정산</strong>: 주문 처리, 결제 승인/취소/환불, 배송/회수, 회원 식별</li>
                <li><strong>회원관리</strong>: 가입의사 확인, 회원 식별 및 계정 연동, 부정이용·비인가 사용 방지, 민원처리/공지</li>
                <li><strong>카카오 로그인</strong>: 카카오 계정 기반 간편가입 및 회원 연동</li>
                <li><strong>서비스 제공·운영</strong>: 팝업 스토어 카테고리 상품 판매/상담/AS, 오류 대응/품질 개선, 이용 통계</li>
                <li><strong>마케팅(선택)</strong>: 이벤트/혜택 안내, 맞춤형 추천·광고(수신 동의 시)</li>
              </ol>
            </section>

            {/* 제3조 보유기간 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제3조 (보유 및 이용 기간)</h2>
              <p className="text-gray-700">
                원칙적으로 목적 달성 후 지체 없이 파기합니다. 단, 아래 기간 동안 보관합니다.
              </p>
              <div className="overflow-x-auto mt-3">
                <table className="min-w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 border text-left">항목/기록</th>
                      <th className="px-3 py-2 border text-left">보유기간</th>
                      <th className="px-3 py-2 border text-left">근거</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-2 border">계약/청약철회 기록</td>
                      <td className="px-3 py-2 border">5년</td>
                      <td className="px-3 py-2 border">전자상거래법</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 border">대금결제/재화공급 기록</td>
                      <td className="px-3 py-2 border">5년</td>
                      <td className="px-3 py-2 border">전자상거래법</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 border">소비자 불만/분쟁처리 기록</td>
                      <td className="px-3 py-2 border">3년</td>
                      <td className="px-3 py-2 border">전자상거래법</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 border">표시·광고 기록</td>
                      <td className="px-3 py-2 border">6개월</td>
                      <td className="px-3 py-2 border">전자상거래법</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 border">접속기록(로그/로그인)</td>
                      <td className="px-3 py-2 border">3개월</td>
                      <td className="px-3 py-2 border">통신비밀보호법</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 border">부정이용 방지 기록(내부)</td>
                      <td className="px-3 py-2 border">1년</td>
                      <td className="px-3 py-2 border">내부 정책</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 제4조 제3자 제공 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제4조 (개인정보의 제3자 제공)</h2>
              <p className="text-gray-700">
                회사는 원칙적으로 동의 없이 제3자에게 제공하지 않습니다. 다만 다음의 경우 예외적으로 제공할 수 있습니다.
              </p>
              <ul className="list-disc list-inside ml-4 text-gray-700 space-y-1 mt-2">
                <li>이용자가 사전에 동의한 경우</li>
                <li>법령에 의한 요청 또는 수사기관의 적법한 절차에 따른 요구</li>
                <li>배송을 위한 택배사에 최소 정보 제공(성명, 주소, 연락처)</li>
                <li>결제를 위한 결제대행사에 결제 관련 정보 제공</li>
              </ul>
            </section>

            {/* 제5조 위탁 처리 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제5조 (개인정보 처리의 위탁)</h2>
              <p className="text-gray-700">
                회사는 서비스 제공을 위해 아래 업체에 업무를 위탁하며, 위탁계약 시 개인정보가 안전하게 관리되도록 필요한 사항을 규정합니다.
              </p>
              <div className="overflow-x-auto mt-3">
                <table className="min-w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 border text-left">수탁업체</th>
                      <th className="px-3 py-2 border text-left">위탁업무</th>
                      <th className="px-3 py-2 border text-left">보유/이용기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-2 border">토스페이먼츠㈜</td>
                      <td className="px-3 py-2 border">결제 처리, 승인/취소/환불 정산</td>
                      <td className="px-3 py-2 border">법정 보관기간 내</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 border">택배사(상품별 상이)</td>
                      <td className="px-3 py-2 border">상품 배송/회수</td>
                      <td className="px-3 py-2 border">배송 완료 후 3개월(분쟁 발생 시 해결 시까지)</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 border">Vercel Inc.</td>
                      <td className="px-3 py-2 border">웹 호스팅/배포 인프라</td>
                      <td className="px-3 py-2 border">위탁계약 종료 시까지</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 border">Google Cloud (Cloud Run 등)</td>
                      <td className="px-3 py-2 border">애플리케이션/데이터 인프라 운영</td>
                      <td className="px-3 py-2 border">위탁계약 종료 시까지</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 border">네이버/카카오/구글</td>
                      <td className="px-3 py-2 border">소셜 로그인 인증</td>
                      <td className="px-3 py-2 border">회원 연동 유지 기간</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ※ 수탁사 변동 시 본 방침 또는 공지사항을 통해 고지합니다.
              </p>
            </section>

            {/* 제6조 국외 이전 고지 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제6조 (개인정보의 국외 이전)</h2>
              <p className="text-gray-700">
                회사는 클라우드/호스팅 서비스 이용에 따라 개인정보가 국외 서버로 이전·보관될 수 있습니다.
              </p>
              <div className="overflow-x-auto mt-3">
                <table className="min-w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 border text-left">이전받는 자</th>
                      <th className="px-3 py-2 border text-left">이전 국가</th>
                      <th className="px-3 py-2 border text-left">이전 시점/방법</th>
                      <th className="px-3 py-2 border text-left">이용 목적/항목</th>
                      <th className="px-3 py-2 border text-left">보유기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-3 py-2 border">Vercel Inc.</td>
                      <td className="px-3 py-2 border">미국 등</td>
                      <td className="px-3 py-2 border">서비스 이용 시 네트워크 전송(수시)</td>
                      <td className="px-3 py-2 border">호스팅/배포(접속기록·로그·필요 메타데이터)</td>
                      <td className="px-3 py-2 border">위탁계약 종료 또는 법정기간까지</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 border">Google Cloud</td>
                      <td className="px-3 py-2 border">미국 등</td>
                      <td className="px-3 py-2 border">서비스 이용 시 네트워크 전송(수시)</td>
                      <td className="px-3 py-2 border">애플리케이션 운영(로그·오류정보·필요 메타데이터)</td>
                      <td className="px-3 py-2 border">위탁계약 종료 또는 법정기간까지</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ※ 데이터센터/리전은 서비스 품질·안정성 사유로 변경될 수 있으며, 변경 시 공지합니다.
              </p>
            </section>

            {/* 제7조 권리 행사 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제7조 (이용자 및 법정대리인의 권리와 행사방법)</h2>
              <ul className="list-disc list-inside ml-4 text-gray-700 space-y-1">
                <li>개인정보 열람·정정·삭제·처리정지·동의철회는 마이페이지 또는 고객센터를 통해 요청할 수 있습니다.</li>
                <li>만 14세 미만 아동의 경우 법정대리인이 권리행사를 할 수 있습니다.</li>
                <li>회사는 회원 확인 후 지체 없이 조치하며, 법령에 따라 거절/제한 사유가 있는 경우 그 사유를 안내합니다.</li>
              </ul>
            </section>

            {/* 제8조 쿠키 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제8조 (쿠키 등 자동수집 장치)</h2>
              <p className="text-gray-700">
                회사는 맞춤형 서비스 제공 및 접속 통계 분석을 위해 쿠키를 사용할 수 있습니다.
                브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 일부 서비스 이용에 제한이 있을 수 있습니다.
              </p>
            </section>

            {/* 제9조 보호대책/파기 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제9조 (개인정보의 안전성 확보조치 및 파기)</h2>
              <div className="space-y-2 text-gray-700">
                <p><strong>1) 기술적·관리적 보호조치</strong>: 접근권한 최소화, 전송구간 암호화(HTTPS), 저장암호화(중요정보), 침입차단·모니터링, 정기 교육 등</p>
                <p><strong>2) 파기 절차/방법</strong>: 보유기간 경과 또는 처리 목적 달성 시 지체 없이 파기하며, 전자파일은 복구 불가능한 방법으로, 인쇄물은 분쇄/소각합니다. 법령상 보관 의무가 있는 경우 해당 기간 동안 분리 보관합니다.</p>
              </div>
            </section>

            {/* 제10조 책임자 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제10조 (개인정보보호 책임자)</h2>
              <div className="bg-purple-50 p-6 rounded-lg">
                <p className="font-bold text-gray-900 mb-3">개인정보보호책임자</p>
                <div className="space-y-1 text-sm">
                  <p>성명: 함은비</p>
                  <p>직책: 대표</p>
                  <p>이메일: awesomeplan4606@naver.com</p>
                  <p>전화: 0504-0811-1330</p>
                  <p>주소: 전라남도 목포시 원산중앙로 44 2층 (58636)</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                또한 개인정보 침해에 대한 신고·상담은 개인정보침해신고센터(국번없이 118), 개인정보분쟁조정위원회 등을 통해 도움을 받으실 수 있습니다.
              </p>
            </section>

            {/* 제11조 고지의무 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제11조 (고지의 의무)</h2>
              <p className="text-gray-700">
                본 방침의 내용 추가·삭제·수정이 있을 경우 개정 최소 <strong>7일 전</strong>부터 공지하며,
                이용자 권리에 중대한 변경(제3자 제공 범위 확대, 국외 이전 변경 등)은 최소 <strong>30일 전</strong> 고지합니다.
              </p>
            </section>

            {/* 부칙 */}
            <section className="border-t pt-6 mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">부칙</h2>
              <p className="text-gray-700">본 방침은 2025년 10월 28일부터 적용됩니다.</p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
