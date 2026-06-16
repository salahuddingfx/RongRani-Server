const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const DeliverySetting = require('../models/DeliverySetting');
const { sendOrderConfirmation, sendEmail, sendLowStockAlert } = require('../services/emailService');
const { generateInvoice } = require('../utils/pdfGenerator');
const { calculateDelivery, getDeliveryDisplay } = require('../utils/deliveryCalculator');
const { detectFraud } = require('../utils/fraudDetector');

const emitEvent = (req, event, payload) => {
  const io = req.app?.get('io');
  if (io) {
    io.emit(event, payload);
  }
};

/**
 * @desc    Search orders by phone, email, or product name
 * @route   POST /api/orders/search
 * @access  Public
 */
const searchOrdersByContact = async (req, res) => {
  try {
    const { email, phone, productName, orderId } = req.body;

    // Validate input - at least one search method required
    if (!email && !phone && !productName && !orderId) {
      return res.status(400).json({
        message: 'Please provide email, phone number, product name, or order ID',
      });
    }

    // Prepare search query
    const searchConditions = [];

    if (email) {
      const emailLower = email.toString().trim().toLowerCase();
      searchConditions.push(
        { 'shippingAddress.email': emailLower },
        { 'guestInfo.email': emailLower }
      );
      // Also search in user collection
      const users = await User.find({ email: emailLower }).select('_id');
      if (users.length > 0) {
        searchConditions.push({ user: { $in: users.map(u => u._id) } });
      }
    }

    if (phone) {
      const phoneClean = phone.toString().trim().replace(/\s+/g, '');
      searchConditions.push(
        { 'shippingAddress.phone': phoneClean },
        { 'guestInfo.phone': phoneClean }
      );
      // Also search in user collection
      const users = await User.find({ phone: phoneClean }).select('_id');
      if (users.length > 0) {
        searchConditions.push({ user: { $in: users.map(u => u._id) } });
      }
    }

    if (productName) {
      // Search for orders containing products with matching names
      const productNameLower = productName.toString().trim().toLowerCase();
      const products = await Product.find({
        name: { $regex: productNameLower, $options: 'i' }
      }).select('_id');

      if (products.length > 0) {
        searchConditions.push({
          'items.product': { $in: products.map(p => p._id) }
        });
      }
    }

    if (orderId) {
      // Search by order ID or MongoDB _id
      const orderIdClean = orderId.toString().trim();
      searchConditions.push(
        { orderId: orderIdClean },
        { _id: orderIdClean }
      );
    }

    // Find orders
    const orders = await Order.find({ $or: searchConditions })
      .populate('items.product', 'name images price slug')
      .sort({ createdAt: -1 })
      .limit(50) // Increased limit for broader searches
      .select('-__v');

    if (orders.length === 0) {
      return res.status(404).json({
        message: 'No orders found matching your search criteria',
      });
    }

    // Return simplified order data
    const orderData = orders.map(order => ({
      _id: order._id,
      orderId: order.orderId,
      items: order.items,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: order.total,
      shippingAddress: order.shippingAddress,
      trackingNumber: order.trackingNumber,
      courierInfo: order.courierInfo,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
    }));

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders: orderData,
    });
  } catch (error) {
    console.error('Order search error:', error);
    return res.status(500).json({ message: 'Error searching orders' });
  }
};

/**
 * @desc    Calculate delivery charge for checkout preview
 * @route   POST /api/orders/calc-delivery
 * @access  Public (allows guest and authenticated users)
 */
