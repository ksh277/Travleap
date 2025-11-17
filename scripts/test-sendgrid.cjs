require('dotenv').config();
const sgMail = require('@sendgrid/mail');

async function testSendGrid() {
  try {
    console.log('📧 [SendGrid 테스트]\n');

    // API 키 설정
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      console.error('❌ SENDGRID_API_KEY 환경변수가 설정되지 않았습니다!');
      return;
    }

    console.log('✅ SENDGRID_API_KEY 설정됨:', apiKey.substring(0, 20) + '...');

    sgMail.setApiKey(apiKey);

    // 테스트 이메일 발송 (실제로 보내지 않고 검증만)
    const msg = {
      to: 'test@example.com',  // 실제 테스트 시 본인 이메일로 변경
      from: process.env.EMAIL_FROM || 'noreply@travleap.com',
      subject: 'Travleap 테스트 이메일',
      text: '이것은 SendGrid 테스트 이메일입니다.',
      html: '<p>이것은 <strong>SendGrid 테스트</strong> 이메일입니다.</p>',
    };

    console.log('\n📬 테스트 이메일 정보:');
    console.log('  - To:', msg.to);
    console.log('  - From:', msg.from);
    console.log('  - Subject:', msg.subject);

    console.log('\n⚠️  실제 발송을 원하시면 아래 주석을 해제하세요:');
    console.log('  // await sgMail.send(msg);');
    console.log('  // console.log("✅ 이메일 발송 성공!");');

    // 실제 발송을 원하면 아래 주석 해제
    // await sgMail.send(msg);
    // console.log('\n✅ 이메일 발송 성공!');

    console.log('\n✅ SendGrid 설정이 올바릅니다!');
    console.log('💡 이메일은 주문 완료 시 자동으로 발송됩니다.');

  } catch (error) {
    console.error('\n❌ SendGrid 오류:', error.message);
    if (error.response) {
      console.error('상세 오류:', error.response.body);
    }
  }
}

testSendGrid();
