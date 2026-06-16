// Script to fix image format in products
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const fixImageFormat = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔍 Finding products with wrong image format...');
    const products = await Product.find({
      $or: [
        { 'images.0': { $type: 'string' } },
        { images: { $size: 0 } }
      ]
    });

    console.log(`📦 Found ${products.length} products to fix`);

    let updated = 0;
    let errors = 0;

    for (const product of products) {
      try {
        // Fix images array
        if (product.images && product.images.length > 0) {
          const fixedImages = product.images.map(img => {
            if (typeof img === 'string') {
              return { url: img, publicId: null };
            }
            return img;
          });
          product.images = fixedImages;
        }

        // Save without validation
        await product.save({ validateBeforeSave: false });
        console.log(`✅ Fixed images for: ${product.name}`);
        updated++;

      } catch (error) {
        console.error(`❌ Error fixing ${product.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total processed: ${products.length}`);

  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

fixImageFormat();