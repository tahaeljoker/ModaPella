function AboutPage() {
  return (
    <section className="space-y-6 sm:space-y-10 py-4 sm:py-10 text-burgundy">
      <div className="rounded-2xl sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-4 sm:p-10 shadow-soft">
        <h1 className="text-2xl sm:text-4xl font-bold">من نحن</h1>
        <p className="mt-3 sm:mt-5 max-w-3xl text-sm sm:text-base leading-7 sm:leading-8 text-burgundy/80">
          مودا بيلا هو وجهتكِ المميزة لأحدث صيحات الملابس النسائية، حيث ندمج الأناقة مع الراحة لتقدمي لعملائكِ تجربة تسوق فريدة.
          نركز على الجودة، التشكيلات المتجددة، وخدمة العملاء السريعة.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl sm:rounded-[2rem] border border-burgundy/10 bg-beige/10 p-5 sm:p-8 shadow-soft">
          <h2 className="text-lg sm:text-2xl font-bold">رؤيتنا</h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-6 sm:leading-7 text-burgundy/80">أن نكون المتجر الأول لعشاق الأزياء العربية الحديثة.</p>
        </div>
        <div className="rounded-xl sm:rounded-[2rem] border border-burgundy/10 bg-white p-5 sm:p-8 shadow-soft">
          <h2 className="text-lg sm:text-2xl font-bold">مهمتنا</h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-6 sm:leading-7 text-burgundy/80">تقديم تجربة متكاملة بين المتجر الإلكتروني ونظام نقاط البيع الخلفي.</p>
        </div>
        <div className="rounded-xl sm:rounded-[2rem] border border-burgundy/10 bg-beige/10 p-5 sm:p-8 shadow-soft sm:col-span-2 lg:col-span-1">
          <h2 className="text-lg sm:text-2xl font-bold">قيمنا</h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-6 sm:leading-7 text-burgundy/80">احترام العميل، دقة المخزون، وتأمين الدفع الذكي عبر Instapay.</p>
        </div>
      </div>

      <div className="rounded-2xl sm:rounded-[2.5rem] border border-burgundy/10 bg-white p-4 sm:p-10 shadow-soft">
        <h2 className="text-xl sm:text-3xl font-bold">لماذا تختار مودا بيلا؟</h2>
        <ul className="mt-4 sm:mt-6 space-y-3 sm:space-y-4 text-xs sm:text-sm leading-6 sm:leading-7 text-burgundy/80">
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
