// Script to add slugs to existing products
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
};

const addSlugsToProducts = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔍 Finding products without slugs...');
    const products = await Product.find({ $or: [{ slug: null }, { slug: '' }, { slug: { $exists: false } }] });
    
    console.log(`📦 Found ${products.length} products without slugs`);

    if (products.length === 0) {
      console.log('✨ All products already have slugs!');
      process.exit(0);
    }

    let updated = 0;
    let errors = 0;

    for (const product of products) {
      try {
        let slug = generateSlug(product.name);
        
        // Check if slug already exists
        let slugExists = await Product.findOne({ slug, _id: { $ne: product._id } });
        let counter = 1;
        
        while (slugExists) {
          slug = `${generateSlug(product.name)}-${counter}`;
          slugExists = await Product.findOne({ slug, _id: { $ne: product._id } });
          counter++;
        }

        product.slug = slug;
        await product.save();
        
        console.log(`✅ Updated: ${product.name} -> ${slug}`);
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
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
};

addSlugsToProducts();