const calculateDeliveryCharge = async (req, res) => {
  try {
    const { subtotal, district = '', city = '' } = req.body;

    // Validate subtotal
    if (typeof subtotal !== 'number' || subtotal < 0) {
      return res.status(400).json({
        message: 'Valid subtotal (number >= 0) is required',
      });
    }

    // Fetch dynamic delivery settings
    const settings = await DeliverySetting.findOne();

    // Calculate delivery
    const delivery = calculateDelivery({
      subtotal,
      district,
      city,
      settings: settings ? settings.toObject() : null,
    });

    // Return delivery info
    return res.status(200).json({
      success: true,
      delivery,
      display: getDeliveryDisplay(delivery),
    });
  } catch (error) {
    console.error('Delivery calculation error:', error);
    return res.status(500).json({ message: 'Error calculating delivery charge' });
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Public (allows guest checkout)
const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      paymentDetails,
      couponCode,
      notes,
      giftMessage,
      guestInfo, // For guest checkout
    } = req.body;

    // Determine if this is a guest order
    const isGuest = !req.user;
    const userId = req.user?._id || null;

    // For guest orders, require guestInfo
    if (isGuest && (!guestInfo?.name || !guestInfo?.phone || !guestInfo?.email)) {
      return res.status(400).json({
        message: 'Guest information (name, phone, and email) is required for guest checkout',
      });
    }

    // Validate items and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive || product.stock < item.quantity) {
        return res.status(400).json({
          message: `Product ${product?.name || 'Unknown'} is not available or insufficient stock`,
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      const firstImage = product.images?.[0];
      const imageUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url;

      orderItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: item.quantity,
        image: imageUrl,
        attributes: item.attributes || [],
      });

      // Update product stock
      product.stock -= item.quantity;
      await product.save();

      // Check for Low Stock
      if (product.stock <= 5) {
        sendLowStockAlert(product).catch(err => console.error('Low stock alert error:', err));
      }
    }

    // Apply coupon if provided
    let discount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      });

      if (!coupon) {
        return res.status(400).json({ message: 'Invalid or expired coupon' });
      }

      // Check usage limits
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return res.status(400).json({ message: 'Coupon usage limit exceeded' });
      }

      // Check minimum order value
      if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
        return res.status(400).json({
          message: `Minimum order value for this coupon is ${coupon.minOrderValue}`,
        });
      }

      // Calculate discount
      if (coupon.type === 'percentage') {
        discount = (subtotal * coupon.value) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else {
        discount = coupon.value;
      }

      // Update coupon usage
      coupon.usageCount += 1;
      await coupon.save();
    }

    // Calculate final totals using centralized delivery calculator
    const settings = await DeliverySetting.findOne();
    const tax = 0; // No tax
    const deliveryResult = calculateDelivery({
      subtotal,
      district: shippingAddress?.district || '',
      city: shippingAddress?.city || '',
      settings: settings ? settings.toObject() : null,
    });

    const shipping = deliveryResult.charge;
    const total = subtotal + tax + shipping - discount;

    // For manual mobile banking, COD (Advance Payment), and Full Prepayment, require transaction details upfront
    const manualPaymentMethods = ['bkash_manual', 'nagad_manual', 'rocket', 'upay', 'cod', 'full_payment'];
    if (manualPaymentMethods.includes(paymentMethod)) {
      const transactionId = (paymentDetails?.transactionId || '').toString().trim();
      const senderLastDigits = (paymentDetails?.senderLastDigits || '').toString().trim();
      if (!transactionId || !senderLastDigits) {
        return res.status(400).json({
          message: 'Transaction ID and sender last digits are required for manual mobile banking',
        });
      }
      if (!/^\d{4}$/.test(senderLastDigits)) {
        return res.status(400).json({
          message: 'Sender number last digits must be 4 numbers',
        });
      }
      if (transactionId.length < 6) {
        return res.status(400).json({
          message: 'Transaction ID looks too short for a manual payment',
        });
      }
    }

    const normalizedShippingAddress = {
      ...shippingAddress,
      email: shippingAddress?.email || guestInfo?.email || '',
      state: shippingAddress?.state || shippingAddress?.city || '',
      zipCode: shippingAddress?.zipCode || shippingAddress?.postalCode || '',
      postalCode: shippingAddress?.postalCode || shippingAddress?.zipCode || '',
    };

    // --- FRAUD DETECTION ---
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const fraudCheck = await detectFraud({
      guestInfo: isGuest ? guestInfo : {},
      shippingAddress: normalizedShippingAddress,
      items: orderItems,
      total,
      user: req.user
    }, clientIp);

    // Log if fraud detected
    if (fraudCheck.riskLevel !== 'Low') {
      console.warn(`⚠️ Fraud Alert: Order flagged as ${fraudCheck.riskLevel}. Reasons: ${fraudCheck.reasons.join(', ')}`);
    }
    // -----------------------

    const generateOrderId = async () => {
      let candidate = '';
      let exists = true;
      while (exists) {
        candidate = Math.floor(1000000 + Math.random() * 9000000).toString();
        exists = await Order.findOne({ orderId: candidate }).select('_id').lean();
      }
      return candidate;
    };

    const orderId = await generateOrderId();

    const order = await Order.create({
      user: userId,
      orderId,
      guestInfo: isGuest ? guestInfo : undefined,
      items: orderItems,
      shippingAddress: normalizedShippingAddress,
      billingAddress: billingAddress || normalizedShippingAddress,
      paymentMethod,
      paymentDetails: paymentDetails || {},
      subtotal,
      tax,
      shipping,
      delivery: {
        charge: deliveryResult.charge,
        label: deliveryResult.label,
        isFree: deliveryResult.isFree,
        provider: deliveryResult.provider,
        threshold: deliveryResult.threshold,
      },
      discount,
      total,
      coupon: coupon?._id,
      notes,
      giftMessage,
      // Fraud Data
      ipAddress: clientIp,
      fraudRisk: fraudCheck.riskLevel,
      fraudReason: fraudCheck.reasons,
    });

    // Send response IMMEDIATELY
    res.status(201).json(order);

    // BACKGROUND TASKS (Non-blocking)
    // 1. Emit Socket Event
    try {
      emitEvent(req, 'order:new', {
        _id: order._id,
        total: order.total,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        customerName: isGuest ? guestInfo.name : req.user?.name,
        customerEmail: isGuest ? guestInfo.email : req.user?.email,
        paymentMethod: order.paymentMethod,
        paymentDetails: order.paymentDetails,
        isGuest,
      });
    } catch (socketError) {
      console.error('Socket emit failed:', socketError);
    }

    // 2. Generate PDF & Send Emails
    (async () => {
      try {
        const recipientEmail = isGuest ? guestInfo.email : req.user?.email;
        const trackingQuery = recipientEmail ? `?email=${encodeURIComponent(recipientEmail)}` : '';

        // Generate PDF invoice
        let attachments = [];
        try {
          const pdfBuffer = await generateInvoice(order);
          attachments.push({
            filename: `Invoice-${order._id}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          });
        } catch (pdfError) {
          console.error('PDF generation failed:', pdfError);
          // Continue with email even if PDF fails
        }

        if (recipientEmail) {
          // Prepare robust data object for email template
          const emailOrderData = {
            ...order.toObject(),
            user: req.user ? req.user.toObject() : undefined,
            guestInfo: isGuest ? guestInfo : undefined,
            items: orderItems,
            billingAddress: billingAddress || normalizedShippingAddress,
            shippingAddress: normalizedShippingAddress,
            total,
            subtotal,
            shipping,
            discount,
            trackingQuery
          };

          console.log(`📧 Sending order confirmation to: ${recipientEmail}`);
          // Async call, no await to block if we were outside IIFE, but here we are in background IIFE so await is fine/good for logging
          await sendOrderConfirmation(emailOrderData, attachments);
        }

        // Send order notification to admin
        const customerEmail = isGuest ? guestInfo.email : req.user?.email;
        const customerName = isGuest ? guestInfo.name : req.user?.name;
        const customerPhone = shippingAddress.phone || (isGuest ? guestInfo.phone : req.user?.phone) || 'Not provided';

        // Format full address for admin
        const fullAddress = [
          shippingAddress.street,
          shippingAddress.union,
          shippingAddress.subDistrict,
          shippingAddress.district,
          shippingAddress.city,
          shippingAddress.zipCode || shippingAddress.postalCode
        ].filter(Boolean).join(', ');

        console.log('📧 Sending new order notification to admin...');
        await sendEmail(
          process.env.SUPER_ADMIN_EMAIL || 'info.rongrani@gmail.com',
          `🛒 New Order #${order._id.toString().substring(0, 8).toUpperCase()} - ${customerName}`,
          'adminOrderNotification',
          {
            orderId: order._id,
            customerName,
            customerEmail: customerEmail || 'Not provided',
            customerPhone,
            items: orderItems,
            subtotal: subtotal.toFixed(2),
            shipping: shipping.toFixed(2),
            discount: discount.toFixed(2),
            total: total.toFixed(2),
            paymentMethod,
            paymentDetails: paymentDetails || {},
            shippingAddress: fullAddress,
            giftMessage: giftMessage || '',
          },
          attachments // Attach the generated PDF invoice for the admin
        );
        console.log('✅ Admin order notification sent');

      } catch (backgroundError) {
        console.error('❌ Background task failed (Email/PDF):', backgroundError);
      }
    })();

  } catch (error) {
    // If response was maintained (res.headersSent check not strictly needed if we structure correctly, 
    // but safety first if the error happened BEFORE res.json)
    if (!res.headersSent) {
      res.status(500).json({ message: error.message });
    } else {
      console.error('Error after response sent:', error);
    }
  }
};

