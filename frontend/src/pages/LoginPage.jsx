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
    <section className="mx-auto max-w-md rounded-2xl sm:rounded-3xl border border-burgundy/15 bg-white p-5 sm:p-10 shadow-soft">
      <div className="mb-6 sm:mb-8 space-y-2 sm:space-y-3">
        <span className="text-xs sm:text-sm uppercase tracking-[0.25em] sm:tracking-[0.35em] text-burgundy/70">بوابة الدخول</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-burgundy">نظام الكاشير والإدارة</h1>
        <p className="text-xs sm:text-sm text-burgundy/70">سجل الدخول باستخدام البريد الإلكتروني وكلمة المرور الخاصة بالمدير أو الصراف.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-burgundy">البريد الإلكتروني</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="example@domain.com"
            className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-beige/30 bg-beige/5 px-4 py-2.5 sm:py-3 text-sm text-burgundy outline-none transition focus:border-burgundy"
            required
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-burgundy">كلمة المرور</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-beige/30 bg-beige/5 px-4 py-2.5 sm:py-3 text-sm text-burgundy outline-none transition focus:border-burgundy"
            required
          />
        </div>
        {error && <p className="rounded-xl sm:rounded-2xl bg-red-50 px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-700">{error}</p>}
        <button className="w-full rounded-xl sm:rounded-3xl bg-burgundy px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:bg-[#650018]" type="submit" disabled={loading}>
          {loading ? 'جاري تسجيل الدخول...' : 'دخول النظام'}
        </button>
      </form>
    </section>
  );
}

export default LoginPage;
