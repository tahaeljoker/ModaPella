import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', form);
      const { token, user } = response.data;
      localStorage.setItem('modapella_token', token);
      localStorage.setItem('modapella_role', user.role);
      localStorage.setItem('modapella_user', JSON.stringify(user));
      navigate(user.role === 'admin' ? '/admin' : '/cashier');
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تسجيل الدخول. تحقق من البريد وكلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-burgundy/15 bg-white p-10 shadow-soft">
      <div className="mb-8 space-y-3">
        <span className="text-sm uppercase tracking-[0.35em] text-burgundy/70">بوابة الدخول</span>
        <h1 className="text-4xl font-semibold text-burgundy">نظام الكاشير وإدارة المخزن</h1>
        <p className="text-sm text-burgundy/80">سجل الدخول باستخدام البريد الإلكتروني وكلمة المرور الخاصة بالمدير أو الصراف.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-burgundy">البريد الإلكتروني</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="example@domain.com"
            className="mt-2 w-full rounded-2xl border border-beige/30 bg-beige/5 px-4 py-3 text-burgundy outline-none transition focus:border-burgundy"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-burgundy">كلمة المرور</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="mt-2 w-full rounded-2xl border border-beige/30 bg-beige/5 px-4 py-3 text-burgundy outline-none transition focus:border-burgundy"
            required
          />
        </div>
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button className="w-full rounded-3xl bg-burgundy px-5 py-3 text-white transition hover:bg-[#650018]" type="submit" disabled={loading}>
          {loading ? 'جاري تسجيل الدخول...' : 'دخول النظام'}
        </button>
      </form>
    </section>
  );
}

export default LoginPage;
