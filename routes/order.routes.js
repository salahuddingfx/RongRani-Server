const express = require('express');
const { createOrder, getOrders, getMyOrders, getOrderById, getOrderForTracking, searchOrdersByContact, updateOrderStatus, cancelOrder, generateOrderInvoice, calculateDeliveryCharge } = require('../controllers/order.controller');
const { auth, authorize, optionalAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// Calculate delivery charge (for checkout preview)
router.post('/calc-delivery', optionalAuth, calculateDeliveryCharge);

// Search orders by phone/email (no order ID needed)
router.post('/search', searchOrdersByContact);

// Create order (guest or authenticated)
router.post('/', optionalAuth, createOrder);

// Authenticated user routes
router.get('/track/:id', optionalAuth, getOrderForTracking);
router.get('/my-orders', auth, getMyOrders);
router.get('/', auth, getOrders);
router.get('/:id', auth, getOrderById);
router.put('/:id/cancel', auth, cancelOrder);
router.get('/:id/invoice', optionalAuth, generateOrderInvoice);

// Admin routes
router.put('/:id/status', auth, authorize(['admin', 'super_admin']), updateOrderStatus);

module.exports = router;