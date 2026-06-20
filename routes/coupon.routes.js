const express = require('express');
const { validateCoupon, findBestCoupon } = require('../controllers/coupon.controller');

const router = express.Router();

router.post('/validate', validateCoupon);
router.post('/best', findBestCoupon);

module.exports = router;
