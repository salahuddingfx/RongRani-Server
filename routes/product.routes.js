const express = require('express');
const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getCategories,
    getTags,
    searchProducts,
    submitReview,
    getProductReviews,
    canReviewProduct,
    uploadImage
} = require('../controllers/product.controller');
const { auth, authorize } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

const router = express.Router();

// Public routes - Static routes BEFORE dynamic :id routes
router.get('/search', searchProducts);
router.get('/categories', getCategories);
router.get('/tags', getTags);

// Dynamic product routes
router.get('/:id', getProduct);
router.get('/:id/reviews', getProductReviews);
router.get('/:id/can-review', canReviewProduct);
router.post('/:id/reviews', submitReview);

// List all products
router.get('/', getProducts);

// Admin only routes
router.post('/upload', auth, authorize(['admin', 'super_admin']), upload.single('image'), uploadImage);
router.post('/', auth, authorize(['admin', 'super_admin']), createProduct);
router.put('/:id', auth, authorize(['admin', 'super_admin']), updateProduct);
router.delete('/:id', auth, authorize(['admin', 'super_admin']), deleteProduct);

module.exports = router;