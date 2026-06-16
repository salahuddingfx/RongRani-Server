const Joi = require('joi');

// User validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  phone: Joi.string().pattern(/^\+?[1-9]\d{0,15}$/),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string(),
  }),
});

// Product validation schemas
const productSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().min(1).max(1000).required(),
  price: Joi.number().min(0).required(),
  originalPrice: Joi.number().min(0),
  category: Joi.string().valid('electronics', 'clothing', 'home', 'books', 'sports', 'beauty', 'toys', 'automotive', 'other').required(),
  subcategory: Joi.string(),
  tags: Joi.array().items(Joi.string()),
  stock: Joi.number().min(0).required(),
  sku: Joi.string(),
  weight: Joi.number().min(0),
  dimensions: Joi.object({
    length: Joi.number().min(0),
    width: Joi.number().min(0),
    height: Joi.number().min(0),
  }),
  brand: Joi.string(),
  isActive: Joi.boolean(),
  isFeatured: Joi.boolean(),
  attributes: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    value: Joi.string().required(),
  })),
  variants: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    options: Joi.array().items(Joi.string()).required(),
  })),
  seoTitle: Joi.string(),
  seoDescription: Joi.string(),
});

// Order validation schemas
const orderSchema = Joi.object({
  items: Joi.array().items(Joi.object({
    product: Joi.string().required(),
    quantity: Joi.number().min(1).required(),
    attributes: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      value: Joi.string().required(),
    })),
  })).min(1).required(),
  shippingAddress: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().allow('', null),
    phone: Joi.string().required(),
    street: Joi.string().required(),
    union: Joi.string().required(),
    subDistrict: Joi.string().required(),
    district: Joi.string().allow('', null),
    division: Joi.string().allow('', null),
    city: Joi.string().required(),
    state: Joi.string().allow('', null),
    postalCode: Joi.string().allow('', null),
    zipCode: Joi.string().allow('', null),
    country: Joi.string().required(),
  }).required(),
  billingAddress: Joi.object({
    name: Joi.string(),
    email: Joi.string().email(),
    phone: Joi.string(),
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string(),
  }),
  paymentMethod: Joi.string().valid('card', 'paypal', 'bank', 'cod', 'bkash', 'nagad', 'rocket', 'upay').required(),
  paymentDetails: Joi.object({
    transactionId: Joi.string().allow('', null),
    senderLastDigits: Joi.string().allow('', null),
  }).optional(),
  coupon: Joi.string(),
  notes: Joi.string(),
});

// Coupon validation schemas
const couponSchema = Joi.object({
  code: Joi.string().min(3).max(20).uppercase().required(),
  description: Joi.string().max(200),
  type: Joi.string().valid('percentage', 'fixed').required(),
  value: Joi.number().min(0).required(),
  minOrderValue: Joi.number().min(0),
  maxDiscount: Joi.number().min(0),
  usageLimit: Joi.number().min(1),
  userLimit: Joi.number().min(1),
  startDate: Joi.date(),
  endDate: Joi.date().required(),
  applicableCategories: Joi.array().items(Joi.string()),
  applicableProducts: Joi.array().items(Joi.string()),
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({ message: 'Validation error', errors });
    }
    next();
  };
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  updateProfileSchema,
  productSchema,
  orderSchema,
  couponSchema,
};