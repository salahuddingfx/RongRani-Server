const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Category = require('../models/Category');

const restoreSpecificCategories = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected\n');

        const categoriesToRestore = [
            {
                name: 'clothing',
                slug: 'clothing',
                description: 'Traditional and modern clothing for all',
                icon: 'Shirt',
                color: 'bg-indigo-600',
                order: 1,
                isActive: true
            },
            {
                name: 'home',
                slug: 'home',
                description: 'Beautiful items for your home decor',
                icon: 'Package', // 'Home' icon not in list, using Package or similar
                color: 'bg-teal-600',
                order: 2,
                isActive: true
            },
            {
                name: 'jewelry',
                slug: 'jewelry',
                description: 'Exquisite jewelry pieces',
                icon: 'Star',
                color: 'bg-amber-500',
                order: 3,
                isActive: true
            },
            {
                name: 'art',
                slug: 'art',
                description: 'Artistic creations and paintings',
                icon: 'Flower',
                color: 'bg-purple-600',
                order: 4,
                isActive: true
            },
            {
                name: 'accessories',
                slug: 'accessories',
                description: 'Stylish accessories to complete your look',
                icon: 'ShoppingBag',
                color: 'bg-rose-600',
                order: 5,
                isActive: true
            }
        ];

        console.log('♻️ Restoring specific categories...');

        for (const cat of categoriesToRestore) {
            // Check if exists
            const exists = await Category.findOne({ name: cat.name });
            if (!exists) {
                await Category.create(cat);
                console.log(`   ✅ Created category: ${cat.name}`);
            } else {
                console.log(`   ⚠️ Category already exists: ${cat.name}`);
            }
        }

        console.log('\n✨ Restore complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Restore failed:', error);
        process.exit(1);
    }
};

restoreSpecificCategories();
