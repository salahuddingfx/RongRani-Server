const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

const resolveAbsoluteUrl = (baseUrl, value) => {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

// HTML entity encoder to prevent XSS
const esc = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

router.get('/product/:id', async (req, res) => {
  try {
    const identifier = req.params.id;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);

    const product = isObjectId
      ? await Product.findById(identifier).lean()
      : await Product.findOne({ slug: identifier.toLowerCase() }).lean();

    if (!product) {
      return res.status(404).send('Product not found');
    }

    const frontendBase = (process.env.FRONTEND_URL || 'https://rongrani.vercel.app').replace(/\/+$/, '');
    const serverBase = `${req.protocol}://${req.get('host')}`.replace(/\/+$/, '');

    const productPath = `/product/${product.slug || product._id}`;
    const canonicalUrl = `${frontendBase}${productPath}`;

    const primaryImageRaw =
      (Array.isArray(product.images) && product.images[0] && (product.images[0].url || product.images[0])) ||
      product.image?.url ||
      product.image ||
      '/RongRani-Circle.png';

    const imageUrl = resolveAbsoluteUrl(serverBase, primaryImageRaw);
    const description = (product.seoDescription || product.description || 'Explore handcrafted gifts from RongRani.')
      .toString()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220);

    return res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(product.name)} | RongRani</title>
  <meta name="description" content="${esc(description)}" />
  <meta property="og:site_name" content="RongRani" />
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${esc(product.name)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="product:price:amount" content="${Number(product.price) || 0}" />
  <meta property="product:price:currency" content="BDT" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(product.name)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <meta http-equiv="refresh" content="0; url=${canonicalUrl}" />
  <link rel="canonical" href="${canonicalUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${canonicalUrl}">${esc(product.name)}</a>...</p>
  <script>window.location.replace(${JSON.stringify(canonicalUrl)});</script>
</body>
</html>`);
  } catch (error) {
    return res.status(500).send(error.message || 'Server error');
  }
});

module.exports = router;
