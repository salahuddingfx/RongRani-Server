const mongoose = require('mongoose');

const hotOfferSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  badgeText: {
    type: String,
    trim: true,
    maxlength: 40,
    default: 'Hot Offer',
  },
  discountText: {
    type: String,
    trim: true,
    maxlength: 40,
  },
  ctaText: {
    type: String,
    trim: true,
    maxlength: 30,
    default: 'Shop Now',
  },
  ctaLink: {
    type: String,
    trim: true,
    default: '/shop',
  },
  backgroundColor: {
    type: String,
    trim: true,
    default: '#FDE2E4',
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

hotOfferSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('HotOffer', hotOfferSchema);
