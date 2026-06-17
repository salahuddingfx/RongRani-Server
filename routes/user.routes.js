const express = require('express');
const { 
  getUserProfile, 
  updateUserProfile, 
  addToWishlist, 
  removeFromWishlist, 
  getUserWishlist, 
  getUserOrders,
  uploadAvatar
} = require('../controllers/user.controller');
const { auth } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

const router = express.Router();

// All routes require authentication
router.use(auth);

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.post('/avatar', upload.single('image'), uploadAvatar);
router.get('/wishlist', getUserWishlist);
router.post('/wishlist/:productId', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);
router.get('/orders', getUserOrders);

module.exports = router;