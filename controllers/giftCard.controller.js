const GiftCard = require('../models/GiftCard');

// @desc    Validate a gift card code
// @route   POST /api/gift-cards/validate
// @access  Public
const validateGiftCard = async (req, res) => {
  try {
    const { code } = req.body || {};
    const normalizedCode = (code || '').toString().trim().toUpperCase();

    if (!normalizedCode) {
      return res.status(400).json({ message: 'Gift card code is required' });
    }

    const giftCard = await GiftCard.findOne({ code: normalizedCode });

    if (!giftCard) {
      return res.status(404).json({ message: 'Gift card not found' });
    }

    if (!giftCard.isActive) {
      return res.status(400).json({ message: 'Gift card is inactive' });
    }

    if (giftCard.expiryDate && giftCard.expiryDate < new Date()) {
      return res.status(400).json({ message: 'Gift card has expired' });
    }

    if (giftCard.balance <= 0) {
      return res.status(400).json({ message: 'Gift card has no remaining balance' });
    }

    return res.json({
      code: giftCard.code,
      balance: giftCard.balance,
      recipientName: giftCard.recipientName || null,
    });
  } catch (error) {
    console.error('Gift card validation error:', error);
    return res.status(500).json({ message: 'Failed to validate gift card' });
  }
};

// @desc    Apply gift card to an order (deduct balance)
// @route   POST /api/gift-cards/apply
// @access  Public (called during order placement)
const applyGiftCard = async (req, res) => {
  try {
    const { code, amount, userId, orderId } = req.body || {};
    const normalizedCode = (code || '').toString().trim().toUpperCase();
    const deductAmount = Number(amount);

    if (!normalizedCode) {
      return res.status(400).json({ message: 'Gift card code is required' });
    }

    if (!Number.isFinite(deductAmount) || deductAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const giftCard = await GiftCard.findOne({ code: normalizedCode });

    if (!giftCard) {
      return res.status(404).json({ message: 'Gift card not found' });
    }

    if (!giftCard.isActive) {
      return res.status(400).json({ message: 'Gift card is inactive' });
    }

    if (giftCard.expiryDate && giftCard.expiryDate < new Date()) {
      return res.status(400).json({ message: 'Gift card has expired' });
    }

    if (giftCard.balance < deductAmount) {
      return res.status(400).json({
        message: `Insufficient gift card balance. Available: ${giftCard.balance}`,
      });
    }

    giftCard.balance -= deductAmount;

    giftCard.transactions.push({
      amount: deductAmount,
      orderId: orderId || undefined,
      date: new Date(),
    });

    if (userId && !giftCard.usedBy.some(id => id.toString() === userId)) {
      giftCard.usedBy.push(userId);
    }

    await giftCard.save();

    return res.json({
      success: true,
      remainingBalance: giftCard.balance,
    });
  } catch (error) {
    console.error('Gift card apply error:', error);
    return res.status(500).json({ message: 'Failed to apply gift card' });
  }
};

module.exports = {
  validateGiftCard,
  applyGiftCard,
};
