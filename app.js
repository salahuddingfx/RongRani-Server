const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render/Vercel)

/* -------------------- SECURITY -------------------- */
app.use(helmet());

/* -------------------- CORS (FIXED) -------------------- */
// allow multiple origins (local + prod)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'https://rongrani.vercel.app',
  'https://rongrani-admin.vercel.app',
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  process.env.LOCAL_CLIENT_URL,
  process.env.LOCAL_ADMIN_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow server-to-server / postman / no-origin
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some(ao => origin.startsWith(ao));
      const isVercel = origin.includes('vercel.app');

      if (isAllowed || isVercel) {
        callback(null, true);
      } else {
        console.warn(`🛡️ CORS Blocked for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// preflight support
app.options('*', cors());

/* -------------------- RATE LIMIT -------------------- */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 300 : 2000,
});
app.use(limiter);

/* -------------------- CORE MIDDLEWARE -------------------- */
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* -------------------- ROUTES -------------------- */
app.get('/', (_req, res) => {
  res.json({ message: 'RongRani Backend API running' });
});

app.get('/api/health', (_req, res) => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: {
      state: stateMap[mongoose.connection.readyState] || 'unknown',
    },
  });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/newsletter', require('./routes/newsletter.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/categories', require('./routes/category.routes'));
app.use('/api/promotions', require('./routes/promotion.routes'));
app.use('/api/coupons', require('./routes/coupon.routes'));
app.use('/api/gift-cards', require('./routes/giftCard.routes'));
app.use('/api/payment', require('./routes/payment.routes'));
app.use('/api/flash-sales', require('./routes/flashSale.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/search', require('./routes/search.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/contact', require('./routes/contact.routes'));
app.use('/api/images', require('./routes/image.routes'));
app.use('/api/keepalive', require('./routes/keepalive.routes')); // Keep server alive on Render
app.use('/share', require('./routes/share.routes'));
app.use('/', require('./routes/sitemap.routes')); // SEO: Dynamic sitemap

/* -------------------- PLACEHOLDER IMAGE -------------------- */
app.get('/api/placeholder/:width/:height', async (req, res) => {
  try {
    const { width, height } = req.params;
    // Validate dimensions are positive integers
    if (!/^\d+$/.test(width) || !/^\d+$/.test(height) || Number(width) > 2000 || Number(height) > 2000) {
      return res.status(400).send('Invalid dimensions');
    }
    const sharp = require('sharp');

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" font-size="16" fill="#6b7280"
          font-family="Arial" text-anchor="middle" dy=".3em">
          ${width}×${height}
        </text>
      </svg>
    `;

    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    res.type('png').send(buffer);
  } catch (err) {
    console.error('Placeholder error:', err);
    res.status(500).send('Placeholder failed');
  }
});

/* -------------------- 404 HANDLER -------------------- */
app.use((req, res) => {
  console.log(`🔍 404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found on this server`,
  });
});

/* -------------------- ERROR HANDLER -------------------- */
app.use((err, _req, res, _next) => {
  console.error('🔥 Error:', err.message);
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ message: 'Internal server error' });
  } else {
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = app;
