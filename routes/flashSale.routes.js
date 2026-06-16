const express = require('express');
const router = express.Router();
const {
    createFlashSale,
    getActiveFlashSale,
    updateFlashSale,
    deleteFlashSale,
    getAllFlashSales
} = require('../controllers/flashSale.controller');

const { auth, authorize } = require('../middlewares/auth.middleware');

// Public route to get the active flash sale
router.get('/active', getActiveFlashSale);

// All flash sales (Admin only)
router.get('/', auth, authorize(['admin', 'super_admin']), getAllFlashSales);

// Admin routes
router.post('/', auth, authorize(['admin', 'super_admin']), createFlashSale);
router.put('/:id', auth, authorize(['admin', 'super_admin']), updateFlashSale);
router.delete('/:id', auth, authorize(['admin', 'super_admin']), deleteFlashSale);

module.exports = router;
