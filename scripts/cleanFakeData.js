require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');

/**
 * Clean all seed/fake data from the database
 * This will remove all test products and orders
 */
const cleanFakeData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Connected to MongoDB');

    // Delete all products
    const deletedProducts = await Product.deleteMany({});
    console.log(`✅ Deleted ${deletedProducts.deletedCount} products`);

    // Delete all orders
    const deletedOrders = await Order.deleteMany({});
    console.log(`✅ Deleted ${deletedOrders.deletedCount} orders`);

    console.log('\n🎉 All fake data cleaned successfully!');
    console.log('You can now start fresh with your own products.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning data:', error);
    process.exit(1);
  }
};

cleanFakeData();
