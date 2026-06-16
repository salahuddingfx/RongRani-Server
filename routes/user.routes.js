const express = require('express');
const { getUserProfile, updateUserProfile, addToWishlist, removeFromWishlist, getUserWishlist, getUserOrders } = require('../controllers/user.controller');
const { auth } = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(auth);

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.get('/wishlist', getUserWishlist);
router.post('/wishlist/:productId', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);
router.get('/orders', getUserOrders);

module.exports = router;