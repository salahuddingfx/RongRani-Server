const express = require('express');
const { getActiveHotOffer } = require('../controllers/admin.controller');

const router = express.Router();

router.get('/hot-offer', getActiveHotOffer);

module.exports = router;
