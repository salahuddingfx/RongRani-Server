const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Category = require('../models/Category');

const cleanSeedCategories = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected\n');

        const seedCategoryNames = [
            'Love Combo',
            'Anniversary Combo',
            'Birthday Combo',
            'Valentine Combo',
            'Jewellery',
            'Watches',
            'Chocolates',
            'Flowers',
            'Perfumes',
            'Gift Hampers',
            'Personalized Gifts',
            'Wedding Combo'
        ];

        console.log('🗑️  CLEANING SEED CATEGORIES...\n');

        const deletedCategories = await Category.deleteMany({
            name: { $in: seedCategoryNames }
        });

        console.log(`   ✅ Deleted ${deletedCategories.deletedCount} seed categories\n`);
        console.log('✨ CLEANUP COMPLETE!');
        console.log(`   - Categories removed: ${deletedCategories.deletedCount}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    }
};

cleanSeedCategories();
