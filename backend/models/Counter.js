const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

/**
 * Returns a collision-free sequential invoice number formatted as INV-YYYY-XXXX.
 * Uses atomic MongoDB $inc to prevent any race condition in concurrent checkouts.
 */
const getNextInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const counterId = `invoice_${year}`;
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const formattedSeq = String(counter.seq).padStart(4, '0');
  return `INV-${year}-${formattedSeq}`;
};

module.exports = {
  Counter,
  getNextInvoiceNumber
};
