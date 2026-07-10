import { useState } from 'react';

function PaymentPage() {
  const [form, setForm] = useState({ fullName: '', email: '', amount: '120.00' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="space-y-6 sm:space-y-8 py-4 sm:py-8">
      <div className="rounded-2xl sm:rounded-3xl border border-burgundy/15 bg-white p-4 sm:p-8 shadow-soft">
        <h2 className="text-xl sm:text-3xl font-bold text-burgundy">الدفع عبر Instapay</h2>
        <p className="mt-1.5 sm:mt-3 text-xs sm:text-sm text-burgundy/75">استخدم Instapay كوسيلة الدفع الوحيدة لطلبات مودا بيلا.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 rounded-2xl sm:rounded-3xl border border-burgundy/15 bg-white p-4 sm:p-8 shadow-soft">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-burgundy/80">الاسم الكامل</label>
            <input
              className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-beige/20 bg-beige/10 px-4 py-2.5 sm:py-3 text-sm text-burgundy outline-none focus:border-burgundy"
              name="fullName"
              value={form.fullName}
              onChange={(event) => setForm({ ...form, [event.target.name]: event.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-burgundy/80">البريد الإلكتروني</label>
            <input
              type="email"
              className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-beige/20 bg-beige/10 px-4 py-2.5 sm:py-3 text-sm text-burgundy outline-none focus:border-burgundy"
              name="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, [event.target.name]: event.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-burgundy/80">المبلغ</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-beige/20 bg-beige/10 px-4 py-2.5 sm:py-3 text-sm text-burgundy outline-none focus:border-burgundy"
              name="amount"
              value={form.amount}
              onChange={(event) => setForm({ ...form, [event.target.name]: event.target.value })}
              required
            />
          </div>
          <button className="w-full rounded-xl sm:rounded-3xl bg-burgundy px-5 py-2.5 sm:py-3 font-bold text-sm sm:text-base text-white transition hover:bg-[#650018]" type="submit">الدفع عبر Instapay</button>
          {submitted && <p className="rounded-xl sm:rounded-3xl bg-beige/10 p-4 text-xs sm:text-sm text-burgundy/85 font-semibold">تم إرسال طلب الدفع. سيتواصل نظام Instapay لإتمام العملية.</p>}
        </form>

        <div className="rounded-2xl sm:rounded-3xl border border-burgundy/15 bg-beige/10 p-5 sm:p-8 shadow-soft text-burgundy/90">
          <h3 className="text-lg sm:text-2xl font-bold">تعليمات الدفع</h3>
          <ul className="mt-4 sm:mt-5 space-y-2 sm:space-y-3 text-xs sm:text-sm text-burgundy/75">
            <li>• Instapay هو بوابة الدفع الوحيدة في النظام.</li>
            <li>• الطلبات عبر المتجر الإلكتروني أو نقاط البيع تستخدم نفس نموذج الطلب.</li>
            <li>• يتم تعيين طريقة الدفع إلى 'Instapay' تلقائيًا في الخلفية.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default PaymentPage;
