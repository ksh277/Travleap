const fs = require('fs');
const path = require('path');

console.log('\n업체가 확인해야 할 고객 정보 표시 여부 점검\n');
console.log('='.repeat(80) + '\n');

const dashboards = [
  { name: '렌트카', file: 'components/RentcarVendorDashboard.tsx' },
  { name: '투어', file: 'components/TourVendorDashboard.tsx' },
  { name: '음식', file: 'components/FoodVendorDashboard.tsx' },
  { name: '관광지', file: 'components/AttractionsVendorDashboard.tsx' },
  { name: '이벤트', file: 'components/EventsVendorDashboard.tsx' },
  { name: '체험', file: 'components/ExperienceVendorDashboard.tsx' },
  { name: '팝업', file: 'components/PopupVendorDashboard.tsx' }
];

const requiredCustomerInfo = [
  { key: 'customer_name', labels: ['고객명', '이름', 'name', 'customer_name', 'user_name', 'username'] },
  { key: 'customer_phone', labels: ['전화번호', '연락처', 'phone', 'customer_phone', 'user_phone'] },
  { key: 'customer_email', labels: ['이메일', 'email', 'customer_email', 'user_email'] },
  { key: 'address', labels: ['주소', 'address', 'shipping_address', 'user_address'] },
  { key: 'payment_info', labels: ['결제수단', '결제방법', 'payment_method', 'card_company'] },
  { key: 'amount', labels: ['금액', '가격', 'amount', 'price', 'total'] }
];

dashboards.forEach(dashboard => {
  const filePath = path.join(process.cwd(), dashboard.file);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${dashboard.name}: 파일 없음\n`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  console.log(`📋 ${dashboard.name} 대시보드:`);

  requiredCustomerInfo.forEach(info => {
    const found = info.labels.some(label => {
      return content.includes(label);
    });

    if (found) {
      console.log(`   ✅ ${info.key} 표시됨`);
    } else {
      console.log(`   ❌ ${info.key} 표시 안됨`);
    }
  });

  console.log('');
});

console.log('='.repeat(80) + '\n');
process.exit(0);
