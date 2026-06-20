const GiftCard = require('../models/GiftCard');

// @desc    Get all gift cards (admin)
// @route   GET /api/admin/gift-cards
// @access  Admin
const getAllGiftCards = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const filter = {};
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (status === 'expired') filter.expiryDate = { $lt: new Date() };
    if (status === 'depleted') filter.balance = 0;
    if (search) filter.code = { $regex: search.toUpperCase(), $options: 'i' };

    const total = await GiftCard.countDocuments(filter);
    const cards = await GiftCard.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return res.json({ cards, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get all gift cards error:', error);
    return res.status(500).json({ message: 'Failed to fetch gift cards' });
  }
};

// @desc    Create a gift card (admin)
// @route   POST /api/admin/gift-cards
// @access  Admin
const createGiftCard = async (req, res) => {
  try {
    const { code, balance, recipientEmail, recipientName, message, expiryDate } = req.body || {};
    const normalizedCode = (code || '').toString().trim().toUpperCase();
    const cardBalance = Number(balance);

    if (!normalizedCode) return res.status(400).json({ message: 'Gift card code is required' });
    if (!Number.isFinite(cardBalance) || cardBalance <= 0) return res.status(400).json({ message: 'Balance must be a positive number' });

    const existing = await GiftCard.findOne({ code: normalizedCode });
    if (existing) return res.status(400).json({ message: 'Gift card code already exists' });

    const giftCard = await GiftCard.create({
      code: normalizedCode,
      balance: cardBalance,
      originalBalance: cardBalance,
      recipientEmail,
      recipientName,
      message,
      expiryDate: expiryDate || undefined,
    });

    return res.status(201).json(giftCard);
  } catch (error) {
    console.error('Create gift card error:', error);
    return res.status(500).json({ message: 'Failed to create gift card' });
  }
};

// @desc    Update a gift card (admin)
// @route   PUT /api/admin/gift-cards/:id
// @access  Admin
const updateGiftCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { balance, isActive, expiryDate, recipientEmail, recipientName, message } = req.body || {};

    const giftCard = await GiftCard.findById(id);
    if (!giftCard) return res.status(404).json({ message: 'Gift card not found' });

    if (balance !== undefined) {
      const newBalance = Number(balance);
      if (!Number.isFinite(newBalance) || newBalance < 0) return res.status(400).json({ message: 'Balance must be a non-negative number' });
      giftCard.balance = newBalance;
    }
    if (isActive !== undefined) giftCard.isActive = isActive;
    if (expiryDate !== undefined) giftCard.expiryDate = expiryDate || null;
    if (recipientEmail !== undefined) giftCard.recipientEmail = recipientEmail;
    if (recipientName !== undefined) giftCard.recipientName = recipientName;
    if (message !== undefined) giftCard.message = message;

    await giftCard.save();
    return res.json(giftCard);
  } catch (error) {
    console.error('Update gift card error:', error);
    return res.status(500).json({ message: 'Failed to update gift card' });
  }
};

// @desc    Delete a gift card (admin)
// @route   DELETE /api/admin/gift-cards/:id
// @access  Admin
const deleteGiftCard = async (req, res) => {
  try {
    const { id } = req.params;
    const giftCard = await GiftCard.findByIdAndDelete(id);
    if (!giftCard) return res.status(404).json({ message: 'Gift card not found' });
    return res.json({ success: true, message: 'Gift card deleted' });
  } catch (error) {
    console.error('Delete gift card error:', error);
    return res.status(500).json({ message: 'Failed to delete gift card' });
  }
};

// @desc    Toggle gift card active status (admin)
// @route   PATCH /api/admin/gift-cards/:id/toggle
// @access  Admin
const toggleGiftCard = async (req, res) => {
  try {
    const giftCard = await GiftCard.findById(req.params.id);
    if (!giftCard) return res.status(404).json({ message: 'Gift card not found' });
    giftCard.isActive = !giftCard.isActive;
    await giftCard.save();
    return res.json(giftCard);
  } catch (error) {
    console.error('Toggle gift card error:', error);
    return res.status(500).json({ message: 'Failed to toggle gift card' });
  }
};

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
  getAllGiftCards,
  createGiftCard,
  updateGiftCard,
  deleteGiftCard,
  toggleGiftCard,
  validateGiftCard,
  applyGiftCard,
};
