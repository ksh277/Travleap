import jwt from 'jsonwebtoken';

// 테스트용 토큰 생성
const JWT_SECRET = process.env.JWT_SECRET || 'travleap-secret-key-2024';

// rentcar@vendor.com의 userId (콘솔 로그에서 확인)
const payload = {
  userId: 31,  // rentcar@vendor.com의 userId
  email: 'rentcar@vendor.com',
  role: 'vendor',
  iat: Math.floor(Date.now() / 1000)
};

const token = jwt.sign(payload, JWT_SECRET);

console.log('Generated JWT Token:');
console.log(token);
console.log('\nTest command:');
console.log(`curl -X GET "https://travleap.vercel.app/api/vendor/vehicles" -H "Authorization: Bearer ${token}"`);
