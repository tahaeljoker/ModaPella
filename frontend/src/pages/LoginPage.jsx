import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function LoginPage() {
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [form, setForm] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [otpInfoMessage, setOtpInfoMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const navigate = useNavigate();

  // Timer countdown for resend OTP
  useEffect(() => {
    let timer;
    if (step === 'otp' && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', form);
      const data = response.data;

      if (data.requireOtp) {
        setStep('otp');
        setOtpInfoMessage(data.message || 'تم إرسال رمز التحقق عبر الواتساب.');
        setResendTimer(60);
        setCanResend(false);
      } else {
        // Standard user login (Cashier, Employee, Customer)
        const { token, user } = data;
        localStorage.setItem('modapella_token', token);
        localStorage.setItem('modapella_role', user.role);
        localStorage.setItem('modapella_user', JSON.stringify(user));
        navigate(user.role === 'admin' ? '/admin' : user.role === 'employee' ? '/employee' : '/cashier');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تسجيل الدخول. تحقق من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (event) => {
    event.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('يرجى إدخال كود الواتساب المكون من 6 أرقام كاملة.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/verify-otp', {
        email: form.email,
        otp: otp.trim()
      });

      const { token, user } = response.data;
      localStorage.setItem('modapella_token', token);
      localStorage.setItem('modapella_role', user.role);
      localStorage.setItem('modapella_user', JSON.stringify(user));
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'رمز التحقق غير صحيح، يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/resend-otp', { email: form.email });
      setOtpInfoMessage(response.data?.message || 'تم إرسال رمز جديد إلى الواتساب.');
      setResendTimer(60);
      setCanResend(false);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل إعادة إرسال الرمز.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setStep('credentials');
    setOtp('');
    setError('');
  };

  return (
    <section className="mx-auto max-w-md rounded-2xl sm:rounded-3xl border border-burgundy/15 bg-white p-5 sm:p-10 shadow-soft">
      {step === 'credentials' ? (
        <>
          <div className="mb-6 sm:mb-8 space-y-2 sm:space-y-3">
            <span className="text-xs sm:text-sm uppercase tracking-[0.25em] sm:tracking-[0.35em] text-burgundy/70">بوابة الدخول</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-burgundy">نظام الكاشير والإدارة</h1>
            <p className="text-xs sm:text-sm text-burgundy/70">سجل الدخول باستخدام البريد الإلكتروني وكلمة المرور الخاص بك.</p>
          </div>
          <form onSubmit={handleLoginSubmit} className="space-y-4 sm:space-y-6">
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
            <button
              className="w-full rounded-xl sm:rounded-3xl bg-burgundy px-5 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white transition hover:bg-[#650018] disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? 'جاري التحقق...' : 'دخول النظام'}
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="mb-6 sm:mb-8 space-y-2 text-center sm:space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 text-2xl shadow-inner">
              💬
            </div>
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-full">
              تأكيد الدخول عبر الواتساب
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-burgundy">أدخل رمز التحقق (OTP)</h1>
            <p className="text-xs sm:text-sm text-burgundy/80 leading-relaxed">
              {otpInfoMessage}
            </p>
          </div>

          <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-center text-xs sm:text-sm font-semibold text-burgundy mb-2">
                رمز التحقق المكون من 6 أرقام
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="123456"
                className="w-full text-center text-2xl tracking-[0.4em] font-mono font-bold rounded-xl sm:rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/20 px-4 py-3 text-burgundy outline-none transition focus:border-emerald-600 focus:bg-white"
                autoFocus
                required
              />
            </div>

            {error && <p className="rounded-xl sm:rounded-2xl bg-red-50 px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-700 text-center">{error}</p>}

            <button
              className="w-full rounded-xl sm:rounded-3xl bg-emerald-600 px-5 py-3 text-sm sm:text-base font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 shadow-md"
              type="submit"
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'جاري التحقق من الرمز...' : 'تأكيد ودخول لوحة التحكم'}
            </button>
          </form>

          <div className="mt-6 border-t border-beige/20 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
            <button
              onClick={handleResendOtp}
              disabled={!canResend || loading}
              className={`font-medium transition ${canResend ? 'text-emerald-700 hover:underline cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
            >
              {canResend ? '🔄 إعادة إرسال الرمز للواتس' : `إعادة الإرسال بعد (${resendTimer}ث)`}
            </button>

            <button
              onClick={handleBackToLogin}
              className="text-burgundy/70 hover:text-burgundy hover:underline cursor-pointer"
            >
              ← تغيير البريد / العودة
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default LoginPage;
