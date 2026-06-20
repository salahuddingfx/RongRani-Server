const Coupon = require('../models/Coupon');

// @desc    Validate coupon code for a subtotal
// @route   POST /api/coupons/validate
// @access  Public
const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal } = req.body || {};
    const normalizedCode = (code || '').toString().trim().toUpperCase();
    const orderSubtotal = Number(subtotal || 0);

    if (!normalizedCode) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    if (!Number.isFinite(orderSubtotal) || orderSubtotal <= 0) {
      return res.status(400).json({ message: 'Subtotal must be a positive number' });
    }

    const coupon = await Coupon.findOne({
      code: normalizedCode,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    if (!coupon) {
      return res.status(400).json({ message: 'Invalid or expired coupon' });
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit exceeded' });
    }

    if (coupon.minOrderValue && orderSubtotal < coupon.minOrderValue) {
      return res.status(400).json({
        message: `Minimum order value for this coupon is ${coupon.minOrderValue}`,
      });
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (orderSubtotal * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    return res.json({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
      minOrderValue: coupon.minOrderValue || 0,
      maxDiscount: coupon.maxDiscount || null,
      description: coupon.description || '',
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return res.status(500).json({ message: 'Failed to validate coupon' });
  }
};

// @desc    Find best applicable coupon for a subtotal
// @route   POST /api/coupons/best
// @access  Public
const findBestCoupon = async (req, res) => {
  try {
    const { subtotal } = req.body || {};
    const orderSubtotal = Number(subtotal || 0);

    if (!Number.isFinite(orderSubtotal) || orderSubtotal <= 0) {
      return res.status(400).json({ message: 'Subtotal must be a positive number' });
    }

    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    const eligible = [];

    for (const coupon of coupons) {
      if (coupon.minOrderValue && orderSubtotal < coupon.minOrderValue) continue;
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) continue;

      let discount = 0;
      if (coupon.type === 'percentage') {
        discount = (orderSubtotal * coupon.value) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else {
        discount = coupon.value;
      }

      eligible.push({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount,
        minOrderValue: coupon.minOrderValue || 0,
        maxDiscount: coupon.maxDiscount || null,
        description: coupon.description || '',
      });
    }

    eligible.sort((a, b) => b.discount - a.discount);

    return res.json({ bestCoupon: eligible[0] || null });
  } catch (error) {
    console.error('Find best coupon error:', error);
    return res.status(500).json({ message: 'Failed to find best coupon' });
  }
};

module.exports = {
  validateCoupon,
  findBestCoupon,
};
