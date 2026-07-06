function AboutPage() {
  return (
    <section className="space-y-10 py-10 text-burgundy">
      <div className="rounded-[2.5rem] border border-burgundy/10 bg-white p-10 shadow-soft">
        <h1 className="text-4xl font-semibold">من نحن</h1>
        <p className="mt-5 max-w-3xl leading-8 text-burgundy/80">
          مودا بيلا هو وجهتكِ المميزة لأحدث صيحات الملابس النسائية، حيث ندمج الأناقة مع الراحة لتقدمي لعملائكِ تجربة تسوق فريدة.
          نركز على الجودة، التشكيلات المتجددة، وخدمة العملاء السريعة.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-burgundy/10 bg-beige/10 p-8 shadow-soft">
          <h2 className="text-2xl font-semibold">رؤيتنا</h2>
          <p className="mt-3 text-sm leading-7 text-burgundy/80">أن نكون المتجر الأول لعشاق الأزياء العربية الحديثة.</p>
        </div>
        <div className="rounded-[2rem] border border-burgundy/10 bg-white p-8 shadow-soft">
          <h2 className="text-2xl font-semibold">مهمتنا</h2>
          <p className="mt-3 text-sm leading-7 text-burgundy/80">تقديم تجربة متكاملة بين المتجر الإلكتروني ونظام نقاط البيع الخلفي.</p>
        </div>
        <div className="rounded-[2rem] border border-burgundy/10 bg-beige/10 p-8 shadow-soft">
          <h2 className="text-2xl font-semibold">قيمنا</h2>
          <p className="mt-3 text-sm leading-7 text-burgundy/80">احترام العميل، دقة المخزون، وتأمين الدفع الذكي عبر Instapay.</p>
        </div>
      </div>

      <div className="rounded-[2.5rem] border border-burgundy/10 bg-white p-10 shadow-soft">
        <h2 className="text-3xl font-semibold">لماذا تختار مودا بيلا؟</h2>
        <ul className="mt-6 space-y-4 text-sm leading-7 text-burgundy/80">
          <li>• تصميم متجر موجه للأزياء مع تنظيم واضح للفئات.</li>
          <li>• نظام نقاط بيع مخفي للمديرين والصرافين فقط.</li>
          <li>• تحديث مخزون فوري يحافظ على دقة الكمية المتاحة.</li>
          <li>• تجربة دفع موحدة وسهلة مع Instapay.</li>
        </ul>
      </div>
    </section>
  );
}

export default AboutPage;
