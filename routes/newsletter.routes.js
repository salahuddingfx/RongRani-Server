const express = require('express');
const router = express.Router();
const Newsletter = require('../models/Newsletter');
const { sendEmail } = require('../services/emailService');

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if already subscribed
    const existing = await Newsletter.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.isActive) {
        return res.status(400).json({ message: 'This email is already subscribed!' });
      } else {
        // Reactivate subscription
        existing.isActive = true;
        existing.subscribedAt = Date.now();
        await existing.save();
        return res.json({ message: 'Welcome back! Your subscription has been reactivated.' });
      }
    }

    // Create new subscription
    const subscription = await Newsletter.create({
      email: email.toLowerCase()
    });

    // Send welcome email
    try {
      await sendEmail(
        email,
        'Welcome to RongRani Newsletter! 🎁',
        'newsletterWelcome',
        { email: email }
      );
    } catch (emailError) {
      console.error('Newsletter welcome email failed:', emailError);
      // Don't fail the subscription if email fails
    }

    res.status(201).json({
      message: 'Successfully subscribed! Check your email for a special gift.',
      subscription
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({ message: 'Subscription failed. Please try again.' });
  }
});

// Unsubscribe from newsletter
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    const subscription = await Newsletter.findOne({ email: email.toLowerCase() });
    if (!subscription) {
      return res.status(404).json({ message: 'Email not found in our subscribers list' });
    }

    subscription.isActive = false;
    await subscription.save();

    res.json({ message: 'Successfully unsubscribed from newsletter' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ message: 'Unsubscribe failed. Please try again.' });
  }
});

module.exports = router;
