const express = require('express');
const {
	getDashboardStats,
	getReportsSummary,
	getAllUsers,
	updateUser,
	updateUserRole,
	deleteUser,
	getAllOrders,
	updateOrder,
	deleteOrder,
	sendToCourier,
	createCoupon,
	getCoupons,
	updateCoupon,
	deleteCoupon,
	createBanner,
	getBanners,
	updateBanner,
	deleteBanner,
	getEmailLogs,
	resendEmail,
	getDeliverySettings,
	updateDeliverySettings,
	getHotOfferAdmin,
	upsertHotOffer,
	getAllReviews,
	updateReviewStatus,
	deleteReview,
} = require('../controllers/admin.controller');
const { auth, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// PUBLIC ROUTES (No authentication required)
// Banners - public read access
router.get('/banners', getBanners);

// PROTECTED ROUTES (Admin only)
// All remaining routes require admin or super_admin
router.use(auth, authorize(['admin', 'super_admin']));

// Dashboard
router.get('/dashboard', getDashboardStats);
router.get('/reports/summary', getReportsSummary);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// Order management
router.get('/orders', getAllOrders);
router.put('/orders/:id', updateOrder);
router.delete('/orders/:id', deleteOrder);
router.post('/orders/:id/send-to-courier', sendToCourier);

// Coupon management
router.post('/coupons', createCoupon);
router.get('/coupons', getCoupons);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Banner management (write operations)
router.post('/banners', createBanner);
router.put('/banners/:id', updateBanner);
router.patch('/banners/:id/toggle', updateBanner);
router.delete('/banners/:id', deleteBanner);

// Hot offer management
router.get('/hot-offer', getHotOfferAdmin);
router.put('/hot-offer', upsertHotOffer);

// Delivery settings
router.get('/settings/delivery', getDeliverySettings);
router.put('/settings/delivery', updateDeliverySettings);

// Reviews moderation
router.get('/reviews', getAllReviews);
router.put('/reviews/:id/status', updateReviewStatus);
router.delete('/reviews/:id', deleteReview);

// Email logs
router.get('/email-logs', getEmailLogs);
router.post('/email-logs/:id/resend', resendEmail);

module.exports = router;