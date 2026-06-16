const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');

const createTestOrder = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env file');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected\n');

    // Get test user (Try admin first, then any user)
    let user = await User.findOne({ email: 'salauddinkaderappy@gmail.com' });
    if (!user) {
      user = await User.findOne();
    }

    if (!user) {
      console.error('❌ No users found in database! Create a user first.');
      process.exit(1);
    }
    console.log(`👤 Found user: ${user.name} (${user.email})\n`);

    // Get some products for the order
    const products = await Product.find({ stock: { $gt: 0 } }).limit(5);
    if (products.length === 0) {
      console.error('❌ No products found! Seed products first.');
      process.exit(1);
    }
    console.log(`📦 Found ${products.length} products for order\n`);

    // Create order items
    const orderItems = products.map(product => ({
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: Math.floor(Math.random() * 3) + 1, // 1-3 items
      image: (product.images && product.images[0]) || 'https://via.placeholder.com/150',
      attributes: []
    }));

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = 0; // No tax
    const shipping = subtotal > 2000 ? 0 : 50;
    const discount = 0;
    const total = subtotal + tax + shipping - discount;

    // Random Bangladesh address
    const addresses = [
      {
        name: 'Ahmed Hassan',
        email: 'ahmed@example.com',
        phone: '+880 1712-345678',
        street: 'House 23, Road 5, Dhanmondi',
        city: 'Dhaka',
        state: 'Dhaka Division',
        zipCode: '1205',
        country: 'Bangladesh'
      },
      {
        name: 'Fatima Rahman',
        email: 'fatima@example.com',
        phone: '+880 1823-456789',
        street: 'Building 12, Sector 7, Uttara',
        city: 'Dhaka',
        state: 'Dhaka Division',
        zipCode: '1230',
        country: 'Bangladesh'
      },
      {
        name: 'Karim Ali',
        email: 'karim@example.com',
        phone: '+880 1934-567890',
        street: '45 CDA Avenue, Nasirabad',
        city: 'Chittagong',
        state: 'Chittagong Division',
        zipCode: '4100',
        country: 'Bangladesh'
      },
      {
        name: 'Nusrat Jahan',
        email: 'nusrat@example.com',
        phone: '+880 1645-678901',
        street: 'Villa 8, Khulshi',
        city: 'Chittagong',
        state: 'Chittagong Division',
        zipCode: '4225',
        country: 'Bangladesh'
      },
      {
        name: 'Salahuddin Ahmed',
        email: 'salah@example.com',
        phone: '+880 1556-789012',
        street: 'Plot 15, Marine Drive Road',
        city: "Cox's Bazar",
        state: 'Chittagong Division',
        zipCode: '4700',
        country: 'Bangladesh'
      }
    ];

    const shippingAddress = addresses[Math.floor(Math.random() * addresses.length)];

    console.log('🛒 Creating bulk test order...');
    console.log(`📍 Shipping to: ${shippingAddress.street}, ${shippingAddress.city}\n`);

    // Create order
    const order = await Order.create({
      user: user._id,
      items: orderItems,
      shippingAddress,
      billingAddress: shippingAddress,
      paymentMethod: 'cod',
      subtotal,
      tax,
      shipping,
      discount,
      total,
      notes: 'Test bulk order created for email testing'
    });

    console.log(`✅ Order created successfully!`);
    console.log(`📋 Order ID: ${order._id}`);
    console.log(`💰 Total: ৳${total.toFixed(2)}\n`);

    // Update product stock
    console.log('📦 Updating product stock...');
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }
    console.log('✅ Stock updated\n');

    // Send customer order confirmation email
    console.log('📧 Sending order confirmation email to customer...');
    try {
      await sendEmail(
        user.email,
        'Order Confirmation - RongRani',
        'orderConfirmation',
        {
          name: user.name,
          orderId: order._id,
          items: orderItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image
          })),
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          shipping: shipping.toFixed(2),
          discount: discount > 0 ? discount.toFixed(2) : 0,
          total: total.toFixed(2),
        }
      );
      console.log('✅ Customer email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Customer email failed:', emailError.message);
    }

    // Send admin notification email
    console.log('\n📧 Sending admin notification email...');
    try {
      await sendEmail(
        process.env.SUPER_ADMIN_EMAIL || 'info.rongrani@gmail.com',
        `🛒 New Order #${order._id} - RongRani`,
        'adminOrderNotification',
        {
          orderId: order._id,
          customerName: user.name,
          customerEmail: user.email,
          customerPhone: user.phone || '+880 1234-567890',
          items: orderItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price
          })),
          total: total.toFixed(2),
          paymentMethod: 'Cash on Delivery',
          shippingAddress: `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.zipCode}`,
        }
      );
      console.log('✅ Admin email sent to:', process.env.SUPER_ADMIN_EMAIL);
    } catch (emailError) {
      console.error('❌ Admin email failed:', emailError.message);
    }

    console.log('\n🎉 Test bulk order completed successfully!');
    console.log('📧 Check both customer and admin inboxes for emails\n');

    // Display order summary
    console.log('═══════════════════════════════════════════');
    console.log('           ORDER SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`Order ID: #${order._id}`);
    console.log(`Customer: ${user.name} (${user.email})`);
    console.log(`\nItems:`);
    orderItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name} x ${item.quantity} = ৳${(item.price * item.quantity).toFixed(2)}`);
    });
    console.log(`\nSubtotal: ৳${subtotal.toFixed(2)}`);
    console.log(`Tax: ৳${tax.toFixed(2)}`);
    console.log(`Shipping: ${shipping > 0 ? '৳' + shipping.toFixed(2) : 'FREE'}`);
    console.log(`Discount: ৳${discount.toFixed(2)}`);
    console.log(`TOTAL: ৳${total.toFixed(2)}`);
    console.log(`\nShipping Address:`);
    console.log(`  ${shippingAddress.street}`);
    console.log(`  ${shippingAddress.city}, ${shippingAddress.zipCode}`);
    console.log(`  ${shippingAddress.country}`);
    console.log('═══════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test order:', error);
    process.exit(1);
  }
};

createTestOrder();
