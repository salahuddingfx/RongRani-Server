const express = require('express');
const { validateGiftCard, applyGiftCard } = require('../controllers/giftCard.controller');
const { auth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/validate', validateGiftCard);
router.post('/apply', auth, applyGiftCard);

module.exports = router;
