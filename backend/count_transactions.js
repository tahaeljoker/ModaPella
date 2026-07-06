const connectDB = require('./config/db');
const Transaction = require('./models/Transaction');
const Shift = require('./models/Shift');

(async function(){
  await connectDB();
  try{
    const tx = await Transaction.countDocuments();
    const sh = await Shift.countDocuments();
    console.log('Transactions:', tx);
    console.log('Shifts:', sh);
  }catch(e){
    console.error('Count failed', e);
  }finally{
    process.exit(0);
  }
})();
