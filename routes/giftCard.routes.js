const express = require('express');
const { validateGiftCard, applyGiftCard } = require('../controllers/giftCard.controller');

const router = express.Router();

router.post('/validate', validateGiftCard);
router.post('/apply', applyGiftCard);

module.exports = router;
