// Script to regenerate slugs for all products
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .substring(0, 100); // Limit length
};

const regenerateSlugs = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔍 Finding all products...');
    const products = await Product.find({});

    console.log(`📦 Found ${products.length} products`);

    let updated = 0;
    let errors = 0;

    for (const product of products) {
      try {
        const newSlug = generateSlug(product.name);

        // Check if slug already exists for another product
        const existingProduct = await Product.findOne({
          slug: newSlug,
          _id: { $ne: product._id }
        });

        let finalSlug = newSlug;
        let counter = 1;

        while (existingProduct) {
          finalSlug = `${newSlug}-${counter}`;
          const checkAgain = await Product.findOne({
            slug: finalSlug,
            _id: { $ne: product._id }
          });
          if (!checkAgain) break;
          counter++;
        }

        product.slug = finalSlug;
        // Save without validation
        await product.save({ validateBeforeSave: false });
        console.log(`✅ Updated: ${product.name} -> ${finalSlug}`);
        updated++;

      } catch (error) {
        console.error(`❌ Error updating ${product.name}:`, error.message);
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

regenerateSlugs();