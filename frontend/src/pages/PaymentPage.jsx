import { useState } from 'react';

function PaymentPage() {
  const [form, setForm] = useState({ fullName: '', email: '', amount: '120.00' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="space-y-8 py-8">
      <div className="rounded-3xl border border-burgundy/15 bg-white p-8 shadow-soft">
        <h2 className="text-3xl font-semibold text-burgundy">الدفع عبر Instapay</h2>
        <p className="mt-3 text-burgundy/75">استخدم Instapay كوسيلة الدفع الوحيدة لطلبات مودا بيلا.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-burgundy/15 bg-white p-8 shadow-soft">
          <div>
            <label className="block text-sm text-burgundy/80">الاسم الكامل</label>
            <input
              className="mt-2 w-full rounded-2xl border border-beige/20 bg-beige/10 px-4 py-3 text-burgundy outline-none focus:border-burgundy"
              name="fullName"
              value={form.fullName}
              onChange={(event) => setForm({ ...form, [event.target.name]: event.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-burgundy/80">البريد الإلكتروني</label>
            <input
              type="email"
              className="mt-2 w-full rounded-2xl border border-beige/20 bg-beige/10 px-4 py-3 text-burgundy outline-none focus:border-burgundy"
              name="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, [event.target.name]: event.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-burgundy/80">المبلغ</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="mt-2 w-full rounded-2xl border border-beige/20 bg-beige/10 px-4 py-3 text-burgundy outline-none focus:border-burgundy"
              name="amount"
              value={form.amount}
              onChange={(event) => setForm({ ...form, [event.target.name]: event.target.value })}
              required
            />
          </div>
          <button className="w-full rounded-3xl bg-burgundy px-5 py-3 font-semibold text-white transition hover:bg-[#650018]" type="submit">الدفع عبر Instapay</button>
          {submitted && <p className="rounded-3xl bg-beige/10 p-4 text-sm text-burgundy/80">تم إرسال طلب الدفع. سيتواصل نظام Instapay لإتمام العملية.</p>}
        </form>

        <div className="rounded-3xl border border-burgundy/15 bg-beige/10 p-8 shadow-soft text-burgundy/90">
          <h3 className="text-2xl font-semibold">تعليمات الدفع</h3>
          <ul className="mt-5 space-y-3 text-sm text-burgundy/80">
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
