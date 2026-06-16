require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');

const defaultProducts = [
  {
    name: 'Handwoven Silk Scarf',
    description: 'Beautiful handwoven silk scarf with traditional patterns. Made from the finest silk threads and handwoven by skilled artisans using age-old techniques. Perfect for gifting to your loved ones or adding elegance to your own wardrobe.',
    price: 2250,
    originalPrice: 2500,
    category: 'clothing',
    stock: 15,
    sku: 'SILK-SCARF-001',
    images: [
      { url: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800&q=80', publicId: null }
    ],
    isFeatured: true,
    tags: ['silk', 'handwoven', 'traditional', 'scarf', 'clothing']
  },
  {
    name: 'Clay Pottery Set',
    description: 'Handcrafted clay pottery set including bowls, plates, and cups. Each piece is carefully shaped and fired by master potters. Perfect for serving traditional meals or as decorative pieces in your home.',
    price: 3200,
    originalPrice: 3500,
    category: 'home',
    stock: 12,
    sku: 'CLAY-POT-002',
    images: [
      { url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1565204170930-41f2c1e79971?w=800&q=80', publicId: null }
    ],
    isFeatured: true,
    tags: ['pottery', 'clay', 'handmade', 'home', 'kitchen']
  },
  {
    name: 'Bamboo Basket Set',
    description: 'Set of 3 handcrafted bamboo baskets for storage. Perfect for organizing your home and adding a natural touch to your decor. Made from sustainably sourced bamboo by local artisans.',
    price: 1800,
    originalPrice: 1800,
    category: 'home',
    stock: 20,
    sku: 'BAMB-BASK-003',
    images: [
      { url: 'https://images.unsplash.com/photo-1618672901867-2c0a3d20ac99?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1611075810145-826d71d6e92d?w=800&q=80', publicId: null }
    ],
    isFeatured: false,
    tags: ['bamboo', 'basket', 'storage', 'home', 'eco-friendly']
  },
  {
    name: 'Traditional Brass Jewelry',
    description: 'Elegant brass jewelry set including necklace, earrings, and bracelet. Handcrafted with intricate traditional designs. A perfect gift for special occasions.',
    price: 2800,
    originalPrice: 3200,
    category: 'jewelry',
    stock: 10,
    sku: 'BRASS-JEWEL-004',
    images: [
      { url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80', publicId: null }
    ],
    isFeatured: true,
    tags: ['brass', 'jewelry', 'traditional', 'gift', 'handmade']
  },
  {
    name: 'Hand-painted Wall Art',
    description: 'Beautiful hand-painted canvas wall art featuring traditional motifs. Each piece is unique and created by talented local artists. Add a touch of culture to your home.',
    price: 4500,
    originalPrice: 5000,
    category: 'art',
    stock: 8,
    sku: 'WALL-ART-005',
    images: [
      { url: 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80', publicId: null }
    ],
    isFeatured: false,
    tags: ['art', 'painting', 'wall art', 'handmade', 'traditional']
  },
  {
    name: 'Embroidered Table Runner',
    description: 'Exquisite embroidered table runner with traditional patterns. Perfect for adding elegance to your dining table. Handcrafted by skilled artisans.',
    price: 1500,
    originalPrice: 1700,
    category: 'home',
    stock: 18,
    sku: 'TABLE-RUN-006',
    images: [
      { url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=800&q=80', publicId: null }
    ],
    isFeatured: false,
    tags: ['embroidery', 'table runner', 'home', 'handmade', 'traditional']
  },
  {
    name: 'Wooden Jewelry Box',
    description: 'Intricately carved wooden jewelry box with traditional designs. Perfect for storing your precious jewelry. Handcrafted from quality wood.',
    price: 2200,
    originalPrice: 2500,
    category: 'home',
    stock: 14,
    sku: 'WOOD-BOX-007',
    images: [
      { url: 'https://images.unsplash.com/photo-1613575831056-0acd5da131ec?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?w=800&q=80', publicId: null }
    ],
    isFeatured: false,
    tags: ['wood', 'jewelry box', 'storage', 'handmade', 'carved']
  },
  {
    name: 'Terracotta Garden Planters',
    description: 'Set of 3 beautiful terracotta planters for your garden or balcony. Hand-shaped and fired by traditional methods. Perfect for herbs, flowers, or small plants.',
    price: 1200,
    originalPrice: 1400,
    category: 'home',
    stock: 25,
    sku: 'TERRA-PLANT-008',
    images: [
      { url: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=800&q=80', publicId: null }
    ],
    isFeatured: false,
    tags: ['terracotta', 'planter', 'garden', 'home', 'handmade']
  },
  {
    name: 'Handloom Cotton Saree',
    description: 'Elegant handloom cotton saree with traditional border designs. Woven by master weavers using time-honored techniques. Soft, comfortable, and perfect for any occasion.',
    price: 5500,
    originalPrice: 6000,
    category: 'clothing',
    stock: 6,
    sku: 'SAREE-001',
    images: [
      { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1583391733956-6c78276477e5?w=800&q=80', publicId: null }
    ],
    isFeatured: true,
    tags: ['saree', 'cotton', 'handloom', 'clothing', 'traditional']
  },
  {
    name: 'Leather Passport Holder',
    description: 'Premium handcrafted leather passport holder with embossed traditional designs. Perfect for travelers or as a thoughtful gift. Made from genuine leather.',
    price: 850,
    originalPrice: 1000,
    category: 'accessories',
    stock: 30,
    sku: 'LEATHER-PASS-009',
    images: [
      { url: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1627894483734-49e8c2f3e79a?w=800&q=80', publicId: null }
    ],
    isFeatured: false,
    tags: ['leather', 'passport', 'travel', 'accessories', 'handmade']
  },
  {
    name: 'Handwoven Jute Bag',
    description: 'Eco-friendly handwoven jute bag perfect for shopping or daily use. Sturdy, sustainable, and stylish. Supports local artisans and the environment.',
    price: 650,
    originalPrice: 750,
    category: 'accessories',
    stock: 40,
    sku: 'JUTE-BAG-010',
    images: [
      { url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1591561954555-607968c989ab?w=800&q=80', publicId: null }
    ],
    isFeatured: false,
    tags: ['jute', 'bag', 'eco-friendly', 'accessories', 'handwoven']
  },
  {
    name: 'Ceramic Coffee Mug Set',
    description: 'Set of 4 handcrafted ceramic coffee mugs with unique glaze patterns. Each mug is one-of-a-kind. Perfect for your morning coffee or as a gift.',
    price: 1600,
    originalPrice: 1800,
    category: 'home',
    stock: 22,
    sku: 'CERAM-MUG-011',
    images: [
      { url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80', publicId: null },
      { url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&q=80', publicId: null }
    ],
    isFeatured: true,
    tags: ['ceramic', 'mug', 'coffee', 'home', 'handmade']
  }
];

const seedProducts = async () => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get admin user to assign as creator
    console.log('\n👤 Finding admin user...');
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('Admin user not found. Please ensure admin user exists.');
    }
    console.log(`✅ Admin user found: ${adminUser.name}`);

    console.log('\n🗑️  Deleting existing products...');
    await Product.deleteMany({});
    console.log('✅ Existing products deleted');

    console.log('\n➕ Adding new products...');
    
    // Add createdBy field to all products
    const productsWithCreator = defaultProducts.map(product => ({
      ...product,
      createdBy: adminUser._id
    }));
    
    const createdProducts = await Product.insertMany(productsWithCreator);
    console.log(`✅ ${createdProducts.length} products added successfully!`);

    console.log('\n📦 Products Summary:');
    console.log('━'.repeat(70));
    createdProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Category: ${product.category} | Price: ৳${product.price} | Stock: ${product.stock}`);
      console.log(`   Images: ${product.images.length} | Featured: ${product.isFeatured ? 'Yes' : 'No'}`);
      console.log(`   SKU: ${product.sku}`);
      console.log('━'.repeat(70));
    });

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Statistics:');
    console.log(`   Total Products: ${createdProducts.length}`);
    console.log(`   Featured Products: ${createdProducts.filter(p => p.isFeatured).length}`);
    console.log(`   Total Stock Value: ৳${createdProducts.reduce((sum, p) => sum + (p.price * p.stock), 0).toLocaleString()}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding products:', error.message);
    process.exit(1);
  }
};

// Run the seed function
seedProducts();
