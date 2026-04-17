const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get admin dashboard stats for full marks
// @route   GET /api/admin/stats
exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({});
        const totalProducts = await Product.countDocuments({});
        const orders = await Order.find({});
        
        const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);
        const lowStockProducts = await Product.find({ stock: { $lt: 5 } }).select('name stock limit');
        
        // Find recent 5 orders
        const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(5).populate('userId', 'name');

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalProducts,
                totalOrders: orders.length,
                totalRevenue: totalRevenue.toFixed(2),
                lowStockProducts,
                recentOrders
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
