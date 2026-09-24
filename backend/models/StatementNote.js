const mongoose = require('mongoose');

const statementNoteSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true, index: true },
  note: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StatementNote', statementNoteSchema);
