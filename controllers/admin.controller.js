const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Banner = require('../models/Banner');
const EmailLog = require('../models/EmailLog');
const HotOffer = require('../models/HotOffer');
const DeliverySetting = require('../models/DeliverySetting');
const Review = require('../models/Review');
const steadfastService = require('../utils/steadfastService');

const emitEvent = (req, event, payload) => {
  const io = req.app?.get('io');
  if (io) {
    io.emit(event, payload);
  }
};

const getOrCreateDeliverySettings = async () => {
  const existing = await DeliverySetting.findOne();
  if (existing) return existing;
  return DeliverySetting.create({});
};

const updateProductReviewStats = async (productId) => {
  const results = await Review.aggregate([
    { $match: { product: productId, status: 'approved' } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const stats = results[0] || { avgRating: 0, count: 0 };
  const rating = stats.avgRating ? Number(stats.avgRating.toFixed(2)) : 0;

  await Product.findByIdAndUpdate(productId, {
    rating,
    reviewCount: stats.count || 0,
  });
};

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    const lowStockProducts = await Product.find({ stock: { $lt: 10 }, isActive: true })
      .select('name stock')
      .sort({ stock: 1 })
      .limit(10);

    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const orderStatusCounts = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]);

    const categoryCounts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    res.json({
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue: totalRevenue[0]?.total || 0,
      recentOrders,
      lowStockProducts,
      monthlyRevenue,
      orderStatusCounts,
      categoryCounts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const pageSize = 20;
    const page = Number(req.query.pageNumber) || 1;
    const search = req.query.search;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const count = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({
      users,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;
    user.phone = req.body.phone || user.phone;
    user.address = req.body.address || user.address;

    const updatedUser = await user.save();

    emitEvent(req, 'user:updated', {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      address: updatedUser.address,
    });

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      address: updatedUser.address,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    emitEvent(req, 'user:role-updated', {
      _id: user._id,
      role: user.role,
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting super admin
    if (user.role === 'super_admin') {
      return res.status(400).json({ message: 'Cannot delete super admin' });
    }

    await User.findByIdAndDelete(req.params.id);
    emitEvent(req, 'user:deleted', { _id: req.params.id });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const pageSize = 20;
    const page = Number(req.query.pageNumber) || 1;
    const status = req.query.status;
    const paymentStatus = req.query.paymentStatus;

    let query = {};

    if (status) query.orderStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const count = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'name email') // Will be null for guest orders
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .lean(); // Use lean() for better performance and null handling

    // Format orders to handle guest orders
    const formattedOrders = orders.map(order => ({
      ...order,
      customerName: order.user ? order.user.name : order.guestInfo?.name || 'Guest',
      customerEmail: order.user ? order.user.email : order.guestInfo?.email || 'N/A',
      isGuest: !order.user
    }));

    res.json({
      orders: formattedOrders,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id
// @access  Private/Admin
const updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const previousStatus = order.orderStatus;
    const previousPaymentStatus = order.paymentStatus;

    order.orderStatus = req.body.orderStatus || order.orderStatus;
    order.paymentStatus = req.body.paymentStatus || order.paymentStatus;
    order.isPaid = req.body.isPaid !== undefined ? req.body.isPaid : order.isPaid;
    order.trackingNumber = req.body.trackingNumber || order.trackingNumber;
    order.notes = req.body.notes || order.notes;

    // Support editing pricing
    if (req.body.subtotal !== undefined) order.subtotal = req.body.subtotal;
    if (req.body.shipping !== undefined) order.shipping = req.body.shipping;
    if (req.body.discount !== undefined) order.discount = req.body.discount;
    if (req.body.total !== undefined) order.total = req.body.total;

    // Support editing shipping paid status
    if (req.body.isShippingPaid !== undefined) {
      if (!order.delivery) order.delivery = {};
      order.delivery.isShippingPaid = req.body.isShippingPaid;
    }

    // Support editing customer info and shipping address
    if (req.body.shippingAddress) {
      order.shippingAddress = {
        ...order.shippingAddress,
        ...req.body.shippingAddress,
      };
    }

    if (req.body.guestInfo) {
      order.guestInfo = {
        ...order.guestInfo,
        ...req.body.guestInfo,
      };
    }

    // Handle Revenue Tracking Logic (isPaid/paidAt)
    if (order.paymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
      order.isPaid = true;
      order.paidAt = new Date();
    } else if (order.paymentStatus !== 'paid' && previousPaymentStatus === 'paid') {
      order.isPaid = false;
      order.paidAt = null;
    }

    // Direct isPaid toggle handling
    if (req.body.isPaid === true && !order.paidAt) {
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = 'paid';
    } else if (req.body.isPaid === false) {
      order.isPaid = false;
      order.paidAt = null;
      if (order.paymentStatus === 'paid') order.paymentStatus = 'pending';
    }

    // If Delivered, set deliveredAt
    if (order.orderStatus === 'delivered' && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    const updatedOrder = await order.save({ validateBeforeSave: false });

    // Emit event for real-time dashboard updates
    emitEvent(req, 'order:updated', updatedOrder);

    // Check for status change to trigger emails
    if (order.orderStatus !== previousStatus) {
      // Send status update email in BACKGROUND
      (async () => {
        try {
          const { sendOrderStatusUpdate, sendReviewRequest } = require('../services/emailService');
          const customerEmail = order.user ? order.user.email : order.guestInfo?.email;
          const customerName = order.user ? order.user.name : order.guestInfo?.name || 'Customer';

          if (customerEmail) {
            const trackingQuery = customerEmail ? `?email=${encodeURIComponent(customerEmail)}` : '';
            console.log(`📧 Status changed to ${order.orderStatus}. Sending email to ${customerEmail}...`);

            // Send primary status update email
            await sendOrderStatusUpdate(
              customerEmail,
              customerName,
              order._id,
              order.orderStatus,
              order.trackingNumber,
              trackingQuery
            );

            // If Delivered, send Review Request
            if (order.orderStatus === 'delivered') {
              await sendReviewRequest(
                customerEmail,
                customerName,
                order._id,
                order.items,
                trackingQuery
              );
            }
          }
        } catch (emailError) {
          console.error('❌ Failed to send status update/review email (background):', emailError);
        }
      })();
    }

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete order
// @route   DELETE /api/admin/orders/:id
// @access  Private/Admin
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    emitEvent(req, 'order:deleted', { _id: req.params.id });
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send order to Steadfast Courier
// @route   POST /api/admin/orders/:id/send-to-courier
// @access  Private/Admin
const sendToCourier = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if already sent to courier
    if (order.courierInfo?.consignmentId) {
      return res.status(400).json({
        message: 'Order already sent to courier',
        trackingCode: order.courierInfo.trackingCode
      });
    }

    // Prepare order data for Steadfast
    const details = req.body?.courierDetails || {};

    const rawPhone = details.recipientPhone || order.shippingAddress?.phone || order.guestInfo?.phone || '';
    let normalizedPhone = rawPhone.toString().replace(/\D/g, '');
    if (normalizedPhone.startsWith('880')) {
      normalizedPhone = normalizedPhone.slice(2);
    }
    if (normalizedPhone.length === 10 && normalizedPhone.startsWith('1')) {
      normalizedPhone = `0${normalizedPhone}`;
    }
    if (normalizedPhone.length > 11) {
      normalizedPhone = normalizedPhone.slice(-11);
    }

    const recipientName = details.recipientName || order.shippingAddress?.name || order.guestInfo?.name || 'Customer';
    const recipientEmail = details.recipientEmail || order.shippingAddress?.email || order.guestInfo?.email || '';
    const alternatePhone = details.alternatePhone || '';
    const addressLine = details.addressLine || order.shippingAddress?.street || order.shippingAddress?.address || '';
    const union = details.union || order.shippingAddress?.union || '';
    const subDistrict = details.subDistrict || order.shippingAddress?.subDistrict || '';
    const district = details.district || order.shippingAddress?.district || '';
    const division = details.division || order.shippingAddress?.division || '';
    const city = details.city || order.shippingAddress?.city || '';
    const postalCode = details.postalCode || order.shippingAddress?.postalCode || order.shippingAddress?.zipCode || '0000';

    const itemDescription = details.itemDescription || order.items.map((item) => `${item.name} x${item.quantity}`).join(', ');
    const weightKg = details.weightKg ? Number(details.weightKg) : undefined;
    const deliveryTypeRaw = details.deliveryType || 'home';
    const deliveryTypeMap = {
      home: 'home_delivery',
      point: 'point_delivery',
    };
    const deliveryType = deliveryTypeMap[deliveryTypeRaw] || deliveryTypeRaw;
    const parcelValue = details.parcelValue ? Number(details.parcelValue) : undefined;

    // Shorten Invoice ID for Courier API (Use last 8 chars to be safe and unique enough)
    // Steadfast often errors on very long invoice IDs
    // Use short orderId for invoice if available, else fallback to ObjectId suffix
    const invoiceId = order.orderId || order._id.toString().slice(-8).toUpperCase();
    const invoice = details.invoice || `RR-${invoiceId}`;

    const rawNote = details.note || order.notes || `Order from RongRani - ${order.items.length} items`;
    const note = rawNote.toString().replace(/[^\x20-\x7E]/g, '').trim() || 'Order from RongRani';
    const codAmount = typeof details.codAmount !== 'undefined'
      ? Number(details.codAmount)
      : (order.paymentMethod === 'cod' ? Number(order.total) : 0);

    const orderData = {
      invoice,
      recipientName,
      recipientPhone: normalizedPhone,
      recipientEmail,
      alternatePhone,
      recipientAddress: [
        addressLine,
        union,
        subDistrict,
        district,
        division,
        city,
        postalCode,
      ].filter(Boolean).join(', '),
      codAmount,
      note,
      itemDescription,
      weightKg,
      deliveryType,
      parcelValue,
    };

    const isPlaceholderValue = (value) => {
      const text = (value || '').toString().trim().toLowerCase();
      if (!text) return true;
      if (['none', 'n/a', 'na', 'null', 'undefined'].includes(text)) return true;
      return /\b(none|n\/a|null|undefined)\b/.test(text);
    };

    const missingFields = [];
    if (isPlaceholderValue(orderData.recipientName)) {
      missingFields.push('recipientName');
    }
    if (isPlaceholderValue(orderData.recipientPhone)) {
      missingFields.push('recipientPhone');
    }
    if (isPlaceholderValue(addressLine)) {
      missingFields.push('addressLine');
    }
    if (isPlaceholderValue(city)) {
      missingFields.push('city');
    }
    if (isPlaceholderValue(orderData.recipientAddress) || orderData.recipientAddress.length < 5) {
      missingFields.push('recipientAddress');
    }
    if (isPlaceholderValue(itemDescription)) {
      missingFields.push('itemDescription');
    }
    if (!weightKg || Number.isNaN(weightKg) || weightKg <= 0) {
      missingFields.push('weightKg');
    }
    if (isPlaceholderValue(deliveryType)) {
      missingFields.push('deliveryType');
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required shipping info for courier',
        details: { missingFields },
      });
    }

    if (orderData.recipientPhone.length !== 11 || !orderData.recipientPhone.startsWith('01')) {
      return res.status(400).json({
        message: 'Invalid recipient phone for courier (must start with 01 and be 11 digits)',
        details: { recipientPhone: rawPhone },
      });
    }

    // Send to Steadfast
    const result = await steadfastService.createOrder(orderData);

    if (!result.success) {
      return res.status(400).json({
        message: result.error || 'Failed to send order to courier',
        details: result.details
      });
    }

    // Update order with courier info
    order.courierInfo = {
      consignmentId: result.consignmentId,
      trackingCode: result.trackingCode,
      sentAt: new Date(),
      courierName: 'Steadfast',
    };
    order.courierDetails = {
      recipientName,
      recipientPhone: normalizedPhone,
      recipientEmail,
      alternatePhone,
      addressLine,
      union,
      subDistrict,
      district,
      division,
      city,
      postalCode,
      itemDescription,
      weightKg,
      deliveryType,
      parcelValue,
      invoice,
      note,
    };
    order.trackingNumber = result.trackingCode;

    // Update status if not already processing
    if (order.orderStatus === 'pending' || order.orderStatus === 'confirmed') {
      order.orderStatus = 'processing';
    }

    await order.save();

    // Send notification email to customer
    try {
      const { sendEmail } = require('../services/emailService');
      const customerEmail = order.user ? order.user.email : order.guestInfo?.email;
      const customerName = order.user ? order.user.name : order.guestInfo?.name || 'Customer';
      const trackingQuery = customerEmail ? `?email=${encodeURIComponent(customerEmail)}` : '';

      if (customerEmail) {
        console.log(`📧 Sending courier notification to ${customerEmail}...`);
        await sendEmail(
          customerEmail,
          `📦 Your Order #${order._id} is On The Way! - RongRani`,
          'orderStatusUpdate',
          {
            name: customerName,
            orderId: order._id,
            status: 'Out for Delivery',
            trackingNumber: result.trackingCode,
            trackingQuery,
          }
        );
        console.log('✅ Courier notification email sent successfully');
      }
    } catch (emailError) {
      console.error('❌ Failed to send courier notification email:', emailError);
      // Don't block the response if email fails
    }

    emitEvent(req, 'order:sent-to-courier', {
      _id: order._id,
      trackingCode: result.trackingCode,
      consignmentId: result.consignmentId,
    });

    res.json({
      message: result.message,
      order: order,
      courierInfo: {
        consignmentId: result.consignmentId,
        trackingCode: result.trackingCode,
        courierName: 'Steadfast',
      },
    });
  } catch (error) {
    console.error('❌ Error sending to courier:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all products
// @route   GET /api/admin/products
// @access  Private/Admin
const getAllProducts = async (req, res) => {
  try {
    const pageSize = 20;
    const page = Number(req.query.pageNumber) || 1;
    const search = req.query.search;

    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const count = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({
      products,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create coupon
// @route   POST /api/admin/coupons
// @access  Private/Admin
const createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create({
      ...req.body,
      createdBy: req.user._id,
    });

    emitEvent(req, 'coupon:created', coupon);
    res.status(201).json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all coupons
// @route   GET /api/admin/coupons
// @access  Private/Admin
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update coupon
// @route   PUT /api/admin/coupons/:id
// @access  Private/Admin
const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    emitEvent(req, 'coupon:updated', coupon);
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete coupon
// @route   DELETE /api/admin/coupons/:id
// @access  Private/Admin
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    emitEvent(req, 'coupon:deleted', { _id: req.params.id });
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create banner
// @route   POST /api/admin/banners
// @access  Private/Admin
const createBanner = async (req, res) => {
  try {
    const imageData = typeof req.body.image === 'string'
      ? { url: req.body.image.trim() }
      : req.body.image;

    const banner = await Banner.create({
      ...req.body,
      image: imageData,
      createdBy: req.user._id,
    });
    emitEvent(req, 'banner:created', banner);
    res.status(201).json(banner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all banners
// @route   GET /api/admin/banners
// @access  Private/Admin
const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find({}).sort({ order: 1 });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update banner
// @route   PUT /api/admin/banners/:id
// @access  Private/Admin
const updateBanner = async (req, res) => {
  try {
    let updateData = { ...req.body };
    if (req.body.image) {
      updateData.image = typeof req.body.image === 'string'
        ? { url: req.body.image.trim() }
        : req.body.image;
    }

    const banner = await Banner.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }
    emitEvent(req, 'banner:updated', banner);
    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete banner
// @route   DELETE /api/admin/banners/:id
// @access  Private/Admin
const deleteBanner = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    // Delete image from cloudinary if it exists
    if (banner.image && banner.image.publicId) {
      const cloudinary = require('../utils/cloudinaryConfig').cloudinary;
      await cloudinary.uploader.destroy(banner.image.publicId).catch(err => console.error('Cloudinary delete failed:', err));
    }

    await Banner.findByIdAndDelete(req.params.id);
    emitEvent(req, 'banner:deleted', { _id: req.params.id });
    res.json({ message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get email logs
// @route   GET /api/admin/emails
// @access  Private/Admin
const getEmailLogs = async (req, res) => {
  try {
    const pageSize = 50;
    const page = Number(req.query.pageNumber) || 1;

    const count = await EmailLog.countDocuments();
    const logs = await EmailLog.find()
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({
      logs,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resend email
// @route   POST /api/admin/emails/:id/resend
// @access  Private/Admin
const resendEmail = async (req, res) => {
  try {
    const emailLog = await EmailLog.findById(req.params.id);
    if (!emailLog) {
      return res.status(404).json({ message: 'Email log not found' });
    }

    // Resend logic here
    res.json({ message: 'Email resent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get reports summary
// @route   GET /api/admin/reports/summary
// @access  Private/Admin
const getReportsSummary = async (req, res) => {
  try {
    const revenueByDay = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const orderStatusCounts = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]);

    const categoryCounts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    res.json({ revenueByDay, orderStatusCounts, categoryCounts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get delivery settings
// @route   GET /api/admin/settings/delivery
// @access  Private/Admin
const getDeliverySettings = async (req, res) => {
  try {
    const settings = await getOrCreateDeliverySettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update delivery settings
// @route   PUT /api/admin/settings/delivery
// @access  Private/Admin
const updateDeliverySettings = async (req, res) => {
  try {
    const settings = await getOrCreateDeliverySettings();
    const updated = await DeliverySetting.findByIdAndUpdate(
      settings._id,
      {
        chittagongFee: req.body.chittagongFee || req.body.dhakaFee,
        outsideChittagongFee: req.body.outsideChittagongFee || req.body.outsideDhakaFee,
        freeShippingThreshold: req.body.freeShippingThreshold,
        updatedBy: req.user?._id,
      },
      { new: true, runValidators: true }
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get hot offer (admin)
// @route   GET /api/admin/hot-offer
// @access  Private/Admin
const getHotOfferAdmin = async (req, res) => {
  try {
    const offer = await HotOffer.findOne().sort({ updatedAt: -1 });
    res.json(offer || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upsert hot offer
// @route   PUT /api/admin/hot-offer
// @access  Private/Admin
const upsertHotOffer = async (req, res) => {
  try {
    const existing = await HotOffer.findOne().sort({ updatedAt: -1 });
    if (existing) {
      const updated = await HotOffer.findByIdAndUpdate(
        existing._id,
        { ...req.body, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );
      emitEvent(req, 'hot_offer:updated', updated);
      return res.json(updated);
    }

    const created = await HotOffer.create({
      ...req.body,
      createdBy: req.user?._id,
    });
    emitEvent(req, 'hot_offer:updated', created);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get active hot offer (public)
// @route   GET /api/promotions/hot-offer
// @access  Public
const getActiveHotOffer = async (req, res) => {
  try {
    const now = new Date();
    const offer = await HotOffer.findOne({
      isActive: true,
      startDate: { $lte: now },
      $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }],
    }).sort({ updatedAt: -1 });

    res.json(offer || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all reviews (admin)
// @route   GET /api/admin/reviews
// @access  Private/Admin
const getAllReviews = async (req, res) => {
  try {
    const status = req.query.status;
    const query = status ? { status } : {};
    const reviews = await Review.find(query)
      .populate('product', 'name category')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update review status
// @route   PUT /api/admin/reviews/:id/status
// @access  Private/Admin
const updateReviewStatus = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await updateProductReviewStats(review.product);
    emitEvent(req, 'review:updated', review);
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete review
// @route   DELETE /api/admin/reviews/:id
// @access  Private/Admin
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await updateProductReviewStats(review.product);
    emitEvent(req, 'review:deleted', { _id: review._id });
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getReportsSummary,
  getAllUsers,
  getUserById,
  updateUser,
  updateUserRole,
  deleteUser,
  getAllOrders,
  updateOrder,
  deleteOrder,
  sendToCourier,
  getAllProducts,
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
  getActiveHotOffer,
  getAllReviews,
  updateReviewStatus,
  deleteReview
};