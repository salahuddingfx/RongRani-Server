const mongoose = require('mongoose');

const giftCardSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  balance: { type: Number, required: true, min: 0 },
  originalBalance: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  purchaser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipientEmail: { type: String },
  recipientName: { type: String },
  message: { type: String, maxlength: 200 },
  expiryDate: { type: Date },
  usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  transactions: [{
    amount: Number,
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    date: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('GiftCard', giftCardSchema);