// @desc    Get user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const id = req.params.id;
    let query;

    // Check if valid ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      query = { $or: [{ _id: id }, { orderId: id }] };
    } else {
      query = { orderId: id };
    }

    const order = await Order.findOne(query).populate(
      'items.product',
      'name images price'
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns the order or is admin
    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin' &&
      req.user.role !== 'super_admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Public order tracking (guest or authenticated)
// @route   GET /api/orders/track/:id
// @access  Public (email/phone) or Private (token)
const getOrderForTracking = async (req, res) => {
  try {
    const id = req.params.id;
    let query;

    // Check if valid ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    if (isObjectId) {
      query = { $or: [{ _id: id }, { orderId: id }] };
    } else {
      query = { orderId: id };
    }

    const order = await Order.findOne(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'name images price sku');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const requester = req.user;
    const email = (req.query.email || '').toString().trim().toLowerCase();
    const phone = (req.query.phone || '').toString().trim().replace(/\s+/g, '');

    const orderEmail = (order.user?.email || order.guestInfo?.email || order.shippingAddress?.email || '').toLowerCase();
    const orderPhone = (order.user?.phone || order.guestInfo?.phone || order.shippingAddress?.phone || '').toString().replace(/\s+/g, '');

    const isOwner = requester && order.user && order.user._id.toString() === requester._id.toString();
    const isAdmin = requester && ['admin', 'super_admin'].includes(requester.role);
    const isVerifiedContact = (!!email && orderEmail && orderEmail === email) || (!!phone && orderPhone && orderPhone === phone);

    if (!isOwner && !isAdmin && !isVerifiedContact) {
      return res.status(403).json({ message: 'Not authorized to track this order' });
    }

    res.json({
      _id: order._id,
      orderId: order.orderId,
      user: order.user ? {
        name: order.user.name,
        email: order.user.email,
        phone: order.user.phone,
      } : null,
      guestInfo: order.guestInfo || null,
      items: order.items,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: order.total,
      shippingAddress: order.shippingAddress,
      courierInfo: order.courierInfo || null,
      trackingNumber: order.trackingNumber || null,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, trackingNumber, paymentStatus, isPaid } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update Order Status
    if (orderStatus) {
      // If status is changing to delivered, increment salesCount for products
      if (orderStatus === 'delivered' && order.orderStatus !== 'delivered') {
        order.deliveredAt = new Date();

        // Logically increment salesCount for each item
        for (const item of order.items) {
          try {
            const product = await Product.findById(item.product);
            if (product) {
              product.salesCount = (product.salesCount || 0) + item.quantity;
              await product.save();
            }
          } catch (itemErr) {
            console.error(`Failed to update salesCount for product ${item.product}:`, itemErr);
          }
        }
      }
      order.orderStatus = orderStatus;
    }

    // Update Tracking
    if (trackingNumber) order.trackingNumber = trackingNumber;

    // Update Payment Status (User Request: "parcel deliverd hoya gele oita admin change kore dite parbe paid hisebe")
    // This allows admin to verify payment and mark it as 'paid'
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;

      // If status becomes PAID, mark isPaid=true so it counts in revenue
      if (paymentStatus === 'paid' && !order.isPaid) {
        order.isPaid = true;
        order.paidAt = new Date();
      }
      // Allow reverting to unpaid if needed (e.g. error)
      else if (paymentStatus !== 'paid' && order.isPaid) {
        order.isPaid = false;
        order.paidAt = null;
      }
    }

    // Direct isPaid toggle (to fix admin dashboard issues)
    if (isPaid !== undefined) {
      order.isPaid = isPaid;
      if (isPaid && !order.paidAt) {
        order.paidAt = new Date();
        order.paymentStatus = 'paid';
      } else if (!isPaid) {
        order.paidAt = null;
        if (order.paymentStatus === 'paid') order.paymentStatus = 'pending';
      }
    }

    await order.save();

    // Emit real-time update for dashboard
    emitEvent(req, 'order:updated', order);

    // Send status update email in BACKGROUND
    (async () => {
      try {
        const recipientEmail = order.user ? (await User.findById(order.user))?.email : order.guestInfo?.email;
        const recipientName = order.user ? (await User.findById(order.user))?.name : order.guestInfo?.name;

        if (recipientEmail) {
          const trackingQuery = recipientEmail ? `?email=${encodeURIComponent(recipientEmail)}` : '';
          await sendEmail(
            recipientEmail,
            'Order Update - RongRani',
            'orderStatusUpdate',
            {
              name: recipientName || 'Customer',
              orderId: order._id,
              status: orderStatus || order.orderStatus, // show current status
              paymentStatus: paymentStatus || order.paymentStatus,
              trackingNumber: trackingNumber || order.trackingNumber,
              trackingQuery,
            }
          );
        }
      } catch (emailError) {
        console.error('Status update email failed (background):', emailError);
      }
    })();

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    if (order.orderStatus !== 'pending' && order.orderStatus !== 'processing') {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledReason = reason;
    await order.save();

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
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
      .populate('user', 'name email')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({
      orders,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate invoice
// @route   GET /api/orders/:id/invoice
// @access  Private
const generateOrderInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email address phone')
      .populate('items.product', 'name price description sku');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const requester = req.user;
    const email = (req.query.email || '').toString().trim().toLowerCase();
    const phone = (req.query.phone || '').toString().trim().replace(/\s+/g, '');

    const orderEmail = (order.user?.email || order.guestInfo?.email || order.shippingAddress?.email || '').toLowerCase();
    const orderPhone = (order.user?.phone || order.guestInfo?.phone || order.shippingAddress?.phone || '').toString().replace(/\s+/g, '');

    const isOwner = requester && order.user && order.user._id.toString() === requester._id.toString();
    const isAdmin = requester && ['admin', 'super_admin'].includes(requester.role);
    const isVerifiedContact = (!!email && orderEmail && orderEmail === email) || (!!phone && orderPhone && orderPhone === phone);

    if (!isOwner && !isAdmin && !isVerifiedContact) {
      return res.status(403).json({ message: 'Not authorized to view this invoice' });
    }

    const invoiceBuffer = await generateInvoice(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);
    res.send(invoiceBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  calculateDeliveryCharge,
  createOrder,
  getMyOrders,
  getOrderById,
  getOrderForTracking,
  searchOrdersByContact,
  updateOrderStatus,
  cancelOrder,
  getOrders,
  generateOrderInvoice,
};