const fs = require('fs');
const path = require('path');

const categories = ['accommodation', 'food', 'attractions', 'events', 'experience', 'rentcar'];
const checkPoints = {
  payment: {},
  refund: {},
  booking: {}
};

categories.forEach(cat => {
  // Check payments API
  const paymentPath = path.join('pages/api', cat, 'payments.js');
  const altPaymentPath = path.join('api', cat, 'payments.js');

  if (fs.existsSync(paymentPath)) {
    const content = fs.readFileSync(paymentPath, 'utf8');
    checkPoints.payment[cat] = {
      exists: true,
      hasPointsEarning: content.includes('user_points') && content.includes('INSERT'),
      hasPointsDeduction: content.includes('use_points') || content.includes('points_used')
    };
  } else if (fs.existsSync(altPaymentPath)) {
    const content = fs.readFileSync(altPaymentPath, 'utf8');
    checkPoints.payment[cat] = {
      exists: true,
      hasPointsEarning: content.includes('user_points') && content.includes('INSERT'),
      hasPointsDeduction: content.includes('use_points') || content.includes('points_used')
    };
  } else {
    checkPoints.payment[cat] = { exists: false };
  }

  // Check refund/cancel API
  const refundPaths = [
    path.join('pages/api', cat, 'refund.js'),
    path.join('api', cat, 'refund.js'),
    path.join('pages/api', cat, 'cancel.js'),
    path.join('api', cat, 'cancel.js'),
    path.join('api', cat, 'cancel-rental.js')
  ];

  for (const refundPath of refundPaths) {
    if (fs.existsSync(refundPath)) {
      const content = fs.readFileSync(refundPath, 'utf8');
      checkPoints.refund[cat] = {
        exists: true,
        path: refundPath,
        hasPointsReturn: content.includes('user_points') && content.includes('refund'),
        hasPointsRecovery: content.includes('포인트 회수') || content.includes('points recovery')
      };
      break;
    }
  }

  if (!checkPoints.refund[cat]) {
    checkPoints.refund[cat] = { exists: false };
  }

  // Check bookings API
  const bookingPath = path.join('pages/api/vendor', cat, 'bookings.js');
  const altBookingPath = path.join('api/vendor', cat, 'bookings.js');

  if (fs.existsSync(bookingPath)) {
    const content = fs.readFileSync(bookingPath, 'utf8');
    checkPoints.booking[cat] = {
      exists: true,
      hasPaymentsJoin: content.includes('LEFT JOIN payments') || content.includes('JOIN payments')
    };
  } else if (fs.existsSync(altBookingPath)) {
    const content = fs.readFileSync(altBookingPath, 'utf8');
    checkPoints.booking[cat] = {
      exists: true,
      hasPaymentsJoin: content.includes('LEFT JOIN payments') || content.includes('JOIN payments')
    };
  } else {
    checkPoints.booking[cat] = { exists: false };
  }
});

console.log('📊 [포인트 시스템 전체 검증]\n');
console.log('='.repeat(70));
console.log('\n1️⃣  결제 시 포인트 적립/사용 (Payment APIs)\n');

categories.forEach(cat => {
  const p = checkPoints.payment[cat];
  if (p.exists) {
    const earning = p.hasPointsEarning ? '✅ 적립' : '❌ 적립 없음';
    const deduction = p.hasPointsDeduction ? '✅ 사용' : '❌ 사용 없음';
    console.log(`   ${cat.padEnd(15)} [${earning}] [${deduction}]`);
  } else {
    console.log(`   ${cat.padEnd(15)} [❌ API 없음]`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('\n2️⃣  환불 시 포인트 반환/회수 (Refund/Cancel APIs)\n');

categories.forEach(cat => {
  const r = checkPoints.refund[cat];
  if (r.exists) {
    const returning = r.hasPointsReturn ? '✅ 반환' : '❌ 반환 없음';
    const recovery = r.hasPointsRecovery ? '✅ 회수' : '❌ 회수 없음';
    console.log(`   ${cat.padEnd(15)} [${returning}] [${recovery}]`);
  } else {
    console.log(`   ${cat.padEnd(15)} [❌ API 없음]`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('\n3️⃣  파트너 대시보드 결제 정보 (Vendor Bookings APIs)\n');

categories.forEach(cat => {
  const b = checkPoints.booking[cat];
  if (b.exists) {
    const join = b.hasPaymentsJoin ? '✅ payments JOIN' : '❌ payments JOIN 없음';
    console.log(`   ${cat.padEnd(15)} [${join}]`);
  } else {
    console.log(`   ${cat.padEnd(15)} [❌ API 없음]`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('\n📌 요약:\n');

const paymentOK = categories.filter(c => checkPoints.payment[c].exists && checkPoints.payment[c].hasPointsEarning && checkPoints.payment[c].hasPointsDeduction);
const refundOK = categories.filter(c => checkPoints.refund[c].exists && checkPoints.refund[c].hasPointsReturn && checkPoints.refund[c].hasPointsRecovery);
const bookingOK = categories.filter(c => checkPoints.booking[c].exists && checkPoints.booking[c].hasPaymentsJoin);

console.log(`   ✅ 결제 포인트 완전: ${paymentOK.join(', ') || '없음'}`);
console.log(`   ⚠️  환불 포인트 완전: ${refundOK.join(', ') || '없음'}`);
console.log(`   ✅ 파트너 대시보드 완전: ${bookingOK.join(', ') || '없음'}`);
console.log('');
