const express = require('express');
const router = express.Router();
const { sendContactMessage } = require('../services/emailService');

// POST /api/contact - Send contact email
router.post('/', async (req, res) => {
    const { name, email, phone, subject, message } = req.body;

    if (!email || !message) {
        return res.status(400).json({ success: false, message: 'Email and message are required' });
    }

    try {
        const result = await sendContactMessage({
            name,
            email,
            phone,
            subject,
            message
        });

        if (result.success) {
            res.status(200).json({ success: true, message: 'Message sent successfully!' });
        } else {
            throw new Error(result.error || 'Failed to send email');
        }
    } catch (error) {
        console.error('Contact Email Error:', error);
        res.status(500).json({ success: false, message: 'Failed to send email. Please try again later.' });
    }
});

module.exports = router;
