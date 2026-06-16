const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');

const emitEvent = (req, event, payload) => {
  const io = req.app?.get('io');
  if (io) {
    io.emit(event, payload);
  }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const showAll = req.query.all === 'true';
    const query = showAll ? {} : { isActive: true };

    const categories = await Category.find(query)
      .sort({ order: 1, name: 1 });

    // Calculate product count and order count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        // 1. Count Products in this category
        const productCount = await Product.countDocuments({
          category: category.name,
          isActive: true
        });

        // 2. Count Orders containing products from this category
        // First, find all product IDs in this category (including inactive ones to be accurate about history)
        const productsInCategory = await Product.find({ category: category.name }).select('_id');
        const productIds = productsInCategory.map(p => p._id);

        const orderCount = await Order.countDocuments({
          'items.product': { $in: productIds }
        });

        const c = category.toObject();

        // Normalize image
        if (typeof c.image === 'string') {
          c.image = { url: c.image };
        } else if (c.image && !c.image.url && typeof category.image === 'string') {
          // Handle cases where Mongoose might have returned empty object for string data
          c.image = { url: category.image };
        }

        return {
          ...c,
          productCount,
          orderCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: categoriesWithCount.length,
      categories: categoriesWithCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message,
    });
  }
};

// Get single category
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      $or: [
        { _id: req.params.id },
        { slug: req.params.id }
      ]
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const c = category.toObject();
    if (typeof c.image === 'string') {
      c.image = { url: c.image };
    } else if (c.image && !c.image.url && typeof category.image === 'string') {
      c.image = { url: category.image };
    }

    res.status(200).json({
      success: true,
      category: c,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message,
    });
  }
};

// Create category (Admin only)
exports.createCategory = async (req, res) => {
  try {
    const categoryData = { ...req.body };
    if (req.body.image) {
      categoryData.image = typeof req.body.image === 'string'
        ? { url: req.body.image.trim() }
        : req.body.image;
    }

    const category = await Category.create(categoryData);

    // Calculate initial product count
    const productCount = await Product.countDocuments({
      category: category.name,
      isActive: true
    });

    const categoryWithCount = {
      ...category.toObject(),
      productCount
    };

    emitEvent(req, 'category:created', categoryWithCount);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: categoryWithCount,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating category',
      error: error.message,
    });
  }
};

// Update category (Admin only)
exports.updateCategory = async (req, res) => {
  try {
    const oldCategory = await Category.findById(req.params.id);

    if (!oldCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const categoryData = { ...req.body };
    if (req.body.image) {
      categoryData.image = typeof req.body.image === 'string'
        ? { url: req.body.image.trim() }
        : req.body.image;
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      categoryData,
      { new: true, runValidators: true }
    );

    // If category name changed, update all products that use this category name
    if (req.body.name && req.body.name !== oldCategory.name) {
      await Product.updateMany(
        { category: oldCategory.name },
        { category: req.body.name }
      );
    }

    // Calculate updated product count
    const productCount = await Product.countDocuments({
      category: category.name,
      isActive: true
    });

    const categoryWithCount = {
      ...category.toObject(),
      productCount
    };

    emitEvent(req, 'category:updated', categoryWithCount);

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category: categoryWithCount,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating category',
      error: error.message,
    });
  }
};

// Delete category (Admin only)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    // Update products to Uncategorized
    await Product.updateMany(
      { category: category.name },
      { category: 'Uncategorized' }
    );

    emitEvent(req, 'category:deleted', { _id: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message,
    });
  }
};
