const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  template: {
    type: String,
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    default: 'pending',
  },
  error: String,
  sentAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index
emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ to: 1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);