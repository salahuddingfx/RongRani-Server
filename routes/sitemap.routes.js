const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

// Generate dynamic XML sitemap
router.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = process.env.SITE_URL || 'https://rongrani.vercel.app';
        const today = new Date().toISOString().split('T')[0];

        // Get all active products with minimal fields
        const products = await Product.find({ isActive: true }).select('_id updatedAt category name slug');

        // Get unique categories from products
        // Standardize category names (lowercase) to avoid duplicates like 'Jewelry' and 'jewelry'
        const categories = [...new Set(products.map(p => p.category ? p.category.toLowerCase() : null).filter(Boolean))];

        // Static pages
        const staticPages = [
            { url: '/', changefreq: 'daily', priority: '1.0' },
            { url: '/shop', changefreq: 'daily', priority: '0.9' },
            { url: '/about', changefreq: 'monthly', priority: '0.7' },
            { url: '/contact', changefreq: 'monthly', priority: '0.6' },
            { url: '/wishlist', changefreq: 'weekly', priority: '0.5' },
            { url: '/login', changefreq: 'monthly', priority: '0.4' },
            { url: '/register', changefreq: 'monthly', priority: '0.4' },
        ];

        // Build XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Add static pages
        staticPages.forEach(page => {
            xml += '  <url>\n';
            xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
            xml += `    <lastmod>${today}</lastmod>\n`;
            xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
            xml += `    <priority>${page.priority}</priority>\n`;
            xml += '  </url>\n';
        });

        // Add category pages
        categories.forEach(category => {
            xml += '  <url>\n';
            // Encode category for URL safety
            xml += `    <loc>${baseUrl}/shop?category=${encodeURIComponent(category)}</loc>\n`;
            xml += `    <lastmod>${today}</lastmod>\n`;
            xml += '    <changefreq>weekly</changefreq>\n';
            xml += '    <priority>0.8</priority>\n';
            xml += '  </url>\n';
        });

        // Add product pages
        products.forEach(product => {
            const lastmod = product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : today;
            xml += '  <url>\n';
            xml += `    <loc>${baseUrl}/product/${product._id}</loc>\n`;
            xml += `    <lastmod>${lastmod}</lastmod>\n`;
            xml += '    <changefreq>weekly</changefreq>\n';
            xml += '    <priority>0.8</priority>\n';
            // Optional: Add images extension for better image SEO? (Requires schema extension, sticking to basic for now)
            xml += '  </url>\n';
        });

        xml += '</urlset>';

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Error generating sitemap:', error);
        res.status(500).send('Error generating sitemap');
    }
});

module.exports = router;
