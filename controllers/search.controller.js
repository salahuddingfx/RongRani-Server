const Product = require('../models/Product');

// @desc    Get search suggestions
// @route   GET /api/search/suggestions
// @access  Public
exports.getSearchSuggestions = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({
                success: true,
                suggestions: [],
                categories: [],
                popularSearches: ['Love Combo', 'Anniversary', 'Birthday', 'Gift Box']
            });
        }

        // Search for products
        const suggestions = await Product.find({
            isActive: true,
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { tags: { $regex: q, $options: 'i' } }
            ]
        })
            .select('name category price images _id')
            .limit(6);

        // Map images to a single url for simpler frontend logic
        const formattedSuggestions = suggestions.map(prod => ({
            ...prod._doc,
            image: prod.images && prod.images.length > 0 ? prod.images[0] : null
        }));

        // Search for matching categories
        const categories = await Product.distinct('category', {
            category: { $regex: q, $options: 'i' },
            isActive: true
        });

        // Popular search static terms for now
        const popularTerms = ['Love Combo', 'Anniversary', 'Birthday', 'Valentine', 'Gifts', 'Jewelry', 'Boxes'];
        const matchingPopular = popularTerms.filter(term =>
            term.toLowerCase().includes(q.toLowerCase())
        ).slice(0, 4);

        res.json({
            success: true,
            suggestions: formattedSuggestions,
            categories: categories.slice(0, 3),
            popularSearches: matchingPopular,
            query: q
        });
    } catch (error) {
        console.error('Search suggestions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching suggestions'
        });
    }
};

// @desc    Get trending/popular searches
// @route   GET /api/search/trending
// @access  Public
exports.getTrendingSearches = async (req, res) => {
    try {
        // Get categories with most products
        const trending = await Product.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $project: { term: '$_id', _id: 0 } }
        ]);

        res.json({
            success: true,
            trending: trending.map(t => t.term)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching trending searches',
            error: error.message
        });
    }
};
