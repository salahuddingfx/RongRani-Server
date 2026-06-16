const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Category = require('../models/Category');

// @desc    Get dashboard analytics
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
exports.getDashboardAnalytics = async (req, res) => {
    try {
        const { period = '7days' } = req.query;

        // Calculate date range
        const now = new Date();
        let startDate;

        switch (period) {
            case '24hours':
                startDate = new Date(now.setHours(now.getHours() - 24));
                break;
            case '7days':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case '30days':
                startDate = new Date(now.setDate(now.getDate() - 30));
                break;
            case '90days':
                startDate = new Date(now.setDate(now.getDate() - 90));
                break;
            default:
                startDate = new Date(now.setDate(now.getDate() - 7));
        }

        // Total Orders (All statuses)
        const totalOrdersInPeriod = await Order.countDocuments({
            createdAt: { $gte: startDate }
        });

        // Total Revenue (Only Paid Orders)
        const revenueData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate },
                    paymentStatus: 'paid'
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 }
                }
            }
        ]);

        // Revenue by category
        const categoryRevenue = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, paymentStatus: 'paid' } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id: '$productInfo.category',
                    revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        // Top selling products
        const topProducts = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    totalSold: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: '$product' },
            {
                $project: {
                    _id: 1,
                    name: '$product.name',
                    totalSold: 1,
                    revenue: 1,
                    image: { $arrayElemAt: ['$product.images', 0] }
                }
            }
        ]);

        // Order status distribution
        const orderStatusDistribution = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: '$orderStatus',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Daily sales trend
        const salesTrend = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate }, paymentStatus: 'paid' } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    revenue: { $sum: '$totalAmount' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // User registration trend
        const userTrend = await User.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Summary stats
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments({ isActive: true });
        const lowStockProducts = await Product.countDocuments({ stock: { $lt: 5 }, isActive: true });

        res.json({
            success: true,
            data: {
                summary: {
                    totalRevenue: revenueData[0]?.totalRevenue || 0,
                    totalOrders: totalOrdersInPeriod,
                    totalUsers,
                    totalProducts,
                    lowStockProducts
                },
                categoryRevenue,
                topProducts,
                orderStatusDistribution,
                salesTrend,
                userTrend,
                period
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics',
            error: error.message
        });
    }
};

// @desc    Get real-time stats
// @route   GET /api/analytics/realtime
// @access  Private/Admin
exports.getRealtimeStats = async (req, res) => {
    try {
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const [
            todayOrders,
            todayRevenue,
            todayUsers,
            activeOrders
        ] = await Promise.all([
            Order.countDocuments({ createdAt: { $gte: last24Hours } }),
            Order.aggregate([
                { $match: { createdAt: { $gte: last24Hours }, paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]),
            User.countDocuments({ createdAt: { $gte: last24Hours } }),
            Order.countDocuments({
                orderStatus: { $in: ['pending', 'processing', 'shipped'] }
            })
        ]);

        res.json({
            success: true,
            data: {
                todayOrders,
                todayRevenue: todayRevenue[0]?.total || 0,
                todayUsers,
                activeOrders,
                timestamp: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching real-time stats',
            error: error.message
        });
    }
};
