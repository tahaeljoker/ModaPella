const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const jwt = require('jsonwebtoken');
const app = require('../server');
const connectDB = require('../config/db');

async function runSmokeTests() {
  console.log('Connecting to database...');
  await connectDB();
  console.log('MongoDB connected for smoke tests.\n');

  const adminToken = jwt.sign(
    { id: 'smoke-test-admin', role: 'admin' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1h' }
  );

  const endpoints = [
    { method: 'GET', url: '/api/status', auth: false },
    { method: 'GET', url: '/api/products', auth: false },
    { method: 'GET', url: '/api/products/categories', auth: false },
    { method: 'GET', url: '/api/products/lookup-barcode?code=TEST', auth: true },
    { method: 'GET', url: '/api/cashier/today', auth: true },
    { method: 'GET', url: '/api/cashier/returns', auth: true },
    { method: 'GET', url: '/api/cashier/safe', auth: true },
    { method: 'GET', url: '/api/cashier/activities', auth: true },
    { method: 'GET', url: '/api/cashier/daily-summary', auth: true },
    { method: 'GET', url: '/api/admin/overview', auth: true },
    { method: 'GET', url: '/api/admin/products', auth: true },
    { method: 'GET', url: '/api/admin/categories', auth: true },
    { method: 'GET', url: '/api/admin/suppliers', auth: true },
    { method: 'GET', url: '/api/admin/customers', auth: true },
    { method: 'GET', url: '/api/admin/users', auth: true },
    { method: 'GET', url: '/api/admin/site-config', auth: true },
    { method: 'GET', url: '/api/admin/activities', auth: true },
    { method: 'GET', url: '/api/admin/barcode-labels', auth: true },
    { method: 'GET', url: '/api/admin/inventory-count', auth: true },
    { method: 'GET', url: '/api/admin/debts', auth: true },
    { method: 'GET', url: '/api/pos/orders', auth: true },
    { method: 'GET', url: '/api/pos/online-reservations', auth: true },
    { method: 'GET', url: '/api/reports/monthly', auth: true },
    { method: 'GET', url: '/api/reports/cron/auto-close', auth: true }
  ];

  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    await new Promise((resolve) => {
      const mockReq = {
        method: ep.method,
        url: ep.url,
        path: ep.url.split('?')[0],
        query: {},
        headers: {
          host: 'localhost',
          authorization: ep.auth ? 'Bearer ' + adminToken : ''
        },
        get: function(h) { return this.headers[h.toLowerCase()]; }
      };

      if (ep.url.includes('?')) {
        const qs = ep.url.split('?')[1];
        new URLSearchParams(qs).forEach((v, k) => { mockReq.query[k] = v; });
      }

      const mockRes = {
        statusCode: 200,
        headers: {},
        status: function(code) { this.statusCode = code; return this; },
        setHeader: function(k, v) { this.headers[k.toLowerCase()] = v; },
        getHeader: function(k) { return this.headers[k.toLowerCase()]; },
        set: function(k, v) { if (typeof k === 'object') Object.assign(this.headers, k); else this.headers[k.toLowerCase()] = v; },
        json: function(data) {
          if (this.statusCode >= 500) {
            console.error(`✕ FAIL [${this.statusCode}]: ${ep.method} ${ep.url}`, data);
            failed++;
          } else {
            console.log(`✓ PASS [${this.statusCode}]: ${ep.method} ${ep.url}`);
            passed++;
          }
          resolve();
        },
        send: function(data) {
          if (this.statusCode >= 500) {
            console.error(`✕ FAIL [${this.statusCode}]: ${ep.method} ${ep.url}`, data);
            failed++;
          } else {
            console.log(`✓ PASS [${this.statusCode}]: ${ep.method} ${ep.url}`);
            passed++;
          }
          resolve();
        },
        sendStatus: function(code) {
          this.statusCode = code;
          console.log(`✓ PASS [${code}]: ${ep.method} ${ep.url}`);
          passed++;
          resolve();
        }
      };

      app.handle(mockReq, mockRes, (err) => {
        if (err) {
          console.error(`✕ ERROR: ${ep.method} ${ep.url} -> ${err.message}`);
          failed++;
        } else {
          console.log(`✓ PASS (Fallthrough) [${mockRes.statusCode}]: ${ep.method} ${ep.url}`);
          passed++;
        }
        resolve();
      });
    });
  }

  console.log('\n========================================');
  console.log(`Smoke Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runSmokeTests().catch(err => {
  console.error('Smoke test suite error:', err);
  process.exit(1);
});
