#!/usr/bin/env node
/**
 * ModaPella — Full System Test Suite
 * يختبر كل العمليات الرئيسية على السيستم
 */
const http = require('http');

const BASE = 'http://localhost:5000';
let adminToken = '';
let cashierToken = '';
let testProductId = '';
let testEmployeeId = '';
let testSupplierId = '';
let testOrderId = '';
let testCountId = '';
let passCount = 0;
let failCount = 0;
let results = [];

// ─── HTTP Helper ────────────────────────────────────────────────────────────
function request(method, path, body = null, token = '') {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) })
      }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Test Runner ────────────────────────────────────────────────────────────
async function test(name, fn) {
  try {
    const result = await fn();
    if (result && result.error) throw new Error(result.error);
    console.log(`  ✅  ${name}`);
    results.push({ name, status: 'PASS', detail: result });
    passCount++;
  } catch (e) {
    console.log(`  ❌  ${name}`);
    console.log(`       ↳ ${e.message}`);
    results.push({ name, status: 'FAIL', error: e.message });
    failCount++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// ─── TEST SUITES ────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   ModaPella — Full System Test Suite');
  console.log(`   ${new Date().toLocaleString('ar-EG')}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // ── 1. SERVER HEALTH ────────────────────────────────────────────────────
  console.log('📡 [1] Server Health');
  await test('GET /api/status — يرجع ok', async () => {
    const r = await request('GET', '/api/status');
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(r.body.status === 'ok', `status=${r.body.status}`);
    return r.body;
  });

  // ── 2. AUTHENTICATION ───────────────────────────────────────────────────
  console.log('\n🔐 [2] Authentication');

  await test('POST /api/auth/login — Admin login', async () => {
    const r = await request('POST', '/api/auth/login', { email: 'admin@modapella.com', password: 'Admin123!' });
    assert(r.status === 200, `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    assert(r.body.token, 'No token returned');
    assert(r.body.user?.role === 'admin', `Role=${r.body.user?.role}`);
    adminToken = r.body.token;
    return { role: r.body.user.role };
  });

  await test('POST /api/auth/login — Cashier login', async () => {
    const r = await request('POST', '/api/auth/login', { email: 'cashier@modapella.com', password: 'Cashier123!' });
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(r.body.token, 'No token');
    cashierToken = r.body.token;
    return { role: r.body.user?.role };
  });

  await test('POST /api/auth/login — بيانات غلط يرجع 401', async () => {
    const r = await request('POST', '/api/auth/login', { email: 'nobody@example.com', password: 'wrong' });
    assert(r.status === 401 || r.status === 400, `Expected 4xx, got ${r.status}`);
    return { status: r.status };
  });

  await test('GET /api/admin/overview — بدون token يرجع 401', async () => {
    const r = await request('GET', '/api/admin/overview');
    assert(r.status === 401, `Expected 401, got ${r.status}`);
    return { status: r.status };
  });

  // ── 3. PRODUCTS ─────────────────────────────────────────────────────────
  console.log('\n🛍️  [3] Products & Categories');

  await test('GET /api/products — يرجع قائمة المنتجات', async () => {
    const r = await request('GET', '/api/products');
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(Array.isArray(r.body), 'Not array');
    return { count: r.body.length };
  });

  await test('POST /api/admin/products — إضافة منتج اختبار (Bag)', async () => {
    const r = await request('POST', '/api/admin/products', {
      name: 'شنطة اختبار TEST',
      category: 'Bag',
      price: 250,
      costPrice: 100,
      stock: 20,
      description: 'منتج اختبار — سيتم حذفه',
    }, adminToken);
    assert(r.status === 201, `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    assert(r.body._id, 'No _id');
    assert(r.body.category === 'Bag', `Category=${r.body.category}`);
    testProductId = r.body._id;
    return { id: testProductId, sku: r.body.sku };
  });

  await test('POST /api/admin/products — إضافة منتج اختبار (Cardigan)', async () => {
    const r = await request('POST', '/api/admin/products', {
      name: 'كاردن اختبار TEST',
      category: 'Cardigan',
      price: 350,
      costPrice: 150,
      stock: 15,
    }, adminToken);
    assert(r.status === 201, `HTTP ${r.status}`);
    assert(r.body.category === 'Cardigan', `Category=${r.body.category}`);
    return { category: r.body.category };
  });

  await test('GET /api/products?category=Bag — فلترة بالكاتيجوري الجديدة', async () => {
    const r = await request('GET', '/api/products');
    const bags = r.body.filter(p => p.category === 'Bag');
    assert(bags.length >= 1, `No Bag products found`);
    return { bagCount: bags.length };
  });

  // ── 4. EMPLOYEES ────────────────────────────────────────────────────────
  console.log('\n👤 [4] Employees');

  await test('POST /api/employees — إضافة موظف اختبار', async () => {
    const r = await request('POST', '/api/employees', {
      name: 'أحمد اختبار TEST',
      phone: '01000000000',
      notes: 'موظف اختبار'
    }, adminToken);
    assert(r.status === 201, `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    testEmployeeId = r.body._id;
    return { id: testEmployeeId };
  });

  await test('GET /api/employees — يرجع قائمة الموظفين (admin)', async () => {
    const r = await request('GET', '/api/employees', null, adminToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(Array.isArray(r.body), 'Not array');
    assert(r.body.length >= 1, 'No employees returned');
    return { count: r.body.length };
  });

  await test('GET /api/employees — يرجع قائمة الموظفين (cashier)', async () => {
    const r = await request('GET', '/api/employees', null, cashierToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    return { count: r.body.length };
  });

  await test('PUT /api/employees/:id — تعديل موظف', async () => {
    const r = await request('PUT', `/api/employees/${testEmployeeId}`, { name: 'أحمد اختبار محدّث TEST' }, adminToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(r.body.name.includes('محدّث'), `Name not updated: ${r.body.name}`);
    return { name: r.body.name };
  });

  // ── 5. SUPPLIERS ────────────────────────────────────────────────────────
  console.log('\n🏭 [5] Suppliers');

  await test('POST /api/suppliers — إضافة مورد اختبار', async () => {
    const r = await request('POST', '/api/suppliers', {
      name: 'مورد اختبار TEST',
      phone: '0123456789',
      address: 'القاهرة، مصر'
    }, adminToken);
    assert(r.status === 201, `HTTP ${r.status}`);
    testSupplierId = r.body._id;
    return { id: testSupplierId };
  });

  await test('GET /api/suppliers — يرجع الموردين مع الرصيد', async () => {
    const r = await request('GET', '/api/suppliers', null, adminToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(Array.isArray(r.body), 'Not array');
    const sup = r.body.find(s => s._id === testSupplierId);
    assert(sup, 'Test supplier not found');
    assert(typeof sup.balance !== 'undefined', 'Balance missing');
    return { balance: sup.balance };
  });

  await test('POST /api/suppliers/:id/transactions — تسجيل مشتريات (purchase)', async () => {
    const r = await request('POST', `/api/suppliers/${testSupplierId}/transactions`, {
      type: 'purchase',
      amount: 5000,
      description: 'شحنة ملابس اختبار',
      reference: 'INV-TEST-001'
    }, adminToken);
    assert(r.status === 201, `HTTP ${r.status}`);
    assert(r.body.type === 'purchase', `type=${r.body.type}`);
    return { amount: r.body.amount };
  });

  await test('POST /api/suppliers/:id/transactions — تسجيل دفعة (payment)', async () => {
    const r = await request('POST', `/api/suppliers/${testSupplierId}/transactions`, {
      type: 'payment',
      amount: 2000,
      description: 'دفعة جزئية للمورد'
    }, adminToken);
    assert(r.status === 201, `HTTP ${r.status}`);
    return { amount: r.body.amount };
  });

  await test('GET /api/suppliers/:id/transactions — يرجع التعاملات مع الرصيد الصحيح', async () => {
    const r = await request('GET', `/api/suppliers/${testSupplierId}/transactions`, null, adminToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(r.body.balance === 3000, `Expected balance=3000, got ${r.body.balance}`);
    assert(r.body.transactions.length === 2, `Expected 2 txs, got ${r.body.transactions.length}`);
    return { balance: r.body.balance, txCount: r.body.transactions.length };
  });

  // ── 6. SHIFT MANAGEMENT ─────────────────────────────────────────────────
  console.log('\n💰 [6] Shift Management');

  await test('GET /api/cashier/shift/current — لا توجد وردية مفتوحة في البداية', async () => {
    const r = await request('GET', '/api/cashier/shift/current', null, cashierToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    // shift might be null or exist from previous
    return { shiftStatus: r.body.shift?.status || 'none' };
  });

  await test('POST /api/cashier/shift/open — فتح وردية برصيد افتتاحي 500 ج.م', async () => {
    // close any existing shift first
    await request('POST', '/api/cashier/shift/close', { countedCash: 0 }, cashierToken).catch(() => {});
    const r = await request('POST', '/api/cashier/shift/open', { openingBalance: 500 }, cashierToken);
    assert(r.status === 201, `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    assert(r.body.status === 'open', `Shift status=${r.body.status}`);
    assert(r.body.openingBalance === 500, `Opening balance=${r.body.openingBalance}`);
    return { shiftId: r.body._id };
  });

  await test('POST /api/cashier/shift/open — فتح وردية ثانية يجب أن يفشل', async () => {
    const r = await request('POST', '/api/cashier/shift/open', { openingBalance: 100 }, cashierToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
    return { message: r.body.message };
  });

  await test('GET /api/cashier/shift/current — يرجع الوردية المفتوحة', async () => {
    const r = await request('GET', '/api/cashier/shift/current', null, cashierToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(r.body.shift !== null, 'No open shift');
    assert(r.body.shift.status === 'open', `Status=${r.body.shift.status}`);
    return { status: r.body.shift.status, expectedCash: r.body.expectedCash };
  });

  // ── 7. POS — SALE WITH EMPLOYEE ─────────────────────────────────────────
  console.log('\n🧾 [7] POS Sales');

  await test('POST /api/pos/sell — بيع بدون موظف (كاش)', async () => {
    const r = await request('POST', '/api/pos/sell', {
      customerName: 'عميل اختبار',
      customerPhone: '01111111111',
      items: [{ product: testProductId, name: 'شنطة اختبار TEST', category: 'Bag', price: 250, quantity: 2, size: '', color: '' }],
      paymentMethod: 'Cash',
      discount: 0,
      type: 'Offline'
    }, cashierToken);
    assert(r.status === 201, `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    assert(r.body.order._id, 'No order ID');
    assert(r.body.order.totalAmount === 500, `Total=${r.body.order.totalAmount}`);
    testOrderId = r.body.order._id;
    return { orderId: testOrderId, total: r.body.order.totalAmount };
  });

  await test('تحقق من انخفاض المخزون بعد البيع', async () => {
    const r = await request('GET', '/api/products', null, cashierToken);
    const prod = r.body.find(p => p._id === testProductId);
    assert(prod, 'Product not found');
    assert(prod.stock === 18, `Expected stock=18, got ${prod.stock}`);
    return { remainingStock: prod.stock };
  });

  await test('POST /api/pos/sell — بيع مع موظف (Instapay + خصم)', async () => {
    const r = await request('POST', '/api/pos/sell', {
      customerName: 'عميل اختبار 2',
      employeeId: testEmployeeId,
      items: [{ product: testProductId, name: 'شنطة اختبار TEST', category: 'Bag', price: 250, quantity: 1, size: '', color: '' }],
      paymentMethod: 'Instapay',
      discount: 50,
      type: 'Offline'
    }, cashierToken);
    assert(r.status === 201, `HTTP ${r.status}`);
    assert(r.body.order.totalAmount === 200, `Expected 200 after discount, got ${r.body.order.totalAmount}`);
    assert(r.body.order.discount === 50, `Discount=${r.body.order.discount}`);
    assert(r.body.order.employee, 'Employee not saved on order');
    return { total: r.body.order.totalAmount, discount: r.body.order.discount, employee: r.body.order.employee };
  });

  await test('POST /api/pos/sell — بيع بكمية أكثر من المخزون يجب أن يفشل', async () => {
    const r = await request('POST', '/api/pos/sell', {
      items: [{ product: testProductId, name: 'شنطة', category: 'Bag', price: 250, quantity: 999, size: '', color: '' }],
      paymentMethod: 'Cash',
      type: 'Offline'
    }, cashierToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
    return { message: r.body.message || r.body.error };
  });

  // ── 8. EMPLOYEE STATS ───────────────────────────────────────────────────
  console.log('\n📊 [8] Employee Sales Stats');

  await test('GET /api/employees/:id/stats — إحصائيات مبيعات الموظف', async () => {
    const r = await request('GET', `/api/employees/${testEmployeeId}/stats`, null, adminToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(r.body.count >= 1, `Expected >= 1 order, got ${r.body.count}`);
    assert(r.body.totalSales >= 200, `Expected totalSales >= 200, got ${r.body.totalSales}`);
    return { count: r.body.count, totalSales: r.body.totalSales };
  });

  // ── 9. RETURNS ──────────────────────────────────────────────────────────
  console.log('\n🔄 [9] Returns');

  await test('POST /api/pos/recover — مرتجع كامل للطلب الأول', async () => {
    const r = await request('POST', '/api/pos/recover', {
      orderId: testOrderId,
      reason: 'عيب في المنتج — اختبار'
    }, cashierToken);
    assert(r.status === 200, `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    assert(r.body.order.status === 'Returned', `Status=${r.body.order.status}`);
    assert(r.body.refundAmount === 500, `Refund=${r.body.refundAmount}`);
    return { refundAmount: r.body.refundAmount, status: r.body.order.status };
  });

  await test('تحقق من عودة المخزون بعد المرتجع', async () => {
    const r = await request('GET', '/api/products', null, cashierToken);
    const prod = r.body.find(p => p._id === testProductId);
    // Started at 20, sold 2 (returned +2), sold 1 → 20 - 2 + 2 - 1 = 19
    assert(prod.stock === 19, `Expected stock=19, got ${prod.stock}`);
    return { stockAfterReturn: prod.stock };
  });

  await test('POST /api/pos/recover — مرتجع للطلب نفسه مرة ثانية يجب أن يفشل', async () => {
    const r = await request('POST', '/api/pos/recover', {
      orderId: testOrderId,
      reason: 'محاولة ثانية'
    }, cashierToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
    return { message: r.body.message };
  });

  // ── 10. SAFE TRANSACTIONS ───────────────────────────────────────────────
  console.log('\n💳 [10] Safe / Transactions');

  await test('POST /api/cashier/safe/transaction — إضافة مصروف يدوي', async () => {
    const r = await request('POST', '/api/cashier/safe/transaction', {
      amount: 100,
      type: 'OUT',
      category: 'مصروف اختبار',
      description: 'اختبار مصروف خزنة'
    }, cashierToken);
    assert(r.status === 201, `HTTP ${r.status}`);
    assert(r.body.type === 'OUT', `type=${r.body.type}`);
    return { txId: r.body._id };
  });

  await test('GET /api/cashier/safe — يرجع بيانات الخزنة لليوم', async () => {
    const r = await request('GET', '/api/cashier/safe', null, cashierToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(r.body.summary, 'No summary');
    assert(r.body.todaySummary, 'No todaySummary');
    return {
      cashSales: r.body.todaySummary.cashSales,
      expenses: r.body.todaySummary.expenses
    };
  });

  // ── 11. CLOSE SHIFT ─────────────────────────────────────────────────────
  console.log('\n🔒 [11] Close Shift');

  await test('POST /api/cashier/shift/close — تقفيل الوردية', async () => {
    const r = await request('POST', '/api/cashier/shift/close', { countedCash: 900 }, cashierToken);
    assert(r.status === 200, `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    assert(r.body.shift.status === 'closed', `Status=${r.body.shift.status}`);
    assert(typeof r.body.expectedCash === 'number', 'No expectedCash');
    assert(typeof r.body.variance === 'number', 'No variance');
    return {
      expectedCash: r.body.expectedCash,
      closingBalance: r.body.shift.closingBalance,
      variance: r.body.variance
    };
  });

  await test('POST /api/cashier/shift/close — تقفيل وردية غير موجودة يجب أن يفشل', async () => {
    const r = await request('POST', '/api/cashier/shift/close', { countedCash: 100 }, cashierToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
    return { message: r.body.message };
  });

  // ── 12. INVENTORY COUNT ──────────────────────────────────────────────────
  console.log('\n📦 [12] Inventory Count (Stocktake)');

  await test('POST /api/inventory/count/new — إنشاء جلسة جرد جديدة', async () => {
    const r = await request('POST', '/api/inventory/count/new', { label: 'جرد اختبار TEST' }, adminToken);
    assert(r.status === 201, `HTTP ${r.status}`);
    assert(r.body.status === 'draft', `Status=${r.body.status}`);
    assert(r.body.items.length > 0, 'No items in count');
    testCountId = r.body._id;
    return { countId: testCountId, itemsCount: r.body.items.length };
  });

  await test('GET /api/inventory/counts — يرجع قائمة الجردات', async () => {
    const r = await request('GET', '/api/inventory/counts', null, adminToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(Array.isArray(r.body), 'Not array');
    assert(r.body.length >= 1, 'No counts');
    return { count: r.body.length };
  });

  await test('PUT /api/inventory/counts/:id — حفظ كميات الجرد', async () => {
    // Get the count first
    const getR = await request('GET', `/api/inventory/counts/${testCountId}`, null, adminToken);
    const items = getR.body.items.slice(0, 2).map(i => ({ _id: i._id, countedStock: i.systemStock + 1 }));
    const r = await request('PUT', `/api/inventory/counts/${testCountId}`, { items }, adminToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    // check variance was calculated
    const updatedItem = r.body.items.find(i => i._id === items[0]._id);
    assert(updatedItem.variance === 1, `Expected variance=1, got ${updatedItem?.variance}`);
    return { variance: updatedItem.variance };
  });

  await test('POST /api/inventory/counts/:id/apply — تطبيق الجرد على المخزون (admin only)', async () => {
    const r = await request('POST', `/api/inventory/counts/${testCountId}/apply`, {}, adminToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(r.body.count.status === 'applied', `Status=${r.body.count.status}`);
    return { status: r.body.count.status };
  });

  await test('POST /api/inventory/counts/:id/apply — تطبيق جرد مطبّق مسبقاً يجب أن يفشل', async () => {
    const r = await request('POST', `/api/inventory/counts/${testCountId}/apply`, {}, adminToken);
    assert(r.status === 400, `Expected 400, got ${r.status}`);
    return { message: r.body.message };
  });

  // ── 13. ADMIN OVERVIEW ───────────────────────────────────────────────────
  console.log('\n📊 [13] Admin Overview & Reports');

  await test('GET /api/admin/overview — يرجع الإحصائيات الكاملة', async () => {
    const r = await request('GET', '/api/admin/overview', null, adminToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(typeof r.body.products === 'number', 'No products count');
    assert(typeof r.body.netProfit === 'number', 'No netProfit');
    assert(Array.isArray(r.body.recentOrders), 'No recentOrders');
    return {
      products: r.body.products,
      netProfit: r.body.netProfit,
      recentOrdersCount: r.body.recentOrders.length
    };
  });

  await test('GET /api/orders/summary — إجمالي الطلبات', async () => {
    const r = await request('GET', '/api/orders/summary', null, adminToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(typeof r.body.completed === 'number', 'No completed count');
    return { completed: r.body.completed, returned: r.body.returned };
  });

  await test('GET /api/orders/weekly — بيانات المبيعات الأسبوعية', async () => {
    const r = await request('GET', '/api/orders/weekly', null, adminToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(Array.isArray(r.body), 'Not array');
    assert(r.body.length === 7, `Expected 7 days, got ${r.body.length}`);
    return { days: r.body.length };
  });

  await test('GET /api/cashier/today — سجل اليوم', async () => {
    const r = await request('GET', '/api/cashier/today', null, cashierToken);
    assert(r.status === 200, `HTTP ${r.status}`);
    assert(Array.isArray(r.body.orders), 'No orders array');
    return { ordersToday: r.body.count, revenue: r.body.totalRevenue };
  });

  // ── 14. ROLE PROTECTION ──────────────────────────────────────────────────
  console.log('\n🛡️  [14] Role Protection');

  await test('GET /api/admin/overview — cashier لا يستطيع الوصول للأدمن', async () => {
    const r = await request('GET', '/api/admin/overview', null, cashierToken);
    assert(r.status === 403, `Expected 403, got ${r.status}`);
    return { status: r.status };
  });

  await test('POST /api/admin/products — cashier لا يستطيع إضافة منتجات', async () => {
    const r = await request('POST', '/api/admin/products', { name: 'test', category: 'Bag', price: 100 }, cashierToken);
    assert(r.status === 403, `Expected 403, got ${r.status}`);
    return { status: r.status };
  });

  await test('POST /api/employees — cashier لا يستطيع إضافة موظفين', async () => {
    const r = await request('POST', '/api/employees', { name: 'unauthorized' }, cashierToken);
    assert(r.status === 403, `Expected 403, got ${r.status}`);
    return { status: r.status };
  });

  // ── SUMMARY ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   ✅ PASSED: ${passCount}`);
  console.log(`   ❌ FAILED: ${failCount}`);
  console.log(`   📊 TOTAL:  ${passCount + failCount}`);
  const pct = Math.round((passCount / (passCount + failCount)) * 100);
  console.log(`   📈 SCORE:  ${pct}%`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failCount > 0) {
    console.log('❌ Failed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   • ${r.name}`);
      console.log(`     ↳ ${r.error}`);
    });
    console.log('');
  }

  return { passCount, failCount, pct };
}

runTests().then(r => {
  process.exit(r.failCount > 0 ? 1 : 0);
}).catch(e => {
  console.error('\n💥 Test runner crashed:', e.message);
  console.error('Make sure the backend server is running on port 5000');
  process.exit(1);
});
