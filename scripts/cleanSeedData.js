require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const cleanSeedData = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected\n');

    // List of seed product names to delete
    const seedProductNames = [
      'Handwoven Silk Scarf',
      'Bamboo Basket Set',
      'Clay Pottery Set',
      'Terracotta Planter',
      'Jute Shopping Bag',
      'Nakshi Kantha Bedcover',
      'Brass Dinner Set',
      'Wooden Jewelry Box',
      'Embroidered Wall Hanging',
      'Ceramic Tea Set',
      'Cotton Throw Pillow',
      'Rattan Storage Basket'
    ];

    console.log('🗑️  CLEANING SEED DATA...\n');

    // Delete seed products
    console.log('📦 Deleting seed products...');
    const deletedProducts = await Product.deleteMany({
      name: { $in: seedProductNames }
    });
    console.log(`   ✅ Deleted ${deletedProducts.deletedCount} seed products\n`);

    // Delete test orders (orders with seed products)
    console.log('📋 Deleting test orders...');
    const deletedOrders = await Order.deleteMany({
      'items.name': { $in: seedProductNames }
    });
    console.log(`   ✅ Deleted ${deletedOrders.deletedCount} test orders\n`);

    // Optionally delete test user (usala7948@gmail.com)
    console.log('👤 Deleting test user...');
    const deletedUser = await User.deleteOne({
      email: 'usala7948@gmail.com'
    });
    console.log(`   ✅ Deleted ${deletedUser.deletedCount} test user\n`);

    console.log('✨ CLEANUP COMPLETE!');
    console.log('📊 Summary:');
    console.log(`   - Products removed: ${deletedProducts.deletedCount}`);
    console.log(`   - Orders removed: ${deletedOrders.deletedCount}`);
    console.log(`   - Users removed: ${deletedUser.deletedCount}`);

    console.log('\n💡 Your database now contains only real data!');
    console.log('   Admin panel will show clean data after refresh.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
};

cleanSeedData();
