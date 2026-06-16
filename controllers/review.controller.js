const Review = require('../models/Review');
const Product = require('../models/Product');

/**
 * @desc    Get all approved reviews for public reviews page
 * @route   GET /api/reviews/all
 * @access  Public
 */
const getPublicReviews = async (req, res) => {
    try {
        const { filter, search, page = 1, limit = 10 } = req.query;

        let query = { status: 'approved' };

        // Search by comment or product name
        if (search) {
            // Find products that match search to include their reviews
            const products = await Product.find({ name: { $regex: search, $options: 'i' } }).select('_id');
            const productIds = products.map(p => p._id);

            query.$or = [
                { comment: { $regex: search, $options: 'i' } },
                { product: { $in: productIds } }
            ];
        }

        // Filters
        if (filter === '5star') query.rating = 5;
        if (filter === '4star') query.rating = 4;
        // 'recent' is handled by sorting

        const sort = filter === 'recent' ? { createdAt: -1 } : { createdAt: -1 };

        const totalReviews = await Review.countDocuments(query);
        const reviews = await Review.find(query)
            .populate('product', 'name images category')
            .populate('user', 'name avatar')
            .sort(sort)
            .limit(Number(limit))
            .skip(Number(limit) * (Number(page) - 1))
            .lean();

        // Calculate Stats
        const allApprovedStats = await Review.aggregate([
            { $match: { status: 'approved' } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    total: { $sum: 1 },
                    star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                    star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                    star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                    star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                    star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
                }
            }
        ]);

        const stats = allApprovedStats[0] ? {
            totalReviews: allApprovedStats[0].total,
            averageRating: allApprovedStats[0].avgRating || 0,
            ratingDistribution: {
                5: allApprovedStats[0].star5,
                4: allApprovedStats[0].star4,
                3: allApprovedStats[0].star3,
                2: allApprovedStats[0].star2,
                1: allApprovedStats[0].star1,
            }
        } : {
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        };

        // Format reviews for frontend (consistent with mock data structure)
        const formattedReviews = reviews.map(r => ({
            ...r,
            product: {
                ...r.product,
                image: r.product?.images?.[0] || '/api/placeholder/100/100'
            },
            user: {
                name: r.user?.name || r.guestName || 'Anonymous',
                avatar: r.user?.avatar || null
            },
            helpful: r.helpful || 0 // Added field if missing in model but used in UI
        }));

        res.json({
            reviews: formattedReviews,
            stats,
            page: Number(page),
            pages: Math.ceil(totalReviews / limit)
        });
    } catch (error) {
        console.error('Error in getPublicReviews:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getPublicReviews
};
