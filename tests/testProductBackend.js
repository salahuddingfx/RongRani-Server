const mongoose = require('mongoose');
const Product = require('../models/Product');
const dotenv = require('dotenv');
const path = require('path');

// Explicitly load .env from the backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const testProductBackend = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

        if (!mongoUri) {
            throw new Error('MONGO_URI is not defined in .env file');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Test Case 1: Create a product with originalPrice
        console.log('\n--- Test Case 1: Create product with originalPrice ---');
        const newProduct = await Product.create({
            name: 'Test Product ' + Date.now(),
            description: 'Test Description',
            price: 1500,
            originalPrice: 2000,
            category: 'Test',
            stock: 10,
            images: ['http://example.com/image.jpg'],
            createdBy: new mongoose.Types.ObjectId() // Mock ID
        });

        console.log('Created Product:', {
            name: newProduct.name,
            price: newProduct.price,
            originalPrice: newProduct.originalPrice,
            discount: calculateDiscount(newProduct.originalPrice, newProduct.price) + '%'
        });

        if (newProduct.originalPrice === 2000) {
            console.log('✅ SUCCESS: Original Price saved correctly');
        } else {
            console.error('❌ FAILED: Original Price not saved correctly');
        }

        // Test Case 2: Create a product WITHOUT originalPrice (should default to price)
        console.log('\n--- Test Case 2: Create product WITHOUT originalPrice ---');
        const defaultProduct = await Product.create({
            name: 'Default Price Product ' + Date.now(),
            description: 'Test Description',
            price: 1000,
            category: 'Test',
            stock: 10,
            images: ['http://example.com/image.jpg'],
            createdBy: new mongoose.Types.ObjectId()
        });

        console.log('Created Default Product:', {
            name: defaultProduct.name,
            price: defaultProduct.price,
            originalPrice: defaultProduct.originalPrice
        });

        if (defaultProduct.originalPrice === 1000) {
            console.log('✅ SUCCESS: Original Price defaulted to Price correctly');
        } else {
            console.error('❌ FAILED: Original Price did not default correctly');
        }

        // Cleanup
        await Product.deleteMany({ category: 'Test' });
        console.log('\nCleaned up test products');

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        await mongoose.disconnect();
    }
};

const calculateDiscount = (original, selling) => {
    if (!original || !selling) return 0;
    return Math.round(((original - selling) / original) * 100);
};

testProductBackend();
