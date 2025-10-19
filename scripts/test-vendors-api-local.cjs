// API 파일을 직접 실행해서 테스트
require('dotenv').config();

const handler = require('../api/vendors.js');

// Mock request and response objects
const mockReq = {
  method: 'GET',
  headers: {}
};

const mockRes = {
  statusCode: 200,
  headers: {},
  body: '',
  
  setHeader(key, value) {
    this.headers[key] = value;
  },
  
  status(code) {
    this.statusCode = code;
    return this;
  },
  
  json(data) {
    this.body = JSON.stringify(data, null, 2);
    console.log(`\nStatus: ${this.statusCode}`);
    console.log('Response:', this.body);
    return this;
  },
  
  end() {
    console.log('Request ended');
    return this;
  }
};

console.log('Testing /api/vendors endpoint...\n');
handler(mockReq, mockRes).then(() => {
  console.log('\n✅ API call completed');
}).catch(err => {
  console.error('❌ API call failed:', err);
});
