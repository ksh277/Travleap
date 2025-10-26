/**
 * 개인정보처리방침 페이지
 * 개인정보보호법 제30조에 따른 필수 고지사항
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
          <p className="text-sm text-gray-500 mt-2">시행일자: 2024년 1월 1일</p>
        </div>

        <Card>
          <CardContent className="p-8 space-y-6">

            {/* 전문 */}
            <section>
              <p className="text-gray-700 leading-relaxed">
                어썸플랜(이하 "회사")은 이용자의 개인정보를 중요시하며, "개인정보보호법", "정보통신망 이용촉진 및 정보보호 등에 관한 법률" 등 관련 법령을 준수하고 있습니다.
                회사는 개인정보처리방침을 통하여 이용자가 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며, 개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
              </p>
            </section>

            {/* 제1조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제1조 (개인정보의 수집 항목 및 방법)</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <p className="font-semibold mb-2">1. 수집하는 개인정보의 항목</p>
                  <div className="ml-4 space-y-2">
                    <p><strong>가. 회원가입 시</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>필수항목: 이름, 이메일, 비밀번호, 전화번호</li>
                      <li>선택항목: 생년월일, 성별</li>
                    </ul>
                    <p className="mt-2"><strong>나. 상품 구매 시</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>배송정보: 수령인 이름, 주소, 전화번호</li>
                      <li>결제정보: 신용카드 정보, 계좌정보 (결제대행사에서 처리)</li>
                    </ul>
                    <p className="mt-2"><strong>다. 서비스 이용 과정에서 자동 수집</strong></p>
                    <ul className="list-disc list-inside ml-4">
                      <li>IP 주소, 쿠키, 접속 로그, 서비스 이용 기록</li>
                      <li>기기정보 (OS, 화면크기, 기기식별번호)</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2">2. 개인정보 수집방법</p>
                  <ul className="list-disc list-inside ml-4">
                    <li>웹사이트 및 모바일 애플리케이션을 통한 회원가입 및 서비스 이용</li>
                    <li>고객센터를 통한 상담 과정</li>
                    <li>이벤트 응모 및 참여</li>
                    <li>제휴사로부터의 제공</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제2조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제2조 (개인정보의 수집 및 이용목적)</h2>
              <div className="space-y-2 text-gray-700">
                <p>회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다:</p>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  <li><strong>서비스 제공에 관한 계약 이행 및 요금정산</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>콘텐츠 제공, 특정 맞춤 서비스 제공</li>
                      <li>물품배송 또는 청구서 등 발송, 본인인증, 구매 및 요금 결제</li>
                    </ul>
                  </li>
                  <li><strong>회원관리</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>회원제 서비스 이용에 따른 본인확인, 개인식별</li>
                      <li>불량회원의 부정 이용 방지와 비인가 사용 방지</li>
                      <li>가입의사 확인, 연령확인, 분쟁 조정을 위한 기록보존</li>
                      <li>불만처리 등 민원처리, 고지사항 전달</li>
                    </ul>
                  </li>
                  <li><strong>마케팅 및 광고에 활용</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>신규 서비스 개발 및 맞춤 서비스 제공</li>
                      <li>이벤트 및 광고성 정보 제공 및 참여기회 제공</li>
                      <li>인구통계학적 특성에 따른 서비스 제공 및 광고 게재</li>
                      <li>서비스의 유효성 확인, 접속빈도 파악</li>
                    </ul>
                  </li>
                </ol>
              </div>
            </section>

            {/* 제3조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제3조 (개인정보의 보유 및 이용기간)</h2>
              <div className="space-y-2 text-gray-700">
                <p>원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다:</p>

                <div className="mt-4">
                  <p className="font-semibold mb-2">1. 회사 내부 방침에 의한 정보보유 사유</p>
                  <ul className="list-disc list-inside ml-4">
                    <li>부정이용기록: 1년</li>
                  </ul>
                </div>

                <div className="mt-4">
                  <p className="font-semibold mb-2">2. 관련 법령에 의한 정보보유 사유</p>
                  <p className="mb-2">상법, 전자상거래 등에서의 소비자보호에 관한 법률 등 관계법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 관계법령에서 정한 일정한 기간 동안 회원정보를 보관합니다:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
                    <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
                    <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
                    <li>표시·광고에 관한 기록: 6개월</li>
                    <li>웹사이트 방문기록 (로그인 기록, 접속 기록): 3개월</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제4조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제4조 (개인정보의 제3자 제공)</h2>
              <div className="space-y-2 text-gray-700">
                <p>회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다:</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>이용자가 사전에 동의한 경우</li>
                  <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                  <li>배송업무 수행을 위해 배송업체에 필요한 최소한의 정보(성명, 주소, 전화번호)를 제공하는 경우</li>
                  <li>결제 처리를 위해 결제대행업체(토스페이먼츠)에 필요한 결제정보를 제공하는 경우</li>
                </ol>
              </div>
            </section>

            {/* 제5조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제5조 (개인정보 처리의 위탁)</h2>
              <div className="space-y-2 text-gray-700">
                <p>회사는 서비스 향상을 위해서 아래와 같이 개인정보를 위탁하고 있으며, 관계 법령에 따라 위탁계약 시 개인정보가 안전하게 관리될 수 있도록 필요한 사항을 규정하고 있습니다:</p>

                <div className="overflow-x-auto mt-4">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left">수탁업체</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">위탁업무 내용</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">토스페이먼츠</td>
                        <td className="border border-gray-300 px-4 py-2">결제처리 및 결제대금 정산</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2">Vercel Inc.</td>
                        <td className="border border-gray-300 px-4 py-2">서버 호스팅 및 데이터 보관</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* 제6조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제6조 (이용자 및 법정대리인의 권리와 그 행사방법)</h2>
              <div className="space-y-2 text-gray-700">
                <p>이용자 및 법정 대리인은 언제든지 등록되어 있는 자신 혹은 당해 만 14세 미만 아동의 개인정보를 조회하거나 수정할 수 있으며 가입해지를 요청할 수도 있습니다.</p>
                <p>개인정보 조회·수정을 위해서는 '개인정보변경'(또는 '회원정보수정' 등)을 가입해지(동의철회)를 위해서는 "회원탈퇴"를 클릭하여 본인 확인 절차를 거치신 후 직접 열람, 정정 또는 탈퇴가 가능합니다.</p>
                <p>혹은 개인정보보호책임자에게 서면, 전화 또는 이메일로 연락하시면 지체 없이 조치하겠습니다.</p>
              </div>
            </section>

            {/* 제7조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제7조 (개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항)</h2>
              <div className="space-y-2 text-gray-700">
                <p>회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용 정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다.</p>
                <p className="mt-2"><strong>쿠키의 사용 목적:</strong></p>
                <ul className="list-disc list-inside ml-4">
                  <li>회원과 비회원의 접속 빈도나 방문 시간 등을 분석</li>
                  <li>이용자의 취향과 관심분야를 파악 및 자취 추적</li>
                  <li>각종 이벤트 참여 정도 및 방문 회수 파악 등을 통한 타겟 마케팅 및 개인 맞춤 서비스 제공</li>
                </ul>
                <p className="mt-2"><strong>쿠키 설정 거부 방법:</strong></p>
                <p>이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다.</p>
                <p className="text-sm text-gray-600 mt-2">* 단, 쿠키의 저장을 거부할 경우 로그인이 필요한 일부 서비스는 이용에 어려움이 있을 수 있습니다.</p>
              </div>
            </section>

            {/* 제8조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제8조 (개인정보의 기술적·관리적 보호 대책)</h2>
              <div className="space-y-2 text-gray-700">
                <p>회사는 이용자의 개인정보를 처리함에 있어 개인정보가 분실, 도난, 유출, 변조 또는 훼손되지 않도록 안전성 확보를 위하여 다음과 같은 기술적·관리적 대책을 강구하고 있습니다:</p>

                <div className="mt-4">
                  <p className="font-semibold mb-2">1. 기술적 대책</p>
                  <ul className="list-disc list-inside ml-4">
                    <li>개인정보는 비밀번호에 의해 보호되며, 파일 및 전송 데이터를 암호화</li>
                    <li>백신프로그램을 이용하여 컴퓨터바이러스에 의한 피해를 방지</li>
                    <li>해킹 등에 의해 회원의 개인정보가 유출되는 것을 방지하기 위해 침입차단시스템을 이용</li>
                  </ul>
                </div>

                <div className="mt-4">
                  <p className="font-semibold mb-2">2. 관리적 대책</p>
                  <ul className="list-disc list-inside ml-4">
                    <li>개인정보에 대한 접근권한을 최소한의 인원으로 제한</li>
                    <li>개인정보를 처리하는 직원에 대한 정기적인 교육 실시</li>
                    <li>개인정보 보호 전담기구를 운영하여 개인정보처리방침 이행사항 및 담당자의 준수여부 확인</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제9조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제9조 (개인정보보호책임자 및 담당자)</h2>
              <div className="space-y-2 text-gray-700">
                <p>회사는 이용자의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 개인정보보호책임자를 지정하고 있습니다:</p>

                <div className="bg-purple-50 p-6 rounded-lg mt-4">
                  <p className="font-bold text-gray-900 mb-3">개인정보보호책임자</p>
                  <div className="space-y-1 text-sm">
                    <p>이름: 함은비</p>
                    <p>직책: 대표</p>
                    <p>이메일: awesomeplan4606@naver.com</p>
                    <p>전화: 0504-0811-1330</p>
                  </div>
                </div>

                <p className="mt-4">이용자는 회사의 서비스를 이용하시며 발생하는 모든 개인정보보호 관련 민원을 개인정보보호책임자 혹은 담당부서로 신고하실 수 있습니다. 회사는 이용자들의 신고사항에 대해 신속하게 충분한 답변을 드릴 것입니다.</p>
              </div>
            </section>

            {/* 제10조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제10조 (기타)</h2>
              <div className="space-y-2 text-gray-700">
                <p>회사가 운영하는 웹사이트에 링크되어 있는 다른 웹사이트들이 개인정보를 수집하는 행위에 대해서는 본 "개인정보처리방침"이 적용되지 않음을 알려 드립니다.</p>
              </div>
            </section>

            {/* 제11조 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">제11조 (고지의 의무)</h2>
              <div className="space-y-2 text-gray-700">
                <p>현 개인정보처리방침의 내용 추가, 삭제 및 수정이 있을 경우에는 개정 최소 7일 전부터 홈페이지의 '공지사항'을 통해 고지할 것입니다. 다만, 개인정보의 수집 및 활용, 제3자 제공 등과 같이 이용자 권리의 중요한 변경이 있을 경우에는 최소 30일 전에 고지합니다.</p>
              </div>
            </section>

            {/* 부칙 */}
            <section className="border-t pt-6 mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">부칙</h2>
              <p className="text-gray-700">
                본 방침은 2024년 1월 1일부터 시행됩니다.
              </p>
            </section>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
