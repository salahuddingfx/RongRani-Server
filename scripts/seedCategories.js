const mongoose = require('mongoose');
const Category = require('../models/Category');
require('dotenv').config();

const categories = [
  {
    name: 'Love Combo',
    slug: 'love-combo',
    description: 'Romantic gift combinations perfect for expressing your love',
    icon: 'Heart',
    color: 'bg-pink-600',
    order: 1,
  },
  {
    name: 'Anniversary Combo',
    slug: 'anniversary-combo',
    description: 'Special gifts to celebrate your memorable anniversaries',
    icon: 'Sparkles',
    color: 'bg-maroon',
    order: 2,
  },
  {
    name: 'Birthday Combo',
    slug: 'birthday-combo',
    description: 'Unique birthday gift sets to make their day special',
    icon: 'ShoppingBag',
    color: 'bg-amber-500',
    order: 3,
  },
  {
    name: 'Valentine Combo',
    slug: 'valentine-combo',
    description: 'Perfect Valentine\'s Day gifts for your special someone',
    icon: 'Heart',
    color: 'bg-red-500',
    order: 4,
  },
  {
    name: 'Jewellery',
    slug: 'jewellery',
    description: 'Elegant jewellery pieces for every occasion',
    icon: 'Star',
    color: 'bg-yellow-500',
    order: 5,
  },
  {
    name: 'Watches',
    slug: 'watches',
    description: 'Premium watches that combine style and functionality',
    icon: 'Clock',
    color: 'bg-slate-700',
    order: 6,
  },
  {
    name: 'Chocolates',
    slug: 'chocolates',
    description: 'Premium chocolates and sweet treats',
    icon: 'Gift',
    color: 'bg-amber-800',
    order: 7,
  },
  {
    name: 'Flowers',
    slug: 'flowers',
    description: 'Fresh and artificial flower arrangements',
    icon: 'Flower',
    color: 'bg-emerald-500',
    order: 8,
  },
  {
    name: 'Perfumes',
    slug: 'perfumes',
    description: 'Luxury fragrances for him and her',
    icon: 'Sparkles',
    color: 'bg-purple-600',
    order: 9,
  },
  {
    name: 'Gift Hampers',
    slug: 'gift-hampers',
    description: 'Curated gift hampers for special occasions',
    icon: 'Package',
    color: 'bg-indigo-600',
    order: 10,
  },
  {
    name: 'Personalized Gifts',
    slug: 'personalized-gifts',
    description: 'Custom-made gifts with personal touch',
    icon: 'Pencil',
    color: 'bg-teal-600',
    order: 11,
  },
  {
    name: 'Wedding Combo',
    slug: 'wedding-combo',
    description: 'Special gift sets for wedding celebrations',
    icon: 'Gift',
    color: 'bg-rose-600',
    order: 12,
  },
];

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for seeding...');

    // Clear existing categories
    await Category.deleteMany({});
    console.log('Existing categories cleared');

    // Insert new categories
    const createdCategories = await Category.insertMany(categories);
    console.log(`${createdCategories.length} categories created successfully!`);

    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
