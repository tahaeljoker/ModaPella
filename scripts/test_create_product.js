// Simple test script: logs in as admin and attempts to create a product
(async function(){
  try{
    const base = process.env.API_URL || 'http://localhost:5000/api';
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@modapella.com', password: 'Admin123!' })
    });
    const login = await loginRes.json();
    console.log('LOGIN_STATUS', loginRes.status);
    console.log(JSON.stringify(login, null, 2));
    if (!loginRes.ok) process.exit(1);

    const token = login.token;
    const product = { name: 'اختبار منتج', category: 'Dress', price: 199, stock: 5, supplier: 'TestCo' };
    const createRes = await fetch(`${base}/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(product)
    });
    const created = await createRes.json();
    console.log('CREATE_STATUS', createRes.status);
    console.log(JSON.stringify(created, null, 2));
    if (!createRes.ok) process.exit(1);
  } catch (err) {
    console.error('TEST_ERROR', err);
    process.exit(1);
  }
})();
