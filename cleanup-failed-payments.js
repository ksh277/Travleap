/**
 * 실패한 결제 데이터 클린업 스크립트
 *
 * 사용법:
 * node cleanup-failed-payments.js
 */

const fetch = require('node-fetch');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const USER_EMAIL = 'user@test.com';

async function cleanupFailedPayments() {
  try {
    console.log('🧹 실패한 결제 데이터 삭제 시작...');
    console.log(`📧 사용자 이메일: ${USER_EMAIL}`);

    const response = await fetch(`${API_BASE_URL}/api/admin/cleanup-failed-payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_email: USER_EMAIL
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ 성공: ${result.message}`);
      console.log(`📊 삭제된 결제 수: ${result.deleted_count}건`);

      if (result.deleted_payments && result.deleted_payments.length > 0) {
        console.log('\n삭제된 결제 목록:');
        result.deleted_payments.forEach((payment, index) => {
          console.log(`  ${index + 1}. ID: ${payment.id}, 금액: ${payment.amount}원, 주문번호: ${payment.order_number || 'N/A'}`);
        });
      }
    } else {
      console.error(`❌ 실패: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

cleanupFailedPayments();
