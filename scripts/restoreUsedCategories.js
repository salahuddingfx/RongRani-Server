const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');

const checkProductCategories = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected\n');

        // Get all products
        const products = await Product.find({}, 'name category');
        console.log(`Found ${products.length} products.`);

        const usedCategories = new Set();
        products.forEach(p => {
            if (p.category) usedCategories.add(p.category);
        });

        console.log('\nCategories currently used by products:', Array.from(usedCategories));

        // Check which of these are missing from Category collection
        const existingCategories = await Category.find({ name: { $in: Array.from(usedCategories) } });
        const existingCategoryNames = existingCategories.map(c => c.name);

        const missingCategories = Array.from(usedCategories).filter(c => !existingCategoryNames.includes(c));

        console.log('\nMissing Categories that need to be restored:', missingCategories);

        if (missingCategories.length > 0) {
            console.log('\nRestoring missing categories...');

            // Define the original seed data mapping
            const seedDataMap = {
                'Love Combo': { icon: 'Heart', color: 'bg-pink-600', order: 1, description: 'Romantic gift combinations perfect for expressing your love' },
                'Anniversary Combo': { icon: 'Sparkles', color: 'bg-maroon', order: 2, description: 'Special gifts to celebrate your memorable anniversaries' },
                'Birthday Combo': { icon: 'ShoppingBag', color: 'bg-amber-500', order: 3, description: 'Unique birthday gift sets to make their day special' },
                'Valentine Combo': { icon: 'Heart', color: 'bg-red-500', order: 4, description: 'Perfect Valentine\'s Day gifts for your special someone' },
                'Jewellery': { icon: 'Star', color: 'bg-yellow-500', order: 5, description: 'Elegant jewellery pieces for every occasion' },
                'Watches': { icon: 'Clock', color: 'bg-slate-700', order: 6, description: 'Premium watches that combine style and functionality' },
                'Chocolates': { icon: 'Gift', color: 'bg-amber-800', order: 7, description: 'Premium chocolates and sweet treats' },
                'Flowers': { icon: 'Flower', color: 'bg-emerald-500', order: 8, description: 'Fresh and artificial flower arrangements' },
                'Perfumes': { icon: 'Sparkles', color: 'bg-purple-600', order: 9, description: 'Luxury fragrances for him and her' },
                'Gift Hampers': { icon: 'Package', color: 'bg-indigo-600', order: 10, description: 'Curated gift hampers for special occasions' },
                'Personalized Gifts': { icon: 'Pencil', color: 'bg-teal-600', order: 11, description: 'Custom-made gifts with personal touch' },
                'Wedding Combo': { icon: 'Gift', color: 'bg-rose-600', order: 12, description: 'Special gift sets for wedding celebrations' }
            };

            const categoriesToRestore = missingCategories.map(name => {
                const seedInfo = seedDataMap[name] || { icon: 'Package', color: 'bg-maroon', order: 99, description: 'Restored category' };
                return {
                    name,
                    slug: name.toLowerCase().replace(/\s+/g, '-'),
                    ...seedInfo
                };
            });

            const restored = await Category.insertMany(categoriesToRestore);
            console.log(`✅ Restored ${restored.length} categories.`);
        } else {
            console.log('No missing categories found.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Check failed:', error);
        process.exit(1);
    }
};

checkProductCategories();
