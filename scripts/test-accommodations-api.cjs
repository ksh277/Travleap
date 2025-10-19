require('dotenv').config();
const handler = require('../api/accommodations.js');

const mockReq = {
  method: 'GET',
  headers: {}
};

const mockRes = {
  statusCode: 200,
  headers: {},
  body: '',
  setHeader(key, value) { this.headers[key] = value; },
  status(code) { this.statusCode = code; return this; },
  json(data) {
    this.body = JSON.stringify(data, null, 2);
    console.log(`Status: ${this.statusCode}`);
    if (data.data && Array.isArray(data.data)) {
      console.log(`Found ${data.data.length} accommodations`);
      data.data.slice(0, 3).forEach(h => {
        console.log(`  - [${h.partner_id}] ${h.business_name} (${h.room_count}개 객실)`);
      });
    } else {
      console.log('Response:', this.body);
    }
    return this;
  },
  end() { console.log('Request ended'); return this; }
};

console.log('Testing /api/accommodations endpoint...\n');
handler(mockReq, mockRes).catch(err => console.error('API call failed:', err));
