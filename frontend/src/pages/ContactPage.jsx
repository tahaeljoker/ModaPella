import { useState } from 'react';

function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <section className="space-y-6 sm:space-y-10 py-4 sm:py-10 text-burgundy">
      <div className="rounded-2xl sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-4 sm:p-10 shadow-soft">
        <h1 className="text-2xl sm:text-4xl font-bold">اتصل بنا</h1>
        <p className="mt-3 sm:mt-5 max-w-3xl text-sm sm:text-base leading-7 sm:leading-8 text-burgundy/80">
          لأي استفسارات أو طلب شراكة، يمكنك التواصل معنا عبر النموذج التالي أو من خلال معلومات الاتصال المباشرة.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl sm:rounded-[2rem] border border-burgundy/10 bg-beige/10 p-5 sm:p-8 shadow-soft h-fit">
          <h2 className="text-lg sm:text-2xl font-bold">معلومات التواصل</h2>
          <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 text-xs sm:text-sm leading-6 sm:leading-7 text-burgundy/80">
            <p><strong>البريد الإلكتروني:</strong> info@modapella.com</p>
            <p><strong>رقم الهاتف:</strong> +966 5X XXX XXXX</p>
            <p><strong>الموقع:</strong> الرياض، السعودية</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="rounded-xl sm:rounded-[2rem] border border-burgundy/10 bg-white p-5 sm:p-8 shadow-soft space-y-4">
          {submitted && <div className="rounded-xl sm:rounded-3xl bg-emerald-50 border border-emerald-100 p-4 text-xs sm:text-sm text-emerald-700">تم إرسال طلبك بنجاح، سنعاود التواصل معك قريبًا.</div>}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-burgundy/80">الاسم</label>
            <input
              name="name"
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-burgundy/20 bg-beige/10 px-4 py-2.5 sm:py-3 text-sm text-burgundy outline-none focus:border-burgundy"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-burgundy/80">البريد الإلكتروني</label>
            <input
              name="email"
              required
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-burgundy/20 bg-beige/10 px-4 py-2.5 sm:py-3 text-sm text-burgundy outline-none focus:border-burgundy"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-burgundy/80">الرسالة</label>
            <textarea
              name="message"
              required
              rows="5"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="mt-1.5 w-full rounded-xl sm:rounded-2xl border border-burgundy/20 bg-beige/10 px-4 py-2.5 sm:py-3 text-sm text-burgundy outline-none focus:border-burgundy"
            />
          </div>
          <button type="submit" className="rounded-xl sm:rounded-3xl bg-burgundy px-5 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-white transition hover:bg-[#650018]">إرسال الرسالة</button>
        </form>
      </div>
    </section>
  );
}

export default ContactPage;
