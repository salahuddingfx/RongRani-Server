const express = require('express');
const controller = require('../controllers/auth.controller');
const { auth } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

// Rate limiting for auth routes is already defined in the middleware

// Public routes
router.post('/register', authLimiter, controller.register);
router.post('/login', authLimiter, controller.login);
router.post('/forgot-password', authLimiter, controller.forgotPassword);
router.post('/reset-password', authLimiter, controller.resetPassword);
router.get('/verify-email/:token', controller.verifyEmail);

// Protected routes
router.post('/logout', auth, controller.logout);
router.post('/refresh-token', controller.refreshToken);

module.exports = router;