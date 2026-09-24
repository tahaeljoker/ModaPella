import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

export default function AdminUpdates() {
  const navigate = useNavigate();
  const [selectedCase, setSelectedCase] = useState('returns');

  const updatesList = [
    {
      id: 'returns-profit',
      badge: 'الأثر الأكبر على الأرباح',
      badgeColor: 'rose',
      title: 'معالجة أرباح المرتجعات عبر الفترات الزمنية',
      date: 'سبتمبر 2026',
      summary: 'إلغاء خصم كامل قيمة الفاتورة من أرباح الشهر الجاري، وحصر الخصم على هامش الربح الفعلي فقط مع استرداد تكلفة البضاعة للمخزن.',
      before: {
        title: 'قبل التعديل (النظام القديم)',
        items: [
          'كانت الفواتير المرتجعة تُحسب كـ 100% ربح خالص على الورق لأن تكلفتها كانت تتصفر.',
          'العميل كان يرى ربحاً وهمياً (+7,000 ج.م تقريباً) لبضاعة مرجوعة وفلوسها خرجت من الدرج.',
          'عند خصم المرتجع في شهر جديد، كان يخصم الـ 7,000 كاملة من مبيعات الشهر الجديد مما يقلب الربح سالباً بشكل مضلل.'
        ],
        status: 'خطر أرباح وهمية',
        statusColor: 'text-rose-600 bg-rose-50 border-rose-200'
      },
      after: {
        title: 'بعد التعديل (النظام المحاسبي الدقيق)',
        items: [
          'يُخصم هامش الربح فقط من الأرباح (مثلاً 200 ج.م من أصل 600 ج.م)، وليس كامل الفاتورة.',
          'تُرد تكلفة البضاعة فوراً كأصل متاح في المخزن (COGS Recovery) فتتعادل الحسابات.',
          'الكاش يخرج في نفس لحظة الاسترجاع لمطابقة درج النقدية بالمليم.'
        ],
        status: 'مطابق للمعايير المحاسبية 100%',
        statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200'
      },
      formula: 'أثر المرتجع على مجمل الربح = - (سعر البيع المسترد - تكلفة البضاعة الأصلية) = - هامش الربح فقط'
    },
    {
      id: 'liquidity-returns',
      badge: 'إصلاح السيولة والخزنة',
      badgeColor: 'blue',
      title: 'فصل مرتجعات المبيعات عن تدفق سيولة الخزنة (حل الخصم المزدوج)',
      date: 'سبتمبر 2026',
      summary: 'إلغاء الخصم المزدوج الظاهري في تقرير الخزنة والـ Z-Report، بحيث تبدأ معادلة سيولة الخزنة بالمقبوضات الفعلية الإجمالية ثم تخصم المرتجع ليتطابق الدرج بالمليم.',
      before: {
        title: 'قبل التعديل (الخلل الحسابي)',
        items: [
          'كانت نافذة سيولة الخزنة تعرض كاش المبيعات بعد خصم المرتجع (0 ج.م مثلاً)، ثم تخصم المرتجع (-2,500 ج.م) مرة ثانية!',
          'تقرير الـ Z-Report كان يطبع مبيعات صافية ثم يطرح المرتجعات مرة أخرى كبند منفصل مما يخلق عجزاً وهمياً.',
          'العميل كان يشعر بأن المرتجع خُصم مرتين (مرة من المبيعات ومرة من الخزنة بدون تطابق حسابي).'
        ],
        status: 'تناقض حسابي ظاهري',
        statusColor: 'text-rose-600 bg-rose-50 border-rose-200'
      },
      after: {
        title: 'بعد التعديل (التدفق النقدي السليم)',
        items: [
          'تبدأ معادلة الخزنة بالمقبوضات النقدية الإجمالية (2,500 ج.م كاش + 1,000 ج.م إنستاباي = 3,500 ج.م).',
          'يُخصم المرتجع مرة واحدة فعلية (-2,500 ج.م) ليعطي صافي المقبوضات (1,000 ج.م) بدقة مطلقة.',
          'تخصم مصاريف التشغيل والمسحوبات للوصول لصافي السيولة النقدية المتطابقة مع عد الدرج بالمليم (500 ج.م).'
        ],
        status: 'معادلة متطابقة 100%',
        statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200'
      },
      formula: 'صافي حركة السيولة = (المقبوضات الإجمالية - مرتجعات العملاء) - (المصاريف + الموردين + المسحوبات)'
    },
    {
      id: 'statements-trace',
      badge: 'شفافية وتدقيق',
      badgeColor: 'amber',
      title: 'كشف حساب المرتجعات: ربط البيع الأصلي بالاسترجاع',
      date: 'سبتمبر 2026',
      summary: 'إظهار تاريخ البيع الأصلي لكل فاتورة مرتجعة والمدة الزمنية المنقضية (بعد كم يوم) وتفاصيل الأصناف المستردة.',
      before: {
        title: 'قبل التعديل',
        items: [
          'كان يظهر سطر مرتجع بمبلغ فقط دون معرفة متى بيعت الفاتورة أصلاً.',
          'صعوبة تتبع هل المرتجع يخص مبيعات اليوم أم مبيعات شهر سابق.',
          'غياب تفاصيل المقاس واللون وتكلفة القطع المرتجعة في كشف الحساب.'
        ],
        status: 'بيانات غير مفصلة',
        statusColor: 'text-amber-700 bg-amber-50 border-amber-200'
      },
      after: {
        title: 'بعد التعديل',
        items: [
          'عرض تاريخ البيع وتاريخ الاسترجاع مع مؤشر المدة (مثال: "بعد 5 أيام من الشراء").',
          'بيان الأصناف المرتجعة والمقاس واللون واسم العميل ورقم هاتفه.',
          'حساب أثر الربح المسترد بشكل منفصل لكل عملية كاش أو إنستاباي.'
        ],
        status: 'تدقيق كامل لكل حركة',
        statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200'
      },
      formula: 'كشف الحساب = تاريخ البيع + تاريخ الرد + الصنف + المبلغ المسترد + هامش الربح الملغي'
    },
    {
      id: 'hierarchy-clean',
      badge: 'تنظيم وسرعة',
      badgeColor: 'purple',
      title: 'إلغاء التكرار وهرمية الشاشات المالية',
      date: 'سبتمبر 2026',
      summary: 'تحويل لوحة التحكم لـ Dashboard خفيف وسريع، وربطها بروابط سريعة لكشوف الحسابات المتخصصة.',
      before: {
        title: 'قبل التعديل',
        items: [
          'تكرار جداول المصروفات وتفاصيل الدرج في أكثر من 3 شاشات في نفس الوقت.',
          'ازدحام لوحة التحكم الرئيسية وتضارب الأرقام عند المقارنة.',
          'صعوبة وصول المدير للتقرير المالي المباشر الذي يريده.'
        ],
        status: 'ازدحام وتشتت',
        statusColor: 'text-rose-600 bg-rose-50 border-rose-200'
      },
      after: {
        title: 'بعد التعديل',
        items: [
          'لوحة التحكم أصبحت لوحة قيادة مختصرة ببطاقات سريعة للمؤشرات الكلية.',
          'إضافة شريط توجيهي في الخزنة والموردين والديون ينقل مباشرة لكشف الحساب العام.',
          'فصل عمليات الإدخال (CRUD) عن سجلات العرض والتدقيق التاريخي.'
        ],
        status: 'هرمية واضحة ومريحة',
        statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200'
      },
      formula: 'لوحة القيادة (مؤشرات) ⬅️ كشف الحساب (الحقيقة المحاسبية) ⬅️ الخزنة والموردين (عمليات يومية)'
    },
    {
      id: 'debts-fractions',
      badge: 'دقة حسابية',
      badgeColor: 'blue',
      title: 'تصفير كسور ديون العملاء ودعم السداد بالقرش',
      date: 'سبتمبر 2026',
      summary: 'معالجة الكسور العشرية العشوائية (< 1 ج.م) الناتجة عن التقريب، وإتاحة السداد بالأجزاء بدقة تامة.',
      before: {
        title: 'قبل التعديل',
        items: [
          'ظهور متبقيات ديون دقيقة مثل 0.00001 ج.م في حسابات العملاء مما يربك الكاشير.',
          'عدم إمكانية إغلاق ملف العميل المدين بالكامل بسبب كسر مليم واحد.'
        ],
        status: 'كسور عشوائية',
        statusColor: 'text-amber-700 bg-amber-50 border-amber-200'
      },
      after: {
        title: 'بعد التعديل',
        items: [
          'تصفير الكسور الأقل من جنيه تلقائياً بعد السداد لمنع تعليق العملاء.',
          'دعم إدخال سداد الديون بالأرقام العشرية ومطابقة رصيد كشف الحساب.'
        ],
        status: 'أرصدة سليمة 100%',
        statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200'
      },
      formula: 'رصيد الدين = تقريب خانتين عشريتين مع تصفير الكسور المعلقة تلقائياً'
    }
  ];

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.25em] text-burgundy/50 font-bold">التدقيق والشفافية المحاسبية</span>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              نظام معتمد ومطابق 2026
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-burgundy flex items-center gap-2">
            <span>سجل التحديثات والتسويات المالية</span>
            <span className="text-xs font-semibold text-burgundy/60">(Audit Trail & Changelog)</span>
          </h1>
          <p className="text-xs text-burgundy/70 mt-1 max-w-2xl">
            توثيق محاسبي رسمي لكل تعديل تم على معادلات النظام، مع بيان الأرقام قبل وبعد التحديث والسند المحاسبي المعتمد لمنع أي تضارب أو أرباح وهمية.
          </p>
        </div>

        {/* Quick Nav Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/statements?tab=returns')}
            className="bg-burgundy text-white hover:bg-[#650018] font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <Icon name="returns" className="w-4 h-4" />
            <span>كشف حساب المرتجعات</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/reports')}
            className="border border-burgundy/20 bg-white hover:bg-burgundy/5 text-burgundy font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <Icon name="reports" className="w-4 h-4" />
            <span>التقارير الشهرية</span>
          </button>
        </div>
      </div>

      {/* 3 Core Principles Highlight Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[1.75rem] border border-emerald-200/80 bg-emerald-50/50 p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center mb-3">
            <Icon name="check" className="w-5 h-5 text-emerald-700" />
          </div>
          <h3 className="font-bold text-sm text-emerald-950">1. مبدأ استرداد التكلفة</h3>
          <p className="text-xs text-emerald-800/80 mt-1 leading-relaxed">
            المرتجع لا يخصم سعر البيع كاملاً من أرباحك، بل يخصم <strong>هامش الربح فقط</strong>، لأن القطعة تعود للمخزن كأصل متاح للبيع ولا تُعتبر خسارة تامة.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-blue-200/80 bg-blue-50/50 p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
            <Icon name="safe" className="w-5 h-5 text-blue-700" />
          </div>
          <h3 className="font-bold text-sm text-blue-950">2. مبدأ الواقعية النقدية</h3>
          <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
            الخزنة تخرج منها الفلوس لحظة الاسترجاع، فلا يجوز ترك مبيعات وهمية في الشاشة تختلف عن الفلوس الفعلية الموجودة في درج المحل.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-amber-200/80 bg-amber-50/50 p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
            <Icon name="history" className="w-5 h-5 text-amber-700" />
          </div>
          <h3 className="font-bold text-sm text-amber-950">3. فصل الفترات الزمنية</h3>
          <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
            لو المرتجع يخص فاتورة قديمة، لا يتم تدمير أرباح الشهر الجديد بالكامل، بل تُثبت حركة الكاش اليوم وتُعوّض تكلفة البضاعة لحماية ميزان الشهر الجاري.
          </p>
        </div>
      </div>

      {/* Case Study Box (مثال عملي توضيحي بالأرقام) */}
      <div className="rounded-[2rem] border border-burgundy/15 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-burgundy/10 pb-4 mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-burgundy/50 bg-burgundy/5 px-2.5 py-0.5 rounded-full">
              دراسة حالة عملية
            </span>
            <h2 className="text-lg font-bold text-burgundy mt-1">
              كيف يحسب السيستم بضاعة بـ 600 ج.م تكلفتها 400 ج.م عند استرجاعها؟
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedCase('returns')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                selectedCase === 'returns' ? 'bg-burgundy text-white' : 'bg-burgundy/5 text-burgundy hover:bg-burgundy/10'
              }`}
            >
              في نفس الشهر
            </button>
            <button
              type="button"
              onClick={() => setSelectedCase('cross')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                selectedCase === 'cross' ? 'bg-burgundy text-white' : 'bg-burgundy/5 text-burgundy hover:bg-burgundy/10'
              }`}
            >
              مرتجع من شهر سابق
            </button>
          </div>
        </div>

        {selectedCase === 'returns' ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-rose-50/60 border border-rose-200/70 p-4">
              <p className="text-xs font-bold text-rose-800 mb-2">❌ في النظام القديم (أرباح وهمية خطيرة):</p>
              <ul className="text-xs text-rose-950 space-y-1.5 list-disc list-inside leading-relaxed">
                <li>المبيعات كانت تظل مسجلة بـ 600 ج.م رغم خروج الفلوس!</li>
                <li>تكلفة البضاعة المباعة كانت تنزل لـ 0 لأن القطعة رجعت المخزن!</li>
                <li><strong>النتيجة الكارثية:</strong> كان يحسب الـ 600 كاملة كـ "ربح صافي 100%" في جيبك، بينما في الحقيقة أنت أرجعت الـ 600 للزبون!</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-4">
              <p className="text-xs font-bold text-emerald-800 mb-2">✅ في النظام الجديد (الدقة الحقيقية بالمليم):</p>
              <ul className="text-xs text-emerald-950 space-y-1.5 list-disc list-inside leading-relaxed">
                <li>المبيعات الصافية تنخفض بـ 600 ج.م (لأن الفلوس ردت للزبون).</li>
                <li>تكلفة البضاعة (COGS) تنخفض بـ 400 ج.م (لأن القطعة رجعت رف المحل).</li>
                <li><strong>النتيجة العادلة:</strong> مجمل الربح ينقص بمقدار <strong>200 ج.م فقط</strong> (الربح الذي كان مسجلاً يُلغى)، والدرج يطابق الكاش الفعلي 100%.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-rose-50/60 border border-rose-200/70 p-4">
              <p className="text-xs font-bold text-rose-800 mb-2">❌ المشكلة السابقة لمرتجع من شهر سابق:</p>
              <ul className="text-xs text-rose-950 space-y-1.5 list-disc list-inside leading-relaxed">
                <li>الفاتورة اتباعت الشهر الماضي، والمرتجع حدث هذا الشهر.</li>
                <li>الشهر الجديد لم تكن الفاتورة مسجلة في مبيعاته.</li>
                <li><strong>النتيجة السابقة:</strong> كان يخصم الـ 600 كاملة من مبيعات الشهر الجديد دون تعويض تكلفة البضاعة، فيقلب ربح الشهر الجديد سالباً بشكل مضلل!</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-4">
              <p className="text-xs font-bold text-emerald-800 mb-2">✅ الحل المعتمد حالياً (التسوية عبر الفترات):</p>
              <ul className="text-xs text-emerald-950 space-y-1.5 list-disc list-inside leading-relaxed">
                <li>الكاش (600 ج.م) يخرج من درج اليوم لمطابقة الخزنة لحظياً.</li>
                <li>البضاعة المستردة تُضاف قيمتها الشرائية (400 ج.م) كاسترداد تكلفة (Cost Recovery).</li>
                <li><strong>النتيجة العادلة:</strong> الشهر الجديد لا يتحمل سوى <strong>-200 ج.م (هامش الربح)</strong>، ولا ينقلب سالباً برقم الفاتورة كاملة.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Updates Changelog Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-burgundy">سجل بنود التعديل المحاسبي التفصيلي</h2>
          <span className="text-xs text-burgundy/50">{updatesList.length} بنود محاسبية موثقة</span>
        </div>

        {updatesList.map((item) => (
          <div
            key={item.id}
            className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm hover:border-burgundy/25 transition space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-burgundy/5 pb-3">
              <div className="flex items-center gap-2.5">
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                  item.badgeColor === 'rose'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : item.badgeColor === 'amber'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : item.badgeColor === 'blue'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                }`}>
                  {item.badge}
                </span>
                <h3 className="font-bold text-base text-burgundy">{item.title}</h3>
              </div>
              <span className="text-xs font-semibold text-burgundy/40">{item.date}</span>
            </div>

            <p className="text-xs text-burgundy/80 font-medium leading-relaxed">
              {item.summary}
            </p>

            {/* Comparison Grid */}
            <div className="grid sm:grid-cols-2 gap-4 pt-1">
              {/* Before */}
              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800">{item.before.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${item.before.statusColor}`}>
                    {item.before.status}
                  </span>
                </div>
                <ul className="text-xs text-rose-950 space-y-1.5 list-disc list-inside leading-relaxed">
                  {item.before.items.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>

              {/* After */}
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">{item.after.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${item.after.statusColor}`}>
                    {item.after.status}
                  </span>
                </div>
                <ul className="text-xs text-emerald-950 space-y-1.5 list-disc list-inside leading-relaxed">
                  {item.after.items.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Formula badge */}
            <div className="rounded-xl bg-[#fcf9f8] border border-burgundy/10 px-4 py-2 text-[11px] font-mono text-burgundy flex items-center justify-between">
              <span className="font-bold font-sans text-xs text-burgundy/70">المعادلة المعتمدة:</span>
              <span className="dir-ltr text-left font-bold">{item.formula}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
