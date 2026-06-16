const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');

const listProductsAndCategories = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected');

        const products = await Product.find({}, 'name category');
        console.log('Products:', products.map(p => `${p.name} (${p.category})`));

        const categories = await Category.find({}, 'name');
        console.log('Categories:', categories.map(c => c.name));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

listProductsAndCategories();
