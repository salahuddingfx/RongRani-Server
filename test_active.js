require('dotenv').config();
const mongoose = require('mongoose');
const FlashSale = require('./models/FlashSale');
const Product = require('./models/Product');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    const now = new Date();
    console.log('Current Time:', now);

    const flashSale = await FlashSale.findOne({
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).populate('products.product');

    console.log('Active Flash Sale found:', flashSale);

    if (flashSale) {
      console.log('Products inside Flash Sale:');
      flashSale.products.forEach((p, index) => {
        console.log(`Product ${index}:`, p.product);
      });
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
