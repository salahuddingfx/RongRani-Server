const mongoose = require('mongoose');

const deliverySettingSchema = new mongoose.Schema({
  chittagongFee: {
    type: Number,
    default: 150,
    min: 0,
    description: 'Delivery fee within Chittagong Division (Cox\'s Bazar base)',
  },
  outsideChittagongFee: {
    type: Number,
    default: 150,
    min: 0,
    description: 'Delivery fee outside Chittagong Division',
  },
  freeShippingThreshold: {
    type: Number,
    default: 2500,
    min: 0,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

deliverySettingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('DeliverySetting', deliverySettingSchema);
