const mongoose = require('mongoose');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Category = require('../models/Category');
const ImageAsset = require('../models/ImageAsset');
const { deleteFromCloudinary } = require('../utils/cloudinaryConfig');
const { sendLowStockAlert } = require('../services/emailService');

const emitEvent = (req, event, payload) => {
  const io = req.app?.get('io');
  if (io) {
    io.emit(event, payload);
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const pageSize = Number(req.query.limit) || 12;
    const page = Number(req.query.page) || Number(req.query.pageNumber) || 1;
    const category = req.query.category;
    const subcategory = req.query.subcategory;
    const minPrice = req.query.minPrice;
    const maxPrice = req.query.maxPrice;
    const search = req.query.search;
    const sort = req.query.sort || '-createdAt';

    let query = { isActive: true };

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.$text = { $search: search };
    }

    const count = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sort)
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    // Normalize products for frontend compatibility
    const normalizedProducts = products.map(product => {
      const p = product.toObject();

      // Ensure images is an array of objects
      if (Array.isArray(p.images)) {
        p.images = p.images.map(img => {
          if (typeof img === 'string') return { url: img };
          return img;
        }).filter(img => img && img.url);
      } else {
        p.images = [];
      }

      // Ensure singular image is an object
      if (p.images.length > 0) {
        p.image = p.images[0];
      } else if (typeof p.image === 'string') {
        p.image = { url: p.image };
      }

      return p;
    });

    res.json({
      products: normalizedProducts,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProduct = async (req, res) => {
  try {
    const identifier = req.params.id;
    let product;
    
    // Check if it's a valid MongoDB ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
    
    if (isObjectId) {
      // Search by ID
      product = await Product.findById(identifier);
    } else {
      // Search by slug
      product = await Product.findOne({ slug: identifier.toLowerCase() });
    }
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Only show active products to public
    if (!product.isActive) {
      return res.status(404).json({ message: 'Product is currently unavailable' });
    }

    const p = product.toObject();

    // Normalize images
    if (Array.isArray(p.images)) {
      p.images = p.images.map(img => {
        if (typeof img === 'string') return { url: img };
        return img;
      }).filter(img => img && img.url);
    } else {
      p.images = [];
    }

    // Normalize singular image
    if (p.images.length > 0) {
      p.image = p.images[0];
    } else if (typeof p.image === 'string') {
      p.image = { url: p.image };
    }

    res.json(p);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    console.log('📦 Creating new product...');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user ? req.user._id : 'No user');

    // Validate required fields
    const { name, description, price, category, stock } = req.body;
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        message: 'Missing required fields: name, description, price, category are required'
      });
    }

    // Normalize images (handle strings or objects)
    const normalizedImages = (req.body.images || []).map(img => {
      if (typeof img === 'string') {
        return { url: img.trim() };
      }
      return img;
    }).filter(img => img.url);

    const productData = {
      ...req.body,
      images: normalizedImages,
      image: normalizedImages.length > 0 ? normalizedImages[0] : undefined,
      createdBy: req.user._id,
      stock: stock || 0,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    };

    console.log('Product data to create:', JSON.stringify(productData, null, 2));
    const product = await Product.create(productData);
    console.log('✅ Product created successfully:', product._id);

    emitEvent(req, 'product:created', product);
    res.status(201).json(product);
  } catch (error) {
    console.error('❌ Product creation failed:', error);
    res.status(500).json({
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user is admin or product creator
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && product.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }

    const previousStock = product.stock;

    // Normalize images if they are being updated
    let updateData = { ...req.body };
    if (req.body.images) {
      updateData.images = req.body.images.map(img => {
        if (typeof img === 'string') return { url: img.trim() };
        return img;
      }).filter(img => img.url);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...updateData,
        image: updateData.images && updateData.images.length > 0 ? updateData.images[0] : undefined
      },
      { new: true, runValidators: true }
    );

    emitEvent(req, 'product:updated', updatedProduct);
    if (req.body.stock !== undefined && updatedProduct.stock !== previousStock) {
      emitEvent(req, 'inventory:updated', {
        _id: updatedProduct._id,
        stock: updatedProduct.stock,
      });

      if (updatedProduct.stock <= 5 && updatedProduct.stock < previousStock) {
        sendLowStockAlert(updatedProduct).catch(err => console.error('Low stock alert error:', err));
      }
    }

    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user is admin or product creator
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && product.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    // Delete stored image assets (MongoDB) and fallback Cloudinary assets.
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        if (!image?.publicId) continue;

        if (mongoose.Types.ObjectId.isValid(image.publicId)) {
          await ImageAsset.findByIdAndDelete(image.publicId);
          continue;
        }

        try {
          await deleteFromCloudinary(image.publicId);
        } catch (error) {
          console.warn(`Failed to delete cloud image ${image.publicId}:`, error.message);
        }
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    emitEvent(req, 'product:deleted', { _id: req.params.id });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get product categories
// @route   GET /api/products/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 });

    // Calculate product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          category: category.name,
          isActive: true
        });
        return {
          ...category.toObject(),
          productCount
        };
      })
    );

    res.json(categoriesWithCount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get product tags
// @route   GET /api/products/tags
// @access  Public
const getTags = async (req, res) => {
  try {
    const tags = await Product.distinct('tags', { isActive: true });
    res.json(tags.flat());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit a review for a product (must have ordered it)
// @route   POST /api/products/:id/reviews
// @access  Public (allows both logged-in and guest users with order verification)
const submitReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment, guestEmail, orderId } = req.body;

    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({ message: 'Comment must be at least 10 characters' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user has ordered this product (for Verified Purchase badge)
    let hasOrdered = false;
    let userEmail = guestEmail || req.user?.email || null;
    let userName = req.body.guestName || req.user?.name || 'Valued Guest';

    if (req.user) {
      // Logged-in user - check order history
      const userOrders = await Order.find({
        user: req.user._id,
        orderStatus: 'delivered',
        'items.product': productId,
      });
      hasOrdered = userOrders.length > 0;
    } else if (guestEmail && orderId) {
      // Guest user - verify order with email and orderId
      const guestOrder = await Order.findById(orderId);
      if (
        guestOrder &&
        (guestOrder.guestInfo?.email === guestEmail || guestOrder.shippingAddress?.email === guestEmail) &&
        guestOrder.orderStatus === 'delivered' &&
        guestOrder.items.some((item) => item.product.toString() === productId)
      ) {
        hasOrdered = true;
        userName = guestOrder.guestInfo?.name || guestOrder.shippingAddress?.name || userName;
      }
    }

    // Check if user already reviewed this product from this email
    const existingReview = await Review.findOne({
      product: productId,
      $or: [
        { user: req.user?._id },
        { guestEmail: userEmail && userEmail !== '' ? userEmail : '___none___' },
      ],
    });

    if (existingReview && req.user) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Create review (starts as pending, needs admin approval)
    const review = await Review.create({
      product: productId,
      user: req.user?._id || null,
      guestName: !req.user ? userName : null,
      guestEmail: !req.user ? userEmail : null,
      isVerifiedPurchase: hasOrdered,
      rating,
      title: title || '',
      comment,
      status: 'approved',
    });

    // Update product review stats
    const stats = await Review.aggregate([
      { $match: { product: product._id, status: 'approved' } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      product.rating = stats[0].avgRating;
      product.reviewCount = stats[0].count;
    } else {
      product.rating = 0;
      product.reviewCount = 0;
    }

    await product.save();

    // Emit real-time event
    emitEvent(req, 'review:submitted', { review, productId });

    // Send Thank You Email
    if (userEmail) {
      // We don't await this to avoid blocking the response
      const { sendEmail } = require('../services/emailService');
      sendEmail(
        userEmail,
        'Thanks for your review! 💖',
        'reviewThankYou',
        {
          name: userName,
          productName: product.name,
          comment: comment
        }
      ).catch(err => console.error('Failed to send review email:', err));
    }

    res.status(201).json({
      message: 'Review submitted successfully! ✨',
      review,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get reviews for a product (only approved)
// @route   GET /api/products/:id/reviews
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    let productId = id;
    if (!isObjectId) {
      const product = await Product.findOne({ slug: id.toLowerCase() }).select('_id').lean();
      if (!product) {
        return res.json([]);
      }
      productId = product._id;
    }

    const reviews = await Review.find({
      product: productId,
      status: 'approved',
    })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check if user can review a product
// @route   GET /api/products/:id/can-review
// @access  Private/Public
const canReviewProduct = async (req, res) => {
  try {
    // Allow everyone to see the review form now to enable guest reviews
    res.json({ canReview: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, sort = '-createdAt' } = req.query;

    let query = { isActive: true };

    if (q) {
      query.$text = { $search: q };
    }

    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const products = await Product.find(query)
      .sort(sort)
      .limit(50);

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload image to MongoDB storage
// @route   POST /api/products/upload
// @access  Private/Admin
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const imageAsset = await ImageAsset.create({
      data: req.file.buffer,
      contentType: req.file.mimetype,
      filename: req.file.originalname,
      size: req.file.size,
      uploadedBy: req.user?._id,
    });

    const imageUrl = `${req.protocol}://${req.get('host')}/api/images/${imageAsset._id}`;

    res.json({
      url: imageUrl,
      publicId: imageAsset._id.toString(),
      storage: 'mongodb',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
  uploadImage,
};