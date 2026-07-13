const mongoose = require('mongoose');
const SystemNotification = require('./models/SystemNotification');
require('dotenv').config();

const dbURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/modapella';

mongoose.connect(dbURI)
  .then(async () => {
    await SystemNotification.create({
      title: 'تم تفعيل ميزة البيع الآجل (الديون) بنجاح 🚀',
      message: 'السلام عليكم، تم الانتهاء من برمجة وتفعيل ميزة البيع الآجل في شاشة الكاشير. دلوقتي تقدر تحدد طريقة الدفع "آجل" لأي زبون وتكتب المبلغ اللي دفعه، والنظام هيحسب الباقي وينزله كدين في رصيده بشكل تلقائي. تقدر تتابع ديون كل الزبائن من خلال صفحة الإدارة بكل سهولة. لو عندك أي ملاحظات عليها بلغني. تحياتي، طه.',
      type: 'feature'
    });
    console.log('Notification sent!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
